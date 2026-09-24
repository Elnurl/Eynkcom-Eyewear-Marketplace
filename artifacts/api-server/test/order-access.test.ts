import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import express from "express";
import ordersRouter from "../src/routes/orders";
import adminRouter from "../src/routes/admin";
import { events, orders, reset, seedOrder, seedSellerOrder, sellerOrders, token, wrongToken, products } from "./order-access-harness";

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as any).log = { warn() {}, error() {} };
  next();
});
app.use("/api", ordersRouter, adminRouter);
let server: ReturnType<typeof app.listen>;
let base: string;
const previousAdmin = process.env.MARKETPLACE_ADMIN_EMAIL;

before(async () => {
  process.env.MARKETPLACE_ADMIN_EMAIL = "admin@example.com";
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test server address");
  base = `http://127.0.0.1:${address.port}/api`;
});
after(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (previousAdmin === undefined) delete process.env.MARKETPLACE_ADMIN_EMAIL;
  else process.env.MARKETPLACE_ADMIN_EMAIL = previousAdmin;
});
beforeEach(reset);

async function request(path: string, options: {
  method?: string;
  session?: string;
  accessToken?: string;
  body?: unknown;
  headers?: Record<string, string>;
} = {}) {
  const response = await fetch(base + path, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.session ? { "X-Test-Session": options.session } : {}),
      ...(options.accessToken ? { "X-Order-Access-Token": options.accessToken } : {}),
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  return { status: response.status, data: await response.json(), cache: response.headers.get("cache-control") };
}

test("account history requires a verified session and only lists its owner's orders", async () => {
  seedOrder("owned", "owner");
  seedOrder("other", "stranger");
  seedOrder("guest", null);
  assert.equal((await request("/account/orders")).status, 401);
  assert.equal((await request("/account/orders", { accessToken: token, headers: { "X-User-Id": "owner" } })).status, 401);
  assert.equal((await request("/account/orders", { session: "untrusted" })).status, 401);
  const owner = await request("/account/orders", { session: "owner" });
  assert.equal(owner.status, 200);
  assert.deepEqual(owner.data.map((order: any) => order.id), ["owned"]);
  assert.equal(owner.cache, "private, no-store");
  const stranger = await request("/account/orders", { session: "stranger" });
  assert.deepEqual(stranger.data.map((order: any) => order.id), ["other"]);
});

test("order detail accepts the owner or valid guest token, never another account alone", async () => {
  seedOrder("owned", "owner");
  for (const options of [{}, { session: "stranger" }, { accessToken: wrongToken }, { accessToken: "short" }]) {
    const denied = await request("/orders/owned", options);
    assert.equal(denied.status, 404);
    assert.equal(denied.cache, "private, no-store");
  }
  assert.equal((await request("/orders/owned", { session: "untrusted", headers: { "X-User-Id": "owner" } })).status, 401);
  assert.equal((await request("/orders/owned", { session: "owner" })).data.id, "owned");
  assert.equal((await request("/orders/owned", { accessToken: token })).data.id, "owned");
  assert.equal((await request("/orders/owned", { session: "stranger", accessToken: token })).data.id, "owned");
});

test("buyer decisions enforce the same owner-or-token rule before modifying an order", async () => {
  seedOrder("owned", "owner");
  for (const options of [{}, { session: "stranger" }, { accessToken: wrongToken }, { accessToken: "short" }]) {
    assert.equal((await request("/orders/owned/decision", { method: "POST", body: { approve: true }, ...options })).status, 404);
    assert.equal(orders.owned.buyerApprovedAt, null);
    assert.equal(orders.owned.status, "awaiting_buyer_approval");
  }
  const approved = await request("/orders/owned/decision", { method: "POST", session: "owner", body: { approve: true } });
  assert.equal(approved.status, 200);
  assert.ok(orders.owned.buyerApprovedAt instanceof Date);
  seedOrder("guest", null);
  const guest = await request("/orders/guest/decision", { method: "POST", accessToken: token, body: { approve: true } });
  assert.equal(guest.status, 200);
  assert.ok(orders.guest.buyerApprovedAt instanceof Date);
});

const checkout = {
  customerName: "Buyer", customerEmail: "buyer@example.com", customerPhone: "0500000000",
  deliveryArea: "Bakı", deliveryAddress: "Street 1", paymentMethod: "pay_on_delivery",
  guestAccessToken: token, items: [{ productId: "product-1", quantity: 1 }],
};

test("checkout binds ownership only to verified session, never body, email, or forged headers", async () => {
  const guest = await request("/orders", {
    method: "POST", body: { ...checkout, buyerUserId: "owner", customerEmail: "owner@example.com" },
    headers: { "X-User-Id": "owner" },
  });
  assert.equal(guest.status, 201);
  assert.equal(orders[guest.data.id].buyerUserId, null);
  assert.equal(products[0].stock, 9);
  const owner = await request("/orders", {
    method: "POST", session: "owner",
    body: { ...checkout, guestAccessToken: wrongToken, buyerUserId: "stranger", customerEmail: "stranger@example.com" },
    headers: { "X-User-Id": "stranger" },
  });
  assert.equal(owner.status, 201);
  assert.equal(orders[owner.data.id].buyerUserId, "owner");
  const history = await request("/account/orders", { session: "owner" });
  assert.deepEqual(history.data.map((order: any) => order.id), [owner.data.id]);
  const untrusted = await request("/orders", {
    method: "POST", session: "untrusted",
    body: { ...checkout, guestAccessToken: "c".repeat(64), buyerUserId: "owner" },
  });
  assert.equal(untrusted.status, 401);
  assert.equal(products[0].stock, 8);
});

test("admin user and order endpoints reject ordinary buyers even with forged admin headers", async () => {
  seedOrder("owned", "owner");
  for (const path of ["/admin/access", "/admin/users", "/admin/orders"]) {
    assert.equal((await request(path)).status, 401);
    assert.equal((await request(path, { session: "owner", headers: { "X-User-Email": "admin@example.com" } })).status, 403);
    assert.equal((await request(path, { session: "stranger" })).status, 403);
  }
  assert.equal((await request("/admin/access", { session: "admin" })).status, 200);
  assert.equal((await request("/admin/orders", { session: "admin" })).status, 200);
  assert.equal((await request("/admin/users", { session: "admin" })).status, 200);
  assert.equal((await request("/admin/orders/owned/refund", { method: "PATCH", session: "owner", body: {} })).status, 403);
});

test("seller order history is private to each active shop", async () => {
  seedSellerOrder("first", "store-1");
  seedSellerOrder("second", "store-2");
  for (const options of [{}, { session: "untrusted" }, { headers: { "X-User-Email": "seller@example.com" } }]) {
    assert.equal((await request("/seller/orders", options)).status, 401);
  }
  for (const session of ["owner", "pendingSeller"]) {
    assert.equal((await request("/seller/orders", { session })).status, 403);
  }
  const first = await request("/seller/orders", { session: "seller" });
  assert.equal(first.status, 200);
  assert.equal(first.cache, "private, no-store");
  assert.deepEqual(first.data.map((row: any) => row.id), ["seller-first"]);
  const second = await request("/seller/orders", { session: "otherSeller" });
  assert.equal(second.status, 200);
  assert.deepEqual(second.data.map((row: any) => row.id), ["seller-second"]);
});

test("a seller cannot update another shop's order even with a valid status change", async () => {
  const first = seedSellerOrder("first", "store-1");
  const second = seedSellerOrder("second", "store-2");
  const body = { status: "confirmed", deliveryFeeAzN: 0 };
  for (const options of [{}, { session: "untrusted" }]) {
    assert.equal((await request(`/seller/orders/${second.id}`, { method: "PATCH", body, ...options })).status, 401);
  }
  for (const session of ["owner", "pendingSeller"]) {
    assert.equal((await request(`/seller/orders/${second.id}`, { method: "PATCH", body, session })).status, 403);
  }
  const denied = await request(`/seller/orders/${second.id}`, {
    method: "PATCH", body, session: "seller",
    headers: { "X-User-Email": "other-seller@example.com" },
  });
  assert.equal(denied.status, 404);
  assert.equal(second.status, "pending_confirmation");
  assert.equal(second.deliveryFeeQepik, null);
  assert.equal(orders.second.status, "pending_confirmation");
  assert.equal(events.length, 0);

  const updated = await request(`/seller/orders/${first.id}`, { method: "PATCH", body, session: "seller" });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.id, first.id);
  assert.equal(first.status, "confirmed");
  assert.equal(second.status, "pending_confirmation");
  assert.equal(sellerOrders.length, 2);
});