import dotenv from "dotenv";
dotenv.config();
import { createServer } from "./server/app.js";
import { db } from "./database/db.js";

const PORT = Number(process.env.PORT || 3000);

async function bootstrap() {
  const app = await createServer();
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\nReceived ${signal}; closing server and database...`);
    try {
      await new Promise((resolve) => server.close(resolve));
      await db.close();
    } catch (e) {
      console.warn("Database close failed:", e.message);
    }
    console.log("Server closed cleanly.");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("Critical server bootstrap failure:", err);
  process.exit(1);
});
