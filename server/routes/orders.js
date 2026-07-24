import express from "express";
import { db } from "../../database/db.js";
import { mapOrder } from "../utils.js";

const router = express.Router();

router.get("/orders", async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM "order" ORDER BY order_date DESC');
    const mapped = [];
    for (const r of rows) {
      mapped.push(await mapOrder(r));
    }
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/orders", async (req, res) => {
  try {
    const o = req.body;
    await db.execute(
      `INSERT INTO "order" (
        id, user_id, order_date, is_active, step_level, status_label, 
        subtotal, delivery_fee, gst_amount, grand_total, 
        delivery_partner_name, delivery_partner_phone, dispatch_hub, 
        eta_status, shipping_address, customer_name, customer_phone, customer_email,
        is_marg_bill, points_earned, pdf_url,
        referral_discount, applied_points, coupon_discount, coupon_code,
        celebration_discount, celebration_offer_name, payment_method, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        o.id,
        o.userId || null,
        o.orderDate || new Date().toISOString(),
        o.isActive !== undefined ? (o.isActive ? 1 : 0) : 1,
        o.step !== undefined ? o.step : 0,
        o.status || o.status_label || "Confirmed",
        o.subtotal || 0,
        o.deliveryFee || 0,
        o.gst || o.gst_amount || 0,
        o.total || o.grand_total || 0,
        o.deliveryPartnerName || "",
        o.deliveryPartnerPhone || "",
        o.hubName || o.dispatch_hub || "",
        o.eta || o.eta_status || "",
        o.shippingAddress || "",
        o.customerName || "Simulated Customer",
        o.customerPhone || "+91 99999 99999",
        o.customerEmail || "",
        o.isMargBill !== undefined ? (o.isMargBill ? 1 : 0) : 0,
        o.pointsEarned || 0,
        o.pdfUrl || "",
        o.referralDiscount || 0,
        o.appliedPoints || 0,
        o.couponDiscount || 0,
        o.couponCode || "",
        o.celebrationDiscount || 0,
        o.celebrationOfferName || "",
        o.paymentMethod || "COD",
        o.paymentStatus || "UNPAID"
      ]
    );

    if (Array.isArray(o.items)) {
      for (const item of o.items) {
        await db.execute(
          `INSERT INTO order_item (
            order_id, product_id, name_en, name_hi, price, qty, weight_label
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            o.id,
            item.productId || 0,
            item.nameEn || item.name || "",
            item.nameHi || item.name || "",
            item.price || 0,
            item.qty || 1,
            item.weight || item.weight_label || "N/A"
          ]
        );
      }
    }

    const rows = await db.query('SELECT * FROM "order" WHERE id = ?', [o.id]);
    res.status(201).json(await mapOrder(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/orders/:id/transit", async (req, res) => {
  const id = req.params.id;
  const updateData = req.body;
  try {
    const fieldsToUpdate = [];
    const params = [];
    
    if (updateData.step !== undefined) {
      fieldsToUpdate.push("step_level = ?");
      params.push(Number(updateData.step));
    }
    if (updateData.status !== undefined) {
      fieldsToUpdate.push("status_label = ?");
      params.push(updateData.status);
    }
    if (updateData.deliveryPartnerName !== undefined) {
      fieldsToUpdate.push("delivery_partner_name = ?");
      params.push(updateData.deliveryPartnerName);
    }
    if (updateData.deliveryPartnerPhone !== undefined) {
      fieldsToUpdate.push("delivery_partner_phone = ?");
      params.push(updateData.deliveryPartnerPhone);
    }
    if (updateData.hubName !== undefined) {
      fieldsToUpdate.push("dispatch_hub = ?");
      params.push(updateData.hubName);
    }
    if (updateData.eta !== undefined) {
      fieldsToUpdate.push("eta_status = ?");
      params.push(updateData.eta);
    }
    if (updateData.isActive !== undefined) {
      fieldsToUpdate.push("is_active = ?");
      params.push(updateData.isActive ? 1 : 0);
    }
    if (updateData.customerName !== undefined) {
      fieldsToUpdate.push("customer_name = ?");
      params.push(updateData.customerName);
    }
    if (updateData.customerPhone !== undefined || updateData.customerMobile !== undefined) {
      fieldsToUpdate.push("customer_phone = ?");
      params.push(updateData.customerPhone || updateData.customerMobile);
    }
    if (updateData.customerEmail !== undefined) {
      fieldsToUpdate.push("customer_email = ?");
      params.push(updateData.customerEmail);
    }
    if (updateData.shippingAddress !== undefined) {
      fieldsToUpdate.push("shipping_address = ?");
      params.push(updateData.shippingAddress);
    }
    if (updateData.subtotal !== undefined) {
      fieldsToUpdate.push("subtotal = ?");
      params.push(Number(updateData.subtotal));
    }
    if (updateData.total !== undefined || updateData.grandTotal !== undefined) {
      fieldsToUpdate.push("grand_total = ?");
      params.push(Number(updateData.total || updateData.grandTotal));
    }
    if (updateData.paymentStatus !== undefined) {
      fieldsToUpdate.push("payment_status = ?");
      params.push(updateData.paymentStatus);
    }
    if (updateData.paymentMethod !== undefined) {
      fieldsToUpdate.push("payment_method = ?");
      params.push(updateData.paymentMethod);
    }
    
    if (fieldsToUpdate.length > 0) {
      params.push(id);
      await db.execute(
        `UPDATE "order" SET ${fieldsToUpdate.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        params
      );
    }

    if (Array.isArray(updateData.items) && updateData.items.length > 0) {
      await db.execute("DELETE FROM order_item WHERE order_id = ?", [id]);
      for (const item of updateData.items) {
        await db.execute(
          `INSERT INTO order_item (
            order_id, product_id, name_en, name_hi, price, qty, weight_label
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            item.productId || item.id || 0,
            item.nameEn || item.name || "",
            item.nameHi || item.name || "",
            item.price || 0,
            item.qty || 1,
            item.weight || item.weight_label || "N/A"
          ]
        );
      }
    }
    
    const rows = await db.query('SELECT * FROM "order" WHERE id = ?', [id]);
    if (rows.length > 0) {
      res.json(await mapOrder(rows[0]));
    } else {
      res.json({ id, ...updateData });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/orders/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await db.execute("DELETE FROM order_item WHERE order_id = ?", [id]);
    await db.execute('DELETE FROM "order" WHERE id = ?', [id]);
    res.json({ status: "ok", message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
