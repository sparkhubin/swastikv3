import express from "express";
import crypto from "node:crypto";
import { db } from "../../database/db.js";
import { sendWhatsAppEvent } from "../services/whatsapp.js";
import {
  CUSTOMER_COOKIE, STAFF_COOKIE, clearSessionCookie, hashPassword, issueCustomerSession,
  customerSessionToken, loginStaff, normalizeMobile, optionalIdentity, requireCustomerAuth, requireStaffAuth,
  revokeSession, sessionCookie, staffSessionToken, verifyPassword
} from "../auth.js";

const router = express.Router();

function requestMetadata(req) {
  return { ip: req.ip, userAgent: req.get("user-agent") };
}

async function customerProfile(customerId) {
  return (await db.query(`SELECT c.id, c.name, c.phone, c.email, c.address, c.status, c.dob, c.anniversary,
      c.referral_code AS referralCode, c.registered_at AS registeredAt,
      COALESCE((SELECT SUM(cp.points) FROM customer_points cp WHERE cp.customer_id=c.id),0) AS points,
      (SELECT CASE WHEN cm.status='Active' AND date(cm.end_date)<date('now') THEN 'Expired' ELSE cm.status END FROM customer_membership cm WHERE cm.customer_id=c.id ORDER BY cm.created_at DESC LIMIT 1) AS membershipStatus,
      (SELECT cm.membership_no FROM customer_membership cm WHERE cm.customer_id=c.id ORDER BY cm.created_at DESC LIMIT 1) AS membershipNumber
    FROM customer c WHERE c.id=?`, [customerId]))[0];
}

router.post("/auth/staff/login", async (req, res) => {
  try {
    const session = await loginStaff(req.body?.mobile, req.body?.password, requestMetadata(req));
    if (!session) return res.status(401).json({ error: "Invalid credentials or inactive staff account." });
    await revokeSession(customerSessionToken(req), "customer_session");
    res.setHeader("Set-Cookie", [sessionCookie(STAFF_COOKIE, session.token, req), clearSessionCookie(CUSTOMER_COOKIE, req)]);
    res.json({ user: session.user, expiresAt: session.expiresAt });
  } catch (error) {
    console.error("Staff login failed:", error.message);
    res.status(500).json({ error: "Unable to authenticate staff." });
  }
});

router.post("/auth/staff/logout", async (req, res) => {
  await revokeSession(staffSessionToken(req));
  res.setHeader("Set-Cookie", clearSessionCookie(STAFF_COOKIE, req));
  res.json({ success: true });
});

router.get("/auth/session", optionalIdentity, async (req, res) => {
  res.json({
    user: req.staff || null,
    customer: req.customer ? await customerProfile(req.customer.id) : null
  });
});

router.get("/auth/staff/session", requireStaffAuth, (req, res) => res.json({ user: req.staff }));

router.post("/auth/customer/login", async (req, res) => {
  try {
    const phone = normalizeMobile(req.body?.phoneNumber || req.body?.phone);
    const password = req.body?.password;
    if (phone.length !== 10 || typeof password !== "string" || !password) return res.status(400).json({ error: "A valid phone number and password are required." });
    const customer = await db.get("SELECT * FROM customer WHERE phone=? LIMIT 1", [phone]);
    if (!customer || !customer.password_hash || !await verifyPassword(password, customer.password_hash) || String(customer.status).toLowerCase() !== "active") {
      return res.status(401).json({ error: "Invalid customer credentials." });
    }
    await db.execute("UPDATE customer SET last_login_at=CURRENT_TIMESTAMP WHERE id=?", [customer.id]);
    const session = await issueCustomerSession(customer.id, requestMetadata(req));
    await revokeSession(staffSessionToken(req));
    res.setHeader("Set-Cookie", [sessionCookie(CUSTOMER_COOKIE, session.token, req), clearSessionCookie(STAFF_COOKIE, req)]);
    res.json({ expiresAt: session.expiresAt, customer: await customerProfile(customer.id) });
  } catch (error) {
    console.error("Customer login failed:", error.message);
    res.status(500).json({ error: "Unable to authenticate customer." });
  }
});

router.get("/auth/customer/me", requireCustomerAuth, async (req, res) => res.json({ customer: await customerProfile(req.customer.id) }));
router.get("/auth/customer/session", requireCustomerAuth, async (req, res) => res.json({ customer: await customerProfile(req.customer.id) }));

router.post("/auth/customer/logout", async (req, res) => {
  await revokeSession(customerSessionToken(req), "customer_session");
  res.setHeader("Set-Cookie", clearSessionCookie(CUSTOMER_COOKIE, req));
  res.json({ success: true });
});

router.post("/auth/customer/password", requireCustomerAuth, async (req, res) => {
  const currentPassword = req.body?.currentPassword;
  const newPassword = req.body?.newPassword;
  if (typeof newPassword !== "string" || newPassword.length < 10 || newPassword.length > 128) return res.status(400).json({ error: "New password must be between 10 and 128 characters." });
  try {
    const customer = await db.get("SELECT id,phone,password_hash FROM customer WHERE id=?", [req.customer.id]);
    const recentOtp = await db.get("SELECT id FROM customer_otp WHERE customer_id=? AND phone=? AND consumed_at > datetime('now','-10 minutes') ORDER BY id DESC LIMIT 1", [customer.id, normalizeMobile(customer.phone)]);
    const currentValid = typeof currentPassword === "string" && await verifyPassword(currentPassword, customer.password_hash);
    if (!currentValid && !recentOtp) return res.status(401).json({ error: "Current password or a recently verified OTP is required." });
    const session = await db.transaction(async tx => {
      await tx.execute("UPDATE customer SET password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?", [await hashPassword(newPassword), customer.id]);
      if (recentOtp) await tx.execute("DELETE FROM customer_otp WHERE id=?", [recentOtp.id]);
      await tx.execute("UPDATE customer_session SET revoked_at=CURRENT_TIMESTAMP WHERE customer_id=? AND revoked_at IS NULL", [customer.id]);
      return issueCustomerSession(customer.id, requestMetadata(req), tx);
    });
    res.setHeader("Set-Cookie", sessionCookie(CUSTOMER_COOKIE, session.token, req));
    res.json({ success: true, expiresAt: session.expiresAt });
  } catch (error) {
    console.error("Customer password update failed:", error.message);
    res.status(500).json({ error: "Unable to update password." });
  }
});

router.post("/auth/otp/send", async (req, res) => {
  try {
    const phone = normalizeMobile(req.body?.phoneNumber);
    if (phone.length !== 10) return res.status(400).json({ success: false, error: "A valid 10-digit phone number is required." });
    const recent = await db.get("SELECT created_at FROM customer_otp WHERE phone=? AND created_at > datetime('now','-60 seconds') ORDER BY id DESC LIMIT 1", [phone]);
    if (recent) return res.status(429).json({ success: false, error: "Please wait before requesting another OTP." });
    const code = crypto.randomInt(100000, 1000000).toString();
    const customer = await db.get("SELECT id FROM customer WHERE phone=? LIMIT 1", [phone]);
    const otpHash = await hashPassword(code);
    const inserted = await db.execute(`INSERT INTO customer_otp (customer_id, phone, purpose, otp_hash, expires_at) VALUES (?, ?, 'LOGIN', ?, datetime('now','+5 minutes'))`, [customer?.id || null, phone, otpHash]);
    const delivery = await sendWhatsAppEvent({ purpose: "CUSTOMER_OTP", to: phone, customerId: customer?.id, variables: [code], text: `Your verification code is ${code}`, referenceType: "customer_otp" });
    if (!delivery.success) {
      await db.execute("DELETE FROM customer_otp WHERE id=?", [inserted.lastID]);
      return res.status(503).json({ success: false, error: "OTP delivery is not configured or failed." });
    }
    res.json({ success: true, status: "queued", destination: `${phone.slice(0, 2)}******${phone.slice(-2)}` });
  } catch (error) {
    console.error("OTP send failed:", error.message);
    res.status(500).json({ success: false, error: "Unable to send OTP." });
  }
});

router.post("/auth/otp/verify", async (req, res) => {
  const phone = normalizeMobile(req.body?.phoneNumber);
  const code = String(req.body?.code || "");
  if (phone.length !== 10 || !/^\d{6}$/.test(code)) return res.status(400).json({ success: false, error: "A valid phone and 6-digit OTP are required." });
  try {
    const result = await db.transaction(async tx => {
      const otp = await tx.get("SELECT * FROM customer_otp WHERE phone=? AND purpose='LOGIN' AND consumed_at IS NULL ORDER BY id DESC LIMIT 1", [phone]);
      if (!otp || new Date(`${otp.expires_at}Z`).getTime() <= Date.now()) return { error: "OTP has expired or was not requested.", status: 401 };
      if (Number(otp.attempts) >= 5) return { error: "Too many OTP attempts.", status: 429 };
      if (!await verifyPassword(code, otp.otp_hash)) {
        await tx.execute("UPDATE customer_otp SET attempts=attempts+1 WHERE id=?", [otp.id]);
        return { error: "Invalid OTP code.", status: 401 };
      }
      await tx.execute("UPDATE customer_otp SET consumed_at=CURRENT_TIMESTAMP, attempts=attempts+1 WHERE id=?", [otp.id]);
      const customer = await tx.get("SELECT id FROM customer WHERE phone=? LIMIT 1", [phone]);
      if (!customer) return { registrationRequired: true };
      await tx.execute("UPDATE customer SET last_login_at=CURRENT_TIMESTAMP WHERE id=?", [customer.id]);
      const session = await issueCustomerSession(customer.id, requestMetadata(req), tx);
      return { customerId: customer.id, ...session };
    });
    if (result.error) return res.status(result.status).json({ success: false, error: result.error });
    if (result.registrationRequired) return res.json({ success: true, status: "verified", registrationRequired: true });
    await revokeSession(staffSessionToken(req));
    res.setHeader("Set-Cookie", [sessionCookie(CUSTOMER_COOKIE, result.token, req), clearSessionCookie(STAFF_COOKIE, req)]);
    res.json({ success: true, status: "verified", expiresAt: result.expiresAt, customer: await customerProfile(result.customerId) });
  } catch (error) {
    console.error("OTP verification failed:", error.message);
    res.status(500).json({ success: false, error: "Unable to verify OTP." });
  }
});

router.post("/auth/change-password", requireStaffAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (typeof newPassword !== "string" || newPassword.length < 10 || newPassword.length > 128) return res.status(400).json({ error: "New password must be between 10 and 128 characters." });
    const row = await db.get('SELECT password_hash FROM "user" WHERE id=?', [req.staff.id]);
    if (!row || !await verifyPassword(oldPassword, row.password_hash)) return res.status(401).json({ error: "Current password is incorrect." });
    await db.transaction(async tx => {
      await tx.execute('UPDATE "user" SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [await hashPassword(newPassword), req.staff.id]);
      await tx.execute("UPDATE user_session SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL", [req.staff.id]);
    });
    res.setHeader("Set-Cookie", clearSessionCookie(STAFF_COOKIE, req));
    res.json({ success: true, message: "Password changed. Please sign in again." });
  } catch (error) {
    console.error("Password change failed:", error.message);
    res.status(500).json({ error: "Unable to change password." });
  }
});

export default router;
