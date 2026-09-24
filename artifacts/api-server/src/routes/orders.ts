import { createHash, randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  CreateGuestOrderBody,
  CreateGuestOrderResponse,
  DecideGuestOrderRevisionBody,
  DecideGuestOrderRevisionParams,
  DecideGuestOrderRevisionResponse,
  GetCheckoutOptionsResponse,
  GetGuestOrderParams,
  GetGuestOrderResponse,
  ListAdminOrdersResponse,
  ListSellerOrdersResponse,
  RecordOrderRefundBody,
  RecordOrderRefundParams,
  RecordOrderRefundResponse,
  UpdateSellerOrderBody,
  UpdateSellerOrderParams,
  UpdateSellerOrderResponse,
} from "@workspace/api-zod";
import {
  db,
  marketplaceOrderEventsTable,
  marketplaceOrderItemsTable,
  marketplaceOrderRefundsTable,
  marketplaceOrdersTable,
  marketplaceSettlementLedgerTable,
  marketplaceSellerOrdersTable,
  sellerProductsTable,
  sellerStoresTable,
} from "@workspace/db";
import { requireMarketplaceAdmin, requireUserEmail } from "./access";
import {
  listAdminOrders,
  listSellerOrders,
  loadBuyerOrder,
  loadSellerOrder,
  tokenMatches,
} from "../lib/marketplaceOrders";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();
type OrderTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const commissionRate = 0.05;

const sellerStatusLabels: Record<string, string> = {
  confirmed: "sifarişi təsdiqlədi",
  declined: "sifarişi qəbul etmədi",
  preparing: "məhsulları hazırlayır",
  out_for_delivery: "sifarişi çatdırılmaya verdi",
  delivered: "sifarişi çatdırdı",
};

function aznToQepik(amount: number): number | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  const qepik = Math.round(amount * 100);
  return Math.abs(amount * 100 - qepik) < 0.00001 ? qepik : null;
}

function addEvent(
  tx: OrderTransaction,
  orderId: string,
  status: string,
  label: string,
  sellerOrderId: string | null = null,
) {
  return tx.insert(marketplaceOrderEventsTable).values({
    id: randomUUID(),
    orderId,
    sellerOrderId,
    status,
    label,
  });
}

async function releaseInventory(tx: OrderTransaction, sellerOrderIds: string[]) {
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

async function refreshParentOrder(tx: OrderTransaction, orderId: string) {
  const [order] = await tx
    .select()
    .from(marketplaceOrdersTable)
    .where(eq(marketplaceOrdersTable.id, orderId))
    .limit(1);
  if (!order) return null;

  const sellerOrders = await tx
    .select()
    .from(marketplaceSellerOrdersTable)
    .where(eq(marketplaceSellerOrdersTable.orderId, orderId));
  const active = sellerOrders.filter(
    (sellerOrder) => !["declined", "cancelled"].includes(sellerOrder.status),
  );
  if (active.length === 0) {
    const [cancelled] = await tx
      .update(marketplaceOrdersTable)
      .set({
        status: "cancelled",
        productSubtotalQepik: 0,
        deliveryTotalQepik: 0,
        totalQepik: 0,
        updatedAt: new Date(),
      })
      .where(eq(marketplaceOrdersTable.id, orderId))
      .returning();
    return cancelled;
  }

  const productSubtotalQepik = active.reduce(
    (sum, sellerOrder) => sum + sellerOrder.productSubtotalQepik,
    0,
  );
  const allFeesKnown = active.every((sellerOrder) => sellerOrder.deliveryFeeQepik !== null);
  const deliveryTotalQepik = allFeesKnown
    ? active.reduce((sum, sellerOrder) => sum + (sellerOrder.deliveryFeeQepik ?? 0), 0)
    : null;
  const totalQepik =
    deliveryTotalQepik === null ? null : productSubtotalQepik + deliveryTotalQepik;

  let status: string;
  if (sellerOrders.some((sellerOrder) => sellerOrder.status === "declined")) {
    status = "awaiting_buyer_approval";
  } else if (active.every((sellerOrder) => sellerOrder.status === "delivered")) {
    status = "delivered";
  } else if (active.some((sellerOrder) => sellerOrder.status === "delivered")) {
    status = "partially_delivered";
  } else if (active.some((sellerOrder) => sellerOrder.status === "out_for_delivery")) {
    status = "out_for_delivery";
  } else if (active.some((sellerOrder) => sellerOrder.status === "preparing")) {
    status = "preparing";
  } else if (
    allFeesKnown &&
    active.every((sellerOrder) => sellerOrder.status === "confirmed")
  ) {
    status =
      (deliveryTotalQepik ?? 0) > 0 && order.buyerApprovedAt === null
        ? "awaiting_buyer_approval"
        : "confirmed";
  } else {
    status = "pending_confirmation";
  }

  const allPaidAtDelivery =
    order.paymentMethod === "pay_on_delivery" &&
    active.every(
      (sellerOrder) =>
        sellerOrder.status === "delivered" && sellerOrder.collectedAtDelivery === true,
    );
  const [updated] = await tx
    .update(marketplaceOrdersTable)
    .set({
      status,
      productSubtotalQepik,
      deliveryTotalQepik,
      totalQepik,
      paymentStatus: allPaidAtDelivery ? "paid_on_delivery" : order.paymentStatus,
      updatedAt: new Date(),
    })
    .where(eq(marketplaceOrdersTable.id, orderId))
    .returning();
  return updated;
}

async function getSellerStoreForUser(email: string) {
  const [store] = await db
    .select()
    .from(sellerStoresTable)
    .where(and(eq(sellerStoresTable.ownerEmail, email), eq(sellerStoresTable.status, "active")))
    .limit(1);
  return store ?? null;
}

router.get("/checkout/options", (_req, res): void => {
  res.json(
    GetCheckoutOptionsResponse.parse({
      paymentMethods: ["pay_on_delivery"],
      cardPaymentStatus: "not_configured",
      deliveryAreas: ["Bakı", "Abşeron"],
    }),
  );
});

router.post("/orders", async (req, res): Promise<void> => {
  const body = CreateGuestOrderBody.safeParse(req.body);
  if (!body.success) {
    req.log.warn({ errors: body.error.issues }, "Invalid guest checkout input");
    res.status(400).json({ error: "Sifariş məlumatları düzgün deyil." });
    return;
  }
  if (body.data.paymentMethod !== "pay_on_delivery") {
    res.status(503).json({ error: "Kartla ödəniş hələ konfiqurasiya edilməyib." });
    return;
  }

  const accessTokenHash = createHash("sha256")
    .update(body.data.guestAccessToken)
    .digest("hex");
  const [existing] = await db
    .select({ id: marketplaceOrdersTable.id })
    .from(marketplaceOrdersTable)
    .where(eq(marketplaceOrdersTable.accessTokenHash, accessTokenHash))
    .limit(1);
  if (existing) {
    const saved = await loadBuyerOrder(existing.id);
    if (saved) {
      res.status(200).json(CreateGuestOrderResponse.parse(saved));
      return;
    }
  }

  const requested = new Map<string, number>();
  for (const item of body.data.items) {
    requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.quantity);
  }
  const productIds = [...requested.keys()].sort();
  const orderId = randomUUID();
  const orderNumber = `EYN-${orderId.slice(0, 8).toUpperCase()}`;

  const result = await db.transaction(async (tx) => {
    const products = [];
    for (const productId of productIds) {
      const [product] = await tx
        .select()
        .from(sellerProductsTable)
        .where(eq(sellerProductsTable.id, productId))
        .for("update")
        .limit(1);
      if (
        !product ||
        product.status !== "Aktiv" ||
        product.approvalStatus !== "approved" ||
        product.stock < (requested.get(productId) ?? 0)
      ) {
        return { kind: "unavailable" as const };
      }
      products.push(product);
    }

    const sellers = new Map<string, typeof products>();
    for (const product of products) {
      const group = sellers.get(product.sellerId) ?? [];
      group.push(product);
      sellers.set(product.sellerId, group);
    }
    const storeIds = [...sellers.keys()].sort();
    const stores = await tx
      .select()
      .from(sellerStoresTable)
      .where(
        and(
          inArray(sellerStoresTable.id, storeIds),
          eq(sellerStoresTable.status, "active"),
        ),
      );
    if (stores.length !== storeIds.length) return { kind: "unavailable" as const };
    const storeById = new Map(stores.map((store) => [store.id, store]));
    const groups = [...sellers.entries()].map(([sellerId, sellerProducts]) => {
      const items = sellerProducts.map((product) => {
        const quantity = requested.get(product.id) ?? 0;
        return {
          product,
          quantity,
          unitPriceQepik: product.price * 100,
          lineTotalQepik: product.price * quantity * 100,
        };
      });
      return {
        sellerId,
        items,
        subtotalQepik: items.reduce((sum, item) => sum + item.lineTotalQepik, 0),
      };
    });
    const productSubtotalQepik = groups.reduce(
      (sum, group) => sum + group.subtotalQepik,
      0,
    );

    await tx.insert(marketplaceOrdersTable).values({
      id: orderId,
      orderNumber,
      accessTokenHash,
      customerName: body.data.customerName.trim(),
      customerEmail: body.data.customerEmail.trim().toLocaleLowerCase("en-US"),
      customerPhone: body.data.customerPhone.trim(),
      deliveryArea: body.data.deliveryArea,
      deliveryAddress: body.data.deliveryAddress.trim(),
      deliveryNote: body.data.deliveryNote?.trim() ?? "",
      paymentMethod: "pay_on_delivery",
      paymentStatus: "due_on_delivery",
      status: "pending_confirmation",
      productSubtotalQepik,
      deliveryTotalQepik: null,
      totalQepik: null,
    });
    await addEvent(tx, orderId, "received", "Sifariş EYNƏK.com tərəfindən qəbul edildi.");
    await addEvent(
      tx,
      orderId,
      "pending_confirmation",
      "Sifariş mağazaların təsdiqini gözləyir.",
    );

    for (const group of groups) {
      const sellerOrderId = randomUUID();
      await tx.insert(marketplaceSellerOrdersTable).values({
        id: sellerOrderId,
        orderId,
        sellerId: group.sellerId,
        status: "pending_confirmation",
        productSubtotalQepik: group.subtotalQepik,
        deliveryFeeQepik: null,
        commissionQepik: null,
        sellerEarningsQepik: null,
      });
      for (const item of group.items) {
        await tx.insert(marketplaceOrderItemsTable).values({
          id: randomUUID(),
          sellerOrderId,
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          unitPriceQepik: item.unitPriceQepik,
          lineTotalQepik: item.lineTotalQepik,
          stockReleased: false,
        });
        await tx
          .update(sellerProductsTable)
          .set({
            stock: item.product.stock - item.quantity,
            updatedAt: new Date(),
          })
          .where(eq(sellerProductsTable.id, item.product.id));
      }
      const store = storeById.get(group.sellerId);
      await addEvent(
        tx,
        orderId,
        "pending_confirmation",
        `${store?.name ?? "Mağaza"} sifariş təsdiqini gözləyir.`,
        sellerOrderId,
      );
    }
    return { kind: "created" as const };
  });

  if (result.kind === "unavailable") {
    res.status(409).json({
      error: "Məhsullardan biri artıq mövcud deyil və ya kifayət qədər stokda qalmayıb.",
    });
    return;
  }
  const saved = await loadBuyerOrder(orderId);
  if (!saved) {
    req.log.error({ orderId }, "Created marketplace order could not be reloaded");
    res.status(500).json({ error: "Sifariş yaradıldı, lakin məlumatını yükləmək alınmadı." });
    return;
  }
  res.status(201).json(CreateGuestOrderResponse.parse(saved));
});

router.get("/orders/:orderId", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const params = GetGuestOrderParams.safeParse(req.params);
  const token = req.get("X-Order-Access-Token") ?? "";
  if (!params.success || token.length < 32) {
    res.status(404).json({ error: "Sifariş tapılmadı." });
    return;
  }
  const [order] = await db
    .select()
    .from(marketplaceOrdersTable)
    .where(eq(marketplaceOrdersTable.id, params.data.orderId))
    .limit(1);
  if (!order || !tokenMatches(token, order.accessTokenHash)) {
    res.status(404).json({ error: "Sifariş tapılmadı." });
    return;
  }
  const saved = await loadBuyerOrder(order.id);
  if (!saved) {
    res.status(404).json({ error: "Sifariş tapılmadı." });
    return;
  }
  res.json(GetGuestOrderResponse.parse(saved));
});

router.post("/orders/:orderId/decision", async (req, res): Promise<void> => {
  const params = DecideGuestOrderRevisionParams.safeParse(req.params);
  const body = DecideGuestOrderRevisionBody.safeParse(req.body);
  const token = req.get("X-Order-Access-Token") ?? "";
  if (!params.success || !body.success || token.length < 32) {
    res.status(400).json({ error: "Sifariş qərarı düzgün deyil." });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(marketplaceOrdersTable)
      .where(eq(marketplaceOrdersTable.id, params.data.orderId))
      .for("update")
      .limit(1);
    if (!order || !tokenMatches(token, order.accessTokenHash)) {
      return { kind: "missing" as const };
    }
    if (order.status !== "awaiting_buyer_approval") {
      return { kind: "invalid-state" as const };
    }

    const sellerOrders = await tx
      .select()
      .from(marketplaceSellerOrdersTable)
      .where(eq(marketplaceSellerOrdersTable.orderId, order.id))
      .for("update");
    if (body.data.approve) {
      if (sellerOrders.every((sellerOrder) => sellerOrder.status === "declined")) {
        return { kind: "invalid-state" as const };
      }
      for (const sellerOrder of sellerOrders) {
        if (sellerOrder.status === "paused") {
          await tx
            .update(marketplaceSellerOrdersTable)
            .set({
              status: sellerOrder.confirmedAt ? "confirmed" : "pending_confirmation",
              updatedAt: new Date(),
            })
            .where(eq(marketplaceSellerOrdersTable.id, sellerOrder.id));
        }
      }
      await tx
        .update(marketplaceOrdersTable)
        .set({ buyerApprovedAt: new Date(), updatedAt: new Date() })
        .where(eq(marketplaceOrdersTable.id, order.id));
      const updated = await refreshParentOrder(tx, order.id);
      await addEvent(
        tx,
        order.id,
        updated?.status ?? "confirmed",
        "Yenilənmiş sifariş alıcı tərəfindən təsdiqləndi.",
      );
    } else {
      const activeIds = sellerOrders
        .filter((sellerOrder) => !["declined", "cancelled"].includes(sellerOrder.status))
        .map((sellerOrder) => sellerOrder.id);
      await releaseInventory(tx, activeIds);
      await tx
        .update(marketplaceSellerOrdersTable)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(inArray(marketplaceSellerOrdersTable.id, activeIds));
      await tx
        .update(marketplaceOrdersTable)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(marketplaceOrdersTable.id, order.id));
      await addEvent(tx, order.id, "cancelled", "Alıcı sifarişi ləğv etdi.");
    }
    return { kind: "updated" as const };
  });

  if (result.kind === "missing") {
    res.status(404).json({ error: "Sifariş tapılmadı." });
    return;
  }
  if (result.kind === "invalid-state") {
    res.status(400).json({ error: "Bu mərhələdə sifariş qərarı qəbul edilmir." });
    return;
  }
  const saved = await loadBuyerOrder(params.data.orderId);
  if (!saved) {
    res.status(404).json({ error: "Sifariş tapılmadı." });
    return;
  }
  res.json(DecideGuestOrderRevisionResponse.parse(saved));
});

router.get("/seller/orders", requireAuth, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const email = requireUserEmail(req, res);
  if (!email) return;
  const store = await getSellerStoreForUser(email);
  if (!store) {
    res.status(403).json({ error: "Təsdiqlənmiş satıcı mağazası tələb olunur." });
    return;
  }
  res.json(ListSellerOrdersResponse.parse(await listSellerOrders(store.id)));
});

router.patch("/seller/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const email = requireUserEmail(req, res);
  if (!email) return;
  const store = await getSellerStoreForUser(email);
  if (!store) {
    res.status(403).json({ error: "Təsdiqlənmiş satıcı mağazası tələb olunur." });
    return;
  }
  const params = UpdateSellerOrderParams.safeParse(req.params);
  const body = UpdateSellerOrderBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Sifariş yeniləməsi düzgün deyil." });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [sellerOrderRef] = await tx
      .select({ id: marketplaceSellerOrdersTable.id, orderId: marketplaceSellerOrdersTable.orderId })
      .from(marketplaceSellerOrdersTable)
      .where(
        and(
          eq(marketplaceSellerOrdersTable.id, params.data.id),
          eq(marketplaceSellerOrdersTable.sellerId, store.id),
        ),
      )
      .limit(1);
    if (!sellerOrderRef) return { kind: "missing" as const };
    const [parent] = await tx
      .select()
      .from(marketplaceOrdersTable)
      .where(eq(marketplaceOrdersTable.id, sellerOrderRef.orderId))
      .for("update")
      .limit(1);
    if (!parent) return { kind: "missing" as const };
    const [sellerOrder] = await tx
      .select()
      .from(marketplaceSellerOrdersTable)
      .where(
        and(
          eq(marketplaceSellerOrdersTable.id, params.data.id),
          eq(marketplaceSellerOrdersTable.sellerId, store.id),
        ),
      )
      .for("update")
      .limit(1);
    if (!sellerOrder) return { kind: "missing" as const };

    const nextStatus = body.data.status;
    if (nextStatus === "confirmed") {
      if (
        sellerOrder.status !== "pending_confirmation" ||
        parent.status !== "pending_confirmation" ||
        body.data.deliveryFeeAzN === undefined
      ) {
        return { kind: "invalid-state" as const };
      }
      const fee = aznToQepik(body.data.deliveryFeeAzN);
      if (fee === null) return { kind: "invalid-fee" as const };
      await tx
        .update(marketplaceSellerOrdersTable)
        .set({
          status: "confirmed",
          deliveryFeeQepik: fee,
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(marketplaceSellerOrdersTable.id, sellerOrder.id));
      if (sellerOrder.deliveryFeeQepik !== fee) {
        await tx
          .update(marketplaceOrdersTable)
          .set({ buyerApprovedAt: null, updatedAt: new Date() })
          .where(eq(marketplaceOrdersTable.id, parent.id));
      }
    } else if (nextStatus === "declined") {
      if (
        sellerOrder.status !== "pending_confirmation" ||
        parent.status !== "pending_confirmation"
      ) {
        return { kind: "invalid-state" as const };
      }
      await releaseInventory(tx, [sellerOrder.id]);
      await tx
        .update(marketplaceSellerOrdersTable)
        .set({ status: "declined", updatedAt: new Date() })
        .where(eq(marketplaceSellerOrdersTable.id, sellerOrder.id));
      const otherOrders = await tx
        .select()
        .from(marketplaceSellerOrdersTable)
        .where(
          and(
            eq(marketplaceSellerOrdersTable.orderId, parent.id),
            inArray(marketplaceSellerOrdersTable.status, ["pending_confirmation", "confirmed"]),
          ),
        );
      for (const other of otherOrders) {
        await tx
          .update(marketplaceSellerOrdersTable)
          .set({ status: "paused", updatedAt: new Date() })
          .where(eq(marketplaceSellerOrdersTable.id, other.id));
      }
    } else {
      if (parent.status !== "confirmed" && parent.status !== "preparing" && parent.status !== "out_for_delivery") {
        return { kind: "invalid-state" as const };
      }
      const allowedNext: Record<string, string[]> = {
        confirmed: ["preparing"],
        preparing: ["out_for_delivery"],
        out_for_delivery: ["delivered"],
        delivered: ["delivered"],
      };
      const allowed = allowedNext[sellerOrder.status] ?? [];
      if (!allowed.includes(nextStatus)) return { kind: "invalid-state" as const };
      const isDelivered = nextStatus === "delivered";
      const collectedAtDelivery =
        parent.paymentMethod === "pay_on_delivery" && isDelivered
          ? body.data.collectedAtDelivery ?? sellerOrder.collectedAtDelivery ?? false
          : sellerOrder.collectedAtDelivery;
      if (sellerOrder.collectedAtDelivery === true && collectedAtDelivery !== true) {
        return { kind: "invalid-state" as const };
      }
      await tx
        .update(marketplaceSellerOrdersTable)
        .set({
          status: nextStatus,
          ...(body.data.trackingCode !== undefined
            ? { trackingCode: body.data.trackingCode.trim() || null }
            : {}),
          collectedAtDelivery,
          ...(isDelivered ? { deliveredAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(marketplaceSellerOrdersTable.id, sellerOrder.id));
    }

    const [storeRecord] = await tx
      .select()
      .from(sellerStoresTable)
      .where(eq(sellerStoresTable.id, store.id))
      .limit(1);
    const eventLabel = body.data.note?.trim()
      ? `${storeRecord?.name ?? "Mağaza"}: ${body.data.note.trim()}`
      : `${storeRecord?.name ?? "Mağaza"} ${sellerStatusLabels[nextStatus] ?? "sifarişi yenilədi"}.`;
    await addEvent(tx, parent.id, nextStatus, eventLabel, sellerOrder.id);

    if (
      nextStatus === "delivered" &&
      parent.paymentMethod === "pay_on_delivery" &&
      (body.data.collectedAtDelivery ?? sellerOrder.collectedAtDelivery ?? false)
    ) {
      const base = Math.max(sellerOrder.productSubtotalQepik - sellerOrder.productRefundedQepik, 0);
      const commissionQepik = Math.round(base * commissionRate);
      const sellerEarningsQepik = base - commissionQepik;
      await tx
        .update(marketplaceSellerOrdersTable)
        .set({ commissionQepik, sellerEarningsQepik, updatedAt: new Date() })
        .where(eq(marketplaceSellerOrdersTable.id, sellerOrder.id));
      await tx
        .insert(marketplaceSettlementLedgerTable)
        .values({
          id: randomUUID(),
          orderId: parent.id,
          sellerOrderId: sellerOrder.id,
          sellerId: sellerOrder.sellerId,
          productSalesQepik: sellerOrder.productSubtotalQepik,
          deliveryFeeQepik: sellerOrder.deliveryFeeQepik ?? 0,
          commissionQepik,
          sellerEarningsQepik,
          status: "payable",
        })
        .onConflictDoNothing({ target: marketplaceSettlementLedgerTable.sellerOrderId });
    }

    if (body.data.note?.trim()) {
      await addEvent(tx, parent.id, "seller_note", `${storeRecord?.name ?? "Mağaza"}: ${body.data.note.trim()}`, sellerOrder.id);
    }
    await refreshParentOrder(tx, parent.id);
    return { kind: "updated" as const, orderId: parent.id };
  });

  if (result.kind === "missing") {
    res.status(404).json({ error: "Mağaza sifarişi tapılmadı." });
    return;
  }
  if (result.kind === "invalid-fee") {
    res.status(400).json({ error: "Çatdırılma haqqı qəpik dəqiqliyində və sıfırdan böyük olmayan rəqəm olmalıdır." });
    return;
  }
  if (result.kind === "invalid-state") {
    res.status(400).json({ error: "Sifariş bu mərhələdə yenilənə bilməz." });
    return;
  }
  const saved = await loadSellerOrder(params.data.id);
  if (!saved) {
    res.status(404).json({ error: "Mağaza sifarişi tapılmadı." });
    return;
  }
  res.json(UpdateSellerOrderResponse.parse(saved));
});

router.get("/admin/orders", requireAuth, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!requireMarketplaceAdmin(req, res)) return;
  res.json(ListAdminOrdersResponse.parse(await listAdminOrders()));
});

router.patch("/admin/orders/:id/refund", requireAuth, async (req, res): Promise<void> => {
  if (!requireMarketplaceAdmin(req, res)) return;
  const adminEmail = requireUserEmail(req, res);
  const params = RecordOrderRefundParams.safeParse(req.params);
  const body = RecordOrderRefundBody.safeParse(req.body);
  if (!adminEmail || !params.success || !body.success) {
    res.status(400).json({ error: "Geri ödəniş məlumatları düzgün deyil." });
    return;
  }
  const refundQepik = aznToQepik(body.data.refundAmountAzN);
  const productRefundQepik = aznToQepik(body.data.productRefundAzN);
  if (
    refundQepik === null ||
    productRefundQepik === null ||
    productRefundQepik > refundQepik
  ) {
    res.status(400).json({ error: "Geri ödəniş məbləğləri qəpik dəqiqliyində və uyğun olmalıdır." });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(marketplaceOrdersTable)
      .where(eq(marketplaceOrdersTable.id, params.data.id))
      .for("update")
      .limit(1);
    if (!order) return { kind: "missing" as const };
    const [sellerOrder] = await tx
      .select()
      .from(marketplaceSellerOrdersTable)
      .where(
        and(
          eq(marketplaceSellerOrdersTable.id, body.data.sellerOrderId),
          eq(marketplaceSellerOrdersTable.orderId, order.id),
        ),
      )
      .for("update")
      .limit(1);
    if (!sellerOrder) return { kind: "missing-seller-order" as const };
    if (
      sellerOrder.status !== "delivered" ||
      !["paid_on_delivery", "captured", "partially_refunded"].includes(order.paymentStatus)
    ) {
      return { kind: "not-paid" as const };
    }
    if (!sellerOrder.deliveryFeeQepik && sellerOrder.deliveryFeeQepik !== 0) {
      return { kind: "not-paid" as const };
    }
    const remainingSellerRefundable =
      sellerOrder.productSubtotalQepik +
      (sellerOrder.deliveryFeeQepik ?? 0) -
      sellerOrder.refundedQepik;
    const remainingProductRefundable =
      sellerOrder.productSubtotalQepik - sellerOrder.productRefundedQepik;
    if (
      refundQepik <= 0 ||
      refundQepik > remainingSellerRefundable ||
      productRefundQepik > remainingProductRefundable
    ) {
      return { kind: "amount-exceeded" as const };
    }

    const newOrderRefunded = order.refundedQepik + refundQepik;
    const newSellerRefunded = sellerOrder.refundedQepik + refundQepik;
    const newProductRefunded = sellerOrder.productRefundedQepik + productRefundQepik;
    const [savedRefund] = await tx
      .insert(marketplaceOrderRefundsTable)
      .values({
        id: randomUUID(),
        orderId: order.id,
        sellerOrderId: sellerOrder.id,
        refundQepik,
        productRefundQepik,
        reference: body.data.reference.trim(),
        reason: body.data.reason?.trim() ?? "",
        recordedBy: adminEmail,
      })
      .onConflictDoNothing({ target: marketplaceOrderRefundsTable.reference })
      .returning({ id: marketplaceOrderRefundsTable.id });
    if (!savedRefund) return { kind: "duplicate-reference" as const };
    await tx
      .update(marketplaceOrdersTable)
      .set({
        refundedQepik: newOrderRefunded,
        paymentStatus:
          order.totalQepik !== null && newOrderRefunded >= order.totalQepik
            ? "refunded"
            : "partially_refunded",
        updatedAt: new Date(),
      })
      .where(eq(marketplaceOrdersTable.id, order.id));

    const retainedProductSales = Math.max(
      sellerOrder.productSubtotalQepik - newProductRefunded,
      0,
    );
    const commissionQepik = Math.round(retainedProductSales * commissionRate);
    const sellerEarningsQepik = retainedProductSales - commissionQepik;
    await tx
      .update(marketplaceSellerOrdersTable)
      .set({
        refundedQepik: newSellerRefunded,
        productRefundedQepik: newProductRefunded,
        commissionQepik,
        sellerEarningsQepik,
        updatedAt: new Date(),
      })
      .where(eq(marketplaceSellerOrdersTable.id, sellerOrder.id));
    await tx
      .update(marketplaceSettlementLedgerTable)
      .set({
        productSalesQepik: retainedProductSales,
        commissionQepik,
        sellerEarningsQepik,
        status: sellerEarningsQepik === 0 ? "reversed" : "adjusted",
      })
      .where(eq(marketplaceSettlementLedgerTable.sellerOrderId, sellerOrder.id));
    await addEvent(
      tx,
      order.id,
      "refund_recorded",
      `Geri ödəniş qeydə alındı: ${(refundQepik / 100).toFixed(2)} AZN.`,
      sellerOrder.id,
    );
    return { kind: "recorded" as const };
  });

  if (result.kind === "missing" || result.kind === "missing-seller-order") {
    res.status(404).json({ error: "Sifariş tapılmadı." });
    return;
  }
  if (result.kind === "not-paid") {
    res.status(400).json({ error: "Geri ödəniş yalnız çatdırılıb ödənmiş mağaza sifarişinə qeydə alına bilər." });
    return;
  }
  if (result.kind === "amount-exceeded") {
    res.status(400).json({ error: "Geri ödəniş qalan məbləğdən çox ola bilməz." });
    return;
  }
  if (result.kind === "duplicate-reference") {
    res.status(400).json({ error: "Bu istinad kodu artıq istifadə olunub." });
    return;
  }
  const saved = await listAdminOrders().then((orders) =>
    orders.find((order) => order.id === params.data.id),
  );
  if (!saved) {
    res.status(404).json({ error: "Sifariş tapılmadı." });
    return;
  }
  res.json(RecordOrderRefundResponse.parse(saved));
});

export default router;