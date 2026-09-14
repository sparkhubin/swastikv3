import express from "express";
import { db } from "../../database/db.js";
import { audit, requireCustomerAuth } from "../auth.js";
import { mapProduct, PRODUCT_SELECT } from "./products.js";

const router = express.Router();
router.use("/cart", requireCustomerAuth);

async function cartFor(customerId, transaction = db) {
  let cart = await transaction.get("SELECT * FROM cart WHERE customer_id=?", [customerId]);
  if (!cart) {
    const created = await transaction.execute("INSERT INTO cart (customer_id) VALUES (?)", [customerId]);
    cart = await transaction.get("SELECT * FROM cart WHERE id=?", [created.lastID]);
  }
  return cart;
}

async function loadCart(customerId) {
  const cart = await cartFor(customerId);
  const coupon = cart.coupon_code ? await db.get("SELECT code,discount_type,discount_value,minimum_order_amount,maximum_discount_amount,starts_at,expires_at FROM coupon WHERE upper(code)=? AND is_active=1", [cart.coupon_code.toUpperCase()]) : null;
  const rows = await db.query(`${PRODUCT_SELECT.replace("SELECT p.*", "SELECT p.*,ci.qty AS cart_qty,ci.weight_label AS cart_weight_label,ci.unit_price AS cart_unit_price")}
    JOIN cart_item ci ON ci.product_id=p.id
    WHERE ci.cart_id=? AND p.is_active=1 ORDER BY ci.id`, [cart.id]);
  return {
    id: Number(cart.id), couponCode: coupon?.code || "", coupon: coupon ? {
      code: coupon.code, discountType: coupon.discount_type === "PERCENT" ? "percentage" : "fixed", value: Number(coupon.discount_value),
      minOrder: Number(coupon.minimum_order_amount), maxDiscount: coupon.maximum_discount_amount == null ? null : Number(coupon.maximum_discount_amount),
      startDate: coupon.starts_at || "", endDate: coupon.expires_at || ""
    } : null, updatedAt: cart.updated_at,
    items: rows.map(row => {
      return { product: mapProduct(row), quantity: Number(row.cart_qty), selectedUnit: row.cart_weight_label || row.unit || "", unitPrice: Number(row.cart_unit_price) };
    })
  };
}

function selectedUnitPrice(product, selectedUnit) {
  if (!selectedUnit) return Number(product.price);
  try {
    const prices = JSON.parse(product.unit_prices || "{}");
    const price = Number(prices[selectedUnit]);
    return Number.isFinite(price) && price >= 0 ? price : Number(product.price);
  } catch { return Number(product.price); }
}

router.get("/cart", async (req, res) => res.json(await loadCart(req.customer.id)));

router.put("/cart/items/:productId", async (req, res) => {
  const productId = Number(req.params.productId), quantity = Number(req.body?.quantity), selectedUnit = String(req.body?.selectedUnit || "").trim().slice(0, 100);
  if (!Number.isInteger(productId) || productId <= 0 || !Number.isFinite(quantity) || quantity <= 0) return res.status(400).json({ error: "A valid product and positive quantity are required." });
  try {
    await db.transaction(async tx => {
      const product = await tx.get("SELECT p.*,i.stock_qty,i.reserved_qty FROM product p JOIN inventory i ON i.product_id=p.id WHERE p.id=? AND p.is_active=1", [productId]);
      if (!product) { const error = new Error("Product is unavailable."); error.status = 404; throw error; }
      if (Number(product.stock_qty) - Number(product.reserved_qty) < quantity) { const error = new Error("Requested quantity exceeds available stock."); error.status = 409; throw error; }
      const cart = await cartFor(req.customer.id, tx);
      await tx.execute(`INSERT INTO cart_item (cart_id,product_id,qty,weight_label,unit_price) VALUES (?,?,?,?,?)
        ON CONFLICT(cart_id,product_id,weight_label) DO UPDATE SET qty=excluded.qty,unit_price=excluded.unit_price,updated_at=CURRENT_TIMESTAMP`, [cart.id, productId, quantity, selectedUnit, selectedUnitPrice(product, selectedUnit)]);
      await tx.execute("UPDATE cart SET updated_at=CURRENT_TIMESTAMP WHERE id=?", [cart.id]);
    });
    await audit("CUSTOMER", req.customer.id, "UPDATE_CART_ITEM", "product", productId, { quantity }, req);
    res.json(await loadCart(req.customer.id));
  } catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to update cart." }); }
});

router.delete("/cart/items/:productId", async (req, res) => {
  const cart = await cartFor(req.customer.id), selectedUnit = String(req.query?.selectedUnit || "");
  const result = selectedUnit
    ? await db.execute("DELETE FROM cart_item WHERE cart_id=? AND product_id=? AND weight_label=?", [cart.id, req.params.productId, selectedUnit])
    : await db.execute("DELETE FROM cart_item WHERE cart_id=? AND product_id=?", [cart.id, req.params.productId]);
  if (!result.changes) return res.status(404).json({ error: "Cart item not found." });
  await db.execute("UPDATE cart SET updated_at=CURRENT_TIMESTAMP WHERE id=?", [cart.id]);
  res.json(await loadCart(req.customer.id));
});

router.put("/cart/coupon", async (req, res) => {
  const code = String(req.body?.couponCode || "").trim().toUpperCase().slice(0, 100), cart = await cartFor(req.customer.id);
  if (code && !await db.get("SELECT id FROM coupon WHERE upper(code)=? AND is_active=1 AND (starts_at IS NULL OR starts_at<=CURRENT_TIMESTAMP) AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP)", [code])) return res.status(400).json({ error: "Coupon is invalid or expired." });
  await db.execute("UPDATE cart SET coupon_code=?,updated_at=CURRENT_TIMESTAMP WHERE id=?", [code, cart.id]);
  res.json(await loadCart(req.customer.id));
});

router.delete("/cart", async (req, res) => {
  const cart = await cartFor(req.customer.id);
  await db.execute("DELETE FROM cart_item WHERE cart_id=?", [cart.id]);
  await db.execute("UPDATE cart SET coupon_code='',updated_at=CURRENT_TIMESTAMP WHERE id=?", [cart.id]);
  res.json(await loadCart(req.customer.id));
});

export default router;
