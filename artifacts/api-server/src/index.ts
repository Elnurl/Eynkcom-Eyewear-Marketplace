import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@workspace/db";
import app from "./app";
import { seedHorizonCatalogIfEnabled } from "./lib/horizonCatalogSeed";
import { logger } from "./lib/logger";
import { isObjectStorageConfigured } from "./lib/objectStorage";

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
  const missing = ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"].filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

async function start(): Promise<void> {
  if (process.env.RUN_MIGRATIONS !== "false") {
    const migrationsFolder = process.env.MIGRATIONS_DIR ?? path.resolve(__dirname, "migrations");
    await migrate(db, { migrationsFolder });
    logger.info({ migrationsFolder }, "Database migrations applied");
    await seedHorizonCatalogIfEnabled();
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    if (isObjectStorageConfigured()) {
      logger.info("Product images use S3-compatible object storage");
    } else {
      const uploadDir = process.env.PRODUCT_UPLOAD_DIR?.trim() || path.join(process.cwd(), ".product-uploads");
      logger.warn(
        { uploadDir },
        "S3 is not configured; product images use local disk. Mount a persistent volume on PRODUCT_UPLOAD_DIR or set S3_* env vars.",
      );
    }
    logger.info({ port }, "Server listening");
  });
}

start().catch((err) => {
  logger.error({ err }, "Server failed to start");
  process.exit(1);
});
