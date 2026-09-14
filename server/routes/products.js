import express from "express";
import { db } from "../../database/db.js";
import { audit, requirePermission, requireStaffAuth } from "../auth.js";

const router = express.Router();
export const PRODUCT_SELECT = `SELECT p.*,c.name_en AS category_name,c.slug AS category_slug,b.name AS brand_name,
  COALESCE(i.stock_qty,0) AS stock_qty,COALESCE(i.reserved_qty,0) AS reserved_qty,COALESCE(i.reorder_level,0) AS reorder_level
  FROM product p LEFT JOIN category c ON c.id=p.category_id LEFT JOIN brand b ON b.id=p.brand_id LEFT JOIN inventory i ON i.product_id=p.id`;

export function mapProduct(row) {
  let unitPrices = {};
  try { unitPrices = JSON.parse(row.unit_prices || "{}"); } catch { unitPrices = {}; }
  const available = Math.max(0, Number(row.stock_qty) - Number(row.reserved_qty));
  return {
    id: Number(row.id), code: row.code, nameEn: row.name_en, nameHi: row.name_hi || "",
    categoryId: row.category_id, category: row.category_slug || row.category_name || "",
    brandId: row.brand_id, brand: row.brand_name || row.sub_en || "", subEn: row.sub_en || "", subHi: row.sub_hi || "",
    price: Number(row.price), originalPrice: Number(row.original_price || 0), discountTag: row.discount_tag || "",
    imageUrl: row.image_url || "", isImage: Boolean(row.is_image), unit: row.unit || "", unitPrices,
    packEn: row.pack_en || "", packHi: row.pack_hi || "", gstPercent: Number(row.gst_percent),
    stockCount: available, stockQty: Number(row.stock_qty), reservedQty: Number(row.reserved_qty),
    reorderLevel: Number(row.reorder_level), isActive: Boolean(row.is_active)
  };
}

function number(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function categoryId(input, transaction = db) {
  if (input === undefined || input === null || input === "") return null;
  if (Number.isInteger(Number(input))) return Number(input);
  const row = await transaction.get("SELECT id FROM category WHERE slug=? OR lower(name_en)=lower(?) LIMIT 1", [String(input), String(input)]);
  if (!row) { const error = new Error("Unknown product category."); error.status = 400; throw error; }
  return row.id;
}

function normalizeProduct(body, current = {}) {
  const price = number(body.price, number(current.price, 0));
  const originalPrice = number(body.originalPrice ?? body.original_price, number(current.original_price, 0));
  const gst = number(body.gstPercent ?? body.gst_percent, number(current.gst_percent, 0));
  const nameEn = String(body.nameEn ?? body.name ?? current.name_en ?? "").trim();
  const code = String(body.code ?? current.code ?? "").trim();
  if (!code || code.length > 100 || !nameEn || nameEn.length > 255 || price < 0 || originalPrice < 0 || gst < 0) {
    const error = new Error("Code, name, price, original price, or GST value is invalid."); error.status = 400; throw error;
  }
  const rawUnitPrices = body.unitPrices ?? body.unit_prices ?? current.unit_prices ?? {};
  const unitPrices = typeof rawUnitPrices === "string" ? rawUnitPrices : JSON.stringify(rawUnitPrices);
  try { JSON.parse(unitPrices || "{}"); } catch { const error = new Error("unitPrices must be valid JSON."); error.status = 400; throw error; }
  return {
    code, nameEn, nameHi: String(body.nameHi ?? current.name_hi ?? ""), subEn: String(body.subEn ?? body.brand ?? current.sub_en ?? ""),
    subHi: String(body.subHi ?? current.sub_hi ?? ""), price, originalPrice, discountTag: String(body.discountTag ?? current.discount_tag ?? ""),
    imageUrl: String(body.imageUrl ?? body.image ?? current.image_url ?? ""), unit: String(body.unit ?? current.unit ?? ""), unitPrices,
    packEn: String(body.packEn ?? current.pack_en ?? ""), packHi: String(body.packHi ?? current.pack_hi ?? ""), gst,
    isImage: body.isImage === undefined ? Number(current.is_image || Boolean(body.imageUrl || body.image)) : Number(Boolean(body.isImage)),
    isActive: body.isActive === undefined ? Number(current.is_active ?? 1) : Number(Boolean(body.isActive))
  };
}

router.get("/products", async (req, res) => {
  try {
    const conditions = ["p.is_active=1"], params = [];
    if (req.query.is_image !== undefined) { conditions.push("p.is_image=?"); params.push(["1", "true"].includes(String(req.query.is_image).toLowerCase()) ? 1 : 0); }
    const rows = await db.query(`${PRODUCT_SELECT} WHERE ${conditions.join(" AND ")} ORDER BY p.id`, params);
    res.json(rows.map(mapProduct));
  } catch (error) { console.error("Product list failed:", error.message); res.status(500).json({ error: "Unable to load products." }); }
});

router.get("/products/:id", async (req, res) => {
  const row = await db.get(`${PRODUCT_SELECT} WHERE p.id=? AND p.is_active=1`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "Product not found." });
  res.json(mapProduct(row));
});

router.post("/products", requireStaffAuth, requirePermission("products"), async (req, res) => {
  try {
    const product = normalizeProduct(req.body || {});
    const stock = number(req.body?.stockCount ?? req.body?.stockQty, 0);
    const reorder = number(req.body?.reorderLevel, 0);
    if (stock < 0 || reorder < 0) return res.status(400).json({ error: "Stock values cannot be negative." });
    const createdId = await db.transaction(async tx => {
      const category = await categoryId(req.body?.categoryId ?? req.body?.category, tx);
      const result = await tx.execute(`INSERT INTO product (code,name_en,name_hi,category_id,brand_id,sub_en,sub_hi,price,original_price,discount_tag,image_url,unit,unit_prices,pack_en,pack_hi,gst_percent,is_image,is_active)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [product.code,product.nameEn,product.nameHi,category,req.body?.brandId || null,product.subEn,product.subHi,product.price,product.originalPrice,product.discountTag,product.imageUrl,product.unit,product.unitPrices,product.packEn,product.packHi,product.gst,product.isImage,product.isActive]);
      await tx.execute("INSERT INTO inventory (product_id,stock_qty,reserved_qty,reorder_level,unit) VALUES (?,?,0,?,?)", [result.lastID,stock,reorder,product.unit]);
      if (stock) await tx.execute("INSERT INTO stock_movement (product_id,type,quantity,before_qty,after_qty,reference_type,note,created_by_user_id) VALUES (?,'INITIAL',?,0,?,'PRODUCT','Initial stock',?)", [result.lastID,stock,stock,req.staff.id]);
      return result.lastID;
    });
    await audit("USER", req.staff.id, "CREATE_PRODUCT", "product", createdId, {}, req);
    res.status(201).json(mapProduct(await db.get(`${PRODUCT_SELECT} WHERE p.id=?`, [createdId])));
  } catch (error) { console.error("Product create failed:", error.message); res.status(error.status || (error.code === "SQLITE_CONSTRAINT" ? 409 : 500)).json({ error: error.status ? error.message : "Unable to create product." }); }
});

router.put("/products/:id", requireStaffAuth, requirePermission("products"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = await db.get("SELECT * FROM product WHERE id=?", [id]);
    if (!current) return res.status(404).json({ error: "Product not found." });
    const product = normalizeProduct(req.body || {}, current);
    await db.transaction(async tx => {
      const category = await categoryId(req.body?.categoryId ?? req.body?.category ?? current.category_id, tx);
      await tx.execute(`UPDATE product SET code=?,name_en=?,name_hi=?,category_id=?,brand_id=?,sub_en=?,sub_hi=?,price=?,original_price=?,discount_tag=?,image_url=?,unit=?,unit_prices=?,pack_en=?,pack_hi=?,gst_percent=?,is_image=?,is_active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`, [product.code,product.nameEn,product.nameHi,category,req.body?.brandId ?? current.brand_id,product.subEn,product.subHi,product.price,product.originalPrice,product.discountTag,product.imageUrl,product.unit,product.unitPrices,product.packEn,product.packHi,product.gst,product.isImage,product.isActive,id]);
      if (req.body?.stockCount !== undefined || req.body?.stockQty !== undefined) {
        const stock = number(req.body.stockCount ?? req.body.stockQty);
        const inventory = await tx.get("SELECT * FROM inventory WHERE product_id=?", [id]);
        if (stock === null || stock < Number(inventory.reserved_qty) || stock < 0) { const error = new Error("Stock cannot be negative or below reserved quantity."); error.status=409; throw error; }
        await tx.execute("UPDATE inventory SET stock_qty=?,unit=?,updated_at=CURRENT_TIMESTAMP WHERE product_id=?", [stock,product.unit,id]);
        if (stock !== Number(inventory.stock_qty)) await tx.execute("INSERT INTO stock_movement (product_id,type,quantity,before_qty,after_qty,reference_type,note,created_by_user_id) VALUES (?,'ADJUSTMENT',?,?,?,'PRODUCT','Product stock adjustment',?)", [id,stock-Number(inventory.stock_qty),inventory.stock_qty,stock,req.staff.id]);
      }
    });
    await audit("USER", req.staff.id, "UPDATE_PRODUCT", "product", id, {}, req);
    res.json(mapProduct(await db.get(`${PRODUCT_SELECT} WHERE p.id=?`, [id])));
  } catch (error) { console.error("Product update failed:", error.message); res.status(error.status || (error.code === "SQLITE_CONSTRAINT" ? 409 : 500)).json({ error: error.status ? error.message : "Unable to update product." }); }
});

router.post(["/products/bulk-upload", "/products/bulk-upload-before"], requireStaffAuth, requirePermission("products"), async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || !items.length || items.length > 5000) return res.status(400).json({ error: "Provide 1-5000 products." });
  try {
    const stats = { totalProcessed: items.length, insertedCount: 0, skippedCount: 0, invalidCount: 0 };
    await db.transaction(async tx => {
      for (const item of items) {
        let product;
        try { product = normalizeProduct(item); } catch { stats.invalidCount++; continue; }
        if (await tx.get("SELECT id FROM product WHERE code=?", [product.code])) { stats.skippedCount++; continue; }
        const category = await categoryId(item.categoryId ?? item.category ?? req.body.defaultCategory, tx);
        const stock = number(item.stockCount ?? item.stockQty, 0);
        if (stock < 0) { stats.invalidCount++; continue; }
        const result = await tx.execute(`INSERT INTO product (code,name_en,name_hi,category_id,sub_en,sub_hi,price,original_price,discount_tag,image_url,unit,unit_prices,pack_en,pack_hi,gst_percent,is_image,is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [product.code,product.nameEn,product.nameHi,category,product.subEn,product.subHi,product.price,product.originalPrice,product.discountTag,product.imageUrl,product.unit,product.unitPrices,product.packEn,product.packHi,product.gst,product.isImage,product.isActive]);
        await tx.execute("INSERT INTO inventory (product_id,stock_qty,reserved_qty,reorder_level,unit) VALUES (?,?,0,0,?)", [result.lastID,stock,product.unit]);
        stats.insertedCount++;
      }
    });
    await audit("USER", req.staff.id, "BULK_IMPORT_PRODUCTS", "product", "", stats, req);
    res.json({ success: true, stats, products: (await db.query(`${PRODUCT_SELECT} WHERE p.is_active=1 ORDER BY p.id`)).map(mapProduct) });
  } catch (error) { console.error("Product import failed:", error.message); res.status(500).json({ error: "Unable to import products." }); }
});

router.post("/products/bulk-stock", requireStaffAuth, requirePermission("inventory"), async (req, res) => {
  const updates = req.body?.updates;
  if (!Array.isArray(updates) || !updates.length || updates.length > 5000) return res.status(400).json({ error: "Explicit stock updates are required." });
  try {
    await db.transaction(async tx => {
      for (const update of updates) {
        const product = update.id ? await tx.get("SELECT id FROM product WHERE id=?", [update.id]) : await tx.get("SELECT id FROM product WHERE code=?", [String(update.code || "")]);
        const stock = number(update.stockCount ?? update.stock ?? update.quantity);
        if (!product || stock === null || stock < 0) { const error = new Error("Every stock update must identify a product and non-negative quantity."); error.status=400; throw error; }
        const inventory = await tx.get("SELECT * FROM inventory WHERE product_id=?", [product.id]);
        if (stock < Number(inventory.reserved_qty)) { const error = new Error(`Stock for product ${product.id} is below reserved quantity.`); error.status=409; throw error; }
        await tx.execute("UPDATE inventory SET stock_qty=?,updated_at=CURRENT_TIMESTAMP WHERE product_id=?", [stock,product.id]);
        if (stock !== Number(inventory.stock_qty)) await tx.execute("INSERT INTO stock_movement (product_id,type,quantity,before_qty,after_qty,reference_type,note,created_by_user_id) VALUES (?,'BULK_ADJUSTMENT',?,?,?,'INVENTORY','Bulk stock update',?)", [product.id,stock-Number(inventory.stock_qty),inventory.stock_qty,stock,req.staff.id]);
      }
    });
    await audit("USER", req.staff.id, "BULK_STOCK", "inventory", "", { count: updates.length }, req);
    res.json({ success: true, updatedCount: updates.length, products: (await db.query(`${PRODUCT_SELECT} WHERE p.is_active=1 ORDER BY p.id`)).map(mapProduct) });
  } catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to update stock." }); }
});

router.delete("/products", requireStaffAuth, requirePermission("products"), (_req, res) => res.status(405).json({ error: "Bulk product deletion is disabled." }));
router.delete("/products/:id", requireStaffAuth, requirePermission("products"), async (req, res) => {
  const result = await db.execute("UPDATE product SET is_active=0,updated_at=CURRENT_TIMESTAMP WHERE id=?", [req.params.id]);
  if (!result.changes) return res.status(404).json({ error: "Product not found." });
  await audit("USER", req.staff.id, "DEACTIVATE_PRODUCT", "product", req.params.id, {}, req);
  res.json({ success: true });
});

export default router;
