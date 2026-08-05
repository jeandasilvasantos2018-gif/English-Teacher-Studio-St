import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Student, ClassScheduleSlot, ClassSessionLog, MonthlyPaymentRecord, StudentNote } from '../types';
import { loadStudents } from '../utils/storage';

const LOCAL_STORAGE_KEY = 'english_teacher_students_v6';

export interface SyncResult {
  success: boolean;
  message: string;
  count?: number;
  error?: string;
}

/**
 * 1. Sincroniza o array Student[] local com o banco de dados Supabase
 */
export async function syncStudentsToSupabase(students: Student[]): Promise<SyncResult> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      message: 'Supabase não configurado. Verifique as variáveis de ambiente.',
      error: 'VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes.',
    };
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        success: false,
        message: 'Usuário não autenticado. Faça login para sincronizar.',
        error: userError?.message || 'Nenhum usuário logado.',
      };
    }

    if (!students || students.length === 0) {
      return {
        success: true,
        message: 'Nenhum aluno para sincronizar.',
        count: 0,
      };
    }

    // Preparar registros da tabela 'students'
    const studentRows = students.map((std) => ({
      id: std.id,
      user_id: user.id,
      name: std.name,
      email: std.email,
      phone: std.phone || null,
      avatar_url: std.avatarUrl || null,
      english_level: std.englishLevel,
      target_goal: std.targetGoal || null,
      current_class_number: std.currentClassNumber,
      monthly_fee: std.monthlyFee,
      currency_symbol: std.currencySymbol,
      due_day_of_month: std.dueDayOfMonth,
      active: std.active,
      created_at: std.createdAt || new Date().toISOString(),
    }));

    const { error: studentUpsertError } = await supabase
      .from('students')
      .upsert(studentRows, { onConflict: 'id' });

    if (studentUpsertError) {
      console.error('Erro ao salvar alunos no Supabase:', studentUpsertError);
      return {
        success: false,
        message: 'Erro ao salvar os alunos no banco de dados.',
        error: studentUpsertError.message,
      };
    }

    // Preparar sub-tabelas
    const allSchedules: Array<Record<string, unknown>> = [];
    const allClassLogs: Array<Record<string, unknown>> = [];
    const allPaymentHistory: Array<Record<string, unknown>> = [];
    const allNotes: Array<Record<string, unknown>> = [];

    students.forEach((std) => {
      // schedules
      (std.schedules || []).forEach((sched) => {
        allSchedules.push({
          id: sched.id,
          student_id: std.id,
          day: sched.day,
          start_time: sched.startTime,
          end_time: sched.endTime,
          location_url: sched.locationUrl || null,
        });
      });

      // classLogs
      (std.classLogs || []).forEach((log) => {
        allClassLogs.push({
          id: log.id,
          student_id: std.id,
          class_number: log.classNumber,
          date: log.date,
          duration_minutes: log.durationMinutes,
          topic: log.topic || null,
          grammar_focus: log.grammarFocus || null,
          notes: log.notes || null,
          homework_assigned: log.homeworkAssigned || null,
          attended: log.attended ?? true,
        });
      });

      // paymentHistory
      (std.paymentHistory || []).forEach((pay) => {
        allPaymentHistory.push({
          id: pay.id,
          student_id: std.id,
          month_year: pay.monthYear,
          amount: pay.amount,
          status: pay.status,
          paid_date: pay.paidDate || null,
          method: pay.method || null,
          notes: pay.notes || null,
        });
      });

      // notes
      (std.notes || []).forEach((note) => {
        allNotes.push({
          id: note.id,
          student_id: std.id,
          created_at: note.createdAt,
          updated_at: note.updatedAt || null,
          category: note.category,
          title: note.title,
          content: note.content,
          pinned: note.pinned || false,
        });
      });
    });

    // Upsert nas sub-tabelas (se houver dados)
    if (allSchedules.length > 0) {
      const { error } = await supabase.from('student_schedules').upsert(allSchedules, { onConflict: 'id' });
      if (error) console.warn('Aviso ao sincronizar student_schedules:', error.message);
    }

    if (allClassLogs.length > 0) {
      const { error } = await supabase.from('class_logs').upsert(allClassLogs, { onConflict: 'id' });
      if (error) console.warn('Aviso ao sincronizar class_logs:', error.message);
    }

    if (allPaymentHistory.length > 0) {
      const { error } = await supabase.from('payment_history').upsert(allPaymentHistory, { onConflict: 'id' });
      if (error) console.warn('Aviso ao sincronizar payment_history:', error.message);
    }

    if (allNotes.length > 0) {
      const { error } = await supabase.from('student_notes').upsert(allNotes, { onConflict: 'id' });
      if (error) console.warn('Aviso ao sincronizar student_notes:', error.message);
    }

    return {
      success: true,
      message: `${students.length} alunos e suas sub-entidades foram sincronizados com sucesso no Supabase!`,
      count: students.length,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido na sincronização.';
    console.error('Exceção ao sincronizar com Supabase:', err);
    return {
      success: false,
      message: 'Falha crítica ao sincronizar dados.',
      error: errorMsg,
    };
  }
}

/**
 * 2. Lê os dados da chave 'english_teacher_students_v6' do localStorage e os envia ao Supabase
 */
export async function migrateLocalStorageToSupabase(): Promise<SyncResult> {
  try {
    const rawData = localStorage.getItem(LOCAL_STORAGE_KEY);
    let students: Student[] = [];

    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        if (Array.isArray(parsed)) {
          students = parsed;
        }
      } catch (e) {
        console.error('Erro ao analisar JSON do localStorage:', e);
      }
    }

    // Se não encontrou no localStorage via chave direta, tentar com loadStudents()
    if (students.length === 0) {
      students = loadStudents();
    }

    if (students.length === 0) {
      return {
        success: true,
        message: 'Nenhum dado encontrado no localStorage para migrar.',
        count: 0,
      };
    }

    return await syncStudentsToSupabase(students);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro ao ler localStorage.';
    return {
      success: false,
      message: 'Falha ao iniciar migração do localStorage.',
      error: errorMsg,
    };
  }
}

/**
 * 3. Busca todos os alunos do usuário autenticado no Supabase e reconstrói o objeto Student[]
 */
export async function getStudentsFromSupabase(): Promise<{ data: Student[] | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase não configurado.' };
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: 'Usuário não autenticado.' };
    }

    // Buscar alunos
    const { data: studentRows, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', user.id);

    if (studentError) {
      return { data: null, error: studentError.message };
    }

    if (!studentRows || studentRows.length === 0) {
      return { data: [], error: null };
    }

    const studentIds = studentRows.map((s) => s.id);

    // Buscar sub-entidades em paralelo
    const [schedulesRes, logsRes, paymentsRes, notesRes] = await Promise.all([
      supabase.from('student_schedules').select('*').in('student_id', studentIds),
      supabase.from('class_logs').select('*').in('student_id', studentIds),
      supabase.from('payment_history').select('*').in('student_id', studentIds),
      supabase.from('student_notes').select('*').in('student_id', studentIds),
    ]);

    const schedulesMap = new Map<string, ClassScheduleSlot[]>();
    const logsMap = new Map<string, ClassSessionLog[]>();
    const paymentsMap = new Map<string, MonthlyPaymentRecord[]>();
    const notesMap = new Map<string, StudentNote[]>();

    // Mapear schedules
    if (schedulesRes.data) {
      schedulesRes.data.forEach((row) => {
        const list = schedulesMap.get(row.student_id) || [];
        list.push({
          id: row.id,
          day: row.day,
          startTime: row.start_time || row.startTime,
          endTime: row.end_time || row.endTime,
          locationUrl: row.location_url || row.locationUrl || undefined,
        });
        schedulesMap.set(row.student_id, list);
      });
    }

    // Mapear classLogs
    if (logsRes.data) {
      logsRes.data.forEach((row) => {
        const list = logsMap.get(row.student_id) || [];
        list.push({
          id: row.id,
          classNumber: row.class_number ?? row.classNumber,
          date: row.date,
          durationMinutes: row.duration_minutes ?? row.durationMinutes ?? 60,
          topic: row.topic || undefined,
          grammarFocus: row.grammar_focus || row.grammarFocus || undefined,
          notes: row.notes || undefined,
          homeworkAssigned: row.homework_assigned || row.homeworkAssigned || undefined,
          attended: row.attended ?? true,
        });
        logsMap.set(row.student_id, list);
      });
    }

    // Mapear paymentHistory
    if (paymentsRes.data) {
      paymentsRes.data.forEach((row) => {
        const list = paymentsMap.get(row.student_id) || [];
        list.push({
          id: row.id,
          monthYear: row.month_year || row.monthYear,
          amount: row.amount,
          status: row.status,
          paidDate: row.paid_date || row.paidDate || undefined,
          method: row.method || undefined,
          notes: row.notes || undefined,
        });
        paymentsMap.set(row.student_id, list);
      });
    }

    // Mapear notes
    if (notesRes.data) {
      notesRes.data.forEach((row) => {
        const list = notesMap.get(row.student_id) || [];
        list.push({
          id: row.id,
          createdAt: row.created_at || row.createdAt,
          updatedAt: row.updated_at || row.updatedAt || undefined,
          category: row.category,
          title: row.title,
          content: row.content,
          pinned: row.pinned ?? false,
        });
        notesMap.set(row.student_id, list);
      });
    }

    // Reconstruir o formato Student[]
    const students: Student[] = studentRows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      avatarUrl: row.avatar_url || row.avatarUrl || undefined,
      englishLevel: row.english_level || row.englishLevel || 'A1',
      targetGoal: row.target_goal || row.targetGoal || undefined,
      currentClassNumber: row.current_class_number ?? row.currentClassNumber ?? 0,
      monthlyFee: row.monthly_fee ?? row.monthlyFee ?? 0,
      currencySymbol: row.currency_symbol || row.currencySymbol || '$',
      dueDayOfMonth: row.due_day_of_month ?? row.dueDayOfMonth ?? 5,
      active: row.active ?? true,
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      schedules: schedulesMap.get(row.id) || [],
      classLogs: logsMap.get(row.id) || [],
      paymentHistory: paymentsMap.get(row.id) || [],
      notes: notesMap.get(row.id) || [],
    }));

    return { data: students, error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar alunos do Supabase.';
    console.error('Exceção ao buscar alunos do Supabase:', err);
    return { data: null, error: errorMsg };
  }
}
