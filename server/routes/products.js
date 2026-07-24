import express from "express";
import { db } from "../../database/db.js";
import { mapProduct } from "../utils.js";

const router = express.Router();

router.get("/products", async (req, res) => {
  try {
    const category = req.query.category;
    let rows;
    if (category) {
      rows = await db.query("SELECT * FROM product WHERE category = ? ORDER BY id ASC", [category]);
    } else {
      rows = await db.query("SELECT * FROM product ORDER BY id ASC");
    }
    res.json(rows.map(mapProduct));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/products", async (req, res) => {
  try {
    const p = req.body;
    const resId = await db.execute(
      `INSERT INTO product (
        code, name_en, name_hi, category, sub_en, sub_hi, 
        price, original_price, discount_tag, image_url, stock_count, 
        unit, unit_prices, pack_en, pack_hi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.code || "", p.nameEn || p.name || "", p.nameHi || p.name || "", p.category || "swastik",
        p.subEn || p.brand || "General", p.subHi || p.brand || "General", p.price || 0,
        p.originalPrice || null, p.discountTag || "", p.imageUrl || p.image || "", p.stockCount || 100,
        p.unit || "", p.unitPrices || "", p.packEn || "", p.packHi || ""
      ]
    );
    const newId = resId.lastID || 999;
    const rows = await db.query("SELECT * FROM product WHERE id = ?", [newId]);
    res.status(201).json(mapProduct(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = req.body;
    await db.execute(
      `UPDATE product SET 
        code = ?, name_en = ?, name_hi = ?, category = ?, sub_en = ?, sub_hi = ?, 
        price = ?, original_price = ?, discount_tag = ?, image_url = ?, stock_count = ?, 
        unit = ?, unit_prices = ?, pack_en = ?, pack_hi = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        p.code, p.nameEn, p.nameHi, p.category, p.subEn, p.subHi,
        p.price, p.originalPrice || null, p.discountTag, p.imageUrl, p.stockCount,
        p.unit, p.unitPrices, p.packEn, p.packHi, id
      ]
    );
    const rows = await db.query("SELECT * FROM product WHERE id = ?", [id]);
    res.json(mapProduct(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/products", async (req, res) => {
  try {
    await db.execute("DELETE FROM product");
    res.json({ status: "ok", message: "All products deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.execute("DELETE FROM product WHERE id = ?", [id]);
    res.json({ status: "ok", message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
