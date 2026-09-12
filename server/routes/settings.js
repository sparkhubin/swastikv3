import express from "express";
import { db } from "../../database/db.js";
import { requirePermission, requireStaffAuth } from "../auth.js";

const router = express.Router();

// Fetch all saved dynamic settings from the database
router.get("/settings", async (req, res) => {
  try {
    const rows = await db.query("SELECT key_name, value_text FROM app_settings WHERE key_name LIKE 'public_%' OR key_name LIKE 'swastik_%'");
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

// Save or update a dynamic setting in the database
router.post("/settings", requireStaffAuth, requirePermission("settings"), async (req, res) => {
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

    res.json({ status: "success", key });
  } catch (err) {
    console.error("Setting update failed:", err.message);
    res.status(500).json({ error: "Unable to update setting." });
  }
});

export default router;
