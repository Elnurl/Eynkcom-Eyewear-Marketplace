import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sellerApplicationsTable = pgTable(
  "seller_applications",
  {
    id: text("id").primaryKey(),
    storeName: text("store_name").notNull(),
    ownerName: text("owner_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    business: text("business").notNull(),
    tax: text("tax").notNull().default(""),
    address: text("address").notNull(),
    instagram: text("instagram").notNull().default(""),
    website: text("website").notNull().default(""),
    categories: text("categories").notNull(),
    status: text("status").notNull().default("pending"),
    reviewNotes: text("review_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("seller_applications_email_idx").on(table.email),
    index("seller_applications_status_idx").on(table.status),
  ],
);

export const insertSellerApplicationSchema = createInsertSchema(
  sellerApplicationsTable,
).omit({ createdAt: true, updatedAt: true });

export type InsertSellerApplication = z.infer<typeof insertSellerApplicationSchema>;
export type SellerApplicationRecord = typeof sellerApplicationsTable.$inferSelect;