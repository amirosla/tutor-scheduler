import { MapPin, Clock, Repeat } from 'lucide-react';
import type { ResolvedLesson, Proposal } from '../../types';
import { lightenHsl, hslToRgba } from '../../utils/color';
import { timeToPixelOffset, minutesToPixelHeight } from '../../utils/time';

// ─── Real lesson card ─────────────────────────────────────────────────────────

interface LessonCardProps {
  lesson: ResolvedLesson;
  onClick?: () => void;
}

export function LessonCard({ lesson, onClick }: LessonCardProps) {
  const { student, startTime, endTime, durationMin } = lesson;
  const color = student.color;
  const bgColor = lightenHsl(color, 38);
  const override = lesson.event.dateOverrides?.[lesson.date];
  const title = override?.title ?? lesson.event.title;
  const location = override?.location ?? lesson.event.location;

  const top = timeToPixelOffset(startTime);
  const height = Math.max(minutesToPixelHeight(durationMin), 24);

  return (
    <div
      className="absolute left-1 right-1 rounded-xl overflow-hidden cursor-pointer transition-all hover:z-10 hover:shadow-card"
      style={{ top, height, backgroundColor: bgColor, borderLeft: `3px solid ${color}`, zIndex: 5 }}
      onClick={onClick}
      title={`${title} — ${startTime}–${endTime}`}
    >
      <div className="px-2 py-1 h-full flex flex-col justify-start overflow-hidden">
        <div className="text-sm font-semibold leading-tight break-words" style={{ color }}>
          {title}
        </div>

        {height >= 52 && (
          <div className="text-xs mt-0.5 flex items-center gap-1 opacity-75" style={{ color }}>
            <Clock size={10} />
            {startTime}–{endTime}
          </div>
        )}

        {height >= 84 && location && (
          <div className="text-xs mt-0.5 flex items-center gap-1 opacity-60 overflow-hidden" style={{ color }}>
            <MapPin size={10} />
            {location}
          </div>
        )}

        {height >= 56 && lesson.event.isRecurring && (
          <div className="absolute top-1 right-1 opacity-40">
            <Repeat size={10} style={{ color }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ghost / proposal card ────────────────────────────────────────────────────

interface GhostCardProps {
  proposal: Proposal;
  studentColor: string;
  onClick?: () => void;
}

export function GhostCard({ proposal, studentColor, onClick }: GhostCardProps) {
  const top = timeToPixelOffset(proposal.startTime);
  const height = Math.max(minutesToPixelHeight(proposal.durationMin), 32);

  return (
    <div
      className="absolute left-1 right-1 rounded-xl overflow-hidden cursor-pointer animate-pulse-soft hover:animate-none transition-all hover:z-10"
      style={{
        top,
        height,
        backgroundColor: hslToRgba(studentColor, 0.12),
        border: `2px dashed ${hslToRgba(studentColor, 0.4)}`,
        borderLeftWidth: '3px',
        zIndex: 4,
      }}
      onClick={onClick}
      title={`Propozycja: ${proposal.startTime}–${proposal.endTime}`}
    >
      <div className="px-2 py-1 h-full flex flex-col justify-center" style={{ color: studentColor, opacity: 0.8 }}>
        <div className="text-xs font-semibold">
          {proposal.startTime}–{proposal.endTime}
        </div>
        {height >= 48 && (
          <div className="text-xs opacity-70">Score: {proposal.score}</div>
        )}
      </div>
    </div>
  );
}
