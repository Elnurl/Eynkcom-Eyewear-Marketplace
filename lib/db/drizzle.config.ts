import { defineConfig } from "drizzle-kit";

// Paths are relative to lib/db, where the package scripts run.
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // `generate` only diffs the schema; `migrate`/`push` need a real database.
    url: process.env.DATABASE_URL ?? "postgres://localhost/unused",
  },
});
