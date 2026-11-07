import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, marketplaceOrderEventsTable, marketplaceOrdersTable } from "@workspace/db";
import { tokenMatches } from "../lib/marketplaceOrders";
import { buildCardCheckout, decodeEpointData, epointReady, epointSignatureMatches } from "../lib/epoint";

const router: IRouter = Router();

function siteOrigin(req: { protocol: string; get(name: string): string | undefined }) {
  const configured = process.env.PUBLIC_SITE_URL?.trim() || process.env.BETTER_AUTH_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = req.get("x-forwarded-host") || req.get("host") || "eynek.store";
  const proto = req.get("x-forwarded-proto") || req.protocol || "https";
  return `${proto}://${host}`;
}

router.post("/orders/:orderId/epoint", async (req, res): Promise<void> => {
  if (!epointReady()) {
    res.status(503).json({ error: "Online ödəniş hələ açılmayıb. Private key serverə yazılmalıdır." });
    return;
  }
  const orderId = String(req.params.orderId || "");
  const token = req.get("X-Order-Access-Token") ?? "";
  const [order] = await db.select().from(marketplaceOrdersTable).where(eq(marketplaceOrdersTable.id, orderId)).limit(1);
  if (!order || token.length < 32 || !tokenMatches(token, order.accessTokenHash)) {
    res.status(404).json({ error: "Sifariş tapılmadı." });
    return;
  }
  if (order.paymentMethod !== "card") {
    res.status(400).json({ error: "Bu sifariş kartla ödəniş deyil." });
    return;
  }
  if (order.paymentStatus === "captured" || order.paymentStatus === "paid_on_delivery") {
    res.status(409).json({ error: "Bu sifariş artıq ödənilib." });
    return;
  }
  const qepik = order.totalQepik ?? order.productSubtotalQepik;
  const amountAzN = Number((qepik / 100).toFixed(2));
  if (!Number.isFinite(amountAzN) || amountAzN <= 0) {
    res.status(400).json({ error: "Ödəniş məbləği hazır deyil." });
    return;
  }
  const origin = siteOrigin(req);
  const session = buildCardCheckout({
    orderId: order.id,
    orderNumber: order.orderNumber,
    amountAzN,
    successUrl: `${origin}/order/${order.id}`,
    errorUrl: `${origin}/checkout?payment=failed`,
  });
  res.json(session);
});

router.post("/payments/epoint/result", async (req, res): Promise<void> => {
  const data = typeof req.body?.data === "string" ? req.body.data : "";
  const signature = typeof req.body?.signature === "string" ? req.body.signature : "";
  if (!data || !signature || !epointReady() || !epointSignatureMatches(data, signature)) {
    res.status(400).send("invalid");
    return;
  }
  let payload: Record<string, unknown>;
  try {
    payload = decodeEpointData(data);
  } catch {
    res.status(400).send("invalid");
    return;
  }
  const orderId = typeof payload.order_id === "string" ? payload.order_id : "";
  const status = typeof payload.status === "string" ? payload.status : "";
  if (!orderId) {
    res.status(400).send("invalid");
    return;
  }
  const paid = status === "success";
  const [updated] = await db
    .update(marketplaceOrdersTable)
    .set({
      paymentStatus: paid ? "captured" : "failed",
      updatedAt: new Date(),
    })
    .where(eq(marketplaceOrdersTable.id, orderId))
    .returning({ id: marketplaceOrdersTable.id });
  if (updated) {
    await db.insert(marketplaceOrderEventsTable).values({
      id: randomUUID(),
      orderId,
      status: paid ? "captured" : "failed",
      label: paid ? "Kart ödənişi Epoint-də təsdiqləndi." : "Kart ödənişi Epoint-də alınmadı.",
    });
  }
  res.status(200).send("ok");
});

export default router;
