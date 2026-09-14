import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";

const REQUIRED_SCHEMA = {
  role: ["id", "name", "is_system"],
  permission: ["id", "code", "module"],
  role_permission: ["role_id", "permission_id"],
  user: ["id", "phone_number", "password_hash", "role_id", "status", "is_master_admin"],
  user_session: ["user_id", "token_hash", "expires_at", "revoked_at"],
  customer: ["id", "phone", "password_hash", "status"],
  customer_session: ["customer_id", "token_hash", "expires_at", "revoked_at"],
  customer_otp: ["phone", "otp_hash", "expires_at", "attempts", "consumed_at"],
  product: ["id", "code", "price", "gst_percent", "is_active"],
  inventory: ["product_id", "stock_qty", "reserved_qty"],
  stock_movement: ["product_id", "type", "before_qty", "after_qty"],
  cart: ["id", "customer_id", "coupon_code"],
  cart_item: ["cart_id", "product_id", "qty", "weight_label", "unit_price"],
  order: ["id", "customer_id", "grand_total", "payment_status", "status"],
  order_item: ["order_id", "product_id", "price", "qty", "gst_percent", "line_total"],
  payment_settings: ["gateway", "enabled", "key_id", "secret_key", "app_id", "app_secret"],
  payment_transaction: ["order_id", "customer_id", "gateway_order_id", "status"],
  customer_points: ["customer_id", "points", "type", "reference_id"],
  membership_plan: ["id", "duration_days", "price"],
  customer_membership: ["customer_id", "membership_plan_id", "status"],
  notification: ["recipient_type", "recipient_id", "is_read"],
  delivery_staff: ["user_id", "status"],
  delivery_assignment: ["order_id", "delivery_staff_id", "status"],
  whatsapp_settings: ["provider", "enabled"],
  whatsapp_template: ["purpose", "meta_template_name"],
  whatsapp_log: ["recipient_phone", "status", "event_type"],
  app_settings: ["key_name", "value_text"],
  audit_log: ["actor_type", "actor_id", "action", "entity_type"]
};

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

class SQLiteAdapter {
  constructor(filename) {
    this.filename = filename;
    this.connection = null;
    this.transactionTail = Promise.resolve();
  }

  async init() {
    if (this.connection) return;
    if (!fs.existsSync(this.filename)) throw new Error(`Database file is missing: ${this.filename}`);
    this.connection = await new Promise((resolve, reject) => {
      const connection = new sqlite3.Database(this.filename, sqlite3.OPEN_READWRITE, error => {
        if (error) reject(error); else resolve(connection);
      });
    });
    await this.run("PRAGMA foreign_keys = ON");
    await this.run("PRAGMA busy_timeout = 5000");
    const foreignKeys = await this.get("PRAGMA foreign_keys");
    if (Number(foreignKeys?.foreign_keys) !== 1) throw new Error("SQLite foreign keys could not be enabled");
    await this.validateSchema();
  }

  rawAll(sql, params = []) {
    return new Promise((resolve, reject) => this.connection.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows || [])));
  }

  rawGet(sql, params = []) {
    return new Promise((resolve, reject) => this.connection.get(sql, params, (error, row) => error ? reject(error) : resolve(row)));
  }

  rawRun(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.connection.run(sql, params, function onRun(error) {
        if (error) reject(error); else resolve({ lastID: this.lastID ?? null, changes: this.changes ?? 0 });
      });
    });
  }

  all(sql, params = []) { return this.transactionTail.then(() => this.rawAll(sql, params)); }
  get(sql, params = []) { return this.transactionTail.then(() => this.rawGet(sql, params)); }
  run(sql, params = []) { return this.transactionTail.then(() => this.rawRun(sql, params)); }

  async validateSchema() {
    for (const [table, requiredColumns] of Object.entries(REQUIRED_SCHEMA)) {
      const columns = await this.all(`PRAGMA table_xinfo(${quoteIdentifier(table)})`);
      const names = new Set(columns.map(column => column.name));
      const missing = requiredColumns.filter(column => !names.has(column));
      if (!columns.length || missing.length) throw new Error(`Database schema mismatch for ${table}; missing: ${missing.join(", ") || "table"}`);
    }
    const integrity = await this.get("PRAGMA quick_check");
    if (integrity?.quick_check !== "ok") throw new Error("SQLite integrity check failed");
    const foreignKeyViolation = (await this.all("PRAGMA foreign_key_check"))[0];
    if (foreignKeyViolation) throw new Error("SQLite foreign-key check failed");
  }

  transaction(work) {
    const executeTransaction = async () => {
      await this.rawRun("BEGIN IMMEDIATE");
      const transaction = {
        query: (sql, params) => this.rawAll(sql, params),
        get: (sql, params) => this.rawGet(sql, params),
        execute: (sql, params) => this.rawRun(sql, params)
      };
      try {
        const result = await work(transaction);
        await this.rawRun("COMMIT");
        return result;
      } catch (error) {
        try { await this.rawRun("ROLLBACK"); } catch (rollbackError) { console.error("Database rollback failed:", rollbackError.message); }
        throw error;
      }
    };
    const current = this.transactionTail.then(executeTransaction, executeTransaction);
    this.transactionTail = current.catch(() => undefined);
    return current;
  }

  async close() {
    if (!this.connection) return;
    await this.transactionTail;
    const connection = this.connection;
    this.connection = null;
    await new Promise((resolve, reject) => connection.close(error => error ? reject(error) : resolve()));
  }
}

const defaultDatabase = path.join(process.cwd(), "swastik_local_final.db");
const adapter = new SQLiteAdapter(path.resolve(process.env.DATABASE_PATH || defaultDatabase));

export const db = {
  engine: "sqlite",
  filename: adapter.filename,
  init: () => adapter.init(),
  query: (sql, params = []) => adapter.all(sql, params),
  get: (sql, params = []) => adapter.get(sql, params),
  execute: (sql, params = []) => adapter.run(sql, params),
  transaction: work => adapter.transaction(work),
  close: () => adapter.close()
};
