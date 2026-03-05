import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Repeat, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField, Input, Textarea, Select } from '../ui/FormField';
import { useStudentsStore } from '../../store/studentsStore';
import { useEventsStore } from '../../store/eventsStore';
import { useUIStore } from '../../store/uiStore';
import { DAY_NAMES_FULL } from '../../utils/calendar';
import { addMinutesToTime, timeToMinutes } from '../../utils/time';
import type { LessonPrefill } from '../../types';

const DOW_OPTIONS = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

interface LessonModalProps {
  mode: 'create' | 'edit';
  eventId?: string;
  date?: string; // For edit: specific date of recurring occurrence
  prefill?: LessonPrefill;
}

export function LessonModal({ mode, eventId, date, prefill }: LessonModalProps) {
  const { students } = useStudentsStore();
  const { events, addEvent, updateEvent, deleteEvent, addException, addOverride } = useEventsStore();
  const { closeModal } = useUIStore();

  const existing = eventId ? events.find((e) => e.id === eventId) : undefined;
  const firstStudent = students[0];
  const isEdit = mode === 'edit';
  const isRecurringEdit = isEdit && !!existing?.isRecurring && !!date;
  // Override already saved for this specific date (if any)
  const dateOverride = isRecurringEdit ? (existing?.dateOverrides?.[date!] ?? null) : null;

  // Form state
  const [saveMode, setSaveMode] = useState<'one' | 'all'>(isRecurringEdit ? 'one' : 'all');
  const [studentId, setStudentId] = useState(
    prefill?.studentId ?? existing?.studentId ?? firstStudent?.id ?? '',
  );
  const [title, setTitle] = useState(
    prefill?.title ?? dateOverride?.title ?? existing?.title ?? '',
  );
  const [isRecurring, setIsRecurring] = useState(existing?.isRecurring ?? false);
  const [dateStr, setDateStr] = useState(
    prefill?.date ?? (existing?.isRecurring ? '' : existing?.date ?? date ?? ''),
  );
  const [dayOfWeek, setDayOfWeek] = useState<number>(
    existing?.dayOfWeek ?? 1,
  );
  const [recurringStartDate, setRecurringStartDate] = useState(
    existing?.recurringStartDate ?? prefill?.date ?? '',
  );
  const [startTime, setStartTime] = useState(
    prefill?.startTime ?? dateOverride?.startTime ?? existing?.startTime ?? '16:00',
  );
  const [endTime, setEndTime] = useState(() => {
    const st = prefill?.startTime ?? dateOverride?.startTime ?? existing?.startTime ?? '16:00';
    const dur = prefill?.durationMin ?? dateOverride?.durationMin ?? existing?.durationMin ?? 60;
    return addMinutesToTime(st, dur);
  });
  const [location, setLocation] = useState(
    prefill?.location ?? dateOverride?.location ?? existing?.location ?? 'Zdalnie',
  );
  const [notes, setNotes] = useState(dateOverride?.notes ?? existing?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteMode, setDeleteMode] = useState<'none' | 'one' | 'all'>('none');
  const titleEdited = useRef(mode === 'edit' && !!existing?.title);

  function makeAutoTitle(studentId: string) {
    const s = students.find((s) => s.id === studentId);
    if (!s) return '';
    const subj = s.subjectTags[0] ?? 'Lekcja';
    return `${subj.charAt(0).toUpperCase() + subj.slice(1)} — ${s.name}`;
  }

  // Auto-fill title when student changes (unless manually edited)
  useEffect(() => {
    if (titleEdited.current) return;
    if (studentId) setTitle(makeAutoTitle(studentId));
  }, [studentId]);

  // Auto-fill end time from student default duration (create mode only)
  useEffect(() => {
    if (mode === 'create' && studentId) {
      const s = students.find((s) => s.id === studentId);
      // startTime is intentionally read from closure — only react to student changes
      if (s) setEndTime(addMinutesToTime(startTime, s.defaultLessonDurationMin));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, mode]);

  const durationMin = Math.max(15, timeToMinutes(endTime) - timeToMinutes(startTime));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!studentId) e.studentId = 'Wybierz ucznia';
    if (!title.trim()) e.title = 'Tytuł jest wymagany';
    if (!isRecurring && !dateStr) e.date = 'Podaj datę';
    if (!startTime) e.startTime = 'Podaj godzinę';
    if (!endTime) e.endTime = 'Podaj godzinę';
    if (startTime && endTime && timeToMinutes(endTime) <= timeToMinutes(startTime))
      e.endTime = 'Koniec musi być po początku';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    const data = {
      studentId,
      title: title.trim(),
      isRecurring,
      startTime,
      durationMin,
      location: location.trim(),
      notes: notes.trim() || undefined,
      ...(isRecurring
        ? { dayOfWeek, recurringStartDate: recurringStartDate || undefined }
        : { date: dateStr }),
    };

    if (mode === 'create') {
      addEvent(data);
    } else if (eventId) {
      if (isRecurringEdit && saveMode === 'one' && date) {
        addOverride(eventId, date, {
          startTime,
          durationMin,
          location: location.trim() || undefined,
          title: title.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        updateEvent(eventId, data);
      }
    }
    closeModal();
  };

  const handleDelete = () => {
    if (!eventId) return;
    if (existing?.isRecurring && date && deleteMode === 'one') {
      addException(eventId, date);
    } else {
      deleteEvent(eventId);
    }
    closeModal();
  };

  return (
    <Modal
      isOpen
      onClose={closeModal}
      title={mode === 'create' ? 'Nowa lekcja' : 'Edytuj lekcję'}
      size="md"
      footer={
        <div className="flex items-center w-full gap-3">
          {isEdit && deleteMode === 'none' && (
            <button
              onClick={() =>
                setDeleteMode(isRecurringEdit ? 'one' : 'all')
              }
              className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1.5 mr-auto"
            >
              <Trash2 size={14} />
              Usuń
            </button>
          )}
          {isEdit && deleteMode !== 'none' && (
            <div className="flex items-center gap-2 mr-auto">
              {isRecurringEdit && deleteMode === 'one' ? (
                <>
                  <span className="text-sm text-amber-700 font-medium flex items-center gap-1">
                    <AlertTriangle size={14} />
                    Pomiń tę datę?
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setDeleteMode('all');
                    }}
                  >
                    Usuń całą serię
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDelete}
                  >
                    Tylko tę datę
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteMode('none')}
                  >
                    Anuluj
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm text-red-600 font-medium">
                    Usunąć lekcję?
                  </span>
                  <Button variant="danger" size="sm" onClick={handleDelete}>
                    Usuń
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteMode('none')}
                  >
                    Anuluj
                  </Button>
                </>
              )}
            </div>
          )}
          <Button variant="secondary" onClick={closeModal}>
            Anuluj
          </Button>
          <Button onClick={handleSubmit}>
            {mode === 'create'
              ? 'Utwórz lekcję'
              : isRecurringEdit && saveMode === 'one'
                ? 'Zapisz tę datę'
                : 'Zapisz zmiany'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Scope toggle — only for recurring edits */}
        {isRecurringEdit && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200">
            <Repeat size={13} className="text-amber-600 shrink-0" />
            <span className="text-xs text-amber-700 font-medium flex-1">Zmiana dotyczy:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setSaveMode('one')}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  saveMode === 'one' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-100'
                }`}
              >
                tej daty
              </button>
              <button
                type="button"
                onClick={() => setSaveMode('all')}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  saveMode === 'all' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-100'
                }`}
              >
                całej serii
              </button>
            </div>
          </div>
        )}

        {/* Student */}
        <FormField label="Uczeń" htmlFor="student" required error={errors.studentId}>
          <Select
            id="student"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            error={!!errors.studentId}
          >
            <option value="">— wybierz ucznia —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.subjectTags.join(', ') || 'brak tagów'})
              </option>
            ))}
          </Select>
        </FormField>

        {/* Title */}
        <FormField label="Tytuł lekcji" htmlFor="title" required error={errors.title}>
          <Input
            id="title"
            value={title}
            onChange={(e) => { titleEdited.current = true; setTitle(e.target.value); }}
            placeholder="np. Matematyka — Anna"
            error={!!errors.title}
          />
        </FormField>

        {/* Recurring toggle */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <button
            onClick={() => setIsRecurring((v) => !v)}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              isRecurring ? 'text-indigo-700' : 'text-slate-500'
            }`}
          >
            <div
              className={`w-8 h-5 rounded-full transition-colors relative ${
                isRecurring ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  isRecurring ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </div>
            <Repeat size={14} />
            Powtarzająca się lekcja
          </button>
        </div>

        {/* Date / Day of week */}
        {isRecurring ? (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Dzień tygodnia" htmlFor="dow">
              <Select
                id="dow"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
              >
                {DOW_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {DAY_NAMES_FULL[d === 0 ? 6 : d - 1]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Od daty" htmlFor="recurringStart" hint="Pierwsza lekcja">
              <Input
                id="recurringStart"
                type="date"
                value={recurringStartDate}
                onChange={(e) => setRecurringStartDate(e.target.value)}
              />
            </FormField>
          </div>
        ) : (
          <FormField label="Data" htmlFor="date" required error={errors.date}>
            <Input
              id="date"
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              error={!!errors.date}
            />
          </FormField>
        )}

        {/* Time — start and end */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Godzina od" htmlFor="startTime" required error={errors.startTime}>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              error={!!errors.startTime}
            />
          </FormField>
          <FormField label="Godzina do" htmlFor="endTime" required error={errors.endTime}>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              error={!!errors.endTime}
            />
          </FormField>
        </div>

        {/* Location */}
        <FormField label="Miejsce" htmlFor="location">
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="np. Zdalnie, Dom ucznia, ul. Główna 1"
          />
        </FormField>

        {/* Notes */}
        <FormField label="Notatki" hint="Opcjonalne">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dodatkowe informacje o tej lekcji..."
            rows={2}
          />
        </FormField>
      </div>
    </Modal>
  );
}
