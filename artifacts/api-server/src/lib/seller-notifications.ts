import { desc, inArray } from "drizzle-orm";
import { db, sellerApplicationsTable, sellerStoresTable } from "@workspace/db";
import { brandEmail, sendEmail } from "./email";
import { normalizeAzMobile } from "./buyer-notices";
import { logger } from "./logger";
import { adminNotice, sellerNotice, type SellerNotice, type SellerNoticeKind } from "./seller-notices";
import { sendSms } from "./sms";

function siteOrigin() {
  return (process.env.BETTER_AUTH_URL?.trim() || "https://eynek.store").replace(/\/$/, "");
}

export type SellerNotifyTarget = {
  sellerId: string;
  storeName: string;
  email: string;
  phone: string;
};

export async function loadSellerNotifyTargets(sellerIds: string[]): Promise<SellerNotifyTarget[]> {
  const uniqueIds = [...new Set(sellerIds.filter(Boolean))];
  if (!uniqueIds.length) return [];
  const stores = await db
    .select({
      id: sellerStoresTable.id,
      name: sellerStoresTable.name,
      ownerEmail: sellerStoresTable.ownerEmail,
      phone: sellerStoresTable.phone,
    })
    .from(sellerStoresTable)
    .where(inArray(sellerStoresTable.id, uniqueIds));
  const emails = [
    ...new Set(
      stores.flatMap((store) => {
        const raw = store.ownerEmail.trim();
        if (!raw) return [];
        return [raw, raw.toLocaleLowerCase("en-US")];
      }),
    ),
  ];
  const phones = new Map<string, string>();
  if (emails.length) {
    const applications = await db
      .select({
        email: sellerApplicationsTable.email,
        phone: sellerApplicationsTable.phone,
        createdAt: sellerApplicationsTable.createdAt,
      })
      .from(sellerApplicationsTable)
      .where(inArray(sellerApplicationsTable.email, emails))
      .orderBy(desc(sellerApplicationsTable.createdAt));
    for (const row of applications) {
      const key = row.email.trim().toLocaleLowerCase("en-US");
      if (!phones.has(key) && row.phone.trim()) phones.set(key, row.phone.trim());
    }
  }
  return stores.map((store) => {
    const email = store.ownerEmail.trim().toLocaleLowerCase("en-US");
    return {
      sellerId: store.id,
      storeName: store.name,
      email,
      phone: store.phone?.trim() || phones.get(email) || "",
    };
  });
}

function dispatch(toEmail: string, toPhone: string, copy: ReturnType<typeof sellerNotice>, url: string, action: string) {
  void sendEmail(brandEmail({
    to: toEmail,
    subject: copy.subject,
    badge: copy.badge,
    headline: copy.headline,
    body: copy.body,
    action,
    url,
    outro: "Bu bildiriş EYNƏK sifariş axını üçündür.",
  }));
  const mobile = normalizeAzMobile(toPhone);
  if (!mobile) {
    if (toPhone) logger.warn({ toEmail }, "Seller/admin SMS skipped: phone is not an Azerbaijan mobile number");
    return;
  }
  void sendSms({ to: mobile, body: copy.sms });
}

export function notifySeller(input: {
  email: string;
  phone: string;
  storeName: string;
  orderNumber: string;
  notice: SellerNotice;
}) {
  if (!input.email) return;
  const copy = sellerNotice(input.orderNumber, input.storeName, input.notice);
  dispatch(input.email, input.phone, copy, `${siteOrigin()}/seller-orders`, "Sifarişlərə bax");
}

export function notifyAdmin(input: {
  orderNumber: string;
  customerName: string;
  storeNames: string;
  kind: "new_order" | "paid";
}) {
  const email = process.env.MARKETPLACE_ADMIN_EMAIL?.trim() ?? "";
  const phone = process.env.MARKETPLACE_ADMIN_PHONE?.trim() ?? "";
  if (!email) return;
  const copy = adminNotice(input.orderNumber, {
    kind: input.kind,
    customerName: input.customerName,
    storeNames: input.storeNames,
  });
  dispatch(email, phone, copy, `${siteOrigin()}/seller-admin/orders`, "Admin sifarişlər");
}

export async function notifySellersForOrder(input: {
  sellerIds: string[];
  orderNumber: string;
  customerName: string;
  noticeKind: SellerNoticeKind;
}) {
  const targets = await loadSellerNotifyTargets(input.sellerIds);
  if (input.sellerIds.length && targets.length === 0) {
    logger.warn(
      { sellerIds: input.sellerIds, orderNumber: input.orderNumber },
      "Seller notifications skipped: store targets not found",
    );
  }
  const notice: SellerNotice = { kind: input.noticeKind, customerName: input.customerName };
  for (const target of targets) {
    if (!target.email) {
      logger.warn(
        { sellerId: target.sellerId, orderNumber: input.orderNumber },
        "Seller notification skipped: store has no owner email",
      );
      continue;
    }
    notifySeller({
      email: target.email,
      phone: target.phone,
      storeName: target.storeName,
      orderNumber: input.orderNumber,
      notice,
    });
  }
  return targets;
}

export function notifyMarketplaceStaff(input: {
  sellerIds: string[];
  orderNumber: string;
  customerName: string;
  noticeKind: SellerNoticeKind;
}) {
  void (async () => {
    try {
      const targets = await notifySellersForOrder(input);
      if (input.noticeKind === "new_order" || input.noticeKind === "paid") {
        notifyAdmin({
          orderNumber: input.orderNumber,
          customerName: input.customerName,
          storeNames: targets.map((target) => target.storeName).join(", ") || "—",
          kind: input.noticeKind,
        });
      }
    } catch (error) {
      logger.error({ err: error, orderNumber: input.orderNumber }, "Seller/admin notifications failed");
    }
  })();
}
