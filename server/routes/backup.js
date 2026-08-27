import express from "express";
import { db } from "../../database/db.js";

const router = express.Router();

// 1. Export Full Database Backup JSON
router.get("/database/backup", async (req, res) => {
  try {
    const products = await db.query('SELECT * FROM product');
    const orders = await db.query('SELECT * FROM "order"');
    const orderItems = await db.query('SELECT * FROM order_item');
    const users = await db.query('SELECT * FROM "user"');
    const partners = await db.query('SELECT * FROM partner');
    const reviews = await db.query('SELECT * FROM review');
    const paymentSettings = await db.query('SELECT * FROM payment_settings');
    const appSettings = await db.query('SELECT * FROM app_settings');
    const margSettings = await db.query('SELECT * FROM marg_settings');

    const backupPayload = {
      status: "success",
      appName: "Swastik Supermarket",
      version: "1.0",
      exportTimestamp: new Date().toISOString(),
      databaseEngine: db.isPostgres ? "PostgreSQL" : "SQLite (swastik_local.db)",
      summary: {
        productsCount: products.length,
        ordersCount: orders.length,
        orderItemsCount: orderItems.length,
        usersCount: users.length,
        partnersCount: partners.length,
        reviewsCount: reviews.length,
        appSettingsCount: appSettings.length,
        paymentSettingsCount: paymentSettings.length,
        margSettingsCount: margSettings.length
      },
      tables: {
        product: products,
        order: orders,
        order_item: orderItems,
        user: users,
        partner: partners,
        review: reviews,
        payment_settings: paymentSettings,
        app_settings: appSettings,
        marg_settings: margSettings
      }
    };

    res.setHeader("Content-Disposition", `attachment; filename=swastik_db_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.setHeader("Content-Type", "application/json");
    res.json(backupPayload);
  } catch (err) {
    console.error("[Database Backup Error]:", err);
    res.status(500).json({ error: "Failed to generate database backup: " + err.message });
  }
});

// 2. Restore Database from Backup JSON
router.post("/database/restore", async (req, res) => {
  const { password, backupData } = req.body;

  if (password !== "admin123") {
    return res.status(401).json({ error: "Invalid Admin Password! Restore operation denied." });
  }

  if (!backupData || !backupData.tables) {
    return res.status(400).json({ error: "Invalid backup data structure. 'tables' node missing." });
  }

  const { tables } = backupData;
  const restoredCounts = {};

  try {
    // Restore Products if present
    if (Array.isArray(tables.product) && tables.product.length > 0) {
      await db.execute("DELETE FROM product");
      for (const p of tables.product) {
        await db.execute(
          `INSERT INTO product (id, name_en, name_hi, price, mrp, category, weight, unit, image_url, description_en, description_hi, rating, is_veg, brand, is_express, stock_count, unit_prices)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id, p.name_en, p.name_hi, p.price, p.mrp, p.category, p.weight, p.unit, p.image_url,
            p.description_en, p.description_hi, p.rating, p.is_veg ? 1 : 0, p.brand, p.is_express ? 1 : 0,
            p.stock_count || 100, p.unit_prices || ''
          ]
        );
      }
      restoredCounts.products = tables.product.length;
    }

    // Restore Orders & Items
    if (Array.isArray(tables.order) && tables.order.length > 0) {
      await db.execute("DELETE FROM order_item");
      await db.execute('DELETE FROM "order"');

      for (const o of tables.order) {
        await db.execute(
          `INSERT INTO "order" (id, user_id, order_date, is_active, step_level, status_label, delivery_partner_name, delivery_partner_phone, hub_name, total_amount, subtotal_amount, delivery_fee, gst_amount, customer_name, customer_phone, delivery_address, referral_discount, applied_points, coupon_discount, coupon_code, celebration_discount, celebration_offer_name, customer_email, payment_method, payment_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            o.id, o.user_id, o.order_date, o.is_active ? 1 : 0, o.step_level, o.status_label,
            o.delivery_partner_name, o.delivery_partner_phone, o.hub_name, o.total_amount,
            o.subtotal_amount, o.delivery_fee, o.gst_amount, o.customer_name, o.customer_phone,
            o.delivery_address, o.referral_discount, o.applied_points, o.coupon_discount,
            o.coupon_code, o.celebration_discount, o.celebration_offer_name, o.customer_email,
            o.payment_method, o.payment_status
          ]
        );
      }
      restoredCounts.orders = tables.order.length;

      if (Array.isArray(tables.order_item)) {
        for (const item of tables.order_item) {
          await db.execute(
            `INSERT INTO order_item (order_id, product_id, name_en, name_hi, price, qty, weight_label)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [item.order_id, item.product_id, item.name_en, item.name_hi, item.price, item.qty, item.weight_label]
          );
        }
        restoredCounts.orderItems = tables.order_item.length;
      }
    }

    // Restore Partners
    if (Array.isArray(tables.partner) && tables.partner.length > 0) {
      await db.execute("DELETE FROM partner");
      for (const pt of tables.partner) {
        await db.execute(
          `INSERT INTO partner (id, name, phone, hub, is_online, total_deliveries, avatar)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [pt.id, pt.name, pt.phone, pt.hub, pt.is_online ? 1 : 0, pt.total_deliveries, pt.avatar]
        );
      }
      restoredCounts.partners = tables.partner.length;
    }

    // Restore Reviews
    if (Array.isArray(tables.review) && tables.review.length > 0) {
      await db.execute("DELETE FROM review");
      for (const rv of tables.review) {
        await db.execute(
          `INSERT INTO review (id, name, comment_en, comment_hi, rating, avatar, is_verified)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [rv.id, rv.name, rv.comment_en, rv.comment_hi, rv.rating, rv.avatar, rv.is_verified ? 1 : 0]
        );
      }
      restoredCounts.reviews = tables.review.length;
    }

    res.json({
      status: "success",
      message: "Database successfully restored from backup file!",
      restoredCounts
    });
  } catch (err) {
    console.error("[Database Restore Error]:", err);
    res.status(500).json({ error: "Restore operation failed: " + err.message });
  }
});

// 3. Database Status & Sync Endpoint
router.get("/database/status", async (req, res) => {
  try {
    let engine = "SQLite (Local File)";
    if (db.isMySQL) engine = "MySQL (Active Pool)";
    else if (db.isPostgres) engine = "PostgreSQL (Active Pool)";

    const productCount = await db.query("SELECT COUNT(*) as count FROM product");
    const orderCount = await db.query("SELECT COUNT(*) as count FROM " + (db.isMySQL ? "`order`" : '"order"'));

    res.json({
      success: true,
      activeEngine: engine,
      isMySQL: db.isMySQL,
      isPostgres: db.isPostgres,
      dualSyncEnabled: true,
      stats: {
        products: productCount[0]?.count || productCount[0]?.['count(*)'] || 0,
        orders: orderCount[0]?.count || orderCount[0]?.['count(*)'] || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Trigger Instant Migration Sync (SQLite -> MySQL)
router.post("/database/sync", async (req, res) => {
  try {
    const report = await db.syncDatabases("sqlite_to_mysql");
    res.json({
      success: true,
      message: "Databases successfully synchronized!",
      report
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
