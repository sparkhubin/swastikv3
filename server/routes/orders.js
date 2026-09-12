import express from "express";
import crypto from "node:crypto";
import { db } from "../../database/db.js";
import { audit, optionalIdentity, requirePermission, requireStaffAuth } from "../auth.js";
import { sendWhatsAppEvent } from "../services/whatsapp.js";

const router = express.Router();
const TERMINAL = new Set(["CANCELLED", "DELIVERED", "REFUNDED"]);
const STATUS_ALIASES = { "PENDING PAYMENT":"PENDING_PAYMENT", CONFIRMED:"CONFIRMED", PROCESSING:"PROCESSING", PACKED:"PACKED", DISPATCHED:"DISPATCHED", "OUT FOR DELIVERY":"OUT_FOR_DELIVERY", DELIVERED:"DELIVERED", CANCELLED:"CANCELLED", CANCELED:"CANCELLED", FAILED:"FAILED", REFUNDED:"REFUNDED" };

function normalizeStatus(value) {
  return STATUS_ALIASES[String(value || "").trim().toUpperCase().replaceAll("_", " ")] || null;
}

function isDeliveryStaff(staff) {
  return ["DELIVERY", "RIDER"].includes(String(staff?.role_code || "").toUpperCase());
}

function hasStaffPermission(staff, permission) {
  return Boolean(staff && (staff.isMasterAdmin || ["MASTER_ADMIN", "ADMIN"].includes(String(staff.role_code).toUpperCase()) || staff.permissions.includes(permission)));
}

async function itemsForOrders(orderIds) {
  if (!orderIds.length) return new Map();
  const placeholders = orderIds.map(() => "?").join(",");
  const items = await db.query(`SELECT * FROM order_item WHERE order_id IN (${placeholders}) ORDER BY id`, orderIds);
  return items.reduce((map, item) => {
    const list = map.get(item.order_id) || [];
    list.push({ id:item.id, productId:item.product_id, nameEn:item.name_en, nameHi:item.name_hi, price:Number(item.price), qty:Number(item.qty), quantity:Number(item.qty), weight:item.weight_label, gstPercent:Number(item.gst_percent), lineTotal:Number(item.line_total) });
    map.set(item.order_id, list); return map;
  }, new Map());
}

function mapOrder(row, items = []) {
  return {
    id: row.id, customerId:Number(row.customer_id), userId:Number(row.customer_id), orderDate:row.order_date,
    status:row.status_label || row.status, statusCode:row.status, paymentStatus:row.payment_status, paymentMethod:row.payment_method,
    subtotal:Number(row.subtotal), deliveryFee:Number(row.delivery_fee), gst:Number(row.gst_amount), grandTotal:Number(row.grand_total), total:Number(row.grand_total),
    referralDiscount:Number(row.referral_discount), couponDiscount:Number(row.coupon_discount), celebrationDiscount:Number(row.celebration_discount),
    celebrationOfferName:row.celebration_offer_name || "", appliedPoints:Number(row.applied_points), pointsEarned:Number(row.points_earned), couponCode:row.coupon_code || "",
    shippingAddress:row.shipping_address, customerName:row.customer_name, customerPhone:row.customer_phone, customerEmail:row.customer_email,
    deliveryAssignmentId:row.assignment_id || null, deliveryStaffId:row.delivery_user_id || null, deliveryPartnerName:row.delivery_name || "", deliveryPartnerPhone:row.delivery_phone || "",
    deliveryStatus:row.delivery_status || null, codStatus:row.cod_status || null, createdAt:row.created_at, updatedAt:row.updated_at, items
  };
}

const ORDER_SELECT = `SELECT o.*,da.id AS assignment_id,da.status AS delivery_status,da.cod_status,ds.user_id AS delivery_user_id,ds.name AS delivery_name,ds.phone AS delivery_phone
  FROM "order" o LEFT JOIN delivery_assignment da ON da.order_id=o.id LEFT JOIN delivery_staff ds ON ds.id=da.delivery_staff_id`;

async function loadOrders(where = "", params = []) {
  const rows = await db.query(`${ORDER_SELECT} ${where} ORDER BY o.created_at DESC`, params);
  const itemMap = await itemsForOrders(rows.map(row => row.id));
  return rows.map(row => mapOrder(row, itemMap.get(row.id) || []));
}

async function requireAnyIdentity(req, res, next) {
  return optionalIdentity(req, res, () => {
    if (!req.customer && !req.staff) return res.status(401).json({ error: "Authentication is required." });
    next();
  });
}

router.get("/orders", requireAnyIdentity, async (req, res) => {
  try {
    if (req.customer) return res.json(await loadOrders("WHERE o.customer_id=?", [req.customer.id]));
    if (!hasStaffPermission(req.staff, "orders") && !hasStaffPermission(req.staff, "delivery")) return res.status(403).json({ error: "Insufficient permission." });
    if (isDeliveryStaff(req.staff)) return res.json(await loadOrders("WHERE ds.user_id=?", [req.staff.id]));
    res.json(await loadOrders());
  } catch (error) { console.error("Order list failed:", error.message); res.status(500).json({ error: "Unable to load orders." }); }
});

router.get("/orders/:id", requireAnyIdentity, async (req, res) => {
  try {
    const orders = await loadOrders("WHERE o.id=?", [req.params.id]);
    const order = orders[0];
    if (!order) return res.status(404).json({ error: "Order not found." });
    if (req.customer && order.customerId !== Number(req.customer.id)) return res.status(403).json({ error: "Access denied." });
    if (req.staff && isDeliveryStaff(req.staff) && order.deliveryStaffId !== req.staff.id) return res.status(403).json({ error: "This order is not assigned to you." });
    if (req.staff && !hasStaffPermission(req.staff, "orders") && !hasStaffPermission(req.staff, "delivery")) return res.status(403).json({ error: "Insufficient permission." });
    res.json(order);
  } catch (error) { console.error("Order load failed:", error.message); res.status(500).json({ error: "Unable to load order." }); }
});

function selectedUnitPrice(product, weightLabel) {
  if (!weightLabel) return Number(product.price);
  try {
    const unitPrices = JSON.parse(product.unit_prices || "{}");
    const value = Number(unitPrices[weightLabel]);
    return Number.isFinite(value) && value >= 0 ? value : Number(product.price);
  } catch { return Number(product.price); }
}

async function appNumber(tx, key, fallback = 0) {
  const row = await tx.get("SELECT value_text FROM app_settings WHERE key_name=?", [key]);
  const value = Number(row?.value_text);
  return Number.isFinite(value) ? value : fallback;
}

router.post("/orders", requireAnyIdentity, async (req, res) => {
  const requestedItems = req.body?.items;
  if (!Array.isArray(requestedItems) || !requestedItems.length || requestedItems.length > 100) return res.status(400).json({ error: "An order requires 1-100 items." });
  if (req.staff && !hasStaffPermission(req.staff, "orders") && !hasStaffPermission(req.staff, "pos")) return res.status(403).json({ error: "Insufficient permission." });
  const paymentMethod = String(req.body?.paymentMethod || "COD").toUpperCase();
  if (!['COD','RAZORPAY','RAZORPAY_ONLINE','CASHFREE','CASHFREE_ONLINE'].includes(paymentMethod)) return res.status(400).json({ error: "Unsupported payment method." });
  const shippingAddress = String(req.body?.shippingAddress || "").trim();
  if (!shippingAddress || shippingAddress.length > 4000) return res.status(400).json({ error: "A shipping address is required." });
  try {
    const created = await db.transaction(async tx => {
      const customerId = req.customer?.id || Number(req.body?.customerId || req.body?.userId);
      const customer = await tx.get("SELECT * FROM customer WHERE id=? AND status='Active'", [customerId]);
      if (!customer) { const error=new Error("A valid active customer is required."); error.status=400; throw error; }
      const ids = [...new Set(requestedItems.map(item => Number(item.productId || item.id)))];
      if (ids.some(id => !Number.isInteger(id) || id <= 0)) { const error=new Error("Every item must identify a valid product."); error.status=400; throw error; }
      const products = await tx.query(`SELECT p.*,i.stock_qty,i.reserved_qty FROM product p JOIN inventory i ON i.product_id=p.id WHERE p.id IN (${ids.map(()=>'?').join(',')}) AND p.is_active=1`, ids);
      if (products.length !== ids.length) { const error=new Error("One or more products are unavailable."); error.status=409; throw error; }
      const productMap = new Map(products.map(product => [Number(product.id), product]));
      const lines = requestedItems.map(item => {
        const product = productMap.get(Number(item.productId || item.id));
        const qty = Number(item.qty ?? item.quantity);
        if (!Number.isFinite(qty) || qty <= 0) { const error=new Error("Item quantities must be positive."); error.status=400; throw error; }
        if (Number(product.stock_qty)-Number(product.reserved_qty) < qty) { const error=new Error(`${product.name_en} does not have enough available stock.`); error.status=409; throw error; }
        const weight = String(item.weight ?? item.weightLabel ?? "").slice(0,100);
        const price = selectedUnitPrice(product, weight);
        return { product, qty, weight, price, total: Math.round(price*qty*100)/100, gst: Math.round(price*qty*Number(product.gst_percent)*100)/10000 };
      });
      const subtotal = Math.round(lines.reduce((sum,line)=>sum+line.total,0)*100)/100;
      const gstAmount = Math.round(lines.reduce((sum,line)=>sum+line.gst,0)*100)/100;
      let couponDiscount = 0, coupon = null;
      const couponCode = String(req.body?.couponCode || "").trim().toUpperCase();
      if (couponCode) {
        coupon = await tx.get(`SELECT * FROM coupon WHERE upper(code)=? AND is_active=1 AND (starts_at IS NULL OR starts_at<=CURRENT_TIMESTAMP) AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP)`, [couponCode]);
        if (!coupon || subtotal < Number(coupon.minimum_order_amount)) { const error=new Error("Coupon is invalid for this order."); error.status=409; throw error; }
        const uses = await tx.get("SELECT COUNT(*) count FROM coupon_usage WHERE coupon_id=? AND customer_id=?", [coupon.id, customer.id]);
        if ((coupon.usage_limit && Number(coupon.used_count)>=Number(coupon.usage_limit)) || (coupon.usage_limit_per_customer && Number(uses.count)>=Number(coupon.usage_limit_per_customer))) { const error=new Error("Coupon usage limit reached."); error.status=409; throw error; }
        couponDiscount = coupon.discount_type === "PERCENT" ? subtotal*Number(coupon.discount_value)/100 : Number(coupon.discount_value);
        if (coupon.maximum_discount_amount !== null) couponDiscount = Math.min(couponDiscount,Number(coupon.maximum_discount_amount));
        couponDiscount = Math.round(Math.min(couponDiscount,subtotal)*100)/100;
      }
      const membership = await tx.get(`SELECT mp.* FROM customer_membership cm JOIN membership_plan mp ON mp.id=cm.membership_plan_id WHERE cm.customer_id=? AND cm.status='Active' AND cm.start_date<=date('now') AND cm.end_date>=date('now') ORDER BY cm.end_date DESC LIMIT 1`, [customer.id]);
      const membershipDiscount = membership ? Math.round(subtotal*Number(membership.discount_percent)*100)/10000 : 0;
      const deliveryFee = membership?.free_delivery ? 0 : await appNumber(tx,"delivery_fee",0);
      const appliedPoints = Number(req.body?.appliedPoints || 0);
      let pointsDiscount = 0;
      if (!Number.isInteger(appliedPoints) || appliedPoints < 0) { const error=new Error("Applied points must be a non-negative integer."); error.status=400; throw error; }
      if (appliedPoints) {
        const pointValue = await appNumber(tx,"points_redemption_value",0);
        const balance = await tx.get("SELECT COALESCE(SUM(points),0) balance FROM customer_points WHERE customer_id=?", [customer.id]);
        if (pointValue <= 0 || appliedPoints > Number(balance.balance)) { const error=new Error("Point redemption is unavailable or exceeds the balance."); error.status=409; throw error; }
        pointsDiscount = Math.min(appliedPoints*pointValue,subtotal-couponDiscount-membershipDiscount);
      }
      const grandTotal = Math.max(0,Math.round((subtotal+gstAmount+deliveryFee-couponDiscount-membershipDiscount-pointsDiscount)*100)/100);
      const orderId = `SW-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const online = paymentMethod !== "COD";
      await tx.execute(`INSERT INTO "order" (id,customer_id,status,status_label,subtotal,delivery_fee,gst_amount,grand_total,referral_discount,coupon_discount,celebration_discount,celebration_offer_name,applied_points,points_earned,coupon_code,payment_method,payment_status,shipping_address,customer_name,customer_phone,customer_email)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [orderId,customer.id,online?'PENDING_PAYMENT':'CONFIRMED',online?'Pending Payment':'Confirmed',subtotal,deliveryFee,gstAmount,grandTotal,pointsDiscount,couponDiscount,membershipDiscount,membership?.name||'',appliedPoints,0,couponCode,paymentMethod,online?'PENDING':'UNPAID',shippingAddress,customer.name,customer.phone,customer.email]);
      for (const line of lines) {
        await tx.execute("INSERT INTO order_item (order_id,product_id,name_en,name_hi,price,qty,weight_label,gst_percent,line_total) VALUES (?,?,?,?,?,?,?,?,?)", [orderId,line.product.id,line.product.name_en,line.product.name_hi,line.price,line.qty,line.weight,line.product.gst_percent,line.total]);
        await tx.execute("UPDATE inventory SET reserved_qty=reserved_qty+?,updated_at=CURRENT_TIMESTAMP WHERE product_id=?", [line.qty,line.product.id]);
        await tx.execute("INSERT INTO stock_movement (product_id,type,quantity,before_qty,after_qty,reference_type,reference_id,note,created_by_user_id) VALUES (?,'RESERVE',?,?,?,?,?,'Order reservation',?)", [line.product.id,line.qty,line.product.stock_qty,line.product.stock_qty,'ORDER',orderId,req.staff?.id||null]);
      }
      if (appliedPoints) await tx.execute("INSERT INTO customer_points (customer_id,points,type,reference_id,description) VALUES (?,?,'REDEEM',?,'Order redemption')", [customer.id,-appliedPoints,orderId]);
      if (coupon) {
        await tx.execute("INSERT INTO coupon_usage (coupon_id,customer_id,order_id,discount_amount) VALUES (?,?,?,?)", [coupon.id,customer.id,orderId,couponDiscount]);
        await tx.execute("UPDATE coupon SET used_count=used_count+1,updated_at=CURRENT_TIMESTAMP WHERE id=?", [coupon.id]);
      }
      await tx.execute("INSERT INTO notification (recipient_type,recipient_id,recipient_phone,order_id,title_en,message_en,type) VALUES ('CUSTOMER',?,?,?,'Order placed','Your order has been received.','ORDER_PLACED')", [customer.id,customer.phone,orderId]);
      return { orderId, customer };
    });
    await audit(req.staff?'USER':'CUSTOMER', req.staff?.id||req.customer?.id, "CREATE_ORDER", "order", created.orderId, {}, req);
    sendWhatsAppEvent({ purpose:"ORDER_PLACED",to:created.customer.phone,customerId:created.customer.id,referenceType:"ORDER",referenceId:created.orderId,variables:[created.orderId] }).catch(error=>console.error("Order WhatsApp event failed:",error.message));
    res.status(201).json((await loadOrders("WHERE o.id=?",[created.orderId]))[0]);
  } catch (error) { console.error("Order creation failed:", error.message); res.status(error.status||500).json({ error:error.status?error.message:"Unable to create order." }); }
});

async function assignDelivery(req, orderId, userId) {
  if (!hasStaffPermission(req.staff,"delivery")) { const error=new Error("Delivery permission is required."); error.status=403; throw error; }
  const delivery = await db.get("SELECT * FROM delivery_staff WHERE (user_id=? OR id=?) AND status='ACTIVE' LIMIT 1", [userId,userId]);
  if (!delivery) { const error=new Error("Active delivery staff record not found."); error.status=400; throw error; }
  await db.execute(`INSERT INTO delivery_assignment (order_id,delivery_staff_id,status) VALUES (?,?,'ASSIGNED') ON CONFLICT(order_id) DO UPDATE SET delivery_staff_id=excluded.delivery_staff_id,status='ASSIGNED',assigned_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`, [orderId,delivery.id]);
}

router.post("/orders/:id/assignment", requireStaffAuth, requirePermission("delivery"), async (req,res) => {
  try { await assignDelivery(req,req.params.id,Number(req.body?.deliveryStaffId)); await audit("USER",req.staff.id,"ASSIGN_DELIVERY","order",req.params.id,{deliveryStaffId:req.body?.deliveryStaffId},req); res.json((await loadOrders("WHERE o.id=?",[req.params.id]))[0]); }
  catch(error){ res.status(error.status||500).json({error:error.status?error.message:"Unable to assign delivery."}); }
});

router.put(["/orders/:id","/orders/:id/transit"], requireStaffAuth, requirePermission("orders","delivery"), async (req,res) => {
  try {
    const order = await db.get(`${ORDER_SELECT} WHERE o.id=?`,[req.params.id]);
    if (!order) return res.status(404).json({error:"Order not found."});
    if (isDeliveryStaff(req.staff) && Number(order.delivery_user_id)!==req.staff.id) return res.status(403).json({error:"This order is not assigned to you."});
    if (req.body?.deliveryStaffId && !isDeliveryStaff(req.staff)) await assignDelivery(req,req.params.id,Number(req.body.deliveryStaffId));
    const nextStatus=normalizeStatus(req.body?.status || req.body?.statusCode);
    if (!nextStatus) return res.status(400).json({error:"A supported order status is required."});
    if (TERMINAL.has(order.status) && nextStatus!==order.status) return res.status(409).json({error:"A terminal order status cannot be changed."});
    if (["REFUNDED"].includes(nextStatus) && order.payment_status!=="REFUNDED") return res.status(409).json({error:"Refund status must be confirmed by the payment gateway."});
    await db.transaction(async tx=>{
      const items=await tx.query("SELECT product_id,qty FROM order_item WHERE order_id=? AND product_id IS NOT NULL",[order.id]);
      if (nextStatus==="CANCELLED" && order.status!=="CANCELLED") {
        for(const item of items){ const inv=await tx.get("SELECT * FROM inventory WHERE product_id=?",[item.product_id]); if(Number(inv.reserved_qty)<Number(item.qty)){const e=new Error("Reserved inventory is inconsistent.");e.status=409;throw e;} await tx.execute("UPDATE inventory SET reserved_qty=reserved_qty-?,updated_at=CURRENT_TIMESTAMP WHERE product_id=?",[item.qty,item.product_id]); await tx.execute("INSERT INTO stock_movement (product_id,type,quantity,before_qty,after_qty,reference_type,reference_id,note,created_by_user_id) VALUES (?,'RELEASE',?,?,?,?,?,'Cancelled order release',?)",[item.product_id,item.qty,inv.stock_qty,inv.stock_qty,'ORDER',order.id,req.staff.id]); }
        const redeemed=await tx.get("SELECT id FROM customer_points WHERE customer_id=? AND type='REDEEM_RESTORE' AND reference_id=?",[order.customer_id,order.id]);
        if(!redeemed && Number(order.applied_points)>0) await tx.execute("INSERT INTO customer_points (customer_id,points,type,reference_id,description) VALUES (?,?,'REDEEM_RESTORE',?,'Cancelled order points restoration')",[order.customer_id,order.applied_points,order.id]);
      }
      if(nextStatus==="DELIVERED" && order.status!=="DELIVERED") {
        for(const item of items){ const inv=await tx.get("SELECT * FROM inventory WHERE product_id=?",[item.product_id]); if(Number(inv.stock_qty)<Number(item.qty)||Number(inv.reserved_qty)<Number(item.qty)){const e=new Error("Insufficient reserved stock to fulfill order.");e.status=409;throw e;} const after=Number(inv.stock_qty)-Number(item.qty); await tx.execute("UPDATE inventory SET stock_qty=?,reserved_qty=reserved_qty-?,updated_at=CURRENT_TIMESTAMP WHERE product_id=?",[after,item.qty,item.product_id]); await tx.execute("INSERT INTO stock_movement (product_id,type,quantity,before_qty,after_qty,reference_type,reference_id,note,created_by_user_id) VALUES (?,'FULFILL',?,?,?,?,?,'Delivered order fulfillment',?)",[item.product_id,-Number(item.qty),inv.stock_qty,after,'ORDER',order.id,req.staff.id]); }
        const pointsRatio=await appNumber(tx,"points_per_rupee",0); const multiplier=await tx.get(`SELECT COALESCE(mp.extra_points_multiplier,1) multiplier FROM customer_membership cm JOIN membership_plan mp ON mp.id=cm.membership_plan_id WHERE cm.customer_id=? AND cm.status='Active' AND cm.end_date>=date('now') ORDER BY cm.end_date DESC LIMIT 1`,[order.customer_id]); const earned=pointsRatio>0?Math.floor(Number(order.grand_total)*pointsRatio*Number(multiplier?.multiplier||1)):0;
        if(earned>0 && !await tx.get("SELECT id FROM customer_points WHERE customer_id=? AND type='ORDER_EARN' AND reference_id=?",[order.customer_id,order.id])) await tx.execute("INSERT INTO customer_points (customer_id,points,type,reference_id,description) VALUES (?,?,'ORDER_EARN',?,'Points earned on delivered order')",[order.customer_id,earned,order.id]);
        await tx.execute("UPDATE \"order\" SET points_earned=? WHERE id=?",[earned,order.id]);
      }
      await tx.execute("UPDATE \"order\" SET status=?,status_label=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",[nextStatus,nextStatus.replaceAll('_',' '),order.id]);
      const deliveryTimes={ASSIGNED:"assigned_at",DISPATCHED:"picked_up_at",OUT_FOR_DELIVERY:"out_for_delivery_at",DELIVERED:"delivered_at",FAILED:"failed_at"};
      if(deliveryTimes[nextStatus]) await tx.execute(`UPDATE delivery_assignment SET status=?,${deliveryTimes[nextStatus]}=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE order_id=?`,[nextStatus,order.id]);
      await tx.execute("INSERT INTO notification (recipient_type,recipient_id,recipient_phone,order_id,title_en,message_en,type) VALUES ('CUSTOMER',?,?,?,'Order status updated',?,'ORDER_STATUS')",[order.customer_id,order.customer_phone,order.id,`Your order is now ${nextStatus.replaceAll('_',' ')}.`]);
    });
    await audit("USER",req.staff.id,"UPDATE_ORDER_STATUS","order",order.id,{status:nextStatus},req);
    sendWhatsAppEvent({purpose:nextStatus==="DELIVERED"?"ORDER_DELIVERED":"ORDER_STATUS_CHANGED",to:order.customer_phone,customerId:order.customer_id,referenceType:"ORDER",referenceId:order.id,variables:[order.id,nextStatus.replaceAll('_',' ')]}).catch(error=>console.error("Status WhatsApp event failed:",error.message));
    res.json((await loadOrders("WHERE o.id=?",[order.id]))[0]);
  } catch(error){ console.error("Order update failed:",error.message); res.status(error.status||500).json({error:error.status?error.message:"Unable to update order."}); }
});

router.delete("/orders", requireStaffAuth, requirePermission("orders"), (_req,res)=>res.status(405).json({error:"Bulk order deletion is disabled."}));
router.delete("/orders/:id", requireStaffAuth, requirePermission("orders"), (_req,res)=>res.status(405).json({error:"Order deletion is disabled; use cancellation to preserve history."}));

export default router;
