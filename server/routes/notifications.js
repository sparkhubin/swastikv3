import express from "express";
import { db } from "../../database/db.js";
import { requirePermission, requireStaffAuth } from "../auth.js";

const router = express.Router();

// Get notifications based on recipient_role or customer phone
// STRICT PRIVACY: Customer notifications are ONLY visible to the logged-in customer whose phone matches.
router.get("/notifications", async (req, res) => {
  const { role = 'customer', phone, limit = 50 } = req.query;
  try {
    // 1. Customer Notifications Guard: Anonymous / Unauthenticated requests NEVER see customer notifications
    if (role === 'customer') {
      if (!phone) {
        return res.json({ notifications: [], unreadCount: 0 });
      }
      const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
      if (!cleanPhone || cleanPhone.length < 10) {
        return res.json({ notifications: [], unreadCount: 0 });
      }

      // Strictly isolate to this specific customer's phone
      const sql = `
        SELECT * FROM notification 
        WHERE (recipient_role = 'customer' OR recipient_role = 'all')
          AND (recipient_phone = ? OR REPLACE(REPLACE(REPLACE(recipient_phone, ' ', ''), '+91', ''), '-', '') LIKE ?)
        ORDER BY created_at DESC LIMIT ?
      `;
      const params = [phone, `%${cleanPhone}`, Number(limit)];
      const rows = await db.query(sql, params);

      const countSql = `
        SELECT COUNT(*) as unread FROM notification 
        WHERE (is_read = 0 OR is_read = false)
          AND (recipient_role = 'customer' OR recipient_role = 'all')
          AND (recipient_phone = ? OR REPLACE(REPLACE(REPLACE(recipient_phone, ' ', ''), '+91', ''), '-', '') LIKE ?)
      `;
      const countRes = await db.query(countSql, [phone, `%${cleanPhone}`]);
      const unreadCount = countRes[0] ? Number(countRes[0].unread || 0) : 0;

      const mapped = (rows || []).map(r => ({
        id: r.id,
        recipientRole: r.recipient_role,
        recipientPhone: r.recipient_phone,
        orderId: r.order_id,
        titleEn: r.title_en,
        titleHi: r.title_hi || r.title_en,
        messageEn: r.message_en,
        messageHi: r.message_hi || r.message_en,
        type: r.type,
        isRead: Boolean(r.is_read),
        createdAt: r.created_at
      }));

      return res.json({ notifications: mapped, unreadCount });
    }

    // 2. Delivery Rider Notifications Guard
    if (role === 'delivery') {
      let sql = "SELECT * FROM notification WHERE recipient_role = 'delivery'";
      const params = [];
      let countSql = "SELECT COUNT(*) as unread FROM notification WHERE (is_read = 0 OR is_read = false) AND recipient_role = 'delivery'";
      const countParams = [];

      if (phone) {
        const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
        if (cleanPhone) {
          sql += " AND (recipient_phone = '' OR recipient_phone IS NULL OR recipient_phone = ? OR REPLACE(REPLACE(REPLACE(recipient_phone, ' ', ''), '+91', ''), '-', '') LIKE ?)";
          params.push(phone, `%${cleanPhone}`);
          countSql += " AND (recipient_phone = '' OR recipient_phone IS NULL OR recipient_phone = ? OR REPLACE(REPLACE(REPLACE(recipient_phone, ' ', ''), '+91', ''), '-', '') LIKE ?)";
          countParams.push(phone, `%${cleanPhone}`);
        }
      }

      sql += ' ORDER BY created_at DESC LIMIT ?';
      params.push(Number(limit));

      const rows = await db.query(sql, params);
      const countRes = await db.query(countSql, countParams);
      const unreadCount = countRes[0] ? Number(countRes[0].unread || 0) : 0;

      const mapped = (rows || []).map(r => ({
        id: r.id,
        recipientRole: r.recipient_role,
        recipientPhone: r.recipient_phone,
        orderId: r.order_id,
        titleEn: r.title_en,
        titleHi: r.title_hi || r.title_en,
        messageEn: r.message_en,
        messageHi: r.message_hi || r.message_en,
        type: r.type,
        isRead: Boolean(r.is_read),
        createdAt: r.created_at
      }));

      return res.json({ notifications: mapped, unreadCount });
    }

    // 3. Admin / Store Management Notifications Guard
    if (role === 'admin' || role === 'staff') {
      const sql = "SELECT * FROM notification WHERE recipient_role = 'admin' OR recipient_role = 'staff' ORDER BY created_at DESC LIMIT ?";
      const rows = await db.query(sql, [Number(limit)]);

      const countSql = "SELECT COUNT(*) as unread FROM notification WHERE (is_read = 0 OR is_read = false) AND (recipient_role = 'admin' OR recipient_role = 'staff')";
      const countRes = await db.query(countSql, []);
      const unreadCount = countRes[0] ? Number(countRes[0].unread || 0) : 0;

      const mapped = (rows || []).map(r => ({
        id: r.id,
        recipientRole: r.recipient_role,
        recipientPhone: r.recipient_phone,
        orderId: r.order_id,
        titleEn: r.title_en,
        titleHi: r.title_hi || r.title_en,
        messageEn: r.message_en,
        messageHi: r.message_hi || r.message_en,
        type: r.type,
        isRead: Boolean(r.is_read),
        createdAt: r.created_at
      }));

      return res.json({ notifications: mapped, unreadCount });
    }

    // Fallback: Default to empty for unrecognized roles
    return res.json({ notifications: [], unreadCount: 0 });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: err.message, notifications: [], unreadCount: 0 });
  }
});

// Create a notification manually or system dispatch
router.post("/notifications", requireStaffAuth, requirePermission("settings"), async (req, res) => {
  const { 
    recipientRole = "all", 
    recipientPhone = "", 
    orderId = "", 
    titleEn, 
    titleHi, 
    messageEn, 
    messageHi, 
    type = "system" 
  } = req.body;

  try {
    await db.execute(
      `INSERT INTO notification (
        recipient_role, recipient_phone, order_id, title_en, title_hi, message_en, message_hi, type, is_read
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        recipientRole,
        recipientPhone,
        orderId,
        titleEn || "Notification",
        titleHi || titleEn || "अधिसूचना",
        messageEn || "",
        messageHi || messageEn || "",
        type
      ]
    );

    res.status(201).json({ status: "success", message: "Notification created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark single notification as read
router.put("/notifications/:id/read", async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute("UPDATE notification SET is_read = 1 WHERE id = ?", [id]);
    res.json({ status: "success", id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all as read for role/phone
router.put("/notifications/read-all", async (req, res) => {
  const { role, phone } = req.body;
  try {
    if (role === 'customer') {
      if (!phone) {
        return res.json({ status: "success", message: "No phone specified" });
      }
      const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
      await db.execute(
        `UPDATE notification SET is_read = 1 
         WHERE (recipient_role = 'customer' OR recipient_role = 'all')
           AND (recipient_phone = ? OR REPLACE(REPLACE(REPLACE(recipient_phone, ' ', ''), '+91', ''), '-', '') LIKE ?)`,
        [phone, `%${cleanPhone}`]
      );
      return res.json({ status: "success", message: "Customer notifications marked as read" });
    }

    if (role === 'delivery') {
      if (phone) {
        const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
        await db.execute(
          `UPDATE notification SET is_read = 1 
           WHERE recipient_role = 'delivery'
             AND (recipient_phone = '' OR recipient_phone IS NULL OR recipient_phone = ? OR REPLACE(REPLACE(REPLACE(recipient_phone, ' ', ''), '+91', ''), '-', '') LIKE ?)`,
          [phone, `%${cleanPhone}`]
        );
      } else {
        await db.execute("UPDATE notification SET is_read = 1 WHERE recipient_role = 'delivery'", []);
      }
      return res.json({ status: "success", message: "Delivery notifications marked as read" });
    }

    if (role === 'admin' || role === 'staff') {
      await db.execute("UPDATE notification SET is_read = 1 WHERE recipient_role = 'admin' OR recipient_role = 'staff'", []);
      return res.json({ status: "success", message: "Admin notifications marked as read" });
    }

    res.json({ status: "success", message: "No matching criteria" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
