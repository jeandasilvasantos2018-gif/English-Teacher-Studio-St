import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  Student,
} from '../types';
import {
  getNotifications,
  generateNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
} from '../services/notifications';
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  X,
  Clock,
  PlayCircle,
  CreditCard,
  AlertCircle,
  UserX,
  CalendarX,
  Gift,
  Info,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface NotificationCenterProps {
  students?: Student[];
  onSelectStudent?: (studentId: string) => void;
  onNavigateToCalendar?: () => void;
  onNavigateToPayments?: () => void;
}

type FilterCategory = 'all' | 'classes' | 'payments' | 'students' | 'system';

// Priority weight helper for sorting
const PRIORITY_WEIGHTS: Record<NotificationPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

// Priority badge style helper
const PRIORITY_BADGES: Record<
  NotificationPriority,
  { label: string; badge: string; border: string }
> = {
  critical: {
    label: 'CRITICAL',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border-rose-300 dark:border-rose-800 font-extrabold animate-pulse',
    border: 'border-l-4 border-l-rose-500',
  },
  high: {
    label: 'HIGH',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 border-amber-300 dark:border-amber-800 font-bold',
    border: 'border-l-4 border-l-amber-500',
  },
  normal: {
    label: 'NORMAL',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-medium',
    border: 'border-l-2 border-l-indigo-400 dark:border-l-indigo-600',
  },
  low: {
    label: 'LOW',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 border-slate-200 dark:border-slate-800 font-normal',
    border: 'border-l border-l-slate-300 dark:border-l-slate-700',
  },
};

// Formata data em formato relativo amigável
function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Se foi hoje
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return `Today at ${timeStr}`;
  }

  // Se foi ontem
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return `Yesterday at ${timeStr}`;
  }

  if (diffDays < 7) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    return `${dayName} at ${timeStr}`;
  }

  const dayNum = date.getDate();
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });
  return `${dayNum} ${monthName}`;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  students,
  onSelectStudent,
  onNavigateToCalendar,
  onNavigateToPayments,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sincroniza e recarrega notificações
  const syncNotifications = useCallback(() => {
    try {
      generateNotifications({ students });
      const current = getNotifications();
      setNotifications(current);
    } catch (err) {
      console.error('[NotificationCenter] Error syncing notifications:', err);
    }
  }, [students]);

  // Efeitos de inicialização, escutadores de eventos e polling
  useEffect(() => {
    // 1. Executa na montagem inicial
    syncNotifications();

    // 2. Evento ao focar janela ou mudar visibilidade
    const handleFocus = () => syncNotifications();
    const handleVisibilityChange = () => {
      if (!document.hidden) syncNotifications();
    };

    // 3. Escuta eventos customizados de atualização de alunos e calendário
    const handleStudentsUpdated = () => syncNotifications();
    const handleCalendarUpdated = () => syncNotifications();
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'english_teacher_notifications_v1' ||
        e.key === 'english_teacher_calendar_events_v1' ||
        e.key === 'english_teacher_students_v1'
      ) {
        syncNotifications();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('students_updated', handleStudentsUpdated);
    window.addEventListener('calendar_updated', handleCalendarUpdated);
    window.addEventListener('storage', handleStorageChange);

    // 4. Polling periódico de 60 segundos
    const intervalId = setInterval(syncNotifications, 60000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('students_updated', handleStudentsUpdated);
      window.removeEventListener('calendar_updated', handleCalendarUpdated);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, [syncNotifications]);

  // Fechar ao pressionar ESC ou clicar fora
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Quantidade de não lidas
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Quantidade de lidas
  const readCount = useMemo(() => {
    return notifications.filter((n) => n.read).length;
  }, [notifications]);

  // Texto formatado do badge
  const badgeText = useMemo(() => {
    if (unreadCount === 0) return null;
    if (unreadCount > 99) return '99+';
    return String(unreadCount);
  }, [unreadCount]);

  // Filtra e ordena notificações
  const filteredAndSortedNotifications = useMemo(() => {
    // 1. Filtragem por categoria
    const filtered = notifications.filter((n) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'classes') {
        return n.type === 'class_reminder' || n.type === 'class_started';
      }
      if (activeFilter === 'payments') {
        return n.type === 'payment_due' || n.type === 'payment_overdue';
      }
      if (activeFilter === 'students') {
        return (
          n.type === 'student_inactive' ||
          n.type === 'student_without_schedule' ||
          n.type === 'birthday'
        );
      }
      if (activeFilter === 'system') {
        return n.type === 'system';
      }
      return true;
    });

    // 2. Ordenação: Não lidas primeiro -> Prioridade -> Data mais recente
    return filtered.sort((a, b) => {
      // Regra 1: Não lidas primeiro
      if (a.read !== b.read) {
        return a.read ? 1 : -1;
      }
      // Regra 2: Prioridade maior primeiro
      const pA = PRIORITY_WEIGHTS[a.priority] || 1;
      const pB = PRIORITY_WEIGHTS[b.priority] || 1;
      if (pA !== pB) {
        return pB - pA;
      }
      // Regra 3: Data mais recente primeiro
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notifications, activeFilter]);

  // Contagens por categoria para os botões de filtro
  const categoryCounts = useMemo(() => {
    const counts = {
      all: notifications.length,
      classes: 0,
      payments: 0,
      students: 0,
      system: 0,
    };
    notifications.forEach((n) => {
      if (n.type === 'class_reminder' || n.type === 'class_started') counts.classes++;
      else if (n.type === 'payment_due' || n.type === 'payment_overdue') counts.payments++;
      else if (
        n.type === 'student_inactive' ||
        n.type === 'student_without_schedule' ||
        n.type === 'birthday'
      )
        counts.students++;
      else if (n.type === 'system') counts.system++;
    });
    return counts;
  }, [notifications]);

  // Ações de gerenciamento
  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = markAsRead(id);
    setNotifications(updated);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = deleteNotification(id);
    setNotifications(updated);
  };

  const handleMarkAllAsRead = () => {
    const updated = markAllAsRead();
    setNotifications(updated);
  };

  const handleClearRead = () => {
    const updated = clearReadNotifications();
    setNotifications(updated);
  };

  // Navegação contextual ao clicar na notificação
  const handleItemClick = (notification: Notification) => {
    // Marcar como lida se ainda não foi
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // Contextual navigation
    if (notification.calendarEventId && onNavigateToCalendar) {
      onNavigateToCalendar();
      setIsOpen(false);
    } else if (
      (notification.type === 'payment_due' || notification.type === 'payment_overdue') &&
      onNavigateToPayments
    ) {
      onNavigateToPayments();
      setIsOpen(false);
    } else if (notification.studentId && onSelectStudent) {
      onSelectStudent(notification.studentId);
      setIsOpen(false);
    }
  };

  // Renderizador do ícone de acordo com o tipo
  const renderTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'class_reminder':
        return <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />;
      case 'class_started':
        return <PlayCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'payment_due':
        return <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'payment_overdue':
        return <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'student_inactive':
        return <UserX className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />;
      case 'student_without_schedule':
        return <CalendarX className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
      case 'birthday':
        return <Gift className="w-4 h-4 text-pink-600 dark:text-pink-400 shrink-0" />;
      case 'system':
      default:
        return <Info className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="relative inline-block">
      {/* TRIGGER BUTTON (SINO DE NOTIFICAÇÕES) */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open notifications"
        aria-expanded={isOpen}
        title={`Notifications (${unreadCount} unread)`}
        className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
          isOpen
            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/30'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <Bell className="w-5 h-5" />

        {/* UNREAD BADGE */}
        {badgeText && (
          <span
            aria-live="polite"
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs border-2 border-white dark:border-slate-900 leading-none animate-in fade-in zoom-in"
          >
            {badgeText}
          </span>
        )}
      </button>

      {/* NOTIFICATION PANEL (FLYOUT DROPDOWN DESKTOP & ADAPTED MOBILE DRAWER) */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications Panel"
          className="fixed inset-x-2 top-16 z-50 md:absolute md:inset-auto md:right-0 md:top-12 w-auto md:w-[410px] max-h-[85vh] md:max-h-[620px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* PANEL HEADER */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 leading-none">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold">
                      {unreadCount} unread
                    </span>
                  )}
                </h3>
              </div>
            </div>

            {/* Panel Header Actions */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                title="Mark all as read"
                className="px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>

              <button
                type="button"
                onClick={handleClearRead}
                disabled={readCount === 0}
                title="Clear read notifications"
                className="px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear read</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close notifications"
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* FILTER TABS */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1 overflow-x-auto text-xs shrink-0 no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>All</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeFilter === 'all'
                    ? 'bg-indigo-500/40 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {categoryCounts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('classes')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === 'classes'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Classes</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeFilter === 'classes'
                    ? 'bg-indigo-500/40 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {categoryCounts.classes}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('payments')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === 'payments'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Payments</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeFilter === 'payments'
                    ? 'bg-indigo-500/40 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {categoryCounts.payments}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('students')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === 'students'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Students</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeFilter === 'students'
                    ? 'bg-indigo-500/40 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {categoryCounts.students}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('system')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === 'system'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>System</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeFilter === 'system'
                    ? 'bg-indigo-500/40 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {categoryCounts.system}
              </span>
            </button>
          </div>

          {/* NOTIFICATION LIST / EMPTY STATE */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1">
            {filteredAndSortedNotifications.length === 0 ? (
              /* EMPTY STATE */
              <div className="py-12 px-4 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                  <BellOff className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No notifications
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You're all caught up.
                </p>
              </div>
            ) : (
              /* ITEMS LIST */
              filteredAndSortedNotifications.map((n) => {
                const priorityInfo = PRIORITY_BADGES[n.priority] || PRIORITY_BADGES.normal;
                const timeAgo = formatRelativeTime(n.createdAt);

                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`group relative p-3 rounded-xl transition cursor-pointer flex items-start gap-3 ${
                      priorityInfo.border
                    } ${
                      n.read
                        ? 'bg-white dark:bg-slate-900 opacity-75 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        : 'bg-indigo-50/40 dark:bg-indigo-950/30 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50'
                    }`}
                  >
                    {/* TYPE ICON CONTAINER */}
                    <div className="mt-0.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {renderTypeIcon(n.type)}
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs font-bold truncate ${
                            n.read
                              ? 'text-slate-700 dark:text-slate-300'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {n.title}
                        </h4>

                        {/* PRIORITY & READ STATUS INDICATOR */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {n.priority !== 'normal' && n.priority !== 'low' && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-md uppercase border ${priorityInfo.badge}`}
                            >
                              {priorityInfo.label}
                            </span>
                          )}

                          {!n.read && (
                            <span
                              className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0"
                              title="Unread"
                            />
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug line-clamp-2">
                        {n.message}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        <span>{timeAgo}</span>

                        {/* HOVER / ITEM ACTIONS */}
                        <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.read && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkAsRead(n.id, e)}
                              title="Mark as read"
                              className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-md transition"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleDelete(n.id, e)}
                            title="Delete notification"
                            className="p-1 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-md transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
