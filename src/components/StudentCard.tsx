import React from 'react';
import { Student } from '../types';
import { StudentAvatar } from './StudentAvatar';
import { 
  CEFR_LEVELS, 
  getCurrentMonthPaymentStatus, 
  formatCurrency, 
  getNextClassInfo
} from '../utils/helpers';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  BookOpen,
  ChevronRight,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Printer
} from 'lucide-react';

interface StudentCardProps {
  student: Student;
  onSelectStudent: (student: Student) => void;
  onQuickLogClass: (student: Student) => void;
  onQuickRecordPayment: (student: Student) => void;
  onOpenWhatsApp?: (student: Student) => void;
  onOpenReport?: (student: Student) => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  onSelectStudent,
  onQuickLogClass,
  onQuickRecordPayment,
  onOpenWhatsApp,
  onOpenReport,
}) => {
  const levelInfo = CEFR_LEVELS[student.englishLevel] || CEFR_LEVELS.B1;
  const paymentInfo = getCurrentMonthPaymentStatus(student);
  const nextClass = getNextClassInfo(student);

  // Recent pinned or top note
  const topNote = student.notes.find((n) => n.pinned) || student.notes[0];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      
      {/* Top Header Section */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800/80">
        
        <div className="flex items-start justify-between gap-3">
          {/* Avatar & Info */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectStudent(student)}>
            <StudentAvatar name={student.name} avatarUrl={student.avatarUrl} className="w-12 h-12 rounded-xl" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center gap-1.5 text-base">
                {student.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                {student.targetGoal || 'General English Practice'}
              </p>
            </div>
          </div>

          {/* Level Badge & Action Buttons */}
          <div className="flex items-center gap-1.5">
            {onOpenWhatsApp && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenWhatsApp(student);
                }}
                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200/80 dark:border-emerald-800 transition"
                title="Enviar Lembrete no WhatsApp"
              >
                <MessageCircle className="w-4 h-4 fill-emerald-600/20" />
              </button>
            )}

            {onOpenReport && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenReport(student);
                }}
                className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200/80 dark:border-indigo-800 transition"
                title="Gerar Relatório em PDF / Feedback"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}

            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${levelInfo.badgeBg} ${levelInfo.border}`}>
              {levelInfo.code}
            </span>
          </div>
        </div>

        {/* Schedule & Hours Row */}
        <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Class Schedule:
            </span>
            {nextClass && (
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">
                Next: {nextClass.formattedText}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {student.schedules.length > 0 ? (
              student.schedules.map((slot) => (
                <span
                  key={slot.id}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                >
                  <Clock className="w-3 h-3 text-slate-400" />
                  {slot.day.slice(0, 3)} {slot.startTime} - {slot.endTime}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No scheduled time set</span>
            )}
          </div>
        </div>

        {/* Key Student Metrics: Class Counter & Payment Status */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-1">
          
          {/* Class Session Counter */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl p-2.5 border border-indigo-100/80 dark:border-indigo-900/40">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              Current Session
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
              Class #{student.currentClassNumber}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {student.classLogs.length > 0 ? `${student.classLogs.length} logged history` : 'Starting new series'}
            </div>
          </div>

          {/* Monthly Payment Status */}
          <div className={`rounded-xl p-2.5 border ${
            paymentInfo.status === 'paid'
              ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-100/80 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
              : paymentInfo.status === 'overdue'
              ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-100/80 dark:border-rose-900/40 text-rose-800 dark:text-rose-300'
              : 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-100/80 dark:border-amber-900/40 text-amber-800 dark:text-amber-300'
          }`}>
            <div className="text-[10px] uppercase tracking-wider font-semibold flex items-center justify-between">
              <span>Monthly Fee</span>
              <span className="font-bold">{formatCurrency(student.monthlyFee, student.currencySymbol)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold mt-1">
              {paymentInfo.status === 'paid' && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Paid for {new Date().toLocaleDateString('en-US', { month: 'short' })}</span>
                </>
              )}
              {paymentInfo.status === 'overdue' && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Overdue ({paymentInfo.dueDateStr})</span>
                </>
              )}
              {paymentInfo.status === 'pending' && (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Due {paymentInfo.dueDateStr}</span>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Notes preview if available */}
        {topNote && (
          <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
            <p className="line-clamp-2 italic text-[11px]">
              <strong className="not-italic font-semibold text-slate-700 dark:text-slate-300">{topNote.title}:</strong> {topNote.content}
            </p>
          </div>
        )}

      </div>

      {/* Card Action Footer */}
      <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
        
        <div className="flex items-center gap-1.5">
          {/* Quick Log Class */}
          <button
            onClick={() => onQuickLogClass(student)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200/80 dark:border-indigo-800 transition flex items-center gap-1"
            title="Increase class count and log lesson topic"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Class #{student.currentClassNumber + 1}</span>
          </button>

          {/* Quick Payment Record */}
          <button
            onClick={() => onQuickRecordPayment(student)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200/80 dark:border-emerald-800 transition flex items-center gap-1"
            title="Mark or update payment"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Pay</span>
          </button>
        </div>

        {/* View Full Student Profile & Notes */}
        <button
          onClick={() => onSelectStudent(student)}
          className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-0.5 transition py-1"
        >
          <span>Manage Notes & Profile</span>
          <ChevronRight className="w-4 h-4" />
        </button>

      </div>

    </div>
  );
};
