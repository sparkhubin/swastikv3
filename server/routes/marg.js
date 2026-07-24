import express from "express";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../../database/db.js";
import { 
  upload, 
  isR2ConfiguredAndValid, 
  uploadsDir, 
  sendWhatsappMessageUnified 
} from "../utils.js";

const router = express.Router();

// Get MARG Settings
router.get("/marg/settings", async (req, res) => {
  try {
    const rows = await db.query("SELECT api_token as \"apiToken\", points_ratio as \"pointsRatio\", auto_notify_whatsapp as \"autoNotifyWhatsApp\", simulate_delay as \"simulateDelay\" FROM marg_settings WHERE id = 1");
    if (rows.length > 0) {
      const settings = rows[0];
      res.json({
        apiToken: settings.apiToken,
        pointsRatio: Number(settings.pointsRatio),
        autoNotifyWhatsApp: Boolean(settings.autoNotifyWhatsApp),
        simulateDelay: Number(settings.simulateDelay)
      });
    } else {
      res.json({ apiToken: "SWASTIK_MARG_SECURE_TOKEN_2026", pointsRatio: 10, autoNotifyWhatsApp: true, simulateDelay: 0 });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update MARG Settings
router.post("/marg/settings", async (req, res) => {
  const { apiToken, pointsRatio, autoNotifyWhatsApp, simulateDelay } = req.body;
  try {
    await db.execute(
      "UPDATE marg_settings SET api_token = ?, points_ratio = ?, auto_notify_whatsapp = ?, simulate_delay = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
      [
        apiToken || "",
        pointsRatio !== undefined ? Number(pointsRatio) : 10,
        autoNotifyWhatsApp !== undefined ? (autoNotifyWhatsApp ? 1 : 0) : 1,
        simulateDelay !== undefined ? Number(simulateDelay) : 0
      ]
    );

    const logMsg = `MARG settings updated. Token: ${(apiToken || "").substring(0, 4)}***, Points Ratio: ₹${pointsRatio || 10}=1PT, WhatsApp: ${autoNotifyWhatsApp}`;
    await db.execute(
      "INSERT INTO marg_log (type, message) VALUES (?, ?)",
      ["INFO", logMsg]
    );

    res.json({
      status: "success",
      settings: {
        apiToken: apiToken || "",
        pointsRatio: Number(pointsRatio),
        autoNotifyWhatsApp: Boolean(autoNotifyWhatsApp),
        simulateDelay: Number(simulateDelay)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get MARG integration logs
router.get("/marg/logs", async (req, res) => {
  try {
    const rows = await db.query("SELECT timestamp, type, message, payload FROM marg_log ORDER BY timestamp DESC LIMIT 50");
    res.json(rows.map(r => ({
      timestamp: r.timestamp,
      type: r.type,
      message: r.message,
      payload: r.payload ? JSON.parse(r.payload) : undefined
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear MARG integration logs
router.post("/marg/logs/clear", async (req, res) => {
  try {
    await db.execute("DELETE FROM marg_log");
    res.json({ status: "success", message: "Logs cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MARG ERP Bill Integration webhook API
router.post("/marg/bill", upload.any(), async (req, res) => {
  const authHeader = req.headers["x-marg-token"] || req.body.apiToken || req.body.token || req.query.token || req.query.apiToken;
  
  let margSettings = { apiToken: "SWASTIK_MARG_SECURE_TOKEN_2026", pointsRatio: 10, autoNotifyWhatsApp: true };
  try {
    const rows = await db.query("SELECT api_token as \"apiToken\", points_ratio as \"pointsRatio\", auto_notify_whatsapp as \"autoNotifyWhatsApp\" FROM marg_settings WHERE id = 1");
    if (rows.length > 0) {
      margSettings = {
        apiToken: rows[0].apiToken,
        pointsRatio: Number(rows[0].pointsRatio),
        autoNotifyWhatsApp: Boolean(rows[0].autoNotifyWhatsApp)
      };
    }
  } catch (err) {
    console.error("Failed to query MARG settings:", err.message);
  }

  if (authHeader !== margSettings.apiToken) {
    const errorMsg = "Unauthorized: Invalid MARG security handshake API token.";
    try {
      await db.execute(
        "INSERT INTO marg_log (type, message) VALUES (?, ?)",
        ["ERROR", `${errorMsg} Received: "${authHeader || 'None'}"`]
      );
    } catch (e) {}
    return res.status(401).json({ error: errorMsg });
  }

  // Extract variables with flexible aliases to support various billing configurations
  const billNumber = req.body.billNumber || req.body.billNo || req.body.invoiceNo || req.body.bill_no || req.body.invoice_no;
  const customerMobile = req.body.customerMobile || req.body.mobile || req.body.phone;
  const customerName = req.body.customerName || req.body.name || "In-Store Customer";
  const billAmount = req.body.billAmount || req.body.amount || req.body.total;
  
  // Parse items safely
  let items = req.body.items;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch (e) {
      // Treat as comma separated names if parsing fails
      items = items.split(",").map((name) => ({ name: name.trim() }));
    }
  }

  if (!billNumber || !customerMobile || !billAmount) {
    const errorMsg = "Bad Request: Missing required parameters. Please provide billNumber, customerMobile, and billAmount.";
    try {
      await db.execute(
        "INSERT INTO marg_log (type, message) VALUES (?, ?)",
        ["ERROR", errorMsg]
      );
    } catch (e) {}
    return res.status(400).json({ error: errorMsg });
  }

  // Handle file uploads if a PDF or bill file is sent in the request
  let uploadedPdfUrl = "";
  const filesList = req.files;
  if (filesList && filesList.length > 0) {
    const file = filesList[0];
    const fileExt = path.extname(file.originalname) || ".pdf";
    const uniqueId = Math.floor(100000 + Math.random() * 900000);
    const fileName = `uploads_${uniqueId}${fileExt}`;

    if (isR2ConfiguredAndValid()) {
      console.log(`Uploading MARG PDF ${fileName} to Cloudflare R2 bucket: ${process.env.CLOUDFLARE_R2_BUCKET_NAME}`);
      try {
        const s3 = new S3Client({
          endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
          },
          region: "auto",
          forcePathStyle: true,
        });

        const command = new PutObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        });

        await s3.send(command);

        const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://${process.env.CLOUDFLARE_R2_BUCKET_NAME}.r2.dev`;
        uploadedPdfUrl = `${publicUrlBase}/${fileName}`;
        console.log(`✓ Cloudflare R2 upload success for MARG PDF: ${uploadedPdfUrl}`);
      } catch (err) {
        const msg = err.message || "";
        if (msg.includes("EPROTO") || msg.includes("handshake") || msg.includes("SSL")) {
          console.warn("⚠️ Cloudflare R2 SSL/TLS handshake failed for MARG PDF (invalid/placeholder R2 configuration or unsupported cipher in local OpenSSL). Falling back locally...");
        } else {
          console.warn(`⚠️ Cloudflare R2 storage error for MARG PDF: ${msg}. Falling back locally...`);
        }
      }
    }

    if (!uploadedPdfUrl) {
      // Fallback upload locally to disk
      try {
        const localPath = path.join(uploadsDir, fileName);
        fs.writeFileSync(localPath, file.buffer);
        const host = req.get("x-forwarded-host") || req.get("host") || "swastiksupermarket.com";
        const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
        uploadedPdfUrl = `${protocol}://${host}/uploads/${fileName}`;
        console.log(`✓ Fallback uploaded MARG PDF locally to disk: ${uploadedPdfUrl}`);
      } catch (err) {
        console.error("Local file writing failure for MARG PDF:", err.message);
      }
    }
  }

  // Final PDF URL
  const pdfUrl = uploadedPdfUrl || req.body.pdfUrl || req.body.billUrl || req.body.pdf || req.body.fileUrl;

  const pointsRatio = margSettings.pointsRatio || 10;
  const pointsEarned = Math.floor(Number(billAmount) / pointsRatio);
  const orderId = `MARG-${billNumber}`;
  const parsedItems = Array.isArray(items) ? items : [];

  try {
    await db.execute(
      `INSERT INTO "order" (
        id, user_id, order_date, is_active, step_level, status_label, 
        subtotal, delivery_fee, gst_amount, grand_total, 
        delivery_partner_name, delivery_partner_phone, dispatch_hub, 
        eta_status, shipping_address, customer_name, customer_phone, 
        is_marg_bill, points_earned, pdf_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        null,
        new Date().toISOString(),
        0, // inactive
        2, // delivered
        "Delivered",
        Number(billAmount),
        0,
        Math.round(Number(billAmount) * 0.18),
        Number(billAmount),
        "In-Store Billing (MARG ERP)",
        "N/A",
        "Swastik Supermarket Counter",
        "Completed",
        "Physical Counter Purchase",
        String(customerName),
        String(customerMobile),
        1, // true (is_marg_bill)
        pointsEarned,
        pdfUrl || ""
      ]
    );

    const finalItems = parsedItems.length > 0 ? parsedItems : [{ name: "Supermarket Invoice Bundle", price: billAmount, qty: 1, weight: "N/A" }];
    for (let index = 0; index < finalItems.length; index++) {
      const it = finalItems[index];
      await db.execute(
        `INSERT INTO order_item (
          order_id, product_id, name_en, name_hi, price, qty, weight_label
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          0,
          String(it.name || "Supermarket Item"),
          String(it.name || "सुपरमार्केट सामग्री"),
          Number(it.price || 0),
          Number(it.qty || 1),
          String(it.weight || "N/A")
        ]
      );
    }
  } catch (err) {
    console.error("Failed to insert MARG order to SQL DB:", err.message);
  }

  const successMsg = `MARG invoice #${billNumber} of ₹${billAmount} for customer +91 ${customerMobile} successfully processed! Awarded ${pointsEarned} loyalty PTS.${pdfUrl ? " [Receipt Attached]" : ""}`;
  try {
    await db.execute(
      "INSERT INTO marg_log (type, message, payload) VALUES (?, ?, ?)",
      ["SUCCESS", successMsg, JSON.stringify({ billNumber, customerMobile, customerName, billAmount, pointsEarned, pdfUrl })]
    );
  } catch (e) {}

  let whatsappStatus = "SKIPPED_BY_CONFIG";
  if (margSettings.autoNotifyWhatsApp) {
    const host = req.get("x-forwarded-host") || req.get("host") || "swastiksupermarket.com";
    const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const baseUrl = `${protocol}://${host}`;

    let waMessage = `*Swastik Supermarket - Digital Bill Generated* 🧾\n\n`;
    waMessage += `Dear *${customerName}*,\n`;
    waMessage += `Thank you for shopping at Swastik Supermarket! Your invoice *#${billNumber}* has been generated.\n\n`;
    waMessage += `💰 *Bill Amount:* ₹${billAmount}\n`;
    waMessage += `🎁 *Loyalty Points Earned:* *${pointsEarned} PTS*\n\n`;
    
    if (pdfUrl) {
      waMessage += `📂 *Download PDF Receipt:* ${pdfUrl}\n\n`;
    }
    
    waMessage += `Track your wallet & view past digital invoices anytime:\n🔗 ${baseUrl}/account\n\n`;
    waMessage += `We look forward to serving you again! 😊`;

    const waRes = await sendWhatsappMessageUnified(customerMobile, waMessage);
    whatsappStatus = waRes.success ? `SUCCESS_${waRes.provider.toUpperCase()}` : `ERROR_${waRes.provider.toUpperCase()}`;

    try {
      await db.execute(
        "INSERT INTO marg_log (type, message) VALUES (?, ?)",
        ["WHATSAPP", `[WhatsApp Outbox Engine] Dispatched via ${waRes.provider} billing receipt to +91 ${customerMobile}: "${waMessage.substring(0, 100)}..."`]
      );
    } catch (e) {}
  }

  res.json({
    status: "success",
    message: "MARG bill processed and saved successfully",
    billNumber,
    pointsAwarded: pointsEarned,
    whatsappStatus,
    pdfUrl: pdfUrl || undefined,
    timestamp: new Date().toISOString()
  });
});

export default router;
