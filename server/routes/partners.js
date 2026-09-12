import express from "express";
import { db } from "../../database/db.js";
import { mapPartner } from "../utils.js";
import { requirePermission, requireStaffAuth } from "../auth.js";

const router = express.Router();

router.get("/partners", async (req, res) => {
  try {
    const rows = await db.query("SELECT * FROM partner ORDER BY id ASC");
    res.json(rows.map(mapPartner));
  } catch (err) {
    console.error("Partner list failed:", err.message);
    res.status(500).json({ error: "Unable to load partners." });
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
    console.error("Partner read failed:", err.message);
    res.status(500).json({ error: "Unable to load partner." });
  }
});

router.post("/partners", requireStaffAuth, requirePermission("settings"), async (req, res) => {
  try {
    const pt = req.body;
    const resId = await db.execute(
      "INSERT INTO partner (name, photo, designation, about) VALUES (?, ?, ?, ?)",
      [
        pt.name,
        pt.photo || pt.imageUrl || "", 
        pt.designation || pt.vehicleNumber,
        pt.about || pt.phone || ""
      ]
    );
    let newId = resId?.lastID;
    if (!newId) {
      const maxRows = await db.query("SELECT MAX(id) as maxId FROM partner");
      newId = maxRows[0]?.maxId || maxRows[0]?.max_id || 1;
    }
    const rows = await db.query("SELECT * FROM partner WHERE id = ?", [newId]);
    res.status(201).json(mapPartner(rows[0] || { id: newId, ...pt }));
  } catch (err) {
    console.error("Partner creation failed:", err.message);
    res.status(500).json({ error: "Unable to create partner." });
  }
});

router.put("/partners/:id", requireStaffAuth, requirePermission("settings"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const pt = req.body;
    const existing = await db.query("SELECT * FROM partner WHERE id = ?", [id]);
    if (existing.length === 0) return res.status(404).json({ error: "Partner not found." });
    else {
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
    }
    const rows = await db.query("SELECT * FROM partner WHERE id = ?", [id]);
    res.json(mapPartner(rows[0] || { id, ...pt }));
  } catch (err) {
    console.error("Partner update failed:", err.message);
    res.status(500).json({ error: "Unable to update partner." });
  }
});

router.delete("/partners/:id", requireStaffAuth, requirePermission("settings"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.execute("DELETE FROM partner WHERE id = ?", [id]);
    res.json({ status: "ok", message: "Deleted" });
  } catch (err) {
    console.error("Partner deletion failed:", err.message);
    res.status(500).json({ error: "Unable to delete partner." });
  }
});

export default router;
