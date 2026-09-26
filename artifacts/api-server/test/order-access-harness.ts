import { createHash } from "node:crypto";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import * as tables from "../../../lib/db/src/schema/index";

function sessionFor(id: string, email: string, emailVerified = true) {
  const now = new Date();
  return { user: { id, name: id, email, emailVerified, image: null, createdAt: now, updatedAt: now } };
}
export const sessions: Record<string, ReturnType<typeof sessionFor>> = {
  owner: sessionFor("owner", "owner@example.com"),
  stranger: sessionFor("stranger", "stranger@example.com"),
  admin: sessionFor("admin", "admin@example.com"),
  seller: sessionFor("seller", "seller@example.com"),
  otherSeller: sessionFor("other-seller", "other-seller@example.com"),
  pendingSeller: sessionFor("pending-seller", "pending-seller@example.com"),
  // Signed in but has not proven the address it claims.
  untrusted: sessionFor("untrusted", "owner@example.com", false),
};
export async function getRequestSession(req: { headers: Record<string, string | string[] | undefined> }) {
  const key = req.headers["x-test-session"];
  return sessions[typeof key === "string" ? key : ""] ?? null;
}

export const token = "a".repeat(64);
export const wrongToken = "b".repeat(64);
export const orders: Record<string, any> = {};
export const users = [
  { id: "owner", email: "owner@example.com", name: "Owner Buyer", createdAt: new Date() },
  { id: "stranger", email: "stranger@example.com", name: "Other Buyer", createdAt: new Date() },
  { id: "admin", email: "admin@example.com", name: "Admin User", createdAt: new Date() },
  { id: "seller", email: "seller@example.com", name: "Seller User", createdAt: new Date() },
  { id: "other-seller", email: "other-seller@example.com", name: "Other Seller", createdAt: new Date() },
  { id: "pending-seller", email: "pending-seller@example.com", name: "Pending Seller", createdAt: new Date() },
];
export const products = [
  { id: "product-1", sellerId: "store-1", name: "Frames", price: 40, stock: 10, status: "Aktiv", approvalStatus: "approved" },
];
export const stores = [
  { id: "store-1", name: "Optics", status: "active", ownerEmail: "seller@example.com", location: "Bakı, Nizami 12" },
  { id: "store-2", name: "Other Optics", status: "active", ownerEmail: "other-seller@example.com", location: "Abşeron, Xırdalan" },
  { id: "store-pending", name: "Pending Optics", status: "pending", ownerEmail: "pending-seller@example.com", location: "Bakı" },
];
export const sellerOrders: any[] = [];
export const events: any[] = [];
export const items: any[] = [];
export const returnRequests: any[] = [];
export const settlements: any[] = [];

export function reset() {
  for (const key of Object.keys(orders)) delete orders[key];
  sellerOrders.length = 0;
  events.length = 0;
  items.length = 0;
  returnRequests.length = 0;
  settlements.length = 0;
  products[0].stock = 10;
}
export function seedOrder(id: string, buyerUserId: string | null, status = "awaiting_buyer_approval") {
  orders[id] = {
    id, buyerUserId, status, orderNumber: `EYN-${id}`, accessTokenHash: createHash("sha256").update(token).digest("hex"),
    paymentMethod: "pay_on_delivery", paymentStatus: "due_on_delivery",
    customerName: "Buyer", customerEmail: "buyer@example.com", customerPhone: "0500000000",
    deliveryArea: "Bakı", deliveryAddress: "Street 1", deliveryNote: "", fulfillmentMethod: "courier",
    productSubtotalQepik: 4000, deliveryTotalQepik: 0, totalQepik: 4000, refundedQepik: 0, buyerApprovedAt: null,
    createdAt: new Date(), updatedAt: new Date(),
  };
  sellerOrders.push({
    id: `seller-${id}`, orderId: id, sellerId: "store-1", status: "confirmed",
    productSubtotalQepik: 4000, deliveryFeeQepik: 0, confirmedAt: new Date(),
  });
  return orders[id];
}

export function seedSellerOrder(id: string, storeId: string) {
  seedOrder(id, null, "pending_confirmation");
  const sellerOrder = sellerOrders[sellerOrders.length - 1];
  sellerOrder.sellerId = storeId;
  sellerOrder.status = "pending_confirmation";
  sellerOrder.deliveryFeeQepik = null;
  sellerOrder.confirmedAt = null;
  sellerOrder.updatedAt = new Date();
  return sellerOrder;
}

export function seedPayableOrder(id: string) {
  seedOrder(id, "owner", "delivered");
  const order = orders[id];
  order.paymentStatus = "paid_on_delivery";
  const sellerOrder = sellerOrders[sellerOrders.length - 1];
  sellerOrder.status = "delivered";
  sellerOrder.collectedAtDelivery = true;
  sellerOrder.commissionQepik = 200;
  sellerOrder.sellerEarningsQepik = 3800;
  sellerOrder.refundedQepik = 0;
  sellerOrder.productRefundedQepik = 0;
  const settlement = {
    id: `settle-${id}`,
    orderId: id,
    sellerOrderId: sellerOrder.id,
    sellerId: sellerOrder.sellerId,
    productSalesQepik: 4000,
    deliveryFeeQepik: 0,
    commissionQepik: 200,
    sellerEarningsQepik: 3800,
    status: "payable",
    settlementReference: null,
    settledAt: null,
  };
  settlements.push(settlement);
  return { order, sellerOrder, settlement };
}

const dialect = new PgDialect();
function filter(rows: any[], condition: any) {
  if (!condition) return rows;
  const { sql, params } = dialect.sqlToQuery(condition);
  return rows.filter((row) => {
    for (const [, field, placeholders] of sql.matchAll(/"([a-z_]+)"\s+in\s*\(([^)]+)\)/gi)) {
      const key = field.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
      const allowed = [...placeholders.matchAll(/\$(\d+)/g)].map((match) => params[Number(match[1]) - 1]);
      if (!allowed.includes(row[key])) return false;
    }
    return params.every((value, index) => {
      const field = sql.match(new RegExp(`"([a-z_]+)"\\s*=\\s*\\$${index + 1}`))?.[1];
      if (!field) return true;
      const key = field.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
      return row[key] === value;
    });
  });
}
const data: Record<string, () => any[]> = {
  users: () => users,
  marketplace_orders: () => Object.values(orders),
  marketplace_seller_orders: () => sellerOrders,
  marketplace_order_events: () => events,
  marketplace_order_items: () => items,
  marketplace_return_requests: () => returnRequests,
  marketplace_settlement_ledger: () => settlements,
  seller_products: () => products,
  seller_stores: () => stores,
};
function query(table: any, condition?: any, projection?: Record<string, any>) {
  const rows = filter(data[getTableName(table)]?.() ?? [], condition);
  if (!projection) return rows;
  return rows.map((row) => Object.fromEntries(Object.entries(projection).map(([key, col]: [string, any]) => [key, row[col.name.replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase())]])));
}
function select(projection?: Record<string, any>) {
  let table: any;
  let condition: any;
  const chain: any = {
    from(value: any) { table = value; return chain; },
    where(value: any) { condition = value; return chain; },
    limit() { return chain; },
    orderBy() { return chain; },
    for() { return chain; },
    then(resolve: any, reject: any) { return Promise.resolve(query(table, condition, projection)).then(resolve, reject); },
  };
  return chain;
}
function insert(table: any) {
  let inserted: any;
  const chain: any = {
    values(value: any) {
      inserted = value;
      const name = getTableName(table);
      if (name === "marketplace_orders") orders[value.id] = { ...value, createdAt: new Date(), updatedAt: new Date(), buyerApprovedAt: null };
      else data[name]?.().push(value);
      return chain;
    },
    onConflictDoNothing() { return chain; },
    returning() { return Promise.resolve([inserted]); },
    then(resolve: any, reject: any) { return Promise.resolve().then(resolve, reject); },
  };
  return chain;
}
function update(table: any) {
  let values: any;
  let condition: any;
  const chain: any = {
    set(value: any) { values = value; return chain; },
    where(value: any) { condition = value; return chain; },
    returning() { return Promise.resolve(apply()); },
    then(resolve: any, reject: any) { return Promise.resolve(apply()).then(resolve, reject); },
  };
  function apply() {
    const rows = query(table, condition);
    rows.forEach((row: any) => Object.assign(row, values));
    return rows;
  }
  return chain;
}
export const db = {
  select, insert, update,
  transaction: async (callback: (tx: typeof db) => Promise<any>) => callback(db),
};

export function tokenMatches(supplied: string, hash: string) {
  return createHash("sha256").update(supplied).digest("hex") === hash;
}
export async function loadBuyerOrder(id: string) {
  const order = orders[id];
  if (!order) return null;
  return {
    id: order.id, orderNumber: order.orderNumber, status: order.status,
    fulfillmentMethod: order.fulfillmentMethod ?? "courier",
    paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus,
    customerName: order.customerName, customerEmail: order.customerEmail,
    customerPhone: order.customerPhone, deliveryArea: order.deliveryArea,
    deliveryAddress: order.deliveryAddress, deliveryNote: order.deliveryNote,
    productSubtotalAzN: order.productSubtotalQepik / 100, deliveryTotalAzN: order.deliveryTotalQepik === null ? null : order.deliveryTotalQepik / 100,
    totalAzN: order.totalQepik === null ? null : order.totalQepik / 100,
    sellerOrders: [], timeline: [], createdAt: order.createdAt,
  };
}
function mapSettlement(sellerOrderId: string) {
  const settlement = settlements.find((item) => item.sellerOrderId === sellerOrderId);
  return {
    settlementStatus: settlement?.status ?? "not_eligible",
    ...(settlement?.settlementReference ? { settlementReference: settlement.settlementReference } : {}),
    ...(settlement?.settledAt ? { settledAt: settlement.settledAt } : {}),
  };
}

function mapReturnRequest(sellerOrderId: string) {
  const request = returnRequests.find((item) => item.sellerOrderId === sellerOrderId);
  return request
    ? {
        id: request.id,
        sellerOrderId: request.sellerOrderId,
        status: request.status,
        reason: request.reason,
        note: request.note || null,
        adminNote: request.adminNote || null,
        createdAt: request.createdAt ?? new Date(),
        updatedAt: request.updatedAt ?? new Date(),
      }
    : undefined;
}

export async function listAdminOrders() {
  return Object.values(orders).map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    fulfillmentMethod: order.fulfillmentMethod ?? "courier",
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    productSubtotalAzN: order.productSubtotalQepik / 100,
    deliveryTotalAzN: order.deliveryTotalQepik === null ? null : order.deliveryTotalQepik / 100,
    totalAzN: order.totalQepik === null ? null : order.totalQepik / 100,
    refundedAzN: (order.refundedQepik ?? 0) / 100,
    sellerOrders: sellerOrders.filter((row) => row.orderId === order.id).map((row) => {
      const store = stores.find((store) => store.id === row.sellerId);
      return {
        id: row.id,
        sellerName: store?.name ?? "Mağaza",
        status: row.status,
        items: [],
        productSubtotalAzN: row.productSubtotalQepik / 100,
        deliveryFeeAzN: row.deliveryFeeQepik === null ? null : row.deliveryFeeQepik / 100,
        sellerEarningsAzN: null,
        commissionAzN: null,
        trackingCode: null,
        ...mapSettlement(row.id),
        refundedAzN: 0,
        productRefundedAzN: 0,
        ...(mapReturnRequest(row.id) ? { returnRequest: mapReturnRequest(row.id) } : {}),
      };
    }),
    createdAt: order.createdAt,
  }));
}
function sellerOrderResponse(row: any) {
  const order = orders[row.orderId];
  const store = stores.find((store) => store.id === row.sellerId);
  if (!order || !store) return null;
  const returnRequest = mapReturnRequest(row.id);
  return {
    id: row.id, sellerName: store.name, status: row.status, items: [],
    productSubtotalAzN: row.productSubtotalQepik / 100,
    deliveryFeeAzN: row.deliveryFeeQepik === null ? null : row.deliveryFeeQepik / 100,
    sellerEarningsAzN: null, commissionAzN: null, trackingCode: null,
    ...mapSettlement(row.id), refundedAzN: 0, productRefundedAzN: 0,
    orderNumber: order.orderNumber, customerName: order.customerName,
    customerEmail: order.customerEmail, customerPhone: order.customerPhone,
    deliveryArea: order.deliveryArea, deliveryAddress: order.deliveryAddress,
    deliveryNote: order.deliveryNote, fulfillmentMethod: order.fulfillmentMethod ?? "courier", paymentMethod: order.paymentMethod,
    ...(returnRequest ? { returnRequest } : {}),
    paymentStatus: order.paymentStatus, updatedAt: row.updatedAt,
  };
}
export async function listSellerOrders(storeId: string) {
  return sellerOrders.filter((row) => row.sellerId === storeId).map(sellerOrderResponse);
}
export async function loadSellerOrder(id: string) {
  const row = sellerOrders.find((row) => row.id === id);
  return row ? sellerOrderResponse(row) : null;
}
export { tables };