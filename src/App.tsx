import { useEffect } from 'react';
import { useStudentsStore } from './store/studentsStore';
import { useEventsStore } from './store/eventsStore';
import { useUIStore } from './store/uiStore';
import { seedData } from './data/seed';
import { Topbar } from './components/layout/Topbar';
import { Sidebar } from './components/layout/Sidebar';
import { WeekCalendar } from './components/calendar/WeekCalendar';
import { MessagePanel } from './components/ai/MessagePanel';
import { LessonModal } from './components/lessons/LessonModal';
import { StudentModal } from './components/students/StudentModal';

function ModalRouter() {
  const { modal } = useUIStore();

  if (modal.type === 'createLesson') {
    const prefill = modal.data as {
      date?: string;
      startTime?: string;
      studentId?: string;
    } | undefined;
    return <LessonModal mode="create" prefill={prefill} />;
  }

  if (modal.type === 'editLesson') {
    const data = modal.data as { lessonId: string; date?: string } | undefined;
    return (
      <LessonModal
        mode="edit"
        eventId={data?.lessonId}
        date={data?.date}
      />
    );
  }

  if (modal.type === 'createStudent') {
    return <StudentModal mode="create" />;
  }

  if (modal.type === 'editStudent') {
    const data = modal.data as { studentId: string } | undefined;
    return <StudentModal mode="edit" studentId={data?.studentId} />;
  }

  return null;
}

export default function App() {
  const { loadFromStorage: loadStudents } = useStudentsStore();
  const { loadFromStorage: loadEvents } = useEventsStore();
  const { calendarProposals, calendarProposalStudentId } = useUIStore();

  useEffect(() => {
    seedData();
    loadStudents();
    loadEvents();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans overflow-hidden">
      <Topbar />

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        <main className="flex-1 overflow-hidden">
          <WeekCalendar
            proposals={calendarProposals}
            proposalStudentId={calendarProposalStudentId ?? undefined}
          />
        </main>

        <MessagePanel />
      </div>

      <ModalRouter />
    </div>
  );
}
