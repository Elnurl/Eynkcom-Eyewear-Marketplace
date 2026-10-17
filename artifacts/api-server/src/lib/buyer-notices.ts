import type { EmailDetailRow } from "./email";

export type BuyerNotice =
  | { kind: "placed" }
  | { kind: "confirmed"; storeName: string }
  | { kind: "declined"; storeName: string }
  | { kind: "cancelled"; storeName: string }
  | { kind: "out_for_delivery"; storeName: string; pickup: boolean }
  | { kind: "delivered"; storeName: string; pickup: boolean };

const mobilePrefixes = new Set(["10", "50", "51", "55", "60", "70", "77", "99"]);

const payOnReceive: EmailDetailRow = {
  label: "Ödəniş",
  value: "Məhsulu alanda",
  hint: "Kuryerdə və ya mağazadan götürəndə.",
};

/** Azerbaijan mobile numbers as Sinch expects them: 994XXXXXXXXX. */
export function normalizeAzMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("994") && local.length === 12) local = local.slice(3);
  else if (local.startsWith("0") && local.length === 10) local = local.slice(1);
  if (local.length !== 9 || !mobilePrefixes.has(local.slice(0, 2))) return null;
  return `994${local}`;
}

export type BuyerNoticeCopy = {
  subject: string;
  sms: string;
  intro: string;
  badge: string;
  headline: string;
  body: string;
  details: EmailDetailRow[];
  accent: "success" | "warning" | "neutral";
};

function orderDetails(orderNumber: string, statusLabel: string, payment?: EmailDetailRow): EmailDetailRow[] {
  const rows: EmailDetailRow[] = [
    { label: "Sifariş nömrəsi", value: orderNumber },
    { label: "Vəziyyət", value: statusLabel },
  ];
  if (payment) rows.push(payment);
  return rows;
}

export function buyerNotice(orderNumber: string, notice: BuyerNotice): BuyerNoticeCopy {
  switch (notice.kind) {
    case "placed":
      return {
        subject: `EYNƏK — sifariş ${orderNumber} qəbul olundu`,
        sms: `EYNƏK: Sifariş ${orderNumber} qəbul olundu. Mağaza təsdiqini gözləyir. Ödəniş qapıdadır.`,
        intro: `Sifariş ${orderNumber} qəbul olundu. Mağaza təsdiq edənə qədər hazırlanmır. Ödəniş məhsulu alanda edilir: kuryerdə və ya mağazadan götürəndə.`,
        badge: "Sifariş qəbul olundu",
        headline: "Sifarişin qəbul olundu.",
        body: "Mağaza təsdiq edənə qədər sifariş hazırlanmır. Vəziyyəti istənilən vaxt yoxlaya bilərsən.",
        details: orderDetails(orderNumber, "Mağazanın təsdiqini gözləyir", payOnReceive),
        accent: "success",
      };
    case "confirmed":
      return {
        subject: `EYNƏK — ${notice.storeName} sifarişi təsdiqlədi`,
        sms: `EYNƏK: ${notice.storeName} sifariş ${orderNumber} təsdiqlədi.`,
        intro: `${notice.storeName} sifariş ${orderNumber} üçün öz hissəsini təsdiqlədi.`,
        badge: "Mağaza təsdiqi",
        headline: "Mağaza sifarişi təsdiqlədi.",
        body: `${notice.storeName} sifariş ${orderNumber} üzrə öz hissəsini təsdiqlədi. Hazırlıq mərhələsi davam edir.`,
        details: orderDetails(orderNumber, `${notice.storeName} təsdiqlədi`, payOnReceive),
        accent: "success",
      };
    case "cancelled":
      return {
        subject: `EYNƏK — ${notice.storeName} sifarişi ləğv etdi`,
        sms: `EYNƏK: ${notice.storeName} sifariş ${orderNumber} ləğv sorğusunu təsdiqlədi.`,
        intro: `${notice.storeName} sifariş ${orderNumber} üzrə ləğv sorğusunu təsdiqlədi.`,
        badge: "Sifariş ləğv edildi",
        headline: "Sifariş ləğv olundu.",
        body: `${notice.storeName} ləğv sorğunu təsdiqlədi. Sifarişin bu mağaza hissəsi bağlanıb.`,
        details: orderDetails(orderNumber, "Ləğv edildi"),
        accent: "neutral",
      };
    case "declined":
      return {
        subject: `EYNƏK — ${notice.storeName} sifarişi qəbul etmədi`,
        sms: `EYNƏK: ${notice.storeName} sifariş ${orderNumber} qəbul etmədi. Qalan hissəni saytda təsdiqlə.`,
        intro: `${notice.storeName} sifariş ${orderNumber} üçün öz hissəsini qəbul etmədi. Başqa mağaza qalıbsa, davam etmək üçün sifariş səhifəsində təsdiq lazımdır.`,
        badge: "Diqqət tələb olunur",
        headline: "Mağaza sifarişi qəbul etmədi.",
        body: `${notice.storeName} sifariş ${orderNumber} üzrə öz hissəsini qəbul etmədi. Davam etmək üçün sifariş səhifəsində qalan mağazaları yoxla.`,
        details: orderDetails(orderNumber, `${notice.storeName} qəbul etmədi`),
        accent: "warning",
      };
    case "out_for_delivery":
      return notice.pickup
        ? {
            subject: `EYNƏK — sifariş ${orderNumber} götürməyə hazırdır`,
            sms: `EYNƏK: Sifariş ${orderNumber} ${notice.storeName} mağazasından götürməyə hazırdır.`,
            intro: `Sifariş ${orderNumber} ${notice.storeName} mağazasında götürməyə hazırdır. Ödəniş mağazada edilir.`,
            badge: "Götürməyə hazırdır",
            headline: "Sifariş mağazada gözləyir.",
            body: `${notice.storeName} sifariş ${orderNumber} üçün məhsulu hazırladı. Mağazadan götürə bilərsən; ödəniş orada edilir.`,
            details: orderDetails(orderNumber, `${notice.storeName} — götürməyə hazır`, {
              label: "Ödəniş",
              value: "Mağazada",
              hint: "Məhsulu götürəndə.",
            }),
            accent: "success",
          }
        : {
            subject: `EYNƏK — sifariş ${orderNumber} yoldadır`,
            sms: `EYNƏK: Sifariş ${orderNumber} çatdırılmaya verildi. Ödəniş qapıdadır.`,
            intro: `${notice.storeName} sifariş ${orderNumber} üçün məhsulu çatdırılmaya verdi. Ödəniş kuryerə, qapıda edilir.`,
            badge: "Çatdırılma yoldadır",
            headline: "Sifariş yola çıxdı.",
            body: `${notice.storeName} sifariş ${orderNumber} üçün məhsulu kuryerə təhvil verdi. Ödəniş qapıda edilir.`,
            details: orderDetails(orderNumber, "Kuryerə verildi", payOnReceive),
            accent: "success",
          };
    case "delivered":
      return notice.pickup
        ? {
            subject: `EYNƏK — sifariş ${orderNumber} təhvil verildi`,
            sms: `EYNƏK: Sifariş ${orderNumber} ${notice.storeName} mağazasından təhvil verildi.`,
            intro: `Sifariş ${orderNumber} ${notice.storeName} mağazasından təhvil verildi.`,
            badge: "Təhvil verildi",
            headline: "Sifariş tamamlandı.",
            body: `${notice.storeName} sifariş ${orderNumber} mağazadan təhvil verildi. EYNƏK-də alış-verişin üçün təşəkkür edirik.`,
            details: orderDetails(orderNumber, "Mağazadan təhvil verildi"),
            accent: "success",
          }
        : {
            subject: `EYNƏK — sifariş ${orderNumber} çatdırıldı`,
            sms: `EYNƏK: Sifariş ${orderNumber} çatdırıldı.`,
            intro: `${notice.storeName} sifariş ${orderNumber} üçün məhsulu çatdırdı.`,
            badge: "Çatdırıldı",
            headline: "Sifariş çatdırıldı.",
            body: `${notice.storeName} sifariş ${orderNumber} üzrə çatdırılmanı tamamladı. EYNƏK-də alış-verişin üçün təşəkkür edirik.`,
            details: orderDetails(orderNumber, "Çatdırıldı"),
            accent: "success",
          };
  }
}

export function noticeForSellerStatus(
  status: string,
  storeName: string,
  pickup: boolean,
): BuyerNotice | null {
  if (status === "confirmed") return { kind: "confirmed", storeName };
  if (status === "declined") return { kind: "declined", storeName };
  if (status === "out_for_delivery") return { kind: "out_for_delivery", storeName, pickup };
  if (status === "delivered") return { kind: "delivered", storeName, pickup };
  return null;
}
