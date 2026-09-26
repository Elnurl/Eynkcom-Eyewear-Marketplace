import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@workspace/db";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (process.env.NODE_ENV === "production") {
  const missing = ["CLERK_SECRET_KEY", "CLERK_PUBLISHABLE_KEY"].filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

async function start(): Promise<void> {
  if (process.env.RUN_MIGRATIONS !== "false") {
    const migrationsFolder = process.env.MIGRATIONS_DIR ?? path.resolve(__dirname, "migrations");
    await migrate(db, { migrationsFolder });
    logger.info({ migrationsFolder }, "Database migrations applied");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

start().catch((err) => {
  logger.error({ err }, "Server failed to start");
  process.exit(1);
});
