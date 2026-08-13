import React, { useState } from 'react';
import { Student, PaymentStatus } from '../types';
import { 
  getCurrentMonthPaymentStatus, 
  getCurrentMonthYearKey, 
  formatMonthYearLabel, 
  formatCurrency,
  getStudentStatus,
  isStudentActive,
  isStudentStandby 
} from '../utils/helpers';
import { 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Calendar, 
  FileText, 
  Send,
  CreditCard,
  Edit2,
  MessageCircle,
  PauseCircle,
  ShieldCheck,
  Users
} from 'lucide-react';

interface PaymentTrackerViewProps {
  students: Student[];
  onRecordPayment: (
    studentId: string,
    paymentData: {
      monthYear: string;
      amount: number;
      status: PaymentStatus;
      paidDate?: string;
      method?: 'Bank Transfer' | 'Cash' | 'PayPal' | 'Credit Card' | 'Pix' | 'Other';
      notes?: string;
    }
  ) => void;
  onSelectStudent: (student: Student) => void;
  onOpenWhatsApp?: (student: Student, template?: 'payment' | 'schedule' | 'homework') => void;
}

export const PaymentTrackerView: React.FC<PaymentTrackerViewProps> = ({
  students,
  onRecordPayment,
  onSelectStudent,
  onOpenWhatsApp,
}) => {
  const currentMonthKey = getCurrentMonthYearKey();
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'active' | 'standby' | 'all'>('active');

  // Modal or inline payment editor
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer' | 'Cash' | 'PayPal' | 'Credit Card' | 'Pix' | 'Other'>('Bank Transfer');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Segregate students
  const activeStudents = students.filter((s) => isStudentActive(s));
  const standbyStudents = students.filter((s) => isStudentStandby(s));
  const displayedStudents = students.filter((s) => {
    if (studentStatusFilter === 'active') return isStudentActive(s);
    if (studentStatusFilter === 'standby') return isStudentStandby(s);
    return getStudentStatus(s) !== 'inactive';
  });

  // Income metrics calculation (only based on active regular students)
  let totalPotential = 0;
  let totalCollected = 0;
  let totalOverdue = 0;
  let totalPending = 0;

  activeStudents.forEach((std) => {
    totalPotential += std.monthlyFee;
    const paymentInfo = getCurrentMonthPaymentStatus(std);
    if (paymentInfo.status === 'paid') {
      totalCollected += std.monthlyFee;
    } else if (paymentInfo.status === 'overdue') {
      totalOverdue += std.monthlyFee;
    } else {
      totalPending += std.monthlyFee;
    }
  });

  const handleOpenEditPayment = (student: Student) => {
    const paymentInfo = getCurrentMonthPaymentStatus(student);
    setEditingStudent(student);
    setPaymentAmount(student.monthlyFee);
    setPaymentStatus(paymentInfo.status === 'overdue' ? 'paid' : paymentInfo.status);
    setPaymentMethod(paymentInfo.record?.method || 'Bank Transfer');
    setPaymentNotes(paymentInfo.record?.notes || '');
  };

  const handleSavePayment = () => {
    if (!editingStudent) return;
    onRecordPayment(editingStudent.id, {
      monthYear: selectedMonthKey,
      amount: paymentAmount,
      status: paymentStatus,
      paidDate: paymentStatus === 'paid' ? new Date().toISOString() : undefined,
      method: paymentMethod,
      notes: paymentNotes,
    });
    setEditingStudent(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Monthly Financial Overview Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Monthly Tuition & Payment Control
            </h2>
            <p className="text-xs text-slate-500">
              Track when and how much each student paid for {formatMonthYearLabel(selectedMonthKey)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Billing Cycle:</span>
            <input
              type="month"
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Progress Bar & Financial Counters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/60">
            <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <span>Collected Income</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-1">
              {formatCurrency(totalCollected)}
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
              Out of {formatCurrency(totalPotential)} total expected
            </p>
          </div>

          <div className="bg-rose-50/60 dark:bg-rose-950/40 p-4 rounded-xl border border-rose-100 dark:border-rose-900/60">
            <div className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center justify-between">
              <span>Overdue Payments</span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-extrabold text-rose-900 dark:text-rose-200 mt-1">
              {formatCurrency(totalOverdue)}
            </p>
            <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
              Past due date of current month
            </p>
          </div>

          <div className="bg-amber-50/60 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-100 dark:border-amber-900/60">
            <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <span>Pending / Due Soon</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-extrabold text-amber-900 dark:text-amber-200 mt-1">
              {formatCurrency(totalPending)}
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
              Upcoming payments within due date
            </p>
          </div>

        </div>

      </div>

      {/* Main Payment Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Student Monthly Payment Status
            </h3>
            
            {/* Status Filter Pills */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setStudentStatusFilter('active')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  studentStatusFilter === 'active'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                🟢 Ativos ({activeStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setStudentStatusFilter('standby')}
                className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                  studentStatusFilter === 'standby'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <PauseCircle className="w-3.5 h-3.5" />
                Stand By ({standbyStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setStudentStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  studentStatusFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                Todos ({activeStudents.length + standbyStudents.length})
              </button>
            </div>
          </div>

          <span className="text-xs text-slate-500 italic">
            Histórico de pagamentos mantido para todos os alunos
          </span>
        </div>

        {studentStatusFilter === 'standby' && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 p-3 px-4 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Alunos em pausa não geram cobranças automáticas ativas, mas <strong>todos os pagamentos já efetuados continuam salvos e acessíveis no histórico</strong>.</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Monthly Fee</th>
                <th className="py-3 px-4">Due Day of Month</th>
                <th className="py-3 px-4">Status ({formatMonthYearLabel(selectedMonthKey)})</th>
                <th className="py-3 px-4">Paid Date & Method</th>
                <th className="py-3 px-4">Payment Notes / Histórico</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhum aluno encontrado nesta categoria.
                  </td>
                </tr>
              ) : (
                displayedStudents.map((student) => {
                  const isStandby = isStudentStandby(student);
                  const paymentInfo = getCurrentMonthPaymentStatus(student);
                  const totalPaidRecords = (student.paymentHistory || []).filter((p) => p.status === 'paid').length;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                      onClick={() => onSelectStudent(student)}
                    >
                      {/* Student Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{student.name}</span>
                          {isStandby && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500 text-white flex items-center gap-1">
                              <PauseCircle className="w-3 h-3" />
                              Stand By
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">{student.email}</div>
                      </td>

                      {/* Monthly Fee */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {formatCurrency(student.monthlyFee, student.currencySymbol)}
                      </td>

                      {/* Due Day */}
                      <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-300">
                        Day {student.dueDayOfMonth || 5} of month
                      </td>

                      {/* Status Pill */}
                      <td className="py-3.5 px-4">
                        {isStandby ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <PauseCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>EM PAUSA (STAND BY)</span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                            paymentInfo.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : paymentInfo.status === 'overdue'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {paymentInfo.status === 'paid' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {paymentInfo.status === 'overdue' && <AlertCircle className="w-3.5 h-3.5" />}
                            {paymentInfo.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                            <span>{paymentInfo.status.toUpperCase()}</span>
                          </span>
                        )}
                      </td>

                      {/* Paid Date & Method */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {paymentInfo.record?.paidDate ? (
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {new Date(paymentInfo.record.paidDate).toLocaleDateString()}
                            </div>
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400">
                              {paymentInfo.record.method || 'Direct'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            {isStandby ? 'Pausado este mês' : 'Not recorded yet'}
                          </span>
                        )}
                      </td>

                      {/* Notes & History indicator */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-[200px]">
                        {paymentInfo.record?.notes ? (
                          <span className="truncate block">{paymentInfo.record.notes}</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {totalPaidRecords} {totalPaidRecords === 1 ? 'pagamento salvo' : 'pagamentos salvos'}
                          </span>
                        )}
                      </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        {onOpenWhatsApp && (
                          <button
                            onClick={() => onOpenWhatsApp(student, 'payment')}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1"
                            title="Enviar cobrança / lembrete no WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-current" />
                            <span>Cobrança</span>
                          </button>
                        )}

                        {paymentInfo.status !== 'paid' ? (
                          <button
                            onClick={() => {
                              onRecordPayment(student.id, {
                                monthYear: selectedMonthKey,
                                amount: student.monthlyFee,
                                status: 'paid',
                                paidDate: new Date().toISOString(),
                                method: 'Bank Transfer',
                                notes: 'Marked as paid',
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Paid</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenEditPayment(student)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Edit Payment Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Payment Record: {editingStudent.name}
              </h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Month / Billing Period
                </label>
                <input
                  type="text"
                  disabled
                  value={formatMonthYearLabel(selectedMonthKey)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Amount ({editingStudent.currencySymbol})
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-semibold text-slate-900 dark:text-white"
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Pix">Pix / Instant Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Payment Notes / Receipt ID
                </label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Paid via direct transfer. Sent WhatsApp receipt."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t dark:border-slate-800">
              <button
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePayment}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Save Payment Record
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
