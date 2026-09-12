import crypto from "crypto";
import { promisify } from "util";
import { db } from "../database/db.js";

const scrypt = promisify(crypto.scrypt);
const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(String(password), salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(password, storedValue) {
  const stored = String(storedValue || "");
  if (!stored.startsWith("scrypt$")) {
    return safeEqual(password, stored);
  }

  const [, salt, expectedHex] = stored.split("$");
  if (!salt || !expectedHex) return false;
  const derived = await scrypt(String(password), salt, 64);
  return safeEqual(Buffer.from(derived).toString("hex"), expectedHex);
}

function parsePermissions(value) {
  try {
    const permissions = typeof value === "string" ? JSON.parse(value || "[]") : value;
    return Array.isArray(permissions) ? permissions.filter(item => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function toPublicStaff(row) {
  return {
    id: Number(row.id),
    name: row.full_name || row.name,
    mobile: row.phone_number || row.mobile,
    email: row.email || "",
    role: row.role_description || row.role_desc || row.role_name || "Staff Member",
    role_id: Number(row.role_id),
    role_code: row.role_name || row.role_code || "staff",
    permissions: parsePermissions(row.permissions),
    status: row.status || "Active",
    isMasterAdmin: Boolean(row.is_master_admin ?? row.isMasterAdmin)
  };
}

export async function loginStaff(mobile, password) {
  const cleanMobile = normalizeMobile(mobile);
  if (cleanMobile.length !== 10 || !password) return null;

  const rows = await db.query(
    `SELECT u.*, r.name as role_name, r.description as role_description
       FROM "user" u
       LEFT JOIN role r ON r.id = u.role_id
      WHERE u.phone_number = ? AND u.role_id != 1
      LIMIT 1`,
    [cleanMobile]
  );
  const row = rows[0];
  if (!row || !await verifyPassword(password, row.password_hash)) return null;

  const normalizedStatus = String(row.status || "").toLowerCase();
  if (normalizedStatus && !["active", "enabled"].includes(normalizedStatus)) return null;

  const token = crypto.randomBytes(32).toString("base64url");
  const user = toPublicStaff(row);
  sessions.set(token, { user, expiresAt: Date.now() + SESSION_TTL_MS });
  return { token, user, expiresAt: Date.now() + SESSION_TTL_MS };
}

export function revokeSession(token) {
  sessions.delete(token);
}

export async function requireStaffAuth(req, res, next) {
  const authorization = String(req.get("authorization") || "");
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: "Staff authentication is required." });
  }

  try {
    const rows = await db.query(
      `SELECT u.*, r.name as role_name, r.description as role_description
         FROM "user" u
         LEFT JOIN role r ON r.id = u.role_id
        WHERE u.id = ? AND u.role_id != 1
        LIMIT 1`,
      [session.user.id]
    );
    const row = rows[0];
    const status = String(row?.status || "").toLowerCase();
    if (!row || (status && !["active", "enabled"].includes(status))) {
      sessions.delete(token);
      return res.status(401).json({ error: "Staff session is no longer active." });
    }

    session.user = toPublicStaff(row);
    req.authToken = token;
    req.staff = session.user;
    next();
  } catch (error) {
    console.error("Staff session validation failed:", error.message);
    res.status(500).json({ error: "Unable to validate staff session." });
  }
}

export function requirePermission(...permissions) {
  return (req, res, next) => {
    const user = req.staff;
    const allowed = user?.isMasterAdmin || user?.role_code === "admin" ||
      permissions.some(permission => user?.permissions?.includes(permission));
    if (!allowed) return res.status(403).json({ error: "Insufficient permission." });
    next();
  };
}
