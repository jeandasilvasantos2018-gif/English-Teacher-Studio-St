import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  CalendarEvent,
  CalendarEventType,
  CalendarEventStatus,
  CalendarRecurrenceType,
} from '../types';

// ============================================================================
// 1. ESTRUTURA DO BANCO DE DADOS (SNAKE_CASE) E RESULTADO PADRÃO
// ============================================================================

export interface CalendarEventRow {
  id?: string;
  local_id?: string | null;
  user_id?: string | null;
  student_id?: string | null;
  title: string;
  description?: string | null;
  start_at: string;
  end_at: string;
  event_type: string;
  status: string;
  location_url?: string | null;
  color?: string | null;
  all_day?: boolean | null;
  recurrence_type?: string | null;
  recurrence_interval?: number | null;
  recurrence_end_date?: string | null;
  reminder_minutes?: number | null;
  source_schedule_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CalendarServiceResult<T = unknown> {
  success: boolean;
  data: T | null;
  error: unknown;
  message: string;
  details: string | null;
  hint: string | null;
  code?: string | null;
}

const LOCAL_STORAGE_CALENDAR_KEY = 'english_teacher_calendar_events_v1';

const ALLOWED_EVENT_TYPES: CalendarEventType[] = [
  'class',
  'consultation',
  'exam',
  'personal',
  'block',
  'other',
];

const ALLOWED_STATUSES: CalendarEventStatus[] = [
  'scheduled',
  'completed',
  'cancelled',
  'rescheduled',
  'no_show',
];

const ALLOWED_RECURRENCE_TYPES: CalendarRecurrenceType[] = [
  'none',
  'daily',
  'weekly',
  'biweekly',
  'monthly',
];

// Helper para validar UUID v4 / v1
function isUUID(str?: string | null): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Helper para padronizar retornos do service
function createResult<T>(
  success: boolean,
  data: T | null,
  message: string,
  error: any = null,
  details: string | null = null,
  hint: string | null = null,
  code: string | null = null
): CalendarServiceResult<T> {
  const errCode = code || (error && typeof error === 'object' && 'code' in error ? String(error.code) : null);
  const errDetails = details || (error && typeof error === 'object' && 'details' in error ? String(error.details || '') : null) || null;
  const errHint = hint || (error && typeof error === 'object' && 'hint' in error ? String(error.hint || '') : null) || null;

  return {
    success,
    data,
    error,
    message,
    details: errDetails,
    hint: errHint,
    code: errCode,
  };
}

// ============================================================================
// 2. CAMADA DE OFFLINE & CACHE LOCAL
// ============================================================================

function readLocalCalendarCache(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CALENDAR_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[Calendar Cache] Erro ao ler cache local:', err);
    return [];
  }
}

function writeLocalCalendarCache(events: CalendarEvent[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_CALENDAR_KEY, JSON.stringify(events));
  } catch (err) {
    console.error('[Calendar Cache] Erro ao salvar cache local:', err);
  }
}

function updateLocalCacheItem(event: CalendarEvent): void {
  const current = readLocalCalendarCache();
  const index = current.findIndex((e) => e.id === event.id);
  if (index >= 0) {
    current[index] = event;
  } else {
    current.push(event);
  }
  writeLocalCalendarCache(current);
}

function removeLocalCacheItem(id: string): void {
  const current = readLocalCalendarCache();
  const filtered = current.filter((e) => e.id !== id);
  writeLocalCalendarCache(filtered);
}

// ============================================================================
// 3. CAMADA DE TRANSFORMAÇÃO (SNAKE_CASE <-> CAMELCASE)
// ============================================================================

export function mapRowToEvent(row: CalendarEventRow): CalendarEvent {
  const localId = row.local_id && row.local_id.trim() !== '' ? row.local_id : (row.id || `evt_${Date.now()}`);
  const remoteUuid = isUUID(row.id) ? row.id : undefined;

  return {
    id: localId,
    remoteId: remoteUuid,
    userId: row.user_id || undefined,
    studentId: row.student_id || undefined,
    title: row.title || 'Untitled Event',
    description: row.description || undefined,
    startAt: row.start_at,
    endAt: row.end_at,
    eventType: (ALLOWED_EVENT_TYPES.includes(row.event_type as CalendarEventType)
      ? row.event_type
      : 'other') as CalendarEventType,
    status: (ALLOWED_STATUSES.includes(row.status as CalendarEventStatus)
      ? row.status
      : 'scheduled') as CalendarEventStatus,
    locationUrl: row.location_url || undefined,
    color: row.color || undefined,
    allDay: row.all_day ?? false,
    recurrenceType: (ALLOWED_RECURRENCE_TYPES.includes(
      row.recurrence_type as CalendarRecurrenceType
    )
      ? row.recurrence_type
      : 'none') as CalendarRecurrenceType,
    recurrenceInterval: row.recurrence_interval || undefined,
    recurrenceEndDate: row.recurrence_end_date || undefined,
    reminderMinutes: row.reminder_minutes || undefined,
    sourceScheduleId: row.source_schedule_id || undefined,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

export function mapEventToRow(
  event: Partial<CalendarEvent>,
  userId?: string
): Partial<CalendarEventRow> {
  const row: Partial<CalendarEventRow> = {};

  // IMPORTANTE: Nunca enviar IDs no formato evt_... para a coluna id (UUID)
  if (event.remoteId && isUUID(event.remoteId)) {
    row.id = event.remoteId;
  } else if (event.id && isUUID(event.id)) {
    row.id = event.id;
  }

  // local_id é sempre o ID textual usado pelo frontend (ex: evt_...)
  if (event.id) {
    row.local_id = event.id;
  }

  const uId = userId || event.userId;
  if (uId) {
    row.user_id = uId;
  }

  if (event.studentId !== undefined) row.student_id = event.studentId || null;
  if (event.title !== undefined) row.title = event.title;
  if (event.description !== undefined) row.description = event.description || null;
  if (event.startAt !== undefined) row.start_at = event.startAt;
  if (event.endAt !== undefined) row.end_at = event.endAt;
  if (event.eventType !== undefined) row.event_type = event.eventType;
  if (event.status !== undefined) row.status = event.status;
  if (event.locationUrl !== undefined) row.location_url = event.locationUrl || null;
  if (event.color !== undefined) row.color = event.color || null;
  if (event.allDay !== undefined) row.all_day = event.allDay;
  if (event.recurrenceType !== undefined)
    row.recurrence_type = event.recurrenceType || 'none';
  if (event.recurrenceInterval !== undefined)
    row.recurrence_interval = event.recurrenceInterval || null;
  if (event.recurrenceEndDate !== undefined)
    row.recurrence_end_date = event.recurrenceEndDate || null;
  if (event.reminderMinutes !== undefined)
    row.reminder_minutes = event.reminderMinutes || null;
  if (event.sourceScheduleId !== undefined)
    row.source_schedule_id = event.sourceScheduleId || null;
  if (event.createdAt !== undefined) row.created_at = event.createdAt;
  if (event.updatedAt !== undefined) row.updated_at = event.updatedAt;

  return row;
}

// ============================================================================
// 4. VALIDAÇÕES
// ============================================================================

export function validateCalendarEvent(
  eventData: Partial<CalendarEvent>,
  isUpdate = false
): { valid: boolean; message?: string } {
  // 1. Título
  if (!isUpdate || eventData.title !== undefined) {
    if (!eventData.title || typeof eventData.title !== 'string' || !eventData.title.trim()) {
      return { valid: false, message: 'Title is required and cannot be empty.' };
    }
  }

  // 2. Datas e Horários
  if (eventData.startAt !== undefined) {
    const startDate = new Date(eventData.startAt);
    if (isNaN(startDate.getTime())) {
      return { valid: false, message: 'Invalid startAt date format.' };
    }
  }

  if (eventData.endAt !== undefined) {
    const endDate = new Date(eventData.endAt);
    if (isNaN(endDate.getTime())) {
      return { valid: false, message: 'Invalid endAt date format.' };
    }
  }

  if (eventData.startAt !== undefined && eventData.endAt !== undefined) {
    const startMs = new Date(eventData.startAt).getTime();
    const endMs = new Date(eventData.endAt).getTime();
    if (endMs <= startMs) {
      return { valid: false, message: 'endAt must be strictly greater than startAt.' };
    }
  }

  // 3. Tipo de Evento
  if (eventData.eventType !== undefined) {
    if (!ALLOWED_EVENT_TYPES.includes(eventData.eventType)) {
      return {
        valid: false,
        message: `Invalid eventType '${eventData.eventType}'. Allowed: ${ALLOWED_EVENT_TYPES.join(', ')}`,
      };
    }
  }

  // 4. Status
  if (eventData.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(eventData.status)) {
      return {
        valid: false,
        message: `Invalid status '${eventData.status}'. Allowed: ${ALLOWED_STATUSES.join(', ')}`,
      };
    }
  }

  // 5. Recorrência
  if (eventData.recurrenceType !== undefined && eventData.recurrenceType !== 'none') {
    if (!ALLOWED_RECURRENCE_TYPES.includes(eventData.recurrenceType)) {
      return {
        valid: false,
        message: `Invalid recurrenceType '${eventData.recurrenceType}'. Allowed: ${ALLOWED_RECURRENCE_TYPES.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

// ============================================================================
// 5. CAMADA DE REENVO E SINCRONIZAÇÃO DE PENDÊNCIAS
// ============================================================================

/**
 * Reenvia e sincroniza eventos pendentes do cache local com o Supabase.
 */
export async function syncPendingCalendarEvents(): Promise<CalendarServiceResult<number>> {
  if (!isSupabaseConfigured) {
    return createResult(false, 0, 'Supabase not configured.');
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return createResult(false, 0, 'User not authenticated.');
    }

    const cachedEvents = readLocalCalendarCache();
    if (cachedEvents.length === 0) {
      return createResult(true, 0, 'No local events to sync.');
    }

    let syncedCount = 0;
    const updatedCache = [...cachedEvents];

    for (let i = 0; i < updatedCache.length; i++) {
      const event = updatedCache[i];
      const rowData = mapEventToRow(event, user.id);
      rowData.local_id = event.id;
      rowData.user_id = user.id;

      const { data, error } = await supabase
        .from('calendar_events')
        .upsert([rowData], { onConflict: 'user_id,local_id' })
        .select('*')
        .maybeSingle();

      if (!error && data) {
        if (data.id && isUUID(data.id)) {
          updatedCache[i] = {
            ...event,
            remoteId: data.id,
          };
        }
        syncedCount++;
      }
    }

    writeLocalCalendarCache(updatedCache);
    return createResult(true, syncedCount, `Successfully synced ${syncedCount} calendar events.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown exception';
    return createResult(false, 0, `Failed to sync pending events: ${msg}`, err);
  }
}

// ============================================================================
// 6. CAMADA DE SERVIÇO SUPABASE & INTERFACE PÚBLICA
// ============================================================================

/**
 * Busca todos os eventos do calendário com suporte a filtros opcionais.
 */
export async function getCalendarEvents(filters?: {
  studentId?: string;
  eventType?: string;
  status?: string;
}): Promise<CalendarServiceResult<CalendarEvent[]>> {
  if (!isSupabaseConfigured) {
    const cached = readLocalCalendarCache();
    let filtered = cached;
    if (filters?.studentId) filtered = filtered.filter((e) => e.studentId === filters.studentId);
    if (filters?.eventType) filtered = filtered.filter((e) => e.eventType === filters.eventType);
    if (filters?.status) filtered = filtered.filter((e) => e.status === filters.status);

    return createResult(
      true,
      filtered,
      'Loaded events from local cache (Supabase environment variables not set).'
    );
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      const cached = readLocalCalendarCache();
      return createResult(
        true,
        cached,
        'User not authenticated. Returning local cache.',
        userError
      );
    }

    // Tenta sincronizar eventos pendentes do cache primeiro
    await syncPendingCalendarEvents();

    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .order('start_at', { ascending: true });

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId);
    }
    if (filters?.eventType) {
      query = query.eq('event_type', filters.eventType);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Calendar Service] Error fetching events:', error);
      const cached = readLocalCalendarCache();
      return createResult(
        false,
        cached,
        `Failed to fetch calendar events: ${error.message}`,
        error
      );
    }

    const events = (data || []).map(mapRowToEvent);
    writeLocalCalendarCache(events);

    return createResult(true, events, 'Calendar events fetched successfully.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown exception occurred.';
    console.error('[Calendar Service] Exception in getCalendarEvents:', err);
    const cached = readLocalCalendarCache();
    return createResult(false, cached, `Critical error fetching events: ${msg}`, err);
  }
}

/**
 * Busca um único evento do calendário pelo ID.
 */
export async function getCalendarEvent(
  id: string
): Promise<CalendarServiceResult<CalendarEvent | null>> {
  if (!id) {
    return createResult(false, null, 'Event ID is required.');
  }

  if (!isSupabaseConfigured) {
    const cached = readLocalCalendarCache();
    const found = cached.find((e) => e.id === id) || null;
    return createResult(
      true,
      found,
      found ? 'Event found in local cache.' : 'Event not found in local cache.'
    );
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const cached = readLocalCalendarCache();
      const found = cached.find((e) => e.id === id) || null;
      return createResult(true, found, 'Unauthenticated user. Checked local cache.');
    }

    let query = supabase.from('calendar_events').select('*').eq('user_id', user.id);
    if (isUUID(id)) {
      query = query.eq('id', id);
    } else {
      query = query.eq('local_id', id);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('[Calendar Service] Error fetching single event:', error);
      return createResult(
        false,
        null,
        `Failed to retrieve event: ${error.message}`,
        error
      );
    }

    if (!data) {
      const cached = readLocalCalendarCache();
      const found = cached.find((e) => e.id === id) || null;
      return createResult(true, found, found ? 'Event found in local cache.' : 'Calendar event not found.');
    }

    const event = mapRowToEvent(data);
    updateLocalCacheItem(event);

    return createResult(true, event, 'Calendar event retrieved successfully.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown exception occurred.';
    return createResult(false, null, `Error fetching event: ${msg}`, err);
  }
}

/**
 * Cria um novo evento no calendário.
 */
export async function createCalendarEvent(
  eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<CalendarServiceResult<CalendarEvent>> {
  const validation = validateCalendarEvent(eventData, false);
  if (!validation.valid) {
    return createResult(
      false,
      null,
      `Validation failed: ${validation.message}`
    );
  }

  const generatedId = eventData.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();

  const newEvent: CalendarEvent = {
    ...eventData,
    id: generatedId,
    createdAt: now,
    updatedAt: now,
  };

  updateLocalCacheItem(newEvent);

  if (!isSupabaseConfigured) {
    return createResult(
      true,
      newEvent,
      'Calendar event saved locally (Supabase not configured).'
    );
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return createResult(
        true,
        newEvent,
        'Calendar event saved locally (user unauthenticated).',
        userError
      );
    }

    newEvent.userId = user.id;

    // Converte para formato do banco garantindo que id não leve evt_...
    const rowData = mapEventToRow(newEvent, user.id);

    const { data, error } = await supabase
      .from('calendar_events')
      .upsert([rowData], { onConflict: 'user_id,local_id' })
      .select('*')
      .single();

    if (error) {
      console.error('[Calendar Service] Error creating event in Supabase:', error);
      return createResult(
        false,
        newEvent,
        `Saved locally, but failed to sync to Supabase: ${error.message}`,
        error
      );
    }

    if (data) {
      const createdEvent = mapRowToEvent(data);
      createdEvent.id = generatedId; // Preserva ID local textual
      if (isUUID(data.id)) {
        createdEvent.remoteId = data.id;
      }
      updateLocalCacheItem(createdEvent);
      return createResult(true, createdEvent, 'Calendar event created successfully.');
    }

    return createResult(true, newEvent, 'Calendar event created successfully.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown exception occurred.';
    return createResult(
      false,
      newEvent,
      `Created event locally, error syncing to Supabase: ${msg}`,
      err
    );
  }
}

/**
 * Atualiza um evento de calendário existente pelo ID.
 */
export async function updateCalendarEvent(
  id: string,
  updates: Partial<CalendarEvent>
): Promise<CalendarServiceResult<CalendarEvent>> {
  if (!id) {
    return createResult(false, null, 'Event ID is required for updates.');
  }

  const validation = validateCalendarEvent(updates, true);
  if (!validation.valid) {
    return createResult(false, null, `Validation failed: ${validation.message}`);
  }

  const cached = readLocalCalendarCache();
  const existingIndex = cached.findIndex((e) => e.id === id);

  let updatedEvent: CalendarEvent;
  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    updatedEvent = {
      ...cached[existingIndex],
      ...updates,
      id, // Preserva ID local
      updatedAt: now,
    };
  } else {
    updatedEvent = {
      id,
      title: updates.title || 'Untitled Event',
      startAt: updates.startAt || now,
      endAt: updates.endAt || new Date(Date.now() + 3600000).toISOString(),
      eventType: updates.eventType || 'other',
      status: updates.status || 'scheduled',
      ...updates,
      updatedAt: now,
    };
  }

  updateLocalCacheItem(updatedEvent);

  if (!isSupabaseConfigured) {
    return createResult(
      true,
      updatedEvent,
      'Calendar event updated locally (Supabase not configured).'
    );
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return createResult(
        true,
        updatedEvent,
        'Updated locally (user not logged in).',
        userError
      );
    }

    const rowUpdates = mapEventToRow({ ...updates, updatedAt: now }, user.id);
    rowUpdates.local_id = id;
    rowUpdates.user_id = user.id;

    let query;
    if (updatedEvent.remoteId && isUUID(updatedEvent.remoteId)) {
      query = supabase
        .from('calendar_events')
        .update(rowUpdates)
        .eq('id', updatedEvent.remoteId)
        .eq('user_id', user.id)
        .select('*')
        .maybeSingle();
    } else {
      query = supabase
        .from('calendar_events')
        .upsert([rowUpdates], { onConflict: 'user_id,local_id' })
        .select('*')
        .maybeSingle();
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Calendar Service] Error updating event in Supabase:', error);
      return createResult(
        false,
        updatedEvent,
        `Updated locally, but failed to sync to Supabase: ${error.message}`,
        error
      );
    }

    if (data) {
      const finalEvent = mapRowToEvent(data);
      finalEvent.id = id;
      if (isUUID(data.id)) {
        finalEvent.remoteId = data.id;
      }
      updateLocalCacheItem(finalEvent);
      return createResult(true, finalEvent, 'Calendar event updated successfully.');
    }

    return createResult(true, updatedEvent, 'Calendar event updated successfully.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown exception occurred.';
    return createResult(
      false,
      updatedEvent,
      `Updated locally, error syncing update: ${msg}`,
      err
    );
  }
}

/**
 * Remove um evento do calendário pelo ID.
 */
export async function deleteCalendarEvent(
  id: string
): Promise<CalendarServiceResult<boolean>> {
  if (!id) {
    return createResult(false, false, 'Event ID is required for deletion.');
  }

  const cached = readLocalCalendarCache();
  const found = cached.find((e) => e.id === id);

  removeLocalCacheItem(id);

  if (!isSupabaseConfigured) {
    return createResult(
      true,
      true,
      'Event deleted locally (Supabase not configured).'
    );
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return createResult(
        true,
        true,
        'Event deleted locally (user unauthenticated).',
        userError
      );
    }

    let query;
    if (found?.remoteId && isUUID(found.remoteId)) {
      query = supabase
        .from('calendar_events')
        .delete()
        .eq('id', found.remoteId)
        .eq('user_id', user.id);
    } else if (isUUID(id)) {
      query = supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
    } else {
      query = supabase
        .from('calendar_events')
        .delete()
        .eq('user_id', user.id)
        .eq('local_id', id);
    }

    const { error } = await query;

    if (error) {
      console.error('[Calendar Service] Error deleting event in Supabase:', error);
      return createResult(
        false,
        true,
        `Deleted locally, but failed to remove from Supabase: ${error.message}`,
        error
      );
    }

    return createResult(true, true, 'Calendar event deleted successfully.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown exception occurred.';
    return createResult(
      false,
      true,
      `Deleted locally, error removing from Supabase: ${msg}`,
      err
    );
  }
}

/**
 * Retorna os eventos de um dia específico (de 00:00:00 até 23:59:59.999).
 */
export async function getEventsForDay(
  date: string | Date,
  studentId?: string
): Promise<CalendarServiceResult<CalendarEvent[]>> {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return createResult(false, [], 'Invalid date parameter provided.');
  }

  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
  const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();

  return getEventsBetweenDates(startOfDay, endOfDay, studentId);
}

/**
 * Retorna os eventos dentro de um intervalo de datas [startDate, endDate].
 */
export async function getEventsBetweenDates(
  startDate: string | Date,
  endDate: string | Date,
  studentId?: string
): Promise<CalendarServiceResult<CalendarEvent[]>> {
  const startIso = new Date(startDate).toISOString();
  const endIso = new Date(endDate).toISOString();

  if (isNaN(new Date(startIso).getTime()) || isNaN(new Date(endIso).getTime())) {
    return createResult(false, [], 'Invalid startDate or endDate provided.');
  }

  if (new Date(endIso).getTime() < new Date(startIso).getTime()) {
    return createResult(false, [], 'endDate cannot be earlier than startDate.');
  }

  if (!isSupabaseConfigured) {
    const cached = readLocalCalendarCache();
    const filtered = cached.filter((e) => {
      const eStart = new Date(e.startAt).getTime();
      const eEnd = new Date(e.endAt).getTime();
      const rangeStart = new Date(startIso).getTime();
      const rangeEnd = new Date(endIso).getTime();

      const overlaps = eStart <= rangeEnd && eEnd >= rangeStart;
      if (!overlaps) return false;
      if (studentId && e.studentId !== studentId) return false;
      return true;
    });

    return createResult(true, filtered, 'Filtered events from local cache.');
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      const cached = readLocalCalendarCache();
      const filtered = cached.filter((e) => {
        const eStart = new Date(e.startAt).getTime();
        const eEnd = new Date(e.endAt).getTime();
        const rangeStart = new Date(startIso).getTime();
        const rangeEnd = new Date(endIso).getTime();
        return eStart <= rangeEnd && eEnd >= rangeStart && (!studentId || e.studentId === studentId);
      });
      return createResult(true, filtered, 'Unauthenticated user. Filtered local cache.');
    }

    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_at', startIso)
      .lte('start_at', endIso)
      .order('start_at', { ascending: true });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Calendar Service] Error getting events between dates:', error);
      const cached = readLocalCalendarCache();
      return createResult(
        false,
        cached,
        `Failed to fetch date range events: ${error.message}`,
        error
      );
    }

    const events = (data || []).map(mapRowToEvent);
    return createResult(true, events, 'Date range events fetched successfully.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return createResult(false, [], `Error querying events between dates: ${msg}`, err);
  }
}

/**
 * Retorna os próximos eventos a partir do momento atual (ou data especificada).
 */
export async function getUpcomingEvents(
  limit = 10,
  studentId?: string
): Promise<CalendarServiceResult<CalendarEvent[]>> {
  const nowIso = new Date().toISOString();

  if (!isSupabaseConfigured) {
    const cached = readLocalCalendarCache();
    const nowMs = Date.now();
    const upcoming = cached
      .filter((e) => new Date(e.startAt).getTime() >= nowMs && (!studentId || e.studentId === studentId))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, limit);

    return createResult(true, upcoming, 'Upcoming events loaded from local cache.');
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      const cached = readLocalCalendarCache();
      const nowMs = Date.now();
      const upcoming = cached
        .filter((e) => new Date(e.startAt).getTime() >= nowMs && (!studentId || e.studentId === studentId))
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        .slice(0, limit);

      return createResult(true, upcoming, 'Unauthenticated user. Loaded from local cache.');
    }

    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_at', nowIso)
      .order('start_at', { ascending: true })
      .limit(limit);

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Calendar Service] Error fetching upcoming events:', error);
      const cached = readLocalCalendarCache();
      return createResult(
        false,
        cached.slice(0, limit),
        `Failed to fetch upcoming events: ${error.message}`,
        error
      );
    }

    const events = (data || []).map(mapRowToEvent);
    return createResult(true, events, 'Upcoming events fetched successfully.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown exception';
    return createResult(false, [], `Error fetching upcoming events: ${msg}`, err);
  }
}
