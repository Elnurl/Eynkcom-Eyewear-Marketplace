import { logger } from "./logger";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Transactional email through Resend's HTTP API. Without RESEND_API_KEY the
 * message is not sent: development logs it (links included) so flows can be
 * tested locally; production logs only that delivery was skipped.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      logger.warn({ to: message.to, subject: message.subject }, "Email not sent: RESEND_API_KEY/EMAIL_FROM not configured");
    } else {
      logger.info({ to: message.to, subject: message.subject, text: message.text }, "Email (development, not sent)");
    }
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      logger.error({ status: response.status, body: await response.text(), subject: message.subject }, "Email provider rejected message");
    }
  } catch (error) {
    logger.error({ err: error, subject: message.subject }, "Email delivery failed");
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function actionEmail(options: { to: string; subject: string; intro: string; action: string; url: string; outro: string }): EmailMessage {
  const text = `${options.intro}\n\n${options.action}: ${options.url}\n\n${options.outro}\n\nEYNƏK.com`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#171a3a;max-width:520px">
<p>${escapeHtml(options.intro)}</p>
<p><a href="${escapeHtml(options.url)}" style="display:inline-block;background:#171a3a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${escapeHtml(options.action)}</a></p>
<p style="color:#5c5c5c;font-size:13px">${escapeHtml(options.outro)}</p>
<p style="color:#5c5c5c;font-size:13px">EYNƏK.com</p>
</div>`;
  return { to: options.to, subject: options.subject, text, html };
}
