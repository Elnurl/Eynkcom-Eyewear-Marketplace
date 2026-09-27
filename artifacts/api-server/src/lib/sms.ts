import { logger } from "./logger";

/**
 * Transactional SMS through Sinch SMS (XMS). Without the service plan, token,
 * and sender the message is not sent. Order placement must still succeed.
 */
export async function sendSms(message: { to: string; body: string }): Promise<void> {
  const planId = process.env.SINCH_SERVICE_PLAN_ID?.trim();
  const token = process.env.SINCH_API_TOKEN?.trim();
  const from = process.env.SINCH_SMS_FROM?.trim();
  if (!planId || !token || !from) {
    if (process.env.NODE_ENV === "production") {
      logger.warn({ subject: "sms" }, "SMS not sent: SINCH_SERVICE_PLAN_ID/SINCH_API_TOKEN/SINCH_SMS_FROM not configured");
    } else {
      logger.info({ to: message.to, body: message.body }, "SMS (development, not sent)");
    }
    return;
  }

  const region = process.env.SINCH_SMS_REGION?.trim() || "eu";
  try {
    const response = await fetch(`https://${region}.sms.api.sinch.com/xms/v1/${planId}/batches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [message.to], body: message.body }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      logger.error({ status: response.status, body: await response.text() }, "SMS provider rejected message");
    }
  } catch (error) {
    logger.error({ err: error }, "SMS delivery failed");
  }
}
