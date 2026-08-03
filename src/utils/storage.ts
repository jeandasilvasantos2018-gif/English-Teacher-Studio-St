import { Student, ClassSessionLog, MonthlyPaymentRecord, StudentNote, PaymentStatus } from '../types';
import { INITIAL_STUDENTS } from '../data/initialData';
import { getCurrentMonthYearKey } from './helpers';

const STORAGE_KEY = 'english_teacher_students_v6';

export function loadStudents(): Student[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      saveStudents(INITIAL_STUDENTS);
      return INITIAL_STUDENTS;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_STUDENTS;
  } catch (err) {
    console.error('Failed to load students from localStorage:', err);
    return INITIAL_STUDENTS;
  }
}

export function saveStudents(students: Student[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  } catch (err) {
    console.error('Failed to save students to localStorage:', err);
  }
}

export function resetToDemoData(): Student[] {
  saveStudents(INITIAL_STUDENTS);
  return INITIAL_STUDENTS;
}

export function logClassForStudent(
  students: Student[],
  studentId: string,
  logData: Omit<ClassSessionLog, 'id' | 'classNumber'>
): Student[] {
  const updated = students.map((std) => {
    if (std.id !== studentId) return std;

    const nextClassNum = std.currentClassNumber + 1;
    const newLog: ClassSessionLog = {
      ...logData,
      id: `log-${Date.now()}`,
      classNumber: nextClassNum,
    };

    // Also if logData includes notes or homework, optionally append a student note
    const updatedNotes = [...std.notes];
    if (logData.topic || logData.notes) {
      updatedNotes.unshift({
        id: `note-${Date.now()}`,
        createdAt: new Date().toISOString(),
        category: 'lesson',
        title: `Class #${nextClassNum}: ${logData.topic || 'Lesson Recap'}`,
        content: `Topic: ${logData.topic || 'General Practice'}\nGrammar: ${logData.grammarFocus || 'N/A'}\nNotes: ${logData.notes || 'No extra notes'}${
          logData.homeworkAssigned ? `\nHomework: ${logData.homeworkAssigned}` : ''
        }`,
        pinned: false,
      });
    }

    return {
      ...std,
      currentClassNumber: nextClassNum,
      classLogs: [newLog, ...std.classLogs],
      notes: updatedNotes,
    };
  });

  saveStudents(updated);
  return updated;
}

export function recordPaymentForStudent(
  students: Student[],
  studentId: string,
  paymentData: {
    monthYear: string;
    amount: number;
    status: PaymentStatus;
    paidDate?: string;
    method?: MonthlyPaymentRecord['method'];
    notes?: string;
  }
): Student[] {
  const updated = students.map((std) => {
    if (std.id !== studentId) return std;

    const existingIdx = std.paymentHistory.findIndex((p) => p.monthYear === paymentData.monthYear);
    const updatedPaymentHistory = [...std.paymentHistory];

    const newRecord: MonthlyPaymentRecord = {
      id: existingIdx >= 0 ? std.paymentHistory[existingIdx].id : `pay-${Date.now()}`,
      monthYear: paymentData.monthYear,
      amount: paymentData.amount,
      status: paymentData.status,
      paidDate: paymentData.paidDate || (paymentData.status === 'paid' ? new Date().toISOString() : undefined),
      method: paymentData.method,
      notes: paymentData.notes,
    };

    if (existingIdx >= 0) {
      updatedPaymentHistory[existingIdx] = newRecord;
    } else {
      updatedPaymentHistory.unshift(newRecord);
    }

    return {
      ...std,
      paymentHistory: updatedPaymentHistory,
    };
  });

  saveStudents(updated);
  return updated;
}

export function addNoteToStudent(
  students: Student[],
  studentId: string,
  noteData: Omit<StudentNote, 'id' | 'createdAt'>
): Student[] {
  const updated = students.map((std) => {
    if (std.id !== studentId) return std;

    const newNote: StudentNote = {
      ...noteData,
      id: `note-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    return {
      ...std,
      notes: [newNote, ...std.notes],
    };
  });

  saveStudents(updated);
  return updated;
}

export function togglePinNote(students: Student[], studentId: string, noteId: string): Student[] {
  const updated = students.map((std) => {
    if (std.id !== studentId) return std;

    const updatedNotes = std.notes.map((n) => (n.id === noteId ? { ...n, pinned: !n.pinned } : n));
    return { ...std, notes: updatedNotes };
  });

  saveStudents(updated);
  return updated;
}

export function deleteNote(students: Student[], studentId: string, noteId: string): Student[] {
  const updated = students.map((std) => {
    if (std.id !== studentId) return std;

    const updatedNotes = std.notes.filter((n) => n.id !== noteId);
    return { ...std, notes: updatedNotes };
  });

  saveStudents(updated);
  return updated;
}
