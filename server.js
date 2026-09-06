import dotenv from "dotenv";
dotenv.config();
import { createServer } from "./server/app.js";
import { db } from "./database/db.js";

const PORT = 3000;

async function bootstrap() {
  const app = await createServer();
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}, safely flushing persistent snapshot...`);
    try {
      if (db.savePersistentSnapshot) {
        await db.savePersistentSnapshot();
      }
    } catch (e) {
      console.warn("Notice saving persistent snapshot on shutdown:", e.message);
    }
    server.close(() => {
      console.log("✓ Server closed cleanly.");
      process.exit(0);
    });
    // Force close if lingering handles after 3s
    setTimeout(() => process.exit(0), 3000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("Critical server bootstrap failure:", err);
  process.exit(1);
});
