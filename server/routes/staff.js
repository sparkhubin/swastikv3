import express from "express";
import { db } from "../../database/db.js";

const router = express.Router();

const initialStaff = [
  {
    id: 1,
    name: "Balram Patidar",
    role: "Store Super Admin",
    role_id: 2,
    mobile: "9999999999",
    password: "admin",
    permissions: [
      "dashboard", "products", "categories", "orders", "inventory", 
      "delivery", "customers", "whatsapp", "settings", "pos", "staff", "reports"
    ],
    status: "Active",
    isMasterAdmin: true
  },
  {
    id: 2,
    name: "Ramesh Sharma",
    role: "Inventory & Stock Incharge",
    role_id: 3,
    mobile: "9812345670",
    password: "staff",
    permissions: ["products", "categories", "inventory"],
    status: "Active"
  },
  {
    id: 3,
    name: "Pradeep Kumar",
    role: "Senior Delivery Rider",
    role_id: 4,
    mobile: "9810120299",
    password: "staff",
    permissions: ["delivery", "orders"],
    status: "Active"
  },
  {
    id: 4,
    name: "Suresh Mehra",
    role: "Delivery Rider",
    role_id: 4,
    mobile: "9811122334",
    password: "staff",
    permissions: ["delivery"],
    status: "Active"
  },
  {
    id: 5,
    name: "Anita Gupta",
    role: "Customer Support & Orders Desk",
    role_id: 5,
    mobile: "9823456789",
    password: "staff",
    permissions: ["orders", "customers", "whatsapp"],
    status: "Active"
  }
];

async function getStoredStaff() {
  try {
    const rows = await db.query(`
      SELECT u.id, u.full_name as name, u.phone_number as mobile, u.password_hash as password,
             u.role_id, r.name as role_code, r.description as role_desc,
             u.permissions, u.status, u.is_master_admin as isMasterAdmin
      FROM "user" u
      LEFT JOIN role r ON u.role_id = r.id
      WHERE u.role_id != 1
      ORDER BY u.id ASC
    `);
    if (rows && rows.length > 0) {
      return rows.map(u => {
        let perms = [];
        try {
          perms = typeof u.permissions === "string" ? JSON.parse(u.permissions || "[]") : (u.permissions || []);
        } catch (e) {
          perms = [];
        }
        let roleTitle = u.role_desc || "Staff Member";
        if (u.role_id === 2) roleTitle = "Store Super Admin";
        else if (u.role_id === 3) roleTitle = "Inventory & Stock Incharge";
        else if (u.role_id === 4) roleTitle = u.id === 3 ? "Senior Delivery Rider" : "Delivery Rider";
        else if (u.role_id === 5) roleTitle = "Customer Support & Orders Desk";

        return {
          id: Number(u.id),
          name: u.name,
          role: roleTitle,
          role_id: Number(u.role_id),
          role_code: u.role_code || "staff",
          mobile: u.mobile,
          password: u.password,
          permissions: perms,
          status: u.status || "Active",
          isMasterAdmin: Boolean(u.isMasterAdmin)
        };
      });
    }
  } catch (e) {
    console.error("Error reading staff from user table:", e);
  }
  return initialStaff;
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
             u.status, u.is_master_admin, u.order_count, u.total_spent, u.points, u.is_prime_active, u.created_at
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
    if (!name || !mobile) {
      return res.status(400).json({ error: "Name and Mobile number are required." });
    }
    const cleanMobile = String(mobile).replace(/\D/g, "").slice(-10);

    // Determine role_id
    let roleId = 3;
    const roleLower = String(role || "").toLowerCase();
    if (roleLower.includes("admin")) roleId = 2;
    else if (roleLower.includes("rider") || roleLower.includes("delivery") || roleLower.includes("pilot")) roleId = 4;
    else if (roleLower.includes("support") || roleLower.includes("desk")) roleId = 5;
    else if (roleLower.includes("inventory") || roleLower.includes("stock") || roleLower.includes("manager")) roleId = 3;

    // Get next ID or update if existing phone
    const permsJson = JSON.stringify(Array.isArray(permissions) ? permissions : ["orders"]);

    const existing = await db.query('SELECT id, is_master_admin FROM "user" WHERE phone_number = ?', [cleanMobile]);
    if (existing && existing.length > 0) {
      const existingId = existing[0].id;
      await db.execute(
        `UPDATE "user" 
         SET full_name = ?, password_hash = ?, role_id = ?, permissions = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [name.trim(), password || "staff123", roleId, permsJson, status || "Active", existingId]
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
          password: password || "staff123",
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
      [newId, name.trim(), cleanMobile, password || "staff123", roleId, permsJson, status || "Active"]
    );

    if (db.savePersistentSnapshot) await db.savePersistentSnapshot();

    const newStaff = {
      id: newId,
      name: name.trim(),
      role: role || "Staff Member",
      role_id: roleId,
      mobile: cleanMobile,
      password: password || "staff123",
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
    const newName = updates.name ? updates.name.trim() : current.full_name;
    const cleanMobile = updates.mobile ? String(updates.mobile).replace(/\D/g, "").slice(-10) : current.phone_number;
    const newPassword = updates.password || current.password_hash;
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

    await db.execute(
      `UPDATE "user" 
       SET full_name = ?, phone_number = ?, password_hash = ?, role_id = ?, permissions = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newName, cleanMobile, newPassword, newRoleId, newPerms, newStatus, id]
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
        password: newPassword,
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
    await db.execute('DELETE FROM "user" WHERE id = ?', [id]);
    if (db.savePersistentSnapshot) await db.savePersistentSnapshot();
    res.json({ success: true, message: "Staff removed successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
