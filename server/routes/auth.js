import express from "express";
import crypto from "crypto";
import { otpChallenges, sendWhatsappMessageUnified } from "../utils.js";
import { db } from "../../database/db.js";
import {
  hashPassword,
  loginStaff,
  requireStaffAuth,
  revokeSession,
  verifyPassword
} from "../auth.js";

const router = express.Router();

router.post("/auth/staff/login", async (req, res) => {
  try {
    const session = await loginStaff(req.body?.mobile, req.body?.password);
    if (!session) return res.status(401).json({ error: "Invalid credentials or inactive staff account." });
    res.json(session);
  } catch (err) {
    console.error("Staff login failed:", err.message);
    res.status(500).json({ error: "Unable to authenticate staff." });
  }
});

router.post("/auth/staff/logout", requireStaffAuth, (req, res) => {
  revokeSession(req.authToken);
  res.json({ success: true });
});

router.get("/auth/staff/session", requireStaffAuth, (req, res) => {
  res.json({ user: req.staff });
});

router.post("/auth/otp/send", async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ success: false, error: "Phone number is required." });
  }

  const cleanPhone = String(phoneNumber).replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    return res.status(400).json({ success: false, error: "A valid 10-digit phone number is required." });
  }

  const existingChallenge = otpChallenges.get(cleanPhone);
  if (existingChallenge && Date.now() - existingChallenge.createdAt < 60_000) {
    return res.status(429).json({ success: false, error: "Please wait before requesting another OTP." });
  }

  const otpCode = crypto.randomInt(1000, 10_000).toString();

  const renderedMessage = `Hello\nNote ${otpCode} is Your Reference`;

  // Dispatch via WhatsApp Meta Cloud API
  const waRes = await sendWhatsappMessageUnified(cleanPhone, renderedMessage, true, otpCode, "reference_no", [otpCode]);
  if (!waRes.success) {
    return res.status(503).json({ success: false, error: "OTP delivery is currently unavailable. Please try again later." });
  }

  otpChallenges.set(cleanPhone, {
    code: otpCode,
    attempts: 0,
    createdAt: Date.now(),
    expiresAt: Date.now() + 5 * 60_000
  });

  // STRICT SECURITY: Never send back the plaintext OTP code in the API response!
  const maskedPhone = cleanPhone.length >= 10 
    ? `${cleanPhone.slice(0, 2)}******${cleanPhone.slice(-2)}` 
    : phoneNumber;

  res.json({
    status: "queued",
    success: true,
    message: "OTP sent successfully to your registered WhatsApp number.",
    destination: maskedPhone
  });
});

router.post("/auth/otp/verify", (req, res) => {
  const { phoneNumber, code } = req.body;
  const cleanPhone = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
  const cleanCode = String(code || '').trim();

  if (cleanPhone.length !== 10 || !/^\d{4}$/.test(cleanCode)) {
    return res.status(400).json({ status: "failed", success: false, error: "A valid phone number and 4-digit OTP are required." });
  }

  const challenge = otpChallenges.get(cleanPhone);
  if (!challenge || challenge.expiresAt <= Date.now()) {
    otpChallenges.delete(cleanPhone);
    return res.status(401).json({ status: "failed", success: false, error: "OTP has expired or was not requested." });
  }

  challenge.attempts += 1;
  if (challenge.attempts > 5) {
    otpChallenges.delete(cleanPhone);
    return res.status(429).json({ status: "failed", success: false, error: "Too many incorrect attempts. Request a new OTP." });
  }

  const isValid = crypto.timingSafeEqual(Buffer.from(challenge.code), Buffer.from(cleanCode));
  if (!isValid) {
    return res.status(401).json({ status: "failed", success: false, error: "Invalid OTP code." });
  }

  otpChallenges.delete(cleanPhone);
  res.json({ status: "verified", success: true, message: "OTP verified successfully." });
});

router.post("/auth/change-password", requireStaffAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ error: "New password must be between 8 and 128 characters." });
    }
    const rows = await db.query('SELECT password_hash FROM "user" WHERE id = ?', [req.staff.id]);
    if (!rows[0] || !await verifyPassword(oldPassword, rows[0].password_hash)) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }
    await db.execute(
      'UPDATE "user" SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [await hashPassword(newPassword), req.staff.id]
    );
    revokeSession(req.authToken);
    res.json({ status: "success", message: "Password changed. Please sign in again." });
  } catch (err) {
    console.error("Password change failed:", err.message);
    res.status(500).json({ error: "Unable to change password." });
  }
});

export default router;
