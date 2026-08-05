export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface LevelInfo {
  code: EnglishLevel;
  name: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  border: string;
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface ClassScheduleSlot {
  id: string;
  day: DayOfWeek;
  startTime: string; // "14:00"
  endTime: string;   // "15:00"
  locationUrl?: string; // e.g. "Google Meet" or "In-Person"
}

export type PaymentStatus = 'paid' | 'pending' | 'overdue';

export interface MonthlyPaymentRecord {
  id: string;
  monthYear: string; // "2026-08"
  amount: number;
  status: PaymentStatus;
  paidDate?: string; // ISO date string
  method?: 'Bank Transfer' | 'Cash' | 'PayPal' | 'Credit Card' | 'Pix' | 'Other';
  notes?: string;
}

export interface StudentNote {
  id: string;
  createdAt: string; // ISO date string
  updatedAt?: string;
  category: 'lesson' | 'homework' | 'grammar' | 'general' | 'reminder';
  title: string;
  content: string;
  pinned?: boolean;
}

export interface ClassSessionLog {
  id: string;
  classNumber: number;
  date: string; // ISO string
  durationMinutes: number;
  topic?: string;
  grammarFocus?: string;
  notes?: string;
  homeworkAssigned?: string;
  attended: boolean;
}

export type ClassLog = ClassSessionLog;

export interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  englishLevel: EnglishLevel;
  targetGoal?: string; // e.g. "IELTS 7.5", "Business Negotiation", "Fluency for travel"
  
  // Schedule
  schedules: ClassScheduleSlot[];
  
  // Class Counter
  currentClassNumber: number; // e.g. 15 (next class will be #16)
  classLogs: ClassSessionLog[];
  
  // Financial / Payment controls
  monthlyFee: number; // e.g. 150 ($ or teacher currency)
  currencySymbol: string; // "$", "€", "R$", "£"
  dueDayOfMonth: number; // e.g. 5 (paid on 5th of each month)
  paymentHistory: MonthlyPaymentRecord[];
  
  // Notes
  notes: StudentNote[];
  
  // General status
  active: boolean;
  createdAt: string;
}

export type FilterLevel = 'ALL' | EnglishLevel;
export type FilterPayment = 'ALL' | 'paid' | 'pending' | 'overdue';
export type FilterDay = 'ALL' | DayOfWeek;

export type ViewMode = 'grid' | 'table' | 'weekly' | 'payments' | 'availability' | 'backup' | 'supabase_test' | 'login' | 'calendar';

export type CalendarEventType = 'class' | 'consultation' | 'exam' | 'personal' | 'block' | 'other';
export type CalendarEventStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
export type CalendarRecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type NotificationType =
  | 'class_reminder'
  | 'class_started'
  | 'payment_due'
  | 'payment_overdue'
  | 'student_inactive'
  | 'student_without_schedule'
  | 'birthday'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  studentId?: string;
  calendarEventId?: string;
  priority: NotificationPriority;
  read: boolean;
  createdAt: string;
  scheduledFor?: string;
  metadata?: Record<string, unknown>;
}

export interface CalendarEvent {
  id: string;
  remoteId?: string;
  userId?: string;
  studentId?: string;
  title: string;
  description?: string;
  startAt: string; // ISO date string
  endAt: string;   // ISO date string
  eventType: CalendarEventType;
  status: CalendarEventStatus;
  locationUrl?: string;
  color?: string;
  allDay?: boolean;
  recurrenceType?: CalendarRecurrenceType;
  recurrenceInterval?: number;
  recurrenceEndDate?: string;
  reminderMinutes?: number;
  sourceScheduleId?: string;
  createdAt?: string;
  updatedAt?: string;
}
