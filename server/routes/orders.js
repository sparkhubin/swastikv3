import express from "express";
import { db } from "../../database/db.js";
import { mapOrder, sendWhatsappMessageUnified } from "../utils.js";
import { requirePermission, requireStaffAuth } from "../auth.js";

const router = express.Router();

router.get("/orders", async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT o.*, 
             COALESCE(u_cust.id, c.id) as rel_customer_id, 
             COALESCE(u_cust.full_name, c.name, o.customer_name) as rel_customer_name, 
             COALESCE(u_cust.phone_number, c.phone, o.customer_phone) as rel_customer_phone, 
             COALESCE(c.email, o.customer_email) as rel_customer_email,
             COALESCE(u_cust.delivery_address, c.address, o.shipping_address) as rel_customer_address,
             u_rider.id as rel_rider_id,
             u_rider.full_name as rel_rider_name,
             u_rider.phone_number as rel_rider_phone
      FROM "order" o
      LEFT JOIN "user" u_cust ON (
        (o.customer_id IS NOT NULL AND o.customer_id = u_cust.id) OR 
        (o.user_id IS NOT NULL AND o.user_id = u_cust.id)
      )
      LEFT JOIN customer c ON (
        (o.customer_id IS NOT NULL AND o.customer_id = c.id) OR 
        (o.user_id IS NOT NULL AND o.user_id = c.id)
      )
      LEFT JOIN "user" u_rider ON o.delivery_staff_id = u_rider.id
      ORDER BY o.order_date DESC
    `);
    const mapped = [];
    for (const r of rows) {
      mapped.push(await mapOrder(r));
    }
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await db.query(`
      SELECT o.*, 
             COALESCE(u_cust.id, c.id) as rel_customer_id, 
             COALESCE(u_cust.full_name, c.name, o.customer_name) as rel_customer_name, 
             COALESCE(u_cust.phone_number, c.phone, o.customer_phone) as rel_customer_phone, 
             COALESCE(c.email, o.customer_email) as rel_customer_email,
             COALESCE(u_cust.delivery_address, c.address, o.shipping_address) as rel_customer_address,
             u_rider.id as rel_rider_id,
             u_rider.full_name as rel_rider_name,
             u_rider.phone_number as rel_rider_phone
      FROM "order" o
      LEFT JOIN "user" u_cust ON (
        (o.customer_id IS NOT NULL AND o.customer_id = u_cust.id) OR 
        (o.user_id IS NOT NULL AND o.user_id = u_cust.id)
      )
      LEFT JOIN customer c ON (
        (o.customer_id IS NOT NULL AND o.customer_id = c.id) OR 
        (o.user_id IS NOT NULL AND o.user_id = c.id)
      )
      LEFT JOIN "user" u_rider ON o.delivery_staff_id = u_rider.id
      WHERE o.id = ?
    `, [id]);
    if (rows.length > 0) {
      res.json(await mapOrder(rows[0]));
    } else {
      res.status(404).json({ error: "Order not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/orders", async (req, res) => {
  try {
    const o = req.body;
    let targetOrderId = o.id ? String(o.id).trim() : `SW-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!targetOrderId || targetOrderId === "null" || targetOrderId === "undefined" || targetOrderId === "NaN") {
      targetOrderId = `SW-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Resolve effective customer/user details by ID and phone
    let effectiveCustId = o.customerId ? Number(o.customerId) : (o.userId ? Number(o.userId) : null);
    let effectiveCustName = o.customerName || "";
    let effectiveCustPhone = o.customerPhone || "";
    let effectiveCustEmail = o.customerEmail || "";

    let matchedCust = null;
    if (effectiveCustId) {
      try {
        const rows = await db.query('SELECT * FROM customer WHERE id = ? LIMIT 1', [effectiveCustId]);
        if (rows && rows.length > 0) matchedCust = rows[0];
      } catch (e) {}
    }

    if (!matchedCust && effectiveCustPhone) {
      const cleanP = String(effectiveCustPhone).replace(/\D/g, "").slice(-10);
      if (cleanP) {
        try {
          const rows = await db.query(
            "SELECT * FROM customer WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ? OR phone = ? LIMIT 1",
            [`%${cleanP}%`, effectiveCustPhone]
          );
          if (rows && rows.length > 0) matchedCust = rows[0];
        } catch (e) {}
      }
    }

    if (matchedCust) {
      effectiveCustId = Number(matchedCust.id);
      effectiveCustName = matchedCust.name;
      effectiveCustPhone = matchedCust.phone || effectiveCustPhone;
      effectiveCustEmail = matchedCust.email || effectiveCustEmail;
    }

    if (!effectiveCustName) effectiveCustName = "Valued Customer";
    if (!effectiveCustPhone) effectiveCustPhone = "+91 99999 99999";

    let targetRiderId = o.deliveryStaffId ? Number(o.deliveryStaffId) : null;
    let targetRiderName = o.deliveryPartnerName || "";
    let targetRiderPhone = o.deliveryPartnerPhone || "";
    if (!targetRiderId && targetRiderName) {
      try {
        const matchedRider = await db.query('SELECT * FROM "user" WHERE (LOWER(full_name) = ? OR LOWER(full_name) LIKE ?) AND role_id = 4 LIMIT 1', [targetRiderName.toLowerCase(), `%${targetRiderName.toLowerCase()}%`]);
        if (matchedRider && matchedRider.length > 0) {
          targetRiderId = matchedRider[0].id;
          targetRiderName = matchedRider[0].full_name;
          targetRiderPhone = matchedRider[0].phone_number;
        }
      } catch (e) {}
    }

    const checkExists = await db.query('SELECT id FROM "order" WHERE id = ?', [targetOrderId]);
    if (checkExists.length > 0) {
      // Order already exists -> Update record (idempotent for payment verifications & retries)
      const updateOrderSql = `UPDATE "order" SET 
          customer_id = ?, user_id = ?, order_date = ?, is_active = ?, step_level = ?, status_label = ?, 
          subtotal = ?, delivery_fee = ?, gst_amount = ?, total = ?, grand_total = ?, 
          delivery_partner_name = ?, delivery_partner_phone = ?, delivery_staff_id = ?, dispatch_hub = ?, 
          eta_status = ?, shipping_address = ?, customer_name = ?, customer_phone = ?, customer_email = ?,
          is_marg_bill = ?, points_earned = ?, pdf_url = ?,
          referral_discount = ?, applied_points = ?, coupon_discount = ?, coupon_code = ?,
          celebration_discount = ?, celebration_offer_name = ?, payment_method = ?, payment_status = ?,
          cod_status = ?,
          updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`;

      const updateParams = [
        effectiveCustId,
        effectiveCustId,
        o.orderDate || new Date().toISOString(),
        o.isActive !== undefined ? (o.isActive ? 1 : 0) : 1,
        o.step !== undefined ? o.step : 0,
        o.status || o.status_label || "Placed",
        o.subtotal || 0,
        o.deliveryFee || 0,
        o.gst || o.gst_amount || 0,
        o.total || o.grandTotal || o.grand_total || 0,
        o.total || o.grandTotal || o.grand_total || 0,
        targetRiderName,
        targetRiderPhone,
        targetRiderId,
        o.hubName || o.dispatch_hub || "",
        o.eta || o.eta_status || "",
        o.shippingAddress || "",
        effectiveCustName,
        effectiveCustPhone,
        effectiveCustEmail,
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
        o.paymentStatus || "UNPAID",
        o.codStatus || "PENDING_CLEARANCE",
        targetOrderId
      ];

      try {
        await db.execute(updateOrderSql, updateParams);
      } catch (uErr) {
        if (uErr && uErr.message && (uErr.message.includes("no column named") || uErr.message.includes("Unknown column"))) {
          await db.migrateSchema();
          await db.execute(updateOrderSql, updateParams);
        } else {
          throw uErr;
        }
      }

      await db.execute('DELETE FROM order_item WHERE order_id = ?', [targetOrderId]);
    } else {
      const insertOrderSql = `INSERT INTO "order" (
          id, customer_id, user_id, order_date, is_active, step_level, status_label, 
          subtotal, delivery_fee, gst_amount, total, grand_total, 
          delivery_partner_name, delivery_partner_phone, delivery_staff_id, dispatch_hub, 
          eta_status, shipping_address, customer_name, customer_phone, customer_email,
          is_marg_bill, points_earned, pdf_url,
          referral_discount, applied_points, coupon_discount, coupon_code,
          celebration_discount, celebration_offer_name, payment_method, payment_status, cod_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const insertParams = [
        targetOrderId,
        effectiveCustId,
        effectiveCustId,
        o.orderDate || new Date().toISOString(),
        o.isActive !== undefined ? (o.isActive ? 1 : 0) : 1,
        o.step !== undefined ? o.step : 0,
        o.status || o.status_label || "Placed",
        o.subtotal || 0,
        o.deliveryFee || 0,
        o.gst || o.gst_amount || 0,
        o.total || o.grandTotal || o.grand_total || 0,
        o.total || o.grandTotal || o.grand_total || 0,
        targetRiderName,
        targetRiderPhone,
        targetRiderId,
        o.hubName || o.dispatch_hub || "",
        o.eta || o.eta_status || "",
        o.shippingAddress || "",
        effectiveCustName,
        effectiveCustPhone,
        effectiveCustEmail,
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
        o.paymentStatus || "UNPAID",
        o.codStatus || "PENDING_CLEARANCE"
      ];

      try {
        await db.execute(insertOrderSql, insertParams);
      } catch (insertErr) {
        if (insertErr && insertErr.message && (insertErr.message.includes("no column named") || insertErr.message.includes("Unknown column"))) {
          console.warn("Missing column detected during order insert, auto-migrating schema...", insertErr.message);
          await db.migrateSchema();
          await db.execute(insertOrderSql, insertParams);
        } else {
          throw insertErr;
        }
      }

    }

    if (Array.isArray(o.items)) {
      for (const item of o.items) {
        const prodId = Number(item.productId || item.id || 0);
        const qtyOrdered = Number(item.quantity || item.qty || 1);

        await db.execute(
          `INSERT INTO order_item (
            order_id, product_id, name_en, name_hi, price, qty, weight_label
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            targetOrderId,
            prodId,
            item.nameEn || item.name || "",
            item.nameHi || item.name || "",
            item.price || 0,
            qtyOrdered,
            item.weight || item.weight_label || item.unit || "N/A"
          ]
        );

        // Deduct inventory stock for the ordered product
        if (prodId > 0) {
          try {
            await db.execute(
              `UPDATE product 
               SET stock_count = CASE WHEN stock_count - ? < 0 THEN 0 ELSE stock_count - ? END 
               WHERE id = ?`,
              [qtyOrdered, qtyOrdered, prodId]
            );
          } catch (stkErr) {
            console.warn(`Could not update stock count for product ${prodId}:`, stkErr.message);
          }
        }
      }
    }

    const rows = await db.query('SELECT * FROM "order" WHERE id = ?', [targetOrderId]);

    // Create In-App Notifications for Admin, Customer, and Delivery Staff
    try {
      const orderTotal = o.total || o.grand_total || 0;
      const custName = o.customerName || "Customer";
      const address = o.shippingAddress || "Store Pickup / Address";

      // 1. Admin Notification
      await db.execute(
        `INSERT INTO notification (recipient_role, recipient_phone, order_id, title_en, title_hi, message_en, message_hi, type, is_read)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          "admin", "", targetOrderId,
          `🛒 New Order Received! (#${targetOrderId})`,
          `🛒 नया ऑर्डर प्राप्त हुआ! (#${targetOrderId})`,
          `New order of ₹${orderTotal} received from ${custName}. Payment: ${o.paymentMethod || 'COD'}.`,
          `${custName} से ₹${orderTotal} का नया ऑर्डर प्राप्त हुआ। भुगतान: ${o.paymentMethod || 'COD'}।`,
          "new_order"
        ]
      );

      // 2. Customer Notification
      if (o.customerPhone) {
        await db.execute(
          `INSERT INTO notification (recipient_role, recipient_phone, order_id, title_en, title_hi, message_en, message_hi, type, is_read)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [
            "customer", o.customerPhone, targetOrderId,
            `🎉 Order Confirmed! (#${targetOrderId})`,
            `🎉 ऑर्डर कन्फर्म! (#${targetOrderId})`,
            `Thank you for your order of ₹${orderTotal}! Your grocery items are being packed.`,
            `₹${orderTotal} का ऑर्डर देने के लिए धन्यवाद! आपका सामान तैयार किया जा रहा है।`,
            "new_order"
          ]
        );
      }

      // 3. Delivery Staff Notification
      await db.execute(
        `INSERT INTO notification (recipient_role, recipient_phone, order_id, title_en, title_hi, message_en, message_hi, type, is_read)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          "delivery", "", targetOrderId,
          `🛵 New Delivery Available (#${targetOrderId})`,
          `🛵 नया डिलीवरी कार्य उपलब्ध (#${targetOrderId})`,
          `New order available for pickup/delivery at ${address} for ${custName} (₹${orderTotal}).`,
          `${custName} के लिए ${address} पर नया डिलीवरी कार्य उपलब्ध (₹${orderTotal})।`,
          "new_order"
        ]
      );
    } catch (notifErr) {
      console.error("[In-App Notification Error]:", notifErr.message);
    }

    // Trigger WhatsApp notifications for Customer, Admin, and Delivery Staff
    try {
      const orderTotal = o.total || o.grand_total || 0;
      let custName = o.customerName || o.customer_name;
      const custPhone = o.customerPhone || o.customer_phone;

      if ((!custName || custName === "Simulated Customer" || custName === "Valued Customer") && custPhone) {
        try {
          const custLookup = await db.query(
            "SELECT customer_name FROM \"order\" WHERE customer_phone LIKE ? AND customer_name != '' AND customer_name != 'Simulated Customer' ORDER BY id DESC LIMIT 1",
            [`%${String(custPhone).slice(-10)}%`]
          );
          if (custLookup.length > 0 && custLookup[0].customer_name) {
            custName = custLookup[0].customer_name;
          }
        } catch (e) {}
      }
      if (!custName) custName = "Valued Customer";

      const deliveryPartnerPhone = o.deliveryPartnerPhone || "+91 95400 12099";
      const adminPhone = process.env.ADMIN_WHATSAPP_PHONE || "+91 98101 20299";

      const waPromises = [];

      // 1. Customer WhatsApp Notification
      if (custPhone) {
        waPromises.push(
          sendWhatsappMessageUnified(
            custPhone,
            `🎉 *Order Placed Successfully!* (#${targetOrderId})\n\nDear ${custName},\nThank you for shopping at Swastik Supermarket! Your order of *₹${orderTotal}* has been confirmed and is being packed.\n\n📍 *Address:* ${o.shippingAddress || 'N/A'}\n💳 *Payment:* ${o.paymentMethod || 'COD'}\n\nWe will update you as soon as your rider is dispatched! 🚚`,
            false,
            undefined,
            "thank_you_template",
            [custName, String(targetOrderId), String(orderTotal)]
          )
        );
      }

      // 2. Admin WhatsApp Notification
      if (adminPhone) {
        waPromises.push(
          sendWhatsappMessageUnified(
            adminPhone,
            `🚨 *NEW ORDER ALERT!* (#${targetOrderId})\n\nCustomer: ${custName} (${custPhone || 'N/A'})\nTotal Bill: *₹${orderTotal}*\nPayment Method: ${o.paymentMethod || 'COD'}\nAddress: ${o.shippingAddress || 'Store Pickup'}\n\nPlease review and prepare items in Admin Dashboard.`,
            false
          )
        );
      }

      // 3. Delivery Staff WhatsApp Notification
      if (deliveryPartnerPhone) {
        waPromises.push(
          sendWhatsappMessageUnified(
            deliveryPartnerPhone,
            `🛵 *NEW DELIVERY ASSIGNMENT* (#${targetOrderId})\n\nCustomer: ${custName} (${custPhone || 'N/A'})\nDelivery Address: ${o.shippingAddress || 'Store Pickup'}\nAmount to Collect: *₹${orderTotal}* (${o.paymentMethod || 'COD'})\n\nPlease be ready for pickup from dispatch hub.`,
            false
          )
        );
      }

      const waResults = await Promise.allSettled(waPromises);
      console.log("[Order WhatsApp Dispatch Complete]:", waResults.map(r => r.status === "fulfilled" ? r.value : r.reason));
    } catch (waErr) {
      console.error("[WhatsApp Dispatch Error]:", waErr.message);
    }

    if (db.savePersistentSnapshot) {
      try { await db.savePersistentSnapshot(); } catch (e) {}
    }

    res.status(201).json(rows.length > 0 ? await mapOrder(rows[0]) : { ...o, id: targetOrderId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put(["/orders/:id", "/orders/:id/transit"], requireStaffAuth, requirePermission("orders", "delivery"), async (req, res) => {
  const id = req.params.id;
  const updateData = req.body;
  try {
    const existingRows = await db.query('SELECT * FROM "order" WHERE id = ?', [id]);
    const prevOrder = existingRows[0] || {};
    const oldStatus = (prevOrder.status_label || "").toLowerCase();
    const oldStep = prevOrder.step_level !== undefined ? Number(prevOrder.step_level) : -1;

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
    if (updateData.deliveryStaffId !== undefined) {
      fieldsToUpdate.push("delivery_staff_id = ?");
      params.push(updateData.deliveryStaffId ? Number(updateData.deliveryStaffId) : null);
    }
    if (updateData.deliveryPartnerName !== undefined) {
      let rName = updateData.deliveryPartnerName;
      let rPhone = updateData.deliveryPartnerPhone;
      let rStaffId = updateData.deliveryStaffId ? Number(updateData.deliveryStaffId) : null;

      try {
        if (!rStaffId && rName && !rName.toLowerCase().includes('arun dev')) {
          const matched = await db.query('SELECT * FROM "user" WHERE LOWER(full_name) = ? OR LOWER(full_name) LIKE ? LIMIT 1', [rName.toLowerCase(), `%${rName.toLowerCase()}%`]);
          if (matched && matched.length > 0) {
            rStaffId = matched[0].id;
            rName = matched[0].full_name;
            rPhone = matched[0].phone_number;
          }
        }
      } catch (e) {}

      fieldsToUpdate.push("delivery_partner_name = ?");
      params.push(rName);
      if (rStaffId) {
        fieldsToUpdate.push("delivery_staff_id = ?");
        params.push(rStaffId);
      }
      if (rPhone) {
        fieldsToUpdate.push("delivery_partner_phone = ?");
        params.push(rPhone);
      }
    } else if (updateData.deliveryPartnerPhone !== undefined) {
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
    if (updateData.customerId !== undefined || updateData.userId !== undefined) {
      const cId = Number(updateData.customerId || updateData.userId);
      fieldsToUpdate.push("customer_id = ?");
      params.push(cId);
      fieldsToUpdate.push("user_id = ?");
      params.push(cId);
    }
    if (updateData.codStatus !== undefined) {
      fieldsToUpdate.push("cod_status = ?");
      params.push(updateData.codStatus);
    }
    if (updateData.codSettledAt !== undefined || updateData.codClearedAt !== undefined) {
      fieldsToUpdate.push("cod_settled_at = ?");
      params.push(updateData.codSettledAt || updateData.codClearedAt);
    }
    if (updateData.codClearedBy !== undefined) {
      fieldsToUpdate.push("cod_cleared_by = ?");
      params.push(updateData.codClearedBy);
    }
    if (updateData.codSettlementNote !== undefined || updateData.codClearanceNote !== undefined) {
      fieldsToUpdate.push("cod_settlement_note = ?");
      params.push(updateData.codSettlementNote || updateData.codClearanceNote);
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
    const orderRec = rows[0] || {};
    const newStatus = (updateData.status || orderRec.status_label || "").toLowerCase();
    const newStep = updateData.step !== undefined ? Number(updateData.step) : (orderRec.step_level !== undefined ? Number(orderRec.step_level) : -1);

    // Automatic Inventory Stock Restoration on Order Cancellation
    try {
      const wasCancelledBefore = oldStatus.includes("cancel") || oldStep === -1;
      const isCancelledNow = newStatus.includes("cancel") || newStep === -1;

      if (isCancelledNow && !wasCancelledBefore) {
        // Order is now cancelled: return reserved quantities back into product stock_count
        const orderItems = await db.query('SELECT product_id, qty FROM order_item WHERE order_id = ?', [id]);
        for (const it of orderItems) {
          const pId = Number(it.product_id);
          const qty = Number(it.qty || 1);
          if (pId > 0 && qty > 0) {
            await db.execute(
              'UPDATE product SET stock_count = COALESCE(stock_count, 0) + ? WHERE id = ?',
              [qty, pId]
            );
          }
        }
      } else if (!isCancelledNow && wasCancelledBefore) {
        // Order was previously cancelled and is now reactivated: re-deduct items from stock_count
        const orderItems = await db.query('SELECT product_id, qty FROM order_item WHERE order_id = ?', [id]);
        for (const it of orderItems) {
          const pId = Number(it.product_id);
          const qty = Number(it.qty || 1);
          if (pId > 0 && qty > 0) {
            await db.execute(
              'UPDATE product SET stock_count = CASE WHEN stock_count - ? < 0 THEN 0 ELSE stock_count - ? END WHERE id = ?',
              [qty, qty, pId]
            );
          }
        }
      }
    } catch (stockRestoreErr) {
      console.warn(`[Inventory Stock Restore Error on Order #${id}]:`, stockRestoreErr.message);
    }

    // Dispatch Order Status In-App Notifications
    try {
      const statusLabel = updateData.status || orderRec.status_label || "Updated";
      const targetPhone = updateData.customerPhone || updateData.customerMobile || orderRec.customer_phone || "";
      const partnerName = updateData.deliveryPartnerName || orderRec.delivery_partner_name || "Swastik Rider";

      // 1. Customer In-App Notification
      if (targetPhone) {
        await db.execute(
          `INSERT INTO notification (recipient_role, recipient_phone, order_id, title_en, title_hi, message_en, message_hi, type, is_read)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [
            "customer", targetPhone, id,
            `📦 Order #${id} Status: ${statusLabel}`,
            `📦 ऑर्डर #${id} स्थिति: ${statusLabel}`,
            `Your order status has been updated to "${statusLabel}". Partner: ${partnerName}.`,
            `आपके ऑर्डर की स्थिति "${statusLabel}" हो गई है। डिलीवरी प्रतिनिधि: ${partnerName}।`,
            "order_update"
          ]
        );
      }

      // 2. Admin In-App Notification
      await db.execute(
        `INSERT INTO notification (recipient_role, recipient_phone, order_id, title_en, title_hi, message_en, message_hi, type, is_read)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          "admin", "", id,
          `✏️ Order #${id} Updated`,
          `✏️ ऑर्डर #${id} में बदलाव`,
          `Order #${id} status changed to "${statusLabel}". Assigned partner: ${partnerName}.`,
          `ऑर्डर #${id} की स्थिति बदल कर "${statusLabel}" की गई। पार्टनर: ${partnerName}।`,
          "order_update"
        ]
      );

      // 3. Delivery Staff In-App Notification
      await db.execute(
        `INSERT INTO notification (recipient_role, recipient_phone, order_id, title_en, title_hi, message_en, message_hi, type, is_read)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          "delivery", "", id,
          `🛵 Task Update (#${id})`,
          `🛵 कार्य अपडेट (#${id})`,
          `Order #${id} updated to status "${statusLabel}".`,
          `ऑर्डर #${id} का स्टेटस बदलकर "${statusLabel}" हो गया है।`,
          "order_update"
        ]
      );

      // 4. WhatsApp Notifications: STRICT SINGLE-TIME DELIVERY MESSAGE ONLY FOR CUSTOMER
      let targetName = updateData.customerName || orderRec.customer_name;
      if ((!targetName || targetName === "Simulated Customer" || targetName === "Valued Customer" || targetName === "Customer") && targetPhone) {
        try {
          const custLookup = await db.query(
            "SELECT customer_name FROM \"order\" WHERE customer_phone LIKE ? AND customer_name != '' AND customer_name != 'Simulated Customer' ORDER BY id DESC LIMIT 1",
            [`%${String(targetPhone).slice(-10)}%`]
          );
          if (custLookup.length > 0 && custLookup[0].customer_name) {
            targetName = custLookup[0].customer_name;
          }
        } catch (e) {}
      }
      if (!targetName) targetName = "Valued Customer";

      // Check if order transitioned to DELIVERED
      const wasDeliveredBefore = oldStatus.includes("delivered") || oldStatus.includes("completed") || oldStep === 2 || oldStep === 3;
      const isDeliveredNow = newStatus.includes("delivered") || newStatus.includes("completed") || newStep === 2 || newStep === 3;

      if (isDeliveredNow && !wasDeliveredBefore && targetPhone) {
        // Customer ONLY receives delivery message once when marked delivered
        sendWhatsappMessageUnified(
          targetPhone,
          `🎉 *Order Delivered!* (#${id})\n\nDear ${targetName},\nYour order of *₹${orderRec.grand_total || 0}* from Swastik Supermarket has been delivered successfully! 🚚✨\n\nThank you for shopping with us! Have a wonderful day.`,
          false,
          undefined,
          "thank_you_template",
          [targetName, String(id), String(orderRec.grand_total || 0)]
        ).catch(err => console.error("[Auto WhatsApp Delivery Customer Error]:", err.message));
      }
    } catch (notifErr) {
      console.error("[In-App Notification Update Error]:", notifErr.message);
    }

    if (db.savePersistentSnapshot) {
      try { await db.savePersistentSnapshot(); } catch (e) {}
    }

    if (rows.length > 0) {
      res.json(await mapOrder(rows[0]));
    } else {
      res.json({ id, ...updateData });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/orders", requireStaffAuth, requirePermission("orders"), async (req, res) => {
  try {
    await db.execute("DELETE FROM order_item");
    await db.execute('DELETE FROM "order"');
    try {
      await db.execute("UPDATE app_settings SET value_text = '[]', updated_at = CURRENT_TIMESTAMP WHERE key_name = 'swastik_orders'");
    } catch (e) {}
    if (db.savePersistentSnapshot) {
      try { await db.savePersistentSnapshot(); } catch (e) {}
    }
    res.json({ status: "ok", message: "All orders deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/orders/:id", requireStaffAuth, requirePermission("orders"), async (req, res) => {
  const id = req.params.id;
  try {
    const existing = await db.query('SELECT status_label, step_level, order_date FROM "order" WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ error: "Order not found." });
    }

    const curr = existing[0];
    const isCancelled = (curr.status_label || "").toLowerCase().includes("cancel") || Number(curr.step_level) === -1;
    const isDelivered = (curr.status_label || "").toLowerCase().includes("deliver") || Number(curr.step_level) >= 2;
    const orderTime = Date.parse(curr.order_date || "");
    const isLocked = isDelivered && Number.isFinite(orderTime) && Date.now() - orderTime > 60 * 60 * 1000;
    if (isLocked && !req.staff?.isMasterAdmin && req.staff?.role_code !== "admin") {
      return res.status(403).json({ error: "Only a super administrator can delete a delivered order after one hour." });
    }

    // If order was not cancelled, return its items back to stock
    try {
      if (!isCancelled) {
        const orderItems = await db.query('SELECT product_id, qty FROM order_item WHERE order_id = ?', [id]);
        for (const it of orderItems) {
          const pId = Number(it.product_id);
          const qty = Number(it.qty || 1);
          if (pId > 0 && qty > 0) {
            await db.execute(
              'UPDATE product SET stock_count = COALESCE(stock_count, 0) + ? WHERE id = ?',
              [qty, pId]
            );
          }
        }
      }
    } catch (stkErr) {
      console.error(`Could not restore stock before deleting order #${id}:`, stkErr.message);
      return res.status(500).json({ error: "Order was not deleted because its inventory could not be restored." });
    }

    await db.execute("DELETE FROM order_item WHERE order_id = ?", [id]);
    await db.execute('DELETE FROM "order" WHERE id = ?', [id]);
    try {
      const rows = await db.query("SELECT value_text FROM app_settings WHERE key_name = 'swastik_orders'");
      if (rows && rows.length > 0 && rows[0].value_text) {
        let list = JSON.parse(rows[0].value_text);
        if (Array.isArray(list)) {
          list = list.filter(o => String(o.id) !== String(id) && o.id !== id);
          await db.execute("UPDATE app_settings SET value_text = ?, updated_at = CURRENT_TIMESTAMP WHERE key_name = 'swastik_orders'", [JSON.stringify(list)]);
        }
      }
    } catch (e) {}
    if (db.savePersistentSnapshot) {
      try { await db.savePersistentSnapshot(); } catch (e) {}
    }
    res.json({ status: "ok", message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
