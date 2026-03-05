import React, { useState, useEffect } from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField, Input, Textarea, Select } from '../ui/FormField';
import { useStudentsStore } from '../../store/studentsStore';
import { useEventsStore } from '../../store/eventsStore';
import { useUIStore } from '../../store/uiStore';
import type { Student } from '../../types';

interface StudentModalProps {
  mode: 'create' | 'edit';
  studentId?: string;
}

const DURATION_OPTIONS = [30, 45, 60, 75, 90, 120];

export function StudentModal({ mode, studentId }: StudentModalProps) {
  const { addStudent, updateStudent, deleteStudent, getStudent } =
    useStudentsStore();
  const { deleteEvent, events } = useEventsStore();
  const { closeModal, openModal } = useUIStore();

  const existing = studentId ? getStudent(studentId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [subjectTagInput, setSubjectTagInput] = useState('');
  const [subjectTags, setSubjectTags] = useState<string[]>(
    existing?.subjectTags ?? [],
  );
  const [defaultDuration, setDefaultDuration] = useState(
    existing?.defaultLessonDurationMin ?? 60,
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [hourlyRate, setHourlyRate] = useState(
    existing?.hourlyRate?.toString() ?? '',
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDelete, setShowDelete] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Imię i nazwisko są wymagane';
    return e;
  };

  const handleAddTag = () => {
    const tag = subjectTagInput.trim().toLowerCase();
    if (tag && !subjectTags.includes(tag)) {
      setSubjectTags((prev) => [...prev, tag]);
    }
    setSubjectTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setSubjectTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    const data = {
      name: name.trim(),
      subjectTags,
      defaultLessonDurationMin: defaultDuration,
      notes: notes.trim() || undefined,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
    };

    if (mode === 'create') {
      addStudent(data);
    } else if (studentId) {
      updateStudent(studentId, data);
    }
    closeModal();
  };

  const handleDelete = () => {
    if (!studentId) return;
    // Remove all student's events
    events
      .filter((e) => e.studentId === studentId)
      .forEach((e) => deleteEvent(e.id));
    deleteStudent(studentId);
    closeModal();
  };

  return (
    <Modal
      isOpen
      onClose={closeModal}
      title={mode === 'create' ? 'Nowy uczeń' : 'Edytuj ucznia'}
      size="md"
      footer={
        <div className="flex items-center w-full">
          {mode === 'edit' && (
            <div className="flex-1">
              {!showDelete ? (
                <button
                  onClick={() => setShowDelete(true)}
                  className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={14} />
                  Usuń ucznia
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600 font-medium">
                    Na pewno usunąć?
                  </span>
                  <Button variant="danger" size="sm" onClick={handleDelete}>
                    Tak, usuń
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDelete(false)}
                  >
                    Anuluj
                  </Button>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3 ml-auto">
            <Button variant="secondary" onClick={closeModal}>
              Anuluj
            </Button>
            <Button onClick={handleSubmit}>
              {mode === 'create' ? 'Dodaj ucznia' : 'Zapisz zmiany'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="Imię i nazwisko" htmlFor="name" required error={errors.name}>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="np. Anna Kowalska"
            autoFocus
            error={!!errors.name}
          />
        </FormField>

        <FormField label="Przedmioty" hint="Wciśnij Enter lub przecinek, żeby dodać tag">
          <div className="flex gap-2">
            <Input
              value={subjectTagInput}
              onChange={(e) => setSubjectTagInput(e.target.value)}
              placeholder="np. matematyka"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <Button variant="outline" size="sm" onClick={handleAddTag} icon={<Plus size={14} />}>
              Dodaj
            </Button>
          </div>
          {subjectTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {subjectTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-indigo-900 transition-colors"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Domyślny czas lekcji"
            htmlFor="duration"
          >
            <Select
              id="duration"
              value={defaultDuration}
              onChange={(e) => setDefaultDuration(Number(e.target.value))}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Stawka (zł/h)"
            htmlFor="rate"
            hint="Opcjonalne"
          >
            <Input
              id="rate"
              type="number"
              min={0}
              step={10}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="np. 80"
            />
          </FormField>
        </div>

        <FormField label="Notatki" hint="Informacje o uczniu, materiały, cele">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Np. przygotowuje się do matury, preferuje zadania z algebry..."
            rows={3}
          />
        </FormField>
      </div>
    </Modal>
  );
}
