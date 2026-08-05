import React, { useState, useEffect } from 'react';
import { Student, ViewMode, ClassSessionLog, PaymentStatus, DayOfWeek } from './types';
import { 
  loadStudents, 
  saveStudents, 
  resetToDemoData, 
  logClassForStudent, 
  recordPaymentForStudent 
} from './utils/storage';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { StudentList } from './components/StudentList';
import { WeeklyScheduleView } from './components/WeeklyScheduleView';
import { AvailabilityView } from './components/AvailabilityView';
import { PaymentTrackerView } from './components/PaymentTrackerView';
import { StudentDetailModal } from './components/StudentDetailModal';
import { AddStudentModal } from './components/AddStudentModal';
import { QuickLogClassModal } from './components/QuickLogClassModal';
import { LessonPlannerAIModal } from './components/LessonPlannerAIModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { StudentReportModal } from './components/StudentReportModal';
import { BackupRestoreView } from './components/BackupRestoreView';
import { SupabaseTest } from './components/SupabaseTest';
import { exportBackupJSON, importBackupJSON } from './utils/backup';
import { Check, Info } from 'lucide-react';

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Selected Student for Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Quick Log Class Modal
  const [quickLogStudent, setQuickLogStudent] = useState<Student | null>(null);

  // Add Student Modal & Prefilled Slot
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [initialAddStudentSlot, setInitialAddStudentSlot] = useState<{ day: DayOfWeek; startTime: string; endTime: string } | null>(null);

  // AI Lesson Planner Modal
  const [isAiPlannerOpen, setIsAiPlannerOpen] = useState(false);

  // WhatsApp Modal State
  const [whatsAppStudent, setWhatsAppStudent] = useState<Student | null>(null);
  const [whatsAppTemplate, setWhatsAppTemplate] = useState<'payment' | 'schedule' | 'homework' | 'custom'>('payment');

  // Student Report Modal State
  const [reportStudent, setReportStudent] = useState<Student | null>(null);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadStudents();
    setStudents(loaded);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync state & storage
  const handleUpdateStudent = (updatedStudent: Student) => {
    const updatedList = students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s));
    setStudents(updatedList);
    saveStudents(updatedList);

    if (selectedStudent && selectedStudent.id === updatedStudent.id) {
      setSelectedStudent(updatedStudent);
    }
    showToast(`Updated student ${updatedStudent.name}`);
  };

  const handleDeleteStudent = (studentId: string) => {
    const updatedList = students.filter((s) => s.id !== studentId);
    setStudents(updatedList);
    saveStudents(updatedList);
    if (selectedStudent && selectedStudent.id === studentId) {
      setSelectedStudent(null);
    }
    showToast('Student deleted');
  };

  const handleAddStudent = (newStudent: Student) => {
    const updatedList = [newStudent, ...students];
    setStudents(updatedList);
    saveStudents(updatedList);
    showToast(`Added new student ${newStudent.name}`);
  };

  const handleLogClass = (
    studentId: string,
    logData: Omit<ClassSessionLog, 'id' | 'classNumber'>
  ) => {
    const updatedList = logClassForStudent(students, studentId, logData);
    setStudents(updatedList);

    const updatedStd = updatedList.find((s) => s.id === studentId);
    if (updatedStd) {
      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent(updatedStd);
      }
      showToast(`Class #${updatedStd.currentClassNumber} logged for ${updatedStd.name}!`);
    }
  };

  const handleRecordPayment = (
    studentId: string,
    paymentData: {
      monthYear: string;
      amount: number;
      status: PaymentStatus;
      paidDate?: string;
      method?: any;
      notes?: string;
    }
  ) => {
    const updatedList = recordPaymentForStudent(students, studentId, paymentData);
    setStudents(updatedList);

    const updatedStd = updatedList.find((s) => s.id === studentId);
    if (updatedStd) {
      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent(updatedStd);
      }
      showToast(`Payment marked as ${paymentData.status.toUpperCase()} for ${updatedStd.name}`);
    }
  };

  const handleResetData = () => {
    const reset = resetToDemoData();
    setStudents(reset);
    setSelectedStudent(null);
    showToast('Reset to demo students');
  };

  const handleExportData = () => {
    try {
      exportBackupJSON();
      showToast('Backup exportado com sucesso.');
    } catch (err: unknown) {
      if (err instanceof Error) showToast(err.message);
      else showToast('Unable to export backup.');
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const updated = importBackupJSON(text);
        setStudents(updated);
        showToast('Backup imported successfully.');
      } catch (err: unknown) {
        if (err instanceof Error) showToast(err.message);
        else showToast('Unable to import backup.');
      }
    };
    reader.onerror = () => {
      showToast('Unable to import backup.');
    };
    reader.readAsText(file);
  };

  const handleOpenAddStudentWithSlot = (day: DayOfWeek, startTime: string, endTime: string) => {
    setInitialAddStudentSlot({ day, startTime, endTime });
    setIsAddStudentOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col antialiased">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 dark:border-slate-200 text-xs font-bold flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* App Header */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenAddStudent={() => setIsAddStudentOpen(true)}
        onOpenQuickLog={() => {
          if (students.length > 0) {
            setQuickLogStudent(students[0]);
          } else {
            setIsAddStudentOpen(true);
          }
        }}
        onOpenAiPlanner={() => setIsAiPlannerOpen(true)}
        onResetData={handleResetData}
        onExportData={handleExportData}
        onImportData={handleImportData}
        studentCount={students.filter((s) => s.active).length}
      />

      {/* Main App Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6">
        
        {/* Metric Overview Cards */}
        <StatsCards
          students={students}
          onSelectPaymentFilter={(filter) => {
            setViewMode('payments');
          }}
        />

        {/* Dynamic Views */}
        {viewMode === 'grid' || viewMode === 'table' ? (
          <StudentList
            students={students}
            onSelectStudent={(std) => setSelectedStudent(std)}
            onQuickLogClass={(std) => setQuickLogStudent(std)}
            onQuickRecordPayment={(std) => {
              setSelectedStudent(std);
            }}
            onOpenAddStudent={() => {
              setInitialAddStudentSlot(null);
              setIsAddStudentOpen(true);
            }}
            onOpenWhatsApp={(std, tmpl) => {
              setWhatsAppStudent(std);
              if (tmpl) setWhatsAppTemplate(tmpl);
            }}
            onOpenReport={(std) => setReportStudent(std)}
          />
        ) : viewMode === 'weekly' ? (
          <WeeklyScheduleView
            students={students}
            onSelectStudent={(std) => setSelectedStudent(std)}
            onQuickLogClass={(std) => setQuickLogStudent(std)}
            onOpenAddStudent={() => {
              setInitialAddStudentSlot(null);
              setIsAddStudentOpen(true);
            }}
            onOpenAvailability={() => setViewMode('availability')}
          />
        ) : viewMode === 'availability' ? (
          <AvailabilityView
            students={students}
            onSelectStudent={(std) => setSelectedStudent(std)}
            onOpenAddStudentWithSlot={handleOpenAddStudentWithSlot}
            onOpenWhatsApp={(std) => {
              setWhatsAppStudent(std);
              setWhatsAppTemplate('schedule');
            }}
          />
        ) : viewMode === 'backup' ? (
          <BackupRestoreView
            students={students}
            onStudentsUpdated={(updated) => {
              setStudents(updated);
              saveStudents(updated);
            }}
            onShowToast={showToast}
          />
        ) : viewMode === 'supabase_test' ? (
          <SupabaseTest onBack={() => setViewMode('grid')} />
        ) : (
          <PaymentTrackerView
            students={students}
            onRecordPayment={handleRecordPayment}
            onSelectStudent={(std) => setSelectedStudent(std)}
            onOpenWhatsApp={(std, tmpl) => {
              setWhatsAppStudent(std);
              if (tmpl) setWhatsAppTemplate(tmpl);
            }}
          />
        )}

      </main>

      {/* Modals */}
      <StudentDetailModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onUpdateStudent={handleUpdateStudent}
        onDeleteStudent={handleDeleteStudent}
        onQuickLogClass={(std) => setQuickLogStudent(std)}
        onOpenWhatsApp={(std, tmpl) => {
          setWhatsAppStudent(std);
          if (tmpl) setWhatsAppTemplate(tmpl);
        }}
        onOpenReport={(std) => setReportStudent(std)}
      />

      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => {
          setIsAddStudentOpen(false);
          setInitialAddStudentSlot(null);
        }}
        onAddStudent={handleAddStudent}
        initialSlot={initialAddStudentSlot}
      />

      <QuickLogClassModal
        student={quickLogStudent}
        onClose={() => setQuickLogStudent(null)}
        onLogClass={handleLogClass}
      />

      <LessonPlannerAIModal
        isOpen={isAiPlannerOpen}
        onClose={() => setIsAiPlannerOpen(false)}
        students={students}
      />

      <WhatsAppModal
        student={whatsAppStudent}
        isOpen={!!whatsAppStudent}
        onClose={() => setWhatsAppStudent(null)}
        defaultTemplate={whatsAppTemplate}
      />

      <StudentReportModal
        student={reportStudent}
        isOpen={!!reportStudent}
        onClose={() => setReportStudent(null)}
      />

    </div>
  );
}
