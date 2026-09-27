import assert from "node:assert/strict";
import test from "node:test";
import { buyerNotice, normalizeAzMobile, noticeForSellerStatus } from "../src/lib/buyer-notices.ts";

test("Azerbaijan mobiles become Sinch numbers", () => {
  assert.equal(normalizeAzMobile("050 123 45 67"), "994501234567");
  assert.equal(normalizeAzMobile("+994551112233"), "994551112233");
  assert.equal(normalizeAzMobile("070-999-88-77"), "994709998877");
  assert.equal(normalizeAzMobile("0123456789"), null);
  assert.equal(normalizeAzMobile("not-a-phone"), null);
});

test("seller status maps to a buyer notice, preparing stays quiet", () => {
  assert.equal(noticeForSellerStatus("preparing", "Optika", false), null);
  assert.deepEqual(noticeForSellerStatus("declined", "Optika", false), { kind: "declined", storeName: "Optika" });
  const ready = noticeForSellerStatus("out_for_delivery", "Optika", true);
  assert.equal(ready && buyerNotice("EYN-1", ready).sms.includes("götürməyə hazırdır"), true);
  const sent = noticeForSellerStatus("out_for_delivery", "Optika", false);
  assert.equal(sent && buyerNotice("EYN-1", sent).sms.includes("çatdırılmaya verildi"), true);
});

test("a new order tells the buyer to wait and pay on delivery", () => {
  const copy = buyerNotice("EYN-AB12", { kind: "placed" });
  assert.match(copy.sms, /EYN-AB12/);
  assert.match(copy.sms, /qapıdadır/);
  assert.match(copy.intro, /Ödəniş/);
});
