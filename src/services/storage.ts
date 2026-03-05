/**
 * Storage service — LocalStorage adapter.
 *
 * Abstracted behind a repository interface so it can be swapped for
 * a REST/GraphQL backend in the future.
 *
 * Future backend integration:
 * - Replace read/write functions with fetch() calls
 * - Add auth headers (Bearer token)
 * - Add optimistic updates / cache invalidation
 */

import type { Student, Event } from '../types';

const KEYS = {
  students: 'tutor_scheduler_students',
  events: 'tutor_scheduler_events',
  uiState: 'tutor_scheduler_ui',
} as const;

export const STORAGE_KEYS = KEYS;

// ─── Generic helpers ──────────────────────────────────────────────────────────

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Students repository ──────────────────────────────────────────────────────

export const studentsRepo = {
  getAll(): Student[] {
    return readJson<Student[]>(KEYS.students, []);
  },

  save(students: Student[]): void {
    writeJson(KEYS.students, students);
  },

  upsert(student: Student): void {
    const all = studentsRepo.getAll();
    const idx = all.findIndex((s) => s.id === student.id);
    if (idx >= 0) {
      all[idx] = student;
    } else {
      all.push(student);
    }
    studentsRepo.save(all);
  },

  delete(id: string): void {
    studentsRepo.save(studentsRepo.getAll().filter((s) => s.id !== id));
  },
};

// ─── Events repository ────────────────────────────────────────────────────────

export const eventsRepo = {
  getAll(): Event[] {
    return readJson<Event[]>(KEYS.events, []);
  },

  save(events: Event[]): void {
    writeJson(KEYS.events, events);
  },

  upsert(event: Event): void {
    const all = eventsRepo.getAll();
    const idx = all.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      all[idx] = event;
    } else {
      all.push(event);
    }
    eventsRepo.save(all);
  },

  delete(id: string): void {
    eventsRepo.save(eventsRepo.getAll().filter((e) => e.id !== id));
  },

  addException(eventId: string, date: string): void {
    const all = eventsRepo.getAll();
    const ev = all.find((e) => e.id === eventId);
    if (!ev) return;
    ev.dateExceptions = [...(ev.dateExceptions ?? []), date];
    eventsRepo.save(all);
  },

  addOverride(
    eventId: string,
    date: string,
    override: Partial<Event>,
  ): void {
    const all = eventsRepo.getAll();
    const ev = all.find((e) => e.id === eventId);
    if (!ev) return;
    ev.dateOverrides = { ...(ev.dateOverrides ?? {}), [date]: override };
    eventsRepo.save(all);
  },
};

// ─── UI state persistence ─────────────────────────────────────────────────────

export const uiStateRepo = {
  get<T>(key: string, fallback: T): T {
    return readJson<T>(`${KEYS.uiState}_${key}`, fallback);
  },
  set<T>(key: string, value: T): void {
    writeJson(`${KEYS.uiState}_${key}`, value);
  },
};
