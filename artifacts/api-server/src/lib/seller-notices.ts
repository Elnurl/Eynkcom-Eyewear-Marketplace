export type SellerNoticeKind = "new_order" | "paid" | "cancelled" | "cancel_request";

export type SellerNotice = {
  kind: SellerNoticeKind;
  customerName: string;
};

export type SellerNoticeCopy = {
  subject: string;
  sms: string;
  badge: string;
  headline: string;
  body: string;
};

export function sellerNotice(orderNumber: string, storeName: string, notice: SellerNotice): SellerNoticeCopy {
  if (notice.kind === "new_order") {
    return {
      subject: `EYNƏK — yeni sifariş ${orderNumber}`,
      sms: `EYNƏK: ${storeName} üçün yeni sifariş ${orderNumber}. 30 dəq ərzində stoku təsdiqləyin.`,
      badge: "Yeni sifariş",
      headline: "Yeni sifariş gəldi.",
      body: `${notice.customerName} ${storeName} mağazasına sifariş ${orderNumber} göndərdi. 30 dəqiqə ərzində stoku təsdiqləyin və ya rədd edin.`,
    };
  }
  if (notice.kind === "paid") {
    return {
      subject: `EYNƏK — sifariş ${orderNumber} ödənildi`,
      sms: `EYNƏK: Sifariş ${orderNumber} ödənildi. Hazırlığa keçə bilərsiniz.`,
      badge: "Ödəniş alındı",
      headline: "Alıcı ödənişi etdi.",
      body: `${notice.customerName} sifariş ${orderNumber} üçün ödənişi tamamladı. Məhsulu hazırlayıb kuryer çağıra bilərsiniz.`,
    };
  }
  if (notice.kind === "cancel_request") {
    return {
      subject: `EYNƏK — sifariş ${orderNumber} ləğv sorğusu`,
      sms: `EYNƏK: Sifariş ${orderNumber} üçün alıcı ləğv sorğusu göndərdi. Paneldə təsdiqləyin.`,
      badge: "Ləğv sorğusu",
      headline: "Alıcı ləğv istəyir.",
      body: `${notice.customerName} sifariş ${orderNumber} üçün ləğv sorğusu göndərdi. Satıcı panelində təsdiq və ya rədd edin.`,
    };
  }
  return {
    subject: `EYNƏK — sifariş ${orderNumber} ləğv olundu`,
    sms: `EYNƏK: Sifariş ${orderNumber} alıcı tərəfindən ləğv olundu.`,
    badge: "Ləğv",
    headline: "Sifariş ləğv olundu.",
    body: `${notice.customerName} sifariş ${orderNumber} üzrə ləğv etdi. Stok geri qayıdır.`,
  };
}

export function adminNotice(
  orderNumber: string,
  notice: { kind: "new_order" | "paid"; customerName: string; storeNames: string },
): SellerNoticeCopy {
  if (notice.kind === "new_order") {
    return {
      subject: `EYNƏK admin — yeni sifariş ${orderNumber}`,
      sms: `EYNƏK admin: yeni sifariş ${orderNumber} (${notice.storeNames}).`,
      badge: "Admin",
      headline: "Yeni marketplace sifarişi.",
      body: `${notice.customerName} sifariş ${orderNumber} verdi. Mağazalar: ${notice.storeNames}.`,
    };
  }
  return {
    subject: `EYNƏK admin — sifariş ${orderNumber} ödənildi`,
    sms: `EYNƏK admin: sifariş ${orderNumber} ödənildi.`,
    badge: "Admin",
    headline: "Kart ödənişi təsdiqləndi.",
    body: `${notice.customerName} sifariş ${orderNumber} üzrə Epoint ödənişini tamamladı. Mağazalar: ${notice.storeNames}.`,
  };
}
