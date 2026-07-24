import express from "express";
import { sendWhatsappMessageUnified } from "../utils.js";

const router = express.Router();

router.post("/whatsapp/send", async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: "Parameters 'to' and 'message' are required." });
  }

  const waRes = await sendWhatsappMessageUnified(to, message);

  res.json({
    status: waRes.success ? "dispatched" : "failed",
    to,
    message,
    whatsapp_response: waRes
  });
});

export default router;
