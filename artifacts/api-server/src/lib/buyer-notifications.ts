import { actionEmail, sendEmail } from "./email";
import { buyerNotice, normalizeAzMobile, type BuyerNotice } from "./buyer-notices";
import { logger } from "./logger";
import { sendSms } from "./sms";

function siteOrigin() {
  return (process.env.BETTER_AUTH_URL?.trim() || "https://eynek.store").replace(/\/$/, "");
}

export function notifyBuyer(input: { email: string; phone: string; orderNumber: string; notice: BuyerNotice }) {
  const copy = buyerNotice(input.orderNumber, input.notice);
  void sendEmail(actionEmail({
    to: input.email,
    subject: copy.subject,
    intro: copy.intro,
    action: "Sifarişə bax",
    url: `${siteOrigin()}/account`,
    outro: "Bu bildiriş yalnız sifarişinizin vəziyyəti üçündür.",
  }));

  const to = normalizeAzMobile(input.phone);
  if (!to) {
    logger.warn({ orderNumber: input.orderNumber }, "SMS skipped: phone is not an Azerbaijan mobile number");
    return;
  }
  void sendSms({ to, body: copy.sms });
}
