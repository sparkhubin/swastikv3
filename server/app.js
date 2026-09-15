import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "../database/db.js";
import cors from "cors";
import { uploadsDir } from "./utils.js";

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
import cartRouter from "./routes/cart.js";

export async function createServer() {
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
    next();
  });
  if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
  const configuredOrigins = String(process.env.CORS_ORIGINS || process.env.PUBLIC_APP_URL || "")
    .split(",").map(value => value.trim()).filter(Boolean);
  if (process.env.NODE_ENV !== "production") configuredOrigins.push("http://localhost:3000", "http://127.0.0.1:3000");
  const corsOptions = {
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Customer-Token", "X-Requested-With", "X-Marg-Token", "X-Razorpay-Signature", "X-Webhook-Signature", "X-Webhook-Timestamp"],
    credentials: true,
  };
  const corsMiddleware = (req, res, next) => cors({
    ...corsOptions,
    origin(origin, callback) {
      const requestOrigin = `${req.protocol}://${req.get("host")}`;
      if (!origin || origin === requestOrigin || configuredOrigins.includes(origin)) return callback(null, true);
      const error = new Error("Origin is not allowed by CORS policy");
      error.status = 403;
      callback(error);
    }
  })(req, res, next);
  app.use(corsMiddleware);
  app.options("*", corsMiddleware);
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
  app.use(express.json({
    limit: "1mb",
    verify: (req, _res, buffer) => {
      req.rawBody = Buffer.from(buffer);
    }
  }));

  const rateBuckets = new Map();
  const rateLimit = (limit, windowMs) => (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > limit) return res.status(429).json({ error: "Too many requests. Please try again later." });
    next();
  };
  app.use(["/api/auth/staff/login", "/api/auth/customer/login", "/api/auth/otp/send", "/api/auth/otp/verify"], rateLimit(100, 15 * 60_000));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/log-error", rateLimit(5, 60_000), (req, res) => {
    const message = String(req.body?.message || "Client error").slice(0, 500);
    console.error("Client error report:", message);
    res.status(204).end();
  });

  // --- Initialize SQL Database ---
  await db.init();
  console.log(`SQL database initialized: ${db.engine}`);

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
  app.use("/api", cartRouter);
  app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found." }));

  app.use((error, _req, res, _next) => {
    if (error.status !== 403) console.error("Unhandled request error:", error.message);
    if (!res.headersSent) res.status(error.status || 500).json({ error: error.status === 403 ? "Origin is not allowed." : "Internal server error." });
  });

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
