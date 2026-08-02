import { EnglishLevel, LevelInfo, PaymentStatus, Student, DayOfWeek } from '../types';

export const CEFR_LEVELS: Record<EnglishLevel, LevelInfo> = {
  A1: {
    code: 'A1',
    name: 'Beginner / Starter',
    description: 'Can understand and use familiar everyday expressions and basic phrases.',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    badgeText: 'A1 Beginner',
    border: 'border-emerald-300 dark:border-emerald-700',
  },
  A2: {
    code: 'A2',
    name: 'Elementary',
    description: 'Can communicate in simple and routine tasks requiring basic exchange.',
    badgeBg: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
    badgeText: 'A2 Elementary',
    border: 'border-teal-300 dark:border-teal-700',
  },
  B1: {
    code: 'B1',
    name: 'Intermediate',
    description: 'Can understand main points of clear input on familiar matters.',
    badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
    badgeText: 'B1 Intermediate',
    border: 'border-sky-300 dark:border-sky-700',
  },
  B2: {
    code: 'B2',
    name: 'Upper-Intermediate',
    description: 'Can understand complex text and interact with a degree of fluency.',
    badgeBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
    badgeText: 'B2 Upper-Inter',
    border: 'border-indigo-300 dark:border-indigo-700',
  },
  C1: {
    code: 'C1',
    name: 'Advanced',
    description: 'Can express ideas fluently and spontaneously without searching for expressions.',
    badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    badgeText: 'C1 Advanced',
    border: 'border-purple-300 dark:border-purple-700',
  },
  C2: {
    code: 'C2',
    name: 'Proficient / Master',
    description: 'Can understand with ease virtually everything heard or read.',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    badgeText: 'C2 Proficient',
    border: 'border-amber-300 dark:border-amber-700',
  },
};

export const DAYS_ORDER: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function getCurrentMonthYearKey(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

export function formatMonthYearLabel(monthYearKey: string): string {
  const [yyyy, mm] = monthYearKey.split('-');
  if (!yyyy || !mm) return monthYearKey;
  const date = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getCurrentMonthPaymentStatus(student: Student): {
  status: PaymentStatus;
  record?: Student['paymentHistory'][number];
  dueDateStr: string;
} {
  const currentKey = getCurrentMonthYearKey();
  const record = student.paymentHistory.find((p) => p.monthYear === currentKey);

  const today = new Date();
  const currentDay = today.getDate();
  const dueDay = student.dueDayOfMonth || 5;

  const monthName = today.toLocaleDateString('en-US', { month: 'short' });
  const dueDateStr = `${monthName} ${dueDay}`;

  if (record && record.status === 'paid') {
    return { status: 'paid', record, dueDateStr };
  }

  // If marked explicitly overdue in record
  if (record && record.status === 'overdue') {
    return { status: 'overdue', record, dueDateStr };
  }

  // If past due day of current month and no paid record
  if (currentDay > dueDay) {
    return { status: 'overdue', record, dueDateStr };
  }

  return { status: 'pending', record, dueDateStr };
}

export function formatCurrency(amount: number, symbol = '$'): string {
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function getNextClassInfo(student: Student): {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  formattedText: string;
} | null {
  if (!student.schedules || student.schedules.length === 0) return null;

  const daysMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const now = new Date();
  const currentDayNum = now.getDay(); // 0 is Sunday
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Sort student schedules by proximity
  let bestSlot: { slot: Student['schedules'][0]; daysUntil: number; totalMin: number } | null = null;

  for (const slot of student.schedules) {
    const targetDayNum = daysMap[slot.day];
    const [h, m] = slot.startTime.split(':').map((v) => parseInt(v, 10) || 0);
    const slotMinutes = h * 60 + m;

    let daysUntil = targetDayNum - currentDayNum;
    if (daysUntil < 0) {
      daysUntil += 7;
    } else if (daysUntil === 0 && slotMinutes < currentMinutes) {
      daysUntil = 7; // Next week
    }

    const totalMin = daysUntil * 24 * 60 + slotMinutes;

    if (!bestSlot || totalMin < bestSlot.totalMin) {
      bestSlot = { slot, daysUntil, totalMin };
    }
  }

  if (!bestSlot) return null;

  const { slot, daysUntil } = bestSlot;
  let dayLabel = slot.day;
  if (daysUntil === 0) dayLabel = 'Today';
  else if (daysUntil === 1) dayLabel = 'Tomorrow';

  return {
    day: slot.day,
    startTime: slot.startTime,
    endTime: slot.endTime,
    formattedText: `${dayLabel} at ${slot.startTime}`,
  };
}

export function getInitials(name: string): string {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
