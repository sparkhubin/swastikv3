import express from "express";
import crypto from "node:crypto";
import { db } from "../../database/db.js";
import {
  CUSTOMER_COOKIE, audit, hashPassword, issueCustomerSession, optionalIdentity,
  requireCustomerAuth, requirePermission, requireStaffAuth, sessionCookie, normalizeMobile
} from "../auth.js";

const router = express.Router();

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mapCustomer(row) {
  return {
    id: Number(row.id), name: row.name, phone: row.phone, email: row.email || "", address: row.address || "",
    status: row.status, dob: row.dob || "", anniversary: row.anniversary || "", referralCode: row.referral_code || "",
    registeredAt: row.registered_at, points: Number(row.points_balance || 0),
    membershipStatus: row.membership_status || null, membershipNumber: row.membership_no || null,
    orderCount: Number(row.order_count || 0), totalSpent: Number(row.total_spent || 0)
  };
}

const CUSTOMER_SELECT = `SELECT c.*,
  COALESCE((SELECT SUM(cp.points) FROM customer_points cp WHERE cp.customer_id=c.id),0) AS points_balance,
  (SELECT CASE WHEN cm.status='Active' AND date(cm.end_date)<date('now') THEN 'Expired' ELSE cm.status END FROM customer_membership cm WHERE cm.customer_id=c.id ORDER BY cm.created_at DESC LIMIT 1) AS membership_status,
  (SELECT cm.membership_no FROM customer_membership cm WHERE cm.customer_id=c.id ORDER BY cm.created_at DESC LIMIT 1) AS membership_no,
  (SELECT COUNT(*) FROM "order" o WHERE o.customer_id=c.id) AS order_count,
  COALESCE((SELECT SUM(o.grand_total) FROM "order" o WHERE o.customer_id=c.id AND o.payment_status='PAID'),0) AS total_spent
  FROM customer c`;

router.get("/customers", requireStaffAuth, requirePermission("customers"), async (_req, res) => {
  try { res.json((await db.query(`${CUSTOMER_SELECT} ORDER BY c.created_at DESC`)).map(mapCustomer)); }
  catch (error) { console.error("Customer list failed:", error.message); res.status(500).json({ error: "Unable to load customers." }); }
});

router.post("/customers", optionalIdentity, async (req, res) => {
  try {
    if (req.staff && !req.staff.isMasterAdmin && !req.staff.permissions.includes("customers")) return res.status(403).json({ error: "Insufficient permission." });
    const phone = normalizeMobile(req.body?.phone);
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().slice(0, 255);
    const address = String(req.body?.address || "").trim().slice(0, 4000);
    if (phone.length !== 10 || name.length < 2 || name.length > 255) return res.status(400).json({ error: "A valid name and phone number are required." });
    if (req.body?.password && (String(req.body.password).length < 10 || String(req.body.password).length > 128)) return res.status(400).json({ error: "Password must be between 10 and 128 characters." });
    const existing = await db.get("SELECT id FROM customer WHERE phone LIKE ? LIMIT 1", [`%${phone}`]);
    if (existing) return res.status(409).json({ error: "A customer with this phone number already exists." });
    if (!req.staff) {
      const proof = await db.get("SELECT id FROM customer_otp WHERE phone=? AND purpose='LOGIN' AND consumed_at > datetime('now','-10 minutes') AND customer_id IS NULL ORDER BY id DESC LIMIT 1", [phone]);
      if (!proof) return res.status(401).json({ error: "Verify this phone number before registration." });
    }
    const created = await db.transaction(async tx => {
      const result = await tx.execute(`INSERT INTO customer (name, phone, email, password_hash, address, status, referral_code)
        VALUES (?, ?, ?, ?, ?, 'Active', ?)`, [name, phone, email, req.body?.password ? await hashPassword(req.body.password) : "", address, crypto.randomBytes(6).toString("hex").toUpperCase()]);
      const customerId = result.lastID;
      await tx.execute("UPDATE customer_otp SET customer_id=? WHERE phone=? AND consumed_at IS NOT NULL AND customer_id IS NULL", [customerId, phone]);
      const referralCode = String(req.body?.referralCode || "").trim();
      if (referralCode) {
        const referrer = await tx.get("SELECT id FROM customer WHERE referral_code=? AND id<>?", [referralCode, customerId]);
        const settings = await tx.query("SELECT key_name,value_text FROM app_settings WHERE key_name IN ('referrer_points','referred_customer_points')");
        const config = Object.fromEntries(settings.map(item => [item.key_name, Number(item.value_text)]));
        if (referrer && Number.isInteger(config.referrer_points) && config.referrer_points > 0) {
          await tx.execute("INSERT INTO customer_points (customer_id,points,type,reference_id,description,referred_customer_id) VALUES (?,?,'REFERRAL',?,'Referral reward',?)", [referrer.id, config.referrer_points, `REFERRAL:${customerId}`, customerId]);
        }
        if (referrer && Number.isInteger(config.referred_customer_points) && config.referred_customer_points > 0) {
          await tx.execute("INSERT INTO customer_points (customer_id,points,type,reference_id,description,referrer_customer_id) VALUES (?,?,'REFERRED',?,'Referral welcome reward',?)", [customerId, config.referred_customer_points, `REFERRED:${customerId}`, referrer.id]);
        }
      }
      const session = req.staff ? null : await issueCustomerSession(customerId, { ip: req.ip, userAgent: req.get("user-agent") }, tx);
      return { customerId, session };
    });
    if (created.session) res.setHeader("Set-Cookie", sessionCookie(CUSTOMER_COOKIE, created.session.token));
    const row = await db.get(`${CUSTOMER_SELECT} WHERE c.id=?`, [created.customerId]);
    res.status(201).json({ customer: mapCustomer(row), token: created.session?.token, expiresAt: created.session?.expiresAt });
  } catch (error) {
    console.error("Customer registration failed:", error.message);
    res.status(500).json({ error: "Unable to register customer." });
  }
});

router.get("/customers/me", requireCustomerAuth, async (req, res) => {
  const row = await db.get(`${CUSTOMER_SELECT} WHERE c.id=?`, [req.customer.id]);
  res.json({ customer: mapCustomer(row) });
});

router.put("/customers/me", requireCustomerAuth, async (req, res) => {
  try {
    const allowed = ["name", "email", "address", "dob", "anniversary"];
    const current = await db.get("SELECT * FROM customer WHERE id=?", [req.customer.id]);
    const values = Object.fromEntries(allowed.map(key => [key, req.body?.[key] === undefined ? current[key] : String(req.body[key]).trim()]));
    if (values.name.length < 2 || values.name.length > 255) return res.status(400).json({ error: "A valid name is required." });
    await db.execute("UPDATE customer SET name=?,email=?,address=?,dob=?,anniversary=?,updated_at=CURRENT_TIMESTAMP WHERE id=?", [values.name, values.email, values.address, values.dob, values.anniversary, req.customer.id]);
    await audit("CUSTOMER", req.customer.id, "UPDATE_PROFILE", "customer", req.customer.id, {}, req);
    const row = await db.get(`${CUSTOMER_SELECT} WHERE c.id=?`, [req.customer.id]);
    res.json({ customer: mapCustomer(row) });
  } catch (error) { console.error("Customer profile update failed:", error.message); res.status(500).json({ error: "Unable to update profile." }); }
});

router.put("/customers/:id", requireStaffAuth, requirePermission("customers"), async (req, res) => {
  try {
    if ("points" in (req.body || {}) || "isPrimeActive" in (req.body || {}) || "primeMembershipNo" in (req.body || {})) return res.status(400).json({ error: "Use points and membership ledger endpoints for those changes." });
    const id = Number(req.params.id);
    const current = await db.get("SELECT * FROM customer WHERE id=?", [id]);
    if (!current) return res.status(404).json({ error: "Customer not found." });
    const body = req.body || {};
    const next = { name: body.name ?? current.name, email: body.email ?? current.email, address: body.address ?? current.address, status: body.status ?? current.status, dob: body.dob ?? current.dob, anniversary: body.anniversary ?? current.anniversary };
    await db.execute("UPDATE customer SET name=?,email=?,address=?,status=?,dob=?,anniversary=?,updated_at=CURRENT_TIMESTAMP WHERE id=?", [...Object.values(next), id]);
    await audit("USER", req.staff.id, "UPDATE_CUSTOMER", "customer", id, next, req);
    res.json({ customer: mapCustomer(await db.get(`${CUSTOMER_SELECT} WHERE c.id=?`, [id])) });
  } catch (error) { console.error("Admin customer update failed:", error.message); res.status(500).json({ error: "Unable to update customer." }); }
});

async function authorizeCustomerResource(req, res, next) {
  return optionalIdentity(req, res, () => {
    const own = req.customer && Number(req.customer.id) === Number(req.params.id);
    const staffAllowed = req.staff && (req.staff.isMasterAdmin || req.staff.permissions.includes("customers"));
    if (!own && !staffAllowed) return res.status(403).json({ error: "Access denied." });
    next();
  });
}

router.get("/customers/:id/points", authorizeCustomerResource, async (req, res) => {
  const history = await db.query("SELECT id,points,type,reference_id AS referenceId,description,created_at AS createdAt FROM customer_points WHERE customer_id=? ORDER BY created_at DESC,id DESC", [req.params.id]);
  const balance = history.reduce((sum, item) => sum + Number(item.points), 0);
  res.json({ customerId: Number(req.params.id), balance, history });
});

router.post("/customers/:id/points", requireStaffAuth, requirePermission("customers"), async (req, res) => {
  const points = finiteNumber(req.body?.points);
  const referenceId = String(req.body?.referenceId || "").trim();
  if (!Number.isInteger(points) || points === 0 || !referenceId) return res.status(400).json({ error: "A non-zero integer point value and unique referenceId are required." });
  try {
    await db.transaction(async tx => {
      const duplicate = await tx.get("SELECT id FROM customer_points WHERE customer_id=? AND type='ADJUSTMENT' AND reference_id=?", [req.params.id, referenceId]);
      if (duplicate) { const error = new Error("Duplicate points adjustment."); error.status = 409; throw error; }
      const balance = await tx.get("SELECT COALESCE(SUM(points),0) balance FROM customer_points WHERE customer_id=?", [req.params.id]);
      if (Number(balance.balance) + points < 0) { const error = new Error("Points balance cannot be negative."); error.status = 409; throw error; }
      await tx.execute("INSERT INTO customer_points (customer_id,points,type,reference_id,description) VALUES (?,?,'ADJUSTMENT',?,?)", [req.params.id, points, referenceId, String(req.body?.description || "Staff adjustment").slice(0, 500)]);
    });
    await audit("USER", req.staff.id, "ADJUST_POINTS", "customer", req.params.id, { points, referenceId }, req);
    res.status(201).json({ success: true });
  } catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to adjust points." }); }
});

router.get("/customers/:id/referrals", authorizeCustomerResource, async (req, res) => {
  const history = await db.query("SELECT points,type,reference_id AS referenceId,referrer_customer_id AS referrerCustomerId,referred_customer_id AS referredCustomerId,created_at AS createdAt FROM customer_points WHERE customer_id=? AND type IN ('REFERRAL','REFERRED') ORDER BY created_at DESC", [req.params.id]);
  res.json(history);
});

router.get("/membership/plans", async (_req, res) => res.json(await db.query("SELECT id,name,description,duration_days AS durationDays,price,discount_percent AS discountPercent,free_delivery AS freeDelivery,extra_points_multiplier AS extraPointsMultiplier,benefits_json AS benefitsJson FROM membership_plan WHERE is_active=1 ORDER BY price")));

router.post("/membership/plans", requireStaffAuth, requirePermission("settings"), async (req, res) => {
  const duration=Number(req.body?.durationDays),price=Number(req.body?.price),discount=Number(req.body?.discountPercent||0),multiplier=Number(req.body?.extraPointsMultiplier||1),name=String(req.body?.name||"").trim();
  if(!name||!Number.isInteger(duration)||duration<=0||!Number.isFinite(price)||price<0||!Number.isFinite(discount)||discount<0||discount>100||!Number.isFinite(multiplier)||multiplier<=0)return res.status(400).json({error:"Membership plan values are invalid."});
  try{const result=await db.execute("INSERT INTO membership_plan (name,description,duration_days,price,discount_percent,free_delivery,extra_points_multiplier,benefits_json,is_active) VALUES (?,?,?,?,?,?,?,?,?)",[name,String(req.body.description||""),duration,price,discount,Number(Boolean(req.body.freeDelivery)),multiplier,JSON.stringify(Array.isArray(req.body.benefits)?req.body.benefits:[]),req.body.isActive===false?0:1]);await audit("USER",req.staff.id,"CREATE_MEMBERSHIP_PLAN","membership_plan",result.lastID,{},req);res.status(201).json({success:true,id:result.lastID});}catch(error){res.status(error.code==="SQLITE_CONSTRAINT"?409:500).json({error:error.code==="SQLITE_CONSTRAINT"?"Membership plan name already exists.":"Unable to create plan."});}
});

router.put("/membership/plans/:id", requireStaffAuth, requirePermission("settings"), async (req,res)=>{const current=await db.get("SELECT * FROM membership_plan WHERE id=?",[req.params.id]);if(!current)return res.status(404).json({error:"Plan not found."});const next={name:req.body.name??current.name,description:req.body.description??current.description,duration:Number(req.body.durationDays??current.duration_days),price:Number(req.body.price??current.price),discount:Number(req.body.discountPercent??current.discount_percent),free:Number(req.body.freeDelivery===undefined?current.free_delivery:Boolean(req.body.freeDelivery)),multiplier:Number(req.body.extraPointsMultiplier??current.extra_points_multiplier),benefits:req.body.benefits===undefined?current.benefits_json:JSON.stringify(req.body.benefits),active:Number(req.body.isActive===undefined?current.is_active:Boolean(req.body.isActive))};if(!next.name||!Number.isInteger(next.duration)||next.duration<=0||next.price<0||next.discount<0||next.discount>100||next.multiplier<=0)return res.status(400).json({error:"Membership plan values are invalid."});await db.execute("UPDATE membership_plan SET name=?,description=?,duration_days=?,price=?,discount_percent=?,free_delivery=?,extra_points_multiplier=?,benefits_json=?,is_active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",[...Object.values(next),req.params.id]);await audit("USER",req.staff.id,"UPDATE_MEMBERSHIP_PLAN","membership_plan",req.params.id,{},req);res.json({success:true});});

router.get("/customers/:id/memberships", authorizeCustomerResource, async (req, res) => res.json(await db.query(`SELECT cm.*,mp.name AS plan_name,mp.description AS plan_description FROM customer_membership cm JOIN membership_plan mp ON mp.id=cm.membership_plan_id WHERE cm.customer_id=? ORDER BY cm.created_at DESC`, [req.params.id])));

router.post("/customers/:id/memberships", requireStaffAuth, requirePermission("customers"), async (req, res) => {
  const customerId = Number(req.params.id);
  const planId = Number(req.body?.planId);
  const membershipNo = String(req.body?.membershipNumber || `MEM-${crypto.randomBytes(8).toString("hex").toUpperCase()}`).trim().slice(0, 100);
  const amountPaid = finiteNumber(req.body?.amountPaid);
  if (!Number.isInteger(customerId) || !Number.isInteger(planId) || amountPaid === null || amountPaid < 0 || !membershipNo) return res.status(400).json({ error: "Customer, plan, membership number, and a non-negative amount are required." });
  try {
    const membershipId = await db.transaction(async tx => {
      const customer = await tx.get("SELECT id FROM customer WHERE id=?", [customerId]);
      const plan = await tx.get("SELECT id,duration_days FROM membership_plan WHERE id=? AND is_active=1", [planId]);
      if (!customer || !plan) { const error = new Error("Customer or active membership plan not found."); error.status = 404; throw error; }
      await tx.execute("UPDATE customer_membership SET status='Cancelled',updated_at=CURRENT_TIMESTAMP WHERE customer_id=? AND status='Active'", [customerId]);
      const result = await tx.execute(`INSERT INTO customer_membership
        (customer_id,membership_plan_id,membership_no,start_date,end_date,amount_paid,status)
        VALUES (?,?,?,date('now'),date('now',?),?,'Active')`, [customerId, planId, membershipNo, `+${Number(plan.duration_days)} days`, amountPaid]);
      return result.lastID;
    });
    await audit("USER", req.staff.id, "ACTIVATE_MEMBERSHIP", "customer_membership", membershipId, { customerId, planId }, req);
    res.status(201).json({ success: true, id: membershipId });
  } catch (error) {
    const duplicate = error.code === "SQLITE_CONSTRAINT";
    res.status(error.status || (duplicate ? 409 : 500)).json({ error: error.status ? error.message : duplicate ? "Membership number already exists." : "Unable to activate membership." });
  }
});

router.post("/customers/:id/memberships/:membershipId/cancel", requireStaffAuth, requirePermission("customers"), async (req, res) => {
  const result = await db.execute("UPDATE customer_membership SET status='Cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=? AND customer_id=? AND status='Active'", [req.params.membershipId, req.params.id]);
  if (!result.changes) return res.status(404).json({ error: "Active membership not found." });
  await audit("USER", req.staff.id, "CANCEL_MEMBERSHIP", "customer_membership", req.params.membershipId, { customerId: Number(req.params.id) }, req);
  res.json({ success: true });
});

router.post("/customers/:id/memberships/cancel-active", requireStaffAuth, requirePermission("customers"), async (req, res) => {
  const active = await db.get("SELECT id FROM customer_membership WHERE customer_id=? AND status='Active' ORDER BY created_at DESC LIMIT 1", [req.params.id]);
  if (!active) return res.status(404).json({ error: "Active membership not found." });
  const result = await db.execute("UPDATE customer_membership SET status='Cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=? AND customer_id=? AND status='Active'", [active.id, req.params.id]);
  if (!result.changes) return res.status(409).json({ error: "Membership status changed before cancellation." });
  await audit("USER", req.staff.id, "CANCEL_MEMBERSHIP", "customer_membership", active.id, { customerId: Number(req.params.id) }, req);
  res.json({ success: true });
});

router.post("/customers/me/memberships/:id/cancel",requireCustomerAuth,async(req,res)=>{const result=await db.execute("UPDATE customer_membership SET status='Cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=? AND customer_id=? AND status='Active'",[req.params.id,req.customer.id]);if(!result.changes)return res.status(404).json({error:"Active membership not found."});await audit("CUSTOMER",req.customer.id,"CANCEL_MEMBERSHIP","customer_membership",req.params.id,{},req);res.json({success:true});});

router.delete("/customers/:id", requireStaffAuth, requirePermission("customers"), (_req, res) => res.status(405).json({ error: "Customer deletion is disabled to preserve order, points, and membership history." }));
router.all("/data-deletion-requests/:rest(*)?", (_req, res) => res.status(501).json({ error: "Data deletion requests require a dedicated table in the committed schema." }));

export default router;
