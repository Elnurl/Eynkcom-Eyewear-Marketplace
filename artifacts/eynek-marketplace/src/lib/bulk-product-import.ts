import type { SellerProductInput } from '@workspace/api-client-react';

export type ParsedBulkRow = { row: number; product: SellerProductInput | null; error?: string };

const COLUMN_ALIASES: Record<string, keyof SellerProductInput> = {
  name: 'name',
  ad: 'name',
  category: 'category',
  kateqoriya: 'category',
  price: 'price',
  qiymet: 'price',
  qiymət: 'price',
  stock: 'stock',
  stok: 'stock',
  color: 'color',
  reng: 'color',
  rəng: 'color',
  material: 'material',
  brand: 'brand',
  brend: 'brand',
  gender: 'gender',
  cins: 'gender',
  shape: 'shape',
  forma: 'shape',
  size: 'size',
  olcu: 'size',
  ölçü: 'size',
  description: 'description',
  tesvir: 'description',
  təsvir: 'description',
  status: 'status',
  front_image: 'frontImage',
  frontimage: 'frontImage',
  ön_şəkil: 'frontImage',
  side_image: 'sideImage',
  sideimage: 'sideImage',
  yan_şəkil: 'sideImage',
};

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_');
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = (cells[idx] ?? '').trim();
    });
    return record;
  });
}

function mapRecord(record: Record<string, string>, rowNumber: number): ParsedBulkRow {
  const mapped: Partial<SellerProductInput> = {};
  for (const [key, value] of Object.entries(record)) {
    const nk = normalizeKey(key);
    if (nk === 'front_image' || nk === 'ön_şəkil' || nk === 'frontimage') {
      mapped.frontImage = value;
      continue;
    }
    if (nk === 'side_image' || nk === 'yan_şəkil' || nk === 'sideimage') {
      mapped.sideImage = value;
      continue;
    }
    const alias = COLUMN_ALIASES[nk];
    if (alias) mapped[alias] = value as never;
  }

  const price = Number(String(mapped.price ?? '').replace(',', '.'));
  const stock = Number(String(mapped.stock ?? '').replace(',', '.'));
  const product: SellerProductInput = {
    name: String(mapped.name ?? '').trim(),
    category: (mapped.category as SellerProductInput['category']) ?? 'Optik çərçivə',
    price: Number.isFinite(price) ? Math.round(price) : 0,
    stock: Number.isFinite(stock) ? Math.round(stock) : 0,
    color: String(mapped.color ?? '').trim(),
    material: String(mapped.material ?? '').trim(),
    brand: String(mapped.brand ?? '').trim(),
    gender: (mapped.gender as SellerProductInput['gender']) ?? 'Uniseks',
    shape: (mapped.shape as SellerProductInput['shape']) ?? 'Square',
    size: String(mapped.size ?? 'M (50–20)').trim(),
    description: String(mapped.description ?? '').trim(),
    status: (mapped.status as SellerProductInput['status']) ?? 'Qaralama',
    frontImage: String(mapped.frontImage ?? '').trim(),
    sideImage: String(mapped.sideImage ?? '').trim(),
  };

  if (!product.name) return { row: rowNumber, product: null, error: 'Məhsul adı boşdur.' };
  if (!product.frontImage || !product.sideImage) {
    return { row: rowNumber, product: null, error: 'front_image və side_image mütləqdir.' };
  }
  return { row: rowNumber, product };
}

export function parseBulkCsv(text: string): ParsedBulkRow[] {
  const records = parseCsv(text.replace(/^\uFEFF/, ''));
  return records.map((record, index) => mapRecord(record, index + 2));
}

export async function parseBulkSpreadsheet(file: File): Promise<ParsedBulkRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || file.type.includes('csv') || file.type === 'text/plain') {
    const text = await file.text();
    return parseBulkCsv(text);
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const book = XLSX.read(buffer, { type: 'array' });
    const sheet = book.Sheets[book.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
    return rows.map((record, index) => mapRecord(record, index + 2));
  }
  throw new Error('Yalnız CSV və ya Excel (.xlsx) faylı seçin.');
}

export function googleSheetCsvUrl(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return null;
  const gid = trimmed.match(/[?&#]gid=(\d+)/)?.[1] ?? '0';
  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gid}`;
}

export async function fetchGoogleSheetRows(url: string): Promise<ParsedBulkRow[]> {
  const csvUrl = googleSheetCsvUrl(url);
  if (!csvUrl) throw new Error('Google Sheets linki düzgün deyil.');
  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error('Google Sheets faylı oxunmadı. Cədvəli “İnternetdə paylaş” edin və ya CSV yükləyin.');
  return parseBulkCsv(await response.text());
}

export type BulkImportResult = {
  created: number;
  skipped: number;
  failed: Array<{ row: number; name: string; error: string }>;
};

export async function submitBulkProducts(products: SellerProductInput[]): Promise<BulkImportResult> {
  const response = await fetch('/api/seller/products/bulk', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products, skipDuplicates: true }),
  });
  const payload = (await response.json().catch(() => ({}))) as BulkImportResult & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'Toplu import uğursuz oldu.');
  return payload;
}

export const BULK_TEMPLATE_CSV = `name,category,price,stock,color,material,brand,gender,shape,size,description,status,front_image,side_image
Məsələn Ray-Ban RB2140,Gün eynəyi,285,3,Qara,Asetat,Ray-Ban,Uniseks,Wayfarer,50-22-150,Klassik wayfarer,Qaralama,product-images/horizon/ray-ban-ray-ban-original-wayfarer-classic-rb2140-901-50-10-on.jpg,product-images/horizon/ray-ban-ray-ban-original-wayfarer-classic-rb2140-901-50-10-yan.jpg
`;
