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

router.post("/partners", requireStaffAuth, requirePermission("partners"), async (req, res) => {
  try {
    const pt = req.body;
    const resId = await db.execute(
      "INSERT INTO partner (name, photo, designation, about) VALUES (?, ?, ?, ?)",
      [
        pt.name || "Business Investor", 
        pt.photo || pt.imageUrl || "", 
        pt.designation || pt.vehicleNumber || "Director", 
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
    res.status(500).json({ error: err.message });
  }
});

router.put("/partners/:id", requireStaffAuth, requirePermission("partners"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const pt = req.body;
    const existing = await db.query("SELECT * FROM partner WHERE id = ?", [id]);
    if (existing.length === 0) {
      // Self-heal: insert if not existing yet
      await db.execute(
        "INSERT INTO partner (id, name, photo, designation, about) VALUES (?, ?, ?, ?, ?)",
        [
          id,
          pt.name || "Business Investor",
          pt.photo || pt.imageUrl || "",
          pt.designation || "Director",
          pt.about || ""
        ]
      );
    } else {
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
    res.status(500).json({ error: err.message });
  }
});

router.delete("/partners/:id", requireStaffAuth, requirePermission("partners"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.execute("DELETE FROM partner WHERE id = ?", [id]);
    res.json({ status: "ok", message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
