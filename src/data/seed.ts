/**
 * Seed data — example students and lessons for development/demo.
 *
 * Example messages to test the AI parser:
 * 1. "Hej! Mogę wt i czw po 17, w sob rano też bym dała radę. Najlepiej 60 min."
 * 2. "W tym tygodniu odpada środa, mogę pn 18-20 albo pt po 16."
 * 3. "Od przyszłego tygodnia mogę w poniedziałki rano i w czwartki wieczorem, ale nie później niż 20."
 * 4. "Tylko 90 minut, najlepiej we wtorek między 15 a 19."
 * 5. "Mogę codziennie po 19 oprócz piątku."
 */

import { v4 as uuid } from 'uuid';
import type { Student, Event } from '../types';
import { generateStudentColor } from '../utils/color';
import { studentsRepo, eventsRepo } from '../services/storage';
import { currentWeekMonday, toDateString, fromDateString, getWeekDays } from '../utils/calendar';


let _studentIndex = 0;

function makeStudent(
  name: string,
  tags: string[],
  durationMin = 60,
  notes?: string,
): Student {
  const id = uuid();
  return {
    id,
    name,
    subjectTags: tags,
    defaultLessonDurationMin: durationMin,
    color: generateStudentColor(id, _studentIndex++), // sequential index → unique colors
    notes,
    createdAt: new Date().toISOString(),
  };
}

function makeOneOff(
  studentId: string,
  date: string,
  startTime: string,
  durationMin: number,
  title: string,
  location = 'Zdalnie',
  notes?: string,
): Event {
  return {
    id: uuid(),
    studentId,
    title,
    date,
    startTime,
    durationMin,
    location,
    isRecurring: false,
    notes,
    createdAt: new Date().toISOString(),
  };
}

function makeRecurring(
  studentId: string,
  dayOfWeek: number, // 0=Sun, 1=Mon...6=Sat
  startTime: string,
  durationMin: number,
  title: string,
  location = 'Zdalnie',
): Event {
  return {
    id: uuid(),
    studentId,
    title,
    dayOfWeek,
    startTime,
    durationMin,
    location,
    isRecurring: true,
    createdAt: new Date().toISOString(),
  };
}

const SEED_VERSION = 'v2'; // bump to force re-seed with new color palette
const SEED_VERSION_KEY = 'tutor_scheduler_seed_version';

export function seedData(): void {
  // Re-seed if version changed (e.g. after color palette update)
  const stored = localStorage.getItem(SEED_VERSION_KEY);
  if (stored === SEED_VERSION) return;

  // Clear old data before re-seeding
  localStorage.removeItem('tutor_scheduler_students');
  localStorage.removeItem('tutor_scheduler_events');
  _studentIndex = 0; // reset color index

  // ─── Students ─────────────────────────────────────────────────────────────
  const anna = makeStudent(
    'Anna Kowalska',
    ['matematyka', 'fizyka'],
    60,
    'Przygotowuje się do matury z matematyki. Preferuje zadania z geometrii analitycznej.',
  );
  const tomek = makeStudent(
    'Tomek Wiśniewski',
    ['angielski', 'historia'],
    90,
    'Maturzysta, poziom B2 z angielskiego. Pracujemy nad writing i speaking.',
  );
  const maja = makeStudent(
    'Maja Nowak',
    ['chemia', 'biologia'],
    60,
    'Przygotowuje się do olimpiady chemicznej. Bardzo zmotywowana.',
  );
  const piotr = makeStudent(
    'Piotr Zając',
    ['matematyka', 'informatyka'],
    45,
    'Uczeń liceum, podstawy programowania w Python.',
  );
  const zosia = makeStudent(
    'Zosia Kamińska',
    ['polski', 'historia'],
    60,
  );

  studentsRepo.save([anna, tomek, maja, piotr, zosia]);

  // ─── Events ───────────────────────────────────────────────────────────────
  const monday = fromDateString(currentWeekMonday());
  const weekDays = getWeekDays(monday);
  const [, tue, , thu, , sat] = weekDays.map(toDateString);

  const events: Event[] = [
    // Anna — recurring Mon & Wed 16:00
    makeRecurring(anna.id, 1, '16:00', 60, 'Matematyka — Anna', 'Dom ucznia'),
    makeRecurring(anna.id, 3, '16:00', 60, 'Matematyka — Anna', 'Dom ucznia'),

    // Tomek — recurring Tue 18:00
    makeRecurring(tomek.id, 2, '18:00', 90, 'Angielski — Tomek', 'Zdalnie'),

    // Maja — recurring Thu 17:00 + one-off this Sat
    makeRecurring(maja.id, 4, '17:00', 60, 'Chemia — Maja'),
    makeOneOff(maja.id, sat, '10:00', 60, 'Chemia — Maja (dodatkowe)', 'Zdalnie'),

    // Piotr — recurring Fri 15:00
    makeRecurring(piotr.id, 5, '15:00', 45, 'Python — Piotr'),

    // Zosia — one-off this week Tue & Thu
    makeOneOff(zosia.id, tue, '14:00', 60, 'Polski — Zosia', 'Dom ucznia'),
    makeOneOff(zosia.id, thu, '14:00', 60, 'Historia — Zosia', 'Dom ucznia'),

    // Some next-week events to show recurring works
    makeRecurring(anna.id, 1, '10:00', 60, 'Matematyka — Anna (rano)', 'Zdalnie'),
  ];

  eventsRepo.save(events);
  localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
}

// ─── Example messages for testing ─────────────────────────────────────────────

export const EXAMPLE_MESSAGES = [
  {
    label: 'Wt, czw po 17 + sob rano',
    text: 'Hej! Mogę wt i czw po 17, w sob rano też bym dała radę. Najlepiej 60 min.',
  },
  {
    label: 'Odpada środa, pn/pt',
    text: 'W tym tygodniu odpada środa, mogę pn 18-20 albo pt po 16.',
  },
  {
    label: 'Od przyszłego tygodnia',
    text: 'Od przyszłego tygodnia mogę w poniedziałki rano i w czwartki wieczorem, ale nie później niż 20.',
  },
  {
    label: '90 min, wt 15-19',
    text: 'Tylko 90 minut, najlepiej we wtorek między 15 a 19.',
  },
  {
    label: 'Codziennie po 19',
    text: 'Mogę codziennie po 19 oprócz piątku.',
  },
];
