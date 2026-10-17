import { logger } from "./logger";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type EmailDetailRow = { label: string; value: string; hint?: string };

export type BrandEmailAccent = "success" | "warning" | "neutral";

export interface BrandEmailOptions {
  to: string;
  subject: string;
  badge: string;
  headline: string;
  body: string;
  action: string;
  url: string;
  outro?: string;
  details?: EmailDetailRow[];
  accent?: BrandEmailAccent;
}

const ACCENT_DOT: Record<BrandEmailAccent, string> = {
  success: "#b5e048",
  warning: "#e8a317",
  neutral: "#9aa3ad",
};

function safeHref(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "#";
    return parsed.href;
  } catch {
    return "#";
  }
}

async function postResend(payload: Record<string, unknown>): Promise<{ ok: boolean; status: number; body: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, status: 0, body: "missing api key" };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
}

/**
 * Transactional email through Resend's HTTP API. Without RESEND_API_KEY the
 * message is not sent: development logs it (links included) so flows can be
 * tested locally; production logs only that delivery was skipped.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const to = message.to.trim();
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      logger.warn({ to, subject: message.subject }, "Email not sent: RESEND_API_KEY/EMAIL_FROM not configured");
    } else {
      logger.info({ to, subject: message.subject, text: message.text }, "Email (development, not sent)");
    }
    return;
  }
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    logger.warn({ to, subject: message.subject }, "Email not sent: invalid recipient");
    return;
  }

  try {
    const primary = await postResend({ from, to: [to], subject: message.subject, text: message.text, html: message.html });
    if (primary.ok) {
      logger.info({ to, subject: message.subject, providerStatus: primary.status }, "Email accepted by provider");
      return;
    }
    logger.error(
      { status: primary.status, body: primary.body, subject: message.subject },
      "Email provider rejected HTML message; retrying text-only",
    );
    const fallback = await postResend({ from, to: [to], subject: message.subject, text: message.text });
    if (fallback.ok) {
      logger.info({ to, subject: message.subject }, "Email sent as text-only fallback");
      return;
    }
    logger.error({ status: fallback.status, body: fallback.body, subject: message.subject }, "Email provider rejected message");
  } catch (error) {
    logger.error({ err: error, subject: message.subject }, "Email delivery failed");
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function detailRowsHtml(details: EmailDetailRow[]): string {
  if (!details.length) return "";
  const rows = details.map((row, index) => {
    const border = index < details.length - 1 ? "border-bottom:1px solid #e4e8ee;" : "";
    const hint = row.hint
      ? `<div style="margin-top:4px;font-size:12px;line-height:1.5;color:#8a9099;">${escapeHtml(row.hint)}</div>`
      : "";
    return `<div style="padding:14px 18px;${border}">
<div style="font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#9aa0a8;margin-bottom:6px;">${escapeHtml(row.label)}</div>
<div style="font-size:14px;font-weight:600;line-height:1.45;color:#1a1f26;">${escapeHtml(row.value)}</div>
${hint}
</div>`;
  }).join("");
  return `<div style="margin:0 0 24px;background:#f3f5f8;border-radius:2px;">${rows}</div>`;
}

function detailsPlain(details: EmailDetailRow[]): string {
  if (!details.length) return "";
  return `\n\n${details.map((row) => `${row.label}: ${row.value}${row.hint ? ` (${row.hint})` : ""}`).join("\n")}`;
}

export function brandEmail(options: BrandEmailOptions): EmailMessage {
  const accent = options.accent ?? "success";
  const dot = ACCENT_DOT[accent];
  const outro = options.outro ?? "Bu bildiriş yalnız sifarişinizin vəziyyəti üçündür.";
  const details = options.details ?? [];
  const actionLabel = options.action.includes("→") ? options.action : `${options.action} →`;
  const href = safeHref(options.url);

  const text = `${options.badge}\n\n${options.headline}\n\n${options.body}${detailsPlain(details)}\n\n${actionLabel}: ${href}\n\n${outro}\n\nEYNƏK · eynek.store`;

  const html = `<!DOCTYPE html>
<html lang="az">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef1f5;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef1f5;padding:36px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;">
<tr><td style="padding:26px 32px 18px;border-bottom:1px solid #e8ebf0;font-family:Helvetica,Arial,sans-serif;">
<span style="font-size:14px;font-weight:700;letter-spacing:0.08em;color:#111111;">EYNƏK</span>
</td></tr>
<tr><td style="padding:32px 32px 28px;font-family:Helvetica,Arial,sans-serif;">
<table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:22px;"><tr>
<td style="width:10px;vertical-align:middle;padding-right:10px;"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${dot};"></span></td>
<td style="vertical-align:middle;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#8a9099;">${escapeHtml(options.badge)}</td>
</tr></table>
<h1 style="margin:0 0 14px;font-size:28px;font-weight:300;line-height:1.28;color:#3d4450;">${escapeHtml(options.headline)}</h1>
<p style="margin:0 0 26px;font-size:14px;line-height:1.65;color:#7a828c;">${escapeHtml(options.body)}</p>
${detailRowsHtml(details)}
<a href="${href.replace(/"/g, "&quot;")}" style="display:block;box-sizing:border-box;text-align:center;background:#0b0b0b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:16px 24px;">${escapeHtml(actionLabel)}</a>
</td></tr>
<tr><td style="padding:22px 32px 28px;border-top:1px solid #e8ebf0;font-family:Helvetica,Arial,sans-serif;">
<p style="margin:0 0 10px;font-size:11px;line-height:1.55;color:#9aa0a8;">${escapeHtml(outro)}</p>
<p style="margin:0;font-size:12px;line-height:1.5;color:#111111;"><strong style="font-weight:700;">EYNƏK</strong> <span style="color:#9aa0a8;">·</span> <span style="color:#6b7280;">eynek.store</span></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { to: options.to, subject: options.subject, text, html };
}

/** Simple CTA mail (auth, reset) using the same EYNƏK layout. */
export function actionEmail(options: {
  to: string;
  subject: string;
  intro: string;
  action: string;
  url: string;
  outro: string;
  badge?: string;
  headline?: string;
}): EmailMessage {
  const headline = options.headline ?? options.intro.split(/[.!?]/)[0]?.trim();
  const resolvedHeadline = headline && !headline.endsWith(".") ? `${headline}.` : headline || options.intro;
  return brandEmail({
    to: options.to,
    subject: options.subject,
    badge: options.badge ?? "EYNƏK",
    headline: resolvedHeadline,
    body: options.intro,
    action: options.action,
    url: options.url,
    outro: options.outro,
    accent: "neutral",
  });
}
