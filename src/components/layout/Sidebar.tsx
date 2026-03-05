import { Pencil, Plus, Users, GraduationCap } from 'lucide-react';
import { useStudentsStore } from '../../store/studentsStore';
import { useEventsStore } from '../../store/eventsStore';
import { useUIStore } from '../../store/uiStore';
import { EmptyState } from '../ui/EmptyState';
export function Sidebar() {
  const { students } = useStudentsStore();
  const { events } = useEventsStore();
  const { filterStudentId, setFilterStudent, openModal, searchQuery } = useUIStore();

  const filtered = students.filter((s) =>
    searchQuery
      ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.subjectTags.some((t) =>
          t.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : true,
  );

  return (
    <aside className="w-64 min-w-64 bg-white border-r border-slate-100 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Uczniowie</span>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">
            {students.length}
          </span>
        </div>
        <button
          onClick={() => openModal('createStudent')}
          className="p-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 transition-colors"
          title="Dodaj ucznia"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Filter: All */}
      <button
        onClick={() => setFilterStudent(null)}
        className={`mx-3 mt-3 mb-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
          filterStudentId === null
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            filterStudentId === null ? 'bg-indigo-500' : 'bg-slate-300'
          }`}
        />
        Wszyscy uczniowie
      </button>

      {/* Student list */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<GraduationCap size={24} />}
            title="Brak uczniów"
            description="Dodaj pierwszego ucznia, żeby zacząć tworzyć grafik."
            action={
              <button
                onClick={() => openModal('createStudent')}
                className="text-sm text-indigo-600 font-medium hover:underline"
              >
                + Dodaj ucznia
              </button>
            }
          />
        ) : (
          filtered.map((student) => {
            const isActive = filterStudentId === student.id;
            return (
              <div
                key={student.id}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  isActive ? 'bg-slate-50 shadow-soft' : 'hover:bg-slate-50'
                }`}
                onClick={() => setFilterStudent(isActive ? null : student.id)}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                  style={{ backgroundColor: student.color }}
                >
                  {student.name.charAt(0)}
                </div>

                {/* Name + tags */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">
                    {student.name}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {student.subjectTags.slice(0, 2).join(', ') || '—'}
                  </div>
                </div>

                {/* Right side: lesson count + edit button */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Edit button — shown on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // don't trigger the filter
                      openModal('editStudent', { studentId: student.id });
                    }}
                    className="hidden group-hover:flex items-center justify-center w-6 h-6 rounded-lg hover:bg-indigo-100 hover:text-indigo-600 text-slate-400 transition-colors"
                    title={`Edytuj ${student.name}`}
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="text-xs text-slate-400">
          <span className="font-medium text-slate-600">{students.length}</span>{' '}
          uczniów ·{' '}
          <span className="font-medium text-slate-600">{events.length}</span>{' '}
          lekcji
        </div>
      </div>
    </aside>
  );
}
