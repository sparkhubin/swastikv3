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
  isDualSyncEnabled: process.env.MYSQL_SYNC_ENABLED === "true",

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
        email VARCHAR(255) DEFAULT '',
        permissions ${textType} DEFAULT '[]',
        status VARCHAR(50) DEFAULT 'Active',
        is_master_admin ${booleanType} DEFAULT ${isPg ? 'FALSE' : 0},
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
        id ${serialType},
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255) DEFAULT '',
        address ${textType},
        status VARCHAR(50) DEFAULT 'Active',
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        points INT DEFAULT 100,
        is_prime_active ${booleanType} DEFAULT ${isPg ? 'FALSE' : 0},
        prime_membership_no VARCHAR(100) DEFAULT '',
        dob VARCHAR(50) DEFAULT '',
        anniversary VARCHAR(50) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

            // 14. Customer Points History
            `CREATE TABLE IF NOT EXISTS customer_points (
              id ${serialType},
              customer_id INT NOT NULL,
              points INT NOT NULL,
              type VARCHAR(50) NOT NULL,
              reference_id VARCHAR(100) DEFAULT '',
              description ${textType} DEFAULT '',
              referrer_customer_id INT,
              referred_customer_id INT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

  },

  // Auto-migration to ensure all tables have required columns across SQLite, MySQL, and PostgreSQL
  async migrateSchema() {
    const tableMigrations = [
      {
        tableName: "product",
        columns: [
          { name: "code", sqlite: "VARCHAR(100) DEFAULT ''", pg: "VARCHAR(100) DEFAULT ''", my: "VARCHAR(100) DEFAULT ''" },
          { name: "name_en", sqlite: "VARCHAR(255) DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "name_hi", sqlite: "VARCHAR(255) DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "category", sqlite: "VARCHAR(100) DEFAULT 'swastik'", pg: "VARCHAR(100) DEFAULT 'swastik'", my: "VARCHAR(100) DEFAULT 'swastik'" },
          { name: "sub_en", sqlite: "VARCHAR(255) DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "sub_hi", sqlite: "VARCHAR(255) DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "price", sqlite: "REAL DEFAULT 0.0", pg: "DECIMAL(10,2) DEFAULT 0.0", my: "DECIMAL(10,2) DEFAULT 0.0" },
          { name: "original_price", sqlite: "REAL DEFAULT 0.0", pg: "DECIMAL(10,2) DEFAULT 0.0", my: "DECIMAL(10,2) DEFAULT 0.0" },
          { name: "discount_tag", sqlite: "VARCHAR(100) DEFAULT ''", pg: "VARCHAR(100) DEFAULT ''", my: "VARCHAR(100) DEFAULT ''" },
          { name: "image_url", sqlite: "TEXT DEFAULT ''", pg: "TEXT DEFAULT ''", my: "TEXT" },
          { name: "is_image", sqlite: "INTEGER NOT NULL DEFAULT 0", pg: "INTEGER NOT NULL DEFAULT 0", my: "TINYINT NOT NULL DEFAULT 0" },
          { name: "stock_count", sqlite: "INT DEFAULT 100", pg: "INT DEFAULT 100", my: "INT DEFAULT 100" },
          { name: "unit", sqlite: "VARCHAR(255) DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "unit_prices", sqlite: "TEXT DEFAULT ''", pg: "TEXT DEFAULT ''", my: "TEXT" },
          { name: "pack_en", sqlite: "VARCHAR(100) DEFAULT ''", pg: "VARCHAR(100) DEFAULT ''", my: "VARCHAR(100) DEFAULT ''" },
          { name: "pack_hi", sqlite: "VARCHAR(100) DEFAULT ''", pg: "VARCHAR(100) DEFAULT ''", my: "VARCHAR(100) DEFAULT ''" },
          { name: "gst_percent", sqlite: "REAL DEFAULT 5", pg: "DECIMAL(10,2) DEFAULT 5", my: "DECIMAL(10,2) DEFAULT 5" }
        ]
      },
      {
        tableName: "order",
        columns: [
          { name: "customer_id", sqlite: "INT", pg: "INT", my: "INT" },
          { name: "user_id", sqlite: "INT", pg: "INT", my: "INT" },
          { name: "order_date", sqlite: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP", pg: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP", my: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
          { name: "is_active", sqlite: "INT DEFAULT 1", pg: "BOOLEAN DEFAULT TRUE", my: "INT DEFAULT 1" },
          { name: "step_level", sqlite: "INT DEFAULT 0", pg: "INT DEFAULT 0", my: "INT DEFAULT 0" },
          { name: "status_label", sqlite: "VARCHAR(100) DEFAULT 'Confirmed'", pg: "VARCHAR(100) DEFAULT 'Confirmed'", my: "VARCHAR(100) DEFAULT 'Confirmed'" },
          { name: "subtotal", sqlite: "REAL DEFAULT 0.0", pg: "NUMERIC(10,2) DEFAULT 0.0", my: "DECIMAL(10,2) DEFAULT 0.0" },
          { name: "delivery_fee", sqlite: "REAL DEFAULT 0.0", pg: "NUMERIC(10,2) DEFAULT 0.0", my: "DECIMAL(10,2) DEFAULT 0.0" },
          { name: "gst_amount", sqlite: "REAL DEFAULT 0.0", pg: "NUMERIC(10,2) DEFAULT 0.0", my: "DECIMAL(10,2) DEFAULT 0.0" },
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
          { name: "customer_name", sqlite: "VARCHAR(255)", pg: "VARCHAR(255)", my: "VARCHAR(255)" },
          { name: "customer_phone", sqlite: "VARCHAR(30)", pg: "VARCHAR(30)", my: "VARCHAR(30)" },
          { name: "customer_email", sqlite: "TEXT DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "is_marg_bill", sqlite: "INT DEFAULT 0", pg: "BOOLEAN DEFAULT FALSE", my: "INT DEFAULT 0" },
          { name: "points_earned", sqlite: "INT DEFAULT 0", pg: "INT DEFAULT 0", my: "INT DEFAULT 0" },
          { name: "pdf_url", sqlite: "TEXT", pg: "TEXT", my: "TEXT" },
          { name: "delivery_staff_id", sqlite: "INT", pg: "INT", my: "INT" },
          { name: "delivery_partner_name", sqlite: "VARCHAR(255)", pg: "VARCHAR(255)", my: "VARCHAR(255)" },
          { name: "delivery_partner_phone", sqlite: "VARCHAR(30)", pg: "VARCHAR(30)", my: "VARCHAR(30)" },
          { name: "dispatch_hub", sqlite: "VARCHAR(150)", pg: "VARCHAR(150)", my: "VARCHAR(150)" },
          { name: "eta_status", sqlite: "VARCHAR(100)", pg: "VARCHAR(100)", my: "VARCHAR(100)" },
          { name: "cod_status", sqlite: "TEXT DEFAULT 'PENDING_CLEARANCE'", pg: "VARCHAR(50) DEFAULT 'PENDING_CLEARANCE'", my: "VARCHAR(50) DEFAULT 'PENDING_CLEARANCE'" },
          { name: "cod_settled_at", sqlite: "TEXT", pg: "VARCHAR(50)", my: "VARCHAR(50)" },
          { name: "cod_cleared_by", sqlite: "TEXT", pg: "VARCHAR(150)", my: "VARCHAR(150)" },
          { name: "cod_settlement_note", sqlite: "TEXT", pg: "TEXT", my: "TEXT" }
        ]
      },
      {
        tableName: "user",
        columns: [
          { name: "email", sqlite: "TEXT DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "permissions", sqlite: "TEXT DEFAULT '[]'", pg: "TEXT DEFAULT '[]'", my: "TEXT" },
          { name: "status", sqlite: "TEXT DEFAULT 'Active'", pg: "VARCHAR(50) DEFAULT 'Active'", my: "VARCHAR(50) DEFAULT 'Active'" },
          { name: "is_master_admin", sqlite: "INT DEFAULT 0", pg: "BOOLEAN DEFAULT FALSE", my: "INT DEFAULT 0" },
          { name: "delivery_address", sqlite: "TEXT DEFAULT ''", pg: "TEXT DEFAULT ''", my: "TEXT" }
        ]
      },
      {
        tableName: "customer",
        columns: [
          { name: "email", sqlite: "VARCHAR(255) DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "address", sqlite: "TEXT DEFAULT ''", pg: "TEXT DEFAULT ''", my: "TEXT" },
          { name: "status", sqlite: "VARCHAR(50) DEFAULT 'Active'", pg: "VARCHAR(50) DEFAULT 'Active'", my: "VARCHAR(50) DEFAULT 'Active'" },
          { name: "points", sqlite: "INT DEFAULT 100", pg: "INT DEFAULT 100", my: "INT DEFAULT 100" },
          { name: "is_prime_active", sqlite: "INT DEFAULT 0", pg: "BOOLEAN DEFAULT FALSE", my: "INT DEFAULT 0" },
          { name: "prime_membership_no", sqlite: "VARCHAR(100) DEFAULT ''", pg: "VARCHAR(100) DEFAULT ''", my: "VARCHAR(100) DEFAULT ''" },
          { name: "dob", sqlite: "VARCHAR(50) DEFAULT ''", pg: "VARCHAR(50) DEFAULT ''", my: "VARCHAR(50) DEFAULT ''" },
          { name: "anniversary", sqlite: "VARCHAR(50) DEFAULT ''", pg: "VARCHAR(50) DEFAULT ''", my: "VARCHAR(50) DEFAULT ''" }
        ]
      },
      {
        tableName: "payment_settings",
        columns: [
          { name: "enabled", sqlite: "INT DEFAULT 1", pg: "BOOLEAN DEFAULT TRUE", my: "INT DEFAULT 1" },
          { name: "app_id", sqlite: "VARCHAR(255) DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "secret_key", sqlite: "VARCHAR(255) DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "environment", sqlite: "VARCHAR(50) DEFAULT 'TEST'", pg: "VARCHAR(50) DEFAULT 'TEST'", my: "VARCHAR(50) DEFAULT 'TEST'" },
          { name: "razorpay_enabled", sqlite: "INT DEFAULT 1", pg: "BOOLEAN DEFAULT TRUE", my: "INT DEFAULT 1" },
          { name: "razorpay_key_id", sqlite: "VARCHAR(255) DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "razorpay_key_secret", sqlite: "VARCHAR(255) DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "active_gateway", sqlite: "VARCHAR(50) DEFAULT 'RAZORPAY'", pg: "VARCHAR(50) DEFAULT 'RAZORPAY'", my: "VARCHAR(50) DEFAULT 'RAZORPAY'" }
        ]
      },
      {
        tableName: "whatsapp_settings",
        columns: [
          { name: "meta_phone_number_id", sqlite: "VARCHAR(255) DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "meta_access_token", sqlite: "TEXT DEFAULT ''", pg: "TEXT DEFAULT ''", my: "TEXT" },
          { name: "meta_business_account_id", sqlite: "VARCHAR(255) DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "meta_template_name", sqlite: "VARCHAR(100) DEFAULT 'reference_no'", pg: "VARCHAR(100) DEFAULT 'reference_no'", my: "VARCHAR(100) DEFAULT 'reference_no'" },
          { name: "twilio_account_sid", sqlite: "VARCHAR(255) DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "twilio_auth_token", sqlite: "VARCHAR(255) DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "twilio_whatsapp_from", sqlite: "VARCHAR(50) DEFAULT '+14155238886'", pg: "VARCHAR(50) DEFAULT '+14155238886'", my: "VARCHAR(50) DEFAULT '+14155238886'" },
          { name: "enabled", sqlite: "INT DEFAULT 1", pg: "BOOLEAN DEFAULT TRUE", my: "INT DEFAULT 1" }
        ]
      },
      {
        tableName: "notification",
        columns: [
          { name: "recipient_role", sqlite: "VARCHAR(50) DEFAULT 'customer'", pg: "VARCHAR(50) DEFAULT 'customer'", my: "VARCHAR(50) DEFAULT 'customer'" },
          { name: "recipient_phone", sqlite: "VARCHAR(50) DEFAULT ''", pg: "VARCHAR(50) DEFAULT ''", my: "VARCHAR(50) DEFAULT ''" },
          { name: "order_id", sqlite: "VARCHAR(50) DEFAULT ''", pg: "VARCHAR(50) DEFAULT ''", my: "VARCHAR(50) DEFAULT ''" },
          { name: "title_en", sqlite: "VARCHAR(255) DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "title_hi", sqlite: "VARCHAR(255) DEFAULT ''", pg: "VARCHAR(255) DEFAULT ''", my: "VARCHAR(255) DEFAULT ''" },
          { name: "message_en", sqlite: "TEXT DEFAULT ''", pg: "TEXT DEFAULT ''", my: "TEXT" },
          { name: "message_hi", sqlite: "TEXT DEFAULT ''", pg: "TEXT DEFAULT ''", my: "TEXT" },
          { name: "type", sqlite: "VARCHAR(50) DEFAULT 'order_update'", pg: "VARCHAR(50) DEFAULT 'order_update'", my: "VARCHAR(50) DEFAULT 'order_update'" },
          { name: "is_read", sqlite: "INT DEFAULT 0", pg: "BOOLEAN DEFAULT FALSE", my: "INT DEFAULT 0" }
        ]
      }
    ];

    // 1. SQLite Schema Migration
    if (sqliteDb) {
      try {
        for (const table of tableMigrations) {
          const tableEscaped = table.tableName === 'order' || table.tableName === 'user' ? `"${table.tableName}"` : table.tableName;
          const existingSQLite = await new Promise((resolve) => {
            sqliteDb.all(`PRAGMA table_info(${tableEscaped})`, (err, rows) => {
              if (err) resolve([]);
              else resolve(rows || []);
            });
          });
          const existingColNames = new Set(existingSQLite.map((c) => c.name));

          for (const col of table.columns) {
            if (!existingColNames.has(col.name)) {
              try {
                await new Promise((resolve, reject) => {
                  sqliteDb.run(`ALTER TABLE ${tableEscaped} ADD COLUMN ${col.name} ${col.sqlite}`, (err) => {
                    if (err && !err.message.includes("duplicate column")) reject(err);
                    else resolve();
                  });
                });
                console.log(`✓ SQLite migrated: added column ${col.name} to ${tableEscaped} table.`);
              } catch (colErr) {
                console.warn(`Notice SQLite column add ${col.name} to ${tableEscaped}:`, colErr.message);
              }
            }
          }
        }

      } catch (err) {
        console.warn("Notice during SQLite schema migration:", err.message);
      }
    }

    // 2. MySQL Schema Migration if active
    if (this.isMySQL && mysqlPool) {
      try {
        for (const table of tableMigrations) {
          const [existingMyCols] = await mysqlPool.query(`SHOW COLUMNS FROM \`${table.tableName}\``);
          const existingMyNames = new Set((existingMyCols || []).map((c) => c.Field));
          for (const col of table.columns) {
            if (!existingMyNames.has(col.name)) {
              try {
                await mysqlPool.query(`ALTER TABLE \`${table.tableName}\` ADD COLUMN \`${col.name}\` ${col.my}`);
                console.log(`✓ MySQL migrated: added column ${col.name} to \`${table.tableName}\` table.`);
              } catch (myErr) {
                console.warn(`Notice MySQL column add ${col.name} to \`${table.tableName}\`:`, myErr.message);
              }
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
        for (const table of tableMigrations) {
          const tableEscaped = table.tableName === 'order' || table.tableName === 'user' ? `"${table.tableName}"` : table.tableName;
          for (const col of table.columns) {
            try {
              await pgPool.query(`ALTER TABLE ${tableEscaped} ADD COLUMN IF NOT EXISTS ${col.name} ${col.pg}`);
            } catch (pgErr) {
              console.warn(`Notice PG column add ${col.name} to ${tableEscaped}:`, pgErr.message);
            }
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
      // Only seed fallback products when the product table is completely empty.
      // Never recreate products that were intentionally deleted.
      const countResult = await this.query(
        "SELECT COUNT(*) as cnt FROM product"
      );
  
      const productCount = Number(countResult[0]?.cnt || 0);
  
      if (productCount > 0) {
        console.log(
          `✓ Product table already contains ${productCount} products. Skipping fallback product seeding.`
        );
        return;
      }
  
      if (!Array.isArray(fallbackProducts) || fallbackProducts.length === 0) {
        console.log("✓ No fallback products available for seeding.");
        return;
      }
  
      let nextId = 1;
  
      const productsToInsert = fallbackProducts;
  
      console.log(
        `🌱 Product table is empty. Seeding ${productsToInsert.length} fallback products...`
      );
  
      for (const p of productsToInsert) {
        const currentId =
          p.id && p.id >= nextId ? p.id : nextId++;
  
        if (currentId >= nextId) {
          nextId = currentId + 1;
        }
  
        await this.execute(
          `INSERT INTO product (
            id,
            code,
            name_en,
            name_hi,
            category,
            sub_en,
            sub_hi,
            price,
            original_price,
            discount_tag,
            image_url,
            stock_count,
            unit,
            unit_prices,
            pack_en,
            pack_hi
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
  
      console.log(
        `✓ Fallback product seeding completed! Inserted ${productsToInsert.length} products.`
      );
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
          points: 200,
          isPrimeActive: false
        }
      ];

      // Check current rows in customer table
      let existingCustRows = [];
      try {
        existingCustRows = await this.query("SELECT * FROM customer");
      } catch (e) {}

      // Group and clean customers to deduplicate by phone and guarantee valid positive IDs
      const custByPhone = new Map();
      let maxCustId = 100;

      for (const row of existingCustRows) {
        if (row.id && Number(row.id) > maxCustId) {
          maxCustId = Number(row.id);
        }
      }

      for (const row of existingCustRows) {
        const cleanP = String(row.phone || "").replace(/\D/g, "").slice(-10);
        if (!cleanP) continue;
        
        if (!custByPhone.has(cleanP)) {
          custByPhone.set(cleanP, {
            id: row.id && Number(row.id) > 0 ? Number(row.id) : null,
            name: row.name || `Customer ${cleanP.slice(-4)}`,
            phone: row.phone,
            email: row.email || "",
            address: row.address || "",
            status: row.status || "Active",
            registeredAt: row.registered_at || new Date().toISOString(),
            points: Number(row.points || 100),
            isPrimeActive: Boolean(row.is_prime_active),
            primeMembershipNo: row.prime_membership_no || "",
            dob: row.dob || "",
            anniversary: row.anniversary || ""
          });
        } else {
          // Merge stats if duplicate entry existed
          const existing = custByPhone.get(cleanP);
          if (!existing.id && row.id && Number(row.id) > 0) {
            existing.id = Number(row.id);
          }
          if (row.name && (!existing.name || existing.name.startsWith("Customer "))) {
            existing.name = row.name;
          }
          if (row.address && !existing.address) existing.address = row.address;
          if (row.email && !existing.email) existing.email = row.email;
          if (row.prime_membership_no && !existing.primeMembershipNo) existing.primeMembershipNo = row.prime_membership_no;
          if (row.is_prime_active) existing.isPrimeActive = true;
        }
      }

      // Ensure every customer has a unique ID and recalculate accurate order count & total spent from orders
      const cleanCustomerList = [];
      for (const [cleanP, cust] of custByPhone.entries()) {
        if (!cust.id || cust.id <= 0) {
          maxCustId += 1;
          cust.id = maxCustId;
        }


        cleanCustomerList.push(cust);
      }

      // Re-sync customer table: delete duplicates and upsert clean records
      for (const c of cleanCustomerList) {
        try {
          const cleanP = String(c.phone || "").replace(/\D/g, "").slice(-10);
          // Delete any duplicate null or wrong id rows for this phone
          await this.execute(
            `DELETE FROM customer WHERE (id != ? OR id IS NULL) AND (REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ? OR phone = ?)`,
            [c.id, `%${cleanP}%`, c.phone]
          );

          const ex = await this.query("SELECT id FROM customer WHERE id = ?", [c.id]);
          if (ex && ex.length > 0) {
            await this.execute(
              `UPDATE customer SET name = ?, phone = ?, email = ?, address = ?, status = ?, points = ?, is_prime_active = ?, prime_membership_no = ?, dob = ?, anniversary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [c.name, c.phone, c.email || '', c.address || '', c.status || 'Active', c.points, c.isPrimeActive ? 1 : 0, c.primeMembershipNo || '', c.dob || '', c.anniversary || '', c.id]
            );
          } else {
            await this.execute(
              `INSERT INTO customer (id, name, phone, email, address, status, registered_at, points, is_prime_active, prime_membership_no, dob, anniversary)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [c.id, c.name, c.phone, c.email || '', c.address || '', c.status || 'Active', c.registeredAt || new Date().toISOString(), c.points, c.isPrimeActive ? 1 : 0, c.primeMembershipNo || '', c.dob || '', c.anniversary || '']
            );
          }
        } catch (syncErr) {
          console.warn("Notice updating clean customer:", syncErr.message);
        }
      }

      // ENFORCE PROPER ID MAPPING ON ALL ORDERS
      for (const c of cleanCustomerList) {
        const cleanP = String(c.phone || "").replace(/\D/g, "").slice(-10);
        if (cleanP) {
          await this.execute(
            `UPDATE "order" SET customer_id = ?, user_id = ?, customer_name = ? 
             WHERE (customer_id IS NULL OR user_id IS NULL OR user_id = 0 OR customer_id != ?) 
               AND (
                 REPLACE(REPLACE(REPLACE(customer_phone, ' ', ''), '-', ''), '+', '') LIKE ? 
                 OR customer_phone = ?
               )`,
            [c.id, c.id, c.name, c.id, `%${cleanP}%`, c.phone]
          );
        }
      }
      console.log(`✓ Synchronized ${cleanCustomerList.length} customers and mapped order IDs cleanly.`);
    } catch (err) {
      console.warn("Notice in syncCustomerTableAndOrders:", err.message);
    }
  },

  // Debounced snapshot saving to protect disk I/O and prevent concurrent file corruption
  _snapshotTimeout: null,
  _snapshotPromise: null,

  async savePersistentSnapshot(immediate = false) {
    if (!immediate && this._snapshotTimeout) {
      clearTimeout(this._snapshotTimeout);
    }

    const runSave = async () => {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const snapshotDir = path.join(process.cwd(), "database");
        const snapshotPath = path.join(snapshotDir, "persistent_store.json");

        if (!fs.existsSync(snapshotDir)) {
          fs.mkdirSync(snapshotDir, { recursive: true });
        }

        const products = await this.query("SELECT * FROM product");
        const orders = await this.query('SELECT * FROM "order"');
        const orderItems = await this.query("SELECT * FROM order_item");
        const customers = await this.query("SELECT * FROM customer WHERE id IS NOT NULL AND id > 0");
        const users = await this.query('SELECT * FROM "user"');
        const partners = await this.query("SELECT * FROM partner");
        const reviews = await this.query("SELECT * FROM review");
        const appSettings = await this.query("SELECT * FROM app_settings");
        const paymentSettings = await this.query("SELECT * FROM payment_settings");
        const margSettings = await this.query("SELECT * FROM marg_settings");
        const whatsappSettings = await this.query("SELECT * FROM whatsapp_settings");
        const notifications = await this.query("SELECT * FROM notification");
        const roles = await this.query("SELECT * FROM role");

        // Safety check: Never overwrite a populated persistent store with an empty one
        if (fs.existsSync(snapshotPath)) {
          try {
            const existingRaw = fs.readFileSync(snapshotPath, "utf-8");
            const existingData = JSON.parse(existingRaw);
            const existingProds = existingData?.tables?.product?.length || 0;
            if (products.length === 0 && existingProds > 0) {
              console.warn(`⚠️ Skipped snapshot overwrite: DB returned 0 products while existing store has ${existingProds} products.`);
              return;
            }
          } catch (pe) {}
        }

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
            marg_settings: margSettings,
            whatsapp_settings: whatsappSettings,
            notification: notifications,
            role: roles
          }
        };

        const tempPath = `${snapshotPath}.tmp.${Date.now()}`;
        fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), "utf-8");
        fs.renameSync(tempPath, snapshotPath);
        console.log(`✓ Persistent snapshot saved at ${snapshotPath} (${orders.length} orders, ${products.length} products, ${customers.length} customers)`);
      } catch (err) {
        console.warn("Notice in savePersistentSnapshot:", err.message);
      }
    };

    if (immediate) {
      return runSave();
    }

    return new Promise((resolve) => {
      this._snapshotTimeout = setTimeout(async () => {
        await runSave();
        resolve();
      }, 250);
    });
  },

  // Rehydrate state on fresh deployment
  async rehydrateFromPersistentSnapshot() {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const snapshotPath = path.join(process.cwd(), "database", "persistent_store.json");

      let targetPath = snapshotPath;
      const templatePath = path.join(process.cwd(), "database", "persistent_store.template.json");

      if (!fs.existsSync(targetPath)) {
        if (fs.existsSync(templatePath)) {
          targetPath = templatePath;
          try {
            fs.copyFileSync(templatePath, snapshotPath);
          } catch (e) {}
        } else {
          return;
        }
      }

      const raw = fs.readFileSync(targetPath, "utf-8");
      const data = JSON.parse(raw);
      if (!data || !data.tables) return;

      const { tables } = data;

      // 1. Rehydrate Products if table is empty or missing snapshot items
      if (Array.isArray(tables.product) && tables.product.length > 0) {
        const prodCountRows = await this.query("SELECT COUNT(*) as cnt FROM product");
        const prodCount = Number(prodCountRows[0]?.cnt || prodCountRows[0]?.['count(*)'] || 0);

        if (prodCount === 0) {
          console.log(`📥 Rehydrating ${tables.product.length} products from persistent snapshot...`);
          for (const p of tables.product) {
            try {
              await this.execute(
                `INSERT INTO product (
                  id, code, name_en, name_hi, category, sub_en, sub_hi,
                  price, original_price, discount_tag, image_url, stock_count,
                  unit, unit_prices, pack_en, pack_hi, gst_percent, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  p.id, p.code || '', p.name_en, p.name_hi, p.category, p.sub_en || '', p.sub_hi || '',
                  p.price, p.original_price || p.price, p.discount_tag || '', p.image_url || '',
                  p.stock_count !== undefined ? p.stock_count : 100, p.unit || '',
                  typeof p.unit_prices === 'object' ? JSON.stringify(p.unit_prices) : (p.unit_prices || ''),
                  p.pack_en || '', p.pack_hi || '', p.gst_percent !== undefined ? p.gst_percent : 5,
                  p.created_at || new Date().toISOString(), p.updated_at || new Date().toISOString()
                ]
              );
            } catch (pe) {}
          }
        }
      }

      // 2. Rehydrate Orders
      const currentOrders = await this.query('SELECT COUNT(*) as cnt FROM "order"');
      const orderCount = Number(currentOrders[0]?.cnt || currentOrders[0]?.['count(*)'] || 0);

      if (orderCount === 0 && Array.isArray(tables.order) && tables.order.length > 0) {
        console.log(`📥 Rehydrating ${tables.order.length} orders from persistent snapshot...`);
        for (const o of tables.order) {
          try {
            await this.execute(
              `INSERT INTO "order" (
                id, customer_id, user_id, order_date, is_active, step_level, status_label,
                delivery_partner_name, delivery_partner_phone, dispatch_hub, eta_status,
                grand_total, subtotal, delivery_fee, gst_amount, customer_name, customer_phone,
                customer_email, shipping_address, referral_discount, applied_points, coupon_discount,
                coupon_code, celebration_discount, celebration_offer_name, payment_method, payment_status,
                total, delivery_staff_id, cod_status, cod_settled_at, cod_cleared_by, cod_settlement_note
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                o.id, o.customer_id || o.user_id || null, o.user_id || null, o.order_date || new Date().toISOString(),
                o.is_active ? 1 : 0, o.step_level || 0, o.status_label || 'Placed',
                o.delivery_partner_name || '', o.delivery_partner_phone || '', o.dispatch_hub || '', o.eta_status || '',
                o.grand_total || o.total || 0, o.subtotal || 0, o.delivery_fee || 0, o.gst_amount || 0,
                o.customer_name || '', o.customer_phone || '', o.customer_email || '', o.shipping_address || '',
                o.referral_discount || 0, o.applied_points || 0, o.coupon_discount || 0, o.coupon_code || '',
                o.celebration_discount || 0, o.celebration_offer_name || '', o.payment_method || 'COD',
                o.payment_status || 'UNPAID', o.total || o.grand_total || 0, o.delivery_staff_id || null,
                o.cod_status || null, o.cod_settled_at || null, o.cod_cleared_by || null, o.cod_settlement_note || null
              ]
            );
          } catch (oe) {}
        }
      }

      // 3. Rehydrate Order Items
      if (Array.isArray(tables.order_item) && tables.order_item.length > 0) {
        const currentItems = await this.query('SELECT COUNT(*) as cnt FROM order_item');
        const itemCount = Number(currentItems[0]?.cnt || currentItems[0]?.['count(*)'] || 0);
        if (itemCount === 0) {
          for (const item of tables.order_item) {
            try {
              await this.execute(
                `INSERT INTO order_item (id, order_id, product_id, name_en, name_hi, price, qty, weight_label)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [item.id || null, item.order_id, item.product_id, item.name_en, item.name_hi, item.price, item.qty, item.weight_label]
              );
            } catch (ie) {}
          }
        }
      }

      // 4. Rehydrate Customers
      if (Array.isArray(tables.customer) && tables.customer.length > 0) {
        for (const c of tables.customer) {
          if (!c.id) continue;
          try {
            const ex = await this.query("SELECT id FROM customer WHERE id = ?", [c.id]);
            if (ex.length === 0) {
              await this.execute(
                `INSERT INTO customer (id, name, phone, email, address, status, registered_at, is_prime_active, prime_membership_no, dob, anniversary)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  c.id, c.name, c.phone, c.email || '', c.address || '', c.status || 'Active',
                  c.registered_at || new Date().toISOString(),
                  c.points || 100, c.is_prime_active ? 1 : 0, c.prime_membership_no || '', c.dob || '', c.anniversary || ''
                ]
              );
            }
          } catch (ce) {}
        }
      }

      // 5. Rehydrate Staff and Users
      const userCountRows = await this.query('SELECT COUNT(*) as cnt FROM "user"');
      const userCount = Number(userCountRows[0]?.cnt || userCountRows[0]?.['count(*)'] || 0);
      if (userCount === 0) {
        if (Array.isArray(tables.user) && tables.user.length > 0) {
          for (const u of tables.user) {
            try {
              await this.execute(
                `INSERT INTO "user" (id, role_id, full_name, phone_number, email, password_hash, permissions, status, is_master_admin, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  u.id, u.role_id, u.full_name, u.phone_number, u.email || '', u.password_hash || 'user123',
                  typeof u.permissions === 'object' ? JSON.stringify(u.permissions) : (u.permissions || '[]'),
                  u.status || 'Active', u.is_master_admin ? 1 : 0, u.created_at || new Date().toISOString(), u.updated_at || new Date().toISOString()
                ]
              );
            } catch (ue) {}
          }
        }
        // If still no staff in user table, seed default staff members
        const staffCheck = await this.query('SELECT COUNT(*) as cnt FROM "user" WHERE role_id != 1');
        const staffCount = Number(staffCheck[0]?.cnt || staffCheck[0]?.['count(*)'] || 0);
        if (staffCount === 0) {
          const defaultStaff = [
            { id: 1, name: "Balram Patidar", mobile: "9999999999", role_id: 2, password: "admin", permissions: JSON.stringify(["dashboard", "products", "categories", "orders", "inventory", "delivery", "customers", "whatsapp", "settings", "pos", "staff", "reports"]), is_master: 1 },
            { id: 2, name: "Suresh Mehra", mobile: "9811122334", role_id: 4, password: "staff", permissions: JSON.stringify(["delivery"]), is_master: 0 },
            { id: 3, name: "Vikram Singh", mobile: "9876543210", role_id: 4, password: "staff", permissions: JSON.stringify(["delivery", "orders"]), is_master: 0 },
            { id: 4, name: "Rahul Verma", mobile: "9898989898", role_id: 4, password: "staff", permissions: JSON.stringify(["delivery"]), is_master: 0 }
          ];
          for (const s of defaultStaff) {
            try {
              await this.execute(
                `INSERT INTO "user" (id, role_id, full_name, phone_number, password_hash, permissions, status, is_master_admin)
                 VALUES (?, ?, ?, ?, ?, ?, 'Active', ?)`,
                [s.id, s.role_id, s.name, s.mobile, s.password, s.permissions, s.is_master]
              );
            } catch (se) {}
          }
        }
      }

      // 6. Rehydrate Partners
      const partnerCountRows = await this.query("SELECT COUNT(*) as cnt FROM partner");
      const partnerCount = Number(partnerCountRows[0]?.cnt || partnerCountRows[0]?.['count(*)'] || 0);
      if (partnerCount === 0 && Array.isArray(tables.partner) && tables.partner.length > 0) {
        for (const p of tables.partner) {
          try {
            await this.execute(
              `INSERT INTO partner (id, name_en, name_hi, role_en, role_hi, location_en, location_hi, items_en, items_hi, since_year, quote_en, quote_hi, image_url)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [p.id, p.name_en, p.name_hi, p.role_en, p.role_hi, p.location_en, p.location_hi, p.items_en, p.items_hi, p.since_year, p.quote_en, p.quote_hi, p.image_url]
            );
          } catch (pe) {}
        }
      }

      // 7. Rehydrate Reviews
      const reviewCountRows = await this.query("SELECT COUNT(*) as cnt FROM review");
      const reviewCount = Number(reviewCountRows[0]?.cnt || reviewCountRows[0]?.['count(*)'] || 0);
      if (reviewCount === 0 && Array.isArray(tables.review) && tables.review.length > 0) {
        for (const r of tables.review) {
          try {
            await this.execute(
              `INSERT INTO review (id, user_id, author_name, rating, comment_en, comment_hi, verified_purchase)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [r.id, r.user_id || 1, r.author_name, r.rating, r.comment_en, r.comment_hi, r.verified_purchase ? 1 : 0]
            );
          } catch (re) {}
        }
      }

      // 8. Rehydrate App Settings (Banners, Categories, Locations, etc.)
      if (Array.isArray(tables.app_settings) && tables.app_settings.length > 0) {
        for (const s of tables.app_settings) {
          try {
            const ex = await this.query("SELECT key_name FROM app_settings WHERE key_name = ?", [s.key_name]);
            if (ex.length === 0) {
              await this.execute(
                "INSERT INTO app_settings (key_name, value_text) VALUES (?, ?)",
                [s.key_name, s.value_text]
              );
            }
          } catch (se) {}
        }
      }

      // 9. Rehydrate Payment Settings
      if (Array.isArray(tables.payment_settings) && tables.payment_settings.length > 0) {
        const ps = tables.payment_settings[0];
        try {
          const ex = await this.query("SELECT id FROM payment_settings WHERE id = 1");
          if (ex.length === 0) {
            await this.execute(
              `INSERT INTO payment_settings (id, enabled, app_id, secret_key, environment, razorpay_enabled, razorpay_key_id, razorpay_key_secret, active_gateway)
               VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [ps.enabled ? 1 : 0, ps.app_id || '', ps.secret_key || '', ps.environment || 'TEST', ps.razorpay_enabled ? 1 : 0, ps.razorpay_key_id || '', ps.razorpay_key_secret || '', ps.active_gateway || 'RAZORPAY']
            );
          }
        } catch (pse) {}
      }

      // 10. Rehydrate MARG Settings
      if (Array.isArray(tables.marg_settings) && tables.marg_settings.length > 0) {
        const ms = tables.marg_settings[0];
        try {
          const ex = await this.query("SELECT id FROM marg_settings WHERE id = 1");
          if (ex.length === 0) {
            await this.execute(
              `INSERT INTO marg_settings (id, api_token, points_ratio, auto_notify_whatsapp, simulate_delay)
               VALUES (1, ?, ?, ?, ?)`,
              [ms.api_token || '', ms.points_ratio || 10, ms.auto_notify_whatsapp ? 1 : 0, ms.simulate_delay || 0]
            );
          }
        } catch (mse) {}
      }

      // 11. Rehydrate WhatsApp Settings
      if (Array.isArray(tables.whatsapp_settings) && tables.whatsapp_settings.length > 0) {
        const ws = tables.whatsapp_settings[0];
        try {
          const ex = await this.query("SELECT id FROM whatsapp_settings WHERE id = 1");
          if (ex.length === 0) {
            await this.execute(
              `INSERT INTO whatsapp_settings (id, meta_phone_number_id, meta_access_token, meta_business_account_id, meta_template_name, twilio_account_sid, twilio_auth_token, twilio_whatsapp_from, enabled)
               VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [ws.meta_phone_number_id || '', ws.meta_access_token || '', ws.meta_business_account_id || '', ws.meta_template_name || '', ws.twilio_account_sid || '', ws.twilio_auth_token || '', ws.twilio_whatsapp_from || '', ws.enabled ? 1 : 0]
            );
          }
        } catch (wse) {}
      }

      // 12. Rehydrate Notifications
      if (Array.isArray(tables.notification) && tables.notification.length > 0) {
        const notifCountRows = await this.query("SELECT COUNT(*) as cnt FROM notification");
        const notifCount = Number(notifCountRows[0]?.cnt || notifCountRows[0]?.['count(*)'] || 0);
        if (notifCount === 0) {
          for (const n of tables.notification) {
            try {
              await this.execute(
                `INSERT INTO notification (id, recipient_role, recipient_phone, order_id, title_en, title_hi, message_en, message_hi, type, is_read, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [n.id || null, n.recipient_role, n.recipient_phone, n.order_id, n.title_en, n.title_hi, n.message_en, n.message_hi, n.type || 'order_update', n.is_read ? 1 : 0, n.created_at || new Date().toISOString()]
              );
            } catch (ne) {}
          }
        }
      }

      console.log("✓ Completed state rehydration from persistent snapshot.");
    } catch (err) {
      console.warn("Notice in rehydrateFromPersistentSnapshot:", err.message);
    }
  }
};

export default db;
