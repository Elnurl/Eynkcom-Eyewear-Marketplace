import type { SellerOrder, SellerProduct, SellerStore } from '@workspace/api-client-react';
import {
  FulfillmentMethod,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductApprovalStatus,
  SellerOrderDeliveryArea,
  SellerOrderStatus,
  SellerProductCategory,
  SellerProductGender,
  SellerProductStatus,
  SellerStoreStatus,
  SellerOrderSummarySettlementStatus,
} from '@workspace/api-client-react';
import { sampleHorizonProducts, sampleVendors } from '@/lib/sample-stores';

/** Lokal UI: API/DB olmadan satıcı paneli (yalnız `import.meta.env.DEV`). */
export const sellerPanelPreviewEnabled =
  import.meta.env.DEV && import.meta.env.VITE_SELLER_PANEL_PREVIEW !== 'false';

const PREVIEW_SELLER_ID = 'preview-horizon';
const horizon = sampleVendors[0];
const now = new Date(0).toISOString();

export function getSellerPreviewStore(): SellerStore {
  return {
    id: PREVIEW_SELLER_ID,
    name: horizon.name,
    slug: horizon.slug,
    location: horizon.location,
    email: 'eeenu7@gmail.com',
    phone: '050 123 45 67',
    description: horizon.description,
    logoPath: horizon.logoPath ?? null,
    instagram: horizon.instagram,
    website: horizon.website,
    vitrineTheme: horizon.vitrineTheme ?? null,
    status: SellerStoreStatus.active,
    productCount: sampleHorizonProducts.length,
    initials: horizon.initials,
    since: horizon.since,
    createdAt: now,
    updatedAt: now,
  };
}

export function getSellerPreviewProducts(): SellerProduct[] {
  return sampleHorizonProducts.map((p) => ({
    id: p.id,
    sellerId: PREVIEW_SELLER_ID,
    name: p.name,
    category: SellerProductCategory.Gün_eynəyi,
    price: p.price,
    stock: p.stock,
    color: p.color,
    material: p.material,
    brand: p.brand,
    gender: SellerProductGender.Uniseks,
    shape: p.shape,
    size: p.size,
    description: p.description,
    status: SellerProductStatus.Aktiv,
    approvalStatus: ProductApprovalStatus.approved,
    moderationNote: null,
    frontImage: p.image,
    sideImage: p.sideImage,
    createdAt: now,
    updatedAt: now,
  }));
}

export function getSellerPreviewOrders(): SellerOrder[] {
  const product = sampleHorizonProducts[4] ?? sampleHorizonProducts[0];
  const updatedAt = new Date().toISOString();
  return [
    {
      id: 'preview-order-eyn-48a6cc9a',
      sellerName: horizon.name,
      status: SellerOrderStatus.confirmed,
      items: [
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPriceAzN: 1,
          lineTotalAzN: 1,
          productImage: product.image,
        },
      ],
      productSubtotalAzN: 1,
      deliveryFeeAzN: null,
      sellerEarningsAzN: 0,
      commissionAzN: 0,
      trackingCode: null,
      settlementStatus: SellerOrderSummarySettlementStatus.not_eligible,
      settlementReference: null,
      settledAt: null,
      refundedAzN: 0,
      productRefundedAzN: 0,
      orderNumber: 'EYN-48A6CC9A',
      orderStatus: OrderStatus.confirmed,
      customerName: 'Vüsal',
      customerEmail: 'vusal@example.com',
      customerPhone: '+994 50 000 00 00',
      deliveryArea: SellerOrderDeliveryArea.Bakı,
      deliveryAddress: 'Nizami küçəsi, Bakı',
      deliveryNote: '[geo:40.377670,49.892200]',
      fulfillmentMethod: FulfillmentMethod.courier,
      paymentMethod: PaymentMethod.card,
      paymentStatus: PaymentStatus.captured,
      updatedAt,
    },
  ];
}

export const sellerPreviewUser = {
  id: 'preview-user',
  name: 'Horizon Optic',
  email: 'eeenu7@gmail.com',
  image: null,
  emailVerified: true,
  createdAt: now,
  updatedAt: now,
};