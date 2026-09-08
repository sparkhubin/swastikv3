import express from "express";
import { db } from "../../database/db.js";
import { mapProduct } from "../utils.js";

const router = express.Router();

// Helper to ensure database never stores full domain URLs; only clean filenames/codes
export function cleanImageStorageValue(raw, code = '') {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes('photo-1542838132-92c53300491e') || trimmed.includes('unsplash.com')) {
    return '';
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const parts = parsed.pathname.split('/');
      const last = parts[parts.length - 1];
      if (last && !last.includes('photo-1542838132-92c53300491e')) {
        return decodeURIComponent(last);
      }
      return '';
    } catch {
      return '';
    }
  }
  if (trimmed.startsWith('/uploads/')) {
    return trimmed.replace(/^\/uploads\//, '');
  }
  return trimmed;
}

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
    const cleanedImg = cleanImageStorageValue(p.imageUrl || p.image || "", p.code || "");
    const resId = await db.execute(
      `INSERT INTO product (
        code, name_en, name_hi, category, sub_en, sub_hi, 
        price, original_price, discount_tag, image_url, stock_count, 
        unit, unit_prices, pack_en, pack_hi, gst_percent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.code || "", p.nameEn || p.name || "", p.nameHi || p.name || "", p.category || "swastik",
        p.subEn || p.brand || "General", p.subHi || p.brand || "General", p.price || 0,
        p.originalPrice || null, p.discountTag || "", cleanedImg, p.stockCount || 100,
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
    // Self-healing: if a missing column like gst_percent caused the failure, auto-migrate and retry once
    if (err.message && (err.message.includes("no column named") || err.message.includes("Unknown column"))) {
      try {
        console.log("⚠️ Missing column detected in product table. Auto-triggering db.migrateSchema()...");
        await db.migrateSchema();
        const p = req.body;
        const gstVal = p.gstPercent !== undefined ? Number(p.gstPercent) : (p.gst_percent !== undefined ? Number(p.gst_percent) : 5);
        const cleanedImg = cleanImageStorageValue(p.imageUrl || p.image || "", p.code || "");
        const retryResId = await db.execute(
          `INSERT INTO product (
            code, name_en, name_hi, category, sub_en, sub_hi, 
            price, original_price, discount_tag, image_url, stock_count, 
            unit, unit_prices, pack_en, pack_hi, gst_percent
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.code || "", p.nameEn || p.name || "", p.nameHi || p.name || "", p.category || "swastik",
            p.subEn || p.brand || "General", p.subHi || p.brand || "General", p.price || 0,
            p.originalPrice || null, p.discountTag || "", cleanedImg, p.stockCount || 100,
            p.unit || "", p.unitPrices || "", p.packEn || "", p.packHi || "", gstVal
          ]
        );
        const retryId = retryResId.lastID || 999;
        const retryRows = await db.query("SELECT * FROM product WHERE id = ?", [retryId]);
        if (db.savePersistentSnapshot) {
          try { await db.savePersistentSnapshot(); } catch (e) {}
        }
        return res.status(201).json(mapProduct(retryRows[0]));
      } catch (retryErr) {
        return res.status(500).json({ error: retryErr.message });
      }
    }
    res.status(500).json({ error: err.message });
  }
});

// Helper to flexibly extract field values regardless of casing, punctuation (e.g. M.R.P. vs MRP), or alternative column labels
function extractFieldValue(raw, candidateKeys) {
  if (!raw || typeof raw !== 'object') return undefined;
  
  // 1. Exact key match
  for (const key of candidateKeys) {
    if (raw[key] !== undefined && raw[key] !== null && String(raw[key]).trim() !== '') {
      return raw[key];
    }
  }

  // 2. Normalized alphanumeric key match (strips punctuation, dots, spaces, parens, currency signs)
  const entries = Object.entries(raw);
  for (const key of candidateKeys) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [rKey, rVal] of entries) {
      if (rVal !== undefined && rVal !== null && String(rVal).trim() !== '') {
        const cleanRKey = rKey.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanRKey === cleanKey) {
          return rVal;
        }
      }
    }
  }
  return undefined;
}

// Bulk Upload Products (Excel & JSON with validation: skip or update, preserve code, prevent duplicate names)
router.post("/products/bulk-upload-before", async (req, res) => {
  try {
    const { items = [], mode = "update_existing", defaultCategory = "swastik" } = req.body;
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
        raw["Product Name"] ||
        raw["Name"] ||
        raw.name ||
        raw.nameEn ||
        raw.nameHi ||
        ""
      ).trim();

      if (!name) {
        details.push({ index, status: "skipped", reason: "Missing Product Name" });
        continue;
      }

      // 2. M.R.P. (Primary user requested column, e.g. "60.00" or 60)
      const mrpVal = extractFieldValue(raw, [
        "M.R.P.",
        "M.R.P",
        "MRP",
        "Original Price crossed out (₹)",
        "Original Price",
        "OriginalPrice",
        "List Price",
        "originalPrice",
        "original_price",
        "mrp"
      ]);
      const mrpNum = (mrpVal !== undefined && mrpVal !== null && String(mrpVal).trim() !== "")
        ? Number(String(mrpVal).replace(/[^0-9.]/g, ''))
        : null;
      const originalPrice = (mrpNum !== null && !isNaN(mrpNum) && mrpNum > 0) ? mrpNum : null;

      // 3. Sales Price (Primary user requested column, e.g. "50.00" or 50)
      const salesPriceVal = extractFieldValue(raw, [
        "Sales Price",
        "Sale Price",
        "Selling Price",
        "Base Price / Default rate (₹)",
        "Price",
        "Rate",
        "price",
        "salesPrice",
        "sales_price",
        "sale_price"
      ]);
      const salesPriceNum = (salesPriceVal !== undefined && salesPriceVal !== null && String(salesPriceVal).trim() !== "")
        ? Number(String(salesPriceVal).replace(/[^0-9.]/g, ''))
        : 0;
      const price = Math.max(0, (!isNaN(salesPriceNum) ? salesPriceNum : 0));

      // 4. Category (Defaults to "swastik")
      const catVal = extractFieldValue(raw, [
        "Category",
        "Product Department Category",
        "Department",
        "category",
        "cat"
      ]);
      const category = String(catVal || defaultCategory || "swastik").trim().toLowerCase();

      // 5. Brand (Defaults to detected first word from name or "Swastik")
      const brandVal = extractFieldValue(raw, [
        "Brand",
        "Brand / Segment Tag",
        "Brand Name",
        "brand",
        "brandTag",
        "subEn",
        "subHi"
      ]);
      let brandTag = String(brandVal || "").trim();
      if (!brandTag) {
        const firstWord = name.split(/\s+/)[0];
        if (firstWord && firstWord.length >= 2 && !/^\d+$/.test(firstWord)) {
          brandTag = firstWord.toUpperCase();
        } else {
          brandTag = "Swastik";
        }
      }

      // 6. Unit (Extracts weight from name like "200G" in "ZOFF SOYA BADI 200G" or defaults to "1 Unit")
      const unitVal = extractFieldValue(raw, [
        "Unit",
        "Available Weight / Product Units",
        "Units",
        "Weight",
        "Pack",
        "Pack Size",
        "unit",
        "packEn",
        "packHi"
      ]);
      let unit = String(unitVal || "").trim();
      if (!unit) {
        const unitMatch = name.match(/(\d+(?:\.\d+)?\s*(?:kg|g|gm|gms|gram|grams|ml|l|ltr|litre|litres|pcs|pc|pack|dozen|badi))\b/i);
        if (unitMatch) {
          unit = unitMatch[1].trim();
        } else {
          unit = "1 Unit";
        }
      }

      // 7. Discount Ribbon (Auto-computes from MRP and Sales Price if not provided)
      const discountVal = extractFieldValue(raw, [
        "Discount",
        "Discount ribbon label text",
        "Discount (%)",
        "discount",
        "discountTag",
        "DiscountRibbon"
      ]);
      let discount = String(discountVal || "").trim();
      if (!discount && originalPrice && price && originalPrice > price) {
        const saveAmt = Math.round(originalPrice - price);
        const pct = Math.round(((originalPrice - price) / originalPrice) * 100);
        if (pct >= 5) {
          discount = `${pct}% OFF`;
        } else if (saveAmt > 0) {
          discount = `Save ₹${saveAmt}`;
        }
      }

      // 8. Stock Count (Defaults to 100)
      const stockVal = extractFieldValue(raw, [
        "Stock",
        "Physical Stock Count (Qty)",
        "Stock Count",
        "Qty",
        "Quantity",
        "stockCount",
        "stock",
        "qty"
      ]);
      const stockNum = (stockVal !== undefined && stockVal !== null && String(stockVal).trim() !== "")
        ? Math.floor(Number(String(stockVal).replace(/[^0-9]/g, '')))
        : 100;
      const stockCount = (!isNaN(stockNum) && stockNum >= 0) ? stockNum : 100;

      // 9. Product Code (Preserved if matching existing item, auto-assigned if empty)
      const codeVal = extractFieldValue(raw, [
        "Product Code",
        "Code",
        "Unique Product Code (e.g. SP000001)",
        "Barcode",
        "Item Code",
        "code",
        "productCode"
      ]);
      const incomingCode = String(codeVal || "").trim();

      // 10. GST (%) (Defaults to 5%)
      const gstVal = extractFieldValue(raw, [
        "GST (%)",
        "GST Rate (%) / जीएसटी दर",
        "GST Rate",
        "GST",
        "GstPercent",
        "gstPercent",
        "gst_percent",
        "gst"
      ]);
      const gstNum = (gstVal !== undefined && gstVal !== null && String(gstVal).trim() !== "")
        ? Number(String(gstVal).replace(/[^0-9.]/g, ''))
        : 5;
      const gstPercent = (!isNaN(gstNum) && gstNum >= 0) ? gstNum : 5;

      // 11. Image URL (Retains existing product photo or sets clean fallback)
      const imageVal = extractFieldValue(raw, [
        "Image URL",
        "Product Illustration Image URL",
        "Image",
        "ImageUrl",
        "image",
        "imageUrl",
        "Photo",
        "photo"
      ]);
      const image = String(imageVal || "").trim();

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

          const cleanedIncomingImage = cleanImageStorageValue(image, finalCode);
          const finalImage = cleanedIncomingImage || cleanImageStorageValue(existing.image_url, finalCode);
          const finalPrice = price > 0 ? price : (existing.price || 0);
          const finalOrigPrice = originalPrice !== null ? originalPrice : existing.original_price;
          const finalDiscount = discount || existing.discount_tag || "";
          const finalCategory = (catVal ? category : existing.category) || "swastik";
          const finalBrand = (brandVal ? brandTag : existing.sub_en) || brandTag;
          const finalStock = (stockVal !== undefined ? stockCount : existing.stock_count) || 100;
          const packEn = unit ? unit.split(',')[0].trim() : (existing.pack_en || "1 Unit");
          const packHi = packEn;
          const finalUnit = unit || existing.unit || "1 Unit";
          const finalUnitPrices = raw.unitPrices || existing.unit_prices || `${packEn}:${finalPrice}`;

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
              finalCategory,
              finalBrand,
              finalBrand,
              finalPrice,
              finalOrigPrice,
              finalDiscount,
              finalImage,
              finalStock,
              finalUnit,
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
          existing.price = finalPrice;
          existing.original_price = finalOrigPrice;
          existing.category = finalCategory;
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
        // Brand new item: insert into database
        const finalCode = incomingCode || generateUniqueCode(category);
        const finalImage = cleanImageStorageValue(image, finalCode);
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


router.post("/products/bulk-upload", async (req, res) => {
  try {
    const {
      items = [],
      defaultCategory = "vegetables"
    } = req.body;

    // ============================================================
    // 1. VALIDATE INPUT
    // ============================================================

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No products provided in items array"
      });
    }

    // ============================================================
    // 2. FETCH EXISTING PRODUCTS
    // ============================================================

    const allProducts = await db.query(
      "SELECT * FROM product ORDER BY id ASC"
    );

    // ============================================================
    // 3. CREATE NAME MAP
    //
    // Same name = SKIP
    //
    // Case-insensitive + trims spaces.
    //
    // Example:
    // "ZOFF SOYA BADI 200G"
    // "zoff soya badi 200g"
    // " ZOFF SOYA BADI 200G "
    //
    // All are considered the same product.
    // ============================================================

    const nameMap = new Map();

    allProducts.forEach((p) => {
      if (p.name_en && String(p.name_en).trim()) {
        nameMap.set(
          String(p.name_en).trim().toLowerCase(),
          p
        );
      }

      if (p.name_hi && String(p.name_hi).trim()) {
        nameMap.set(
          String(p.name_hi).trim().toLowerCase(),
          p
        );
      }
    });

    // ============================================================
    // 4. CREATE CODE MAP
    //
    // Used only to make sure automatically generated codes
    // are unique.
    // ============================================================

    const codeMap = new Map();

    allProducts.forEach((p) => {
      if (p.code && String(p.code).trim()) {
        codeMap.set(
          String(p.code).trim().toLowerCase(),
          p
        );
      }
    });

    // ============================================================
    // 5. FIND HIGHEST EXISTING SP CODE
    //
    // Example:
    // SP000001
    // SP000002
    // SP000250
    //
    // Next generated code = SP000251
    // ============================================================

    let maxNum = 0;

    allProducts.forEach((p) => {
      const code = String(p.code || "");

      const match = code.match(/SP(\d+)/i);

      if (match) {
        const num = parseInt(match[1], 10);

        if (Number.isFinite(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    // Safety fallback
    if (maxNum < allProducts.length) {
      maxNum = allProducts.length;
    }

    const generateUniqueCode = () => {
      let code;

      do {
        maxNum++;

        code = `SP${String(maxNum).padStart(6, "0")}`;
      } while (codeMap.has(code.toLowerCase()));

      return code;
    };

    // ============================================================
    // 6. STATISTICS
    // ============================================================

    let insertedCount = 0;
    let skippedCount = 0;
    let invalidCount = 0;

    const details = [];

    // ============================================================
    // 7. PROCESS EVERY IMPORTED PRODUCT
    // ============================================================

    for (let index = 0; index < items.length; index++) {
      const raw = items[index];

      // ----------------------------------------------------------
      // Invalid row
      // ----------------------------------------------------------

      if (!raw || typeof raw !== "object") {
        invalidCount++;

        details.push({
          index,
          status: "invalid",
          reason: "Invalid product object"
        });

        continue;
      }

      // ==========================================================
      // 8. PRODUCT NAME
      //
      // Your JSON format:
      //
      // "Product Name": "ZOFF SOYA BADI 200G"
      //
      // ==========================================================

      const nameRaw =
        raw["Product Name"] ??
        raw["Product Display Name"] ??
        raw["Name"] ??
        raw.name ??
        "";

      const name = String(nameRaw).trim();

      // Product name is mandatory
      if (!name) {
        invalidCount++;

        details.push({
          index,
          status: "invalid",
          reason: "Missing Product Name"
        });

        continue;
      }

      // Normalize name for duplicate checking
      const normalizedName = name
        .trim()
        .toLowerCase();

      // ==========================================================
      // 9. CHECK IF SAME PRODUCT NAME ALREADY EXISTS
      //
      // IMPORTANT:
      //
      // If same name exists:
      //      SKIP
      //
      // We DO NOT:
      //      update
      //      delete
      //      replace
      //      change price
      //      change image
      //      change stock
      //
      // Existing product remains EXACTLY as it is.
      // ==========================================================

      if (nameMap.has(normalizedName)) {
        const existing = nameMap.get(normalizedName);

        skippedCount++;

        details.push({
          index,
          name,
          code: existing.code || null,
          status: "skipped",
          reason: "Product with same name already exists"
        });

        continue;
      }

      // ==========================================================
      // 10. M.R.P.
      //
      // Your JSON:
      //
      // "M.R.P.": "60.00"
      //
      // Stored as:
      //
      // original_price
      //
      // ==========================================================

      const mrpRaw =
        raw["M.R.P."] ??
        raw["MRP"] ??
        raw["Original Price"] ??
        raw["OriginalPrice"] ??
        null;

      let originalPrice = null;

      if (
        mrpRaw !== null &&
        mrpRaw !== undefined &&
        String(mrpRaw).trim() !== ""
      ) {
        const parsedMRP = Number(
          String(mrpRaw).replace(/[^0-9.-]/g, "")
        );

        if (Number.isFinite(parsedMRP) && parsedMRP > 0) {
          originalPrice = parsedMRP;
        }
      }

      // ==========================================================
      // 11. SALES PRICE
      //
      // Your JSON:
      //
      // "Sales Price": "50.00"
      //
      // Stored as:
      //
      // price
      //
      // ==========================================================

      const salesPriceRaw =
        raw["Sales Price"] ??
        raw["Price"] ??
        raw.price ??
        0;

      let price = Number(
        String(salesPriceRaw).replace(/[^0-9.-]/g, "")
      );

      if (!Number.isFinite(price) || price < 0) {
        price = 0;
      }

      // ==========================================================
      // 12. OPTIONAL FIELDS
      //
      // These are NOT required for your current JSON.
      //
      // If they don't exist, sensible defaults are used because
      // this is a BRAND NEW product.
      // ==========================================================

      const category = String(
        raw["Product Department Category"] ??
        raw["Category"] ??
        raw.category ??
        defaultCategory ??
        "swastik"
      )
        .trim()
        .toLowerCase();

      const brandTag = String(
        raw["Brand / Segment Tag"] ??
        raw["Brand"] ??
        raw.brandTag ??
        raw.brand ??
        "General"
      ).trim();

      const unit = String(
        raw["Available Weight / Product Units"] ??
        raw["Unit"] ??
        raw["Units"] ??
        raw.unit ??
        "1 Unit"
      ).trim();

      const discount = String(
        raw["Discount ribbon label text"] ??
        raw["Discount"] ??
        raw["DiscountRibbon"] ??
        raw.discount ??
        raw.discountTag ??
        ""
      ).trim();

      const stockRaw =
        raw["Physical Stock Count (Qty)"] ??
        raw["Stock"] ??
        raw["StockCount"] ??
        raw["Qty"] ??
        raw.stockCount ??
        100;

      let stockCount = Number(stockRaw);

      if (!Number.isFinite(stockCount) || stockCount < 0) {
        stockCount = 100;
      } else {
        stockCount = Math.floor(stockCount);
      }

      const gstRaw =
        raw["GST Rate (%) / जीएसटी दर"] ??
        raw["GST (%)"] ??
        raw["GST"] ??
        raw["GstPercent"] ??
        raw.gstPercent ??
        raw.gst_percent ??
        5;

      let gstPercent = Number(
        String(gstRaw).replace(/[^0-9.-]/g, "")
      );

      if (!Number.isFinite(gstPercent) || gstPercent < 0) {
        gstPercent = 5;
      }

      // ==========================================================
      // 13. IMAGE
      //
      // Your current JSON doesn't contain an image.
      //
      // Therefore use your existing default image.
      //
      // You can later upload/replace images separately.
      // ==========================================================

      const image = String(
        raw["Product Illustration Image URL"] ??
        raw["Image"] ??
        raw["ImageUrl"] ??
        raw.image ??
        raw.imageUrl ??
        ""
      ).trim();

      const finalImage =
        image.length > 5
          ? image
          : "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400";

      // ==========================================================
      // 14. PRODUCT CODE
      //
      // Your current JSON doesn't have a code.
      //
      // Generate one automatically.
      //
      // Example:
      // SP000301
      // ==========================================================

      const finalCode = generateUniqueCode();

      // ==========================================================
      // 15. UNIT PRICE
      // ==========================================================

      const packEn = unit
        ? unit.split(",")[0].trim()
        : "1 Unit";

      const packHi = packEn;

      const finalUnitPrices =
        raw.unitPrices ||
        `${packEn}:${price}`;

      // ==========================================================
      // 16. INSERT NEW PRODUCT
      // ==========================================================

      const insertRes = await db.execute(
        `INSERT INTO product (
          code,
          name_en,
          name_hi,
          category,
          sub_en,
          sub_hi,
          price,
          original_price,
          discount_tag,
          image_url,
          stock_count,
          unit,
          unit_prices,
          pack_en,
          pack_hi,
          gst_percent
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finalCode,
          name,
          name,
          category,
          brandTag,
          brandTag,
          price,
          originalPrice,
          discount,
          finalImage,
          stockCount,
          unit,
          finalUnitPrices,
          packEn,
          packHi,
          gstPercent
        ]
      );

      // ==========================================================
      // 17. GET NEW PRODUCT ID
      // ==========================================================

      const newId =
        insertRes.lastID ||
        insertRes.insertId ||
        null;

      // ==========================================================
      // 18. ADD NEW PRODUCT TO MAP
      //
      // This is VERY important.
      //
      // If the same product appears twice inside your 300-item
      // JSON file, the second one will now be skipped.
      // ==========================================================

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

      nameMap.set(
        normalizedName,
        newProductObj
      );

      codeMap.set(
        finalCode.toLowerCase(),
        newProductObj
      );

      // ==========================================================
      // 19. STATISTICS
      // ==========================================================

      insertedCount++;

      details.push({
        index,
        name,
        code: finalCode,
        status: "inserted"
      });
    }

    // ============================================================
    // 20. SAVE PERSISTENT SNAPSHOT
    // ============================================================

    if (db.savePersistentSnapshot) {
      try {
        await db.savePersistentSnapshot();
      } catch (snapshotError) {
        console.error(
          "Persistent snapshot save error:",
          snapshotError
        );
      }
    }

    // ============================================================
    // 21. FETCH FINAL CATALOG
    // ============================================================

    const updatedCatalog = await db.query(
      "SELECT * FROM product ORDER BY id ASC"
    );

    // ============================================================
    // 22. RESPONSE
    // ============================================================

    return res.json({
      success: true,

      stats: {
        totalProcessed: items.length,
        insertedCount,
        skippedCount,
        invalidCount,
        totalCatalogItems: updatedCatalog.length
      },

      details: details.slice(0, 500),

      products: updatedCatalog.map(mapProduct)
    });

  } catch (err) {
    console.error("Bulk upload error:", err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
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
    const rawImg = p.imageUrl !== undefined ? p.imageUrl : (p.image !== undefined ? p.image : current.image_url);
    const imageUrl = cleanImageStorageValue(rawImg, code);
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
    if (err.message && (err.message.includes("no column named") || err.message.includes("Unknown column"))) {
      try {
        console.log("⚠️ Missing column detected in product table. Auto-triggering db.migrateSchema()...");
        await db.migrateSchema();
        const p = req.body;
        const currentRes = await db.query("SELECT * FROM product WHERE id = ?", [req.params.id]);
        const current = currentRes[0] || {};
        const code = p.code !== undefined ? p.code : current.code;
        const nameEn = p.nameEn !== undefined ? p.nameEn : (p.name !== undefined ? p.name : current.name_en);
        const nameHi = p.nameHi !== undefined ? p.nameHi : (p.name !== undefined ? p.name : current.name_hi);
        const category = p.category !== undefined ? p.category : current.category;
        const subEn = p.subEn !== undefined ? p.subEn : (p.brand !== undefined ? p.brand : current.sub_en);
        const subHi = p.subHi !== undefined ? p.subHi : (p.brand !== undefined ? p.brand : current.sub_hi);
        const price = p.price !== undefined ? p.price : current.price;
        const originalPrice = p.originalPrice !== undefined ? p.originalPrice : (p.mrp !== undefined ? p.mrp : current.original_price);
        const discountTag = p.discountTag !== undefined ? p.discountTag : current.discount_tag;
        const rawImg = p.imageUrl !== undefined ? p.imageUrl : (p.image !== undefined ? p.image : current.image_url);
        const imageUrl = cleanImageStorageValue(rawImg, code);
        const stockCount = p.stockCount !== undefined ? p.stockCount : (p.stock !== undefined ? p.stock : current.stock_count);
        const unit = p.unit !== undefined ? p.unit : current.unit;
        const unitPrices = p.unitPrices !== undefined ? p.unitPrices : current.unit_prices;
        const packEn = p.packEn !== undefined ? p.packEn : current.pack_en;
        const packHi = p.packHi !== undefined ? p.packHi : current.pack_hi;
        const gstVal = p.gstPercent !== undefined ? Number(p.gstPercent) : (p.gst_percent !== undefined ? Number(p.gst_percent) : (p.gstRate !== undefined ? Number(p.gstRate) : (current.gst_percent || 5)));

        await db.execute(
          `UPDATE product SET 
            code = ?, name_en = ?, name_hi = ?, category = ?, sub_en = ?, sub_hi = ?, 
            price = ?, original_price = ?, discount_tag = ?, image_url = ?, stock_count = ?, 
            unit = ?, unit_prices = ?, pack_en = ?, pack_hi = ?, gst_percent = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [
            code, nameEn, nameHi, category, subEn, subHi,
            price, originalPrice, discountTag, imageUrl, stockCount,
            unit, unitPrices, packEn, packHi, gstVal, req.params.id
          ]
        );
        const retryRows = await db.query("SELECT * FROM product WHERE id = ?", [req.params.id]);
        if (db.savePersistentSnapshot) {
          try { await db.savePersistentSnapshot(); } catch (e) {}
        }
        return res.json(mapProduct(retryRows[0]));
      } catch (retryErr) {
        return res.status(500).json({ error: retryErr.message });
      }
    }
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
