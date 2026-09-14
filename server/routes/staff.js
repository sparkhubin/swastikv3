import express from "express";
import { db } from "../../database/db.js";
import { audit, hashPassword, normalizeMobile, requireMasterAdmin, requirePermission, requireStaffAuth, toPublicStaff } from "../auth.js";

const router = express.Router();
router.use(["/roles", "/permissions", "/users", "/staff"], requireStaffAuth, requirePermission("staff"));

const STAFF_SELECT = `SELECT u.id,u.full_name,u.phone_number,u.email,u.password_hash,u.role_id,u.status,u.is_master_admin,
  r.name AS role_name,r.description AS role_description,GROUP_CONCAT(DISTINCT p.code) AS permission_codes,
  ds.id AS delivery_staff_id,ds.status AS delivery_status,ds.vehicle_type,ds.vehicle_number
  FROM "user" u LEFT JOIN role r ON r.id=u.role_id LEFT JOIN role_permission rp ON rp.role_id=r.id
  LEFT JOIN permission p ON p.id=rp.permission_id LEFT JOIN delivery_staff ds ON ds.user_id=u.id`;

function mapStaff(row) {
  return { ...toPublicStaff(row), deliveryStaffId: row.delivery_staff_id || null, deliveryStatus: row.delivery_status || null, vehicleType: row.vehicle_type || "", vehicleNumber: row.vehicle_number || "" };
}

function mapRole(row) {
  return { id: Number(row.id), name: row.name, description: row.description || "", isSystem: Boolean(row.is_system), permissions: String(row.permission_codes || "").split(",").map(value => value.trim()).filter(Boolean) };
}

async function loadRole(id, transaction = db) {
  if (!Number.isInteger(Number(id))) return null;
  const row = await transaction.get(`SELECT r.*,GROUP_CONCAT(DISTINCT p.code) permission_codes FROM role r
    LEFT JOIN role_permission rp ON rp.role_id=r.id LEFT JOIN permission p ON p.id=rp.permission_id
    WHERE r.id=? GROUP BY r.id`, [Number(id)]);
  return row ? mapRole(row) : null;
}

async function permissionIds(codes, transaction = db) {
  if (!Array.isArray(codes) || !codes.length) return [];
  const normalized = [...new Set(codes.map(value => String(value).trim()).filter(Boolean))];
  const rows = await transaction.query(`SELECT id,code FROM permission WHERE code IN (${normalized.map(() => "?").join(",")})`, normalized);
  if (rows.length !== normalized.length) { const error = new Error("One or more permission codes do not exist."); error.status = 400; throw error; }
  return rows.map(row => Number(row.id));
}

function canGrantRole(actor, role) {
  return actor.isMasterAdmin || role.permissions.every(permission => actor.permissions.includes(permission));
}

function isDeliveryRole(role) {
  return ["DELIVERY", "RIDER"].includes(String(role?.name || "").toUpperCase());
}

router.get("/permissions", async (_req, res) => res.json(await db.query("SELECT id,code,name,description,module FROM permission ORDER BY module,code")));

router.get("/roles", async (_req, res) => {
  const rows = await db.query(`SELECT r.*,GROUP_CONCAT(DISTINCT p.code) permission_codes FROM role r
    LEFT JOIN role_permission rp ON rp.role_id=r.id LEFT JOIN permission p ON p.id=rp.permission_id
    GROUP BY r.id ORDER BY r.id`);
  res.json(rows.map(mapRole));
});

router.post("/roles", requireMasterAdmin, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const description = String(req.body?.description || "").trim().slice(0, 1000);
  if (!/^[A-Za-z][A-Za-z0-9 _-]{1,49}$/.test(name)) return res.status(400).json({ error: "A valid role name is required." });
  try {
    const roleId = await db.transaction(async tx => {
      const ids = await permissionIds(req.body?.permissions || [], tx);
      const result = await tx.execute("INSERT INTO role (name,description,is_system) VALUES (?,?,0)", [name, description]);
      for (const permissionId of ids) await tx.execute("INSERT INTO role_permission (role_id,permission_id) VALUES (?,?)", [result.lastID, permissionId]);
      return result.lastID;
    });
    await audit("USER", req.staff.id, "CREATE_ROLE", "role", roleId, {}, req);
    res.status(201).json({ role: await loadRole(roleId) });
  } catch (error) {
    res.status(error.status || (error.code === "SQLITE_CONSTRAINT" ? 409 : 500)).json({ error: error.status ? error.message : error.code === "SQLITE_CONSTRAINT" ? "Role name already exists." : "Unable to create role." });
  }
});

router.put("/roles/:id", requireMasterAdmin, async (req, res) => {
  const current = await loadRole(req.params.id);
  if (!current) return res.status(404).json({ error: "Role not found." });
  const name = req.body?.name === undefined ? current.name : String(req.body.name).trim();
  const description = req.body?.description === undefined ? current.description : String(req.body.description).trim().slice(0, 1000);
  if (!/^[A-Za-z][A-Za-z0-9 _-]{1,49}$/.test(name)) return res.status(400).json({ error: "A valid role name is required." });
  try {
    await db.transaction(async tx => {
      await tx.execute("UPDATE role SET name=?,description=?,updated_at=CURRENT_TIMESTAMP WHERE id=?", [name, description, current.id]);
      if (req.body?.permissions !== undefined) {
        const ids = await permissionIds(req.body.permissions, tx);
        await tx.execute("DELETE FROM role_permission WHERE role_id=?", [current.id]);
        for (const permissionId of ids) await tx.execute("INSERT INTO role_permission (role_id,permission_id) VALUES (?,?)", [current.id, permissionId]);
      }
    });
    await audit("USER", req.staff.id, "UPDATE_ROLE", "role", current.id, {}, req);
    res.json({ role: await loadRole(current.id) });
  } catch (error) {
    res.status(error.status || (error.code === "SQLITE_CONSTRAINT" ? 409 : 500)).json({ error: error.status ? error.message : error.code === "SQLITE_CONSTRAINT" ? "Role name already exists." : "Unable to update role." });
  }
});

router.put("/roles/:id/permissions", requireMasterAdmin, async (req, res) => {
  const current = await loadRole(req.params.id);
  if (!current) return res.status(404).json({ error: "Role not found." });
  try {
    await db.transaction(async tx => {
      const ids = await permissionIds(req.body?.permissions || [], tx);
      await tx.execute("DELETE FROM role_permission WHERE role_id=?", [current.id]);
      for (const permissionId of ids) await tx.execute("INSERT INTO role_permission (role_id,permission_id) VALUES (?,?)", [current.id, permissionId]);
    });
    await audit("USER", req.staff.id, "UPDATE_ROLE_PERMISSIONS", "role", current.id, {}, req);
    res.json({ role: await loadRole(current.id) });
  } catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to update role permissions." }); }
});

router.delete("/roles/:id", requireMasterAdmin, async (req, res) => {
  const role = await loadRole(req.params.id);
  if (!role) return res.status(404).json({ error: "Role not found." });
  if (role.isSystem) return res.status(409).json({ error: "System roles cannot be removed." });
  const assigned = await db.get('SELECT COUNT(*) count FROM "user" WHERE role_id=?', [role.id]);
  if (Number(assigned.count)) return res.status(409).json({ error: "Remove this role from all staff before deleting it." });
  await db.execute("DELETE FROM role WHERE id=?", [role.id]);
  await audit("USER", req.staff.id, "DELETE_ROLE", "role", role.id, {}, req);
  res.json({ success: true });
});

router.get("/users", async (_req, res) => res.json((await db.query(`${STAFF_SELECT} GROUP BY u.id ORDER BY u.id`)).map(mapStaff)));
router.get("/staff", async (_req, res) => res.json((await db.query(`${STAFF_SELECT} WHERE lower(r.name)<>'user' GROUP BY u.id ORDER BY u.id`)).map(mapStaff)));

router.post("/staff", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim(), mobile = normalizeMobile(req.body?.mobile), password = String(req.body?.password || ""), role = await loadRole(req.body?.roleId);
    if (name.length < 2 || name.length > 150 || mobile.length !== 10 || password.length < 10 || password.length > 128 || !role) return res.status(400).json({ error: "Valid name, mobile, 10-128 character password, and database role are required." });
    if (String(role.name).toLowerCase() === "user") return res.status(400).json({ error: "A customer role cannot be assigned to staff." });
    if (!canGrantRole(req.staff, role)) return res.status(403).json({ error: "You cannot grant permissions you do not hold." });
    const requestedStatus = String(req.body?.status || "Active").toLowerCase();
    if (!["active", "enabled", "disabled", "inactive"].includes(requestedStatus)) return res.status(400).json({ error: "Staff status must be active or disabled." });
    const status = ["active", "enabled"].includes(requestedStatus) ? "Active" : "Disabled";
    const id = await db.transaction(async tx => {
      const inserted = await tx.execute(`INSERT INTO "user" (full_name,phone_number,email,password_hash,role_id,status,is_master_admin) VALUES (?,?,?,?,?,?,0)`, [name, mobile, String(req.body.email || "").trim().slice(0, 255), await hashPassword(password), role.id, status]);
      if (isDeliveryRole(role)) await tx.execute("INSERT INTO delivery_staff (user_id,name,phone,status,vehicle_type,vehicle_number) VALUES (?,?,?,?,?,?)", [inserted.lastID, name, mobile, status === "Active" ? "ACTIVE" : "INACTIVE", String(req.body.vehicleType || ""), String(req.body.vehicleNumber || "")]);
      return inserted.lastID;
    });
    await audit("USER", req.staff.id, "CREATE_STAFF", "user", id, { roleId: role.id }, req);
    res.status(201).json({ staff: mapStaff(await db.get(`${STAFF_SELECT} WHERE u.id=? GROUP BY u.id`, [id])) });
  } catch (error) { res.status(error.code === "SQLITE_CONSTRAINT" ? 409 : 500).json({ error: error.code === "SQLITE_CONSTRAINT" ? "Phone number already exists." : "Unable to create staff." }); }
});

router.put("/staff/:id", async (req, res) => {
  try {
    const id = Number(req.params.id), current = await db.get(`${STAFF_SELECT} WHERE u.id=? GROUP BY u.id`, [id]);
    if (!current) return res.status(404).json({ error: "Staff member not found." });
    if (current.is_master_admin && id !== req.staff.id) return res.status(403).json({ error: "Master administrator cannot be modified." });
    if (current.is_master_admin && req.body?.roleId !== undefined && Number(req.body.roleId) !== Number(current.role_id)) return res.status(400).json({ error: "The master administrator role cannot be changed through this endpoint." });
    const role = req.body?.roleId === undefined ? await loadRole(current.role_id) : await loadRole(req.body.roleId);
    if (!role || String(role.name).toLowerCase() === "user") return res.status(400).json({ error: "A valid staff role is required." });
    if (!canGrantRole(req.staff, role)) return res.status(403).json({ error: "You cannot grant permissions you do not hold." });
    const name = String(req.body.name ?? current.full_name).trim(), mobile = req.body.mobile === undefined ? current.phone_number : normalizeMobile(req.body.mobile);
    const requestedStatus = String(req.body.status ?? current.status).toLowerCase();
    if (!["active", "enabled", "disabled", "inactive"].includes(requestedStatus)) return res.status(400).json({ error: "Staff status must be active or disabled." });
    const status = ["active", "enabled"].includes(requestedStatus) ? "Active" : "Disabled";
    if (current.is_master_admin && status !== "Active") return res.status(400).json({ error: "The master administrator cannot be disabled." });
    if (name.length < 2 || name.length > 150 || mobile.length !== 10) return res.status(400).json({ error: "Valid name and mobile are required." });
    if (req.body.password !== undefined && (String(req.body.password).length < 10 || String(req.body.password).length > 128)) return res.status(400).json({ error: "Password must be 10-128 characters." });
    await db.transaction(async tx => {
      const password = req.body.password ? await hashPassword(req.body.password) : current.password_hash;
      await tx.execute(`UPDATE "user" SET full_name=?,phone_number=?,email=?,password_hash=?,role_id=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`, [name, mobile, String(req.body.email ?? current.email ?? "").trim().slice(0, 255), password, role.id, status, id]);
      if (isDeliveryRole(role)) await tx.execute(`INSERT INTO delivery_staff (user_id,name,phone,status,vehicle_type,vehicle_number) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,phone=excluded.phone,status=excluded.status,vehicle_type=excluded.vehicle_type,vehicle_number=excluded.vehicle_number,updated_at=CURRENT_TIMESTAMP`, [id, name, mobile, status === "Active" ? "ACTIVE" : "INACTIVE", String(req.body.vehicleType ?? current.vehicle_type ?? ""), String(req.body.vehicleNumber ?? current.vehicle_number ?? "")]);
      else if (current.delivery_staff_id) await tx.execute("UPDATE delivery_staff SET status='INACTIVE',updated_at=CURRENT_TIMESTAMP WHERE user_id=?", [id]);
      if (status !== "Active") await tx.execute("UPDATE user_session SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL", [id]);
    });
    await audit("USER", req.staff.id, "UPDATE_STAFF", "user", id, { roleId: role.id, status }, req);
    res.json({ staff: mapStaff(await db.get(`${STAFF_SELECT} WHERE u.id=? GROUP BY u.id`, [id])) });
  } catch (error) { res.status(error.code === "SQLITE_CONSTRAINT" ? 409 : 500).json({ error: error.code === "SQLITE_CONSTRAINT" ? "Phone number already exists." : "Unable to update staff." }); }
});

router.delete("/staff/:id", async (req, res) => {
  const id = Number(req.params.id), current = await db.get('SELECT * FROM "user" WHERE id=?', [id]);
  if (!current) return res.status(404).json({ error: "Staff member not found." });
  if (current.is_master_admin) return res.status(403).json({ error: "Master administrator cannot be disabled." });
  await db.transaction(async tx => {
    await tx.execute(`UPDATE "user" SET status='Disabled',updated_at=CURRENT_TIMESTAMP WHERE id=?`, [id]);
    await tx.execute("UPDATE delivery_staff SET status='INACTIVE',updated_at=CURRENT_TIMESTAMP WHERE user_id=?", [id]);
    await tx.execute("UPDATE user_session SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL", [id]);
  });
  await audit("USER", req.staff.id, "DISABLE_STAFF", "user", id, {}, req);
  res.json({ staff: mapStaff(await db.get(`${STAFF_SELECT} WHERE u.id=? GROUP BY u.id`, [id])) });
});

export default router;
