import { createHash } from "node:crypto";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import * as tables from "../../../lib/db/src/schema/index";

export const sessions: Record<string, { userId: string | null; sessionClaims?: Record<string, unknown> }> = {
  owner: { userId: "clerk-owner", sessionClaims: { userId: "owner", email: "owner@example.com" } },
  stranger: { userId: "clerk-stranger", sessionClaims: { userId: "stranger", email: "stranger@example.com" } },
  admin: { userId: "clerk-admin", sessionClaims: { userId: "admin", email: "admin@example.com" } },
  seller: { userId: "clerk-seller", sessionClaims: { userId: "seller", email: "seller@example.com" } },
  otherSeller: { userId: "clerk-other-seller", sessionClaims: { userId: "other-seller", email: "other-seller@example.com" } },
  pendingSeller: { userId: "clerk-pending-seller", sessionClaims: { userId: "pending-seller", email: "pending-seller@example.com" } },
  untrusted: { userId: "clerk-untrusted", sessionClaims: { email: "owner@example.com" } },
};
export function getAuth(req: { get: (header: string) => string | undefined }) {
  return sessions[req.get("X-Test-Session") ?? ""] ?? { userId: null };
}

export const token = "a".repeat(64);
export const wrongToken = "b".repeat(64);
export const orders: Record<string, any> = {};
export const users = [
  { id: "owner", email: "owner@example.com", firstName: "Owner", lastName: "Buyer", createdAt: new Date() },
  { id: "stranger", email: "stranger@example.com", firstName: "Other", lastName: "Buyer", createdAt: new Date() },
  { id: "admin", email: "admin@example.com", firstName: "Admin", lastName: "User", createdAt: new Date() },
  { id: "seller", email: "seller@example.com", firstName: "Seller", lastName: "User", createdAt: new Date() },
  { id: "other-seller", email: "other-seller@example.com", firstName: "Other", lastName: "Seller", createdAt: new Date() },
  { id: "pending-seller", email: "pending-seller@example.com", firstName: "Pending", lastName: "Seller", createdAt: new Date() },
];
export const products = [
  { id: "product-1", sellerId: "store-1", name: "Frames", price: 40, stock: 10, status: "Aktiv", approvalStatus: "approved" },
];
export const stores = [
  { id: "store-1", name: "Optics", status: "active", ownerEmail: "seller@example.com" },
  { id: "store-2", name: "Other Optics", status: "active", ownerEmail: "other-seller@example.com" },
  { id: "store-pending", name: "Pending Optics", status: "pending", ownerEmail: "pending-seller@example.com" },
];
export const sellerOrders: any[] = [];
export const events: any[] = [];
export const items: any[] = [];

export function reset() {
  for (const key of Object.keys(orders)) delete orders[key];
  sellerOrders.length = 0;
  events.length = 0;
  items.length = 0;
  products[0].stock = 10;
}
export function seedOrder(id: string, buyerUserId: string | null, status = "awaiting_buyer_approval") {
  orders[id] = {
    id, buyerUserId, status, orderNumber: `EYN-${id}`, accessTokenHash: createHash("sha256").update(token).digest("hex"),
    paymentMethod: "pay_on_delivery", paymentStatus: "due_on_delivery",
    customerName: "Buyer", customerEmail: "buyer@example.com", customerPhone: "0500000000",
    deliveryArea: "Bakı", deliveryAddress: "Street 1", deliveryNote: "",
    productSubtotalQepik: 4000, deliveryTotalQepik: 0, totalQepik: 4000, buyerApprovedAt: null,
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
    paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus,
    customerName: order.customerName, customerEmail: order.customerEmail,
    customerPhone: order.customerPhone, deliveryArea: order.deliveryArea,
    deliveryAddress: order.deliveryAddress, deliveryNote: order.deliveryNote,
    productSubtotalAzN: order.productSubtotalQepik / 100, deliveryTotalAzN: order.deliveryTotalQepik === null ? null : order.deliveryTotalQepik / 100,
    totalAzN: order.totalQepik === null ? null : order.totalQepik / 100,
    sellerOrders: [], timeline: [], createdAt: order.createdAt,
  };
}
export async function listAdminOrders() { return []; }
function sellerOrderResponse(row: any) {
  const order = orders[row.orderId];
  const store = stores.find((store) => store.id === row.sellerId);
  if (!order || !store) return null;
  return {
    id: row.id, sellerName: store.name, status: row.status, items: [],
    productSubtotalAzN: row.productSubtotalQepik / 100,
    deliveryFeeAzN: row.deliveryFeeQepik === null ? null : row.deliveryFeeQepik / 100,
    sellerEarningsAzN: null, commissionAzN: null, trackingCode: null,
    settlementStatus: "not_eligible", refundedAzN: 0, productRefundedAzN: 0,
    orderNumber: order.orderNumber, customerName: order.customerName,
    customerEmail: order.customerEmail, customerPhone: order.customerPhone,
    deliveryArea: order.deliveryArea, deliveryAddress: order.deliveryAddress,
    deliveryNote: order.deliveryNote, paymentMethod: order.paymentMethod,
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