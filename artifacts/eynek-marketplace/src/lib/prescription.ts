/** Optik eynək resepti — günəş eynəklərinə aid deyil. */

export const OPTICAL_CATEGORY = 'Optik çərçivə';
export const SUNGLASS_CATEGORY = 'Gün eynəyi';

const PRESCRIPTION_TAG = /\[prescription:(\/objects\/uploads\/[a-f0-9-]{36})\]/i;
const PRESCRIPTION_PATH = /^\/objects\/uploads\/[a-f0-9-]{36}$/i;

export function isOpticalCategory(category?: string | null) {
  const raw = (category ?? '').trim();
  if (!raw) return false;
  if (raw === OPTICAL_CATEGORY) return true;
  const lower = raw.toLocaleLowerCase('az');
  if (lower.includes('gün eynəy') || lower.includes('gun eyne')) return false;
  return lower.includes('optik');
}

export function cartNeedsPrescriptionSection(categories: Array<string | undefined | null>) {
  return categories.some((category) => isOpticalCategory(category));
}

export function prescriptionTag(objectPath: string) {
  return `[prescription:${objectPath}]`;
}

export function parsePrescriptionPath(note?: string | null): string | null {
  if (!note) return null;
  const match = note.match(PRESCRIPTION_TAG);
  return match?.[1] ?? null;
}

export function isPrescriptionPath(path: string) {
  return PRESCRIPTION_PATH.test(path.trim());
}

export function deliveryNoteWithoutPrescription(note?: string | null) {
  if (!note) return '';
  return note
    .replace(/\n?\[prescription:[^\]]+\]/gi, '')
    .replace(/\n?Resept:\s*[^\n]*/gi, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function prescriptionFileUrl(objectPath: string) {
  if (objectPath.startsWith('/objects/')) return `/api/storage${objectPath}`;
  return objectPath;
}
