import express from "express";
import { db } from "../../database/db.js";

const router = express.Router();

// Get notifications based on recipient_role or customer phone
router.get("/notifications", async (req, res) => {
  const { role, phone, limit = 50 } = req.query;
  try {
    let sql = 'SELECT * FROM notification WHERE 1=1';
    const params = [];

    if (role && role !== 'all') {
      sql += ' AND (recipient_role = ? OR recipient_role = "all")';
      params.push(role);
    }

    if (phone) {
      const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
      if (cleanPhone) {
        sql += ' AND (recipient_phone = ? OR recipient_phone = "" OR recipient_phone IS NULL OR REPLACE(REPLACE(REPLACE(recipient_phone, " ", ""), "+91", ""), "-", "") LIKE ?)';
        params.push(phone, `%${cleanPhone}`);
      } else {
        sql += ' AND (recipient_phone = ? OR recipient_phone = "" OR recipient_phone IS NULL)';
        params.push(phone);
      }
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(limit));

    const rows = await db.query(sql, params);
    
    // Unread count
    let countSql = 'SELECT COUNT(*) as unread FROM notification WHERE (is_read = 0 OR is_read = false)';
    const countParams = [];
    if (role && role !== 'all') {
      countSql += ' AND (recipient_role = ? OR recipient_role = "all")';
      countParams.push(role);
    }
    if (phone) {
      const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
      if (cleanPhone) {
        countSql += ' AND (recipient_phone = ? OR recipient_phone = "" OR recipient_phone IS NULL OR REPLACE(REPLACE(REPLACE(recipient_phone, " ", ""), "+91", ""), "-", "") LIKE ?)';
        countParams.push(phone, `%${cleanPhone}`);
      } else {
        countSql += ' AND (recipient_phone = ? OR recipient_phone = "" OR recipient_phone IS NULL)';
        countParams.push(phone);
      }
    }
    
    const countRes = await db.query(countSql, countParams);
    const unreadCount = countRes[0] ? Number(countRes[0].unread || 0) : 0;

    const mapped = rows.map(r => ({
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

    res.json({ notifications: mapped, unreadCount });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: err.message, notifications: [], unreadCount: 0 });
  }
});

// Create a notification manually or system dispatch
router.post("/notifications", async (req, res) => {
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
    let sql = 'UPDATE notification SET is_read = 1 WHERE 1=1';
    const params = [];

    if (role && role !== 'all') {
      sql += ' AND (recipient_role = ? OR recipient_role = "all")';
      params.push(role);
    }
    if (phone) {
      const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
      if (cleanPhone) {
        sql += ' AND (recipient_phone = ? OR recipient_phone = "" OR recipient_phone IS NULL OR REPLACE(REPLACE(REPLACE(recipient_phone, " ", ""), "+91", ""), "-", "") LIKE ?)';
        params.push(phone, `%${cleanPhone}`);
      } else {
        sql += ' AND (recipient_phone = ? OR recipient_phone = "" OR recipient_phone IS NULL)';
        params.push(phone);
      }
    }

    await db.execute(sql, params);
    res.json({ status: "success", message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
