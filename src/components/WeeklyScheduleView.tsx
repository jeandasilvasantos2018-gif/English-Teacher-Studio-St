import React, { useState, useMemo } from 'react';
import { Student, DayOfWeek } from '../types';
import { DAYS_ORDER, CEFR_LEVELS, isStudentActive } from '../utils/helpers';
import { Calendar, Clock, Video, Plus, CheckCircle2, Filter, Search, X, CalendarCheck } from 'lucide-react';

interface WeeklyScheduleViewProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onQuickLogClass: (student: Student) => void;
  onOpenAddStudent: () => void;
  onOpenAvailability?: () => void;
}

export const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = ({
  students,
  onSelectStudent,
  onQuickLogClass,
  onOpenAddStudent,
  onOpenAvailability,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeStudents = useMemo(() => students.filter((s) => isStudentActive(s)), [students]);

  // Map out schedule slots grouped by day with active filters applied
  const dayScheduleMap = useMemo(() => {
    const map: Record<DayOfWeek, Array<{ student: Student; slot: Student['schedules'][0] }>> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: [],
    };

    students.forEach((student) => {
      if (!isStudentActive(student)) return;

      // Filter by Student ID
      if (selectedStudentId !== 'all' && student.id !== selectedStudentId) return;

      // Filter by Level
      if (selectedLevel !== 'all' && student.englishLevel !== selectedLevel) return;

      // Filter by Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = student.name.toLowerCase().includes(query);
        const goalMatch = student.targetGoal?.toLowerCase().includes(query);
        if (!nameMatch && !goalMatch) return;
      }

      student.schedules.forEach((slot) => {
        // Filter by Day
        if (selectedDay !== 'all' && slot.day !== selectedDay) return;

        if (map[slot.day]) {
          map[slot.day].push({ student, slot });
        }
      });
    });

    // Sort slots by start time
    DAYS_ORDER.forEach((day) => {
      map[day].sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
    });

    return map;
  }, [students, selectedStudentId, selectedDay, selectedLevel, searchQuery]);

  const activeFilterCount =
    (selectedStudentId !== 'all' ? 1 : 0) +
    (selectedDay !== 'all' ? 1 : 0) +
    (selectedLevel !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const handleClearFilters = () => {
    setSelectedStudentId('all');
    setSelectedDay('all');
    setSelectedLevel('all');
    setSearchQuery('');
  };

  const daysToDisplay = selectedDay !== 'all' ? DAYS_ORDER.filter((d) => d === selectedDay) : DAYS_ORDER;

  return (
    <div className="space-y-4">
      
      {/* Schedule Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Weekly Class Timetable</h2>
            <p className="text-xs text-slate-500">
              Controle os dias e horários das aulas da sua grade semanal de alunos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAvailability && (
            <button
              onClick={onOpenAvailability}
              className="px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>Verificar Horários Livres</span>
            </button>
          )}

          <button
            onClick={onOpenAddStudent}
            className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Class Slot</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Filtrar Horários</span>
            {activeFilterCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {activeFilterCount} {activeFilterCount === 1 ? 'filtro ativo' : 'filtros ativos'}
              </span>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar aluno por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white"
            />
          </div>

          {/* Student Filter */}
          <div>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white font-medium"
            >
              <option value="all">Todos os Alunos ({activeStudents.length})</option>
              {activeStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>

          {/* Day Filter */}
          <div>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white font-medium"
            >
              <option value="all">Todos os Dias da Semana</option>
              <option value="Monday">Segunda-feira (Seg)</option>
              <option value="Tuesday">Terça-feira (Ter)</option>
              <option value="Wednesday">Quarta-feira (Qua)</option>
              <option value="Thursday">Quinta-feira (Qui)</option>
              <option value="Friday">Sexta-feira (Sex)</option>
              <option value="Saturday">Sábado (Sáb)</option>
              <option value="Sunday">Domingo (Dom)</option>
            </select>
          </div>

          {/* English Level Filter */}
          <div>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white font-medium"
            >
              <option value="all">Todos os Níveis</option>
              {Object.entries(CEFR_LEVELS).map(([code, info]) => (
                <option key={code} value={code}>
                  {code} - {info.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Weekly Grid Columns */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${daysToDisplay.length === 1 ? 'lg:grid-cols-1 max-w-xl mx-auto' : 'lg:grid-cols-7'} gap-3`}>
        {daysToDisplay.map((day) => {
          const classes = dayScheduleMap[day];
          const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;

          return (
            <div
              key={day}
              className={`bg-white dark:bg-slate-900 rounded-2xl border flex flex-col transition-all ${
                isToday
                  ? 'border-indigo-500/80 ring-2 ring-indigo-500/10 shadow-sm'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {/* Day Header */}
              <div className={`p-3 border-b text-center rounded-t-2xl font-bold text-xs flex items-center justify-between ${
                isToday
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-slate-100 dark:border-slate-800'
              }`}>
                <span>{day}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isToday ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {classes.length}
                </span>
              </div>

              {/* Day Class Cards */}
              <div className="p-2 space-y-2 flex-1 min-h-[220px]">
                {classes.length === 0 ? (
                  <div className="h-full flex items-center justify-center p-4 text-center">
                    <p className="text-[11px] text-slate-400 italic">No classes scheduled</p>
                  </div>
                ) : (
                  classes.map(({ student, slot }) => {
                    const levelInfo = CEFR_LEVELS[student.englishLevel] || CEFR_LEVELS.B1;

                    return (
                      <div
                        key={`${student.id}-${slot.id}`}
                        onClick={() => onSelectStudent(student)}
                        className="bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition group cursor-pointer space-y-1.5"
                      >
                        {/* Hours & Level */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-500" />
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${levelInfo.badgeBg}`}>
                            {levelInfo.code}
                          </span>
                        </div>

                        {/* Student Name */}
                        <div className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                          {student.name}
                        </div>

                        {/* Class session counter */}
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between pt-0.5">
                          <span>Class #{student.currentClassNumber}</span>
                          {slot.locationUrl && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <Video className="w-2.5 h-2.5 text-blue-500" />
                              {slot.locationUrl}
                            </span>
                          )}
                        </div>

                        {/* Quick Log button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickLogClass(student);
                          }}
                          className="w-full mt-1.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-lg transition flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Log Class #{student.currentClassNumber + 1}</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
