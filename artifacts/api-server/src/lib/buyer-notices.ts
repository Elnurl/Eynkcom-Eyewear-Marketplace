export type BuyerNotice =
  | { kind: "placed" }
  | { kind: "confirmed"; storeName: string }
  | { kind: "declined"; storeName: string }
  | { kind: "out_for_delivery"; storeName: string; pickup: boolean }
  | { kind: "delivered"; storeName: string; pickup: boolean };

const mobilePrefixes = new Set(["10", "50", "51", "55", "60", "70", "77", "99"]);

/** Azerbaijan mobile numbers as Sinch expects them: 994XXXXXXXXX. */
export function normalizeAzMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("994") && local.length === 12) local = local.slice(3);
  else if (local.startsWith("0") && local.length === 10) local = local.slice(1);
  if (local.length !== 9 || !mobilePrefixes.has(local.slice(0, 2))) return null;
  return `994${local}`;
}

export function buyerNotice(orderNumber: string, notice: BuyerNotice): { subject: string; sms: string; intro: string } {
  switch (notice.kind) {
    case "placed":
      return {
        subject: `EYNƏK — sifariş ${orderNumber} qəbul olundu`,
        sms: `EYNƏK: Sifariş ${orderNumber} qəbul olundu. Mağaza təsdiqini gözləyir. Ödəniş qapıdadır.`,
        intro: `Sifariş ${orderNumber} qəbul olundu. Mağaza təsdiq edənə qədər hazırlanmır. Ödəniş məhsulu alanda edilir: kuryerdə və ya mağazadan götürəndə.`,
      };
    case "confirmed":
      return {
        subject: `EYNƏK — ${notice.storeName} sifarişi təsdiqlədi`,
        sms: `EYNƏK: ${notice.storeName} sifariş ${orderNumber} təsdiqlədi.`,
        intro: `${notice.storeName} sifariş ${orderNumber} üçün öz hissəsini təsdiqlədi.`,
      };
    case "declined":
      return {
        subject: `EYNƏK — ${notice.storeName} sifarişi qəbul etmədi`,
        sms: `EYNƏK: ${notice.storeName} sifariş ${orderNumber} qəbul etmədi. Qalan hissəni saytda təsdiqlə.`,
        intro: `${notice.storeName} sifariş ${orderNumber} üçün öz hissəsini qəbul etmədi. Başqa mağaza qalıbsa, davam etmək üçün sifariş səhifəsində təsdiq lazımdır.`,
      };
    case "out_for_delivery":
      return notice.pickup
        ? {
            subject: `EYNƏK — sifariş ${orderNumber} götürməyə hazırdır`,
            sms: `EYNƏK: Sifariş ${orderNumber} ${notice.storeName} mağazasından götürməyə hazırdır.`,
            intro: `Sifariş ${orderNumber} ${notice.storeName} mağazasında götürməyə hazırdır. Ödəniş mağazada edilir.`,
          }
        : {
            subject: `EYNƏK — sifariş ${orderNumber} yoldadır`,
            sms: `EYNƏK: Sifariş ${orderNumber} çatdırılmaya verildi. Ödəniş qapıdadır.`,
            intro: `${notice.storeName} sifariş ${orderNumber} üçün məhsulu çatdırılmaya verdi. Ödəniş kuryerə, qapıda edilir.`,
          };
    case "delivered":
      return notice.pickup
        ? {
            subject: `EYNƏK — sifariş ${orderNumber} təhvil verildi`,
            sms: `EYNƏK: Sifariş ${orderNumber} ${notice.storeName} mağazasından təhvil verildi.`,
            intro: `Sifariş ${orderNumber} ${notice.storeName} mağazasından təhvil verildi.`,
          }
        : {
            subject: `EYNƏK — sifariş ${orderNumber} çatdırıldı`,
            sms: `EYNƏK: Sifariş ${orderNumber} çatdırıldı.`,
            intro: `${notice.storeName} sifariş ${orderNumber} üçün məhsulu çatdırdı.`,
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
