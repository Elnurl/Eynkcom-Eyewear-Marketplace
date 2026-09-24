import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const marketplaceOrdersTable = pgTable(
  "marketplace_orders",
  {
    id: text("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    accessTokenHash: text("access_token_hash").notNull(),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone").notNull(),
    deliveryArea: text("delivery_area").notNull(),
    deliveryAddress: text("delivery_address").notNull(),
    deliveryNote: text("delivery_note").notNull().default(""),
    paymentMethod: text("payment_method").notNull(),
    paymentStatus: text("payment_status").notNull(),
    status: text("status").notNull(),
    productSubtotalQepik: integer("product_subtotal_qepik").notNull(),
    deliveryTotalQepik: integer("delivery_total_qepik"),
    totalQepik: integer("total_qepik"),
    refundedQepik: integer("refunded_qepik").notNull().default(0),
    buyerApprovedAt: timestamp("buyer_approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("marketplace_orders_order_number_unique").on(table.orderNumber),
    uniqueIndex("marketplace_orders_access_token_hash_unique").on(table.accessTokenHash),
    index("marketplace_orders_status_idx").on(table.status),
    index("marketplace_orders_created_at_idx").on(table.createdAt),
  ],
);

export const marketplaceSellerOrdersTable = pgTable(
  "marketplace_seller_orders",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => marketplaceOrdersTable.id, { onDelete: "cascade" }),
    sellerId: text("seller_id").notNull(),
    status: text("status").notNull(),
    productSubtotalQepik: integer("product_subtotal_qepik").notNull(),
    deliveryFeeQepik: integer("delivery_fee_qepik"),
    commissionQepik: integer("commission_qepik"),
    sellerEarningsQepik: integer("seller_earnings_qepik"),
    refundedQepik: integer("refunded_qepik").notNull().default(0),
    productRefundedQepik: integer("product_refunded_qepik").notNull().default(0),
    trackingCode: text("tracking_code"),
    collectedAtDelivery: boolean("collected_at_delivery"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("marketplace_seller_orders_order_idx").on(table.orderId),
    index("marketplace_seller_orders_seller_idx").on(table.sellerId),
    index("marketplace_seller_orders_status_idx").on(table.status),
    uniqueIndex("marketplace_seller_orders_order_seller_unique").on(
      table.orderId,
      table.sellerId,
    ),
  ],
);

export const marketplaceOrderItemsTable = pgTable(
  "marketplace_order_items",
  {
    id: text("id").primaryKey(),
    sellerOrderId: text("seller_order_id")
      .notNull()
      .references(() => marketplaceSellerOrdersTable.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceQepik: integer("unit_price_qepik").notNull(),
    lineTotalQepik: integer("line_total_qepik").notNull(),
    stockReleased: boolean("stock_released").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("marketplace_order_items_seller_order_idx").on(table.sellerOrderId),
    index("marketplace_order_items_product_idx").on(table.productId),
  ],
);

export const marketplaceOrderEventsTable = pgTable(
  "marketplace_order_events",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => marketplaceOrdersTable.id, { onDelete: "cascade" }),
    sellerOrderId: text("seller_order_id").references(
      () => marketplaceSellerOrdersTable.id,
      { onDelete: "cascade" },
    ),
    status: text("status").notNull(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("marketplace_order_events_order_idx").on(table.orderId),
    index("marketplace_order_events_created_idx").on(table.createdAt),
  ],
);

export const marketplaceSettlementLedgerTable = pgTable(
  "marketplace_settlement_ledger",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => marketplaceOrdersTable.id, { onDelete: "cascade" }),
    sellerOrderId: text("seller_order_id")
      .notNull()
      .references(() => marketplaceSellerOrdersTable.id, { onDelete: "cascade" }),
    sellerId: text("seller_id").notNull(),
    productSalesQepik: integer("product_sales_qepik").notNull(),
    deliveryFeeQepik: integer("delivery_fee_qepik").notNull(),
    commissionQepik: integer("commission_qepik").notNull(),
    sellerEarningsQepik: integer("seller_earnings_qepik").notNull(),
    status: text("status").notNull().default("payable"),
    settlementReference: text("settlement_reference"),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("marketplace_settlement_seller_order_unique").on(table.sellerOrderId),
    index("marketplace_settlement_seller_idx").on(table.sellerId),
    index("marketplace_settlement_status_idx").on(table.status),
  ],
);

export const marketplaceOrderRefundsTable = pgTable(
  "marketplace_order_refunds",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => marketplaceOrdersTable.id, { onDelete: "cascade" }),
    sellerOrderId: text("seller_order_id")
      .notNull()
      .references(() => marketplaceSellerOrdersTable.id, { onDelete: "cascade" }),
    refundQepik: integer("refund_qepik").notNull(),
    productRefundQepik: integer("product_refund_qepik").notNull(),
    reference: text("reference").notNull(),
    reason: text("reason").notNull().default(""),
    recordedBy: text("recorded_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("marketplace_order_refunds_order_idx").on(table.orderId),
    index("marketplace_order_refunds_seller_order_idx").on(table.sellerOrderId),
    uniqueIndex("marketplace_order_refunds_reference_unique").on(table.reference),
  ],
);

export const insertMarketplaceOrderSchema = createInsertSchema(marketplaceOrdersTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertMarketplaceOrder = z.infer<typeof insertMarketplaceOrderSchema>;
export type MarketplaceOrder = typeof marketplaceOrdersTable.$inferSelect;

export const insertMarketplaceSellerOrderSchema = createInsertSchema(
  marketplaceSellerOrdersTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertMarketplaceSellerOrder = z.infer<typeof insertMarketplaceSellerOrderSchema>;
export type MarketplaceSellerOrder = typeof marketplaceSellerOrdersTable.$inferSelect;

export const insertMarketplaceOrderItemSchema = createInsertSchema(
  marketplaceOrderItemsTable,
).omit({ createdAt: true });
export type InsertMarketplaceOrderItem = z.infer<typeof insertMarketplaceOrderItemSchema>;
export type MarketplaceOrderItem = typeof marketplaceOrderItemsTable.$inferSelect;

export const insertMarketplaceOrderEventSchema = createInsertSchema(
  marketplaceOrderEventsTable,
).omit({ createdAt: true });
export type InsertMarketplaceOrderEvent = z.infer<typeof insertMarketplaceOrderEventSchema>;
export type MarketplaceOrderEvent = typeof marketplaceOrderEventsTable.$inferSelect;

export const insertMarketplaceSettlementLedgerSchema = createInsertSchema(
  marketplaceSettlementLedgerTable,
).omit({ createdAt: true });
export type InsertMarketplaceSettlementLedger = z.infer<
  typeof insertMarketplaceSettlementLedgerSchema
>;
export type MarketplaceSettlement = typeof marketplaceSettlementLedgerTable.$inferSelect;

export const insertMarketplaceOrderRefundSchema = createInsertSchema(
  marketplaceOrderRefundsTable,
).omit({ createdAt: true });
export type InsertMarketplaceOrderRefund = z.infer<typeof insertMarketplaceOrderRefundSchema>;
export type MarketplaceOrderRefund = typeof marketplaceOrderRefundsTable.$inferSelect;