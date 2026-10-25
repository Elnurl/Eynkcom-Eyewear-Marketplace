import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sellerStoresTable } from "./seller-stores";

export const sellerSupportTicketsTable = pgTable(
  "seller_support_tickets",
  {
    id: text("id").primaryKey(),
    sellerId: text("seller_id").references(() => sellerStoresTable.id, { onDelete: "set null" }),
    authorType: text("author_type").notNull().default("seller"),
    authorUserId: text("author_user_id").notNull(),
    authorEmail: text("author_email").notNull(),
    message: text("message").notNull(),
    imagePath: text("image_path"),
    status: text("status").notNull().default("open"),
    adminReadAt: timestamp("admin_read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("seller_support_tickets_seller_idx").on(table.sellerId),
    index("seller_support_tickets_status_idx").on(table.status),
    index("seller_support_tickets_created_idx").on(table.createdAt),
  ],
);

export const insertSellerSupportTicketSchema = createInsertSchema(sellerSupportTicketsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertSellerSupportTicket = z.infer<typeof insertSellerSupportTicketSchema>;
export type SellerSupportTicketRecord = typeof sellerSupportTicketsTable.$inferSelect;
