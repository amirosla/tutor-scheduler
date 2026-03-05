/**
 * Proposal generation algorithm.
 *
 * Inputs: Availability + current week events + student duration preference
 * Output: Proposal[] sorted by score descending, max 8 results
 */

import { addDays, startOfWeek, getDay } from 'date-fns';
import { v4 as uuid } from 'uuid';
import type {
  Availability,
  AvailabilityWindow,
  Proposal,
  ResolvedLesson,
  TimePreference,
} from '../types';
import {
  toDateString,
  fromDateString,
  getWeekDays,
} from '../utils/calendar';
import {
  timeToMinutes,
  minutesToTime,
  addMinutesToTime,
  timesOverlap,
  CALENDAR_START_HOUR,
  CALENDAR_END_HOUR,
  SLOT_MINUTES,
} from '../utils/time';

const MAX_PROPOSALS = 8;
const MIN_PROPOSALS = 3;

export interface ProposalResult {
  proposals: Proposal[];
  explanation?: string;
  suggestedChanges?: string[];
}

// ─── Main function ────────────────────────────────────────────────────────────

export function generateProposals(
  availability: Availability,
  weekStartStr: string,
  existingLessons: ResolvedLesson[],
  durationMin: number,
): ProposalResult {
  const weekStart = fromDateString(weekStartStr);

  // If weekOffset > 0, shift the target week
  const targetWeekStart =
    availability.weekOffset && availability.weekOffset > 0
      ? addDays(weekStart, availability.weekOffset * 7)
      : weekStart;

  const weekDays = getWeekDays(targetWeekStart);

  // Resolve windows to concrete date+time slots
  const candidates = resolveCandidates(
    availability,
    weekDays,
    durationMin,
  );

  if (candidates.length === 0) {
    return {
      proposals: [],
      explanation:
        'Brak okien dostępności pasujących do wybranego tygodnia.',
      suggestedChanges: [
        'Sprawdź, czy uczeń podał prawidłowe dni tygodnia.',
        'Spróbuj zmienić tydzień kalendarza na kolejny.',
        'Zapytaj ucznia o więcej opcji.',
      ],
    };
  }

  // Filter conflicts first (on Candidate type), then score
  const nonConflicting = candidates.filter(
    (c) => !hasConflict(c, existingLessons, durationMin),
  );
  const withoutConflicts = nonConflicting.map((c) =>
    scoreCandidate(c, existingLessons, availability, durationMin),
  );

  if (withoutConflicts.length === 0) {
    const suggestedChanges: string[] = [
      `Skróć czas lekcji do ${Math.max(30, durationMin - 15)} min, by zmieścić się w istniejących przerwach.`,
      'Poproś ucznia o szersze okna dostępności.',
    ];
    return {
      proposals: [],
      explanation:
        'Wszystkie proponowane terminy kolidują z istniejącymi lekcjami.',
      suggestedChanges,
    };
  }

  // Sort by score desc, deduplicate overlapping slots
  const sorted = withoutConflicts.sort((a, b) => b.score - a.score);
  const deduped = deduplicateProposals(sorted, durationMin);

  return {
    proposals: deduped.slice(0, MAX_PROPOSALS),
  };
}

// ─── Candidate resolution ─────────────────────────────────────────────────────

interface Candidate {
  date: string;
  startTime: string;
  endTime: string;
  preference: TimePreference;
  reasons: string[];
  window: AvailabilityWindow;
}

function resolveCandidates(
  availability: Availability,
  weekDays: Date[],
  durationMin: number,
): Candidate[] {
  const candidates: Candidate[] = [];
  const { windows, constraints } = availability;

  const notBefore = constraints?.notBefore
    ? timeToMinutes(constraints.notBefore)
    : CALENDAR_START_HOUR * 60;
  const notAfter = constraints?.notAfter
    ? timeToMinutes(constraints.notAfter)
    : CALENDAR_END_HOUR * 60;

  for (const window of windows) {
    if (window.preference === 'avoid') continue; // Skip excluded windows

    // Resolve to concrete dates
    const matchingDays: Date[] = [];

    if (window.date) {
      // Specific date
      const specific = weekDays.find((d) => toDateString(d) === window.date);
      if (specific) matchingDays.push(specific);
    } else if (window.dayOfWeek !== undefined) {
      // Day-of-week match
      const matching = weekDays.find((d) => getDay(d) === window.dayOfWeek);
      if (matching) matchingDays.push(matching);
    }

    for (const day of matchingDays) {
      const dateStr = toDateString(day);
      const winStart = Math.max(timeToMinutes(window.startTime), notBefore);
      const winEnd = Math.min(timeToMinutes(window.endTime), notAfter) - durationMin;

      // Generate slots every 30 min within window
      let slotStart = Math.ceil(winStart / SLOT_MINUTES) * SLOT_MINUTES;
      while (slotStart <= winEnd) {
        const startStr = minutesToTime(slotStart);
        const endStr = addMinutesToTime(startStr, durationMin);

        const reasons: string[] = [];
        if (window.preference === 'preferred') reasons.push('preferowany termin');
        if (window.note) reasons.push(`"${window.note}"`);
        reasons.push(`${window.startTime}–${window.endTime}`);

        candidates.push({
          date: dateStr,
          startTime: startStr,
          endTime: endStr,
          preference: window.preference ?? 'ok',
          reasons,
          window,
        });

        slotStart += SLOT_MINUTES;
      }
    }
  }

  return candidates;
}

// ─── Conflict detection ───────────────────────────────────────────────────────

function hasConflict(
  candidate: Candidate,
  existingLessons: ResolvedLesson[],
  durationMin: number,
): boolean {
  const end = addMinutesToTime(candidate.startTime, durationMin);
  return existingLessons.some(
    (lesson) =>
      lesson.date === candidate.date &&
      timesOverlap(candidate.startTime, end, lesson.startTime, lesson.endTime),
  );
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreCandidate(
  candidate: Candidate,
  existingLessons: ResolvedLesson[],
  availability: Availability,
  durationMin: number,
): Proposal {
  // Scoring: preferred +30, ok +10, avoid -5, adjacent +10/+5, round hour +3, early/late -5
  let score = 50; // base
  const reasons: string[] = [...candidate.reasons];

  // Preference bonus
  if (candidate.preference === 'preferred') {
    score += 30;
    reasons.push('preferowany przez ucznia');
  } else if (candidate.preference === 'ok') {
    score += 10;
  }

  // Constraint satisfaction bonus
  if (availability.constraints?.notBefore) {
    const nb = timeToMinutes(availability.constraints.notBefore);
    if (timeToMinutes(candidate.startTime) >= nb) {
      score += 5;
      reasons.push('spełnia ograniczenie "nie przed"');
    }
  }

  // "Nice layout" bonus: close to existing lessons on same day (reduces gaps)
  const sameDayLessons = existingLessons.filter(
    (l) => l.date === candidate.date,
  );
  for (const lesson of sameDayLessons) {
    const gap = Math.abs(
      timeToMinutes(candidate.startTime) - timeToMinutes(lesson.endTime),
    );
    if (gap <= 30) {
      score += 10;
      reasons.push('sąsiaduje z istniejącą lekcją');
      break;
    }
    if (gap <= 60) {
      score += 5;
      break;
    }
  }

  // Penalty for very early or very late
  const startMin = timeToMinutes(candidate.startTime);
  if (startMin < 9 * 60) score -= 5;
  if (startMin > 20 * 60) score -= 5;

  // Bonus for "round" start times (9:00, 10:00, etc.)
  if (startMin % 60 === 0) score += 3;

  // minBreak constraint check
  if (availability.constraints?.minBreakMin) {
    const minBreak = availability.constraints.minBreakMin;
    const violatesBreak = existingLessons
      .filter((l) => l.date === candidate.date)
      .some((l) => {
        const gap1 = timeToMinutes(candidate.startTime) - timeToMinutes(l.endTime);
        const gap2 = timeToMinutes(l.startTime) - timeToMinutes(addMinutesToTime(candidate.startTime, durationMin));
        return (gap1 >= 0 && gap1 < minBreak) || (gap2 >= 0 && gap2 < minBreak);
      });
    if (violatesBreak) {
      score -= 20;
      reasons.push(`przerwa krótsza niż ${minBreak} min`);
    }
  }

  return {
    id: uuid(),
    date: candidate.date,
    startTime: candidate.startTime,
    endTime: candidate.endTime,
    durationMin,
    score: Math.max(0, Math.min(100, score)),
    reasons,
    preference: candidate.preference,
  };
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function deduplicateProposals(
  proposals: Proposal[],
  durationMin: number,
): Proposal[] {
  const kept: Proposal[] = [];
  for (const p of proposals) {
    const overlaps = kept.some(
      (k) =>
        k.date === p.date &&
        timesOverlap(p.startTime, p.endTime, k.startTime, k.endTime),
    );
    if (!overlaps) kept.push(p);
  }
  return kept;
}
