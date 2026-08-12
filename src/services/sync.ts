/**
 * Camada de sincronização entre LocalStorage (English Teacher Studio) e Supabase.
 * Suporta mapeamento de local_id, UUIDs reais, sincronização estrita de sub-tabelas e isolamento por usuário.
 */
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

    // Preparar registros da tabela 'students' utilizando local_id
    const studentRows = students.map((std) => ({
      local_id: std.id,
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

    // Realizar upsert na tabela students com onConflict 'user_id,local_id' e selecionar id (UUID real) e local_id
    const { data: insertedStudents, error: studentUpsertError } = await supabase
      .from('students')
      .upsert(studentRows, { onConflict: 'user_id,local_id' })
      .select('id, local_id');

    if (studentUpsertError) {
      console.error('=== ERRO SUPABASE AO SALVAR ALUNOS ===');
      console.error('Mensagem:', studentUpsertError.message);
      console.error('Código:', studentUpsertError.code);
      console.error('Detalhes:', studentUpsertError.details);
      console.error('Hint:', studentUpsertError.hint);
      console.error('Objeto completo do erro:', studentUpsertError);

      const fullErrorDetails = [
        `Mensagem: ${studentUpsertError.message}`,
        `Código: ${studentUpsertError.code || 'N/A'}`,
        studentUpsertError.details ? `Detalhes: ${studentUpsertError.details}` : null,
        studentUpsertError.hint ? `Hint: ${studentUpsertError.hint}` : null,
      ].filter(Boolean).join(' | ');

      return {
        success: false,
        message: `Erro ao salvar alunos no Supabase: ${studentUpsertError.message}`,
        error: fullErrorDetails,
      };
    }

    // 2. Obter os UUIDs reais do Supabase
    const localToUuidMap = new Map<string, string>();
    if (insertedStudents) {
      insertedStudents.forEach((row) => {
        if (row.local_id && row.id) {
          localToUuidMap.set(String(row.local_id), row.id);
        }
      });
    }

    // Garantir que todos os alunos tenham seu UUID recuperado buscando no Supabase se algum faltar
    const missingLocalIds = students.filter((s) => !localToUuidMap.has(String(s.id)));
    if (missingLocalIds.length > 0) {
      const { data: dbStudents, error: fetchError } = await supabase
        .from('students')
        .select('id, local_id')
        .eq('user_id', user.id);

      if (fetchError) {
        console.error('=== ERRO AO RECUPERAR UUIDS DOS ALUNOS ===', fetchError);
        return {
          success: false,
          message: `Erro ao recuperar UUIDs dos alunos: ${fetchError.message}`,
          error: fetchError.message,
        };
      }

      (dbStudents || []).forEach((row) => {
        if (row.local_id && row.id) {
          localToUuidMap.set(String(row.local_id), row.id);
        }
      });
    }

    const studentUuids = Array.from(localToUuidMap.values());

    // Se houver UUIDs de alunos salvos, excluir os registros filhos existentes vinculados a esses UUIDs para evitar duplicação
    if (studentUuids.length > 0) {
      const deleteResults = await Promise.all([
        supabase.from('student_schedules').delete().in('student_id', studentUuids),
        supabase.from('class_logs').delete().in('student_id', studentUuids),
        supabase.from('payment_history').delete().in('student_id', studentUuids),
        supabase.from('student_notes').delete().in('student_id', studentUuids),
      ]);

      for (const res of deleteResults) {
        if (res.error) {
          console.error('=== ERRO AO LIMPAR SUB-TABELAS ===', res.error);
          return {
            success: false,
            message: `Erro ao limpar sub-tabelas no Supabase: ${res.error.message}`,
            error: res.error.message,
          };
        }
      }
    }

    // 3. Construir os arrays scheduleRows, classLogRows, paymentRows e noteRows
    const scheduleRows: Array<Record<string, unknown>> = [];
    const classLogRows: Array<Record<string, unknown>> = [];
    const paymentRows: Array<Record<string, unknown>> = [];
    const noteRows: Array<Record<string, unknown>> = [];

    for (const student of students) {
      const realStudentUuid = localToUuidMap.get(String(student.id));
      if (!realStudentUuid) {
        console.warn(`UUID real não encontrado para o aluno com local_id=${student.id}`);
        continue;
      }

      // student.schedules -> scheduleRows
      if (Array.isArray(student.schedules)) {
        for (const sched of student.schedules) {
          scheduleRows.push({
            student_id: realStudentUuid,
            day: sched.day,
            start_time: sched.startTime,
            end_time: sched.endTime,
            location_url: sched.locationUrl || null,
          });
        }
      }

      // student.classLogs -> classLogRows
      if (Array.isArray(student.classLogs)) {
        for (const log of student.classLogs) {
          classLogRows.push({
            student_id: realStudentUuid,
            class_number: log.classNumber,
            date: log.date,
            duration_minutes: log.durationMinutes,
            topic: log.topic || null,
            grammar_focus: log.grammarFocus || null,
            notes: log.notes || null,
            homework_assigned: log.homeworkAssigned || null,
            attended: log.attended ?? true,
          });
        }
      }

      // student.paymentHistory -> paymentRows
      if (Array.isArray(student.paymentHistory)) {
        for (const pay of student.paymentHistory) {
          paymentRows.push({
            student_id: realStudentUuid,
            month_year: pay.monthYear,
            amount: pay.amount,
            status: pay.status,
            paid_date: pay.paidDate || null,
            method: pay.method || null,
            notes: pay.notes || null,
          });
        }
      }

      // student.notes -> noteRows
      if (Array.isArray(student.notes)) {
        for (const note of student.notes) {
          noteRows.push({
            student_id: realStudentUuid,
            created_at: note.createdAt || new Date().toISOString(),
            category: note.category,
            title: note.title,
            content: note.content,
            pinned: note.pinned ?? false,
          });
        }
      }
    }

    // 4. Inserir esses arrays utilizando await e tratar erros de forma estrita
    // student_schedules
    if (scheduleRows.length > 0) {
      const { error: scheduleError } = await supabase
        .from('student_schedules')
        .insert(scheduleRows);

      if (scheduleError) {
        console.error('=== ERRO SUPABASE AO SALVAR STUDENT_SCHEDULES ===', scheduleError);
        return {
          success: false,
          message: `Erro ao inserir student_schedules: ${scheduleError.message}`,
          error: `Mensagem: ${scheduleError.message} | Código: ${scheduleError.code || 'N/A'} | Detalhes: ${scheduleError.details || ''} | Hint: ${scheduleError.hint || ''}`,
        };
      }
    }
    console.log(`Quantidade de schedules inseridos: ${scheduleRows.length}`);

    // class_logs
    if (classLogRows.length > 0) {
      const { error: classLogError } = await supabase
        .from('class_logs')
        .insert(classLogRows);

      if (classLogError) {
        console.error('=== ERRO SUPABASE AO SALVAR CLASS_LOGS ===', classLogError);
        return {
          success: false,
          message: `Erro ao inserir class_logs: ${classLogError.message}`,
          error: `Mensagem: ${classLogError.message} | Código: ${classLogError.code || 'N/A'} | Detalhes: ${classLogError.details || ''} | Hint: ${classLogError.hint || ''}`,
        };
      }
    }
    console.log(`Quantidade de class_logs inseridos: ${classLogRows.length}`);

    // payment_history
    if (paymentRows.length > 0) {
      const { error: paymentError } = await supabase
        .from('payment_history')
        .insert(paymentRows);

      if (paymentError) {
        console.error('=== ERRO SUPABASE AO SALVAR PAYMENT_HISTORY ===', paymentError);
        return {
          success: false,
          message: `Erro ao inserir payment_history: ${paymentError.message}`,
          error: `Mensagem: ${paymentError.message} | Código: ${paymentError.code || 'N/A'} | Detalhes: ${paymentError.details || ''} | Hint: ${paymentError.hint || ''}`,
        };
      }
    }
    console.log(`Quantidade de payment_history inseridos: ${paymentRows.length}`);

    // student_notes
    if (noteRows.length > 0) {
      const { error: noteError } = await supabase
        .from('student_notes')
        .insert(noteRows);

      if (noteError) {
        console.error('=== ERRO SUPABASE AO SALVAR STUDENT_NOTES ===', noteError);
        return {
          success: false,
          message: `Erro ao inserir student_notes: ${noteError.message}`,
          error: `Mensagem: ${noteError.message} | Código: ${noteError.code || 'N/A'} | Detalhes: ${noteError.details || ''} | Hint: ${noteError.hint || ''}`,
        };
      }
    }
    console.log(`Quantidade de student_notes inseridos: ${noteRows.length}`);

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

    // Se houver erro de consulta nas sub-tabelas, interromper para não sobreescrever os dados locais com listas vazias
    if (schedulesRes.error || logsRes.error || paymentsRes.error || notesRes.error) {
      const errDetail = notesRes.error?.message || logsRes.error?.message || paymentsRes.error?.message || schedulesRes.error?.message || 'Erro ao carregar sub-entidades do Supabase.';
      console.error('=== ERRO SUPABASE AO BUSCAR SUB-ENTIDADES ===', errDetail);
      return { data: null, error: errDetail };
    }

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
      id: row.local_id || row.id,
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
