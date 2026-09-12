import crypto from "node:crypto";
import { promisify } from "node:util";
import { db } from "../database/db.js";

const scrypt = promisify(crypto.scrypt);
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 8 * 60 * 60 * 1000);
export const STAFF_COOKIE = "swastik_staff_session";
export const CUSTOMER_COOKIE = "swastik_customer_session";

export function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function parseCookies(req) {
  return String(req.get("cookie") || "").split(";").reduce((cookies, part) => {
    const index = part.indexOf("=");
    if (index > 0) cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    return cookies;
  }, {});
}

function bearerToken(req) {
  const authorization = String(req.get("authorization") || "");
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

export function sessionCookie(name, token, maxAge = SESSION_TTL_MS) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAge / 1000)}${secure}`;
}

export function clearSessionCookie(name) {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(String(password), salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(password, storedValue) {
  const stored = String(storedValue || "");
  if (!stored.startsWith("scrypt$")) return false;
  const [, salt, expectedHex] = stored.split("$");
  if (!salt || !/^[a-f0-9]{128}$/i.test(expectedHex || "")) return false;
  const derived = await scrypt(String(password), salt, 64);
  return safeEqual(Buffer.from(derived).toString("hex"), expectedHex);
}

function parsePermissions(value) {
  return String(value || "").split(",").map(item => item.trim()).filter(Boolean);
}

function isAdministrator(user) {
  return Boolean(user?.isMasterAdmin || ["MASTER_ADMIN", "ADMIN"].includes(String(user?.role_code || "").toUpperCase()));
}

export function toPublicStaff(row) {
  const roleCode = String(row.role_name || row.role_code || "STAFF");
  return {
    id: Number(row.id),
    name: row.full_name,
    mobile: row.phone_number,
    email: row.email || "",
    role: row.role_description || roleCode,
    role_id: Number(row.role_id),
    role_code: roleCode,
    permissions: parsePermissions(row.permission_codes),
    status: row.status,
    isMasterAdmin: Boolean(row.is_master_admin) || roleCode.toUpperCase() === "MASTER_ADMIN"
  };
}

const STAFF_SELECT = `
  SELECT u.id, u.full_name, u.phone_number, u.email, u.password_hash, u.role_id,
         u.status, u.is_master_admin, r.name AS role_name, r.description AS role_description,
         GROUP_CONCAT(DISTINCT p.code) AS permission_codes
    FROM "user" u
    LEFT JOIN role r ON r.id = u.role_id
    LEFT JOIN role_permission rp ON rp.role_id = r.id
    LEFT JOIN permission p ON p.id = rp.permission_id`;

export async function loginStaff(mobile, password, metadata = {}) {
  const cleanMobile = normalizeMobile(mobile);
  if (cleanMobile.length !== 10 || typeof password !== "string" || !password) return null;
  const row = (await db.query(`${STAFF_SELECT} WHERE u.phone_number = ? GROUP BY u.id LIMIT 1`, [cleanMobile]))[0];
  if (!row || String(row.role_name).toLowerCase() === "user" || !await verifyPassword(password, row.password_hash)) return null;
  if (!["active", "enabled"].includes(String(row.status || "").toLowerCase())) return null;

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db.transaction(async tx => {
    await tx.execute('UPDATE "user" SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [row.id]);
    await tx.execute("DELETE FROM user_session WHERE expires_at <= CURRENT_TIMESTAMP OR revoked_at IS NOT NULL");
    await tx.execute(
      "INSERT INTO user_session (user_id, token_hash, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
      [row.id, tokenHash(token), expiresAt, metadata.ip || "", String(metadata.userAgent || "").slice(0, 1000)]
    );
  });
  return { token, user: toPublicStaff(row), expiresAt };
}

async function loadStaffSession(token) {
  if (!token) return null;
  return (await db.query(`${STAFF_SELECT}
    JOIN user_session s ON s.user_id = u.id
   WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > CURRENT_TIMESTAMP
   GROUP BY u.id LIMIT 1`, [tokenHash(token)]))[0] || null;
}

export async function revokeSession(token, table = "user_session") {
  if (!token || !["user_session", "customer_session"].includes(table)) return;
  await db.execute(`UPDATE ${table} SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?`, [tokenHash(token)]);
}

export async function requireStaffAuth(req, res, next) {
  const token = bearerToken(req) || parseCookies(req)[STAFF_COOKIE];
  try {
    const row = await loadStaffSession(token);
    if (!row || !["active", "enabled"].includes(String(row.status || "").toLowerCase())) {
      return res.status(401).json({ error: "Staff authentication is required." });
    }
    req.authToken = token;
    req.staff = toPublicStaff(row);
    next();
  } catch (error) {
    console.error("Staff session validation failed:", error.message);
    res.status(500).json({ error: "Unable to validate staff session." });
  }
}

export function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.staff) return res.status(401).json({ error: "Staff authentication is required." });
    if (!isAdministrator(req.staff) && !permissions.some(permission => req.staff.permissions.includes(permission))) {
      return res.status(403).json({ error: "Insufficient permission." });
    }
    next();
  };
}

export async function issueCustomerSession(customerId, metadata = {}, transaction = db) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await transaction.execute(
    "INSERT INTO customer_session (customer_id, token_hash, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
    [customerId, tokenHash(token), expiresAt, metadata.ip || "", String(metadata.userAgent || "").slice(0, 1000)]
  );
  return { token, expiresAt };
}

export async function requireCustomerAuth(req, res, next) {
  const cookies = parseCookies(req);
  const token = String(req.get("x-customer-token") || "") || cookies[CUSTOMER_COOKIE];
  if (!token) return res.status(401).json({ error: "Customer authentication is required." });
  try {
    const row = (await db.query(`
      SELECT c.id, c.name, c.phone, c.email, c.address, c.status, c.dob, c.anniversary,
             c.referral_code, c.registered_at
        FROM customer_session s JOIN customer c ON c.id = s.customer_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > CURRENT_TIMESTAMP
       LIMIT 1`, [tokenHash(token)]))[0];
    if (!row || String(row.status).toLowerCase() !== "active") return res.status(401).json({ error: "Customer authentication is required." });
    req.customerToken = token;
    req.customer = row;
    next();
  } catch (error) {
    console.error("Customer session validation failed:", error.message);
    res.status(500).json({ error: "Unable to validate customer session." });
  }
}

export async function optionalIdentity(req, _res, next) {
  const cookies = parseCookies(req);
  try {
    const staffToken = bearerToken(req) || cookies[STAFF_COOKIE];
    const customerToken = String(req.get("x-customer-token") || "") || cookies[CUSTOMER_COOKIE];
    const staff = await loadStaffSession(staffToken);
    if (staff) req.staff = toPublicStaff(staff);
    if (customerToken) {
      const customer = (await db.query(`SELECT c.* FROM customer_session s JOIN customer c ON c.id=s.customer_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at > CURRENT_TIMESTAMP LIMIT 1`, [tokenHash(customerToken)]))[0];
      if (customer) req.customer = customer;
    }
    next();
  } catch (error) { next(error); }
}

export function canAdminister(staff) {
  return isAdministrator(staff);
}

export async function audit(actorType, actorId, action, entityType, entityId, values = {}, req = {}) {
  try {
    await db.execute(`INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [actorType, actorId || null, action, entityType, String(entityId || ""), JSON.stringify(values), req.ip || "", String(req.get?.("user-agent") || "").slice(0, 1000)]);
  } catch (error) { console.error("Audit log write failed:", error.message); }
}
