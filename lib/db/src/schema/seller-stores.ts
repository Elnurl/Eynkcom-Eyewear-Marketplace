import { createInsertSchema } from "drizzle-zod";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const sellerStoresTable = pgTable(
  "seller_stores",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    location: text("location").notNull(),
    description: text("description").notNull().default(""),
    instagram: text("instagram").notNull().default(""),
    website: text("website").notNull().default(""),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("seller_stores_owner_email_unique").on(table.ownerEmail),
    uniqueIndex("seller_stores_slug_unique").on(table.slug),
    index("seller_stores_status_idx").on(table.status),
  ],
);

export const insertSellerStoreSchema = createInsertSchema(sellerStoresTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertSellerStore = z.infer<typeof insertSellerStoreSchema>;
export type SellerStoreRecord = typeof sellerStoresTable.$inferSelect;