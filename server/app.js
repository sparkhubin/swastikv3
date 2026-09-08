import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { db } from "../database/db.js";
import cors from "cors";
import { 
  uploadsDir, 
  fallbackProducts, 
  fallbackPartners, 
  fallbackReviews, 
  fallbackOrders 
} from "./utils.js";

// Route imports
import productsRouter from "./routes/products.js";
import partnersRouter from "./routes/partners.js";
import reviewsRouter from "./routes/reviews.js";
import ordersRouter from "./routes/orders.js";
import authRouter from "./routes/auth.js";
import paymentRouter from "./routes/payment.js";
import whatsappRouter from "./routes/whatsapp.js";
import margRouter from "./routes/marg.js";
import configRouter from "./routes/config.js";
import settingsRouter from "./routes/settings.js";
import customersRouter from "./routes/customers.js";
import backupRouter from "./routes/backup.js";
import notificationsRouter from "./routes/notifications.js";
import staffRouter from "./routes/staff.js";

export async function createServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  }));
  
  app.options("*", cors());
  // Serve uploaded assets statically with long-term browser cache (30 days)
  app.use("/uploads", express.static(uploadsDir, {
    maxAge: "30d",
    immutable: true,
    etag: true,
    lastModified: true,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
    }
  }));
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Client error logger to help debug local/preview environment issues
  app.post("/api/log-error", (req, res) => {
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        userAgent: req.headers["user-agent"],
        ...req.body
      };
      const logStr = JSON.stringify(errorLog, null, 2) + "\n---\n";
      fs.appendFileSync(path.join(process.cwd(), "client_errors.log"), logStr, "utf-8");
      console.error("🔴 [CLIENT ERROR DETECTED ON BROWSER]:", JSON.stringify(req.body, null, 2));
    } catch (e) {
      console.error("Failed to write client error log:", e);
    }
    res.json({ status: "ok" });
  });

  // --- Initialize and Seed SQL Database ---
  try {
    await db.init();
    // Seeding commented out to prevent automatic overrides on production
    await db.seedProductsIfEmpty(fallbackProducts);
    await db.seedPartnersIfEmpty(fallbackPartners);
    await db.seedReviewsIfEmpty(fallbackReviews);
    await db.seedOrdersIfEmpty(fallbackOrders);
    console.log("🚀 SQL Database system fully initialized!");
  } catch (err) {
    console.error("❌ SQL Database Initialization Failed:", err.message);
  }

  // --- API Routes ---
  app.use("/api", productsRouter);
  app.use("/api", partnersRouter);
  app.use("/api", reviewsRouter);
  app.use("/api", ordersRouter);
  app.use("/api", authRouter);
  app.use("/api", paymentRouter);
  app.use("/api", whatsappRouter);
  app.use("/api", margRouter);
  app.use("/api", configRouter);
  app.use("/api", settingsRouter);
  app.use("/api", customersRouter);
  app.use("/api", backupRouter);
  app.use("/api", notificationsRouter);
  app.use("/api", staffRouter);

  // --- Vite Dev or Production Static Hosting ---
  if (process.env.NODE_ENV !== "production") {
    console.log("🛠️ Starting server in DEVELOPMENT mode with Vite integration...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("📦 Starting server in PRODUCTION mode with static build assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: "7d",
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          // Never cache index.html so updates are visible immediately on deploy
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else if (filePath.includes(`${path.sep}assets${path.sep}`) || filePath.includes("/assets/")) {
          // Bundled hashed assets are immutable
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    }));
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}
