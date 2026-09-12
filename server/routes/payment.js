import express from "express";
import crypto from "crypto";
import { db } from "../../database/db.js";
import { requirePermission, requireStaffAuth } from "../auth.js";

const router = express.Router();

router.get("/payment/settings", requireStaffAuth, requirePermission("settings"), async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT enabled, app_id as "appId", secret_key as "secretKey", environment,
              razorpay_enabled as "razorpayEnabled", razorpay_key_id as "razorpayKeyId", 
              razorpay_key_secret as "razorpayKeySecret", active_gateway as "activeGateway"
       FROM payment_settings WHERE id = 1`
    );
    if (rows.length > 0) {
      const settings = rows[0];
      res.json({
        enabled: Boolean(settings.enabled),
        appId: settings.appId || "",
        secretKey: settings.secretKey || "",
        environment: settings.environment || "TEST",
        razorpayEnabled: settings.razorpayEnabled !== undefined ? Boolean(settings.razorpayEnabled) : true,
        razorpayKeyId: settings.razorpayKeyId || "",
        razorpayKeySecret: settings.razorpayKeySecret || "",
        activeGateway: settings.activeGateway || "RAZORPAY"
      });
    } else {
      res.json({
        enabled: true,
        appId: "",
        secretKey: "",
        environment: "TEST",
        razorpayEnabled: true,
        razorpayKeyId: "",
        razorpayKeySecret: "",
        activeGateway: "RAZORPAY"
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/payment/settings", requireStaffAuth, requirePermission("settings"), async (req, res) => {
  const { 
    enabled, 
    appId, 
    secretKey, 
    environment,
    razorpayEnabled,
    razorpayKeyId,
    razorpayKeySecret,
    activeGateway
  } = req.body;

  try {
    await db.execute(
      `UPDATE payment_settings 
       SET enabled = ?, app_id = ?, secret_key = ?, environment = ?,
           razorpay_enabled = ?, razorpay_key_id = ?, razorpay_key_secret = ?, active_gateway = ?,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = 1`,
      [
        enabled !== undefined ? (enabled ? 1 : 0) : 1, 
        appId || "", 
        secretKey || "", 
        environment || "TEST",
        razorpayEnabled !== undefined ? (razorpayEnabled ? 1 : 0) : 1,
        razorpayKeyId || "",
        razorpayKeySecret || "",
        activeGateway || "RAZORPAY"
      ]
    );
    res.json({
      status: "success",
      settings: {
        enabled: Boolean(enabled),
        appId: appId || "",
        secretKey: secretKey || "",
        environment: environment || "TEST",
        razorpayEnabled: Boolean(razorpayEnabled),
        razorpayKeyId: razorpayKeyId || "",
        razorpayKeySecret: razorpayKeySecret || "",
        activeGateway: activeGateway || "RAZORPAY"
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RAZORPAY PAYMENT GATEWAY ENDPOINTS
// ==========================================

// 1. Create Razorpay Order
router.post("/razorpay/create-order", async (req, res) => {
  const { orderId, amount, customerName, customerPhone, customerEmail } = req.body;

  const amountInPaise = Math.round(Number(amount) * 100);
  if (!orderId || !Number.isSafeInteger(amountInPaise) || amountInPaise <= 0) {
    return res.status(400).json({ error: "A valid order ID and positive payment amount are required." });
  }

  try {
    const rows = await db.query(
      `SELECT razorpay_enabled as "razorpayEnabled", razorpay_key_id as "razorpayKeyId", 
              razorpay_key_secret as "razorpayKeySecret", environment 
       FROM payment_settings WHERE id = 1`
    );

    let keyId = "";
    let keySecret = "";

    if (rows.length > 0) {
      if (rows[0].razorpayEnabled === false || rows[0].razorpayEnabled === 0) {
        return res.status(400).json({ error: "Razorpay payment gateway is currently disabled by store admin." });
      }
      keyId = (rows[0].razorpayKeyId || "").trim();
      keySecret = (rows[0].razorpayKeySecret || "").trim();
    }

    if (!keyId || !keySecret) {
      return res.status(503).json({ error: "Razorpay is not configured." });
    }

    try {
      const authString = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const response = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authString}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: "INR",
            receipt: String(orderId),
            notes: {
              customer_name: customerName || "Swastik Shopper",
              customer_phone: customerPhone || "",
              customer_email: customerEmail || "",
              app_name: "Swastik Supermarket"
            }
          })
        });

      const rzpData = await response.json();
      if (response.ok) {
        return res.json({
            status: "success",
            razorpay_order_id: rzpData.id,
            key_id: keyId,
            amount: rzpData.amount,
            currency: rzpData.currency || "INR",
            receipt: rzpData.receipt,
            api_called: true
        });
      }
      console.warn("Razorpay API order creation failed:", rzpData?.error?.description || response.status);
      return res.status(502).json({ error: "Razorpay rejected the order creation request." });
    } catch (err) {
      console.error("Razorpay network connection error:", err.message);
      return res.status(502).json({ error: "Razorpay is currently unavailable." });
    }
  } catch (err) {
    console.error("Error in /razorpay/create-order:", err);
    res.status(500).json({ error: "Failed to initialize Razorpay transaction session." });
  }
});

// 2. Verify Razorpay Payment Signature
router.post("/razorpay/verify", async (req, res) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    const rows = await db.query(
      `SELECT razorpay_key_secret as "razorpayKeySecret" FROM payment_settings WHERE id = 1`
    );

    const secret = rows[0]?.razorpayKeySecret?.trim();
    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !secret) {
      return res.status(400).json({ error: "Complete Razorpay verification data is required." });
    }

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    const providedSignature = String(razorpay_signature);
    const isSignatureValid = generatedSignature.length === providedSignature.length &&
      crypto.timingSafeEqual(Buffer.from(generatedSignature), Buffer.from(providedSignature));

    if (!isSignatureValid) {
      console.warn(`[RAZORPAY VERIFY FAILED] Invalid signature for Order ID ${orderId}`);
      return res.status(400).json({ error: "Invalid Razorpay payment signature! Transaction verification failed." });
    }

    // Mark order as PAID in database
    await db.execute(
      `UPDATE "order" SET status_label = 'Paid', step_level = 1, payment_status = 'PAID', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [orderId]
    );

    console.log(`[RAZORPAY SUCCESS] Order #${orderId} verified & marked PAID! Payment ID: ${razorpay_payment_id}`);

    res.json({
      status: "success",
      payment_status: "SUCCESS",
      order_id: orderId,
      razorpay_payment_id,
      message: "Payment successfully verified and recorded!"
    });
  } catch (err) {
    console.error("Error in /razorpay/verify:", err);
    res.status(500).json({ error: "Payment verification error: " + err.message });
  }
});

// 3. Razorpay Webhook Endpoint
router.post("/razorpay/webhook", async (req, res) => {
  try {
    const settings = await db.query('SELECT razorpay_key_secret as "razorpayKeySecret" FROM payment_settings WHERE id = 1');
    const secret = settings[0]?.razorpayKeySecret?.trim();
    const providedSignature = String(req.get("x-razorpay-signature") || "");
    if (!secret || !providedSignature || !req.rawBody) {
      return res.status(401).json({ error: "Webhook signature is required." });
    }
    const expectedSignature = crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex");
    const isValid = expectedSignature.length === providedSignature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature));
    if (!isValid) {
      return res.status(401).json({ error: "Invalid webhook signature." });
    }

    const event = req.body.event || "";
    const payload = req.body.payload || {};

    let orderId = "";
    let paymentStatus = "SUCCESS";

    if (payload.payment && payload.payment.entity) {
      const entity = payload.payment.entity;
      orderId = entity.notes?.receipt || entity.receipt || entity.order_id || "";
      if (event === "payment.failed") {
        paymentStatus = "FAILED";
      }
    } else if (payload.order && payload.order.entity) {
      orderId = payload.order.entity.receipt || "";
    }

    if (orderId) {
      const isPaid = paymentStatus === "SUCCESS" || event === "order.paid" || event === "payment.captured";
      await db.execute(
        `UPDATE "order" SET status_label = ?, step_level = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [isPaid ? "Paid" : "Payment Failed", isPaid ? 1 : 0, isPaid ? "PAID" : "FAILED", orderId]
      );
      console.log(`[RAZORPAY WEBHOOK SYNC] Order #${orderId} synced to state: ${isPaid ? 'PAID' : 'FAILED'}`);
    }

    res.json({ status: "processed", event, orderId });
  } catch (err) {
    console.error("[Razorpay Webhook Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/cashfree/create-order", async (req, res) => {
  const { orderId, amount, customerName, customerPhone, customerEmail } = req.body;

  if (!orderId || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !customerPhone) {
    return res.status(400).json({ error: "A valid order ID, amount, and customer phone are required." });
  }

  try {
    const rows = await db.query("SELECT enabled, app_id as \"appId\", secret_key as \"secretKey\", environment FROM payment_settings WHERE id = 1");
    if (rows.length === 0 || !rows[0].enabled) {
      return res.status(400).json({ error: "Payment gateway is currently disabled." });
    }

    const appId = rows[0].appId;
    const secretKey = rows[0].secretKey;
    const env = rows[0].environment;

    const isLive = env.toUpperCase() === "PRODUCTION";
    const baseUrl = isLive ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

    if (appId && secretKey && appId.trim() !== "" && secretKey.trim() !== "") {
      try {
        const response = await fetch(`${baseUrl}/orders`, {
          method: "POST",
          headers: {
            "x-client-id": appId,
            "x-client-secret": secretKey,
            "x-api-version": "2023-08-01",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            order_id: orderId,
            order_amount: Number(amount),
            order_currency: "INR",
            customer_details: {
              customer_id: customerPhone.replace(/\D/g, ""),
              customer_name: customerName || "Swastik Customer",
              customer_phone: customerPhone.replace(/\D/g, "").slice(-10),
              customer_email: customerEmail || undefined
            },
            order_meta: {
              return_url: `${req.headers.origin || "http://localhost:3000"}/api/cashfree/return?order_id={order_id}`,
              notify_url: `${req.headers.origin || "http://localhost:3000"}/api/cashfree/webhook`
            }
          })
        });

        const data = await response.json();
        if (response.ok) {
          return res.json({
            status: "success",
            payment_session_id: data.payment_session_id,
            order_id: data.order_id,
            cf_order_id: data.cf_order_id,
            payment_status: data.order_status,
            api_called: true,
            env
          });
        } else {
          console.warn("Cashfree API order creation failure details:", data);
          return res.status(502).json({ error: "Cashfree rejected the order creation request." });
        }
      } catch (err) {
        console.error("Cashfree API network connection error:", err.message);
        return res.status(502).json({ error: "Cashfree is currently unavailable." });
      }
    }
    return res.status(503).json({ error: "Cashfree is not configured." });
  } catch (err) {
    console.error("Database query error checking payment settings:", err.message);
    return res.status(500).json({ error: "Unable to read payment configuration." });
  }
});

router.post("/cashfree/webhook", async (req, res) => {
  res.status(501).json({ error: "Cashfree webhooks are disabled until signature verification is configured." });
});

router.post("/cashfree/verify-payment", async (req, res) => {
  const { orderId } = req.body;
  console.log(`[CASHFREE VERIFY] Checking reference confirmation: ${orderId}`);
  
  try {
    const rowsSet = await db.query("SELECT enabled, app_id as \"appId\", secret_key as \"secretKey\", environment FROM payment_settings WHERE id = 1");
    if (rowsSet.length > 0) {
      const appId = rowsSet[0].appId;
      const secretKey = rowsSet[0].secretKey;
      const env = rowsSet[0].environment;

      const isLive = env.toUpperCase() === "PRODUCTION";
      const baseUrl = isLive ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

      const ordersRows = await db.query("SELECT * FROM \"order\" WHERE id = ?", [orderId]);
      if (ordersRows.length > 0 && ordersRows[0].status_label === "Paid") {
        return res.json({
          status: "success",
          payment_status: "SUCCESS",
          order_id: orderId,
          message: "Order is already recorded as paid."
        });
      }

      if (appId && secretKey && orderId) {
        try {
          const response = await fetch(`${baseUrl}/orders/${orderId}`, {
            method: "GET",
            headers: {
              "x-client-id": appId,
              "x-client-secret": secretKey,
              "x-api-version": "2023-08-01",
              "Content-Type": "application/json"
            }
          });

          const data = await response.json();
          if (response.ok) {
            const verifiedStatus = data.order_status;
            const isSuccess = verifiedStatus === "PAID" || verifiedStatus === "SUCCESS";
            
            await db.execute(
              "UPDATE \"order\" SET status_label = ?, step_level = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
              [isSuccess ? "Paid" : (ordersRows.length > 0 ? ordersRows[0].status_label : "Pending"), isSuccess ? 1 : (ordersRows.length > 0 ? ordersRows[0].step_level : 0), isSuccess ? "PAID" : "FAILED", orderId]
            );

            return res.json({
              status: "success",
              payment_status: verifiedStatus,
              order_id: orderId,
              api_called: true
            });
          }
        } catch (err) {
          console.error("Cashfree manual status inquiry failed:", err.message);
        }
      }
    }
  } catch (err) {
    console.error("Database query error in verify payment:", err.message);
  }

  res.status(502).json({ error: "Cashfree could not verify this payment." });
});

export default router;
