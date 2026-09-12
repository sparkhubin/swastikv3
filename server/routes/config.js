import express from "express";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../../database/db.js";
import { 
  upload, 
  isR2ConfiguredAndValid, 
  uploadsDir 
} from "../utils.js";
import { requirePermission, requireStaffAuth } from "../auth.js";

const router = express.Router();

router.get("/config", async (req, res) => {
  try {
    const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL ||
      (process.env.CLOUDFLARE_R2_BUCKET_NAME ? `https://${process.env.CLOUDFLARE_R2_BUCKET_NAME}.r2.dev` : "");
    const rows = await db.query(`SELECT enabled, razorpay_enabled, razorpay_key_id, environment, active_gateway
                                   FROM payment_settings WHERE id = 1`);
    if (rows.length > 0) {
      const isOnlineEnabled = Boolean(rows[0].enabled) || Boolean(rows[0].razorpay_enabled);
      res.json({ 
        r2PublicUrl: publicUrlBase,
        paymentEnabled: isOnlineEnabled,
        paymentEnvironment: rows[0].environment,
        enabled: Boolean(rows[0].enabled),
        razorpayEnabled: Boolean(rows[0].razorpay_enabled),
        razorpayKeyId: rows[0].razorpay_key_id || "",
        environment: rows[0].environment,
        activeGateway: rows[0].active_gateway || ""
      });
    } else {
      res.json({ 
        r2PublicUrl: publicUrlBase,
        paymentEnabled: false,
        paymentEnvironment: "",
        enabled: false,
        razorpayEnabled: false,
        razorpayKeyId: "",
        environment: "",
        activeGateway: ""
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cloudflare R2 Upload api route handler
router.post("/upload", requireStaffAuth, requirePermission("products"), upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const file = req.file;
  const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  if (!allowedMimeTypes.has(file.mimetype)) {
    return res.status(415).json({ error: "Only JPEG, PNG, WebP, and GIF images are supported." });
  }
  const fileExtensions = new Map([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
    ["image/gif", ".gif"]
  ]);
  const fileExt = fileExtensions.get(file.mimetype);

  const rawProductCode = String(req.body.code || "").trim();
  const productCode = rawProductCode.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 100);
  if (rawProductCode && !productCode) {
    return res.status(400).json({ error: "Product code contains no valid filename characters." });
  }

  const uniqueId = Math.floor(100000 + Math.random() * 900000);
  
  const fileName = productCode
    ? `${productCode}${fileExt}`
    : `uploads_${uniqueId}${fileExt}`;
  
  const contentType = file.mimetype || (
        fileExt === ".webp"
          ? "image/webp"
          : fileExt === ".png"
            ? "image/png"
            : "image/jpeg"
      );
  if (isR2ConfiguredAndValid()) {
    console.log(`Uploading ${fileName} to Cloudflare R2 bucket: ${process.env.CLOUDFLARE_R2_BUCKET_NAME}`);
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
        ContentType: contentType,
      });

      await s3.send(command);

      const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://${process.env.CLOUDFLARE_R2_BUCKET_NAME}.r2.dev`;
      const publicUrl = `${publicUrlBase}/${fileName}`;
      console.log(`✓ Cloudflare R2 upload success: ${publicUrl}`);
      return res.json({ url: publicUrl });
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("EPROTO") || msg.includes("handshake") || msg.includes("SSL")) {
        console.warn("⚠️ Cloudflare R2 SSL/TLS handshake failed (invalid/placeholder R2 configuration or unsupported cipher in local OpenSSL). Falling back locally...");
      } else {
        console.warn(`⚠️ Cloudflare R2 storage error: ${msg}. Falling back locally...`);
      }
    }
  }

  // Fallback upload locally to disk
  try {
    const localPath = path.join(uploadsDir, fileName);
    await fs.promises.writeFile(localPath, file.buffer);
    
    // Prefer an explicitly configured public base; otherwise return a same-origin URL.
    let baseUrl = process.env.BACKEND_URL || process.env.UPLOAD_BASE_URL || process.env.PUBLIC_APP_URL || "";
    baseUrl = baseUrl.replace(/\/$/, "");
    const fullUrl = `${baseUrl}/uploads/${fileName}`;

    console.log(`✓ Uploaded locally to disk: ${fullUrl}`);
    return res.json({ 
      url: fullUrl,
      relativeUrl: `/uploads/${fileName}`,
      fileName
    });
  } catch (err) {
    console.error("Local file writing failure:", err.message);
    return res.status(500).json({ error: "Failed to store uploaded asset" });
  }
});

export default router;
