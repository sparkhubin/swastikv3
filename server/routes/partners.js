import express from "express";
import { db } from "../../database/db.js";
import { mapPartner } from "../utils.js";

const router = express.Router();

router.get("/partners", async (req, res) => {
  try {
    const rows = await db.query("SELECT * FROM partner ORDER BY id ASC");
    res.json(rows.map(mapPartner));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/partners", async (req, res) => {
  try {
    const pt = req.body;
    const resId = await db.execute(
      "INSERT INTO partner (name, photo, designation, about) VALUES (?, ?, ?, ?)",
      [pt.name, pt.photo, pt.designation, pt.about]
    );
    const newId = resId.lastID || 999;
    const rows = await db.query("SELECT * FROM partner WHERE id = ?", [newId]);
    res.status(201).json(mapPartner(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/partners/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.execute("DELETE FROM partner WHERE id = ?", [id]);
    res.json({ status: "ok", message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
