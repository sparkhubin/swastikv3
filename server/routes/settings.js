import express from "express";
import { db } from "../../database/db.js";

const router = express.Router();

// Fetch all saved dynamic settings from the database
router.get("/settings", async (req, res) => {
  try {
    const rows = await db.query("SELECT key_name, value_text FROM app_settings");
    const settings = {};
    for (const row of rows) {
      try {
        settings[row.key_name] = JSON.parse(row.value_text);
      } catch (e) {
        settings[row.key_name] = row.value_text;
      }
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save or update a dynamic setting in the database
router.post("/settings", async (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Missing 'key' in request body." });
  }

  try {
    const valueString = JSON.stringify(value);
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
    res.status(500).json({ error: err.message });
  }
});

export default router;
