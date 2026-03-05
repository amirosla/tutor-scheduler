import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Student } from '../types';
import { generateStudentColor, nextUnusedColorIndex } from '../utils/color';
import { studentsRepo } from '../services/storage';

interface StudentsState {
  students: Student[];

  // Actions
  loadFromStorage: () => void;
  addStudent: (data: Omit<Student, 'id' | 'color' | 'createdAt'>) => Student;
  updateStudent: (id: string, data: Partial<Omit<Student, 'id' | 'color' | 'createdAt'>>) => void;
  deleteStudent: (id: string) => void;
  getStudent: (id: string) => Student | undefined;
}

export const useStudentsStore = create<StudentsState>((set, get) => ({
  students: [],

  loadFromStorage: () => {
    const loaded = studentsRepo.getAll();
    set({ students: loaded });
  },

  addStudent: (data) => {
    const id = uuid();
    const colorIndex = nextUnusedColorIndex(get().students.map((s) => s.color));
    const { defaultLessonDurationMin = 60, ...rest } = data;
    const student: Student = {
      id,
      color: generateStudentColor(id, colorIndex),
      createdAt: new Date().toISOString(),
      defaultLessonDurationMin,
      ...rest,
    };
    set((state) => {
      const students = [...state.students, student];
      studentsRepo.save(students);
      return { students };
    });
    return student;
  },

  updateStudent: (id, data) => {
    set((state) => {
      const students = state.students.map((s) =>
        s.id === id ? { ...s, ...data } : s,
      );
      studentsRepo.save(students);
      return { students };
    });
  },

  deleteStudent: (id) => {
    set((state) => {
      const students = state.students.filter((s) => s.id !== id);
      studentsRepo.save(students);
      return { students };
    });
  },

  getStudent: (id) => get().students.find((s) => s.id === id),
}));
