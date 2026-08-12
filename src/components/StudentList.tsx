import React, { useState, useMemo } from 'react';
import { Student, FilterLevel, FilterPayment, FilterDay, EnglishLevel, DayOfWeek } from '../types';
import { StudentCard } from './StudentCard';
import { StudentAvatar } from './StudentAvatar';
import { CEFR_LEVELS, getCurrentMonthPaymentStatus, formatCurrency } from '../utils/helpers';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  LayoutGrid, 
  List, 
  UserPlus, 
  BookOpen, 
  DollarSign, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  Printer
} from 'lucide-react';

interface StudentListProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onQuickLogClass: (student: Student) => void;
  onQuickRecordPayment: (student: Student) => void;
  onOpenAddStudent: () => void;
  onOpenWhatsApp?: (student: Student) => void;
  onOpenReport?: (student: Student) => void;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  onSelectStudent,
  onQuickLogClass,
  onQuickRecordPayment,
  onOpenAddStudent,
  onOpenWhatsApp,
  onOpenReport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<FilterLevel>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<FilterPayment>('ALL');
  const [selectedDay, setSelectedDay] = useState<FilterDay>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'classNumber' | 'level' | 'fee'>('name');
  const [viewStyle, setViewStyle] = useState<'grid' | 'table'>('grid');

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Active check
      if (!student.active) return false;

      // Search match
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const nameMatch = student.name.toLowerCase().includes(query);
        const goalMatch = student.targetGoal?.toLowerCase().includes(query);
        const noteMatch = (student.notes || []).some(
          (n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
        );
        const topicMatch = (student.classLogs || []).some((l) => l.topic?.toLowerCase().includes(query));
        if (!nameMatch && !goalMatch && !noteMatch && !topicMatch) return false;
      }

      // Level match
      if (selectedLevel !== 'ALL' && student.englishLevel !== selectedLevel) {
        return false;
      }

      // Payment match
      if (selectedPayment !== 'ALL') {
        const paymentInfo = getCurrentMonthPaymentStatus(student);
        if (paymentInfo.status !== selectedPayment) return false;
      }

      // Day match
      if (selectedDay !== 'ALL') {
        const hasDay = student.schedules.some((s) => s.day === selectedDay);
        if (!hasDay) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'classNumber') return b.currentClassNumber - a.currentClassNumber;
      if (sortBy === 'fee') return b.monthlyFee - a.monthlyFee;
      if (sortBy === 'level') return b.englishLevel.localeCompare(a.englishLevel);
      return 0;
    });
  }, [students, searchTerm, selectedLevel, selectedPayment, selectedDay, sortBy]);

  return (
    <div className="space-y-4">
      
      {/* Search & Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        
        {/* Top Row: Search & View Toggles */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name, English goal, topic, or note..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort & Grid/Table switch */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-500 dark:text-slate-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent font-semibold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
              >
                <option value="name">Name (A-Z)</option>
                <option value="classNumber">Highest Class #</option>
                <option value="fee">Monthly Fee</option>
                <option value="level">English Level</option>
              </select>
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                onClick={() => setViewStyle('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewStyle === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewStyle('table')}
                className={`p-1.5 rounded-lg transition ${
                  viewStyle === 'table'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Table Compact View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Filter Pills Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          
          <span className="text-slate-500 font-medium flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter by:
          </span>

          {/* Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as FilterLevel)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1 font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Levels (CEFR)</option>
            <option value="A1">A1 Beginner</option>
            <option value="A2">A2 Elementary</option>
            <option value="B1">B1 Intermediate</option>
            <option value="B2">B2 Upper-Inter</option>
            <option value="C1">C1 Advanced</option>
            <option value="C2">C2 Proficient</option>
          </select>

          {/* Payment Filter */}
          <select
            value={selectedPayment}
            onChange={(e) => setSelectedPayment(e.target.value as FilterPayment)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1 font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>

          {/* Day Filter */}
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value as FilterDay)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1 font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Schedule Days</option>
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
            <option value="Saturday">Saturday</option>
            <option value="Sunday">Sunday</option>
          </select>

          {/* Clear Filters reset if active */}
          {(selectedLevel !== 'ALL' || selectedPayment !== 'ALL' || selectedDay !== 'ALL' || searchTerm !== '') && (
            <button
              onClick={() => {
                setSelectedLevel('ALL');
                setSelectedPayment('ALL');
                setSelectedDay('ALL');
                setSearchTerm('');
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline ml-auto"
            >
              Reset Filters
            </button>
          )}

        </div>

      </div>

      {/* Main Student Roster Display */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto">
            <UserPlus className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No students match your criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms, level filters, or click below to add a new English student.
          </p>
          <button
            onClick={onOpenAddStudent}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Student</span>
          </button>
        </div>
      ) : viewStyle === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onSelectStudent={onSelectStudent}
              onQuickLogClass={onQuickLogClass}
              onQuickRecordPayment={onQuickRecordPayment}
              onOpenWhatsApp={onOpenWhatsApp}
              onOpenReport={onOpenReport}
            />
          ))}
        </div>
      ) : (
        /* Table Compact View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Class Counter</th>
                  <th className="py-3 px-4">Schedule Days & Hours</th>
                  <th className="py-3 px-4">Monthly Fee & Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                {filteredStudents.map((student) => {
                  const levelInfo = CEFR_LEVELS[student.englishLevel] || CEFR_LEVELS.B1;
                  const paymentInfo = getCurrentMonthPaymentStatus(student);

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                      onClick={() => onSelectStudent(student)}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-2.5">
                          <StudentAvatar name={student.name} avatarUrl={student.avatarUrl} className="w-8 h-8 rounded-lg text-xs" />
                          <div>
                            <div>{student.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {student.targetGoal || 'General English'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${levelInfo.badgeBg} ${levelInfo.border}`}>
                          {levelInfo.code}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                        Class #{student.currentClassNumber}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {student.schedules.map((s) => (
                            <span key={s.id} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[10px]">
                              {s.day.slice(0, 3)} {s.startTime}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{formatCurrency(student.monthlyFee, student.currencySymbol)}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            paymentInfo.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : paymentInfo.status === 'overdue'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {paymentInfo.status.toUpperCase()}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1">
                          {onOpenWhatsApp && (
                            <button
                              onClick={() => onOpenWhatsApp(student)}
                              className="p-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-md font-semibold text-[11px] hover:bg-emerald-100"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onOpenReport && (
                            <button
                              onClick={() => onOpenReport(student)}
                              className="p-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-md font-semibold text-[11px] hover:bg-indigo-100"
                              title="Relatório PDF"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onQuickLogClass(student)}
                            className="px-2 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-md font-semibold text-[11px] hover:bg-indigo-100"
                          >
                            + Log Class
                          </button>
                          <button
                            onClick={() => onQuickRecordPayment(student)}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-md font-semibold text-[11px] hover:bg-emerald-100"
                          >
                            Pay
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
