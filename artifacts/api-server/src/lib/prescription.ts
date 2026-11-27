/** Optik eynək resepti — günəş eynəklərinə aid deyil. */

export const OPTICAL_CATEGORY = "Optik çərçivə";

const PRESCRIPTION_TAG = /\[prescription:(\/objects\/uploads\/[a-f0-9-]{36})\]/i;
const PRESCRIPTION_PATH = /^\/objects\/uploads\/[a-f0-9-]{36}$/i;

export function isOpticalCategory(category?: string | null) {
  return (category ?? "").trim() === OPTICAL_CATEGORY;
}

export function parsePrescriptionPath(note?: string | null): string | null {
  if (!note) return null;
  const match = note.match(PRESCRIPTION_TAG);
  return match?.[1] ?? null;
}

export function isPrescriptionPath(path: string) {
  return PRESCRIPTION_PATH.test(path.trim());
}

export function hasOpticalInProducts(products: { category: string }[]) {
  return products.some((product) => isOpticalCategory(product.category));
}
