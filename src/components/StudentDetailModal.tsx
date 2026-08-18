import React, { useState } from 'react';
import { Student, ClassScheduleSlot, EnglishLevel, DayOfWeek, PaymentStatus, ClassSessionLog, StudentStatus } from '../types';
import { updateClassLogForStudent, deleteClassLogForStudent, loadStudents } from '../utils/storage';
import { StudentAvatar } from './StudentAvatar';
import { 
  CEFR_LEVELS, 
  DAYS_ORDER, 
  getCurrentMonthPaymentStatus, 
  formatCurrency, 
  getInitials, 
  formatMonthYearLabel,
  getStudentStatus,
  isStudentStandby 
} from '../utils/helpers';
import { 
  X, 
  Calendar, 
  Clock, 
  DollarSign, 
  BookOpen, 
  FileText, 
  Plus, 
  Trash2, 
  Pin, 
  CheckCircle2, 
  AlertCircle, 
  Award, 
  Edit3, 
  Save, 
  Video, 
  Mail, 
  Phone, 
  Target,
  PlusCircle,
  History,
  MessageCircle,
  Printer,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Info
} from 'lucide-react';

interface StudentDetailModalProps {
  student: Student | null;
  onClose: () => void;
  onUpdateStudent: (updatedStudent: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onQuickLogClass: (student: Student) => void;
  onOpenWhatsApp?: (student: Student, template?: 'payment' | 'schedule' | 'homework') => void;
  onOpenReport?: (student: Student) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  onClose,
  onUpdateStudent,
  onDeleteStudent,
  onQuickLogClass,
  onOpenWhatsApp,
  onOpenReport,
}) => {
  if (!student) return null;

  const [activeTab, setActiveTab] = useState<'schedule' | 'payments' | 'classes' | 'level' | 'notes'>('schedule');

  // Local state for editing basic student profile
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [name, setName] = useState(student.name);
  const [email, setEmail] = useState(student.email);
  const [phone, setPhone] = useState(student.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(student.avatarUrl || '');
  const [targetGoal, setTargetGoal] = useState(student.targetGoal || '');
  const [englishLevel, setEnglishLevel] = useState<EnglishLevel>(student.englishLevel);
  const [monthlyFee, setMonthlyFee] = useState<number>(student.monthlyFee);
  const [currencySymbol, setCurrencySymbol] = useState<string>(student.currencySymbol || '$');
  const [dueDayOfMonth, setDueDayOfMonth] = useState<number>(student.dueDayOfMonth || 5);
  const [currentClassNumber, setCurrentClassNumber] = useState<number>(student.currentClassNumber);
  const [active, setActive] = useState<boolean>(student.active ?? true);
  const [status, setStatus] = useState<StudentStatus>(getStudentStatus(student));
  const [standbyReason, setStandbyReason] = useState<string>(student.standbyReason || '');

  React.useEffect(() => {
    if (student) {
      setName(student.name);
      setEmail(student.email);
      setPhone(student.phone || '');
      setAvatarUrl(student.avatarUrl || '');
      setTargetGoal(student.targetGoal || '');
      setEnglishLevel(student.englishLevel);
      setMonthlyFee(student.monthlyFee);
      setCurrencySymbol(student.currencySymbol || '$');
      setDueDayOfMonth(student.dueDayOfMonth || 5);
      setCurrentClassNumber(student.currentClassNumber);
      const studentStatus = getStudentStatus(student);
      setStatus(studentStatus);
      setActive(studentStatus === 'active');
      setStandbyReason(student.standbyReason || '');
      setSchedules(student.schedules || []);
      setIsEditingProfile(false);
    }
  }, [student?.id]);

  // Local state for schedules
  const [schedules, setSchedules] = useState<ClassScheduleSlot[]>(student.schedules || []);
  const [newDay, setNewDay] = useState<DayOfWeek>('Monday');
  const [newStartTime, setNewStartTime] = useState('14:00');
  const [newEndTime, setNewEndTime] = useState('15:00');
  const [newLocation, setNewLocation] = useState('Google Meet');

  // Local state for creating a new note
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<'lesson' | 'homework' | 'grammar' | 'general' | 'reminder'>('lesson');

  // Local state for deletion confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Local state for Class Log Edit & Delete
  const [editingClassLog, setEditingClassLog] = useState<ClassSessionLog | null>(null);
  const [editClassNumber, setEditClassNumber] = useState<number>(1);
  const [editDate, setEditDate] = useState<string>('');
  const [editDurationMinutes, setEditDurationMinutes] = useState<number>(60);
  const [editTopic, setEditTopic] = useState<string>('');
  const [editGrammarFocus, setEditGrammarFocus] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editHomeworkAssigned, setEditHomeworkAssigned] = useState<string>('');
  const [editAttended, setEditAttended] = useState<boolean>(true);
  const [isSubmittingLogEdit, setIsSubmittingLogEdit] = useState(false);
  const [logEditError, setLogEditError] = useState<string | null>(null);

  const [deletingClassLog, setDeletingClassLog] = useState<ClassSessionLog | null>(null);
  const [isSubmittingLogDelete, setIsSubmittingLogDelete] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const handleStartEditClassLog = (log: ClassSessionLog) => {
    setEditingClassLog(log);
    setEditClassNumber(log.classNumber);

    let formattedDate = '';
    if (log.date) {
      const d = new Date(log.date);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toISOString().split('T')[0];
      }
    }
    if (!formattedDate) {
      formattedDate = new Date().toISOString().split('T')[0];
    }

    setEditDate(formattedDate);
    setEditDurationMinutes(log.durationMinutes || 60);
    setEditTopic(log.topic || '');
    setEditGrammarFocus(log.grammarFocus || '');
    setEditNotes(log.notes || '');
    setEditHomeworkAssigned(log.homeworkAssigned || '');
    setEditAttended(log.attended ?? true);
    setLogEditError(null);
  };

  const handleCancelEditClassLog = () => {
    setEditingClassLog(null);
    setLogEditError(null);
  };

  const handleSaveClassLogEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassLog) return;

    if (!editTopic.trim()) {
      setLogEditError('Topic Covered cannot be empty.');
      return;
    }

    if (!editClassNumber || editClassNumber <= 0) {
      setLogEditError('Class Number must be a positive number.');
      return;
    }

    if (!editDurationMinutes || editDurationMinutes <= 0) {
      setLogEditError('Duration must be greater than zero.');
      return;
    }

    if (!editDate) {
      setLogEditError('Please select a valid date.');
      return;
    }

    setIsSubmittingLogEdit(true);

    try {
      const currentStudents = loadStudents();
      const isoDate = new Date(`${editDate}T12:00:00`).toISOString();

      const updatedStudents = updateClassLogForStudent(currentStudents, student.id, editingClassLog.id, {
        classNumber: editClassNumber,
        date: isoDate,
        durationMinutes: editDurationMinutes,
        topic: editTopic.trim(),
        grammarFocus: editGrammarFocus.trim() || undefined,
        notes: editNotes.trim() || undefined,
        homeworkAssigned: editHomeworkAssigned.trim() || undefined,
        attended: editAttended,
      });

      const updatedTarget = updatedStudents.find((s) => s.id === student.id);
      if (updatedTarget) {
        onUpdateStudent(updatedTarget);
      }

      setEditingClassLog(null);
      setActionSuccessMessage(`Class #${editClassNumber} updated successfully!`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error updating class log:', err);
      setLogEditError('Error saving changes. Please try again.');
    } finally {
      setIsSubmittingLogEdit(false);
    }
  };

  const handleConfirmDeleteClassLog = () => {
    if (!deletingClassLog) return;

    setIsSubmittingLogDelete(true);

    try {
      const currentStudents = loadStudents();
      const updatedStudents = deleteClassLogForStudent(currentStudents, student.id, deletingClassLog.id);

      const updatedTarget = updatedStudents.find((s) => s.id === student.id);
      if (updatedTarget) {
        onUpdateStudent(updatedTarget);
      }

      const logNum = deletingClassLog.classNumber;
      setDeletingClassLog(null);
      setActionSuccessMessage(`Class #${logNum} log removed successfully!`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error deleting class log:', err);
    } finally {
      setIsSubmittingLogDelete(false);
    }
  };

  const levelInfo = CEFR_LEVELS[student.englishLevel] || CEFR_LEVELS.B1;
  const paymentInfo = getCurrentMonthPaymentStatus(student);

  // Cancel editing profile
  const handleCancelEdit = () => {
    setName(student.name);
    setEmail(student.email);
    setPhone(student.phone || '');
    setAvatarUrl(student.avatarUrl || '');
    setTargetGoal(student.targetGoal || '');
    setEnglishLevel(student.englishLevel);
    setMonthlyFee(student.monthlyFee);
    setCurrencySymbol(student.currencySymbol || '$');
    setDueDayOfMonth(student.dueDayOfMonth || 5);
    setCurrentClassNumber(student.currentClassNumber);
    const studentStatus = getStudentStatus(student);
    setStatus(studentStatus);
    setActive(studentStatus === 'active');
    setStandbyReason(student.standbyReason || '');
    setIsEditingProfile(false);
  };

  // Quick 1-click Stand By toggle
  const handleToggleStandBy = () => {
    const isCurrentlyStandby = getStudentStatus(student) === 'standby';
    const newStatus: StudentStatus = isCurrentlyStandby ? 'active' : 'standby';
    setStatus(newStatus);
    setActive(newStatus === 'active');

    const updated: Student = {
      ...student,
      status: newStatus,
      active: newStatus === 'active',
      standbyReason: newStatus === 'standby' ? (standbyReason || 'Pausa temporária nas aulas') : undefined,
      standbyDate: newStatus === 'standby' ? new Date().toISOString() : undefined,
      // CRITICAL: Payment history is strictly preserved
      paymentHistory: [...(student.paymentHistory || [])],
    };

    onUpdateStudent(updated);
    setActionSuccessMessage(
      newStatus === 'standby'
        ? '⏸️ Aluno colocado em Stand By. Todo o histórico de pagamentos e aulas permanece 100% preservado!'
        : '🟢 Aluno reativado com sucesso! Aulas e horários retomados.'
    );
    setTimeout(() => setActionSuccessMessage(null), 5000);
  };

  // Save profile changes
  const handleSaveProfile = () => {
    onUpdateStudent({
      ...student,
      name,
      email,
      phone,
      avatarUrl: avatarUrl || undefined,
      targetGoal,
      englishLevel,
      monthlyFee,
      currencySymbol,
      dueDayOfMonth,
      currentClassNumber,
      status,
      active: status === 'active',
      standbyReason: status === 'standby' ? standbyReason : undefined,
      standbyDate: status === 'standby' ? (student.standbyDate || new Date().toISOString()) : undefined,
      schedules,
      // CRITICAL: Keep all payments completely intact
      paymentHistory: [...(student.paymentHistory || [])],
    });
    setIsEditingProfile(false);
    setActionSuccessMessage('Perfil do aluno atualizado com sucesso!');
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  // Add Schedule slot
  const handleAddScheduleSlot = () => {
    const slot: ClassScheduleSlot = {
      id: `sch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      day: newDay,
      startTime: newStartTime,
      endTime: newEndTime,
      locationUrl: newLocation,
    };
    const updated = [...schedules, slot];
    setSchedules(updated);
    onUpdateStudent({ ...student, schedules: updated });
    setActionSuccessMessage('Novo horário de aula adicionado com sucesso!');
    setTimeout(() => setActionSuccessMessage(null), 3000);
  };

  // Remove Schedule slot (robust with ID and index fallback)
  const handleRemoveScheduleSlot = (slotId?: string, index?: number) => {
    let updated: ClassScheduleSlot[];
    if (slotId && slotId.trim().length > 0) {
      updated = schedules.filter((s, idx) => s.id !== slotId && (index === undefined || idx !== index));
    } else if (typeof index === 'number') {
      updated = schedules.filter((_, idx) => idx !== index);
    } else {
      return;
    }
    setSchedules(updated);
    onUpdateStudent({ ...student, schedules: updated });
    setActionSuccessMessage('Horário de aula removido com sucesso!');
    setTimeout(() => setActionSuccessMessage(null), 3000);
  };

  // Add Note
  const handleAddNote = () => {
    if (!newNoteTitle.trim()) return;
    const note = {
      id: `note-${Date.now()}`,
      createdAt: new Date().toISOString(),
      category: newNoteCategory,
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      pinned: false,
    };
    const currentNotes = student.notes || [];
    const updatedNotes = [note, ...currentNotes];
    onUpdateStudent({ ...student, notes: updatedNotes });
    setNewNoteTitle('');
    setNewNoteContent('');
  };

  // Toggle Pin Note
  const handleTogglePin = (noteId: string) => {
    const currentNotes = student.notes || [];
    const updatedNotes = currentNotes.map((n) => (n.id === noteId ? { ...n, pinned: !n.pinned } : n));
    onUpdateStudent({ ...student, notes: updatedNotes });
  };

  // Delete Note
  const handleDeleteNote = (noteId: string) => {
    const currentNotes = student.notes || [];
    const targetNote = currentNotes.find((n) => n.id === noteId);
    let updatedNotes = currentNotes.filter((n) => n.id !== noteId);

    if (targetNote) {
      const normTitle = (targetNote.title || '').trim().toLowerCase();
      const normContent = (targetNote.content || '').trim().toLowerCase();
      updatedNotes = updatedNotes.filter((n) => {
        const t = (n.title || '').trim().toLowerCase();
        const c = (n.content || '').trim().toLowerCase();
        return !(t === normTitle && c === normContent);
      });
    }

    onUpdateStudent({ ...student, notes: updatedNotes });
  };

  // Toggle Payment Status
  const handleTogglePaymentStatus = (status: PaymentStatus) => {
    const currentKey = paymentInfo.record?.monthYear || new Date().toISOString().slice(0, 7);
    const existingIdx = student.paymentHistory.findIndex((p) => p.monthYear === currentKey);
    const updatedHistory = [...student.paymentHistory];

    const newRec = {
      id: existingIdx >= 0 ? student.paymentHistory[existingIdx].id : `pay-${Date.now()}`,
      monthYear: currentKey,
      amount: student.monthlyFee,
      status,
      paidDate: status === 'paid' ? new Date().toISOString() : undefined,
      method: 'Bank Transfer' as const,
      notes: status === 'paid' ? 'Marked as paid' : 'Pending payment',
    };

    if (existingIdx >= 0) {
      updatedHistory[existingIdx] = newRec;
    } else {
      updatedHistory.unshift(newRec);
    }

    onUpdateStudent({ ...student, paymentHistory: updatedHistory });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full my-auto border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Profile Summary */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            <div className="flex items-center space-x-4">
              <StudentAvatar name={student.name} avatarUrl={student.avatarUrl} className="w-16 h-16 rounded-2xl text-2xl" />

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight">{student.name}</h2>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold ${levelInfo.badgeBg}`}>
                    {levelInfo.code}
                  </span>
                  {getStudentStatus(student) === 'standby' && (
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-amber-500 text-white flex items-center gap-1 shadow-xs animate-pulse">
                      <PauseCircle className="w-3.5 h-3.5" />
                      Stand By
                    </span>
                  )}
                  {getStudentStatus(student) === 'inactive' && (
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-700 text-slate-300">
                      Inativo
                    </span>
                  )}
                </div>
                <p className="text-xs text-indigo-200 mt-0.5 flex items-center gap-2">
                  <Target className="w-3.5 h-3.5" />
                  {student.targetGoal || 'General English Proficiency'}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-2">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {student.email}
                  </span>
                  {student.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {student.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stat Pill & Action Buttons in Modal Header */}
            <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
              <button
                type="button"
                onClick={handleToggleStandBy}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md border ${
                  getStudentStatus(student) === 'standby'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500/30'
                    : 'bg-amber-600/90 hover:bg-amber-600 text-white border-amber-500/30'
                }`}
                title={
                  getStudentStatus(student) === 'standby'
                    ? 'Reativar aluno para aulas regulares'
                    : 'Colocar aluno em Stand By (pausa temporária mantendo todos os pagamentos salvos)'
                }
              >
                {getStudentStatus(student) === 'standby' ? (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    <span>Reativar Aluno</span>
                  </>
                ) : (
                  <>
                    <PauseCircle className="w-4 h-4" />
                    <span>Stand By (Pausa)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isEditingProfile) {
                    handleCancelEdit();
                  } else {
                    setIsEditingProfile(true);
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md border ${
                  isEditingProfile
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-400/30'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-400/30'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>{isEditingProfile ? 'Cancel Editing' : 'Edit Student'}</span>
              </button>

              {onOpenWhatsApp && (
                <button
                  type="button"
                  onClick={() => onOpenWhatsApp(student)}
                  className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>WhatsApp</span>
                </button>
              )}

              {onOpenReport && (
                <button
                  type="button"
                  onClick={() => onOpenReport(student)}
                  className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 backdrop-blur-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Relatório PDF</span>
                </button>
              )}

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center gap-4">
                <div>
                  <div className="text-[10px] text-indigo-200 uppercase font-semibold">Class Counter</div>
                  <div className="text-lg font-black text-white">Class #{student.currentClassNumber}</div>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <div className="text-[10px] text-indigo-200 uppercase font-semibold">Monthly Rate</div>
                  <div className="text-lg font-black text-white">
                    {formatCurrency(student.monthlyFee, student.currencySymbol)}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Action Success Toast / Message */}
        {actionSuccessMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-xs">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {actionSuccessMessage}
            </span>
            <button
              onClick={() => setActionSuccessMessage(null)}
              className="text-white/80 hover:text-white font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Informative Stand By Banner */}
        {getStudentStatus(student) === 'standby' && (
          <div className="bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-300/40 dark:border-amber-700/60 px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <PauseCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-sm flex items-center gap-2">
                  <span>Aluno em Stand By (Pausa das Aulas)</span>
                  {student.standbyDate && (
                    <span className="text-[11px] font-normal text-amber-700 dark:text-amber-400">
                      • Pausado em {new Date(student.standbyDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                  {student.standbyReason ? `Motivo informado: "${student.standbyReason}". ` : ''}
                  <strong>Garantia de integridade:</strong> todos os pagamentos já realizados, histórico de aulas e anotações continuam 100% preservados e disponíveis.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleStandBy}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs whitespace-nowrap self-end sm:self-auto shrink-0"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Reativar Aluno Agora</span>
            </button>
          </div>
        )}

        {/* Render Edit Profile Form if editing mode is active */}
        {isEditingProfile ? (
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Edit Student Profile</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Update basic student details, contact info, English level, tuition fee and active status.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Full Name */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Phone / WhatsApp */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+55 11 99999-9999"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Avatar URL */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Avatar URL (Photo link)
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* English Level */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    CEFR English Level
                  </label>
                  <select
                    value={englishLevel}
                    onChange={(e) => setEnglishLevel(e.target.value as EnglishLevel)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
                  >
                    {(Object.keys(CEFR_LEVELS) as EnglishLevel[]).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl} - {CEFR_LEVELS[lvl].name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Goal */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target English Goal
                  </label>
                  <input
                    type="text"
                    value={targetGoal}
                    onChange={(e) => setTargetGoal(e.target.value)}
                    placeholder="e.g. IELTS 7.5, Business Fluency"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Monthly Fee */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Fee Amount
                  </label>
                  <input
                    type="number"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Currency Symbol */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    placeholder="$"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Due Day Of Month */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Due Day of Month (1 - 31)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dueDayOfMonth}
                    onChange={(e) => setDueDayOfMonth(parseInt(e.target.value, 10) || 5)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Student Status */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Student Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => {
                      const newStat = e.target.value as StudentStatus;
                      setStatus(newStat);
                      setActive(newStat === 'active');
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  >
                    <option value="active">🟢 Active (Aulas Regulares)</option>
                    <option value="standby">⏸️ Stand By (Pausa / Férias)</option>
                    <option value="inactive">⚪ Inactive (Arquivado)</option>
                  </select>
                </div>

                {/* Stand By Reason & Payment preservation assurance */}
                {status === 'standby' && (
                  <div className="sm:col-span-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3.5 text-xs space-y-2">
                    <label className="block font-bold text-amber-900 dark:text-amber-200">
                      Motivo do Stand By / Pausa (Opcional)
                    </label>
                    <input
                      type="text"
                      value={standbyReason}
                      onChange={(e) => setStandbyReason(e.target.value)}
                      placeholder="Ex: Férias escolares, viagem de trabalho, pausa temporária de 1 mês..."
                      className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl p-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] pt-1">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Garantia: Ao colocar em Stand By, todo o histórico de pagamentos feitos permanece 100% salvo e seguro.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>

        {/* Modal Navigation Tabs */}
        <div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center gap-2 overflow-x-auto text-xs font-bold">
          
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Days & Hours ({schedules.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'payments'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Monthly Payments</span>
          </button>

          <button
            onClick={() => setActiveTab('classes')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'classes'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Class Logs (#{student.currentClassNumber})</span>
          </button>

          <button
            onClick={() => setActiveTab('level')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'level'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>CEFR Level & Goals</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'notes'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Student Notes ({(student.notes || []).length})</span>
          </button>

        </div>

        {/* Modal Tab Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: SCHEDULE CONTROL (Days & Hours) */}
          {activeTab === 'schedule' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Weekly Days & Hours Control
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set recurring days of the week and exact lesson hours for {student.name}.
                  </p>
                </div>
              </div>

              {/* List of current scheduled times */}
              {schedules.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                  <p className="font-semibold">Nenhum horário cadastrado para este aluno.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Use o formulário abaixo para adicionar dias e horários de aula.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {schedules.map((slot, idx) => (
                    <div
                      key={slot.id || `slot-${idx}`}
                      className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between shadow-xs hover:border-indigo-200 dark:hover:border-indigo-800 transition"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          {slot.day}s
                        </div>
                        <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {slot.startTime} – {slot.endTime}
                        </div>
                        {slot.locationUrl && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                            <Video className="w-3 h-3 text-blue-500" />
                            {slot.locationUrl}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveScheduleSlot(slot.id, idx)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition flex items-center gap-1 font-bold text-xs"
                        title="Remover este horário"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline text-[11px]">Excluir</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Schedule Form */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  + Add New Class Schedule Slot
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Day</label>
                    <select
                      value={newDay}
                      onChange={(e) => setNewDay(e.target.value as DayOfWeek)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-medium"
                    >
                      {DAYS_ORDER.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Start Hour</label>
                    <input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">End Hour</label>
                    <input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Location / Platform</label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="e.g. Google Meet"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddScheduleSlot}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Schedule Slot</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: MONTHLY PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="space-y-5">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Monthly Tuition & Payment Control
                  </h3>
                  <p className="text-xs text-slate-500">
                    Control how much and when {student.name} pays each month.
                  </p>
                </div>
              </div>

              {/* Current Month Status Card */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                paymentInfo.status === 'paid'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                  : paymentInfo.status === 'overdue'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
              }`}>
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Current Billing Cycle (This Month)
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {formatCurrency(student.monthlyFee, student.currencySymbol)} / month
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Due Day: Every {student.dueDayOfMonth || 5}th of the month ({paymentInfo.dueDateStr})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase ${
                    paymentInfo.status === 'paid'
                      ? 'bg-emerald-600 text-white'
                      : paymentInfo.status === 'overdue'
                      ? 'bg-rose-600 text-white'
                      : 'bg-amber-500 text-white'
                  }`}>
                    {paymentInfo.status}
                  </span>

                  {paymentInfo.status !== 'paid' ? (
                    <button
                      onClick={() => handleTogglePaymentStatus('paid')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Paid</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTogglePaymentStatus('pending')}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-300"
                    >
                      Mark Pending
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Settings Form (Monthly Fee & Due Day) */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  Update Tuition Fee & Payment Due Date
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Monthly Fee Amount
                    </label>
                    <input
                      type="number"
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Currency Symbol
                    </label>
                    <input
                      type="text"
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      placeholder="$"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Due Day of Month (1-31)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={dueDayOfMonth}
                      onChange={(e) => setDueDayOfMonth(parseInt(e.target.value, 10) || 5)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Fee Settings</span>
                </button>
              </div>

              {/* Payment History Log */}
              <div>
                <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                  <History className="w-4 h-4 text-slate-400" /> Payment History Log
                </h4>
                
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Month</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Paid Date</th>
                        <th className="py-2.5 px-3">Method / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {student.paymentHistory.map((pay) => (
                        <tr key={pay.id}>
                          <td className="py-2.5 px-3 font-bold">{formatMonthYearLabel(pay.monthYear)}</td>
                          <td className="py-2.5 px-3 font-semibold">{formatCurrency(pay.amount, student.currencySymbol)}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              pay.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {pay.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {pay.paidDate ? new Date(pay.paidDate).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{pay.notes || pay.method || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: CLASS SESSION COUNTER & LOGS */}
          {activeTab === 'classes' && (
            <div className="space-y-5">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900">
                <div>
                  <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    Class Counter & Progress Tracker
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                    Currently on Class #{student.currentClassNumber}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Logged {student.classLogs.length} total past sessions
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onQuickLogClass(student)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Log Class #{student.currentClassNumber + 1}</span>
                  </button>
                </div>
              </div>

              {/* Adjust Class Counter Manually if Transferring Existing Student */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Adjust Class Counter:</span>
                  <span className="text-slate-500 ml-1">Change starting class number if needed.</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={currentClassNumber}
                    onChange={(e) => setCurrentClassNumber(parseInt(e.target.value, 10) || 0)}
                    className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-center font-bold"
                  />
                  <button
                    onClick={handleSaveProfile}
                    className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-lg text-xs hover:opacity-90 transition"
                  >
                    Update #
                  </button>
                </div>
              </div>

              {/* Historical Class Session Logs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <BookOpen className="w-4 h-4 text-indigo-500" /> Previous Class Sessions
                  </h4>
                </div>

                {/* Action Success Banner */}
                {actionSuccessMessage && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 rounded-xl border border-emerald-200 dark:border-emerald-900 text-xs font-semibold flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{actionSuccessMessage}</span>
                    </div>
                    <button onClick={() => setActionSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 text-xs">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {student.classLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-200 dark:border-slate-800">
                    No class history logged yet. Click "Log Class" to record your first lesson topic and homework!
                  </div>
                ) : (
                  student.classLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-white dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-600 dark:text-indigo-400 font-black text-sm">
                            Class #{log.classNumber}
                          </span>
                          {log.durationMinutes && (
                            <span className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
                              {log.durationMinutes} min
                            </span>
                          )}
                          {!log.attended && (
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-2 py-0.5 rounded-md">
                              Absence
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-medium text-[11px]">
                            {new Date(log.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>

                          <div className="flex items-center gap-1 ml-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditClassLog(log)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition"
                              title={`Edit class log #${log.classNumber}`}
                              aria-label={`Edit class log #${log.classNumber}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingClassLog(log)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                              title={`Delete class log #${log.classNumber}`}
                              aria-label={`Delete class log #${log.classNumber}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {log.topic && (
                        <div>
                          <strong className="text-slate-700 dark:text-slate-300">Topic Covered:</strong> {log.topic}
                        </div>
                      )}

                      {log.grammarFocus && (
                        <div className="text-slate-600 dark:text-slate-400">
                          <strong className="text-slate-700 dark:text-slate-300">Grammar Focus:</strong> {log.grammarFocus}
                        </div>
                      )}

                      {log.homeworkAssigned && (
                        <div className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg text-amber-900 dark:text-amber-200 font-medium border border-amber-200/60 dark:border-amber-900/60">
                          <strong>Homework:</strong> {log.homeworkAssigned}
                        </div>
                      )}

                      {log.notes && <div className="italic text-slate-500">"{log.notes}"</div>}
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 4: ENGLISH LEVEL & GOALS */}
          {activeTab === 'level' && (
            <div className="space-y-5">
              
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  English Proficiency & Learning Goals
                </h3>
                <p className="text-xs text-slate-500">
                  Select student's CEFR scale level (A1 to C2) and track target goals.
                </p>
              </div>

              {/* CEFR Level Selector Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(Object.keys(CEFR_LEVELS) as EnglishLevel[]).map((lvlKey) => {
                  const lvl = CEFR_LEVELS[lvlKey];
                  const isSelected = englishLevel === lvlKey;

                  return (
                    <button
                      key={lvlKey}
                      onClick={() => {
                        setEnglishLevel(lvlKey);
                        onUpdateStudent({ ...student, englishLevel: lvlKey });
                      }}
                      className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/40'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-md font-bold text-xs ${lvl.badgeBg}`}>
                          {lvl.code}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <div className="mt-2 font-bold text-slate-900 dark:text-white text-xs">
                        {lvl.name}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {lvl.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Student Target Goal & Personal Info Edit */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-3 text-xs">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">
                  Update Student Contact & Goals
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Target English Goal</label>
                    <input
                      type="text"
                      value={targetGoal}
                      onChange={(e) => setTargetGoal(e.target.value)}
                      placeholder="e.g. IELTS 7.5, Job Interview, Fluency"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Profile Info</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 5: STUDENT NOTES & HOMEWORK */}
          {activeTab === 'notes' && (
            <div className="space-y-5">
              
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Teacher Notes & Homework Records
                </h3>
                <p className="text-xs text-slate-500">
                  Add timestamped notes for grammar points to review, homework assigned, or general feedback.
                </p>
              </div>

              {/* Add New Note Box */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <PlusCircle className="w-4 h-4 text-indigo-600" /> Create New Note
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      placeholder="Note Title (e.g. Preposition error review, Exam date)"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold"
                    />
                  </div>

                  <div>
                    <select
                      value={newNoteCategory}
                      onChange={(e) => setNewNoteCategory(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-semibold"
                    >
                      <option value="lesson">Lesson Note</option>
                      <option value="grammar">Grammar Focus</option>
                      <option value="homework">Homework</option>
                      <option value="reminder">Reminder</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Write detailed note content or homework details..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs"
                />

                <button
                  onClick={handleAddNote}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Note</span>
                </button>
              </div>

              {/* Notes List */}
              <div className="space-y-3">
                {(student.notes || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    No notes recorded for this student yet.
                  </p>
                ) : (
                  (student.notes || []).map((note) => (
                    <div
                      key={note.id}
                      className={`p-4 rounded-xl border transition text-xs space-y-1.5 ${
                        note.pinned
                          ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                            {note.category}
                          </span>
                          <span className="text-slate-900 dark:text-white text-sm">{note.title}</span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleTogglePin(note.id)}
                            className={`p-1 rounded-lg transition ${
                              note.pinned ? 'text-amber-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                            }`}
                            title={note.pinned ? 'Unpin Note' : 'Pin Note to Top'}
                          >
                            <Pin className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{note.content}</p>

                      <div className="text-[10px] text-slate-400 pt-1">
                        Recorded on {new Date(note.createdAt).toLocaleDateString()} at{' '}
                        {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

        </div>
        </>
        )}

        {/* Modal Footer Controls */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/80 p-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900 animate-fadeIn">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-200">
                Confirmar exclusão de {student.name}?
              </span>
              <button
                type="button"
                onClick={() => {
                  onDeleteStudent(student.id);
                  onClose();
                }}
                className="px-2.5 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition"
              >
                Sim, Excluir
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 transition"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Student</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:opacity-90 transition"
          >
            Close Window
          </button>
        </div>

      </div>

      {/* Edit Class Log Modal */}
      {editingClassLog && (
        <div 
          className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancelEditClassLog();
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <h3 className="font-bold text-base">Edit Class Log #{editingClassLog.classNumber}</h3>
              </div>
              <button
                type="button"
                onClick={handleCancelEditClassLog}
                className="p-1 rounded-lg hover:bg-white/20 transition text-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClassLogEdit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {logEditError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 rounded-xl border border-rose-200 dark:border-rose-900 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{logEditError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Class Number *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editClassNumber}
                    onChange={(e) => setEditClassNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    min={15}
                    step={5}
                    value={editDurationMinutes}
                    onChange={(e) => setEditDurationMinutes(parseInt(e.target.value, 10) || 60)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Attendance
                  </label>
                  <select
                    value={editAttended ? 'true' : 'false'}
                    onChange={(e) => setEditAttended(e.target.value === 'true')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="true">Attended</option>
                    <option value="false">Absent / Missed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Topic Covered *
                </label>
                <input
                  type="text"
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  placeholder="e.g. Present Perfect vs Past Simple"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Grammar Focus
                </label>
                <input
                  type="text"
                  value={editGrammarFocus}
                  onChange={(e) => setEditGrammarFocus(e.target.value)}
                  placeholder="e.g. Irregular verbs, Since / For"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Homework Assigned
                </label>
                <input
                  type="text"
                  value={editHomeworkAssigned}
                  onChange={(e) => setEditHomeworkAssigned(e.target.value)}
                  placeholder="e.g. Read article on page 42"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Class Notes / Feedback
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Additional notes about student performance..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCancelEditClassLog}
                  className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLogEdit}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmittingLogEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Class Log Confirmation Modal */}
      {deletingClassLog && (
        <div 
          className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setDeletingClassLog(null);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Delete this class log?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Class #{deletingClassLog.classNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This action cannot be undone. The selected class record will be permanently removed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingClassLog(null)}
                className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingLogDelete}
                onClick={handleConfirmDeleteClassLog}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-md disabled:opacity-50"
              >
                {isSubmittingLogDelete ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
