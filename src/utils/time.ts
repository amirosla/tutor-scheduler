import { format, parse, addMinutes } from 'date-fns';

export const CALENDAR_START_HOUR = 7; // 07:00
export const CALENDAR_END_HOUR = 22; // 22:00
export const SLOT_MINUTES = 30;
export const TOTAL_SLOTS =
  ((CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60) / SLOT_MINUTES;

/** Parse "HH:mm" to total minutes from midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Convert total minutes from midnight to "HH:mm" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Add minutes to an HH:mm string */
export function addMinutesToTime(time: string, delta: number): string {
  const base = new Date(2000, 0, 1);
  const [h, m] = time.split(':').map(Number);
  base.setHours(h, m, 0, 0);
  return format(addMinutes(base, delta), 'HH:mm');
}

/** Format duration as human readable ("1h 30min", "60 min") */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

/** Check if two time ranges overlap */
export function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && e1 > s2;
}

/** Slot index from top of calendar */
export function timeToSlotIndex(time: string): number {
  const minutes = timeToMinutes(time);
  const calStartMin = CALENDAR_START_HOUR * 60;
  return (minutes - calStartMin) / SLOT_MINUTES;
}

/** Pixel offset in calendar grid (px per slot = 64px) */
export const PX_PER_SLOT = 64;

export function timeToPixelOffset(time: string): number {
  return timeToSlotIndex(time) * PX_PER_SLOT;
}

export function minutesToPixelHeight(minutes: number): number {
  return (minutes / SLOT_MINUTES) * PX_PER_SLOT;
}

/** All time slots for the calendar grid */
export function getAllTimeSlots(): string[] {
  const slots: string[] = [];
  for (let i = 0; i <= TOTAL_SLOTS; i++) {
    const minutes = CALENDAR_START_HOUR * 60 + i * SLOT_MINUTES;
    slots.push(minutesToTime(minutes));
  }
  return slots;
}

/** Round to nearest 30-min slot */
export function roundToSlot(time: string): string {
  const mins = timeToMinutes(time);
  const rounded = Math.round(mins / SLOT_MINUTES) * SLOT_MINUTES;
  return minutesToTime(rounded);
}

/** Parse time from pixel offset in calendar */
export function pixelOffsetToTime(px: number): string {
  const slotIndex = Math.floor(px / PX_PER_SLOT);
  const minutes = CALENDAR_START_HOUR * 60 + slotIndex * SLOT_MINUTES;
  return minutesToTime(Math.max(CALENDAR_START_HOUR * 60, Math.min(CALENDAR_END_HOUR * 60 - 30, minutes)));
}

export function parseTimeString(raw: string): Date {
  return parse(raw, 'HH:mm', new Date());
}
