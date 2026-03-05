import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Event, ResolvedLesson, Student } from '../types';
import { eventsRepo } from '../services/storage';
import { resolveWeekLessons, fromDateString } from '../utils/calendar';

interface EventsState {
  events: Event[];

  // Actions
  loadFromStorage: () => void;
  addEvent: (data: Omit<Event, 'id' | 'createdAt'>) => Event;
  updateEvent: (id: string, data: Partial<Omit<Event, 'id' | 'createdAt'>>) => void;
  deleteEvent: (id: string) => void;

  // Recurring-specific
  addException: (eventId: string, date: string) => void;
  addOverride: (eventId: string, date: string, override: Partial<Event>) => void;

  // Selectors (pure, no side effects)
  getWeekLessons: (weekStart: string, students: Student[]) => ResolvedLesson[];
  getStudentEvents: (studentId: string) => Event[];
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],

  loadFromStorage: () => {
    const loaded = eventsRepo.getAll();
    set({ events: loaded });
  },

  addEvent: (data) => {
    const event: Event = {
      id: uuid(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    set((state) => {
      const events = [...state.events, event];
      eventsRepo.save(events);
      return { events };
    });
    return event;
  },

  updateEvent: (id, data) => {
    set((state) => {
      const events = state.events.map((e) =>
        e.id === id ? { ...e, ...data } : e,
      );
      eventsRepo.save(events);
      return { events };
    });
  },

  deleteEvent: (id) => {
    set((state) => {
      const events = state.events.filter((e) => e.id !== id);
      eventsRepo.save(events);
      return { events };
    });
  },

  addException: (eventId, date) => {
    set((state) => {
      const events = state.events.map((e) => {
        if (e.id !== eventId) return e;
        return {
          ...e,
          dateExceptions: [...(e.dateExceptions ?? []), date],
        };
      });
      eventsRepo.save(events);
      return { events };
    });
  },

  addOverride: (eventId, date, override) => {
    set((state) => {
      const events = state.events.map((e) => {
        if (e.id !== eventId) return e;
        return {
          ...e,
          dateOverrides: { ...(e.dateOverrides ?? {}), [date]: override },
        };
      });
      eventsRepo.save(events);
      return { events };
    });
  },

  getWeekLessons: (weekStart, students) => {
    const { events } = get();
    return resolveWeekLessons(events, students, fromDateString(weekStart));
  },

  getStudentEvents: (studentId) => {
    return get().events.filter((e) => e.studentId === studentId);
  },
}));
