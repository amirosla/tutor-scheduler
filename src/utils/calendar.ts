import {
  startOfWeek,
  addDays,
  format,
  parseISO,
  getDay,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Event, ResolvedLesson, Student } from '../types';
import { addMinutesToTime, timeToMinutes } from './time';

export const DAY_NAMES_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
export const DAY_NAMES_FULL = [
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
  'Niedziela',
];

/** Returns Monday of the week containing the given date */
export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/** Returns array of 7 dates [Mon...Sun] for a given week start */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** Format date to YYYY-MM-DD */
export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Parse YYYY-MM-DD safely */
export function fromDateString(dateStr: string): Date {
  return parseISO(dateStr);
}

/** Get day-of-week index 0=Mon…6=Sun (calendar convention) */
export function getCalendarDayIndex(date: Date): number {
  const d = getDay(date); // 0=Sun, 1=Mon, ...
  return d === 0 ? 6 : d - 1; // 0=Mon…6=Sun
}

/** date-fns getDay maps Sunday=0; dayOfWeek in our Event model: 0=Sun...6=Sat */
function dateFnsDayToEventDay(dateFnsDay: number): number {
  return dateFnsDay; // same convention: 0=Sun, 1=Mon, ..., 6=Sat
}

/** Resolve all events to concrete lessons for a given week */
export function resolveWeekLessons(
  events: Event[],
  students: Student[],
  weekStart: Date,
): ResolvedLesson[] {
  const weekDays = getWeekDays(weekStart);
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const lessons: ResolvedLesson[] = [];

  for (const event of events) {
    const student = studentMap.get(event.studentId);
    if (!student) continue;

    if (!event.isRecurring && event.date) {
      // One-off lesson: check if it falls in this week
      const inWeek = weekDays.some((d) => toDateString(d) === event.date);
      if (!inWeek) continue;

      const override = event.dateOverrides?.[event.date] ?? {};
      const startTime = override.startTime ?? event.startTime;
      const durationMin = override.durationMin ?? event.durationMin;

      lessons.push({
        event,
        student,
        date: event.date,
        startTime,
        endTime: addMinutesToTime(startTime, durationMin),
        durationMin,
        isOverridden: false,
      });
    } else if (event.isRecurring && event.dayOfWeek !== undefined) {
      // Recurring: find matching week day
      for (const day of weekDays) {
        const dateFnsDoW = getDay(day); // 0=Sun
        if (dateFnsDayToEventDay(dateFnsDoW) !== event.dayOfWeek) continue;

        const dateStr = toDateString(day);
        // Skip if before the recurring start date
        if (event.recurringStartDate && dateStr < event.recurringStartDate) continue;
        // Check for exception (skip)
        if (event.dateExceptions?.includes(dateStr)) continue;

        const override = event.dateOverrides?.[dateStr] ?? {};
        const startTime = override.startTime ?? event.startTime;
        const durationMin = override.durationMin ?? event.durationMin;

        lessons.push({
          event,
          student,
          date: dateStr,
          startTime,
          endTime: addMinutesToTime(startTime, durationMin),
          durationMin,
          isOverridden: Object.keys(override).length > 0,
        });
      }
    }
  }

  // Sort by date, then startTime
  return lessons.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });
}

/** Format week range for display: "3–9 marca 2026" */
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startDay = format(weekStart, 'd');
  const endDay = format(weekEnd, 'd');
  const month = format(weekEnd, 'LLLL yyyy', { locale: pl });
  const startMonth = format(weekStart, 'LLLL', { locale: pl });
  if (startMonth === format(weekEnd, 'LLLL', { locale: pl })) {
    return `${startDay}–${endDay} ${month}`;
  }
  return `${startDay} ${format(weekStart, 'LLL', { locale: pl })} – ${endDay} ${month}`;
}

/** Count total lesson minutes per student in a week */
export function sumLessonMinutes(
  lessons: ResolvedLesson[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const l of lessons) {
    map.set(l.student.id, (map.get(l.student.id) ?? 0) + l.durationMin);
  }
  return map;
}

/** Today as YYYY-MM-DD */
export function todayString(): string {
  return toDateString(new Date());
}

/** Get current week Monday as YYYY-MM-DD */
export function currentWeekMonday(): string {
  return toDateString(getWeekStart(new Date()));
}

/** Returns true if date falls on Saturday or Sunday */
export function isWeekend(date: Date): boolean {
  const d = getDay(date);
  return d === 0 || d === 6;
}

/** Navigate weeks: offset = +1 or -1 */
export function offsetWeek(weekStartStr: string, offset: number): string {
  const date = fromDateString(weekStartStr);
  return toDateString(addDays(date, offset * 7));
}
