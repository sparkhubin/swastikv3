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
      );`
    ];

    for (const q of queries) {
      try {
        await this.execute(q, [], true);
      } catch (err) {
        console.error("Schema init notice:", err.message);
      }
    }

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
  }
};
