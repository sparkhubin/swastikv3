import express from "express";
import { db } from "../../database/db.js";

const router = express.Router();

// Helper to clean phone numbers
function cleanPhone(ph) {
  if (!ph) return "";
  return String(ph).replace(/[^0-9]/g, "");
}

// Helper to fetch customers from app_settings
async function getStoredCustomers() {
  try {
    const rows = await db.query("SELECT value_text FROM app_settings WHERE key_name = 'swastik_customers'");
    if (rows.length > 0 && rows[0].value_text) {
      const parsed = JSON.parse(rows[0].value_text);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading stored customers:", e);
  }
  return [];
}

// Helper to save customers to app_settings
async function saveStoredCustomers(customers) {
  try {
    const valueString = JSON.stringify(customers);
    const existing = await db.query("SELECT key_name FROM app_settings WHERE key_name = 'swastik_customers'");
    if (existing.length > 0) {
      await db.execute(
        "UPDATE app_settings SET value_text = ?, updated_at = CURRENT_TIMESTAMP WHERE key_name = 'swastik_customers'",
        [valueString]
      );
    } else {
      await db.execute(
        "INSERT INTO app_settings (key_name, value_text) VALUES ('swastik_customers', ?)",
        [valueString]
      );
    }
    return true;
  } catch (e) {
    console.error("Error saving customers to DB:", e);
    return false;
  }
}

// GET /api/customers - Retrieve all customers, merged with orders & users
router.get("/customers", async (req, res) => {
  try {
    let customerList = await getStoredCustomers();

    // Seed from real customer table if empty
    if (customerList.length === 0) {
      try {
        const dbCusts = await db.query('SELECT * FROM customer');
        if (Array.isArray(dbCusts) && dbCusts.length > 0) {
          customerList = dbCusts.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            address: c.address || '',
            status: c.status || 'Active',
            registeredAt: c.created_at ? String(c.created_at).split('T')[0] : '2026-01-10',
            orderCount: 0,
            totalSpent: 0,
            points: 100,
            isPrimeActive: false,
            dob: '',
            anniversary: ''
          }));
        }
      } catch (err) {}
    }

    // Auto-discover customers from order history
    try {
      const orders = await db.query('SELECT * FROM "order" ORDER BY id DESC');
      if (Array.isArray(orders) && orders.length > 0) {
        let changed = false;
        for (const o of orders) {
          const rawPhone = o.customer_phone || "";
          const phoneDigits = cleanPhone(rawPhone);
          if (!phoneDigits || phoneDigits.length < 5) continue;
          
          const rawName = o.customer_name || "Customer";
          if (rawName.toLowerCase().includes("simulated") && customerList.some(c => cleanPhone(c.phone).endsWith(phoneDigits.slice(-10)))) {
            continue;
          }

          const existingIndex = customerList.findIndex(c => cleanPhone(c.phone).endsWith(phoneDigits.slice(-10)));
          if (existingIndex >= 0) {
            // Update order count and stats if needed
            const existing = customerList[existingIndex];
            if (!existing.address && o.shipping_address) {
              existing.address = o.shipping_address;
              changed = true;
            }
            if (!existing.email && o.customer_email) {
              existing.email = o.customer_email;
              changed = true;
            }
            if (rawName && (!existing.name || existing.name.startsWith("Customer "))) {
              existing.name = rawName;
              changed = true;
            }
          } else {
            // Add discovered customer
            const newId = customerList.length > 0 ? Math.max(...customerList.map(c => Number(c.id) || 0)) + 1 : 101;
            const regDate = o.order_date ? String(o.order_date).split('T')[0] : new Date().toISOString().split('T')[0];
            const newCustomer = {
              id: newId,
              name: rawName || `Customer ${phoneDigits.slice(-4)}`,
              phone: rawPhone.startsWith('+') ? rawPhone : (phoneDigits.length === 10 ? `+91 ${phoneDigits}` : rawPhone),
              email: o.customer_email || `${(rawName || 'customer').toLowerCase().replace(/\s+/g, '')}@${process.env.STORE_DOMAIN || 'example.com'}`,
              address: o.shipping_address || "",
              status: 'Active',
              registeredAt: regDate,
              orderCount: 1,
              totalSpent: Number(o.grand_total || o.total_amount || 0),
              points: 100,
              isPrimeActive: false,
              dob: "",
              anniversary: ""
            };
            customerList.push(newCustomer);
            changed = true;
          }
        }
        if (changed) {
          await saveStoredCustomers(customerList);
        }
      }
    } catch (e) {
      console.warn("Could not merge order customers:", e.message);
    }

    res.json(customerList);
  } catch (err) {
    console.error("Error in GET /api/customers:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers - Upsert customer (on signup, order, or admin creation)
router.post("/customers", async (req, res) => {
  try {
    const custData = req.body;
    if (!custData || (!custData.phone && !custData.phoneNumber && !custData.mobile)) {
      return res.status(400).json({ error: "Missing customer mobile/phone number." });
    }

    const rawPhone = custData.phone || custData.phoneNumber || custData.mobile || "";
    const phoneDigits = cleanPhone(rawPhone);
    const formattedPhone = rawPhone.startsWith('+') ? rawPhone : (phoneDigits.length === 10 ? `+91 ${phoneDigits}` : rawPhone);
    const rawName = (custData.name || custData.fullName || `Customer ${phoneDigits.slice(-4)}`).trim();

    let customerList = await getStoredCustomers();
    const existingIndex = customerList.findIndex(c => cleanPhone(c.phone).endsWith(phoneDigits.slice(-10)));

    let savedCust;
    if (existingIndex >= 0) {
      // Update existing record
      const prev = customerList[existingIndex];
      savedCust = {
        ...prev,
        ...custData,
        id: prev.id,
        name: rawName || prev.name,
        phone: formattedPhone || prev.phone,
        email: custData.email !== undefined ? custData.email : prev.email,
        address: custData.address !== undefined ? custData.address : (prev.address || ""),
        points: custData.points !== undefined ? custData.points : (prev.points || 0),
        firstLoginPointsAwarded: custData.firstLoginPointsAwarded !== undefined ? custData.firstLoginPointsAwarded : prev.firstLoginPointsAwarded,
        referralPointsAwarded: custData.referralPointsAwarded !== undefined ? custData.referralPointsAwarded : prev.referralPointsAwarded,
        isPrimeActive: custData.isPrimeActive !== undefined ? Boolean(custData.isPrimeActive) : Boolean(prev.isPrimeActive),
        primeMembershipNo: custData.primeMembershipNo !== undefined ? custData.primeMembershipNo : (prev.primeMembershipNo || ""),
        dob: custData.dob !== undefined ? custData.dob : (prev.dob || ""),
        anniversary: custData.anniversary !== undefined ? custData.anniversary : (prev.anniversary || ""),
        password: custData.password !== undefined ? custData.password : (prev.password || ""),
        image: custData.image !== undefined ? custData.image : (prev.image || ""),
        status: custData.status || prev.status || 'Active',
        orderCount: custData.orderCount !== undefined ? custData.orderCount : (prev.orderCount || 0),
        totalSpent: custData.totalSpent !== undefined ? custData.totalSpent : (prev.totalSpent || 0),
        updatedAt: new Date().toISOString()
      };
      customerList[existingIndex] = savedCust;
    } else {
      // Create new customer
      const newId = customerList.length > 0 ? Math.max(...customerList.map(c => Number(c.id) || 0)) + 1 : 101;
      savedCust = {
        id: newId,
        name: rawName,
        phone: formattedPhone,
        email: custData.email || `${rawName.toLowerCase().replace(/\s+/g, '')}@${process.env.STORE_DOMAIN || 'example.com'}`,
        address: custData.address || "",
        status: custData.status || 'Active',
        points: custData.points !== undefined ? custData.points : 100,
        firstLoginPointsAwarded: custData.firstLoginPointsAwarded !== undefined ? custData.firstLoginPointsAwarded : 100,
        referralPointsAwarded: custData.referralPointsAwarded || 0,
        referredBy: custData.referredBy || "",
        isPrimeActive: Boolean(custData.isPrimeActive),
        primeMembershipNo: custData.primeMembershipNo || "",
        dob: custData.dob || "",
        anniversary: custData.anniversary || "",
        password: custData.password || "",
        image: custData.image || "",
        registeredAt: custData.registeredAt || new Date().toISOString().split('T')[0],
        orderCount: custData.orderCount || 0,
        totalSpent: custData.totalSpent || 0,
        createdAt: new Date().toISOString()
      };
      customerList.unshift(savedCust);
    }

    await saveStoredCustomers(customerList);

    // Also upsert into relational SQL 'customer' table
    try {
      const exCust = await db.query("SELECT id FROM customer WHERE id = ?", [savedCust.id]);
      if (exCust && exCust.length > 0) {
        await db.execute(
          `UPDATE customer SET name = ?, phone = ?, email = ?, address = ?, status = ?, order_count = ?, total_spent = ?, points = ?, is_prime_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [savedCust.name, savedCust.phone, savedCust.email || "", savedCust.address || "", savedCust.status || "Active", savedCust.orderCount || 0, savedCust.totalSpent || 0, savedCust.points || 100, savedCust.isPrimeActive ? 1 : 0, savedCust.id]
        );
      } else {
        await db.execute(
          `INSERT INTO customer (id, name, phone, email, address, status, registered_at, order_count, total_spent, points, is_prime_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [savedCust.id, savedCust.name, savedCust.phone, savedCust.email || "", savedCust.address || "", savedCust.status || "Active", savedCust.registeredAt || new Date().toISOString(), savedCust.orderCount || 0, savedCust.totalSpent || 0, savedCust.points || 100, savedCust.isPrimeActive ? 1 : 0]
        );
      }
    } catch (cErr) {
      console.warn("Notice syncing SQL customer table:", cErr.message);
    }

    // Also upsert into "user" table in SQL
    try {
      const userExists = await db.query('SELECT id FROM "user" WHERE phone_number = ? OR phone_number LIKE ?', [phoneDigits.slice(-10), `%${phoneDigits.slice(-10)}`]);
      if (userExists.length > 0) {
        await db.execute(
          'UPDATE "user" SET full_name = ?, delivery_address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR phone_number LIKE ?',
          [savedCust.name, savedCust.address || "", userExists[0].id, `%${phoneDigits.slice(-10)}`]
        );
      } else {
        await db.execute(
          'INSERT INTO "user" (id, full_name, phone_number, password_hash, role_id, delivery_address) VALUES (?, ?, ?, ?, 1, ?)',
          [savedCust.id, savedCust.name, phoneDigits.slice(-10), savedCust.password || "user123", savedCust.address || ""]
        );
      }
    } catch (e) {
      console.warn("Could not sync to 'user' SQL table:", e.message);
    }

    if (db.savePersistentSnapshot) await db.savePersistentSnapshot();

    res.json({ success: true, customer: savedCust, totalCustomers: customerList.length });
  } catch (err) {
    console.error("Error in POST /api/customers:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id - Update customer by ID and synchronize all linked orders & profile
router.put("/customers/:id", async (req, res) => {
  try {
    const custId = Number(req.params.id);
    const updates = req.body;
    let customerList = await getStoredCustomers();
    
    const index = customerList.findIndex(c => Number(c.id) === custId);
    if (index === -1) {
      return res.status(404).json({ error: "Customer not found." });
    }

    const current = customerList[index];
    const updated = {
      ...current,
      ...updates,
      id: current.id,
      updatedAt: new Date().toISOString()
    };
    customerList[index] = updated;

    // 1. Save to app_settings
    await saveStoredCustomers(customerList);

    // 2. Save/Update in relational SQL 'customer' table
    try {
      const exCust = await db.query("SELECT id FROM customer WHERE id = ?", [custId]);
      if (exCust.length > 0) {
        await db.execute(
          `UPDATE customer SET
            name = ?,
            phone = ?,
            email = ?,
            address = ?,
            status = ?,
            order_count = ?,
            total_spent = ?,
            points = ?,
            is_prime_active = ?,
            prime_membership_no = ?,
            dob = ?,
            anniversary = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [
            updated.name,
            updated.phone,
            updated.email || "",
            updated.address || "",
            updated.status || "Active",
            updated.orderCount || 0,
            updated.totalSpent || 0,
            updated.points || 100,
            updated.isPrimeActive ? 1 : 0,
            updated.primeMembershipNo || "",
            updated.dob || "",
            updated.anniversary || "",
            custId
          ]
        );
      } else {
        await db.execute(
          `INSERT INTO customer (id, name, phone, email, address, status, registered_at, order_count, total_spent, points, is_prime_active, prime_membership_no, dob, anniversary)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            custId,
            updated.name,
            updated.phone,
            updated.email || "",
            updated.address || "",
            updated.status || "Active",
            updated.registeredAt || new Date().toISOString(),
            updated.orderCount || 0,
            updated.totalSpent || 0,
            updated.points || 100,
            updated.isPrimeActive ? 1 : 0,
            updated.primeMembershipNo || "",
            updated.dob || "",
            updated.anniversary || ""
          ]
        );
      }
    } catch (custSqlErr) {
      console.warn("Notice updating SQL customer table:", custSqlErr.message);
    }

    const cleanP = cleanPhone(updated.phone || current.phone).slice(-10);

    // 3. Sync to "user" table
    if (cleanP) {
      try {
        await db.execute(
          'UPDATE "user" SET full_name = ?, delivery_address = ?, updated_at = CURRENT_TIMESTAMP WHERE phone_number LIKE ?',
          [updated.name, updated.address || "", `%${cleanP}`]
        );
      } catch (e) {
        console.warn("Notice updating SQL user table:", e.message);
      }
    }

    // 4. CRITICAL: Relational Update for ALL historical orders in "order" table!
    // Updates customer_id, user_id, and customer_name so orders always link by ID!
    try {
      if (cleanP) {
        await db.execute(
          `UPDATE "order" SET 
            customer_name = ?, 
            customer_phone = ?, 
            customer_email = ?, 
            customer_id = ?,
            user_id = ?, 
            updated_at = CURRENT_TIMESTAMP 
          WHERE customer_id = ? 
             OR user_id = ? 
             OR (customer_phone IS NOT NULL AND (
                 REPLACE(REPLACE(REPLACE(customer_phone, ' ', ''), '-', ''), '+', '') LIKE ?
                 OR customer_phone = ?
             ))`,
          [
            updated.name,
            updated.phone || current.phone,
            updated.email || current.email || "",
            custId,
            custId,
            custId,
            custId,
            `%${cleanP}%`,
            updated.phone || current.phone
          ]
        );
        console.log(`✓ Synchronized Customer ID ${custId} name ("${updated.name}") across all orders.`);
      } else {
        await db.execute(
          `UPDATE "order" SET 
            customer_name = ?, 
            customer_id = ?,
            user_id = ?, 
            updated_at = CURRENT_TIMESTAMP 
          WHERE customer_id = ? OR user_id = ?`,
          [updated.name, custId, custId, custId, custId]
        );
      }
    } catch (orderSyncErr) {
      console.warn("Notice updating order customer names:", orderSyncErr.message);
    }

    // 5. Update disk snapshot for zero-data-loss deployments
    try {
      await db.savePersistentSnapshot();
    } catch (snapErr) {}

    res.json({ success: true, customer: updated });
  } catch (err) {
    console.error("Error in PUT /api/customers/:id:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customers/:id - Delete customer by ID
router.delete("/customers/:id", async (req, res) => {
  try {
    const custId = Number(req.params.id);
    let customerList = await getStoredCustomers();
    const targetCust = customerList.find(c => Number(c.id) === custId);
    customerList = customerList.filter(c => Number(c.id) !== custId);
    await saveStoredCustomers(customerList);

    try {
      await db.execute("DELETE FROM customer WHERE id = ?", [custId]);
      await db.execute('DELETE FROM "user" WHERE id = ? AND role_id = 1', [custId]);
      if (targetCust && targetCust.phone) {
        const cleanDigits = cleanPhone(targetCust.phone);
        if (cleanDigits.length >= 10) {
          const ten = cleanDigits.slice(-10);
          await db.execute('DELETE FROM "user" WHERE phone_number LIKE ? AND role_id = 1', [`%${ten}`]);
        }
      }
    } catch (sqlErr) {
      console.warn("Notice deleting from SQL customer/user tables:", sqlErr.message);
    }

    if (db.savePersistentSnapshot) await db.savePersistentSnapshot();

    res.json({ success: true, message: "Customer deleted successfully." });
  } catch (err) {
    console.error("Error in DELETE /api/customers/:id:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DATA DELETION REQUESTS (GDPR / PRIVACY)
// ==========================================

async function getStoredDeletionRequests() {
  try {
    const rows = await db.query("SELECT value_text FROM app_settings WHERE key_name = 'swastik_data_deletion_requests'");
    if (rows.length > 0 && rows[0].value_text) {
      const parsed = JSON.parse(rows[0].value_text);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading data deletion requests:", e);
  }
  return [];
}

async function saveStoredDeletionRequests(requests) {
  try {
    const valueString = JSON.stringify(requests);
    const existing = await db.query("SELECT key_name FROM app_settings WHERE key_name = 'swastik_data_deletion_requests'");
    if (existing.length > 0) {
      await db.execute(
        "UPDATE app_settings SET value_text = ?, updated_at = CURRENT_TIMESTAMP WHERE key_name = 'swastik_data_deletion_requests'",
        [valueString]
      );
    } else {
      await db.execute(
        "INSERT INTO app_settings (key_name, value_text) VALUES ('swastik_data_deletion_requests', ?)",
        [valueString]
      );
    }
    return true;
  } catch (e) {
    console.error("Error saving data deletion requests:", e);
    return false;
  }
}

// GET /api/data-deletion-requests - Retrieve all requests
router.get("/data-deletion-requests", async (req, res) => {
  try {
    const requests = await getStoredDeletionRequests();
    // Dynamically resolve real customer name and details from customer table
    for (const r of requests) {
      try {
        let matched = null;
        if (r.customerId) {
          const rows = await db.query('SELECT id, name, phone, email FROM customer WHERE id = ? LIMIT 1', [r.customerId]);
          if (rows && rows.length > 0) matched = rows[0];
        }
        if (!matched && r.phone) {
          const cleanP = cleanPhone(r.phone);
          if (cleanP) {
            const rows = await db.query(
              "SELECT id, name, phone, email FROM customer WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ? OR phone = ? LIMIT 1",
              [`%${cleanP.slice(-10)}%`, r.phone]
            );
            if (rows && rows.length > 0) matched = rows[0];
          }
        }
        if (!matched && r.email) {
          const rows = await db.query("SELECT id, name, phone, email FROM customer WHERE LOWER(email) = ? LIMIT 1", [r.email.toLowerCase().trim()]);
          if (rows && rows.length > 0) matched = rows[0];
        }

        if (matched) {
          if (!r.customerId) r.customerId = Number(matched.id);
          // If request name is empty, generic, or mismatched with real customer
          if (!r.name || r.name === 'Customer' || r.name === 'Guest User' || r.name === 'Not provided' || (r.name === 'Sanjay Dutt' && matched.name !== 'Sanjay Dutt')) {
            r.name = matched.name;
          }
          if (!r.phone) r.phone = matched.phone;
          if (!r.email) r.email = matched.email;
        }
      } catch (e) {}
    }
    res.json(requests);
  } catch (err) {
    console.error("Error in GET /api/data-deletion-requests:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/data-deletion-requests - User submits deletion request
router.post("/data-deletion-requests", async (req, res) => {
  try {
    const { customerId, name, phone, email, reason, notes } = req.body || {};
    if (!phone && !email) {
      return res.status(400).json({ error: "Phone number or email is required to submit a data deletion request." });
    }

    const requests = await getStoredDeletionRequests();
    const cleanPhoneDigits = cleanPhone(phone);

    // Look up real customer from database to ensure genuine name and id
    let resolvedCustId = customerId ? Number(customerId) : null;
    let resolvedName = (name || '').trim();

    try {
      let matchedCust = null;
      if (resolvedCustId) {
        const rows = await db.query('SELECT id, name, phone, email FROM customer WHERE id = ? LIMIT 1', [resolvedCustId]);
        if (rows && rows.length > 0) matchedCust = rows[0];
      }
      if (!matchedCust && cleanPhoneDigits) {
        const rows = await db.query(
          "SELECT id, name, phone, email FROM customer WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ? OR phone = ? LIMIT 1",
          [`%${cleanPhoneDigits.slice(-10)}%`, phone]
        );
        if (rows && rows.length > 0) matchedCust = rows[0];
      }
      if (!matchedCust && email) {
        const rows = await db.query("SELECT id, name, phone, email FROM customer WHERE LOWER(email) = ? LIMIT 1", [email.toLowerCase().trim()]);
        if (rows && rows.length > 0) matchedCust = rows[0];
      }

      if (matchedCust) {
        resolvedCustId = Number(matchedCust.id);
        if (!resolvedName || resolvedName === 'Customer' || resolvedName === 'Guest User' || resolvedName === 'Not provided') {
          resolvedName = matchedCust.name;
        }
      }
    } catch (e) {}

    if (!resolvedName) {
      resolvedName = 'Customer';
    }

    // Check if there is already an active pending request for this phone/email
    const existingPending = requests.find(r => 
      r.status === 'Pending' && (
        (cleanPhoneDigits && cleanPhone(r.phone).endsWith(cleanPhoneDigits.slice(-10))) ||
        (email && r.email && r.email.toLowerCase() === email.toLowerCase())
      )
    );

    if (existingPending) {
      return res.json({ 
        success: true, 
        alreadySubmitted: true,
        message: "You already have a pending data deletion request under review.",
        request: existingPending 
      });
    }

    const newRequestId = `DEL-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const newRequest = {
      id: newRequestId,
      customerId: resolvedCustId,
      name: resolvedName,
      phone: phone || '',
      email: (email || '').trim(),
      reason: reason || 'Account & Personal Data Erasure',
      notes: notes || '',
      status: 'Pending', // 'Pending' | 'Approved & Deleted' | 'Rejected'
      requestedAt: new Date().toISOString(),
      processedAt: null,
      adminNotes: ''
    };

    requests.unshift(newRequest);
    await saveStoredDeletionRequests(requests);

    // Create an in-app notification for admin
    try {
      await db.execute(
        `INSERT INTO notification (recipient_role, title_en, title_hi, message_en, message_hi, type)
         VALUES ('admin', ?, ?, ?, ?, 'data_deletion_request')`,
        [
          `New Data Deletion Request (${newRequestId})`,
          `नया डेटा डिलीट अनुरोध (${newRequestId})`,
          `Customer ${newRequest.name} (${newRequest.phone}) has requested permanent data deletion. Reason: ${newRequest.reason}`,
          `ग्राहक ${newRequest.name} (${newRequest.phone}) ने डेटा हटाने का अनुरोध किया है। कारण: ${newRequest.reason}`
        ]
      );
    } catch (notifErr) {
      console.warn("Could not create admin notification for deletion request:", notifErr.message);
    }

    res.json({ success: true, request: newRequest });
  } catch (err) {
    console.error("Error in POST /api/data-deletion-requests:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/data-deletion-requests/:id/approve - Admin approves & permanently deletes customer data
router.post("/data-deletion-requests/:id/approve", async (req, res) => {
  try {
    const requestId = req.params.id;
    const { adminNotes } = req.body || {};
    const requests = await getStoredDeletionRequests();

    const reqIndex = requests.findIndex(r => String(r.id) === String(requestId));
    if (reqIndex === -1) {
      return res.status(404).json({ error: "Deletion request not found." });
    }

    const targetReq = requests[reqIndex];
    const targetPhoneDigits = cleanPhone(targetReq.phone);

    // 1. Remove from stored customers list
    let customerList = await getStoredCustomers();
    const initialCustCount = customerList.length;
    customerList = customerList.filter(c => {
      if (targetReq.customerId && Number(c.id) === Number(targetReq.customerId)) return false;
      if (targetPhoneDigits && cleanPhone(c.phone).endsWith(targetPhoneDigits.slice(-10))) return false;
      if (targetReq.email && c.email && c.email.toLowerCase() === targetReq.email.toLowerCase()) return false;
      return true;
    });

    if (customerList.length !== initialCustCount) {
      await saveStoredCustomers(customerList);
    }

    // 2. Remove / Anonymize from SQL 'user' table
    if (targetPhoneDigits && targetPhoneDigits.length >= 10) {
      try {
        await db.execute('DELETE FROM "user" WHERE phone_number = ?', [targetPhoneDigits.slice(-10)]);
      } catch (userErr) {
        console.warn("Could not delete from user table:", userErr.message);
      }

      // 3. Anonymize historical orders for privacy/GDPR while keeping billing totals intact
      try {
        await db.execute(
          `UPDATE "order" 
           SET customer_name = '[Data Deleted under Privacy Request]',
               customer_phone = '0000000000',
               customer_email = 'deleted@swastik.local',
               shipping_address = '[Address Removed as per Data Deletion Request]'
           WHERE customer_phone LIKE ?`,
          [`%${targetPhoneDigits.slice(-10)}%`]
        );
      } catch (orderErr) {
        console.warn("Could not anonymize orders:", orderErr.message);
      }
    }

    // 4. Update request status
    targetReq.status = 'Approved & Deleted';
    targetReq.processedAt = new Date().toISOString();
    targetReq.adminNotes = adminNotes || 'Approved by Admin: Customer data permanently deleted and orders anonymized.';
    requests[reqIndex] = targetReq;
    await saveStoredDeletionRequests(requests);

    res.json({ 
      success: true, 
      message: `Data deletion request ${requestId} approved and customer data permanently purged.`,
      request: targetReq 
    });
  } catch (err) {
    console.error("Error in POST /api/data-deletion-requests/:id/approve:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/data-deletion-requests/:id/reject - Admin rejects request
router.post("/data-deletion-requests/:id/reject", async (req, res) => {
  try {
    const requestId = req.params.id;
    const { adminNotes } = req.body || {};
    const requests = await getStoredDeletionRequests();

    const reqIndex = requests.findIndex(r => String(r.id) === String(requestId));
    if (reqIndex === -1) {
      return res.status(404).json({ error: "Deletion request not found." });
    }

    const targetReq = requests[reqIndex];
    targetReq.status = 'Rejected';
    targetReq.processedAt = new Date().toISOString();
    targetReq.adminNotes = adminNotes || 'Request rejected by Admin.';
    requests[reqIndex] = targetReq;
    await saveStoredDeletionRequests(requests);

    res.json({ 
      success: true, 
      message: `Data deletion request ${requestId} rejected.`,
      request: targetReq 
    });
  } catch (err) {
    console.error("Error in POST /api/data-deletion-requests/:id/reject:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/data-deletion-requests/:id - Delete record of the request
router.delete("/data-deletion-requests/:id", async (req, res) => {
  try {
    const requestId = req.params.id;
    let requests = await getStoredDeletionRequests();
    requests = requests.filter(r => String(r.id) !== String(requestId));
    await saveStoredDeletionRequests(requests);
    res.json({ success: true, message: "Request record deleted successfully." });
  } catch (err) {
    console.error("Error in DELETE /api/data-deletion-requests/:id:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
