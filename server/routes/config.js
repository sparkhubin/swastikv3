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

const router = express.Router();

router.get("/config", async (req, res) => {
  try {
    const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://${process.env.CLOUDFLARE_R2_BUCKET_NAME || 'swastik'}.r2.dev`;
    const rows = await db.query("SELECT enabled, razorpay_enabled, environment FROM payment_settings WHERE id = 1");
    if (rows.length > 0) {
      const isOnlineEnabled = Boolean(rows[0].enabled) || Boolean(rows[0].razorpay_enabled);
      res.json({ 
        r2PublicUrl: publicUrlBase,
        paymentEnabled: isOnlineEnabled,
        paymentEnvironment: rows[0].environment
      });
    } else {
      res.json({ 
        r2PublicUrl: publicUrlBase,
        paymentEnabled: true,
        paymentEnvironment: "TEST"
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cloudflare R2 Upload api route handler
router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const file = req.file;
  let fileExt = path.extname(file.originalname) || "";
  if (!fileExt) {
    if (file.mimetype === "image/webp") fileExt = ".webp";
    else if (file.mimetype === "image/png") fileExt = ".png";
    else if (file.mimetype === "image/gif") fileExt = ".gif";
    else fileExt = ".jpg";
  }

  const productCode = String(req.body.code || "").trim();

  const uniqueId = Math.floor(100000 + Math.random() * 900000);
  
  const fileName = productCode
    ? `${productCode}.webp`
    : `uploads_${uniqueId}${fileExt}`;
  
  const contentType = productCode
    ? "image/webp"
    : (file.mimetype || (
        fileExt === ".webp"
          ? "image/webp"
          : fileExt === ".png"
            ? "image/png"
            : "image/jpeg"
      ));
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
    fs.writeFileSync(localPath, file.buffer);
    
    // Build full absolute URL so frontend on a separate server/domain or mobile app can load the image
    let baseUrl = process.env.BACKEND_URL || process.env.UPLOAD_BASE_URL || process.env.PUBLIC_APP_URL || "";
    if (!baseUrl) {
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const host = req.headers["x-forwarded-host"] || req.get("host");
      baseUrl = `${protocol}://${host}`;
    }
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
