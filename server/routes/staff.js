import express from "express";
import { db } from "../../database/db.js";
import { hashPassword, requirePermission, requireStaffAuth, toPublicStaff } from "../auth.js";

const router = express.Router();

router.use(["/roles", "/users", "/staff"], requireStaffAuth, requirePermission("staff"));

function canManageAdministrators(staff) {
  return Boolean(staff?.isMasterAdmin || staff?.role_code === "admin");
}

async function getStoredStaff() {
  try {
    const rows = await db.query(`
      SELECT u.id, u.full_name, u.phone_number, u.email,
             u.role_id, r.name as role_code, r.description as role_desc,
             u.permissions, u.status, u.is_master_admin as isMasterAdmin
      FROM "user" u
      LEFT JOIN role r ON u.role_id = r.id
      WHERE u.role_id != 1
      ORDER BY u.id ASC
    `);
    if (rows && rows.length > 0) {
      return rows.map(u => toPublicStaff({
        ...u,
        role_name: u.role_code,
        role_description: u.role_desc
      }));
    }
  } catch (e) {
    console.error("Error reading staff from user table:", e);
  }
  return [];
}

// GET /api/roles
router.get("/roles", async (req, res) => {
  try {
    const roles = await db.query("SELECT * FROM role ORDER BY id ASC");
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users
router.get("/users", async (req, res) => {
  try {
    const users = await db.query(`
      SELECT u.id, u.full_name, u.phone_number, u.email, u.role_id, r.name as role_name, r.description as role_description,
             u.status, u.is_master_admin, u.delivery_address, u.created_at, u.updated_at
      FROM "user" u
      LEFT JOIN role r ON u.role_id = r.id
      ORDER BY u.id ASC
    `);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/staff
router.get("/staff", async (req, res) => {
  try {
    const staffList = await getStoredStaff();
    res.json(staffList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/staff
router.post("/staff", async (req, res) => {
  try {
    const { name, role, mobile, password, permissions, status } = req.body;
    if (!name || !mobile || typeof password !== "string" || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: "Name, mobile number, and an 8-128 character password are required." });
    }
    const cleanMobile = String(mobile).replace(/\D/g, "").slice(-10);
    if (cleanMobile.length !== 10) {
      return res.status(400).json({ error: "A valid 10-digit mobile number is required." });
    }

    // Determine role_id
    let roleId = 3;
    const roleLower = String(role || "").toLowerCase();
    if (roleLower.includes("admin")) roleId = 2;
    else if (roleLower.includes("rider") || roleLower.includes("delivery") || roleLower.includes("pilot")) roleId = 4;
    else if (roleLower.includes("support") || roleLower.includes("desk")) roleId = 5;
    else if (roleLower.includes("inventory") || roleLower.includes("stock") || roleLower.includes("manager")) roleId = 3;
    if (roleId === 2 && !canManageAdministrators(req.staff)) {
      return res.status(403).json({ error: "Only an administrator can create or update administrator accounts." });
    }

    // Get next ID or update if existing phone
    const permsJson = JSON.stringify(Array.isArray(permissions) ? permissions : ["orders"]);

    const existing = await db.query('SELECT id, role_id, is_master_admin FROM "user" WHERE phone_number = ?', [cleanMobile]);
    if (existing && existing.length > 0) {
      const existingId = existing[0].id;
      if (existing[0].is_master_admin) {
        return res.status(403).json({ error: "The root administrator cannot be replaced through staff creation." });
      }
      if (Number(existing[0].role_id) === 2 && !canManageAdministrators(req.staff)) {
        return res.status(403).json({ error: "Only an administrator can update another administrator account." });
      }
      await db.execute(
        `UPDATE "user" 
         SET full_name = ?, password_hash = ?, role_id = ?, permissions = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [name.trim(), await hashPassword(password), roleId, permsJson, status || "Active", existingId]
      );

      if (db.savePersistentSnapshot) await db.savePersistentSnapshot();

      return res.json({
        success: true,
        staff: {
          id: existingId,
          name: name.trim(),
          role: role || "Staff Member",
          role_id: roleId,
          mobile: cleanMobile,
          permissions: Array.isArray(permissions) ? permissions : ["orders"],
          status: status || "Active",
          isMasterAdmin: Boolean(existing[0].is_master_admin)
        }
      });
    }

    const maxRow = await db.query('SELECT MAX(id) as max_id FROM "user" WHERE role_id != 1');
    const newId = maxRow && maxRow[0] && maxRow[0].max_id ? Number(maxRow[0].max_id) + 1 : 6;

    await db.execute(
      `INSERT INTO "user" (id, full_name, phone_number, password_hash, role_id, permissions, status, is_master_admin, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [newId, name.trim(), cleanMobile, await hashPassword(password), roleId, permsJson, status || "Active"]
    );

    if (db.savePersistentSnapshot) await db.savePersistentSnapshot();

    const newStaff = {
      id: newId,
      name: name.trim(),
      role: role || "Staff Member",
      role_id: roleId,
      mobile: cleanMobile,
      permissions: Array.isArray(permissions) ? permissions : ["orders"],
      status: status || "Active",
      isMasterAdmin: false
    };

    res.json({ success: true, staff: newStaff });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/staff/:id
router.put("/staff/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updates = req.body;
    const existing = await db.query('SELECT * FROM "user" WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: "Staff member not found." });
    }
    const current = existing[0];
    if (current.is_master_admin && Number(req.staff.id) !== id) {
      return res.status(403).json({ error: "The root administrator can only update their own account." });
    }
    const newName = updates.name ? updates.name.trim() : current.full_name;
    const cleanMobile = updates.mobile ? String(updates.mobile).replace(/\D/g, "").slice(-10) : current.phone_number;
    if (updates.password !== undefined && (typeof updates.password !== "string" || updates.password.length < 8 || updates.password.length > 128)) {
      return res.status(400).json({ error: "Password must be between 8 and 128 characters." });
    }
    const newPasswordHash = updates.password ? await hashPassword(updates.password) : current.password_hash;
    const newStatus = updates.status || current.status;
    const newPerms = updates.permissions ? JSON.stringify(updates.permissions) : current.permissions;

    let newRoleId = current.role_id;
    if (updates.role) {
      const rLower = String(updates.role).toLowerCase();
      if (rLower.includes("admin")) newRoleId = 2;
      else if (rLower.includes("rider") || rLower.includes("delivery") || rLower.includes("pilot")) newRoleId = 4;
      else if (rLower.includes("support") || rLower.includes("desk")) newRoleId = 5;
      else if (rLower.includes("inventory") || rLower.includes("manager") || rLower.includes("stock")) newRoleId = 3;
    }
    if ((Number(current.role_id) === 2 || newRoleId === 2) && !canManageAdministrators(req.staff)) {
      return res.status(403).json({ error: "Only an administrator can create or update administrator accounts." });
    }

    await db.execute(
      `UPDATE "user" 
       SET full_name = ?, phone_number = ?, password_hash = ?, role_id = ?, permissions = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newName, cleanMobile, newPasswordHash, newRoleId, newPerms, newStatus, id]
    );

    if (db.savePersistentSnapshot) await db.savePersistentSnapshot();

    res.json({
      success: true,
      staff: {
        id,
        name: newName,
        role: updates.role || "Staff Member",
        role_id: newRoleId,
        mobile: cleanMobile,
        permissions: updates.permissions || JSON.parse(current.permissions || "[]"),
        status: newStatus,
        isMasterAdmin: Boolean(current.is_master_admin)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/staff/:id
router.delete("/staff/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.query('SELECT * FROM "user" WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: "Staff member not found." });
    }
    if (existing[0].is_master_admin) {
      return res.status(400).json({ error: "Cannot delete Root Super Admin." });
    }
    if (Number(existing[0].role_id) === 2 && !canManageAdministrators(req.staff)) {
      return res.status(403).json({ error: "Only an administrator can delete another administrator account." });
    }
    try {
      await db.execute('UPDATE "order" SET delivery_staff_id = NULL WHERE delivery_staff_id = ?', [id]);
    } catch (e) {}
    await db.execute('DELETE FROM "user" WHERE id = ?', [id]);
    if (db.savePersistentSnapshot) await db.savePersistentSnapshot();
    res.json({ success: true, message: "Staff removed successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
