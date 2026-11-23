import assert from "node:assert/strict";
import test from "node:test";
import { adminNotice, sellerNotice } from "../src/lib/seller-notices.ts";
import { buyerNotice } from "../src/lib/buyer-notices.ts";

test("seller new order copy names the store and deadline", () => {
  const copy = sellerNotice("EYN-1", "Horizon Optic", { kind: "new_order", customerName: "Vüsal" });
  assert.match(copy.sms, /EYN-1/);
  assert.match(copy.sms, /Horizon Optic/);
  assert.match(copy.body, /30 dəqiqə/);
});

test("admin paid copy is distinct from seller copy", () => {
  const copy = adminNotice("EYN-2", { kind: "paid", customerName: "Vüsal", storeNames: "Horizon Optic" });
  assert.match(copy.subject, /admin/);
  assert.match(copy.body, /Epoint/);
});

test("buyer paid notice confirms the card payment", () => {
  const copy = buyerNotice("EYN-3", { kind: "paid" });
  assert.match(copy.sms, /ödənişi qəbul olundu/);
});
