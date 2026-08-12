import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarEvent,
  CalendarEventType,
  CalendarEventStatus,
  CalendarRecurrenceType,
  Student,
} from '../types';
import {
  getEventsBetweenDates,
  getEventsForDay,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../services/calendar';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  User,
  Tag,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit3,
  ExternalLink,
  RefreshCw,
  Info,
  CalendarDays,
  MapPin,
  Check,
  Loader2,
  AlertCircle,
  Bell,
  AlignLeft,
  RotateCcw,
} from 'lucide-react';

interface CalendarViewProps {
  students: Student[];
  onSelectStudent?: (student: Student) => void;
}

type ViewModeOption = 'month' | 'week' | 'day';

const EVENT_TYPE_LABELS: Record<CalendarEventType, { label: string; bg: string; text: string; border: string }> = {
  class: { label: 'Class / Aula', bg: 'bg-indigo-50 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  consultation: { label: 'Consultation', bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  exam: { label: 'Exam / Prova', bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  personal: { label: 'Personal', bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  block: { label: 'Block / Bloqueio', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700' },
  other: { label: 'Other / Outro', bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
};

const STATUS_LABELS: Record<CalendarEventStatus, { label: string; badge: string }> = {
  scheduled: { label: 'Scheduled', badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-300' },
  completed: { label: 'Completed', badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300' },
  cancelled: { label: 'Cancelled', badge: 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-300' },
  rescheduled: { label: 'Rescheduled', badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300' },
  no_show: { label: 'No Show', badge: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border-purple-300' },
};

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

// Helper parsing date into YYYY-MM-DD
function formatDateToInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper parsing time into HH:mm
function formatTimeToInput(d: Date): string {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Calculate duration string
function getEventDurationText(startIso: string, endIso: string): string {
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  if (isNaN(s) || isNaN(e) || e <= s) return 'Invalid duration';
  const diffMinutes = Math.round((e - s) / (1000 * 60));
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const hours = Math.floor(diffMinutes / 60);
  const remMinutes = diffMinutes % 60;
  return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ students, onSelectStudent }) => {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<ViewModeOption>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Filters
  const [studentFilter, setStudentFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Data state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

  // Modals & Actions
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<CalendarEvent | null>(null);
  const [deletingEventConfirm, setDeletingEventConfirm] = useState<CalendarEvent | null>(null);

  // Toast / Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Student map for quick lookup
  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  // Map events calculation ranges
  const fetchRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'month') {
      // 1st day of month
      const firstOfMonth = new Date(year, month, 1);
      // Padded to Sunday before
      const startGrid = new Date(firstOfMonth);
      startGrid.setDate(startGrid.getDate() - startGrid.getDay());
      startGrid.setHours(0, 0, 0, 0);

      // Last day of month
      const lastOfMonth = new Date(year, month + 1, 0);
      // Padded to Saturday after
      const endGrid = new Date(lastOfMonth);
      endGrid.setDate(endGrid.getDate() + (6 - endGrid.getDay()));
      endGrid.setHours(23, 59, 59, 999);

      return { start: startGrid, end: endGrid };
    } else if (viewMode === 'week') {
      const startWeek = new Date(currentDate);
      startWeek.setDate(startWeek.getDate() - startWeek.getDay());
      startWeek.setHours(0, 0, 0, 0);

      const endWeek = new Date(startWeek);
      endWeek.setDate(endWeek.getDate() + 6);
      endWeek.setHours(23, 59, 59, 999);

      return { start: startWeek, end: endWeek };
    } else {
      const startDay = new Date(currentDate);
      startDay.setHours(0, 0, 0, 0);

      const endDay = new Date(currentDate);
      endDay.setHours(23, 59, 59, 999);

      return { start: startDay, end: endDay };
    }
  }, [currentDate, viewMode]);

  // Load events handler using calendar.ts service exclusively
  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOfflineNotice(null);

    try {
      let res;
      if (viewMode === 'day') {
        res = await getEventsForDay(currentDate, studentFilter !== 'ALL' ? studentFilter : undefined);
      } else {
        res = await getEventsBetweenDates(
          fetchRange.start,
          fetchRange.end,
          studentFilter !== 'ALL' ? studentFilter : undefined
        );
      }

      if (res.success && res.data) {
        setEvents(res.data);
        if (res.details?.includes('Offline') || res.hint) {
          setOfflineNotice(res.message || 'Running in local cache / offline mode.');
        }
      } else {
        setError(res.message || 'Failed to load calendar events.');
        if (res.data) setEvents(res.data); // fallback to cached if provided
      }
    } catch (err: unknown) {
      console.error('[CalendarView] Error loading events:', err);
      setError('Unexpected error loading calendar events.');
    } finally {
      setLoading(false);
    }
  }, [fetchRange, viewMode, currentDate, studentFilter]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Filter events client-side for type & status filters
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (typeFilter !== 'ALL' && evt.eventType !== typeFilter) return false;
      if (statusFilter !== 'ALL' && evt.status !== statusFilter) return false;
      return true;
    });
  }, [events, typeFilter, statusFilter]);

  // Date Navigation Actions
  const handleToday = () => setCurrentDate(new Date());

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  // Keyboard navigation & modal close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFormOpen(false);
        setSelectedEventForDetails(null);
        setDeletingEventConfirm(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Quick Status Changes
  const handleUpdateStatus = async (eventId: string, newStatus: CalendarEventStatus) => {
    const res = await updateCalendarEvent(eventId, { status: newStatus });
    if (res.success && res.data) {
      showToast(`Status updated to ${STATUS_LABELS[newStatus].label}`);
      if (selectedEventForDetails?.id === eventId) {
        setSelectedEventForDetails(res.data);
      }
      loadEvents();
    } else {
      showToast(`Failed to update status: ${res.message}`);
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deletingEventConfirm) return;
    const res = await deleteCalendarEvent(deletingEventConfirm.id);
    if (res.success) {
      showToast('Calendar event deleted successfully.');
      setDeletingEventConfirm(null);
      setSelectedEventForDetails(null);
      loadEvents();
    } else {
      showToast(`Error deleting event: ${res.message}`);
    }
  };

  // Header Title Formatting
  const viewTitle = useMemo(() => {
    const locale = 'en-US';
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const startWeek = new Date(currentDate);
      startWeek.setDate(startWeek.getDate() - startWeek.getDay());
      const endWeek = new Date(startWeek);
      endWeek.setDate(endWeek.getDate() + 6);

      const startMonth = startWeek.toLocaleDateString(locale, { month: 'short' });
      const endMonth = endWeek.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
      return `${startMonth} ${startWeek.getDate()} – ${endMonth} ${endWeek.getDate()}`;
    } else {
      return currentDate.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  }, [currentDate, viewMode]);

  // Helper for open form prefilled with date
  const [isOneTimeModalPreset, setIsOneTimeModalPreset] = useState<boolean>(false);

  const handleOpenNewEvent = (presetDate?: Date, isOneTime = false) => {
    setEditingEvent(null);
    setSelectedEventForDetails(null);
    setIsOneTimeModalPreset(isOneTime);
    const targetDate = presetDate || currentDate;
    setFormInitialDate(targetDate);
    setIsFormOpen(true);
  };

  const [formInitialDate, setFormInitialDate] = useState<Date>(new Date());

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 dark:border-slate-200 text-xs font-bold flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Offline / Local Cache Banner */}
      {offlineNotice && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{offlineNotice}</span>
          </div>
          <button
            onClick={loadEvents}
            className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded-lg text-[11px] font-semibold transition"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Calendar Header Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
        
        {/* Top Row: Navigation, Date Title, View Modes & New Event */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                onClick={handlePrev}
                className="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
                title="Previous"
                aria-label="Previous Period"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-3 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
              >
                Today
              </button>
              <button
                onClick={handleNext}
                className="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
                title="Next"
                aria-label="Next Period"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize ml-2 tracking-tight">
              {viewTitle}
            </h2>
          </div>

          {/* View Modes & Action Button */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Mode Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 h-8 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'month'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 h-8 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'week'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 h-8 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'day'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Day
              </button>
            </div>

            {/* Reload Button */}
            <button
              onClick={loadEvents}
              disabled={loading}
              className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
              title="Refresh events"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* One-time Class Button */}
            <button
              onClick={() => handleOpenNewEvent(undefined, true)}
              className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
              title="Add a single non-recurring class"
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>+ Add One-time Class</span>
            </button>

            {/* New Event Button */}
            <button
              onClick={() => handleOpenNewEvent(undefined, false)}
              className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>New Event</span>
            </button>
          </div>

        </div>

        {/* Bottom Row: Filters (Student, Type, Status) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          
          {/* Student Filter */}
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Students</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Filter */}
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Event Types</option>
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {/* Counter Badge */}
          <div className="ml-auto text-slate-500 dark:text-slate-400 font-medium text-[11px]">
            Showing <span className="font-bold text-slate-800 dark:text-white">{filteredEvents.length}</span> event{filteredEvents.length === 1 ? '' : 's'}
          </div>

        </div>

      </div>

      {/* Main Content Area / Errors / Loading */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading calendar events...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-8 text-center shadow-xs space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="text-sm font-bold text-rose-800 dark:text-rose-200">Error Loading Events</h3>
          <p className="text-xs text-rose-600 dark:text-rose-300 max-w-md mx-auto">{error}</p>
          <button
            onClick={loadEvents}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <>
          {/* Render Active View */}
          {viewMode === 'month' && (
            <MonthViewGrid
              currentDate={currentDate}
              events={filteredEvents}
              studentMap={studentMap}
              onSelectDate={(d) => {
                setCurrentDate(d);
                handleOpenNewEvent(d);
              }}
              onSelectEvent={(evt) => setSelectedEventForDetails(evt)}
            />
          )}

          {viewMode === 'week' && (
            <WeekViewGrid
              currentDate={currentDate}
              events={filteredEvents}
              studentMap={studentMap}
              onSelectDate={(d) => {
                setCurrentDate(d);
                handleOpenNewEvent(d);
              }}
              onSelectEvent={(evt) => setSelectedEventForDetails(evt)}
            />
          )}

          {viewMode === 'day' && (
            <DayViewList
              currentDate={currentDate}
              events={filteredEvents}
              studentMap={studentMap}
              onOpenNewEvent={() => handleOpenNewEvent(currentDate)}
              onSelectEvent={(evt) => setSelectedEventForDetails(evt)}
            />
          )}
        </>
      )}

      {/* MODAL: Event Form (New / Edit) */}
      {isFormOpen && (
        <CalendarEventFormModal
          isOpen={isFormOpen}
          initialDate={formInitialDate}
          eventToEdit={editingEvent}
          students={students}
          isOneTimePreset={isOneTimeModalPreset}
          onClose={() => setIsFormOpen(false)}
          onSaved={(savedEvent) => {
            setIsFormOpen(false);
            showToast(editingEvent ? 'Event updated successfully.' : 'New event created successfully.');
            loadEvents();
          }}
        />
      )}

      {/* MODAL: Event Details */}
      {selectedEventForDetails && (
        <EventDetailsModal
          event={selectedEventForDetails}
          studentMap={studentMap}
          onClose={() => setSelectedEventForDetails(null)}
          onEdit={() => {
            setEditingEvent(selectedEventForDetails);
            setIsFormOpen(true);
          }}
          onDelete={() => setDeletingEventConfirm(selectedEventForDetails)}
          onStatusChange={(status) => handleUpdateStatus(selectedEventForDetails.id, status)}
        />
      )}

      {/* MODAL: Delete Confirmation */}
      {deletingEventConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete this calendar event?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEventConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ============================================================================
// SUB-COMPONENT: MONTH VIEW GRID
// ============================================================================
interface MonthViewGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  studentMap: Map<string, Student>;
  onSelectDate: (d: Date) => void;
  onSelectEvent: (evt: CalendarEvent) => void;
}

const MonthViewGrid: React.FC<MonthViewGridProps> = ({
  currentDate,
  events,
  studentMap,
  onSelectDate,
  onSelectEvent,
}) => {
  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate 35 or 42 grid cells
  const gridDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstOfMonth.getDay();

    const startDate = new Date(firstOfMonth);
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const days: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean; dateKey: string }> = [];
    const todayStr = formatDateToInput(new Date());

    for (let i = 0; i < 35; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const isCurrentMonth = d.getMonth() === month;
      const dateKey = formatDateToInput(d);
      const isToday = dateKey === todayStr;

      days.push({ date: d, isCurrentMonth, isToday, dateKey });
    }

    return days;
  }, [currentDate]);

  // Group events by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const dateKey = formatDateToInput(new Date(e.startAt));
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(e);
    });
    return map;
  }, [events]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
      
      {/* Days of Week Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-center text-[11px] font-bold text-slate-600 dark:text-slate-400 py-2.5">
        {weekDayNames.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Grid Cells */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
        {gridDays.map(({ date, isCurrentMonth, isToday, dateKey }) => {
          const dayEvents = eventsByDate.get(dateKey) || [];
          const maxVisible = 2;
          const visibleEvents = dayEvents.slice(0, maxVisible);
          const extraCount = dayEvents.length - maxVisible;

          return (
            <div
              key={dateKey}
              onClick={() => onSelectDate(date)}
              className={`min-h-[110px] sm:min-h-[125px] p-1.5 transition cursor-pointer flex flex-col justify-between group ${
                !isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 dark:text-slate-600' : 'hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10'
              }`}
            >
              {/* Day Cell Top Header */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    isToday
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isCurrentMonth
                      ? 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-600'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {date.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event Cards */}
              <div className="space-y-1 flex-1 overflow-hidden">
                {visibleEvents.map((evt) => {
                  const typeInfo = EVENT_TYPE_LABELS[evt.eventType] || EVENT_TYPE_LABELS.other;
                  const startTime = new Date(evt.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const student = evt.studentId ? studentMap.get(evt.studentId) : null;
                  const isRescheduledClass = evt.isRescheduled || evt.status === 'rescheduled';
                  const isOneTimeClass = evt.recurrenceType === 'none' && evt.studentId && !isRescheduledClass;

                  return (
                    <div
                      key={evt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(evt);
                      }}
                      style={{ borderLeftColor: isRescheduledClass ? '#f59e0b' : (evt.color || '#6366f1') }}
                      className={`text-[10px] leading-snug p-1 rounded-md border-l-3 transition truncate shadow-2xs hover:opacity-90 ${
                        isRescheduledClass ? 'bg-amber-100/90 dark:bg-amber-950/70 text-amber-950 dark:text-amber-100 font-medium' : `${typeInfo.bg} ${typeInfo.text}`
                      }`}
                    >
                      <div className="font-semibold truncate flex items-center gap-1">
                        {!evt.allDay && <span className="opacity-75 font-mono">{startTime}</span>}
                        <span className="truncate">{evt.title}</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] opacity-90 truncate mt-0.5">
                        {student && <span className="truncate">👤 {student.name}</span>}
                        {isRescheduledClass && (
                          <span className="font-extrabold text-amber-700 dark:text-amber-300 ml-auto shrink-0 bg-amber-200/80 dark:bg-amber-900/80 px-1 rounded text-[8px]">
                            REAGENDADA
                          </span>
                        )}
                        {isOneTimeClass && !isRescheduledClass && (
                          <span className="font-bold text-emerald-700 dark:text-emerald-300 ml-auto shrink-0 bg-emerald-100/80 dark:bg-emerald-950 px-1 rounded text-[8px]">
                            AVULSA
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {extraCount > 0 && (
                  <div
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(date);
                    }}
                  >
                    +{extraCount} more
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};

// ============================================================================
// SUB-COMPONENT: WEEK VIEW GRID
// ============================================================================
interface WeekViewGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  studentMap: Map<string, Student>;
  onSelectDate: (d: Date) => void;
  onSelectEvent: (evt: CalendarEvent) => void;
}

const WeekViewGrid: React.FC<WeekViewGridProps> = ({
  currentDate,
  events,
  studentMap,
  onSelectDate,
  onSelectEvent,
}) => {
  const weekDays = useMemo(() => {
    const startWeek = new Date(currentDate);
    startWeek.setDate(startWeek.getDate() - startWeek.getDay());
    startWeek.setHours(0, 0, 0, 0);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startWeek);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const todayStr = formatDateToInput(new Date());

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
      
      {/* 7 Columns Container */}
      <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
        {weekDays.map((day) => {
          const dateKey = formatDateToInput(day);
          const isToday = dateKey === todayStr;

          const dayEvents = events
            .filter((e) => formatDateToInput(new Date(e.startAt)) === dateKey)
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

          return (
            <div key={dateKey} className="min-h-[220px] flex flex-col p-3 space-y-2">
              
              {/* Day Header */}
              <div
                onClick={() => onSelectDate(day)}
                className={`p-2 rounded-xl text-center cursor-pointer transition flex sm:flex-col items-center justify-between sm:justify-center ${
                  isToday
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700'
                }`}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="text-sm font-extrabold">{day.getDate()}</span>
              </div>

              {/* Day Events List */}
              <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[400px]">
                {dayEvents.length === 0 ? (
                  <div
                    onClick={() => onSelectDate(day)}
                    className="h-full min-h-[80px] border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-[11px] text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition cursor-pointer"
                  >
                    + Add Event
                  </div>
                ) : (
                  dayEvents.map((evt) => {
                    const student = evt.studentId ? studentMap.get(evt.studentId) : null;
                    const startTime = new Date(evt.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const endTime = new Date(evt.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const typeInfo = EVENT_TYPE_LABELS[evt.eventType] || EVENT_TYPE_LABELS.other;
                    const statusInfo = STATUS_LABELS[evt.status] || STATUS_LABELS.scheduled;

                    return (
                      <div
                        key={evt.id}
                        onClick={() => onSelectEvent(evt)}
                        style={{ borderLeftColor: evt.color || '#6366f1' }}
                        className={`p-2 rounded-xl border-l-4 text-xs space-y-1 shadow-2xs hover:shadow-xs transition cursor-pointer ${typeInfo.bg} ${typeInfo.border}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {evt.title}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{startTime} – {endTime}</span>
                        </div>

                        {student && (
                          <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate flex items-center gap-1">
                            <User className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>{student.name}</span>
                          </div>
                        )}

                        <div className="pt-0.5 flex items-center justify-between gap-1 flex-wrap">
                          {evt.isRescheduled || evt.status === 'rescheduled' ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300">
                              Rescheduled Class
                            </span>
                          ) : (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${statusInfo.badge}`}>
                              {statusInfo.label}
                            </span>
                          )}

                          {evt.recurrenceType === 'none' && evt.studentId && !(evt.isRescheduled || evt.status === 'rescheduled') && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                              One-time
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};

// ============================================================================
// SUB-COMPONENT: DAY VIEW LIST
// ============================================================================
interface DayViewListProps {
  currentDate: Date;
  events: CalendarEvent[];
  studentMap: Map<string, Student>;
  onOpenNewEvent: () => void;
  onSelectEvent: (evt: CalendarEvent) => void;
}

const DayViewList: React.FC<DayViewListProps> = ({
  currentDate,
  events,
  studentMap,
  onOpenNewEvent,
  onSelectEvent,
}) => {
  const dateKey = formatDateToInput(currentDate);

  const dayEvents = useMemo(() => {
    return events
      .filter((e) => formatDateToInput(new Date(e.startAt)) === dateKey)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [events, dateKey]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Events for {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {dayEvents.length} event{dayEvents.length === 1 ? '' : 's'} scheduled
          </p>
        </div>

        <button
          onClick={onOpenNewEvent}
          className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Event</span>
        </button>
      </div>

      {/* Events List */}
      {dayEvents.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            No events scheduled for this day.
          </p>
          <button
            onClick={onOpenNewEvent}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline"
          >
            + Create a new event
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {dayEvents.map((evt) => {
            const student = evt.studentId ? studentMap.get(evt.studentId) : null;
            const startTime = new Date(evt.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const endTime = new Date(evt.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const duration = getEventDurationText(evt.startAt, evt.endAt);
            const typeInfo = EVENT_TYPE_LABELS[evt.eventType] || EVENT_TYPE_LABELS.other;
            const statusInfo = STATUS_LABELS[evt.status] || STATUS_LABELS.scheduled;

            return (
              <div
                key={evt.id}
                onClick={() => onSelectEvent(evt)}
                style={{ borderLeftColor: evt.color || '#6366f1' }}
                className={`p-4 rounded-xl border-l-4 border-t border-r border-b border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40`}
              >
                {/* Time & Duration */}
                <div className="flex items-center gap-3 sm:w-48 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                      {startTime} – {endTime}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Duration: {duration}
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {evt.title}
                    </h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${typeInfo.bg} ${typeInfo.text} ${typeInfo.border} border`}>
                      {typeInfo.label}
                    </span>
                    {(evt.isRescheduled || evt.status === 'rescheduled') ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300">
                        Rescheduled Class
                      </span>
                    ) : (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusInfo.badge}`}>
                        {statusInfo.label}
                      </span>
                    )}

                    {evt.recurrenceType === 'none' && evt.studentId && !(evt.isRescheduled || evt.status === 'rescheduled') && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                        One-time Class
                      </span>
                    )}
                  </div>

                  {student && (
                    <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Student: {student.name}</span>
                    </div>
                  )}

                  {evt.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                      {evt.description}
                    </p>
                  )}

                  {evt.locationUrl && (
                    <a
                      href={evt.locationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold underline pt-0.5"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{evt.locationUrl}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Action Arrow */}
                <div className="shrink-0 flex items-center text-slate-400">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

// ============================================================================
// MODAL: FORM (NEW / EDIT CALENDAR EVENT)
// ============================================================================
interface CalendarEventFormModalProps {
  isOpen: boolean;
  initialDate: Date;
  eventToEdit: CalendarEvent | null;
  students: Student[];
  isOneTimePreset?: boolean;
  onClose: () => void;
  onSaved: (event: CalendarEvent) => void;
}

const CalendarEventFormModal: React.FC<CalendarEventFormModalProps> = ({
  isOpen,
  initialDate,
  eventToEdit,
  students,
  isOneTimePreset = false,
  onClose,
  onSaved,
}) => {
  if (!isOpen) return null;

  const isEdit = !!eventToEdit;

  // Initial values setup
  const initStart = eventToEdit ? new Date(eventToEdit.startAt) : initialDate;
  const initEnd = eventToEdit ? new Date(eventToEdit.endAt) : new Date(initialDate.getTime() + 60 * 60 * 1000);

  const [title, setTitle] = useState<string>(eventToEdit?.title || '');
  const [studentId, setStudentId] = useState<string>(eventToEdit?.studentId || '');
  const [eventType, setEventType] = useState<CalendarEventType>(eventToEdit?.eventType || 'class');
  const [status, setStatus] = useState<CalendarEventStatus>(eventToEdit?.status || 'scheduled');
  const [isRescheduled, setIsRescheduled] = useState<boolean>(
    eventToEdit?.isRescheduled || eventToEdit?.status === 'rescheduled' || false
  );

  const [dateStr, setDateStr] = useState<string>(formatDateToInput(initStart));
  const [startTimeStr, setStartTimeStr] = useState<string>(formatTimeToInput(initStart));
  const [endTimeStr, setEndTimeStr] = useState<string>(formatTimeToInput(initEnd));

  const [allDay, setAllDay] = useState<boolean>(eventToEdit?.allDay || false);
  const [description, setDescription] = useState<string>(eventToEdit?.description || '');
  const [locationUrl, setLocationUrl] = useState<string>(eventToEdit?.locationUrl || '');
  const [color, setColor] = useState<string>(eventToEdit?.color || (isOneTimePreset ? '#10b981' : '#6366f1'));

  const [recurrenceType, setRecurrenceType] = useState<CalendarRecurrenceType>(
    isOneTimePreset ? 'none' : eventToEdit?.recurrenceType || 'none'
  );
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(eventToEdit?.recurrenceInterval || 1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>(eventToEdit?.recurrenceEndDate || '');

  const [reminderMinutes, setReminderMinutes] = useState<number>(() => {
    if (eventToEdit?.reminderMinutes && Array.isArray(eventToEdit.reminderMinutes)) {
      return eventToEdit.reminderMinutes[0] ?? 15;
    }
    if (typeof (eventToEdit?.reminderMinutes as any) === 'number') {
      return eventToEdit.reminderMinutes as unknown as number;
    }
    return 15;
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Auto-fill title logic when student selected
  const handleStudentChange = (newStudentId: string) => {
    setStudentId(newStudentId);
    if (newStudentId) {
      const student = students.find((s) => s.id === newStudentId);
      if (student) {
        if (isRescheduled) {
          setTitle(`${student.name} — Rescheduled Class`);
        } else if (
          !title.trim() ||
          title.startsWith('Class —') ||
          title.startsWith('Aula —') ||
          title.includes('One-time') ||
          title.includes('Rescheduled')
        ) {
          setTitle(`Class — ${student.name}`);
        }
      }
    }
  };

  const handleEventTypeChange = (newType: CalendarEventType) => {
    setEventType(newType);
    if (newType === 'class' && studentId) {
      const student = students.find((s) => s.id === studentId);
      if (student && (!title.trim() || title.startsWith('Class —') || title.startsWith('Aula —'))) {
        setTitle(isRescheduled ? `${student.name} — Rescheduled Class` : `Class — ${student.name}`);
      }
    }
  };

  const handleRescheduledToggle = (checked: boolean) => {
    setIsRescheduled(checked);
    if (checked) {
      setStatus('rescheduled');
      if (studentId) {
        const student = students.find((s) => s.id === studentId);
        if (student) {
          setTitle(`${student.name} — Rescheduled Class`);
        }
      } else if (!title || title === 'Class' || title.startsWith('Class —')) {
        setTitle('Rescheduled Class');
      }
    } else {
      if (status === 'rescheduled') {
        setStatus('scheduled');
      }
      if (studentId) {
        const student = students.find((s) => s.id === studentId);
        if (student && (title.includes('Rescheduled Class') || title.includes('Aula Reagendada'))) {
          setTitle(`Class — ${student.name}`);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Title is required.');
      return;
    }

    // Parse startAt and endAt ISO strings
    const startIso = new Date(`${dateStr}T${startTimeStr}:00`).toISOString();
    const endIso = new Date(`${dateStr}T${endTimeStr}:00`).toISOString();

    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();

    if (isNaN(startMs) || isNaN(endMs)) {
      setErrorMsg('Invalid date or time provided.');
      return;
    }

    if (endMs <= startMs) {
      setErrorMsg('End time must be strictly after start time.');
      return;
    }

    setSaving(true);

    try {
      const finalStatus = isRescheduled ? 'rescheduled' : status;
      const effectiveRecurrence = isOneTimePreset ? 'none' : recurrenceType;

      const payload: Partial<CalendarEvent> = {
        title: title.trim(),
        studentId: studentId || undefined,
        eventType,
        status: finalStatus,
        isRescheduled,
        startAt: startIso,
        endAt: endIso,
        allDay,
        description: description.trim() || undefined,
        locationUrl: locationUrl.trim() || undefined,
        color,
        recurrenceType: effectiveRecurrence,
        recurrenceInterval: effectiveRecurrence !== 'none' ? recurrenceInterval : undefined,
        recurrenceEndDate: effectiveRecurrence !== 'none' && recurrenceEndDate ? recurrenceEndDate : undefined,
        reminderMinutes: [reminderMinutes],
      };

      let res;
      if (isEdit && eventToEdit) {
        res = await updateCalendarEvent(eventToEdit.id, payload);
      } else {
        res = await createCalendarEvent(payload as Omit<CalendarEvent, 'id'>);
      }

      if (res.success && res.data) {
        onSaved(res.data);
      } else {
        setErrorMsg(res.message || 'Error saving calendar event.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(`Failed to save event: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isOneTimePreset ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400'
            }`}>
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEdit
                  ? 'Edit Calendar Event'
                  : isOneTimePreset
                  ? 'New One-time Class / Aula Avulsa'
                  : 'New Calendar Event'}
              </h3>
              {isOneTimePreset && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Single lesson occurrence (No recurring schedule created)
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Banner for One-Time Class */}
        {(isOneTimePreset || recurrenceType === 'none') && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-300 p-3 rounded-xl text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">One-time Class (Aula Avulsa):</span> Takes place strictly on this date. It will <strong className="underline decoration-emerald-400">not</strong> alter the student's recurring weekly schedule or create duplicate future classes.
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Mark as Rescheduled Option */}
          <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-amber-900 dark:text-amber-200">
              <input
                type="checkbox"
                checked={isRescheduled}
                onChange={(e) => handleRescheduledToggle(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
              />
              <span>Mark as Rescheduled Class / Aula reagendada</span>
            </label>
            {isRescheduled && (
              <span className="text-[10px] px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold rounded-md uppercase tracking-wider">
                Rescheduled
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Event Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Class — Alex Rivera or Rescheduled Class — Alex"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Student & Event Type Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Student
              </label>
              <select
                value={studentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="">-- No Student Assigned --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.englishLevel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => handleEventTypeChange(e.target.value as CalendarEventType)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date, Start Time, End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Start Time
              </label>
              <input
                type="time"
                required
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                End Time
              </label>
              <input
                type="time"
                required
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* All Day Checkbox & Status */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-semibold">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>All Day Event</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400 font-semibold">Status:</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CalendarEventStatus)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location URL */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Location or Meeting Link (URL)
            </label>
            <input
              type="text"
              placeholder="e.g. https://meet.google.com/abc-defg-hij or Room 302"
              value={locationUrl}
              onChange={(e) => setLocationUrl(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Color Presets */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Event Color Theme
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition transform hover:scale-110 flex items-center justify-center text-white ${
                    color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-80'
                  }`}
                >
                  {color === c && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Recurrence Settings */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 dark:text-slate-200">
                Recurrence / Recorrência
              </label>
              <select
                value={recurrenceType}
                onChange={(e) => setRecurrenceType(e.target.value as CalendarRecurrenceType)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="none">None / Sem repetição</option>
                <option value="daily">Daily / Diária</option>
                <option value="weekly">Weekly / Semanal</option>
                <option value="biweekly">Biweekly / Quinzenal</option>
                <option value="monthly">Monthly / Mensal</option>
              </select>
            </div>

            {recurrenceType !== 'none' && (
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">
                    Interval (Every N {recurrenceType})
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">
                    Recurrence End Date
                  </label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Description & Reminder */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Description / Notes
              </label>
              <textarea
                rows={2}
                placeholder="Lesson topics, homework checklist, or notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Reminder
              </label>
              <select
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value={5}>5 min before</option>
                <option value={10}>10 min before</option>
                <option value={15}>15 min before</option>
                <option value={30}>30 min before</option>
                <option value={60}>1 hour before</option>
                <option value={1440}>1 day before</option>
              </select>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{isEdit ? 'Save Changes' : 'Create Event'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

// ============================================================================
// MODAL: EVENT DETAILS
// ============================================================================
interface EventDetailsModalProps {
  event: CalendarEvent;
  studentMap: Map<string, Student>;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: CalendarEventStatus) => void;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  studentMap,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const student = event.studentId ? studentMap.get(event.studentId) : null;
  const startDate = new Date(event.startAt);
  const endDate = new Date(event.endAt);

  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const duration = getEventDurationText(event.startAt, event.endAt);

  const typeInfo = EVENT_TYPE_LABELS[event.eventType] || EVENT_TYPE_LABELS.other;
  const statusInfo = STATUS_LABELS[event.status] || STATUS_LABELS.scheduled;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
        
        {/* Header / Color Bar */}
        <div
          className="h-2.5 rounded-full -mt-2 -mx-2 mb-2"
          style={{ backgroundColor: event.isRescheduled || event.status === 'rescheduled' ? '#f59e0b' : (event.color || '#6366f1') }}
        />

        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${typeInfo.bg} ${typeInfo.text} ${typeInfo.border} border`}>
                {typeInfo.label}
              </span>
              {(event.isRescheduled || event.status === 'rescheduled') && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300">
                  Rescheduled Class
                </span>
              )}
              {event.recurrenceType === 'none' && student && !(event.isRescheduled || event.status === 'rescheduled') && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                  One-time Class
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {event.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Grid */}
        <div className="space-y-3 text-xs border-y border-slate-100 dark:border-slate-800 py-3">
          
          {/* Status Badge & Quick Change */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Status:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${statusInfo.badge}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Date & Time */}
          <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
            <Clock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">{formattedDate}</div>
              <div className="text-slate-500 font-mono">{startTime} – {endTime} ({duration})</div>
            </div>
          </div>

          {/* Student */}
          {student && (
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <User className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <span className="font-semibold">Student:</span> {student.name}{' '}
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-bold">
                  {student.englishLevel}
                </span>
              </div>
            </div>
          )}

          {/* Location / Meeting URL */}
          {event.locationUrl && (
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
              <a
                href={event.locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold underline flex items-center gap-1 truncate"
              >
                <span className="truncate">{event.locationUrl}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}

          {/* Recurrence & Reminder */}
          {(event.recurrenceType && event.recurrenceType !== 'none') && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <RotateCcw className="w-4 h-4 text-purple-500 shrink-0" />
              <span>
                Recurrence: <strong className="capitalize">{event.recurrenceType}</strong>
              </span>
            </div>
          )}

          {event.reminderMinutes && (Array.isArray(event.reminderMinutes) ? event.reminderMinutes.length > 0 : true) && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Bell className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Reminder set for {Array.isArray(event.reminderMinutes) ? event.reminderMinutes.join(', ') : event.reminderMinutes} minutes prior
              </span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="pt-1">
              <div className="flex items-center gap-1 text-slate-500 font-semibold mb-1">
                <AlignLeft className="w-3.5 h-3.5" />
                <span>Notes & Description:</span>
              </div>
              <p className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

        </div>

        {/* Quick Status Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Mark:</span>
          {event.status !== 'completed' && (
            <button
              onClick={() => onStatusChange('completed')}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg font-semibold flex items-center gap-1 border border-emerald-200/80 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed</span>
            </button>
          )}

          {event.status !== 'rescheduled' && (
            <button
              onClick={() => onStatusChange('rescheduled')}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded-lg font-semibold flex items-center gap-1 border border-amber-200/80 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rescheduled</span>
            </button>
          )}

          {event.status !== 'cancelled' && (
            <button
              onClick={() => onStatusChange('cancelled')}
              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-lg font-semibold flex items-center gap-1 border border-rose-200/80 transition"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Event</span>
            </button>
          )}
        </div>

        {/* Bottom Actions: Edit & Delete */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition flex items-center gap-1"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Event</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
