import fs from "node:fs";
import path from "node:path";
import multer from "multer";

export const uploadsDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 20 }
});

export function isR2ConfiguredAndValid() {
  return Boolean(process.env.CLOUDFLARE_R2_ACCOUNT_ID && process.env.CLOUDFLARE_R2_ACCESS_KEY_ID && process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY && process.env.CLOUDFLARE_R2_BUCKET_NAME);
}

export function getBrand(name, category = "") {
  const value = String(name || "").trim();
  if (value) return value.split(/\s+/).slice(0, 2).join(" ");
  return String(category || "").trim();
}

export function mapPartner(row) {
  return { id:Number(row.id),name:row.name,photo:row.photo||"",designation:row.designation,about:row.about,sortOrder:Number(row.sort_order||0),isActive:Boolean(row.is_active) };
}

export function mapReview(row) {
  return { id:Number(row.id),name:row.author_name,authorName:row.author_name,rating:Number(row.rating),commentEn:row.comment_en,commentHi:row.comment_hi||"",avatarBg:row.avatar_bg||"",ownerResponse:row.owner_response||"",isApproved:Boolean(row.is_approved),createdAt:row.created_at };
}
