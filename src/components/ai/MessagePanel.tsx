import { useState, useRef } from 'react';
import {
  MessageSquare,
  Sparkles,
  ChevronDown,
  X,
  Info,
  Loader2,
} from 'lucide-react';
import { useStudentsStore } from '../../store/studentsStore';
import { useEventsStore } from '../../store/eventsStore';
import { useUIStore } from '../../store/uiStore';
import { parseAvailabilityWithAI } from '../../services/ai';
import { generateProposals } from '../../services/proposals';
import { resolveWeekLessons, fromDateString } from '../../utils/calendar';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { ProposalList } from './ProposalList';
import { EXAMPLE_MESSAGES } from '../../data/seed';
import type { Proposal, Availability } from '../../types';

export function MessagePanel() {
  const { students } = useStudentsStore();
  const { events } = useEventsStore();
  const {
    activePanel,
    setActivePanel,
    currentWeekStart,
    setCalendarProposals,
    clearCalendarProposals,
  } = useUIStore();

  const [selectedStudentId, setSelectedStudentId] = useState(
    students[0]?.id ?? '',
  );
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [processingNote, setProcessingNote] = useState('');
  const [explanation, setExplanation] = useState('');
  const [suggestedChanges, setSuggestedChanges] = useState<string[]>([]);
  const [showExamples, setShowExamples] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isVisible = activePanel === 'ai';

  if (!isVisible) return null;

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handleAnalyze = async () => {
    if (!message.trim() || !selectedStudentId) return;
    setIsLoading(true);
    setProposals([]);
    setExplanation('');
    setSuggestedChanges([]);
    clearCalendarProposals();

    try {
      const { availability: parsed, processingNote: note } =
        await parseAvailabilityWithAI(message);

      setAvailability(parsed);
      setProcessingNote(note);

      const allLessons = resolveWeekLessons(
        events,
        students,
        fromDateString(currentWeekStart),
      );

      const student = students.find((s) => s.id === selectedStudentId);
      const durationMin =
        parsed.durationMin ?? student?.defaultLessonDurationMin ?? 60;

      const result = generateProposals(
        parsed,
        currentWeekStart,
        allLessons,
        durationMin,
      );

      setProposals(result.proposals);
      setExplanation(result.explanation ?? '');
      setSuggestedChanges(result.suggestedChanges ?? []);

      // Push proposals to calendar ghost slots
      setCalendarProposals(result.proposals, selectedStudentId);
    } catch (err) {
      console.error('Error analyzing message:', err);
      setExplanation('Wystąpił błąd podczas analizy wiadomości.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (text: string) => {
    setMessage(text);
    setShowExamples(false);
    textareaRef.current?.focus();
  };

  const handleReset = () => {
    setMessage('');
    setProposals([]);
    setAvailability(null);
    setExplanation('');
    setSuggestedChanges([]);
    clearCalendarProposals();
  };

  return (
    <div className="w-96 min-w-96 bg-white border-l border-slate-100 flex flex-col h-full animate-slide-in-right shadow-soft overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">
              AI Propozycje Terminów
            </div>
            <div className="text-xs text-slate-500">
              Wklej wiadomość od ucznia
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            clearCalendarProposals();
            setActivePanel('none');
          }}
          className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Form */}
      <div className="px-4 py-4 space-y-3 border-b border-slate-100">
        {/* Student selector */}
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1.5 block">
            Uczeń
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <option value="">— wybierz ucznia —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Message textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-600">
              Wiadomość od ucznia
            </label>
            <button
              onClick={() => setShowExamples((v) => !v)}
              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
            >
              Przykłady
              <ChevronDown
                size={12}
                className={`transition-transform ${showExamples ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {showExamples && (
            <div className="mb-2 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
              {EXAMPLE_MESSAGES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(ex.text)}
                  className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 border-b border-slate-100 last:border-0 transition-colors"
                >
                  <div className="text-xs font-medium text-indigo-700 mb-0.5">
                    {ex.label}
                  </div>
                  <div className="text-xs text-slate-500 line-clamp-2">
                    {ex.text}
                  </div>
                </button>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="np. Mogę wt i czw po 17, w sob rano też bym dała radę..."
            rows={5}
            className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-400 transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey) handleAnalyze();
            }}
          />
          <div className="text-xs text-slate-400 mt-1">⌘↵ aby przeanalizować</div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleAnalyze}
            loading={isLoading}
            disabled={!message.trim() || !selectedStudentId}
            icon={<Sparkles size={14} />}
            className="flex-1"
          >
            Zaproponuj terminy
          </Button>
          {(proposals.length > 0 || message) && (
            <Button variant="ghost" onClick={handleReset} size="md">
              <X size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 size={28} className="animate-spin text-indigo-500" />
            <div className="text-sm">Analizuję wiadomość...</div>
          </div>
        )}

        {!isLoading && proposals.length === 0 && !explanation && (
          <EmptyState
            icon={<MessageSquare size={24} />}
            title="Brak propozycji"
            description={'Wybierz ucznia, wklej jego wiadomość i kliknij \u201eZaproponuj terminy\u201d.'}
          />
        )}

        {!isLoading && explanation && proposals.length === 0 && (
          <div className="px-4 py-6 space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 space-y-2">
              <div className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                <Info size={14} />
                Brak pasujących terminów
              </div>
              <p className="text-sm text-amber-700">{explanation}</p>
            </div>
            {suggestedChanges.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Co można zmienić?
                </div>
                <ul className="space-y-1.5">
                  {suggestedChanges.map((s, i) => (
                    <li key={i} className="text-sm text-slate-600 flex gap-2">
                      <span className="text-indigo-400 shrink-0">→</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!isLoading && proposals.length > 0 && selectedStudent && (
          <ProposalList
            proposals={proposals}
            student={selectedStudent}
            availability={availability}
            processingNote={processingNote}
          />
        )}
      </div>
    </div>
  );
}
