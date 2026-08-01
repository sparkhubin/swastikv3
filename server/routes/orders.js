import express from "express";
import { db } from "../../database/db.js";
import { mapOrder, sendWhatsappMessageUnified } from "../utils.js";

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
          "admin", "", o.id,
          `🛒 New Order Received! (#${o.id})`,
          `🛒 नया ऑर्डर प्राप्त हुआ! (#${o.id})`,
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
            "customer", o.customerPhone, o.id,
            `🎉 Order Confirmed! (#${o.id})`,
            `🎉 ऑर्डर कन्फर्म! (#${o.id})`,
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
          "delivery", "", o.id,
          `🛵 New Delivery Available (#${o.id})`,
          `🛵 नया डिलीवरी कार्य उपलब्ध (#${o.id})`,
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
            `🎉 *Order Placed Successfully!* (#${o.id})\n\nDear ${custName},\nThank you for shopping at Swastik Supermarket! Your order of *₹${orderTotal}* has been confirmed and is being packed.\n\n📍 *Address:* ${o.shippingAddress || 'N/A'}\n💳 *Payment:* ${o.paymentMethod || 'COD'}\n\nWe will update you as soon as your rider is dispatched! 🚚`,
            false,
            undefined,
            "thank_you_template",
            [custName, String(o.id), String(orderTotal)]
          )
        );
      }

      // 2. Admin WhatsApp Notification
      if (adminPhone) {
        waPromises.push(
          sendWhatsappMessageUnified(
            adminPhone,
            `🚨 *NEW ORDER ALERT!* (#${o.id})\n\nCustomer: ${custName} (${custPhone || 'N/A'})\nTotal Bill: *₹${orderTotal}*\nPayment Method: ${o.paymentMethod || 'COD'}\nAddress: ${o.shippingAddress || 'Store Pickup'}\n\nPlease review and prepare items in Admin Dashboard.`,
            false
          )
        );
      }

      // 3. Delivery Staff WhatsApp Notification
      if (deliveryPartnerPhone) {
        waPromises.push(
          sendWhatsappMessageUnified(
            deliveryPartnerPhone,
            `🛵 *NEW DELIVERY ASSIGNMENT* (#${o.id})\n\nCustomer: ${custName} (${custPhone || 'N/A'})\nDelivery Address: ${o.shippingAddress || 'Store Pickup'}\nAmount to Collect: *₹${orderTotal}* (${o.paymentMethod || 'COD'})\n\nPlease be ready for pickup from dispatch hub.`,
            false
          )
        );
      }

      const waResults = await Promise.allSettled(waPromises);
      console.log("[Order WhatsApp Dispatch Complete]:", waResults.map(r => r.status === "fulfilled" ? r.value : r.reason));
    } catch (waErr) {
      console.error("[WhatsApp Dispatch Error]:", waErr.message);
    }

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

    // Dispatch Order Status Update Notifications
    try {
      const orderRec = rows[0] || {};
      const statusLabel = updateData.status || orderRec.status_label || "Updated";
      const targetPhone = updateData.customerPhone || updateData.customerMobile || orderRec.customer_phone || "";
      const partnerName = updateData.deliveryPartnerName || orderRec.delivery_partner_name || "Swastik Rider";

      // 1. Customer Notification
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

      // 2. Admin Notification
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

      // 3. Delivery Staff Notification
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

      // 4. WhatsApp Notifications Dispatch for Status Changes
      const deliveryPartnerPhone = updateData.deliveryPartnerPhone || orderRec.delivery_partner_phone || "+91 95400 12099";
      const adminPhone = process.env.ADMIN_WHATSAPP_PHONE || "+91 98101 20299";

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

      if (targetPhone) {
        sendWhatsappMessageUnified(
          targetPhone,
          `📦 *Order Update Notice!* (#${id})\n\nDear ${targetName},\nYour order status has been updated to: *${statusLabel}*\nAssigned Rider: ${partnerName}\n\nThank you for choosing Swastik Supermarket! 🛒`,
          false,
          undefined,
          "order_dispatch_alert",
          [targetName, id, String(orderRec.grand_total || 0)]
        ).catch(err => console.error("[Auto WhatsApp Update Customer Error]:", err.message));
      }

      if (adminPhone) {
        sendWhatsappMessageUnified(
          adminPhone,
          `✏️ *ORDER STATUS UPDATED* (#${id})\n\nNew Status: *${statusLabel}*\nRider: ${partnerName}\nCustomer: ${targetName}${targetPhone ? ` (${targetPhone})` : ''}`,
          false
        ).catch(err => console.error("[Auto WhatsApp Update Admin Error]:", err.message));
      }

      if (deliveryPartnerPhone) {
        sendWhatsappMessageUnified(
          deliveryPartnerPhone,
          `🛵 *TASK STATUS UPDATED* (#${id})\n\nStatus: *${statusLabel}*\nCustomer: ${targetName}${targetPhone ? ` (${targetPhone})` : ''}\nDelivery Address: ${orderRec.shipping_address || 'Store Pickup'}`,
          false
        ).catch(err => console.error("[Auto WhatsApp Update Delivery Error]:", err.message));
      }
    } catch (notifErr) {
      console.error("[In-App Notification Update Error]:", notifErr.message);
    }

    // Trigger order_dispatch_alert if step is updated to 1 or status indicates dispatch
    if (updateData.step === 1 || (updateData.status && (updateData.status.toLowerCase().includes("dispatch") || updateData.status.toLowerCase().includes("transit") || updateData.status.toLowerCase().includes("out for delivery")))) {
      const targetPhone = updateData.customerPhone || updateData.customerMobile || (rows[0] ? rows[0].customer_phone : null);
      const targetName = updateData.customerName || (rows[0] ? rows[0].customer_name : "Valued Customer");
      const totalAmount = updateData.total || updateData.grandTotal || (rows[0] ? rows[0].grand_total : 1200);
      
      if (targetPhone) {
        sendWhatsappMessageUnified(
          targetPhone,
          `Hello ${targetName}, your Swastik order ${id} has been handed over to our delivery partner! Total bill amount is ${totalAmount}. You can track or contact your rider directly from the Swastik app.`,
          false,
          undefined,
          "order_dispatch_alert",
          [targetName, id, String(totalAmount)]
        ).catch(err => console.error("[Auto WhatsApp] order_dispatch_alert dispatch error:", err.message));
      }
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
