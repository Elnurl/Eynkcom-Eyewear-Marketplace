import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Inquiry attachments from any signed-in user (not tied to a seller catalog upload). */
export const supportImageUploadsTable = pgTable("support_image_uploads", {
  objectPath: text("object_path").primaryKey(),
  ownerId: text("owner_id").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
});
