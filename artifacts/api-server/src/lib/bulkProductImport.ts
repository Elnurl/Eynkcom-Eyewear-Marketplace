import { CreateSellerProductBody } from "@workspace/api-zod";
import type { SellerProductInput } from "@workspace/api-zod";

export type BulkProductRow = SellerProductInput;

export type BulkImportFailure = { row: number; name: string; error: string };

export const BULK_IMPORT_MAX_ROWS = 200;

const COLUMN_ALIASES: Record<string, keyof BulkProductRow> = {
  name: "name",
  ad: "name",
  mehsul: "name",
  product_name: "name",
  category: "category",
  kateqoriya: "category",
  price: "price",
  qiymet: "price",
  "qiymət": "price",
  stock: "stock",
  stok: "stock",
  color: "color",
  reng: "color",
  "rəng": "color",
  material: "material",
  brend: "brand",
  brand: "brand",
  gender: "gender",
  cins: "gender",
  shape: "shape",
  forma: "shape",
  size: "size",
  olcu: "size",
  "ölçü": "size",
  description: "description",
  tesvir: "description",
  "təsvir": "description",
  status: "status",
  front_image: "frontImage",
  frontimage: "frontImage",
  on_sekil: "frontImage",
  "ön_şəkil": "frontImage",
  side_image: "sideImage",
  sideimage: "sideImage",
  yan_sekil: "sideImage",
  "yan_şəkil": "sideImage",
};

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

function parsePrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const text = String(value ?? "").trim().replace(",", ".");
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? Math.round(num) : null;
}

function parseIntField(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const text = String(value ?? "").trim();
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? Math.round(num) : null;
}

export function mapBulkRow(
  source: Record<string, unknown>,
  rowNumber: number,
): { product?: BulkProductRow; error?: string } {
  const mapped: Partial<Record<keyof BulkProductRow, unknown>> = {};
  for (const [key, value] of Object.entries(source)) {
    const field = COLUMN_ALIASES[normalizeKey(key)];
    if (field) mapped[field] = value;
  }

  const price = parsePrice(mapped.price);
  const stock = parseIntField(mapped.stock);
  const payload = {
    name: String(mapped.name ?? "").trim(),
    category: String(mapped.category ?? "").trim(),
    price: price ?? -1,
    stock: stock ?? -1,
    color: String(mapped.color ?? "").trim(),
    material: String(mapped.material ?? "").trim(),
    brand: String(mapped.brand ?? "").trim(),
    gender: String(mapped.gender ?? "Uniseks").trim(),
    shape: String(mapped.shape ?? "Square").trim(),
    size: String(mapped.size ?? "M (50–20)").trim(),
    description: String(mapped.description ?? "").trim(),
    status: String(mapped.status ?? "Qaralama").trim(),
    frontImage: String(mapped.frontImage ?? "").trim(),
    sideImage: String(mapped.sideImage ?? "").trim(),
  };

  const parsed = CreateSellerProductBody.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.[0] ?? "sətir";
    return {
      error: `${rowNumber}-ci sətir (${field}): ${issue?.message ?? "məlumat düzgün deyil"}`,
    };
  }
  return { product: parsed.data };
}
