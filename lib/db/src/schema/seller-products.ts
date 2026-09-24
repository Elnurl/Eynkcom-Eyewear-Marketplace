import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sellerProductsTable = pgTable(
  "seller_products",
  {
    id: text("id").primaryKey(),
    sellerId: text("seller_id").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    price: integer("price").notNull(),
    stock: integer("stock").notNull(),
    color: text("color").notNull(),
    material: text("material").notNull(),
    brand: text("brand").notNull().default(""),
    gender: text("gender").notNull().default("Uniseks"),
    shape: text("shape").notNull().default("Square"),
    size: text("size").notNull().default("M (50–20)"),
    description: text("description").notNull().default(""),
    status: text("status").notNull(),
    approvalStatus: text("approval_status").notNull().default("pending"),
    moderationNote: text("moderation_note"),
    frontImage: text("front_image").notNull(),
    sideImage: text("side_image").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("seller_products_seller_id_idx").on(table.sellerId),
    index("seller_products_status_idx").on(table.status),
  ],
);

export const insertSellerProductSchema = createInsertSchema(sellerProductsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertSellerProduct = z.infer<typeof insertSellerProductSchema>;
export type SellerProductRecord = typeof sellerProductsTable.$inferSelect;