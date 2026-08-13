import React from 'react';
import { Student } from '../types';
import { getCurrentMonthPaymentStatus, formatCurrency, getNextClassInfo, isStudentActive, isStudentStandby } from '../utils/helpers';
import { Users, DollarSign, Award, CalendarCheck, AlertCircle, PauseCircle } from 'lucide-react';

interface StatsCardsProps {
  students: Student[];
  onSelectPaymentFilter?: (filter: 'paid' | 'pending' | 'overdue') => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ students, onSelectPaymentFilter }) => {
  const activeStudents = students.filter((s) => isStudentActive(s));
  const standbyStudentsCount = students.filter((s) => isStudentStandby(s)).length;
  const totalStudents = activeStudents.length;

  let totalMonthlyPotential = 0;
  let totalCollected = 0;
  let countPaid = 0;
  let countPending = 0;
  let countOverdue = 0;

  let totalClassesTaughtAllTime = 0;

  // Find today's classes
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  let todayClassesCount = 0;

  activeStudents.forEach((student) => {
    totalMonthlyPotential += student.monthlyFee;
    totalClassesTaughtAllTime += student.currentClassNumber;

    const paymentInfo = getCurrentMonthPaymentStatus(student);
    if (paymentInfo.status === 'paid') {
      countPaid += 1;
      totalCollected += student.monthlyFee;
    } else if (paymentInfo.status === 'overdue') {
      countOverdue += 1;
    } else {
      countPending += 1;
    }

    if (student.schedules.some((sch) => sch.day === todayDayName)) {
      todayClassesCount += 1;
    }
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* 1. Active Students */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Students</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalStudents}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            {standbyStudentsCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {standbyStudentsCount} em stand by
              </span>
            ) : (
              'Active enrollment'
            )}
          </p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <Users className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Today's Schedule */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Today's Schedule ({todayDayName.slice(0, 3)})</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {todayClassesCount} {todayClassesCount === 1 ? 'Class' : 'Classes'}
          </p>
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">
            {todayClassesCount > 0 ? 'Ready for today' : 'No classes scheduled today'}
          </p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <CalendarCheck className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Monthly Payment Control */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Revenue</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(totalCollected)}
            </p>
            <span className="text-xs text-slate-400">/ {formatCurrency(totalMonthlyPotential)}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] mt-1">
            <button
              onClick={() => onSelectPaymentFilter?.('paid')}
              className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
            >
              {countPaid} Paid
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              onClick={() => onSelectPaymentFilter?.('overdue')}
              className={`font-semibold hover:underline ${
                countOverdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
              }`}
            >
              {countOverdue} Overdue
            </button>
          </div>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
          countOverdue > 0
            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
        }`}>
          {countOverdue > 0 ? <AlertCircle className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
        </div>
      </div>

      {/* 4. Payment Deadline */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Prazo de Pagamento</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Até Dia 08
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
            Vencimento do mês atual
          </p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <CalendarCheck className="w-5 h-5" />
        </div>
      </div>

    </div>
  );
};
