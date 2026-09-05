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
    const gstVal = p.gstPercent !== undefined ? Number(p.gstPercent) : (p.gst_percent !== undefined ? Number(p.gst_percent) : 5);
    const resId = await db.execute(
      `INSERT INTO product (
        code, name_en, name_hi, category, sub_en, sub_hi, 
        price, original_price, discount_tag, image_url, stock_count, 
        unit, unit_prices, pack_en, pack_hi, gst_percent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.code || "", p.nameEn || p.name || "", p.nameHi || p.name || "", p.category || "swastik",
        p.subEn || p.brand || "General", p.subHi || p.brand || "General", p.price || 0,
        p.originalPrice || null, p.discountTag || "", p.imageUrl || p.image || "", p.stockCount || 100,
        p.unit || "", p.unitPrices || "", p.packEn || "", p.packHi || "", gstVal
      ]
    );
    const newId = resId.lastID || 999;
    const rows = await db.query("SELECT * FROM product WHERE id = ?", [newId]);
    if (db.savePersistentSnapshot) {
      try { await db.savePersistentSnapshot(); } catch (e) {}
    }
    res.status(201).json(mapProduct(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await db.query("SELECT * FROM product WHERE id = ?", [id]);
    if (rows.length > 0) {
      res.json(mapProduct(rows[0]));
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = req.body;
    
    // Fetch existing product first for safe partial update
    const existing = await db.query("SELECT * FROM product WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    const current = existing[0];

    const code = p.code !== undefined ? p.code : current.code;
    const nameEn = p.nameEn !== undefined ? p.nameEn : (p.name !== undefined ? p.name : current.name_en);
    const nameHi = p.nameHi !== undefined ? p.nameHi : (p.name !== undefined ? p.name : current.name_hi);
    const category = p.category !== undefined ? p.category : current.category;
    const subEn = p.subEn !== undefined ? p.subEn : (p.brand !== undefined ? p.brand : current.sub_en);
    const subHi = p.subHi !== undefined ? p.subHi : (p.brand !== undefined ? p.brand : current.sub_hi);
    const price = p.price !== undefined ? p.price : current.price;
    const originalPrice = p.originalPrice !== undefined ? p.originalPrice : (p.mrp !== undefined ? p.mrp : current.original_price);
    const discountTag = p.discountTag !== undefined ? p.discountTag : current.discount_tag;
    const imageUrl = p.imageUrl !== undefined ? p.imageUrl : (p.image !== undefined ? p.image : current.image_url);
    const stockCount = p.stockCount !== undefined ? p.stockCount : (p.stock !== undefined ? p.stock : current.stock_count);
    const unit = p.unit !== undefined ? p.unit : current.unit;
    const unitPrices = p.unitPrices !== undefined ? p.unitPrices : current.unit_prices;
    const packEn = p.packEn !== undefined ? p.packEn : current.pack_en;
    const packHi = p.packHi !== undefined ? p.packHi : current.pack_hi;
    const gstVal = p.gstPercent !== undefined ? Number(p.gstPercent) : (p.gst_percent !== undefined ? Number(p.gst_percent) : (p.gstRate !== undefined ? Number(p.gstRate) : current.gst_percent));

    await db.execute(
      `UPDATE product SET 
        code = ?, name_en = ?, name_hi = ?, category = ?, sub_en = ?, sub_hi = ?, 
        price = ?, original_price = ?, discount_tag = ?, image_url = ?, stock_count = ?, 
        unit = ?, unit_prices = ?, pack_en = ?, pack_hi = ?, gst_percent = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        code, nameEn, nameHi, category, subEn, subHi,
        price, originalPrice, discountTag, imageUrl, stockCount,
        unit, unitPrices, packEn, packHi, gstVal, id
      ]
    );
    const rows = await db.query("SELECT * FROM product WHERE id = ?", [id]);
    if (db.savePersistentSnapshot) {
      try { await db.savePersistentSnapshot(); } catch (e) {}
    }
    res.json(mapProduct(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/products", async (req, res) => {
  try {
    try {
      await db.execute("UPDATE order_item SET product_id = NULL");
    } catch (e) {}
    await db.execute("DELETE FROM product");
    if (db.savePersistentSnapshot) {
      try { await db.savePersistentSnapshot(); } catch (e) {}
    }
    res.json({ status: "ok", message: "All products deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    try {
      await db.execute("UPDATE order_item SET product_id = NULL WHERE product_id = ?", [id]);
    } catch (e) {}
    await db.execute("DELETE FROM product WHERE id = ?", [id]);
    if (db.savePersistentSnapshot) {
      try { await db.savePersistentSnapshot(); } catch (e) {}
    }
    res.json({ status: "ok", message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
