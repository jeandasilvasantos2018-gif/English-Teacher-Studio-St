import {
  Notification,
  NotificationType,
  NotificationPriority,
  Student,
  CalendarEvent,
} from '../types';
import { loadStudents } from '../utils/storage';

const NOTIFICATIONS_STORAGE_KEY = 'english_teacher_notifications_v1';
const CALENDAR_STORAGE_KEY = 'english_teacher_calendar_events_v1';

// ============================================================================
// 1. LEITURA E ESCRITA DO CACHE LOCAL
// ============================================================================

/**
 * Lê todas as notificações salvas no cache local (localStorage)
 */
export function getNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Retorna ordenado por createdAt decrescente (mais recentes primeiro)
    return parsed.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.error('[Notifications Service] Erro ao ler notificações do cache:', err);
    return [];
  }
}

/**
 * Salva a lista de notificações no cache local
 */
export function saveNotifications(notifications: Notification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch (err) {
    console.error('[Notifications Service] Erro ao salvar notificações no cache:', err);
  }
}

// ============================================================================
// 2. OPERAÇÕES DE GERENCIAMENTO DE NOTIFICAÇÕES
// ============================================================================

/**
 * Marca uma notificação específica como lida
 */
export function markAsRead(id: string): Notification[] {
  const current = getNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveNotifications(updated);
  return updated;
}

/**
 * Marca todas as notificações como lidas
 */
export function markAllAsRead(): Notification[] {
  const current = getNotifications();
  const updated = current.map((n) => ({ ...n, read: true }));
  saveNotifications(updated);
  return updated;
}

/**
 * Exclui uma notificação pelo ID
 */
export function deleteNotification(id: string): Notification[] {
  const current = getNotifications();
  const updated = current.filter((n) => n.id !== id);
  saveNotifications(updated);
  return updated;
}

/**
 * Remove todas as notificações que já foram lidas
 */
export function clearReadNotifications(): Notification[] {
  const current = getNotifications();
  const updated = current.filter((n) => !n.read);
  saveNotifications(updated);
  return updated;
}

// ============================================================================
// 3. AUXILIARES PARA LEITURA DE DADOS (CALENDÁRIO E ESTUDANTES)
// ============================================================================

function readCalendarCacheForNotifications(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[Notifications Service] Erro ao carregar eventos para notificações:', err);
    return [];
  }
}

// Helper para formatar YYYY-MM
function getMonthYearStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ============================================================================
// 4. MOTOR DE GERAÇÃO DE NOTIFICAÇÕES (NOTIFICATION ENGINE)
// ============================================================================

export interface GenerateNotificationsOptions {
  students?: Student[];
  calendarEvents?: CalendarEvent[];
  now?: Date;
  inactiveDaysThreshold?: number; // padrão 14 dias
}

/**
 * Motor principal que analisa o estado atual dos eventos de calendário, estudantes,
 * pagamentos e histórico de aulas, gerando notificações pendentes sem duplicidade.
 */
export function generateNotifications(
  options: GenerateNotificationsOptions = {}
): Notification[] {
  const now = options.now ? new Date(options.now) : new Date();
  const nowMs = now.getTime();

  // Carrega estudantes e eventos se não fornecidos explicitamente
  const students = options.students || loadStudents();
  const calendarEvents = options.calendarEvents || readCalendarCacheForNotifications();
  const inactiveDaysThreshold = options.inactiveDaysThreshold || 14;

  const existingNotifications = getNotifications();
  const newNotifications: Notification[] = [];

  // Helper de verificação de duplicidade existente ou recém-gerada
  const isDuplicate = (checkFn: (n: Notification) => boolean): boolean => {
    return (
      existingNotifications.some(checkFn) || newNotifications.some(checkFn)
    );
  };

  // --------------------------------------------------------------------------
  // A) REGRAS DE AULAS / EVENTOS DO CALENDÁRIO
  // --------------------------------------------------------------------------
  const activeEvents = calendarEvents.filter(
    (e) => e.status !== 'cancelled' && e.status !== 'no_show'
  );

  for (const event of activeEvents) {
    const startMs = new Date(event.startAt).getTime();
    if (isNaN(startMs)) continue;

    const diffMinutes = (startMs - nowMs) / (1000 * 60);

    // 1. Aula em ~30 minutos (janela de 20 a 40 min antes do início)
    if (diffMinutes >= 20 && diffMinutes <= 40) {
      const duplicate = isDuplicate(
        (n) =>
          n.type === 'class_reminder' &&
          n.calendarEventId === event.id &&
          n.metadata?.window === '30m'
      );

      if (!duplicate) {
        newNotifications.push({
          id: `notif_rem30_${event.id}_${nowMs}`,
          type: 'class_reminder',
          title: 'Class in 30 Minutes',
          message: `Class "${event.title}" is scheduled to start in 30 minutes.`,
          calendarEventId: event.id,
          studentId: event.studentId,
          priority: 'high',
          read: false,
          createdAt: now.toISOString(),
          scheduledFor: event.startAt,
          metadata: { window: '30m', startAt: event.startAt },
        });
      }
    }

    // 2. Aula em ~10 minutos (janela de 1 a 15 min antes do início)
    if (diffMinutes >= 1 && diffMinutes <= 15) {
      const duplicate = isDuplicate(
        (n) =>
          n.type === 'class_reminder' &&
          n.calendarEventId === event.id &&
          n.metadata?.window === '10m'
      );

      if (!duplicate) {
        newNotifications.push({
          id: `notif_rem10_${event.id}_${nowMs}`,
          type: 'class_reminder',
          title: 'Class Starting in 10 Minutes',
          message: `Class "${event.title}" starts in less than 10 minutes!`,
          calendarEventId: event.id,
          studentId: event.studentId,
          priority: 'critical',
          read: false,
          createdAt: now.toISOString(),
          scheduledFor: event.startAt,
          metadata: { window: '10m', startAt: event.startAt },
        });
      }
    }

    // 3. Aula iniciada (startAt <= agora e startAt >= agora - 60 min, status === 'scheduled')
    const elapsedMinutes = (nowMs - startMs) / (1000 * 60);
    if (elapsedMinutes >= 0 && elapsedMinutes <= 60 && event.status === 'scheduled') {
      const duplicate = isDuplicate(
        (n) => n.type === 'class_started' && n.calendarEventId === event.id
      );

      if (!duplicate) {
        newNotifications.push({
          id: `notif_started_${event.id}_${nowMs}`,
          type: 'class_started',
          title: 'Class Has Started',
          message: `Class "${event.title}" has started.`,
          calendarEventId: event.id,
          studentId: event.studentId,
          priority: 'high',
          read: false,
          createdAt: now.toISOString(),
          scheduledFor: event.startAt,
          metadata: { startAt: event.startAt },
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // B) REGRAS DE ESTUDANTES
  // --------------------------------------------------------------------------
  const activeStudents = students.filter((s) => s.active !== false);

  for (const student of activeStudents) {
    // 1. Aluno sem horário semanal configurado
    if (!student.schedules || student.schedules.length === 0) {
      const duplicate = isDuplicate(
        (n) => n.type === 'student_without_schedule' && n.studentId === student.id
      );

      if (!duplicate) {
        newNotifications.push({
          id: `notif_nosched_${student.id}`,
          type: 'student_without_schedule',
          title: 'Student Without Schedule',
          message: `${student.name} has no weekly class schedule set.`,
          studentId: student.id,
          priority: 'normal',
          read: false,
          createdAt: now.toISOString(),
        });
      }
    }

    // 2. Aluno sem aula registrada há X dias (Class Logs)
    let lastClassDate: Date | null = null;
    if (student.classLogs && student.classLogs.length > 0) {
      const sortedLogs = [...student.classLogs].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      if (sortedLogs[0]?.date) {
        lastClassDate = new Date(sortedLogs[0].date);
      }
    } else if (student.createdAt) {
      lastClassDate = new Date(student.createdAt);
    }

    if (lastClassDate && !isNaN(lastClassDate.getTime())) {
      const daysSinceClass = Math.floor(
        (nowMs - lastClassDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceClass >= inactiveDaysThreshold) {
        const lastClassIso = lastClassDate.toISOString().split('T')[0];
        const duplicate = isDuplicate(
          (n) =>
            n.type === 'student_inactive' &&
            n.studentId === student.id &&
            n.metadata?.lastClassDate === lastClassIso
        );

        if (!duplicate) {
          newNotifications.push({
            id: `notif_inactive_${student.id}_${lastClassIso}`,
            type: 'student_inactive',
            title: 'No Class Logs Recorded',
            message: `${student.name} has not had a recorded class in ${daysSinceClass} days.`,
            studentId: student.id,
            priority: 'normal',
            read: false,
            createdAt: now.toISOString(),
            metadata: { daysSinceClass, lastClassDate: lastClassIso },
          });
        }
      }
    }

    // ------------------------------------------------------------------------
    // C) REGRAS DE PAGAMENTO (Payment Due / Payment Overdue)
    // ------------------------------------------------------------------------
    const currentMonthYear = getMonthYearStr(now);
    const dueDay = student.dueDayOfMonth || 5;

    // Data de vencimento no mês atual
    const monthDueDate = new Date(now.getFullYear(), now.getMonth(), dueDay, 23, 59, 59);
    const dueMs = monthDueDate.getTime();

    // Verifica status de pagamento do mês atual no histórico do aluno
    const currentRecord = student.paymentHistory?.find(
      (p) => p.monthYear === currentMonthYear
    );
    const isPaid = currentRecord?.status === 'paid';
    const isRecordOverdue = currentRecord?.status === 'overdue';

    if (!isPaid) {
      const diffDaysToDue = (dueMs - nowMs) / (1000 * 60 * 60 * 24);

      // Pagamento vence amanhã (entre 0.5 e 1.8 dias até o vencimento)
      if (diffDaysToDue >= 0.5 && diffDaysToDue <= 1.8) {
        const duplicate = isDuplicate(
          (n) =>
            n.type === 'payment_due' &&
            n.studentId === student.id &&
            n.metadata?.monthYear === currentMonthYear
        );

        if (!duplicate) {
          newNotifications.push({
            id: `notif_paydue_${student.id}_${currentMonthYear}`,
            type: 'payment_due',
            title: 'Payment Due Tomorrow',
            message: `Monthly payment of ${student.currencySymbol || '$'}${
              student.monthlyFee
            } for ${student.name} is due tomorrow.`,
            studentId: student.id,
            priority: 'normal',
            read: false,
            createdAt: now.toISOString(),
            scheduledFor: monthDueDate.toISOString(),
            metadata: { monthYear: currentMonthYear, amount: student.monthlyFee },
          });
        }
      }

      // Pagamento vencido (vencimento já passou hoje e não está pago, OU marcado como overdue)
      const isPastDueDate = nowMs > dueMs;
      if (isPastDueDate || isRecordOverdue) {
        const duplicate = isDuplicate(
          (n) =>
            n.type === 'payment_overdue' &&
            n.studentId === student.id &&
            n.metadata?.monthYear === currentMonthYear
        );

        if (!duplicate) {
          newNotifications.push({
            id: `notif_payoverdue_${student.id}_${currentMonthYear}`,
            type: 'payment_overdue',
            title: 'Payment Overdue',
            message: `Monthly payment of ${student.currencySymbol || '$'}${
              student.monthlyFee
            } for ${student.name} is overdue.`,
            studentId: student.id,
            priority: 'high',
            read: false,
            createdAt: now.toISOString(),
            metadata: { monthYear: currentMonthYear, amount: student.monthlyFee },
          });
        }
      }
    }
  }

  // Se foram criadas novas notificações, combina com as existentes e salva
  if (newNotifications.length > 0) {
    const combined = [...newNotifications, ...existingNotifications];

    // Ordena por data mais recente primeiro
    combined.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    saveNotifications(combined);
    return combined;
  }

  return existingNotifications;
}
