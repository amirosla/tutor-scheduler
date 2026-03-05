import { create } from 'zustand';
import type { UIState, ModalState, PanelType, Proposal } from '../types';
import { currentWeekMonday, offsetWeek } from '../utils/calendar';

interface UIStore extends UIState {
  modal: ModalState;
  // AI proposals shown as ghost slots in calendar
  calendarProposals: Proposal[];
  calendarProposalStudentId: string | null;

  // Navigation
  goToNextWeek: () => void;
  goToPrevWeek: () => void;
  goToCurrentWeek: () => void;
  setCurrentWeek: (weekStart: string) => void;

  // Panel
  setActivePanel: (panel: PanelType) => void;
  togglePanel: (panel: PanelType) => void;
  closePanel: () => void;

  // Filters
  setFilterStudent: (id: string | null) => void;
  setSearchQuery: (q: string) => void;

  // Selected student
  setSelectedStudent: (id: string | null) => void;

  // View mode
  setViewMode: (mode: UIState['viewMode']) => void;

  // Mobile day selector
  setSelectedDay: (offset: number) => void;

  // Modal
  openModal: (type: ModalState['type'], data?: ModalState['data']) => void;
  closeModal: () => void;

  // Proposals in calendar
  setCalendarProposals: (proposals: Proposal[], studentId: string | null) => void;
  clearCalendarProposals: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'week',
  activePanel: 'none',
  selectedStudentId: null,
  currentWeekStart: currentWeekMonday(),
  searchQuery: '',
  filterStudentId: null,
  selectedDayOffset: 0,
  modal: { type: 'none' },
  calendarProposals: [],
  calendarProposalStudentId: null,

  goToNextWeek: () =>
    set((s) => ({ currentWeekStart: offsetWeek(s.currentWeekStart, 1) })),
  goToPrevWeek: () =>
    set((s) => ({ currentWeekStart: offsetWeek(s.currentWeekStart, -1) })),
  goToCurrentWeek: () =>
    set({ currentWeekStart: currentWeekMonday() }),
  setCurrentWeek: (weekStart) => set({ currentWeekStart: weekStart }),

  setActivePanel: (panel) => set({ activePanel: panel }),
  togglePanel: (panel) =>
    set((s) => ({
      activePanel: s.activePanel === panel ? 'none' : panel,
    })),

  setFilterStudent: (id) => set({ filterStudentId: id }),

  closePanel: () => set({ activePanel: 'none' }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedStudent: (id) => set({ selectedStudentId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedDay: (offset) => set({ selectedDayOffset: offset }),

  openModal: (type, data) => set({ modal: { type, data } }),
  closeModal: () => set({ modal: { type: 'none' } }),

  setCalendarProposals: (proposals, studentId) =>
    set({ calendarProposals: proposals, calendarProposalStudentId: studentId }),
  clearCalendarProposals: () =>
    set({ calendarProposals: [], calendarProposalStudentId: null }),
}));
