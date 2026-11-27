/** Çatdırılma slotları — eyni gün yox; həftəsonu sifariş → növbəti həftə içi. */

export type DeliveryWindow = {
  id: string;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
  startHour: number;
  endHour: number;
};

const MONTHS_AZ = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avqust',
  'sentyabr',
  'oktyabr',
  'noyabr',
  'dekabr',
] as const;

/** Müvəqqəti standart pəncərələr — sonra dəqiqləşdiriləcək. */
export const DELIVERY_WINDOWS = [
  { startHour: 9, endHour: 15, timeLabel: '09:00 - 15:00' },
  { startHour: 15, endHour: 21, timeLabel: '15:00 - 21:00' },
] as const;

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLabel(date: Date) {
  return `${date.getDate()} ${MONTHS_AZ[date.getMonth()]}`;
}

/**
 * İlk mümkün çatdırılma günü:
 * - heç vaxt eyni gün
 * - ən tezi sabah
 * - sifariş həftəsonudursa → növbəti bazar ertəsi
 * - sabah həftəsonudursa → növbəti həftə içi
 */
export function earliestDeliveryDay(from: Date = new Date()): Date {
  let day = startOfLocalDay(addDays(from, 1));
  if (isWeekend(from)) {
    while (isWeekend(day)) day = addDays(day, 1);
    return day;
  }
  while (isWeekend(day)) day = addDays(day, 1);
  return day;
}

/** Növbəti `weekdayCount` iş günü üçün səhər/axşam slotları. */
export function buildDeliverySlots(options?: { from?: Date; weekdayCount?: number }): DeliveryWindow[] {
  const from = options?.from ?? new Date();
  const weekdayCount = options?.weekdayCount ?? 4;
  const slots: DeliveryWindow[] = [];
  let day = earliestDeliveryDay(from);
  let weekdays = 0;

  while (weekdays < weekdayCount) {
    if (!isWeekend(day)) {
      const dateKey = toDateKey(day);
      const dateLabel = formatDateLabel(day);
      for (const window of DELIVERY_WINDOWS) {
        slots.push({
          id: `${dateKey}|${window.startHour}-${window.endHour}`,
          dateKey,
          dateLabel,
          timeLabel: window.timeLabel,
          startHour: window.startHour,
          endHour: window.endHour,
        });
      }
      weekdays += 1;
    }
    day = addDays(day, 1);
  }

  return slots;
}

export function slotTag(slot: DeliveryWindow) {
  return `[slot:${slot.id}]`;
}

export function parseSlotTag(note?: string | null): string | null {
  if (!note) return null;
  const match = note.match(/\[slot:([^\]]+)\]/);
  return match?.[1] ?? null;
}

export function deliveryNoteWithoutSlot(note?: string | null) {
  if (!note) return '';
  return note
    .replace(/\n?\[slot:[^\]]+\]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}
