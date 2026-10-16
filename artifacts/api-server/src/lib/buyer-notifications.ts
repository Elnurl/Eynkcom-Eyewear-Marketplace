import { brandEmail, sendEmail } from "./email";
import { buyerNotice, normalizeAzMobile, type BuyerNotice } from "./buyer-notices";
import { logger } from "./logger";
import { sendSms } from "./sms";

function siteOrigin() {
  return (process.env.BETTER_AUTH_URL?.trim() || "https://eynek.store").replace(/\/$/, "");
}

function orderPageUrl(orderId?: string) {
  if (orderId) return `${siteOrigin()}/order/${orderId}`;
  return `${siteOrigin()}/account`;
}

export function notifyBuyer(input: { email: string; phone: string; orderNumber: string; orderId?: string; notice: BuyerNotice }) {
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
    url: orderPageUrl(input.orderId),
    outro: "Bu bildiriş yalnız sifarişinizin vəziyyəti üçündür.",
  }));

  const to = normalizeAzMobile(input.phone);
  if (!to) {
    logger.warn({ orderNumber: input.orderNumber }, "SMS skipped: phone is not an Azerbaijan mobile number");
    return;
  }
  void sendSms({ to, body: copy.sms });
}
