import express from "express";
import { sendWhatsappMessageUnified } from "../utils.js";
import { db } from "../../database/db.js";

const router = express.Router();

// Helper to get custom templates from app_settings
async function getStoredCustomTemplates() {
  try {
    const rows = await db.query("SELECT value_text FROM app_settings WHERE key_name = 'swastik_custom_templates'");
    if (rows.length > 0 && rows[0].value_text) {
      const parsed = JSON.parse(rows[0].value_text);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading custom templates:", e);
  }
  return [];
}

// Helper to save custom templates to app_settings
async function saveStoredCustomTemplates(templates) {
  try {
    const valueString = JSON.stringify(templates);
    const existing = await db.query("SELECT key_name FROM app_settings WHERE key_name = 'swastik_custom_templates'");
    if (existing.length > 0) {
      await db.execute(
        "UPDATE app_settings SET value_text = ?, updated_at = CURRENT_TIMESTAMP WHERE key_name = 'swastik_custom_templates'",
        [valueString]
      );
    } else {
      await db.execute(
        "INSERT INTO app_settings (key_name, value_text) VALUES ('swastik_custom_templates', ?)",
        [valueString]
      );
    }
    return true;
  } catch (e) {
    console.error("Error saving custom templates:", e);
    return false;
  }
}

// GET /api/whatsapp/custom-templates - Retrieve saved custom Meta templates
router.get("/whatsapp/custom-templates", async (req, res) => {
  try {
    const templates = await getStoredCustomTemplates();
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/custom-templates - Save or add new custom Meta template
router.post("/whatsapp/custom-templates", async (req, res) => {
  try {
    const tpl = req.body;
    if (!tpl.name && !tpl.id) {
      return res.status(400).json({ error: "Template name / ID is required." });
    }

    const templateId = String(tpl.id || tpl.name).trim().toLowerCase().replace(/\s+/g, '_');
    const newTemplate = {
      id: templateId,
      name: tpl.displayName || tpl.name || templateId,
      templateName: templateId,
      category: tpl.category || 'MARKETING',
      categoryColor: tpl.categoryColor || 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      description: tpl.description || `Custom Meta Developer Template: ${templateId}`,
      languageCode: tpl.languageCode || 'en_US',
      paramsCount: Number(tpl.paramsCount || 0),
      paramLabels: Array.isArray(tpl.paramLabels) ? tpl.paramLabels : [],
      bodyPreview: tpl.bodyPreview || '',
      createdAt: new Date().toISOString()
    };

    let templates = await getStoredCustomTemplates();
    const existingIndex = templates.findIndex(t => t.id === templateId);
    if (existingIndex >= 0) {
      templates[existingIndex] = { ...templates[existingIndex], ...newTemplate, updatedAt: new Date().toISOString() };
    } else {
      templates.unshift(newTemplate);
    }

    await saveStoredCustomTemplates(templates);
    res.json({ success: true, template: newTemplate, templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/whatsapp/custom-templates/:id - Delete custom template
router.delete("/whatsapp/custom-templates/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let templates = await getStoredCustomTemplates();
    templates = templates.filter(t => t.id !== id && t.templateName !== id);
    await saveStoredCustomTemplates(templates);
    res.json({ success: true, message: `Template ${id} removed.`, templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/send - Single WhatsApp message dispatch
router.post("/whatsapp/send", async (req, res) => {
  const { to, message, templateName, templateParams, isOtp, otpCode, languageCode, mediaUrl } = req.body;
  if (!to || (!message && !templateName)) {
    return res.status(400).json({ error: "Parameters 'to' and 'message' or 'templateName' are required." });
  }

  const fallbackBody = message || `Swastik Notification: ${templateName || "Alert"}`;
  const waRes = await sendWhatsappMessageUnified(
    to, 
    fallbackBody, 
    isOtp || false, 
    otpCode, 
    templateName, 
    templateParams,
    mediaUrl,
    languageCode || "en_US"
  );

  res.json({
    status: waRes.success ? "dispatched" : "failed",
    to,
    message: fallbackBody,
    template_name: templateName || (isOtp ? "reference_no" : null),
    language_code: languageCode || "en_US",
    whatsapp_response: waRes
  });
});

// POST /api/whatsapp/bulk-send - Bulk campaign broadcast to uploaded / selected customer numbers
router.post("/whatsapp/bulk-send", async (req, res) => {
  try {
    const { 
      recipients, 
      templateName, 
      templateParams = [], 
      languageCode = "en_US", 
      fallbackMessage = "",
      mediaUrl = undefined 
    } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "No recipient numbers provided for bulk broadcast." });
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const targetPhone = typeof recipient === 'string' ? recipient : (recipient.phone || recipient.mobile || recipient.number);
      const recipientName = typeof recipient === 'object' ? (recipient.name || recipient.customerName || "Valued Customer") : "Valued Customer";
      
      // Calculate dynamic parameters for this recipient
      let itemParams = [];
      if (Array.isArray(recipient.params) && recipient.params.length > 0) {
        itemParams = recipient.params;
      } else if (Array.isArray(templateParams) && templateParams.length > 0) {
        itemParams = templateParams.map(p => {
          let str = String(p);
          str = str.replace(/\{\{name\}\}/gi, recipientName);
          str = str.replace(/\{\{phone\}\}/gi, targetPhone);
          return str;
        });
      }

      // Format custom fallback message
      let msgBody = fallbackMessage || `Namaste ${recipientName}, Swastik Supermarket special update for you.`;
      msgBody = msgBody.replace(/\{\{name\}\}/gi, recipientName);
      if (itemParams.length > 0) {
        itemParams.forEach((val, idx) => {
          msgBody = msgBody.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), val);
        });
      }

      try {
        const waRes = await sendWhatsappMessageUnified(
          targetPhone,
          msgBody,
          false,
          undefined,
          templateName,
          itemParams,
          mediaUrl,
          languageCode
        );

        if (waRes.success) {
          successCount++;
          results.push({
            phone: targetPhone,
            name: recipientName,
            status: "SUCCESS",
            provider: waRes.provider || "meta",
            id: waRes.id || `msg_${Date.now()}_${i}`
          });
        } else {
          failCount++;
          results.push({
            phone: targetPhone,
            name: recipientName,
            status: "FAILED",
            error: waRes.error || "Delivery failed"
          });
        }
      } catch (sendErr) {
        failCount++;
        results.push({
          phone: targetPhone,
          name: recipientName,
          status: "FAILED",
          error: sendErr.message
        });
      }
    }

    res.json({
      success: true,
      total: recipients.length,
      successCount,
      failCount,
      templateName,
      languageCode,
      results
    });
  } catch (err) {
    console.error("Error in /api/whatsapp/bulk-send:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
