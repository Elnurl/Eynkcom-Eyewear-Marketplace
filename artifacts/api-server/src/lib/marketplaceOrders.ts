import { createHash, timingSafeEqual } from "node:crypto";
import { asc, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  marketplaceOrderEventsTable,
  marketplaceOrderItemsTable,
  marketplaceOrdersTable,
  marketplaceSettlementLedgerTable,
  marketplaceSellerOrdersTable,
  sellerStoresTable,
} from "@workspace/db";

const toAzN = (qepik: number | null) =>
  qepik === null ? null : Number((qepik / 100).toFixed(2));

function summarizeSellerOrder(
  sellerOrder: typeof marketplaceSellerOrdersTable.$inferSelect,
  storeName: string,
  items: (typeof marketplaceOrderItemsTable.$inferSelect)[],
  settlementStatus: string | null,
) {
  return {
    id: sellerOrder.id,
    sellerName: storeName,
    status: sellerOrder.status,
    items: items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPriceAzN: toAzN(item.unitPriceQepik)!,
      lineTotalAzN: toAzN(item.lineTotalQepik)!,
    })),
    productSubtotalAzN: toAzN(sellerOrder.productSubtotalQepik)!,
    deliveryFeeAzN: toAzN(sellerOrder.deliveryFeeQepik),
    sellerEarningsAzN: toAzN(sellerOrder.sellerEarningsQepik),
    commissionAzN: toAzN(sellerOrder.commissionQepik),
    trackingCode: sellerOrder.trackingCode,
    settlementStatus: settlementStatus ?? "not_eligible",
    refundedAzN: toAzN(sellerOrder.refundedQepik)!,
    productRefundedAzN: toAzN(sellerOrder.productRefundedQepik)!,
  };
}

async function getSellerGroups(orderId: string) {
  const rows = await db
    .select({ sellerOrder: marketplaceSellerOrdersTable, store: sellerStoresTable })
    .from(marketplaceSellerOrdersTable)
    .innerJoin(
      sellerStoresTable,
      eq(marketplaceSellerOrdersTable.sellerId, sellerStoresTable.id),
    )
    .where(eq(marketplaceSellerOrdersTable.orderId, orderId))
    .orderBy(asc(marketplaceSellerOrdersTable.createdAt));
  if (rows.length === 0) return [];

  const ids = rows.map(({ sellerOrder }) => sellerOrder.id);
  const [items, settlements] = await Promise.all([
    db
      .select()
      .from(marketplaceOrderItemsTable)
      .where(inArray(marketplaceOrderItemsTable.sellerOrderId, ids))
      .orderBy(asc(marketplaceOrderItemsTable.createdAt)),
    db
      .select()
      .from(marketplaceSettlementLedgerTable)
      .where(inArray(marketplaceSettlementLedgerTable.sellerOrderId, ids)),
  ]);
  const itemsBySellerOrder = new Map<string, typeof items>();
  for (const item of items) {
    const group = itemsBySellerOrder.get(item.sellerOrderId) ?? [];
    group.push(item);
    itemsBySellerOrder.set(item.sellerOrderId, group);
  }
  const settlementsBySellerOrder = new Map(
    settlements.map((settlement) => [settlement.sellerOrderId, settlement.status]),
  );

  return rows.map(({ sellerOrder, store }) => ({
    sellerOrder,
    storeName: store.name,
    summary: summarizeSellerOrder(
      sellerOrder,
      store.name,
      itemsBySellerOrder.get(sellerOrder.id) ?? [],
      settlementsBySellerOrder.get(sellerOrder.id) ?? null,
    ),
  }));
}

export async function loadBuyerOrder(orderId: string) {
  const [order] = await db
    .select()
    .from(marketplaceOrdersTable)
    .where(eq(marketplaceOrdersTable.id, orderId))
    .limit(1);
  if (!order) return null;

  const [sellerGroups, timeline] = await Promise.all([
    getSellerGroups(orderId),
    db
      .select()
      .from(marketplaceOrderEventsTable)
      .where(eq(marketplaceOrderEventsTable.orderId, orderId))
      .orderBy(asc(marketplaceOrderEventsTable.createdAt)),
  ]);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    deliveryArea: order.deliveryArea,
    deliveryAddress: order.deliveryAddress,
    deliveryNote: order.deliveryNote,
    productSubtotalAzN: toAzN(order.productSubtotalQepik)!,
    deliveryTotalAzN: toAzN(order.deliveryTotalQepik),
    totalAzN: toAzN(order.totalQepik),
    sellerOrders: sellerGroups.map(({ summary }) => ({
      id: summary.id,
      sellerName: summary.sellerName,
      status: summary.status,
      items: summary.items,
      productSubtotalAzN: summary.productSubtotalAzN,
      deliveryFeeAzN: summary.deliveryFeeAzN,
      trackingCode: summary.trackingCode,
    })),
    timeline: timeline.map((event) => ({
      status: event.status,
      label: event.label,
      createdAt: event.createdAt,
    })),
    createdAt: order.createdAt,
  };
}

export async function loadSellerOrder(sellerOrderId: string) {
  const [row] = await db
    .select({
      sellerOrder: marketplaceSellerOrdersTable,
      store: sellerStoresTable,
      order: marketplaceOrdersTable,
    })
    .from(marketplaceSellerOrdersTable)
    .innerJoin(sellerStoresTable, eq(marketplaceSellerOrdersTable.sellerId, sellerStoresTable.id))
    .innerJoin(marketplaceOrdersTable, eq(marketplaceSellerOrdersTable.orderId, marketplaceOrdersTable.id))
    .where(eq(marketplaceSellerOrdersTable.id, sellerOrderId))
    .limit(1);
  if (!row) return null;

  const [group] = await getSellerGroups(row.order.id).then((groups) =>
    groups.filter((item) => item.sellerOrder.id === sellerOrderId),
  );
  if (!group) return null;

  return {
    ...group.summary,
    orderNumber: row.order.orderNumber,
    customerName: row.order.customerName,
    customerEmail: row.order.customerEmail,
    customerPhone: row.order.customerPhone,
    deliveryArea: row.order.deliveryArea,
    deliveryAddress: row.order.deliveryAddress,
    deliveryNote: row.order.deliveryNote,
    paymentMethod: row.order.paymentMethod,
    paymentStatus: row.order.paymentStatus,
    updatedAt: row.sellerOrder.updatedAt,
  };
}

export async function listSellerOrders(sellerId: string) {
  const rows = await db
    .select({
      sellerOrder: marketplaceSellerOrdersTable,
      store: sellerStoresTable,
      order: marketplaceOrdersTable,
    })
    .from(marketplaceSellerOrdersTable)
    .innerJoin(sellerStoresTable, eq(marketplaceSellerOrdersTable.sellerId, sellerStoresTable.id))
    .innerJoin(marketplaceOrdersTable, eq(marketplaceSellerOrdersTable.orderId, marketplaceOrdersTable.id))
    .where(eq(marketplaceSellerOrdersTable.sellerId, sellerId))
    .orderBy(desc(marketplaceSellerOrdersTable.createdAt));

  const ids = rows.map(({ sellerOrder }) => sellerOrder.id);
  if (ids.length === 0) return [];
  const [items, settlements] = await Promise.all([
    db
      .select()
      .from(marketplaceOrderItemsTable)
      .where(inArray(marketplaceOrderItemsTable.sellerOrderId, ids))
      .orderBy(asc(marketplaceOrderItemsTable.createdAt)),
    db
      .select()
      .from(marketplaceSettlementLedgerTable)
      .where(inArray(marketplaceSettlementLedgerTable.sellerOrderId, ids)),
  ]);
  const itemsBySellerOrder = new Map<string, typeof items>();
  for (const item of items) {
    const group = itemsBySellerOrder.get(item.sellerOrderId) ?? [];
    group.push(item);
    itemsBySellerOrder.set(item.sellerOrderId, group);
  }
  const settlementsBySellerOrder = new Map(
    settlements.map((settlement) => [settlement.sellerOrderId, settlement.status]),
  );
  return rows.map(({ sellerOrder, store, order }) => ({
    ...summarizeSellerOrder(
      sellerOrder,
      store.name,
      itemsBySellerOrder.get(sellerOrder.id) ?? [],
      settlementsBySellerOrder.get(sellerOrder.id) ?? null,
    ),
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    deliveryArea: order.deliveryArea,
    deliveryAddress: order.deliveryAddress,
    deliveryNote: order.deliveryNote,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    updatedAt: sellerOrder.updatedAt,
  }));
}

export async function listAdminOrders() {
  const orders = await db
    .select()
    .from(marketplaceOrdersTable)
    .orderBy(desc(marketplaceOrdersTable.createdAt));
  const rows = await Promise.all(
    orders.map(async (order) => {
      const [sellerGroups] = await Promise.all([getSellerGroups(order.id)]);
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        productSubtotalAzN: toAzN(order.productSubtotalQepik)!,
        deliveryTotalAzN: toAzN(order.deliveryTotalQepik),
        totalAzN: toAzN(order.totalQepik),
        refundedAzN: toAzN(order.refundedQepik)!,
        sellerOrders: sellerGroups.map(({ summary }) => summary),
        createdAt: order.createdAt,
      };
    }),
  );
  return rows;
}

export function tokenMatches(token: string, expectedHash: string) {
  const supplied = createHash("sha256").update(token).digest();
  const expected = Buffer.from(expectedHash, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}