import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  marketplaceOrderEventsTable,
  marketplaceOrderItemsTable,
  marketplaceOrdersTable,
  marketplaceSellerOrdersTable,
  sellerProductsTable,
} from "@workspace/db";

export const SELLER_CONFIRM_WINDOW_MS = 30 * 60 * 1000;
export const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

type OrderTransaction = Parameters<Parameters<typeof import("@workspace/db").db.transaction>[0]>[0];

export function newGuestAccessToken() {
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

export async function reserveInventoryForSellerOrder(
  tx: OrderTransaction,
  sellerOrderId: string,
): Promise<{ ok: true } | { ok: false; reason: "out_of_stock" }> {
  const items = await tx
    .select()
    .from(marketplaceOrderItemsTable)
    .where(eq(marketplaceOrderItemsTable.sellerOrderId, sellerOrderId))
    .for("update");

  for (const item of items) {
    if (item.stockDeducted) continue;
    const [product] = await tx
      .select()
      .from(sellerProductsTable)
      .where(eq(sellerProductsTable.id, item.productId))
      .for("update")
      .limit(1);
    if (!product || product.stock < item.quantity) {
      return { ok: false, reason: "out_of_stock" };
    }
    await tx
      .update(sellerProductsTable)
      .set({ stock: product.stock - item.quantity, updatedAt: new Date() })
      .where(eq(sellerProductsTable.id, item.productId));
    await tx
      .update(marketplaceOrderItemsTable)
      .set({ stockDeducted: true })
      .where(eq(marketplaceOrderItemsTable.id, item.id));
  }
  return { ok: true };
}

export async function releaseInventory(tx: OrderTransaction, sellerOrderIds: string[]) {
  if (sellerOrderIds.length === 0) return;
  const items = await tx
    .select()
    .from(marketplaceOrderItemsTable)
    .where(
      and(
        inArray(marketplaceOrderItemsTable.sellerOrderId, sellerOrderIds),
        eq(marketplaceOrderItemsTable.stockReleased, false),
      ),
    )
    .for("update");

  for (const item of items) {
    if (!item.stockDeducted) {
      await tx
        .update(marketplaceOrderItemsTable)
        .set({ stockReleased: true })
        .where(eq(marketplaceOrderItemsTable.id, item.id));
      continue;
    }
    await tx
      .update(sellerProductsTable)
      .set({ stock: sql`${sellerProductsTable.stock} + ${item.quantity}` })
      .where(eq(sellerProductsTable.id, item.productId));
    await tx
      .update(marketplaceOrderItemsTable)
      .set({ stockReleased: true })
      .where(eq(marketplaceOrderItemsTable.id, item.id));
  }
}

async function cancelExpiredOrder(tx: OrderTransaction, orderId: string, label: string) {
  const sellerOrders = await tx
    .select()
    .from(marketplaceSellerOrdersTable)
    .where(eq(marketplaceSellerOrdersTable.orderId, orderId))
    .for("update");
  const activeIds = sellerOrders
    .filter((row) => !["declined", "cancelled"].includes(row.status))
    .map((row) => row.id);
  await releaseInventory(tx, activeIds);
  if (activeIds.length) {
    await tx
      .update(marketplaceSellerOrdersTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(inArray(marketplaceSellerOrdersTable.id, activeIds));
  }
  await tx
    .update(marketplaceOrdersTable)
    .set({
      status: "cancelled",
      paymentStatus: "failed",
      updatedAt: new Date(),
    })
    .where(eq(marketplaceOrdersTable.id, orderId));
  await tx.insert(marketplaceOrderEventsTable).values({
    id: randomUUID(),
    orderId,
    status: "cancelled",
    label,
  });
}

/** Vaxtı keçmiş sifarişləri bağlayır (sorğu zamanı). */
export async function expireStaleOrderIfNeeded(tx: OrderTransaction, orderId: string) {
  const [order] = await tx
    .select()
    .from(marketplaceOrdersTable)
    .where(eq(marketplaceOrdersTable.id, orderId))
    .for("update")
    .limit(1);
  if (!order || order.status === "cancelled" || order.status === "delivered") return order;

  const now = Date.now();
  if (
    order.status === "pending_confirmation" &&
    order.sellerConfirmDueAt &&
    now > order.sellerConfirmDueAt.getTime()
  ) {
    await cancelExpiredOrder(tx, orderId, "Mağaza 30 dəqiqə ərzində cavab vermədiyi üçün sifariş ləğv olundu.");
    const [cancelled] = await tx
      .select()
      .from(marketplaceOrdersTable)
      .where(eq(marketplaceOrdersTable.id, orderId))
      .limit(1);
    return cancelled ?? order;
  }

  if (
    order.status === "awaiting_payment" &&
    order.paymentDueAt &&
    now > order.paymentDueAt.getTime() &&
    order.paymentMethod === "card" &&
    order.paymentStatus !== "captured"
  ) {
    await cancelExpiredOrder(
      tx,
      orderId,
      "Alıcı 15 dəqiqə ərzində ödəniş etmədiyi üçün sifariş ləğv olundu və stok buraxıldı.",
    );
    const [cancelled] = await tx
      .select()
      .from(marketplaceOrdersTable)
      .where(eq(marketplaceOrdersTable.id, orderId))
      .limit(1);
    return cancelled ?? order;
  }

  return order;
}