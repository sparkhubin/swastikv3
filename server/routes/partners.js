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

router.get("/partners/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await db.query("SELECT * FROM partner WHERE id = ?", [id]);
    if (rows.length > 0) {
      res.json(mapPartner(rows[0]));
    } else {
      res.status(404).json({ error: "Partner not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/partners", async (req, res) => {
  try {
    const pt = req.body;
    const resId = await db.execute(
      "INSERT INTO partner (name, photo, designation, about) VALUES (?, ?, ?, ?)",
      [pt.name || pt.riderName || "Delivery Partner", pt.photo || pt.imageUrl || "", pt.designation || pt.vehicleNumber || "Delivery Agent", pt.about || pt.phone || ""]
    );
    const newId = resId.lastID || 999;
    const rows = await db.query("SELECT * FROM partner WHERE id = ?", [newId]);
    res.status(201).json(mapPartner(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/partners/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const pt = req.body;
    const existing = await db.query("SELECT * FROM partner WHERE id = ?", [id]);
    if (existing.length === 0) return res.status(404).json({ error: "Partner not found" });
    const cur = existing[0];
    await db.execute(
      "UPDATE partner SET name = ?, photo = ?, designation = ?, about = ? WHERE id = ?",
      [
        pt.name !== undefined ? pt.name : cur.name,
        pt.photo !== undefined ? pt.photo : (pt.imageUrl !== undefined ? pt.imageUrl : cur.photo),
        pt.designation !== undefined ? pt.designation : (pt.vehicleNumber !== undefined ? pt.vehicleNumber : cur.designation),
        pt.about !== undefined ? pt.about : (pt.phone !== undefined ? pt.phone : cur.about),
        id
      ]
    );
    const rows = await db.query("SELECT * FROM partner WHERE id = ?", [id]);
    res.json(mapPartner(rows[0]));
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
