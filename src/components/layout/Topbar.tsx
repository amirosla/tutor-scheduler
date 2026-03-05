import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  MessageSquare,
  Plus,
  Search,
  Home,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { formatWeekRange, fromDateString, toDateString, getWeekStart } from '../../utils/calendar';
import { Button } from '../ui/Button';

export function Topbar() {
  const {
    currentWeekStart,
    goToNextWeek,
    goToPrevWeek,
    goToCurrentWeek,
    activePanel,
    togglePanel,
    openModal,
    searchQuery,
    setSearchQuery,
  } = useUIStore();

  const weekStart = fromDateString(currentWeekStart);
  const weekLabel = formatWeekRange(weekStart);
  const isCurrentWeek =
    toDateString(getWeekStart(new Date())) === currentWeekStart;

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center px-4 gap-3 z-20 relative shadow-soft">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mr-2">
        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
          <Calendar size={16} className="text-white" />
        </div>
        <span className="font-semibold text-slate-800 hidden sm:block">
          Tutor Scheduler
        </span>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 border border-slate-100">
        <button
          onClick={goToPrevWeek}
          className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={goToCurrentWeek}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
            isCurrentWeek
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-white hover:shadow-sm'
          }`}
        >
          <span className="hidden md:inline">{weekLabel}</span>
          <span className="md:hidden">
            <Home size={14} />
          </span>
        </button>
        <button
          onClick={goToNextWeek}
          className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-slate-700"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Week label on medium screens */}
      <span className="hidden md:block text-sm text-slate-500 font-medium">
        {!isCurrentWeek && weekLabel}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden sm:block">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Szukaj ucznia..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-44 transition-all focus:w-56"
        />
      </div>

      {/* AI Panel toggle */}
      <button
        onClick={() => togglePanel('ai')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
          activePanel === 'ai'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        <MessageSquare size={15} />
        <span className="hidden sm:inline">AI Terminy</span>
      </button>

      {/* Add lesson */}
      <Button
        onClick={() => openModal('createLesson')}
        size="sm"
        icon={<Plus size={15} />}
      >
        <span className="hidden sm:inline">Dodaj lekcję</span>
      </Button>
    </header>
  );
}
