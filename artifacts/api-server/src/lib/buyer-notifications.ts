import { brandEmail, sendEmail } from "./email";
import { buyerNotice, normalizeAzMobile, type BuyerNotice } from "./buyer-notices";
import { logger } from "./logger";
import { sendSms } from "./sms";

function siteOrigin() {
  return (process.env.BETTER_AUTH_URL?.trim() || "https://eynek.store").replace(/\/$/, "");
}

function orderPageUrl(orderId?: string, accessToken?: string) {
  if (orderId) {
    const base = `${siteOrigin()}/order/${orderId}`;
    if (!accessToken) return base;
    const query = new URLSearchParams({ access: accessToken });
    return `${base}?${query.toString()}#${accessToken}`;
  }
  return `${siteOrigin()}/account`;
}

export function notifyBuyer(input: {
  email: string;
  phone: string;
  orderNumber: string;
  orderId?: string;
  accessToken?: string;
  notice: BuyerNotice;
}) {
  const copy = buyerNotice(input.orderNumber, input.notice);
  void sendEmail(brandEmail({
    to: input.email,
    subject: copy.subject,
    badge: copy.badge,
    headline: copy.headline,
    body: copy.body,
    details: copy.details,
    accent: copy.accent,
    action: "Sifarişə bax",
    url: orderPageUrl(input.orderId, input.accessToken),
    outro: "Bu bildiriş yalnız sifarişinizin vəziyyəti üçündür.",
  }));

  const to = normalizeAzMobile(input.phone);
  if (!to) {
    logger.warn({ orderNumber: input.orderNumber }, "SMS skipped: phone is not an Azerbaijan mobile number");
    return;
  }
  void sendSms({ to, body: copy.sms });
}
