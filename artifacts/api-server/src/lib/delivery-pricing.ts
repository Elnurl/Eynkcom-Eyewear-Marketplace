/** Müvəqqəti platforma çatdırılma tarifi (Bolt əl ilə; dəqiq qiymət sonra). */

export const STANDARD_DELIVERY_FEE_AZN = 8;
export const FREE_DELIVERY_FROM_AZN = 200;

export function deliveryFeeAzN(params: {
  fulfillmentMethod: "courier" | "store_pickup" | string;
  productSubtotalAzN: number;
}): number {
  if (params.fulfillmentMethod === "store_pickup") return 0;
  const subtotal = Number.isFinite(params.productSubtotalAzN) ? params.productSubtotalAzN : 0;
  if (subtotal >= FREE_DELIVERY_FROM_AZN) return 0;
  return STANDARD_DELIVERY_FEE_AZN;
}

export function deliveryFeeLabelAzN(feeAzN: number): string {
  return feeAzN <= 0 ? "Pulsuz" : `${feeAzN.toFixed(2)} AZN`;
}
