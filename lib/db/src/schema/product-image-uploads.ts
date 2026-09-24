import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// A signed URL is only usable for its short lifetime; this record binds the
// uploaded object to the approved shop that requested it.
export const productImageUploadsTable = pgTable("product_image_uploads", {
  objectPath: text("object_path").primaryKey(),
  sellerId: text("seller_id").notNull(),
  ownerId: text("owner_id").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
});