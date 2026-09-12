import express from "express";
import path from "path";
import fs from "fs";
import crypto from "node:crypto";
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
    const rows = await db.query(`SELECT gateway, enabled, key_id, app_id, environment
                                   FROM payment_settings WHERE enabled = 1 ORDER BY gateway`);
    if (rows.length > 0) {
      const razorpay = rows.find(row => row.gateway === "RAZORPAY");
      const cashfree = rows.find(row => row.gateway === "CASHFREE");
      res.json({ 
        r2PublicUrl: publicUrlBase,
        paymentEnabled: true,
        paymentEnvironment: rows[0].environment,
        enabled: true,
        razorpayEnabled: Boolean(razorpay),
        cashfreeEnabled: Boolean(cashfree),
        razorpayKeyId: razorpay?.key_id || "",
        environment: rows[0].environment,
        activeGateway: rows[0].gateway
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
    console.error("Public configuration read failed:", err.message);
    res.status(500).json({ error: "Unable to load public configuration." });
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

  const signatures = {
    "image/jpeg": buffer => buffer[0] === 0xff && buffer[1] === 0xd8,
    "image/png": buffer => buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
    "image/gif": buffer => ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii")),
    "image/webp": buffer => buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP"
  };
  if (!signatures[file.mimetype]?.(file.buffer)) {
    return res.status(415).json({ error: "Uploaded file content does not match its image type." });
  }
  const uniqueId = crypto.randomBytes(8).toString("hex");
  
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
