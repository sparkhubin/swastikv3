import express from "express";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../../database/db.js";
import { 
  upload, 
  isR2ConfiguredAndValid, 
  uploadsDir, 
  sendWhatsappMessageUnified 
} from "../utils.js";

const router = express.Router();

// Get MARG Settings
router.get("/marg/settings", async (req, res) => {
  try {
    const rows = await db.query("SELECT api_token as \"apiToken\", points_ratio as \"pointsRatio\", auto_notify_whatsapp as \"autoNotifyWhatsApp\", simulate_delay as \"simulateDelay\" FROM marg_settings WHERE id = 1");
    if (rows.length > 0) {
      const settings = rows[0];
      res.json({
        apiToken: settings.apiToken,
        pointsRatio: Number(settings.pointsRatio),
        autoNotifyWhatsApp: Boolean(settings.autoNotifyWhatsApp),
        simulateDelay: Number(settings.simulateDelay)
      });
    } else {
      res.json({ apiToken: "SWASTIK_MARG_SECURE_TOKEN_2026", pointsRatio: 10, autoNotifyWhatsApp: true, simulateDelay: 0 });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update MARG Settings
router.post("/marg/settings", async (req, res) => {
  const { apiToken, pointsRatio, autoNotifyWhatsApp, simulateDelay } = req.body;
  try {
    await db.execute(
      "UPDATE marg_settings SET api_token = ?, points_ratio = ?, auto_notify_whatsapp = ?, simulate_delay = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
      [
        apiToken || "",
        pointsRatio !== undefined ? Number(pointsRatio) : 10,
        autoNotifyWhatsApp !== undefined ? (autoNotifyWhatsApp ? 1 : 0) : 1,
        simulateDelay !== undefined ? Number(simulateDelay) : 0
      ]
    );

    const logMsg = `MARG settings updated. Token: ${(apiToken || "").substring(0, 4)}***, Points Ratio: ₹${pointsRatio || 10}=1PT, WhatsApp: ${autoNotifyWhatsApp}`;
    await db.execute(
      "INSERT INTO marg_log (type, message) VALUES (?, ?)",
      ["INFO", logMsg]
    );

    res.json({
      status: "success",
      settings: {
        apiToken: apiToken || "",
        pointsRatio: Number(pointsRatio),
        autoNotifyWhatsApp: Boolean(autoNotifyWhatsApp),
        simulateDelay: Number(simulateDelay)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get MARG integration logs
router.get("/marg/logs", async (req, res) => {
  try {
    const rows = await db.query("SELECT timestamp, type, message, payload FROM marg_log ORDER BY timestamp DESC LIMIT 50");
    res.json(rows.map(r => ({
      timestamp: r.timestamp,
      type: r.type,
      message: r.message,
      payload: r.payload ? JSON.parse(r.payload) : undefined
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear MARG integration logs
router.post("/marg/logs/clear", async (req, res) => {
  try {
    await db.execute("DELETE FROM marg_log");
    res.json({ status: "success", message: "Logs cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MARG ERP Bill Integration webhook API
router.post("/marg/bill", upload.any(), async (req, res) => {
  const authHeader = req.headers["x-marg-token"] || req.body.apiToken || req.body.token || req.query.token || req.query.apiToken;
  
  let margSettings = { apiToken: "SWASTIK_MARG_SECURE_TOKEN_2026", pointsRatio: 10, autoNotifyWhatsApp: true };
  try {
    const rows = await db.query("SELECT api_token as \"apiToken\", points_ratio as \"pointsRatio\", auto_notify_whatsapp as \"autoNotifyWhatsApp\" FROM marg_settings WHERE id = 1");
    if (rows.length > 0) {
      margSettings = {
        apiToken: rows[0].apiToken,
        pointsRatio: Number(rows[0].pointsRatio),
        autoNotifyWhatsApp: Boolean(rows[0].autoNotifyWhatsApp)
      };
    }
  } catch (err) {
    console.error("Failed to query MARG settings:", err.message);
  }

  if (authHeader !== margSettings.apiToken) {
    const errorMsg = "Unauthorized: Invalid MARG security handshake API token.";
    try {
      await db.execute(
        "INSERT INTO marg_log (type, message) VALUES (?, ?)",
        ["ERROR", `${errorMsg} Received: "${authHeader || 'None'}"`]
      );
    } catch (e) {}
    return res.status(401).json({ error: errorMsg });
  }

  // Extract variables with flexible aliases to support various billing configurations
  const customerMobile = req.body.customerMobile || req.body.mobile || req.body.phone;
  const billNumber = req.body.billNumber || req.body.billNo || req.body.invoiceNo || req.body.bill_no || req.body.invoice_no || "BILL";

  if (!customerMobile) {
    const errorMsg = "Bad Request: Missing customer mobile number. Please provide 'customerMobile', 'mobile', or 'phone'.";
    try {
      await db.execute(
        "INSERT INTO marg_log (type, message) VALUES (?, ?)",
        ["ERROR", errorMsg]
      );
    } catch (e) {}
    return res.status(400).json({ error: errorMsg });
  }

  // Handle file uploads if a PDF or bill file is sent in the request
  let uploadedPdfUrl = "";
  const filesList = req.files;
  if (filesList && filesList.length > 0) {
    const file = filesList[0];
    const fileExt = path.extname(file.originalname) || ".pdf";
    const uniqueId = Math.floor(100000 + Math.random() * 900000);
    const fileName = `uploads_${uniqueId}${fileExt}`;

    if (isR2ConfiguredAndValid()) {
      console.log(`Uploading MARG PDF ${fileName} to Cloudflare R2 bucket: ${process.env.CLOUDFLARE_R2_BUCKET_NAME}`);
      try {
        const s3 = new S3Client({
          endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
          },
          region: "auto",
          forcePathStyle: true,
        });

        const command = new PutObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        });

        await s3.send(command);

        const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://${process.env.CLOUDFLARE_R2_BUCKET_NAME}.r2.dev`;
        uploadedPdfUrl = `${publicUrlBase}/${fileName}`;
        console.log(`✓ Cloudflare R2 upload success for MARG PDF: ${uploadedPdfUrl}`);
      } catch (err) {
        const msg = err.message || "";
        if (msg.includes("EPROTO") || msg.includes("handshake") || msg.includes("SSL")) {
          console.warn("⚠️ Cloudflare R2 SSL/TLS handshake failed for MARG PDF (invalid/placeholder R2 configuration or unsupported cipher in local OpenSSL). Falling back locally...");
        } else {
          console.warn(`⚠️ Cloudflare R2 storage error for MARG PDF: ${msg}. Falling back locally...`);
        }
      }
    }

    if (!uploadedPdfUrl) {
      // Fallback upload locally to disk
      try {
        const localPath = path.join(uploadsDir, fileName);
        fs.writeFileSync(localPath, file.buffer);
        const host = req.get("x-forwarded-host") || req.get("host") || process.env.STORE_DOMAIN || "localhost:3000";
        const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
        uploadedPdfUrl = `${protocol}://${host}/uploads/${fileName}`;
        console.log(`✓ Fallback uploaded MARG PDF locally to disk: ${uploadedPdfUrl}`);
      } catch (err) {
        console.error("Local file writing failure for MARG PDF:", err.message);
      }
    }
  }

  // Final PDF URL
  const pdfUrl = uploadedPdfUrl || req.body.pdfUrl || req.body.billUrl || req.body.pdf || req.body.fileUrl;

  const successMsg = `MARG PDF bill received for customer +91 ${customerMobile}.${pdfUrl ? " [PDF Attached]" : ""}`;
  try {
    await db.execute(
      "INSERT INTO marg_log (type, message, payload) VALUES (?, ?, ?)",
      ["SUCCESS", successMsg, JSON.stringify({ billNumber, customerMobile, pdfUrl })]
    );
  } catch (e) {}

  let whatsappStatus = "SKIPPED_BY_CONFIG";
  let whatsappError = undefined;
  if (margSettings.autoNotifyWhatsApp) {
    const waText = "Thank you for shopping at Swastik Supermarket 😊\n\nWe appreciate your visit.";
    const reqTemplateName = req.body.templateName || req.body.template_name || "thank_you_template";
    const reqTemplateParams = req.body.templateParams || req.body.template_params || [];

    const waRes = await sendWhatsappMessageUnified(
      customerMobile, 
      waText, 
      false, 
      undefined, 
      reqTemplateName, 
      reqTemplateParams,
      pdfUrl || undefined
    );
    whatsappStatus = waRes.success ? `SUCCESS_${waRes.provider.toUpperCase()}` : `ERROR_${waRes.provider.toUpperCase()}`;
    whatsappError = waRes.error || undefined;

    try {
      await db.execute(
        "INSERT INTO marg_log (type, message) VALUES (?, ?)",
        ["WHATSAPP", `[WhatsApp Outbox Engine] Dispatched template '${reqTemplateName}' with PDF to +91 ${customerMobile}. Status: ${whatsappStatus}${whatsappError ? ' Error: ' + whatsappError : ''}`]
      );
    } catch (e) {}
  }

  res.json({
    status: "success",
    message: "MARG PDF bill received and dispatched to WhatsApp",
    customerMobile,
    whatsappStatus,
    whatsappError,
    pdfUrl: pdfUrl || undefined,
    timestamp: new Date().toISOString()
  });
});

export default router;
