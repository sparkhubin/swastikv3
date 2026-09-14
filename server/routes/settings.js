import express from "express";
import crypto from "node:crypto";
import { db } from "../../database/db.js";
import { requirePermission, requireStaffAuth } from "../auth.js";

const router = express.Router();
const PUBLIC_SETTING_KEYS = [
  "swastik_location_groups", "swastik_referral_settings", "swastik_celebration_settings",
  "swastik_prime_settings", "swastik_slides", "swastik_categories", "swastik_offers",
  "swastik_about_settings", "swastik_contact_settings", "swastik_refund_sections",
  "swastik_privacy_sections", "swastik_terms_sections"
];

async function contactMessages(transaction = db) {
  const row = await transaction.get("SELECT value_text FROM app_settings WHERE key_name='swastik_contact_messages'");
  try { const value = JSON.parse(row?.value_text || "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}

async function saveContactMessages(messages, transaction = db) {
  await transaction.execute(`INSERT INTO app_settings (key_name,value_text) VALUES ('swastik_contact_messages',?)
    ON CONFLICT(key_name) DO UPDATE SET value_text=excluded.value_text,updated_at=CURRENT_TIMESTAMP`, [JSON.stringify(messages)]);
}

router.post("/contact/messages", async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 150), mobile = String(req.body?.mobile || "").replace(/\D/g, "").slice(-10);
  const subject = String(req.body?.subject || "").trim().slice(0, 250), message = String(req.body?.message || "").trim().slice(0, 4000);
  if (name.length < 2 || mobile.length !== 10 || !message) return res.status(400).json({ error: "A valid name, mobile number, and message are required." });
  const created = { id: crypto.randomUUID(), name, mobile, subject, message, answer: "", createdAt: new Date().toISOString() };
  try {
    await db.transaction(async tx => { const current = await contactMessages(tx); await saveContactMessages([created, ...current].slice(0, 1000), tx); });
    res.status(201).json({ message: created });
  } catch (error) { console.error("Contact message submission failed:", error.message); res.status(500).json({ error: "Unable to submit contact message." }); }
});

router.get("/contact/messages", requireStaffAuth, requirePermission("settings"), async (_req, res) => {
  try { res.json(await contactMessages()); }
  catch (error) { console.error("Contact message list failed:", error.message); res.status(500).json({ error: "Unable to load contact messages." }); }
});
router.put("/contact/messages/:id", requireStaffAuth, requirePermission("settings"), async (req, res) => {
  try {
    let updated;
    await db.transaction(async tx => {
      const current = await contactMessages(tx), index = current.findIndex(item => item.id === req.params.id);
      if (index < 0) { const error = new Error("Contact message not found."); error.status = 404; throw error; }
      updated = { ...current[index], answer: String(req.body?.answer ?? current[index].answer ?? "").trim().slice(0, 4000), updatedAt: new Date().toISOString() };
      current[index] = updated; await saveContactMessages(current, tx);
    });
    res.json({ message: updated });
  } catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to update contact message." }); }
});
router.delete("/contact/messages/:id", requireStaffAuth, requirePermission("settings"), async (req, res) => {
  try {
    let removed = false;
    await db.transaction(async tx => { const current = await contactMessages(tx), next = current.filter(item => item.id !== req.params.id); removed = next.length !== current.length; if (removed) await saveContactMessages(next, tx); });
    if (!removed) return res.status(404).json({ error: "Contact message not found." });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: "Unable to delete contact message." }); }
});

// Fetch all saved dynamic settings from the database
router.get("/settings", async (req, res) => {
  try {
    const placeholders = PUBLIC_SETTING_KEYS.map(() => "?").join(",");
    const rows = await db.query(`SELECT key_name, value_text FROM app_settings WHERE key_name LIKE 'public_%' OR key_name IN (${placeholders})`, PUBLIC_SETTING_KEYS);
    const settings = {};
    for (const row of rows) {
      try {
        if (/(secret|token|password|credential|api_key)/i.test(row.key_name)) continue;
        settings[row.key_name] = JSON.parse(row.value_text);
      } catch (e) {
        settings[row.key_name] = row.value_text;
      }
    }
    res.json(settings);
  } catch (err) {
    console.error("Public settings read failed:", err.message);
    res.status(500).json({ error: "Unable to load settings." });
  }
});

function requireSettingPermission(req, res, next) {
  const key = String(req.body?.key || "");
  const required = key === "swastik_categories" ? "categories" : key === "swastik_offers" ? "products" : "settings";
  if (!req.staff.isMasterAdmin && !req.staff.permissions.includes(required)) return res.status(403).json({ error: `Permission '${required}' is required.` });
  next();
}

// Save or update a dynamic setting in the database
router.post("/settings", requireStaffAuth, requireSettingPermission, async (req, res) => {
  const { key, value } = req.body;
  if (!/^[a-z0-9_]{1,150}$/i.test(String(key || ""))) {
    return res.status(400).json({ error: "A valid setting key is required." });
  }

  try {
    const valueString = JSON.stringify(value);
    if (valueString.length > 100000) return res.status(413).json({ error: "Setting value is too large." });
    const existing = await db.query("SELECT key_name FROM app_settings WHERE key_name = ?", [key]);

    if (existing.length > 0) {
      await db.execute(
        "UPDATE app_settings SET value_text = ?, updated_at = CURRENT_TIMESTAMP WHERE key_name = ?",
        [valueString, key]
      );
    } else {
      await db.execute(
        "INSERT INTO app_settings (key_name, value_text) VALUES (?, ?)",
        [key, valueString]
      );
    }

    res.json({ status: "success", key, value });
  } catch (err) {
    console.error("Setting update failed:", err.message);
    res.status(500).json({ error: "Unable to update setting." });
  }
});

export default router;
