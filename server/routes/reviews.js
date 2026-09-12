import express from "express";
import { db } from "../../database/db.js";
import { mapReview } from "../utils.js";
import { requireCustomerAuth, requirePermission, requireStaffAuth } from "../auth.js";

const router = express.Router();

router.get("/reviews", async (req, res) => {
  try {
    const rows = await db.query("SELECT * FROM review ORDER BY id DESC");
    res.json(rows.map(mapReview));
  } catch (err) {
    console.error("Review list failed:", err.message);
    res.status(500).json({ error: "Unable to load reviews." });
  }
});

router.post("/reviews", requireCustomerAuth, async (req, res) => {
  try {
    const rv = req.body;
    const rating = Number(rv.rating);
    const commentEn = String(rv.commentEn || "").trim().slice(0, 4000);
    const commentHi = String(rv.commentHi || "").trim().slice(0, 4000);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || (!commentEn && !commentHi)) return res.status(400).json({ error: "A rating from 1 to 5 and review text are required." });
    const resId = await db.execute(
      `INSERT INTO review (
        author_name, rating, comment_en, comment_hi, 
        avatar_bg, owner_response, is_approved
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.customer.name, rating, commentEn, commentHi,
        String(rv.avatarBg || "").slice(0, 100), "", 1
      ]
    );
    const newId = resId.lastID;
    const rows = await db.query("SELECT * FROM review WHERE id = ?", [newId]);
    res.status(201).json(mapReview(rows[0]));
  } catch (err) {
    console.error("Review creation failed:", err.message);
    res.status(500).json({ error: "Unable to create review." });
  }
});

router.put("/reviews/:id/reply", requireStaffAuth, requirePermission("settings"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { response } = req.body;
    await db.execute("UPDATE review SET owner_response = ? WHERE id = ?", [response, id]);
    const rows = await db.query("SELECT * FROM review WHERE id = ?", [id]);
    res.json(mapReview(rows[0]));
  } catch (err) {
    console.error("Review reply failed:", err.message);
    res.status(500).json({ error: "Unable to save review reply." });
  }
});

router.delete("/reviews/:id", requireStaffAuth, requirePermission("settings"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.execute("DELETE FROM review WHERE id = ?", [id]);
    res.json({ success: true, message: "Review deleted successfully" });
  } catch (err) {
    console.error("Review deletion failed:", err.message);
    res.status(500).json({ error: "Unable to delete review." });
  }
});

export default router;
