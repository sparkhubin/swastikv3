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

// Bulk Upload Products (Excel & JSON with validation: skip or update, preserve code, prevent duplicate names)
router.post("/products/bulk-upload", async (req, res) => {
  try {
    const { items = [], mode = "update_existing", defaultCategory = "vegetables" } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No products provided in items array" });
    }

    // Fetch all existing products from database
    const allProducts = await db.query("SELECT * FROM product ORDER BY id ASC");
    
    // Index by lowercase trimmed code and lowercase trimmed name_en / name_hi
    const codeMap = new Map();
    const nameMap = new Map();
    
    allProducts.forEach(p => {
      if (p.code && String(p.code).trim()) {
        codeMap.set(String(p.code).trim().toLowerCase(), p);
      }
      if (p.name_en && String(p.name_en).trim()) {
        nameMap.set(String(p.name_en).trim().toLowerCase(), p);
      }
      if (p.name_hi && String(p.name_hi).trim()) {
        nameMap.set(String(p.name_hi).trim().toLowerCase(), p);
      }
    });

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let duplicatesPrevented = 0;
    let codesPreserved = 0;
    const details = [];

    // Helper for auto-generating unique SP code if needed (e.g. SP000001)
    let maxNum = 0;
    allProducts.forEach(p => {
      const match = String(p.code || '').match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    if (maxNum < allProducts.length) maxNum = allProducts.length;

    const generateUniqueCode = (category) => {
      maxNum++;
      const prefix = "SP";
      return `${prefix}${String(maxNum).padStart(6, '0')}`;
    };

    for (let index = 0; index < items.length; index++) {
      const raw = items[index];
      if (!raw || typeof raw !== 'object') continue;

      // Extract all 11 fields supporting both user friendly exact names and camelCase/shorthand
      const name = (
        raw["Product Display Name"] ||
        raw["Name"] ||
        raw.name ||
        raw.nameEn ||
        raw.nameHi ||
        ""
      ).trim();

      if (!name) {
        details.push({ index, status: "skipped", reason: "Missing Product Display Name" });
        continue;
      }

      const brandTag = (
        raw["Brand / Segment Tag"] ||
        raw["Brand"] ||
        raw.brandTag ||
        raw.brand ||
        raw.subEn ||
        raw.subHi ||
        "General"
      ).trim();

      const category = (
        raw["Product Department Category"] ||
        raw["Category"] ||
        raw.category ||
        defaultCategory ||
        "vegetables"
      ).trim().toLowerCase();

      const unit = (
        raw["Available Weight / Product Units"] ||
        raw["Unit"] ||
        raw["Units"] ||
        raw.unit ||
        "1 Unit"
      ).trim();

      const priceRaw = raw["Base Price / Default rate (₹)"] ?? raw["Price"] ?? raw.price ?? 0;
      const price = Math.max(0, Number(priceRaw) || 0);

      const origPriceRaw = raw["Original Price crossed out (₹)"] ?? raw["OriginalPrice"] ?? raw["MRP"] ?? raw.originalPrice;
      const originalPrice = origPriceRaw !== undefined && origPriceRaw !== null && origPriceRaw !== "" && Number(origPriceRaw) > 0 ? Number(origPriceRaw) : null;

      const discount = (
        raw["Discount ribbon label text"] ||
        raw["Discount"] ||
        raw["DiscountRibbon"] ||
        raw.discount ||
        raw.discountTag ||
        ""
      ).trim();

      const stockRaw = raw["Physical Stock Count (Qty)"] ?? raw["Stock"] ?? raw["StockCount"] ?? raw["Qty"] ?? raw.stockCount ?? 100;
      const stockCount = Number(stockRaw) >= 0 ? Math.floor(Number(stockRaw)) : 100;

      const incomingCode = (
        raw["Unique Product Code (e.g. SP000001)"] ||
        raw["Code"] ||
        raw["ProductCode"] ||
        raw.code ||
        ""
      ).trim();

      const gstRaw = raw["GST Rate (%) / जीएसटी दर"] ?? raw["GST (%)"] ?? raw["GST"] ?? raw["GstPercent"] ?? raw.gstPercent ?? raw.gst_percent ?? 5;
      const gstPercent = Number(String(gstRaw).replace(/[^0-9.]/g, '')) || 0;

      const image = (
        raw["Product Illustration Image URL"] ||
        raw["Image"] ||
        raw["ImageUrl"] ||
        raw.image ||
        raw.imageUrl ||
        ""
      ).trim();

      const normalizedName = name.toLowerCase();
      const normalizedIncomingCode = incomingCode.toLowerCase();

      // Check if already exists by code OR by name
      let existing = null;
      let matchedBy = null;

      if (normalizedIncomingCode && codeMap.has(normalizedIncomingCode)) {
        existing = codeMap.get(normalizedIncomingCode);
        matchedBy = "code";
      } else if (nameMap.has(normalizedName)) {
        existing = nameMap.get(normalizedName);
        matchedBy = "name";
      }

      if (existing) {
        if (mode === "skip_existing") {
          // If already exists then don't do anything
          skippedCount++;
          details.push({
            name,
            code: existing.code,
            status: "skipped",
            reason: `Already exists (${matchedBy === 'code' ? 'by Unique Code' : 'by Name'})`
          });
          continue;
        } else {
          // Update existing, PRESERVING product code and PREVENTING duplicate names!
          const finalCode = (incomingCode && incomingCode !== "") ? incomingCode : (existing.code || generateUniqueCode(category));
          codesPreserved++;
          if (matchedBy === "name") {
            duplicatesPrevented++;
          }

          const finalImage = image && image.length > 5 ? image : existing.image_url;
          const finalUnitPrices = raw.unitPrices || existing.unit_prices || (unit ? `${unit.split(',')[0].trim()}:${price}` : "");
          const packEn = unit ? unit.split(',')[0].trim() : (existing.pack_en || "1 Unit");
          const packHi = packEn;

          await db.execute(
            `UPDATE product SET 
              code = ?, name_en = ?, name_hi = ?, category = ?, sub_en = ?, sub_hi = ?, 
              price = ?, original_price = ?, discount_tag = ?, image_url = ?, stock_count = ?, 
              unit = ?, unit_prices = ?, pack_en = ?, pack_hi = ?, gst_percent = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
              finalCode,
              name,
              name,
              category || existing.category,
              brandTag || existing.sub_en,
              brandTag || existing.sub_hi,
              price,
              originalPrice,
              discount,
              finalImage,
              stockCount,
              unit,
              finalUnitPrices,
              packEn,
              packHi,
              gstPercent,
              existing.id
            ]
          );

          existing.code = finalCode;
          existing.name_en = name;
          existing.name_hi = name;
          codeMap.set(finalCode.toLowerCase(), existing);
          nameMap.set(name.toLowerCase(), existing);

          updatedCount++;
          details.push({
            name,
            code: finalCode,
            status: "updated",
            matchedBy
          });
        }
      } else {
        // Brand new item: enter/insert into database
        const finalCode = incomingCode || generateUniqueCode(category);
        const finalImage = image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400";
        const packEn = unit ? unit.split(',')[0].trim() : "1 Unit";
        const packHi = packEn;
        const finalUnitPrices = raw.unitPrices || `${packEn}:${price}`;

        const insertRes = await db.execute(
          `INSERT INTO product (
            code, name_en, name_hi, category, sub_en, sub_hi, 
            price, original_price, discount_tag, image_url, stock_count, 
            unit, unit_prices, pack_en, pack_hi, gst_percent
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            finalCode, name, name, category, brandTag, brandTag,
            price, originalPrice, discount, finalImage, stockCount,
            unit, finalUnitPrices, packEn, packHi, gstPercent
          ]
        );

        const newId = insertRes.lastID || (maxNum + 100);
        const newProductObj = {
          id: newId,
          code: finalCode,
          name_en: name,
          name_hi: name,
          category,
          sub_en: brandTag,
          sub_hi: brandTag,
          price,
          original_price: originalPrice,
          discount_tag: discount,
          image_url: finalImage,
          stock_count: stockCount,
          unit,
          unit_prices: finalUnitPrices,
          pack_en: packEn,
          pack_hi: packHi,
          gst_percent: gstPercent
        };

        codeMap.set(finalCode.toLowerCase(), newProductObj);
        nameMap.set(name.toLowerCase(), newProductObj);

        insertedCount++;
        details.push({
          name,
          code: finalCode,
          status: "inserted"
        });
      }
    }

    if (db.savePersistentSnapshot) {
      try { await db.savePersistentSnapshot(); } catch (e) {}
    }

    const updatedCatalog = await db.query("SELECT * FROM product ORDER BY id ASC");

    return res.json({
      success: true,
      stats: {
        totalProcessed: items.length,
        insertedCount,
        updatedCount,
        skippedCount,
        codesPreserved,
        duplicatesPrevented,
        totalCatalogItems: updatedCatalog.length
      },
      details: details.slice(0, 50),
      products: updatedCatalog.map(mapProduct)
    });
  } catch (err) {
    console.error("Bulk upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk Stock Update Menu API (Updates stock count across multiple items in one batch)
router.post("/products/bulk-stock", async (req, res) => {
  try {
    const { updates = [], action, category, value } = req.body;

    // 1. Batch item updates: [{ id, stockCount }, { code, stockCount }]
    if (Array.isArray(updates) && updates.length > 0) {
      let updatedCount = 0;
      for (const item of updates) {
        const stock = Number(item.stockCount ?? item.stock ?? item.quantity);
        if (isNaN(stock) || stock < 0) continue;

        if (item.id) {
          await db.execute(
            "UPDATE product SET stock_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [Math.floor(stock), Number(item.id)]
          );
          updatedCount++;
        } else if (item.code) {
          await db.execute(
            "UPDATE product SET stock_count = ?, updated_at = CURRENT_TIMESTAMP WHERE code = ?",
            [Math.floor(stock), String(item.code).trim()]
          );
          updatedCount++;
        }
      }

      if (db.savePersistentSnapshot) {
        try { await db.savePersistentSnapshot(); } catch (e) {}
      }

      const rows = await db.query("SELECT * FROM product ORDER BY id ASC");
      return res.json({
        success: true,
        updatedCount,
        products: rows.map(mapProduct)
      });
    }

    // 2. Mass category adjustment
    if (action && typeof value === 'number') {
      const catFilter = category && category !== 'all' ? " WHERE category = ?" : "";
      const params = category && category !== 'all' ? [category] : [];

      if (action === 'set') {
        const sql = `UPDATE product SET stock_count = ?, updated_at = CURRENT_TIMESTAMP${catFilter}`;
        await db.execute(sql, [Math.max(0, Math.floor(value)), ...params]);
      } else if (action === 'add') {
        const sql = `UPDATE product SET stock_count = MAX(0, stock_count + ?), updated_at = CURRENT_TIMESTAMP${catFilter}`;
        await db.execute(sql, [Math.floor(value), ...params]);
      }

      if (db.savePersistentSnapshot) {
        try { await db.savePersistentSnapshot(); } catch (e) {}
      }

      const rows = await db.query("SELECT * FROM product ORDER BY id ASC");
      return res.json({
        success: true,
        products: rows.map(mapProduct)
      });
    }

    return res.status(400).json({ error: "Invalid bulk stock payload: please supply updates array or category action" });
  } catch (err) {
    console.error("Bulk stock update error:", err);
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
