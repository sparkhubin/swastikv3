import pg from "pg";
const { Pool } = pg;
import sqlite3 from "sqlite3";
import mysql from "mysql2/promise";
import path from "path";
import fs from "fs";

let pgPool = null;
let sqliteDb = null;
let mysqlPool = null;

// Determine Primary Database Driver
const isPostgres = !!process.env.DATABASE_URL;
const isMySQLConfigured = process.env.DB_TYPE === "mysql" || !!process.env.MYSQL_DATABASE || !!process.env.MYSQL_HOST;

export const db = {
  isPostgres,
  isMySQL: false,
  isDualSyncEnabled: process.env.MYSQL_SYNC_ENABLED === "true" || true, // Sync to backup SQLite by default if secondary exists

  async init() {
    // 1. Check if MySQL is configured
    if (isMySQLConfigured && !process.env.DATABASE_URL) {
      console.log("🔌 Connecting to MySQL Database Engine...");
      try {
        mysqlPool = mysql.createPool({
          host: process.env.MYSQL_HOST || "localhost",
          port: Number(process.env.MYSQL_PORT || 3306),
          user: process.env.MYSQL_USER || "root",
          password: process.env.MYSQL_PASSWORD || "",
          database: process.env.MYSQL_DATABASE || process.env.DB_NAME || "swastik_supermarket",
          waitForConnections: true,
          connectionLimit: 15,
          queueLimit: 0,
          connectTimeout: 4000
        });

        // Test connection
        const conn = await mysqlPool.getConnection();
        console.log("✓ MySQL Database connected successfully!");
        conn.release();
        this.isMySQL = true;
        this.isPostgres = false;

        // Also initialize local SQLite as background backup/replica
        this.initSQLite(true);
      } catch (err) {
        console.log(`ℹ️ MySQL connection failed (${err.message}). Falling back to local SQLite database...`);
        this.isMySQL = false;
        mysqlPool = null;
        this.initSQLite();
      }
    } 
    // 2. Check if PostgreSQL (DATABASE_URL) is configured
    else if (this.isPostgres) {
      console.log("🔌 Connecting to PostgreSQL Database...");
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000
      });
      
      try {
        const client = await pgPool.connect();
        console.log("✓ PostgreSQL Database connected successfully!");
        client.release();
        // Also init SQLite as backup
        this.initSQLite(true);
      } catch (err) {
        console.log("ℹ️ Info: PostgreSQL was not reachable (" + err.message + "). Falling back to local SQLite database...");
        this.isPostgres = false;
        pgPool = null;
        this.initSQLite();
      }
    } 
    // 3. Default to SQLite
    else {
      this.initSQLite();
    }

    // Initialize Schema on active databases
    await this.setupSchema();
  },

  initSQLite(isBackupMode = false) {
    if (!sqliteDb) {
      const dbPath = path.join(process.cwd(), "swastik_local.db");
      if (!isBackupMode) {
        console.log(`🔌 Connecting to local SQLite Database at: ${dbPath}`);
      } else {
        console.log(`💾 Connected local SQLite sync mirror at: ${dbPath}`);
      }
      sqliteDb = new sqlite3.Database(dbPath);
      if (!isBackupMode) {
        console.log("✓ SQLite Database connected successfully!");
      }
    }
  },

  // Read Queries (Read from Primary MySQL / Postgres / SQLite)
  async query(sql, params = []) {
    // 1. MySQL Handler
    if (this.isMySQL && mysqlPool) {
      try {
        // Replace Postgres-style or handle standard '?'
        const formattedSql = sql.replace(/"order"/g, "`order`").replace(/"user"/g, "`user`");
        const [rows] = await mysqlPool.execute(formattedSql, params);
        return Array.isArray(rows) ? rows : [];
      } catch (err) {
        console.error(`MySQL Query Error during: ${sql}`, err.message);
        // Fallback to SQLite if query fails
        if (sqliteDb) {
          return this.querySQLite(sql, params);
        }
        throw err;
      }
    }

    // 2. Postgres Handler
    if (this.isPostgres && pgPool) {
      let index = 1;
      const formattedSql = sql.replace(/\?/g, () => `$${index++}`);
      const res = await pgPool.query(formattedSql, params);
      return res.rows;
    }

    // 3. SQLite Handler
    if (sqliteDb) {
      return this.querySQLite(sql, params);
    }

    throw new Error("Database not initialized");
  },

  querySQLite(sql, params = []) {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) {
          console.error(`SQLite Error during: ${sql}`, err.message);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  // Write Execution with Dual-Write Sync Engine
  async execute(sql, params = [], quiet = false) {
    let result = { lastID: null, changes: 0 };
    let primarySuccess = false;

    // 1. Execute on MySQL if active
    if (this.isMySQL && mysqlPool) {
      try {
        const formattedSql = sql.replace(/"order"/g, "`order`").replace(/"user"/g, "`user`");
        const [res] = await mysqlPool.execute(formattedSql, params);
        result = { lastID: res.insertId, changes: res.affectedRows };
        primarySuccess = true;
      } catch (err) {
        if (!quiet) {
          console.error(`MySQL Execute Error during: ${sql}`, err.message);
        }
        if (!sqliteDb) throw err;
      }
    } 
    // 2. Execute on PostgreSQL if active
    else if (this.isPostgres && pgPool) {
      try {
        let index = 1;
        const formattedSql = sql.replace(/\?/g, () => `$${index++}`);
        const res = await pgPool.query(formattedSql, params);
        result = { lastID: null, changes: res.rowCount };
        primarySuccess = true;
      } catch (err) {
        if (!quiet) {
          console.error(`PostgreSQL Execute Error during: ${sql}`, err.message);
        }
        if (!sqliteDb) throw err;
      }
    }

    // 3. Dual-Write Sync to SQLite (or Primary SQLite if no remote DB)
    if (sqliteDb) {
      try {
        const sqliteResult = await new Promise((resolve, reject) => {
          // Standardize SQL for SQLite
          const cleanSql = sql.replace(/`order`/g, '"order"').replace(/`user`/g, '"user"');
          sqliteDb.run(cleanSql, params, function (err) {
            if (err) {
              if (!quiet && !primarySuccess) {
                console.error(`SQLite Error during: ${cleanSql}`, err.message);
              }
              reject(err);
            } else {
              resolve({ lastID: this.lastID, changes: this.changes });
            }
          });
        });

        if (!primarySuccess) {
          result = sqliteResult;
        }
      } catch (sqliteErr) {
        if (!primarySuccess) throw sqliteErr;
      }
    }

    return result;
  },

  async setupSchema() {
    const isPg = this.isPostgres;
    const isMy = this.isMySQL;

    let serialType = "INTEGER PRIMARY KEY AUTOINCREMENT";
    if (isPg) serialType = "SERIAL PRIMARY KEY";
    if (isMy) serialType = "INT AUTO_INCREMENT PRIMARY KEY";

    const textType = "TEXT";
    const booleanType = isPg ? "BOOLEAN" : "INT";
    const numericType = isPg ? "DECIMAL(10,2)" : (isMy ? "DECIMAL(10,2)" : "REAL");

    const orderTableName = isMy ? "`order`" : '"order"';
    const userTableName = isMy ? "`user`" : '"user"';

    const queries = [
      // 1. Role Table
      `CREATE TABLE IF NOT EXISTS role (
        id ${serialType},
        name VARCHAR(50) NOT NULL UNIQUE,
        description ${textType},
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      // 2. User Table
      `CREATE TABLE IF NOT EXISTS ${userTableName} (
        id ${serialType},
        full_name VARCHAR(150) NOT NULL,
        phone_number VARCHAR(20) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role_id INT DEFAULT 1,
        delivery_address ${textType},
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      // 3. Product Table
      `CREATE TABLE IF NOT EXISTS product (
        id ${serialType},
        code VARCHAR(100),
        name_en VARCHAR(255) NOT NULL,
        name_hi VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        sub_en VARCHAR(255),
        sub_hi VARCHAR(255),
        price ${numericType} NOT NULL,
        original_price ${numericType},
        discount_tag VARCHAR(100),
        image_url ${textType} NOT NULL,
        stock_count INT DEFAULT 100,
        unit VARCHAR(255),
        unit_prices ${textType},
        pack_en VARCHAR(100),
        pack_hi VARCHAR(100),
        gst_percent ${numericType} DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      // 4. Partner Table
      `CREATE TABLE IF NOT EXISTS partner (
        id ${serialType},
        name VARCHAR(255) NOT NULL,
        photo ${textType},
        designation VARCHAR(255) NOT NULL,
        about ${textType} NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      // 5. Review Table
      `CREATE TABLE IF NOT EXISTS review (
        id ${serialType},
        author_name VARCHAR(150) NOT NULL,
        rating INT NOT NULL,
        comment_en ${textType} NOT NULL,
        comment_hi ${textType},
        avatar_bg VARCHAR(100) DEFAULT 'from-cyan-400 to-blue-500',
        owner_response ${textType},
        date_label VARCHAR(50) DEFAULT 'Just now',
        is_approved ${booleanType} DEFAULT ${isPg ? 'TRUE' : 1},
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      // 6. Order Table
      `CREATE TABLE IF NOT EXISTS ${orderTableName} (
        id VARCHAR(50) PRIMARY KEY,
        customer_id INT,
        user_id INT,
        order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active ${booleanType} DEFAULT ${isPg ? 'TRUE' : 1},
        step_level INT DEFAULT 0,
        status_label VARCHAR(100) DEFAULT 'Confirmed',
        subtotal ${numericType} NOT NULL,
        delivery_fee ${numericType} DEFAULT 0.0,
        gst_amount ${numericType} NOT NULL,
        grand_total ${numericType} NOT NULL,
        delivery_partner_name VARCHAR(255),
        delivery_partner_phone VARCHAR(30),
        dispatch_hub VARCHAR(150),
        eta_status VARCHAR(100),
        shipping_address ${textType} NOT NULL,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(30),
        customer_email VARCHAR(255),
        is_marg_bill ${booleanType} DEFAULT ${isPg ? 'FALSE' : 0},
        points_earned INT DEFAULT 0,
        pdf_url ${textType},
        referral_discount ${numericType} DEFAULT 0.0,
        applied_points INT DEFAULT 0,
        coupon_discount ${numericType} DEFAULT 0.0,
        coupon_code VARCHAR(100) DEFAULT '',
        celebration_discount ${numericType} DEFAULT 0.0,
        celebration_offer_name VARCHAR(255) DEFAULT '',
        payment_method VARCHAR(50) DEFAULT 'COD',
        payment_status VARCHAR(50) DEFAULT 'UNPAID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      // 7. Order Item Table
      `CREATE TABLE IF NOT EXISTS order_item (
        id ${serialType},
        order_id VARCHAR(50) NOT NULL,
        product_id INT,
        name_en VARCHAR(255) NOT NULL,
        name_hi VARCHAR(255) NOT NULL,
        price ${numericType} NOT NULL,
        qty INT NOT NULL,
        weight_label VARCHAR(50) NOT NULL
      );`,

      // 8. Payment Settings Table
      `CREATE TABLE IF NOT EXISTS payment_settings (
        id ${serialType},
        enabled ${booleanType} DEFAULT ${isPg ? 'TRUE' : 1},
        app_id VARCHAR(255) DEFAULT '',
        secret_key VARCHAR(255) DEFAULT '',
        environment VARCHAR(50) DEFAULT 'TEST',
        razorpay_enabled ${booleanType} DEFAULT ${isPg ? 'TRUE' : 1},
        razorpay_key_id VARCHAR(255) DEFAULT '',
        razorpay_key_secret VARCHAR(255) DEFAULT '',
        active_gateway VARCHAR(50) DEFAULT 'RAZORPAY',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      // 9. MARG Settings Table
      `CREATE TABLE IF NOT EXISTS marg_settings (
        id ${serialType},
        api_token VARCHAR(255) DEFAULT '',
        points_ratio ${numericType} DEFAULT 10.0,
        auto_notify_whatsapp ${booleanType} DEFAULT ${isPg ? 'TRUE' : 1},
        simulate_delay INT DEFAULT 500,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      // 10. MARG Log Table
      `CREATE TABLE IF NOT EXISTS marg_log (
        id ${serialType},
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        type VARCHAR(50) NOT NULL,
        message ${textType} NOT NULL,
        payload ${textType}
      );`,

      // 11. Generic App Settings Table (Key-Value)
      `CREATE TABLE IF NOT EXISTS app_settings (
        key_name VARCHAR(100) PRIMARY KEY,
        value_text ${textType},
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      // 12. In-App Notifications Table
      `CREATE TABLE IF NOT EXISTS notification (
        id ${serialType},
        recipient_role VARCHAR(50) NOT NULL,
        recipient_phone VARCHAR(50) DEFAULT '',
        order_id VARCHAR(50) DEFAULT '',
        title_en VARCHAR(255) NOT NULL,
        title_hi VARCHAR(255) DEFAULT '',
        message_en ${textType} NOT NULL,
        message_hi ${textType} DEFAULT '',
        type VARCHAR(50) DEFAULT 'order_update',
        is_read ${booleanType} DEFAULT ${isPg ? 'FALSE' : 0},
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      // 13. Customer Table (Relational ID Mapping)
      `CREATE TABLE IF NOT EXISTS customer (
        id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255) DEFAULT '',
        address ${textType},
        status VARCHAR(50) DEFAULT 'Active',
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        order_count INT DEFAULT 0,
        total_spent ${numericType} DEFAULT 0,
        points INT DEFAULT 100,
        is_prime_active ${booleanType} DEFAULT ${isPg ? 'FALSE' : 0},
        prime_membership_no VARCHAR(100) DEFAULT '',
        dob VARCHAR(50) DEFAULT '',
        anniversary VARCHAR(50) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      // 14. WhatsApp Settings Table
      `CREATE TABLE IF NOT EXISTS whatsapp_settings (
        id INT PRIMARY KEY DEFAULT 1,
        meta_phone_number_id VARCHAR(255) DEFAULT '',
        meta_access_token ${textType},
        meta_business_account_id VARCHAR(255) DEFAULT '',
        meta_template_name VARCHAR(100) DEFAULT 'reference_no',
        twilio_account_sid VARCHAR(255) DEFAULT '',
        twilio_auth_token VARCHAR(255) DEFAULT '',
        twilio_whatsapp_from VARCHAR(50) DEFAULT '+14155238886',
        enabled ${booleanType} DEFAULT ${isPg ? 'TRUE' : 1},
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`
    ];

    for (const q of queries) {
      try {
        await this.execute(q, [], true);
      } catch (err) {
        console.error("Schema init notice:", err.message);
      }
    }

    // Auto-migrate schema columns across all active engines
    await this.migrateSchema();

    // Seed default roles if not present
    try {
      const roles = await this.query("SELECT * FROM role");
      if (roles.length === 0) {
        console.log("🌱 Seeding default roles into the Database...");
        await this.execute("INSERT INTO role (name, description) VALUES (?, ?)", ["user", "Standard Customer Account"]);
        await this.execute("INSERT INTO role (name, description) VALUES (?, ?)", ["admin", "Administrator Dashboard Account"]);
      }
    } catch (e) {}

    // Seed default payment settings if not present
    try {
      const pSet = await this.query("SELECT * FROM payment_settings");
      if (pSet.length === 0) {
        console.log("🌱 Seeding default payment settings into Database...");
        await this.execute(
          "INSERT INTO payment_settings (id, enabled, app_id, secret_key, environment) VALUES (?, ?, ?, ?, ?)",
          [1, 1, "", "", "TEST"]
        );
      }
    } catch (e) {}

    // Seed default marg settings if not present
    try {
      const mSet = await this.query("SELECT * FROM marg_settings");
      if (mSet.length === 0) {
        console.log("🌱 Seeding default MARG settings into Database...");
        await this.execute(
          "INSERT INTO marg_settings (id, api_token, points_ratio, auto_notify_whatsapp, simulate_delay) VALUES (?, ?, ?, ?, ?)",
          [1, "SWASTIK_MARG_SECURE_TOKEN_2026", 10.0, 1, 500]
        );
      }
    } catch (e) {}

    // Synchronize customer ID mapping and orders
    await this.syncCustomerTableAndOrders();

    // Rehydrate database from persistent store if freshly deployed
    await this.rehydrateFromPersistentSnapshot();
  },

  // Auto-migration to ensure all tables have required columns across SQLite, MySQL, and PostgreSQL
  async migrateSchema() {
    const orderColumns = [
      { name: "customer_id", sqlite: "INT", pg: "INT", my: "INT" },
      { name: "total", sqlite: "REAL DEFAULT 0.0", pg: "NUMERIC(10,2) DEFAULT 0.0", my: "DECIMAL(10,2) DEFAULT 0.0" },
      { name: "grand_total", sqlite: "REAL DEFAULT 0.0", pg: "NUMERIC(10,2) DEFAULT 0.0", my: "DECIMAL(10,2) DEFAULT 0.0" },
      { name: "referral_discount", sqlite: "REAL DEFAULT 0.0", pg: "NUMERIC(10,2) DEFAULT 0.0", my: "DECIMAL(10,2) DEFAULT 0.0" },
      { name: "applied_points", sqlite: "INT DEFAULT 0", pg: "INT DEFAULT 0", my: "INT DEFAULT 0" },
      { name: "coupon_discount", sqlite: "REAL DEFAULT 0.0", pg: "NUMERIC(10,2) DEFAULT 0.0", my: "DECIMAL(10,2) DEFAULT 0.0" },
      { name: "coupon_code", sqlite: "TEXT DEFAULT ''", pg: "VARCHAR(100) DEFAULT ''", my: "VARCHAR(100) DEFAULT ''" },
      { name: "celebration_discount", sqlite: "REAL DEFAULT 0.0", pg: "NUMERIC(10,2) DEFAULT 0.0", my: "DECIMAL(10,2) DEFAULT 0.0" },
      { name: "celebration_offer_name", sqlite: "TEXT DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
      { name: "payment_method", sqlite: "TEXT DEFAULT 'COD'", pg: "VARCHAR(50) DEFAULT 'COD'", my: "VARCHAR(50) DEFAULT 'COD'" },
      { name: "payment_status", sqlite: "TEXT DEFAULT 'UNPAID'", pg: "VARCHAR(50) DEFAULT 'UNPAID'", my: "VARCHAR(50) DEFAULT 'UNPAID'" },
      { name: "customer_email", sqlite: "TEXT DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
      { name: "is_marg_bill", sqlite: "INT DEFAULT 0", pg: "BOOLEAN DEFAULT FALSE", my: "INT DEFAULT 0" },
      { name: "points_earned", sqlite: "INT DEFAULT 0", pg: "INT DEFAULT 0", my: "INT DEFAULT 0" },
      { name: "pdf_url", sqlite: "TEXT", pg: "TEXT", my: "TEXT" },
      { name: "delivery_staff_id", sqlite: "INT", pg: "INT", my: "INT" },
      { name: "cod_status", sqlite: "TEXT DEFAULT 'PENDING_CLEARANCE'", pg: "VARCHAR(50) DEFAULT 'PENDING_CLEARANCE'", my: "VARCHAR(50) DEFAULT 'PENDING_CLEARANCE'" },
      { name: "cod_settled_at", sqlite: "TEXT", pg: "VARCHAR(50)", my: "VARCHAR(50)" },
      { name: "cod_cleared_by", sqlite: "TEXT", pg: "VARCHAR(150)", my: "VARCHAR(150)" },
      { name: "cod_settlement_note", sqlite: "TEXT", pg: "TEXT", my: "TEXT" }
    ];

    // 1. SQLite Schema Migration
    if (sqliteDb) {
      try {
        const existingSQLite = await new Promise((resolve) => {
          sqliteDb.all('PRAGMA table_info("order")', (err, rows) => {
            if (err) resolve([]);
            else resolve(rows || []);
          });
        });
        const existingColNames = new Set(existingSQLite.map((c) => c.name));
        for (const col of orderColumns) {
          if (!existingColNames.has(col.name)) {
            try {
              await new Promise((resolve, reject) => {
                sqliteDb.run(`ALTER TABLE "order" ADD COLUMN ${col.name} ${col.sqlite}`, (err) => {
                  if (err && !err.message.includes("duplicate column")) reject(err);
                  else resolve();
                });
              });
              console.log(`✓ SQLite migrated: added column ${col.name} to "order" table.`);
            } catch (colErr) {
              console.warn(`Notice SQLite column add ${col.name}:`, colErr.message);
            }
          }
        }

        // Synchronize total and grand_total values across all orders
        await new Promise((resolve) => {
          sqliteDb.run(`UPDATE "order" SET total = grand_total WHERE (total IS NULL OR total = 0) AND grand_total > 0`, () => resolve());
        });
        await new Promise((resolve) => {
          sqliteDb.run(`UPDATE "order" SET grand_total = total WHERE (grand_total IS NULL OR grand_total = 0) AND total > 0`, () => resolve());
        });

        // Repair orders with null IDs (e.g. from previous type mismatch)
        await new Promise((resolve) => {
          sqliteDb.run(`UPDATE "order" SET id = 'SW-7001' WHERE id IS NULL AND customer_name = 'Balram Patidar'`, () => resolve());
        });
        await new Promise((resolve) => {
          sqliteDb.run(`DELETE FROM "order" WHERE id IS NULL AND customer_name LIKE '%Test Rzp%'`, () => resolve());
        });
        await new Promise((resolve) => {
          sqliteDb.run(`UPDATE "order" SET id = 'SW-' || (1000 + abs(random() % 9000)) WHERE id IS NULL`, () => resolve());
        });

        // Ensure Balram Patidar's order item is linked in order_item table
        const bpItems = await new Promise((resolve) => {
          sqliteDb.all(`SELECT id FROM order_item WHERE order_id = 'SW-7001'`, (err, rows) => resolve(rows || []));
        });
        if (bpItems.length === 0) {
          await new Promise((resolve) => {
            sqliteDb.run(
              `INSERT INTO order_item (order_id, product_id, name_en, name_hi, price, qty, weight_label)
               VALUES ('SW-7001', 115, 'AMUL MASTI BUTTERMILK 200ML', 'अमूल मस्ती छाछ 200 मिली', 15, 1, '200ml')`,
              () => resolve()
            );
          });
        }
      } catch (err) {
        console.warn("Notice during SQLite schema migration:", err.message);
      }
    }

    // 2. MySQL Schema Migration if active
    if (this.isMySQL && mysqlPool) {
      try {
        const [existingMyCols] = await mysqlPool.query("SHOW COLUMNS FROM `order`");
        const existingMyNames = new Set((existingMyCols || []).map((c) => c.Field));
        for (const col of orderColumns) {
          if (!existingMyNames.has(col.name)) {
            try {
              await mysqlPool.query(`ALTER TABLE \`order\` ADD COLUMN \`${col.name}\` ${col.my}`);
              console.log(`✓ MySQL migrated: added column ${col.name} to \`order\` table.`);
            } catch (myErr) {
              console.warn(`Notice MySQL column add ${col.name}:`, myErr.message);
            }
          }
        }
      } catch (err) {
        console.warn("Notice during MySQL schema migration:", err.message);
      }
    }

    // 3. PostgreSQL Schema Migration if active
    if (this.isPostgres && pgPool) {
      try {
        for (const col of orderColumns) {
          try {
            await pgPool.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS ${col.name} ${col.pg}`);
          } catch (pgErr) {
            console.warn(`Notice PG column add ${col.name}:`, pgErr.message);
          }
        }
      } catch (err) {
        console.warn("Notice during PG schema migration:", err.message);
      }
    }
  },

  // 1-Click Migration Sync: SQLite -> MySQL or MySQL -> SQLite
  async syncDatabases(direction = "sqlite_to_mysql") {
    if (!mysqlPool || !sqliteDb) {
      throw new Error("Both MySQL and SQLite must be connected to run sync.");
    }

    const tablesToSync = ['product', 'partner', 'review', 'payment_settings', 'marg_settings', 'app_settings'];
    const syncReport = {};

    if (direction === "sqlite_to_mysql") {
      console.log("🔄 Starting SQLite -> MySQL Sync...");
      for (const t of tablesToSync) {
        const rows = await this.querySQLite(`SELECT * FROM ${t === 'order' ? '"order"' : t}`);
        let inserted = 0;
        for (const row of rows) {
          const keys = Object.keys(row);
          const placeholders = keys.map(() => '?').join(', ');
          const values = Object.values(row);
          const columns = keys.map(k => `\`${k}\``).join(', ');
          const updateClause = keys.map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');

          const mySqlInsert = `INSERT INTO \`${t}\` (${columns}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;
          try {
            await mysqlPool.execute(mySqlInsert, values);
            inserted++;
          } catch (e) {
            console.error(`Sync error on table ${t}:`, e.message);
          }
        }
        syncReport[t] = { total: rows.length, synced: inserted };
      }
    }

    return syncReport;
  },

  async seedProductsIfEmpty(fallbackProducts) {
    try {
      const existing = await this.query("SELECT code, name_en FROM product");
      const existingCodes = new Set(existing.map(row => String(row.code || row.name_en || "").trim().toLowerCase()));

      let nextId = 1;
      const maxIdResult = await this.query("SELECT MAX(id) as max_id FROM product");
      if (maxIdResult && maxIdResult[0] && maxIdResult[0].max_id) {
        nextId = Number(maxIdResult[0].max_id) + 1;
      }

      const productsToInsert = [];
      for (const p of fallbackProducts) {
        const codeKey = String(p.code || p.nameEn || p.name || "").trim().toLowerCase();
        if (!existingCodes.has(codeKey)) {
          productsToInsert.push(p);
        }
      }

      if (productsToInsert.length > 0) {
        console.log(`🌱 Seeding ${productsToInsert.length} missing products into Database...`);
        for (const p of productsToInsert) {
          const currentId = p.id && p.id >= nextId ? p.id : nextId++;
          if (currentId >= nextId) {
            nextId = currentId + 1;
          }
          await this.execute(
            `INSERT INTO product (
              id, code, name_en, name_hi, category, sub_en, sub_hi, 
              price, original_price, discount_tag, image_url, stock_count, 
              unit, unit_prices, pack_en, pack_hi
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              currentId,
              p.code || "",
              p.nameEn || p.name || "",
              p.nameHi || p.name || "",
              p.category || "swastik",
              p.subEn || p.brand || "General",
              p.subHi || p.brand || "General",
              p.price || 0,
              p.originalPrice || null,
              p.discountTag || "",
              p.imageUrl || p.image || "",
              p.stockCount || 100,
              p.unit || "",
              p.unitPrices || "",
              p.packEn || "",
              p.packHi || ""
            ]
          );
        }
        console.log(`✓ Missing product seeding completed! Uploaded ${productsToInsert.length} items.`);
      } else {
        console.log("✓ All fallback products are already present in Database.");
      }
    } catch (err) {
      console.error("Error seeding products:", err.message);
    }
  },

  async seedPartnersIfEmpty(fallbackPartners) {
    try {
      const existing = await this.query("SELECT id FROM partner LIMIT 1");
      if (existing.length === 0 && fallbackPartners.length > 0) {
        console.log("🌱 Seeding corporate partners into Database...");
        for (const pt of fallbackPartners) {
          await this.execute(
            "INSERT INTO partner (id, name, photo, designation, about) VALUES (?, ?, ?, ?, ?)",
            [pt.id, pt.name, pt.photo, pt.designation, pt.about]
          );
        }
        console.log("✓ Partner seeding completed!");
      }
    } catch (err) {
      console.error("Error seeding partners:", err.message);
    }
  },

  async seedReviewsIfEmpty(fallbackReviews) {
    try {
      const existing = await this.query("SELECT id FROM review LIMIT 1");
      if (existing.length === 0 && fallbackReviews.length > 0) {
        console.log("🌱 Seeding guest reviews into Database...");
        for (const rv of fallbackReviews) {
          await this.execute(
            `INSERT INTO review (
              id, author_name, rating, comment_en, comment_hi, 
              avatar_bg, owner_response, date_label, is_approved
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              rv.id,
              rv.name || rv.author_name,
              rv.rating || 5,
              rv.commentEn || "",
              rv.commentHi || "",
              rv.avatarBg || "from-cyan-400 to-blue-500",
              rv.response || rv.owner_response || "",
              rv.date || rv.date_label || "Just now",
              rv.isApproved !== undefined ? (rv.isApproved ? 1 : 0) : 1
            ]
          );
        }
        console.log("✓ Review seeding completed!");
      }
    } catch (err) {
      console.error("Error seeding reviews:", err.message);
    }
  },

  async seedOrdersIfEmpty(fallbackOrders) {
    try {
      const existing = await this.query("SELECT id FROM " + (this.isMySQL ? "`order`" : '"order"') + " LIMIT 1");
      if (existing.length === 0 && fallbackOrders.length > 0) {
        console.log("🌱 Seeding sample orders into Database...");
        for (const o of fallbackOrders) {
          await this.execute(
            `INSERT INTO ${this.isMySQL ? "`order`" : '"order"'} (
              id, user_id, order_date, is_active, step_level, status_label, 
              subtotal, delivery_fee, gst_amount, grand_total, 
              delivery_partner_name, delivery_partner_phone, dispatch_hub, 
              eta_status, shipping_address, customer_name, customer_phone, 
              is_marg_bill, points_earned, pdf_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              o.id,
              o.userId || null,
              o.orderDate || new Date().toISOString(),
              o.isActive !== undefined ? (o.isActive ? 1 : 0) : 1,
              o.step !== undefined ? o.step : 0,
              o.status || o.status_label || "Confirmed",
              o.subtotal || 0,
              o.deliveryFee || 0,
              o.gst || o.gst_amount || 0,
              o.total || o.grand_total || 0,
              o.deliveryPartnerName || "",
              o.deliveryPartnerPhone || "",
              o.hubName || o.dispatch_hub || "",
              o.eta || o.eta_status || "",
              o.shippingAddress || "",
              o.customerName || "Simulated Customer",
              o.customerPhone || "+91 99999 99999",
              o.isMargBill !== undefined ? (o.isMargBill ? 1 : 0) : 0,
              o.pointsEarned || 0,
              o.pdfUrl || ""
            ]
          );

          if (Array.isArray(o.items)) {
            for (const item of o.items) {
              await this.execute(
                `INSERT INTO order_item (
                  order_id, product_id, name_en, name_hi, price, qty, weight_label
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  o.id,
                  item.productId || 0,
                  item.nameEn || item.name || "",
                  item.nameHi || item.name || "",
                  item.price || 0,
                  item.qty || 1,
                  item.weight || item.weight_label || "N/A"
                ]
              );
            }
          }
        }
        console.log("✓ Order seeding completed!");
      }
    } catch (err) {
      console.error("Error seeding orders:", err.message);
    }
  },

  // Synchronize Customer Table and enforce Relational Order Mapping
  async syncCustomerTableAndOrders() {
    try {
      const defaultCustomers = [
        {
          id: 101,
          name: "Balram Patidar",
          phone: "+91 99999 88888",
          email: "balram@swastik.local",
          address: "Sector 15, Flat 402, Noida, UP",
          status: "Active",
          registeredAt: "2026-01-15",
          orderCount: 4,
          totalSpent: 1850,
          points: 350,
          isPrimeActive: true,
          primeMembershipNo: "SW-PRIME-101"
        },
        {
          id: 102,
          name: "Rahul Sharma",
          phone: "+91 98765 43210",
          email: "rahul.sharma@gmail.com",
          address: "B-12, Sector 62, Noida, UP",
          status: "Active",
          registeredAt: "2026-02-01",
          orderCount: 2,
          totalSpent: 750,
          points: 150,
          isPrimeActive: false
        },
        {
          id: 103,
          name: "Priya Patel",
          phone: "+91 91234 56789",
          email: "priya.p@yahoo.com",
          address: "House 55, Indirapuram, Ghaziabad",
          status: "Active",
          registeredAt: "2026-02-10",
          orderCount: 1,
          totalSpent: 420,
          points: 100,
          isPrimeActive: false
        },
        {
          id: 104,
          name: "Amit Verma",
          phone: "+91 98111 22334",
          email: "amit.verma@outlook.com",
          address: "Flat 204, Gaur City, Greater Noida West",
          status: "Active",
          registeredAt: "2026-02-18",
          orderCount: 3,
          totalSpent: 1200,
          points: 200,
          isPrimeActive: false
        }
      ];

      // Check current rows in customer table
      let existingCustRows = [];
      try {
        existingCustRows = await this.query("SELECT * FROM customer");
      } catch (e) {}

      let customersToLoad = [];
      if (existingCustRows && existingCustRows.length > 0) {
        customersToLoad = existingCustRows.map(c => ({
          id: Number(c.id),
          name: c.name,
          phone: c.phone,
          email: c.email || "",
          address: c.address || "",
          status: c.status || "Active",
          registeredAt: c.registered_at,
          orderCount: Number(c.order_count || 0),
          totalSpent: Number(c.total_spent || 0),
          points: Number(c.points || 100),
          isPrimeActive: Boolean(c.is_prime_active),
          primeMembershipNo: c.prime_membership_no || "",
          dob: c.dob || "",
          anniversary: c.anniversary || ""
        }));
      } else {
        // Check app_settings for swastik_customers
        const rows = await this.query("SELECT value_text FROM app_settings WHERE key_name = 'swastik_customers'");
        if (rows.length > 0 && rows[0].value_text) {
          try {
            const parsed = JSON.parse(rows[0].value_text);
            if (Array.isArray(parsed) && parsed.length > 0) {
              customersToLoad = parsed;
            }
          } catch (e) {}
        }
        if (customersToLoad.length === 0) {
          customersToLoad = defaultCustomers;
        }

        // Insert into customer table
        for (const c of customersToLoad) {
          try {
            await this.execute(
              `INSERT INTO customer (id, name, phone, email, address, status, registered_at, order_count, total_spent, points, is_prime_active, prime_membership_no, dob, anniversary)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                c.id, c.name, c.phone, c.email || "", c.address || "", c.status || "Active",
                c.registeredAt || new Date().toISOString(), c.orderCount || 0, c.totalSpent || 0,
                c.points || 100, c.isPrimeActive ? 1 : 0, c.primeMembershipNo || "", c.dob || "", c.anniversary || ""
              ]
            );
          } catch (err) {}
        }
      }

      // Always synchronize app_settings copy
      try {
        const jsonVal = JSON.stringify(customersToLoad);
        const exSettings = await this.query("SELECT key_name FROM app_settings WHERE key_name = 'swastik_customers'");
        if (exSettings.length > 0) {
          await this.execute("UPDATE app_settings SET value_text = ?, updated_at = CURRENT_TIMESTAMP WHERE key_name = 'swastik_customers'", [jsonVal]);
        } else {
          await this.execute("INSERT INTO app_settings (key_name, value_text) VALUES ('swastik_customers', ?)", [jsonVal]);
        }
      } catch (e) {}

      // ENFORCE PROPER ID MAPPING ON ALL ORDERS
      for (const c of customersToLoad) {
        const cleanP = String(c.phone || "").replace(/\D/g, "").slice(-10);
        if (cleanP) {
          // Link unassigned orders by matching phone digits or exact phone
          await this.execute(
            `UPDATE "order" SET customer_id = ?, user_id = ?, customer_name = ? 
             WHERE (customer_id IS NULL OR user_id IS NULL OR user_id = 0) 
               AND (
                 REPLACE(REPLACE(REPLACE(customer_phone, ' ', ''), '-', ''), '+', '') LIKE ? 
                 OR customer_phone = ?
               )`,
            [c.id, c.id, c.name, `%${cleanP}%`, c.phone]
          );
          // Sync current profile name across all historical orders for this customer_id / user_id
          await this.execute(
            `UPDATE "order" SET customer_name = ?, customer_phone = ? WHERE customer_id = ? OR user_id = ?`,
            [c.name, c.phone, c.id, c.id]
          );
        }
      }
      console.log(`✓ Synchronized ${customersToLoad.length} customers and mapped order IDs.`);
    } catch (err) {
      console.warn("Notice in syncCustomerTableAndOrders:", err.message);
    }
  },

  // Save full persistent snapshot to disk for zero-data-loss deployments
  async savePersistentSnapshot() {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const snapshotPath = path.join(process.cwd(), "database", "persistent_store.json");

      const products = await this.query("SELECT * FROM product");
      const orders = await this.query('SELECT * FROM "order"');
      const orderItems = await this.query("SELECT * FROM order_item");
      const customers = await this.query("SELECT * FROM customer");
      const users = await this.query('SELECT * FROM "user"');
      const partners = await this.query("SELECT * FROM partner");
      const reviews = await this.query("SELECT * FROM review");
      const appSettings = await this.query("SELECT * FROM app_settings");
      const paymentSettings = await this.query("SELECT * FROM payment_settings");
      const margSettings = await this.query("SELECT * FROM marg_settings");

      const snapshot = {
        updatedAt: new Date().toISOString(),
        tables: {
          product: products,
          order: orders,
          order_item: orderItems,
          customer: customers,
          user: users,
          partner: partners,
          review: reviews,
          app_settings: appSettings,
          payment_settings: paymentSettings,
          marg_settings: margSettings
        }
      };

      fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), "utf-8");
      console.log(`✓ Persistent snapshot updated at ${snapshotPath} (${orders.length} orders, ${products.length} products, ${customers.length} customers)`);
    } catch (err) {
      console.warn("Notice in savePersistentSnapshot:", err.message);
    }
  },

  // Rehydrate state on fresh deployment
  async rehydrateFromPersistentSnapshot() {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const snapshotPath = path.join(process.cwd(), "database", "persistent_store.json");

      if (!fs.existsSync(snapshotPath)) return;

      const raw = fs.readFileSync(snapshotPath, "utf-8");
      const data = JSON.parse(raw);
      if (!data || !data.tables) return;

      const { tables } = data;

      const currentOrders = await this.query('SELECT COUNT(*) as cnt FROM "order"');
      const orderCount = Number(currentOrders[0]?.cnt || currentOrders[0]?.['count(*)'] || 0);

      if (orderCount === 0 && Array.isArray(tables.order) && tables.order.length > 0) {
        console.log(`📥 Rehydrating ${tables.order.length} orders from persistent snapshot...`);
        for (const o of tables.order) {
          try {
            await this.execute(
              `INSERT INTO "order" (id, user_id, order_date, is_active, step_level, status_label, delivery_partner_name, delivery_partner_phone, dispatch_hub, grand_total, subtotal, delivery_fee, gst_amount, customer_name, customer_phone, shipping_address, referral_discount, applied_points, coupon_discount, coupon_code, celebration_discount, celebration_offer_name, customer_email, payment_method, payment_status, total)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                o.id, o.user_id || null, o.order_date, o.is_active ? 1 : 0, o.step_level || 0, o.status_label || 'Placed',
                o.delivery_partner_name || '', o.delivery_partner_phone || '', o.dispatch_hub || '',
                o.grand_total || o.total || 0, o.subtotal || 0, o.delivery_fee || 0, o.gst_amount || 0,
                o.customer_name || '', o.customer_phone || '', o.shipping_address || '', o.referral_discount || 0,
                o.applied_points || 0, o.coupon_discount || 0, o.coupon_code || '', o.celebration_discount || 0,
                o.celebration_offer_name || '', o.customer_email || '', o.payment_method || 'COD',
                o.payment_status || 'UNPAID', o.total || o.grand_total || 0
              ]
            );
          } catch (oe) {}
        }
      }

      if (Array.isArray(tables.order_item) && tables.order_item.length > 0) {
        const currentItems = await this.query('SELECT COUNT(*) as cnt FROM order_item');
        const itemCount = Number(currentItems[0]?.cnt || currentItems[0]?.['count(*)'] || 0);
        if (itemCount === 0) {
          for (const item of tables.order_item) {
            try {
              await this.execute(
                `INSERT INTO order_item (order_id, product_id, name_en, name_hi, price, qty, weight_label)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [item.order_id, item.product_id, item.name_en, item.name_hi, item.price, item.qty, item.weight_label]
              );
            } catch (ie) {}
          }
        }
      }

      if (Array.isArray(tables.customer) && tables.customer.length > 0) {
        for (const c of tables.customer) {
          try {
            const ex = await this.query("SELECT id FROM customer WHERE id = ?", [c.id]);
            if (ex.length === 0) {
              await this.execute(
                `INSERT INTO customer (id, name, phone, email, address, status, registered_at, order_count, total_spent, points, is_prime_active, prime_membership_no, dob, anniversary)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  c.id, c.name, c.phone, c.email || '', c.address || '', c.status || 'Active',
                  c.registered_at || new Date().toISOString(), c.order_count || 0, c.total_spent || 0,
                  c.points || 100, c.is_prime_active ? 1 : 0, c.prime_membership_no || '', c.dob || '', c.anniversary || ''
                ]
              );
            }
          } catch (ce) {}
        }
      }
    } catch (err) {
      console.warn("Notice in rehydrateFromPersistentSnapshot:", err.message);
    }
  }
};
