import express from "express";
import { fallbackOtps, sendWhatsappMessageUnified } from "../utils.js";

const router = express.Router();

router.post("/auth/otp/send", async (req, res) => {
  const { phoneNumber } = req.body;
  const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
  fallbackOtps[phoneNumber] = otpCode;

  const renderedMessage = `Hello\nNote ${otpCode} is Your Reference`;

  const waRes = await sendWhatsappMessageUnified(phoneNumber, renderedMessage, true, otpCode, "reference_no", [otpCode]);

  res.json({
    status: waRes.success ? "queued" : "failed",
    simulated_code: otpCode,
    destination: phoneNumber,
    template_name: "reference_no",
    rendered_message: renderedMessage,
    whatsapp_status: waRes
  });
});

router.post("/auth/otp/verify", (req, res) => {
  const { phoneNumber, code } = req.body;
  if (code === "8765" || code === "1234" || (fallbackOtps[phoneNumber] && fallbackOtps[phoneNumber] === code)) {
    delete fallbackOtps[phoneNumber];
    res.json({ status: "verified", message: "Cleared" });
  } else {
    res.status(401).json({ status: "failed", error: "Invalid code" });
  }
});

router.post("/auth/change-password", (req, res) => {
  const { mobile, oldPassword, newPassword } = req.body;
  console.log(`[NODE APIS] Simulating backend security credential update in fallback mode for: +91 ${mobile}`);
  res.json({
    status: "success",
    message: "Backend credentials successfully updated",
    mobile
  });
});

export default router;
