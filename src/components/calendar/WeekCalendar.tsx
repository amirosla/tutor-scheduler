import { useRef, useCallback, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStudentsStore } from '../../store/studentsStore';
import { useEventsStore } from '../../store/eventsStore';
import { useUIStore } from '../../store/uiStore';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  getWeekDays,
  fromDateString,
  toDateString,
  DAY_NAMES_SHORT,
  resolveWeekLessons,
  todayString,
} from '../../utils/calendar';
import {
  getAllTimeSlots,
  CALENDAR_START_HOUR,
  CALENDAR_END_HOUR,
  PX_PER_SLOT,
  timeToMinutes,
  minutesToTime,
  pixelOffsetToTime,
  timeToPixelOffset,
} from '../../utils/time';
import { LessonCard, GhostCard } from './LessonCard';
import type { Proposal, ResolvedLesson } from '../../types';

interface WeekCalendarProps {
  proposals?: Proposal[];
  proposalStudentId?: string;
  onProposalClick?: (p: Proposal) => void;
}

const TIME_SLOTS = getAllTimeSlots();
const TOTAL_HEIGHT = TIME_SLOTS.length * PX_PER_SLOT;
const NOW_INTERVAL = 60_000;

function getNowOffset(): number {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins < CALENDAR_START_HOUR * 60 || mins > CALENDAR_END_HOUR * 60) return -1;
  return timeToPixelOffset(minutesToTime(mins));
}

export function WeekCalendar({
  proposals = [],
  proposalStudentId,
  onProposalClick,
}: WeekCalendarProps) {
  const { students } = useStudentsStore();
  const { events } = useEventsStore();
  const {
    currentWeekStart,
    filterStudentId,
    openModal,
    selectedDayOffset,
    setSelectedDay,
    viewMode,
  } = useUIStore();

  const weekStart = fromDateString(currentWeekStart);
  const weekDays = getWeekDays(weekStart);
  const today = todayString();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to current time on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const offset = getNowOffset();
    scrollRef.current.scrollTop = offset > 0 ? Math.max(0, offset - 120) : PX_PER_SLOT * 4;
  }, []);

  // Live "now" indicator
  const [nowOffset, setNowOffset] = useState(getNowOffset);
  useEffect(() => {
    const iv = setInterval(() => setNowOffset(getNowOffset()), NOW_INTERVAL);
    return () => clearInterval(iv);
  }, []);

  const allLessons = resolveWeekLessons(events, students, weekStart);
  const visibleLessons = filterStudentId
    ? allLessons.filter((l) => l.student.id === filterStudentId)
    : allLessons;

  const proposalStudent = proposalStudentId
    ? students.find((s) => s.id === proposalStudentId)
    : null;

  const isMobile = viewMode === 'day';
  const displayDays = isMobile ? [weekDays[selectedDayOffset]] : weekDays;

  const handleEmptyClick = useCallback(
    (date: string, relY: number) => {
      openModal('createLesson', { date, startTime: pixelOffsetToTime(relY) });
    },
    [openModal],
  );

  const handleLessonClick = useCallback(
    (lesson: ResolvedLesson) => {
      openModal('editLesson', { lessonId: lesson.event.id, date: lesson.date });
    },
    [openModal],
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* ── Mobile day selector ───────────────────────────────────────── */}
      {isMobile && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-white">
          <button
            onClick={() => setSelectedDay(Math.max(0, selectedDayOffset - 1))}
            disabled={selectedDayOffset === 0}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-600 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex gap-1">
            {weekDays.map((day, i) => {
              const isToday = toDateString(day) === today;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    i === selectedDayOffset
                      ? 'bg-indigo-600 text-white'
                      : isToday
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {DAY_NAMES_SHORT[i][0]}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setSelectedDay(Math.min(6, selectedDayOffset + 1))}
            disabled={selectedDayOffset === 6}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-600 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Main scrollable area (time gutter + columns move together) ── */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        {/* ── Sticky header row ──────────────────────────────────────── */}
        <div className="flex sticky top-0 z-20 bg-white border-b border-slate-100">
          {/* Corner */}
          <div className="w-16 shrink-0 border-r border-slate-100" />
          {/* Day headers */}
          {displayDays.map((day, idx) => {
            const dateStr = toDateString(day);
            const isToday = dateStr === today;
            const dayIndex = isMobile ? selectedDayOffset : idx;
            return (
              <div
                key={dateStr}
                className={`flex-1 h-12 flex flex-col items-center justify-center border-r border-slate-100 ${
                  isToday ? 'bg-indigo-50' : ''
                }`}
                style={{ minWidth: 100 }}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-indigo-500' : 'text-slate-400'}`}>
                  {DAY_NAMES_SHORT[dayIndex]}
                </span>
                <span className={`text-base font-bold leading-tight ${isToday ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {day.getDate()}
                  {day.getDate() === 1 && (
                    <span className="text-xs font-medium ml-0.5 opacity-60">
                      {format(day, 'LLL', { locale: pl })}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Body: time gutter + day columns ────────────────────────── */}
        <div className="flex">
          {/* Time gutter — position:relative so absolute labels stay inside */}
          <div
            className="w-16 shrink-0 border-r border-slate-100 relative select-none"
            style={{ height: TOTAL_HEIGHT }}
          >
            {TIME_SLOTS.map((slot, i) => {
              if (!slot.endsWith(':00')) return null;
              return (
                <div
                  key={slot}
                  className="absolute right-0 w-full flex justify-end pr-2"
                  style={{ top: i * PX_PER_SLOT - 9 }}
                >
                  <span className="text-xs text-slate-400 font-medium tabular-nums">
                    {slot}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          {displayDays.map((day, idx) => {
            const dateStr = toDateString(day);
            const isToday = dateStr === today;
            const dayLessons = visibleLessons.filter((l) => l.date === dateStr);
            const dayProposals = proposals.filter((p) => p.date === dateStr);

            return (
              <DayColumn
                key={dateStr}
                dateStr={dateStr}
                isToday={isToday}
                lessons={dayLessons}
                proposals={dayProposals}
                proposalColor={proposalStudent?.color ?? '#6366f1'}
                nowOffset={nowOffset}
                onEmptyClick={(relY) => handleEmptyClick(dateStr, relY)}
                onLessonClick={handleLessonClick}
                onProposalClick={onProposalClick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── DayColumn ────────────────────────────────────────────────────────────────

interface DayColumnProps {
  dateStr: string;
  isToday: boolean;
  lessons: ResolvedLesson[];
  proposals: Proposal[];
  proposalColor: string;
  nowOffset: number;
  onEmptyClick: (relY: number) => void;
  onLessonClick: (lesson: ResolvedLesson) => void;
  onProposalClick?: (p: Proposal) => void;
}

function DayColumn({
  dateStr,
  isToday,
  lessons,
  proposals,
  proposalColor,
  nowOffset,
  onEmptyClick,
  onLessonClick,
  onProposalClick,
}: DayColumnProps) {
  const colRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-lesson]')) return;
    const rect = colRef.current?.getBoundingClientRect();
    if (!rect) return;
    onEmptyClick(e.clientY - rect.top);
  };

  return (
    <div
      className={`flex-1 border-r border-slate-100 ${isToday ? 'bg-indigo-50/20' : ''}`}
      style={{ minWidth: 100 }}
    >
      {/* Clickable grid body */}
      <div
        ref={colRef}
        className="relative cursor-pointer"
        style={{ height: TOTAL_HEIGHT }}
        onClick={handleClick}
      >
        {/* Horizontal grid lines */}
        {TIME_SLOTS.map((slot, i) => (
          <div
            key={slot}
            className={`absolute left-0 right-0 ${
              slot.endsWith(':00') ? 'border-t border-slate-100' : 'border-t border-slate-50'
            }`}
            style={{ top: i * PX_PER_SLOT }}
          />
        ))}

        {/* Now indicator — only on today's column */}
        {isToday && nowOffset >= 0 && (
          <div
            className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
            style={{ top: nowOffset }}
          >
            <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
            <div className="h-px flex-1 bg-red-400" />
          </div>
        )}

        {/* Lessons */}
        {lessons.map((lesson) => (
          <div key={`${lesson.event.id}-${lesson.date}`} data-lesson="1">
            <LessonCard lesson={lesson} onClick={() => onLessonClick(lesson)} />
          </div>
        ))}

        {/* Ghost proposal slots */}
        {proposals.map((p) => (
          <div key={p.id} data-lesson="1">
            <GhostCard
              proposal={p}
              studentColor={proposalColor}
              onClick={() => onProposalClick?.(p)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
