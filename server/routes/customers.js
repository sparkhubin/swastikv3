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

    // Default seed if completely empty
    if (customerList.length === 0) {
      customerList = [
        { id: 101, name: 'Amit Sharma', phone: '+91 98765 12345', email: 'amit@gmail.com', registeredAt: '2026-01-10', orderCount: 14, totalSpent: 6720, status: 'Active', dob: '1990-07-14', anniversary: '2018-12-25', points: 120, isPrimeActive: true, primeMembershipNo: 'SP-VIP-101-2345' },
        { id: 102, name: 'Pooja Patel', phone: '+91 91234 56789', email: 'pooja.patel@yahoo.com', registeredAt: '2026-02-14', orderCount: 22, totalSpent: 11450, status: 'Active', dob: '1993-05-10', anniversary: '2015-07-14', points: 280, isPrimeActive: true, primeMembershipNo: 'SP-VIP-102-6789' },
        { id: 103, name: 'Vikram Malhotra', phone: '+91 99887 76655', email: 'vikram10@outlook.com', registeredAt: '2026-03-20', orderCount: 8, totalSpent: 4210, status: 'Active', dob: '1994-11-20', anniversary: '2020-05-18', points: 45, isPrimeActive: false },
        { id: 104, name: 'Sanjay Dutt', phone: '+91 98101 23456', email: 'sanjay.dutt@gmail.com', registeredAt: '2026-04-18', orderCount: 1, totalSpent: 850, status: 'Active', dob: '1985-07-14', anniversary: '', points: 100, isPrimeActive: false }
      ];
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

    // Also upsert into "user" table in SQL
    try {
      const userExists = await db.query('SELECT id FROM "user" WHERE phone_number = ?', [phoneDigits.slice(-10)]);
      if (userExists.length > 0) {
        await db.execute(
          'UPDATE "user" SET full_name = ?, delivery_address = ?, updated_at = CURRENT_TIMESTAMP WHERE phone_number = ?',
          [savedCust.name, savedCust.address || "", phoneDigits.slice(-10)]
        );
      } else {
        await db.execute(
          'INSERT INTO "user" (full_name, phone_number, password_hash, role_id, delivery_address) VALUES (?, ?, ?, 1, ?)',
          [savedCust.name, phoneDigits.slice(-10), savedCust.password || "user123", savedCust.address || ""]
        );
      }
    } catch (e) {
      console.warn("Could not sync to 'user' SQL table:", e.message);
    }

    res.json({ success: true, customer: savedCust, totalCustomers: customerList.length });
  } catch (err) {
    console.error("Error in POST /api/customers:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id - Update customer by ID
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

    await saveStoredCustomers(customerList);

    // Sync to "user" table
    if (updated.phone) {
      const phoneDigits = cleanPhone(updated.phone).slice(-10);
      try {
        await db.execute(
          'UPDATE "user" SET full_name = ?, delivery_address = ?, updated_at = CURRENT_TIMESTAMP WHERE phone_number = ?',
          [updated.name, updated.address || "", phoneDigits]
        );
      } catch (e) {}
    }

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
    customerList = customerList.filter(c => Number(c.id) !== custId);
    await saveStoredCustomers(customerList);
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
      customerId: customerId ? Number(customerId) : null,
      name: (name || 'Customer').trim(),
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
