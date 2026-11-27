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
  assert.equal(noticeForSellerStatus("preparing", "Optika", false, "card", "captured"), null);
  assert.deepEqual(noticeForSellerStatus("declined", "Optika", false, "card", "captured"), {
    kind: "declined",
    storeName: "Optika",
  });
  const ready = noticeForSellerStatus("out_for_delivery", "Optika", true, "pay_on_delivery", "due_on_delivery");
  assert.equal(ready && buyerNotice("EYN-1", ready).sms.includes("götürməyə hazırdır"), true);
  const sent = noticeForSellerStatus("out_for_delivery", "Optika", false, "pay_on_delivery", "due_on_delivery");
  const codCopy = sent && buyerNotice("EYN-1", sent);
  assert.equal(codCopy?.sms.includes("hazırdır"), true);
  assert.equal(codCopy?.body.includes("EYNƏK kuryeri"), true);
  const paid = noticeForSellerStatus("out_for_delivery", "Optika", false, "card", "captured");
  const paidCopy = paid && buyerNotice("EYN-1", paid);
  assert.equal(paidCopy?.body.includes("qapıda"), false);
  assert.equal(paidCopy?.details.some((row) => row.value === "Online kart (Epoint)"), true);
});

test("a new order tells the buyer to wait for store confirmation", () => {
  const copy = buyerNotice("EYN-AB12", { kind: "placed" });
  assert.match(copy.sms, /EYN-AB12/);
  assert.match(copy.sms, /təsdiqini gözləyir/);
  assert.match(copy.intro, /Ödəniş/);
});
