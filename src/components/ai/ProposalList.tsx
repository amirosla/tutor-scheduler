import React, { useState } from 'react';
import {
  Check,
  Repeat,
  Edit2,
  Star,
  Clock,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useEventsStore } from '../../store/eventsStore';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../ui/Button';
import type { Proposal, Student, Availability } from '../../types';
import { formatDuration } from '../../utils/time';
import { fromDateString } from '../../utils/calendar';
import { hslToRgba, lightenHsl } from '../../utils/color';

interface ProposalListProps {
  proposals: Proposal[];
  student: Student;
  availability: Availability | null;
  processingNote?: string;
}

export function ProposalList({
  proposals,
  student,
  availability,
  processingNote,
}: ProposalListProps) {
  const { addEvent } = useEventsStore();
  const { closeModal } = useUIStore();
  const [createdIds, setCreatedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const handleCreate = (proposal: Proposal, recurring: boolean) => {
    const date = fromDateString(proposal.date);
    const dow = date.getDay(); // 0=Sun, 1=Mon...

    addEvent({
      studentId: student.id,
      title: `${student.subjectTags[0] ? student.subjectTags[0].charAt(0).toUpperCase() + student.subjectTags[0].slice(1) : 'Lekcja'} — ${student.name}`,
      startTime: proposal.startTime,
      durationMin: proposal.durationMin,
      location: 'Zdalnie',
      isRecurring: recurring,
      ...(recurring ? { dayOfWeek: dow } : { date: proposal.date }),
    });
    setCreatedIds((prev) => new Set([...prev, proposal.id]));
  };

  const scoreColor = (score: number): string => {
    if (score >= 75) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#94a3b8';
  };

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">
          {proposals.length} propozycji terminów
        </div>
        <button
          onClick={() => setShowInfo((v) => !v)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          title="Informacje o analizie"
        >
          <Info size={14} />
        </button>
      </div>

      {/* Processing note */}
      {showInfo && processingNote && (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
          {processingNote}
          {availability?.durationMin && (
            <span className="ml-2 text-indigo-600 font-medium">
              · Czas lekcji: {formatDuration(availability.durationMin)}
            </span>
          )}
        </div>
      )}

      {/* Proposals */}
      <div className="space-y-2">
        {proposals.map((proposal, index) => {
          const isCreated = createdIds.has(proposal.id);
          const isExpanded = expandedId === proposal.id;
          const isTop = index === 0;
          const date = fromDateString(proposal.date);
          const dateLabel = format(date, 'EEEE, d MMMM', { locale: pl });
          const color = student.color;

          return (
            <div
              key={proposal.id}
              className={`rounded-xl border overflow-hidden transition-all ${
                isCreated
                  ? 'opacity-60 bg-slate-50 border-slate-100'
                  : isTop
                    ? 'border-indigo-200 shadow-soft'
                    : 'border-slate-100 hover:border-slate-200 hover:shadow-soft'
              }`}
              style={
                !isCreated && isTop
                  ? { backgroundColor: lightenHsl(color, 42) }
                  : {}
              }
            >
              {/* Main row */}
              <div className="p-3">
                <div className="flex items-start gap-3">
                  {/* Score badge */}
                  <div
                    className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm"
                    style={{ backgroundColor: scoreColor(proposal.score) }}
                  >
                    <span>{proposal.score}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 capitalize">
                      {dateLabel}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock size={12} className="text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-600 font-medium">
                        {proposal.startTime}–{proposal.endTime}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({formatDuration(proposal.durationMin)})
                      </span>
                      {isTop && (
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                          <Star size={10} fill="currentColor" />
                          Najlepszy
                        </span>
                      )}
                    </div>

                    {/* Reasons */}
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : proposal.id)
                      }
                      className="text-xs text-slate-400 hover:text-slate-600 mt-1 flex items-center gap-1 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )}
                      {proposal.reasons.length} powod
                      {proposal.reasons.length === 1 ? '' : 'y'}
                    </button>
                  </div>

                  {/* Created indicator */}
                  {isCreated && (
                    <div className="flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
                      <Check size={14} />
                      Dodano
                    </div>
                  )}
                </div>

                {/* Expanded reasons */}
                {isExpanded && (
                  <div className="mt-2 ml-13 pl-13 ml-[52px] space-y-1">
                    {proposal.reasons.map((r, i) => (
                      <div key={i} className="text-xs text-slate-500 flex gap-2">
                        <span className="text-indigo-300 shrink-0">·</span>
                        {r}
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                {!isCreated && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => handleCreate(proposal, false)}
                      icon={<Check size={13} />}
                      className="flex-1 text-xs"
                    >
                      Utwórz lekcję
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCreate(proposal, true)}
                      icon={<Repeat size={13} />}
                      className="flex-1 text-xs"
                    >
                      Ustaw stałe
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {createdIds.size > 0 && (
        <div className="text-center py-2">
          <span className="text-sm text-green-600 font-medium">
            ✓ Dodano {createdIds.size} lekcj
            {createdIds.size === 1 ? 'ę' : 'i'}
          </span>
        </div>
      )}
    </div>
  );
}
