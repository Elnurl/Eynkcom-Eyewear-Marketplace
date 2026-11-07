import { customType, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/** Image bytes that must survive Render's ephemeral disk. */
export const storedObjectsTable = pgTable("stored_objects", {
  objectPath: text("object_path").primaryKey(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  body: bytea("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
