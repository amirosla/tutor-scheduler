/**
 * Polish-language availability parser.
 *
 * Converts free-text student messages into a structured Availability object.
 * Operates fully offline — no API calls needed.
 *
 * Architecture note: This parser is consumed by ai.ts, which wraps it in
 * a stub AI interface. To replace with a real LLM:
 *   1. Add your API call in services/ai.ts → parseAvailabilityWithAI()
 *   2. Use this parser's output as a fallback / post-processing step.
 */

import type { Availability, AvailabilityWindow, TimePreference } from '../types';
import { addDays, getDay, startOfWeek } from 'date-fns';
import { toDateString } from '../utils/calendar';

// ─── Day name mappings ────────────────────────────────────────────────────────

const DAY_PATTERNS: Array<{ pattern: RegExp; dow: number }> = [
  // dow: 0=Sun, 1=Mon, ..., 6=Sat (standard JS/date-fns convention)
  { pattern: /\bpon(iedziałe?k|\.)?/i, dow: 1 },
  { pattern: /\bwt(ore?k|\.)?/i, dow: 2 },
  { pattern: /\bśr(od[aę]|\.)?/i, dow: 3 },
  { pattern: /\bczw(arte?k|\.)?/i, dow: 4 },
  { pattern: /\bpt(\.)?|piąte?k/i, dow: 5 },
  { pattern: /\bsob(ot[aę]|\.)?/i, dow: 6 },
  { pattern: /\bni(edzi[eę]l[aę]|\.)?|nd\.?/i, dow: 0 },
];

// ─── Time keyword mappings ────────────────────────────────────────────────────

const TIME_KEYWORDS: Array<{ pattern: RegExp; start: string; end: string }> = [
  { pattern: /\brano\b/i, start: '08:00', end: '11:00' },
  { pattern: /\bprzedpołudni[eu]?\b/i, start: '09:00', end: '12:00' },
  { pattern: /\bpołudni[eu]?\b/i, start: '12:00', end: '14:00' },
  { pattern: /\bpopołudni[eu]?\b/i, start: '14:00', end: '18:00' },
  { pattern: /\bwieczor[eem]?\b/i, start: '18:00', end: '21:00' },
  { pattern: /\bnocą?\b/i, start: '21:00', end: '23:00' },
];

// ─── Utility helpers ──────────────────────────────────────────────────────────

function normalizeHour(h: string): string {
  const n = parseInt(h, 10);
  return `${String(n).padStart(2, '0')}:00`;
}

function normalizeMinutes(h: string, m: string): string {
  return `${String(parseInt(h, 10)).padStart(2, '0')}:${String(parseInt(m, 10)).padStart(2, '0')}`;
}

/** Extract all HH[:mm] times from a text fragment */
function extractTimes(text: string): string[] {
  const times: string[] = [];
  // Pattern: 17:30, 17.30, 17
  const pattern = /\b(\d{1,2})(?::|\.)(\d{2})\b|\b(\d{1,2})\b(?=\s*(?:h|:00)?)/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    if (m[1] && m[2]) {
      times.push(normalizeMinutes(m[1], m[2]));
    } else if (m[3]) {
      const n = parseInt(m[3], 10);
      if (n >= 6 && n <= 23) {
        times.push(normalizeHour(m[3]));
      }
    }
  }
  return times;
}

/** Parse duration from text: "60 min", "1h", "90 minut", "półtorej godziny" */
function parseDuration(text: string): number | undefined {
  // Polish: "półtorej godziny" = 90min, "dwie godziny" = 120min
  if (/pół\s*tora|półtorej/i.test(text)) return 90;
  if (/dwie?\s*godzin/i.test(text)) return 120;
  if (/trzy\s*godzin/i.test(text)) return 180;

  const hourMinPattern = /(\d+)\s*(?:h|godz[a-z]*)/i;
  const minPattern = /(\d+)\s*min/i;

  const hMatch = hourMinPattern.exec(text);
  const mMatch = minPattern.exec(text);

  if (hMatch && mMatch) {
    return parseInt(hMatch[1], 10) * 60 + parseInt(mMatch[1], 10);
  }
  if (hMatch) return parseInt(hMatch[1], 10) * 60;
  if (mMatch) return parseInt(mMatch[1], 10);

  return undefined;
}

/** Parse week offset: "ten tydzień" = 0, "przyszły tydzień" = 1 */
function parseWeekOffset(text: string): number {
  if (/przyszł[ya]/i.test(text)) return 1;
  if (/ten\s+tydzie[nń]|tego\s+tygodnia|w\s+tym\s+tygodniu/i.test(text)) return 0;
  if (/od\s+przyszł/i.test(text)) return 1;
  return 0;
}

// ─── Day context parser ───────────────────────────────────────────────────────

interface DaySegment {
  dow: number;
  raw: string;
  startIndex: number;
  endIndex: number;
}

function findDayMentions(text: string): DaySegment[] {
  const segments: DaySegment[] = [];
  for (const { pattern, dow } of DAY_PATTERNS) {
    let m: RegExpExecArray | null;
    const re = new RegExp(pattern.source, 'gi');
    while ((m = re.exec(text)) !== null) {
      segments.push({
        dow,
        raw: m[0],
        startIndex: m.index,
        endIndex: m.index + m[0].length,
      });
    }
  }
  return segments.sort((a, b) => a.startIndex - b.startIndex);
}

// ─── Negation / exclusion detection ──────────────────────────────────────────

function isNegated(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 40), index).toLowerCase();
  return (
    /nie\s+mog[eę]|nie\s+dam\s+rad[yę]|odpada|oprócz|poza|wyklucz|byle\s+nie|nie\s+w\b/i.test(
      before,
    )
  );
}

// ─── Preference detection ─────────────────────────────────────────────────────

function detectPreference(text: string, index: number): TimePreference {
  const window = text.slice(Math.max(0, index - 60), index + 40).toLowerCase();
  if (/najlepiej|preferuj[eę]|wolał|wolałabym|chętnie|idealnie|świetnie/.test(window))
    return 'preferred';
  if (/mogę\s+też|też\s+mogę|awaryjnie|ostatecznie|ewentualnie/.test(window))
    return 'ok';
  if (/unikam|unikaj|byle\s+nie|raczej\s+nie/.test(window)) return 'avoid';
  return 'ok';
}

// ─── Time range extraction from context around a day mention ─────────────────

function extractTimeRange(
  text: string,
  fromIndex: number,
  toIndex: number,
): { start: string; end: string } | null {
  const segment = text.slice(fromIndex, Math.min(toIndex + 80, text.length));

  // "od 16 do 18" / "od 16:00 do 18:00"
  const rangeMatch = /(?:od|między|między)\s+(\d{1,2}(?:[:.]\d{2})?)\s*(?:do|-|a|i)\s*(\d{1,2}(?:[:.]\d{2})?)/i.exec(segment);
  if (rangeMatch) {
    const start = rangeMatch[1].replace('.', ':');
    const end = rangeMatch[2].replace('.', ':');
    return {
      start: start.includes(':') ? start : normalizeHour(start),
      end: end.includes(':') ? end : normalizeHour(end),
    };
  }

  // "po 17" / "after 5pm" style
  const afterMatch = /po\s+(\d{1,2}(?:[:.]\d{2})?)/i.exec(segment);
  if (afterMatch) {
    const start = afterMatch[1].replace('.', ':');
    const startTime = start.includes(':') ? start : normalizeHour(start);
    const startHour = parseInt(startTime.split(':')[0], 10);
    return { start: startTime, end: `${Math.min(22, startHour + 3)}:00` };
  }

  // "przed 12"
  const beforeMatch = /przed\s+(\d{1,2}(?:[:.]\d{2})?)/i.exec(segment);
  if (beforeMatch) {
    const end = beforeMatch[1].replace('.', ':');
    const endTime = end.includes(':') ? end : normalizeHour(end);
    return { start: '08:00', end: endTime };
  }

  // "o 17" / "17:30"
  const atMatch = /(?:o\s+|o\s+godzin[aę]\s+)?(\d{1,2})(?:[:.:](\d{2}))?(?:\s*h)?\b/i.exec(segment);
  if (atMatch) {
    const h = parseInt(atMatch[1], 10);
    if (h >= 6 && h <= 23) {
      const m = atMatch[2] ? `:${atMatch[2]}` : ':00';
      const start = `${String(h).padStart(2, '0')}${m}`;
      return { start, end: `${String(Math.min(22, h + 2)).padStart(2, '0')}:00` };
    }
  }

  // Time keywords (rano, wieczorem, etc.)
  for (const kw of TIME_KEYWORDS) {
    if (kw.pattern.test(segment)) {
      return { start: kw.start, end: kw.end };
    }
  }

  return null;
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseAvailability(text: string): Availability {
  const weekOffset = parseWeekOffset(text);
  const durationMin = parseDuration(text);

  const dayMentions = findDayMentions(text);
  const windows: AvailabilityWindow[] = [];

  // Process each day mention
  for (let i = 0; i < dayMentions.length; i++) {
    const mention = dayMentions[i];
    const nextMentionIndex =
      i + 1 < dayMentions.length
        ? dayMentions[i + 1].startIndex
        : text.length;

    const negated = isNegated(text, mention.startIndex);
    const preference = negated ? 'avoid' : detectPreference(text, mention.startIndex);

    const timeRange = extractTimeRange(
      text,
      mention.startIndex,
      nextMentionIndex,
    );

    if (negated) {
      // Excluded day: full-day "avoid" window
      windows.push({
        dayOfWeek: mention.dow,
        startTime: '07:00',
        endTime: '22:00',
        preference: 'avoid',
        note: `wykluczone (negacja przy "${mention.raw}")`,
      });
      continue;
    }

    if (timeRange) {
      windows.push({
        dayOfWeek: mention.dow,
        startTime: timeRange.start,
        endTime: timeRange.end,
        preference,
        note: mention.raw,
      });
    } else {
      // No time mentioned — use global constraints from the message
      const globalTime = extractGlobalTimeHint(text);
      windows.push({
        dayOfWeek: mention.dow,
        startTime: globalTime?.start ?? '09:00',
        endTime: globalTime?.end ?? '20:00',
        preference,
        note: mention.raw,
      });
    }
  }

  // "codziennie" — every day
  if (/codziennie|każdego\s+dnia/i.test(text)) {
    const timeRange = extractGlobalTimeHint(text);
    for (let dow = 0; dow <= 6; dow++) {
      // Skip explicitly excluded days
      const excluded = windows.find(
        (w) => w.dayOfWeek === dow && w.preference === 'avoid',
      );
      if (excluded) continue;
      windows.push({
        dayOfWeek: dow,
        startTime: timeRange?.start ?? '09:00',
        endTime: timeRange?.end ?? '21:00',
        preference: 'ok',
        note: 'codziennie',
      });
    }
  }

  // Constraints
  const constraints = parseConstraints(text);

  // If week offset specified, attach approximate dates
  if (weekOffset > 0) {
    const monday = addDays(
      startOfWeek(new Date(), { weekStartsOn: 1 }),
      weekOffset * 7,
    );
    for (const w of windows) {
      if (w.dayOfWeek !== undefined && !w.date) {
        const targetDay = addDays(monday, w.dayOfWeek === 0 ? 6 : w.dayOfWeek - 1);
        w.date = toDateString(targetDay);
      }
    }
  }

  return {
    timezone: 'Europe/Warsaw',
    windows,
    constraints,
    durationMin,
    weekOffset,
    rawText: text,
  };
}

function extractGlobalTimeHint(
  text: string,
): { start: string; end: string } | null {
  // "po 19" globally
  const afterMatch = /po\s+(\d{1,2})(?:\s|$)/i.exec(text);
  if (afterMatch) {
    const h = parseInt(afterMatch[1], 10);
    return { start: `${String(h).padStart(2, '0')}:00`, end: '22:00' };
  }
  // Keyword-based
  for (const kw of TIME_KEYWORDS) {
    if (kw.pattern.test(text)) return { start: kw.start, end: kw.end };
  }
  return null;
}

function parseConstraints(
  text: string,
): Availability['constraints'] | undefined {
  const constraints: NonNullable<Availability['constraints']> = {};
  let found = false;

  // "nie później niż 20"
  const notAfterMatch = /nie\s+później\s+niż\s+(\d{1,2})/i.exec(text);
  if (notAfterMatch) {
    constraints.notAfter = normalizeHour(notAfterMatch[1]);
    found = true;
  }

  // "byle nie rano" → notBefore = 11:00
  if (/byle\s+nie\s+rano|nie\s+rano|nie\s+przed\s+(?:południem|połud)/i.test(text)) {
    constraints.notBefore = '11:00';
    found = true;
  }

  // "nie przed 10"
  const notBeforeMatch = /nie\s+przed\s+(\d{1,2})/i.exec(text);
  if (notBeforeMatch) {
    constraints.notBefore = normalizeHour(notBeforeMatch[1]);
    found = true;
  }

  return found ? constraints : undefined;
}
