import express from "express";
import { db } from "../../database/db.js";
import { mapReview } from "../utils.js";
import { requirePermission, requireStaffAuth } from "../auth.js";

const router = express.Router();

router.get("/reviews", async (req, res) => {
  try {
    const rows = await db.query("SELECT * FROM review ORDER BY id DESC");
    res.json(rows.map(mapReview));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/reviews", async (req, res) => {
  try {
    const rv = req.body;
    const resId = await db.execute(
      `INSERT INTO review (
        author_name, rating, comment_en, comment_hi, 
        avatar_bg, owner_response, date_label, is_approved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rv.name || rv.author_name || "", rv.rating || 5, rv.commentEn || "", rv.commentHi || "",
        rv.avatarBg || "from-cyan-400 to-blue-500", rv.response || rv.owner_response || "", rv.date || "Just now", 1
      ]
    );
    const newId = resId.lastID || 999;
    const rows = await db.query("SELECT * FROM review WHERE id = ?", [newId]);
    res.status(201).json(mapReview(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/reviews/:id/reply", requireStaffAuth, requirePermission("reviews"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { response } = req.body;
    await db.execute("UPDATE review SET owner_response = ? WHERE id = ?", [response, id]);
    const rows = await db.query("SELECT * FROM review WHERE id = ?", [id]);
    res.json(mapReview(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/reviews/:id", requireStaffAuth, requirePermission("reviews"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.execute("DELETE FROM review WHERE id = ?", [id]);
    if (db.savePersistentSnapshot) {
      try { await db.savePersistentSnapshot(); } catch (e) {}
    }
    res.json({ success: true, message: "Review deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
