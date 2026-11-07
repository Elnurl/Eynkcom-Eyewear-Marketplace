import { createHash, timingSafeEqual } from "node:crypto";

const CHECKOUT_URL = "https://epoint.az/api/1/checkout";

export function epointPublicKey() {
  return process.env.EPOINT_PUBLIC_KEY?.trim() || "i7448";
}

export function epointPrivateKey() {
  return process.env.EPOINT_PRIVATE_KEY?.trim() || "";
}

export function epointReady() {
  return Boolean(epointPrivateKey());
}

export function signEpoint(data: string, privateKey = epointPrivateKey()) {
  return createHash("sha1").update(`${privateKey}${data}${privateKey}`).digest("base64");
}

export function epointSignatureMatches(data: string, signature: string) {
  const expected = signEpoint(data);
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function encodeEpointData(payload: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function decodeEpointData(data: string): Record<string, unknown> {
  const json = Buffer.from(data, "base64").toString("utf8");
  const parsed = JSON.parse(json) as unknown;
  if (!parsed || typeof parsed !== "object") throw new Error("Epoint data is not an object");
  return parsed as Record<string, unknown>;
}

export function buildCardCheckout(input: {
  orderId: string;
  orderNumber: string;
  amountAzN: number;
  successUrl: string;
  errorUrl: string;
}) {
  const payload = {
    public_key: epointPublicKey(),
    amount: input.amountAzN.toFixed(2),
    currency: "AZN",
    language: "az",
    order_id: input.orderId,
    description: `EYNƏK sifariş ${input.orderNumber}`,
    success_redirect_url: input.successUrl,
    error_redirect_url: input.errorUrl,
  };
  const data = encodeEpointData(payload);
  return { data, signature: signEpoint(data), checkoutUrl: CHECKOUT_URL };
}
