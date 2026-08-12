import { Student, ClassSessionLog, MonthlyPaymentRecord, StudentNote, PaymentStatus } from '../types';
import { INITIAL_STUDENTS } from '../data/initialData';
import { migrateLocalStorageToSupabase, getStudentsFromSupabase } from '../services/sync';
import { isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEY = 'english_teacher_students_v6';

// Estados e Controle da Fila de Sincronização / Debounce
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;
let syncPending = false;

/**
 * Executa o upload para o Supabase respeitando o estado da conexão e bloqueios de sincronização
 */
function triggerSync(): void {
  // Se o navegador estiver offline, marca como pendente
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    syncPending = true;
    return;
  }

  // Se já houver um upload em andamento, enfileira a próxima execução
  if (isSyncing) {
    syncPending = true;
    return;
  }

  isSyncing = true;
  syncPending = false;

  migrateLocalStorageToSupabase()
    .then((result) => {
      if (!result.success) {
        console.error('Aviso/Erro na sincronização em background:', result.error || result.message);
      }
    })
    .catch((err) => {
      console.error('Falha ao executar sincronização em background:', err);
    })
    .finally(() => {
      isSyncing = false;
      // Caso novas alterações tenham ocorrido durante a sincronização anterior
      if (syncPending) {
        syncPending = false;
        scheduleSync(500);
      }
    });
}

/**
 * Agenda a sincronização em background utilizando Debounce de ~2 segundos
 */
function scheduleSync(delayMs = 2000): void {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null;
    triggerSync();
  }, delayMs);
}

// Ouvinte para detectar quando a conexão for reestabelecida
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (syncPending) {
      scheduleSync(500);
    }
  });
}

export function loadStudents(): Student[] {
  let localStudents: Student[] = INITIAL_STUDENTS;

  // 1. Ler imediatamente do localStorage
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      saveStudents(INITIAL_STUDENTS);
      localStudents = INITIAL_STUDENTS;
    } else {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStudents = parsed;
      } else {
        localStudents = INITIAL_STUDENTS;
      }
    }
  } catch (err) {
    console.error('Failed to load students from localStorage:', err);
    localStudents = INITIAL_STUDENTS;
  }

  // 2. Se existir Supabase configurado, busca em background de forma assíncrona
  if (isSupabaseConfigured && typeof window !== 'undefined' && navigator.onLine) {
    getStudentsFromSupabase()
      .then(({ data: remoteStudents, error }) => {
        if (!error && remoteStudents && Array.isArray(remoteStudents) && remoteStudents.length > 0) {
          const currentLocalRaw = localStorage.getItem(STORAGE_KEY);
          const currentLocal: Student[] = currentLocalRaw ? JSON.parse(currentLocalRaw) : [];

          // Mesclar dados do Supabase com o localStorage preservando alterações locais não sincronizadas
          const mergedRemoteStudents = remoteStudents.map((remote) => {
            const local = currentLocal.find((l) => l.id === remote.id || l.name === remote.name);
            if (!local) return remote;

            // 1. Class Logs Merge
            const localLogs = local.classLogs || [];
            const remoteLogs = remote.classLogs || [];
            const remoteLogIds = new Set(remoteLogs.map((rl) => rl.id));

            const missingLocalLogs = localLogs.filter((ll) => {
              if (remoteLogIds.has(ll.id)) return false;
              return !remoteLogs.some(
                (rl) => rl.classNumber === ll.classNumber && rl.date === ll.date
              );
            });

            const mergedClassLogs = [...remoteLogs, ...missingLocalLogs].sort(
              (a, b) => b.classNumber - a.classNumber
            );

            // 2. Class Number Counter
            const maxLocalClassNum = localLogs.reduce((max, l) => Math.max(max, l.classNumber), 0);
            const maxRemoteClassNum = remoteLogs.reduce((max, l) => Math.max(max, l.classNumber), 0);
            const mergedClassNumber = Math.max(
              remote.currentClassNumber || 0,
              local.currentClassNumber || 0,
              maxLocalClassNum,
              maxRemoteClassNum
            );

            // 3. Student Notes Merge
            const localNotes = local.notes || [];
            const remoteNotes = remote.notes || [];
            const remoteNoteSignatures = new Set(
              remoteNotes.map((rn) => `${rn.id}::${rn.title}`)
            );

            const missingLocalNotes = localNotes.filter(
              (ln) =>
                !remoteNoteSignatures.has(`${ln.id}::${ln.title}`) &&
                !remoteNotes.some(
                  (rn) => rn.id === ln.id || (rn.title === ln.title && rn.createdAt === ln.createdAt)
                )
            );

            const mergedNotes = [...remoteNotes, ...missingLocalNotes].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            // 4. Payment History Merge
            const localPayments = local.paymentHistory || [];
            const remotePayments = remote.paymentHistory || [];
            const remotePayIds = new Set(remotePayments.map((rp) => rp.id));

            const missingLocalPayments = localPayments.filter(
              (lp) =>
                !remotePayIds.has(lp.id) &&
                !remotePayments.some((rp) => rp.monthYear === lp.monthYear && rp.amount === lp.amount)
            );

            const mergedPayments = [...remotePayments, ...missingLocalPayments];

            // 5. Schedules Merge
            const localSchedules = local.schedules || [];
            const remoteSchedules = remote.schedules || [];
            const remoteSchedIds = new Set(remoteSchedules.map((rs) => rs.id));

            const missingLocalSchedules = localSchedules.filter(
              (ls) =>
                !remoteSchedIds.has(ls.id) &&
                !remoteSchedules.some(
                  (rs) => rs.day === ls.day && rs.startTime === ls.startTime
                )
            );

            const mergedSchedules = [...remoteSchedules, ...missingLocalSchedules];

            return {
              ...remote,
              currentClassNumber: mergedClassNumber,
              classLogs: mergedClassLogs,
              notes: mergedNotes,
              paymentHistory: mergedPayments,
              schedules: mergedSchedules,
            };
          });

          // Alunos locais que ainda não existem no remoto (recém-criados localmente)
          const localOnlyStudents = currentLocal.filter(
            (local) => !remoteStudents.some((remote) => remote.id === local.id || remote.name === local.name)
          );

          const mergedStudents = [...mergedRemoteStudents, ...localOnlyStudents];

          // Se o resultado mesclado for diferente do localStorage atual, atualiza o storage
          if (JSON.stringify(mergedStudents) !== JSON.stringify(currentLocal)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedStudents));
            
            // Dispara evento para atualização automática do estado na aplicação
            window.dispatchEvent(new CustomEvent('students_updated', { detail: mergedStudents }));
            window.dispatchEvent(new Event('storage'));
          }
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar dados do Supabase em background:', err);
      });
  }

  // 3. Retorna os dados locais imediatamente para não bloquear a interface
  return localStudents;
}

export function saveStudents(students: Student[]): void {
  // 1. Atualiza o localStorage imediatamente
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  } catch (err) {
    console.error('Failed to save students to localStorage:', err);
  }

  // 2. Agenda a sincronização com o Supabase em background (Debounce + Queue)
  scheduleSync(2000);
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

    const updatedNotes = [...(std.notes || [])];
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
      notes: [newNote, ...(std.notes || [])],
    };
  });

  saveStudents(updated);
  return updated;
}

export function togglePinNote(students: Student[], studentId: string, noteId: string): Student[] {
  const updated = students.map((std) => {
    if (std.id !== studentId) return std;

    const updatedNotes = (std.notes || []).map((n) => (n.id === noteId ? { ...n, pinned: !n.pinned } : n));
    return { ...std, notes: updatedNotes };
  });

  saveStudents(updated);
  return updated;
}

export function deleteNote(students: Student[], studentId: string, noteId: string): Student[] {
  const updated = students.map((std) => {
    if (std.id !== studentId) return std;

    const updatedNotes = (std.notes || []).filter((n) => n.id !== noteId);
    return { ...std, notes: updatedNotes };
  });

  saveStudents(updated);
  return updated;
}

export function updateClassLogForStudent(
  students: Student[],
  studentId: string,
  classLogId: string,
  updates: Partial<ClassSessionLog>
): Student[] {
  const updated = students.map((std) => {
    if (std.id !== studentId) return std;

    const updatedLogs = std.classLogs.map((log) => {
      if (log.id !== classLogId) return log;
      return {
        ...log,
        ...updates,
        id: log.id, // preserve original id
      };
    });

    return {
      ...std,
      classLogs: updatedLogs,
    };
  });

  saveStudents(updated);
  return updated;
}

export function deleteClassLogForStudent(
  students: Student[],
  studentId: string,
  classLogId: string
): Student[] {
  const updated = students.map((std) => {
    if (std.id !== studentId) return std;

    const updatedLogs = std.classLogs.filter((log) => log.id !== classLogId);

    return {
      ...std,
      classLogs: updatedLogs,
    };
  });

  saveStudents(updated);
  return updated;
}

