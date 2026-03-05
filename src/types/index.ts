// ─── Core Domain Types ──────────────────────────────────────────────────────

export interface Student {
  id: string;
  name: string;
  subjectTags: string[];
  defaultLessonDurationMin: number;
  color: string; // HSL string, deterministically derived from id
  notes?: string;
  hourlyRate?: number; // optional, for revenue tracking
  createdAt: string; // ISO date
}

export interface DateOverride {
  startTime?: string;
  durationMin?: number;
  location?: string;
  title?: string;
  notes?: string;
}

export interface Event {
  id: string;
  studentId: string;
  title: string;
  date?: string; // YYYY-MM-DD — for one-off lessons
  dayOfWeek?: number; // 0=Sun … 6=Sat — for recurring
  startTime: string; // HH:mm
  durationMin: number;
  location: string;
  isRecurring: boolean;
  recurringStartDate?: string; // YYYY-MM-DD — first occurrence date (recurring only)
  notes?: string;
  dateExceptions?: string[]; // YYYY-MM-DD — skipped occurrences
  dateOverrides?: Record<string, DateOverride>; // YYYY-MM-DD -> overrides
  createdAt: string;
}

// ─── Calendar / Rendering ────────────────────────────────────────────────────

/** A resolved lesson instance for a specific calendar date */
export interface ResolvedLesson {
  event: Event;
  student: Student;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  durationMin: number;
  isOverridden: boolean;
}

// ─── AI / Availability ───────────────────────────────────────────────────────

export type TimePreference = 'preferred' | 'ok' | 'avoid';

export interface AvailabilityWindow {
  date?: string; // YYYY-MM-DD, if student gave a specific date
  dayOfWeek?: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  preference?: TimePreference;
  note?: string;
}

export interface AvailabilityConstraints {
  notBefore?: string; // HH:mm
  notAfter?: string; // HH:mm
  minBreakMin?: number;
}

export interface Availability {
  timezone: string;
  windows: AvailabilityWindow[];
  constraints?: AvailabilityConstraints;
  durationMin?: number; // if student explicitly mentioned lesson length
  weekOffset?: number; // 0=current, 1=next week, etc.
  rawText?: string;
}

export interface Proposal {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMin: number;
  score: number; // 0–100
  reasons: string[];
  preference: TimePreference;
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export type ViewMode = 'week' | 'day';
export type PanelType = 'none' | 'ai' | 'studentDetail';

export interface UIState {
  viewMode: ViewMode;
  activePanel: PanelType;
  selectedStudentId: string | null;
  currentWeekStart: string; // YYYY-MM-DD (always Monday)
  searchQuery: string;
  filterStudentId: string | null;
  // Mobile
  selectedDayOffset: number; // 0-6 (Mon-Sun)
}

// ─── Modal State ──────────────────────────────────────────────────────────────

export type ModalType =
  | 'none'
  | 'createLesson'
  | 'editLesson'
  | 'createStudent'
  | 'editStudent'
  | 'proposalDetail';

export interface ModalState {
  type: ModalType;
  data?: Record<string, unknown>;
}

// ─── Prefill for create lesson ────────────────────────────────────────────────

export interface LessonPrefill {
  studentId?: string;
  date?: string;
  startTime?: string;
  durationMin?: number;
  location?: string;
  title?: string;
}
