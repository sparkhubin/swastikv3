import dotenv from "dotenv";
dotenv.config();
import { createServer } from "./server/app.js";

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  const app = await createServer();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Critical server bootstrap failure:", err);
  process.exit(1);
});
