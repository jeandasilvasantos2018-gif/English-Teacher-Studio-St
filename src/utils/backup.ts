import { Student } from '../types';
import { BackupPayload, BackupStats } from '../types/backup';

export const STORAGE_KEY = 'english_teacher_students_v6';

/**
 * Format bytes to human readable format (B, KB, MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Calculate statistical information from current local storage or students array
 */
export function calculateBackupStats(studentsOverride?: Student[]): BackupStats {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY) || '';
    const sizeBytes = new Blob([rawData]).size;
    const sizeFormatted = formatBytes(sizeBytes);

    let students: Student[] = [];
    if (studentsOverride) {
      students = studentsOverride;
    } else if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        if (Array.isArray(parsed)) {
          students = parsed;
        }
      } catch (e) {
        console.error('Error parsing raw storage data for stats:', e);
      }
    }

    const studentCount = students.length;

    let classLogsCount = 0;
    let flashcardsCount = 0;
    let sessionsCount = 0;
    const decksSet = new Set<string>();
    let lastModTimestamp = 0;

    students.forEach((std) => {
      // Check student creation date
      if (std.createdAt) {
        const t = new Date(std.createdAt).getTime();
        if (!isNaN(t) && t > lastModTimestamp) lastModTimestamp = t;
      }

      // Class Logs count & last modification
      if (Array.isArray(std.classLogs)) {
        classLogsCount += std.classLogs.length;
        std.classLogs.forEach((log) => {
          if (log.date) {
            const t = new Date(log.date).getTime();
            if (!isNaN(t) && t > lastModTimestamp) lastModTimestamp = t;
          }
        });
      }

      // Sessions (Schedule slots)
      if (Array.isArray(std.schedules)) {
        sessionsCount += std.schedules.length;
      }

      // Notes & Decks / Flashcards
      if (Array.isArray(std.notes)) {
        std.notes.forEach((note) => {
          if (note.category) decksSet.add(note.category);
          // Count grammar and homework notes as flashcards/cards
          if (note.category === 'grammar' || note.category === 'homework') {
            flashcardsCount++;
          }
          if (note.createdAt) {
            const t = new Date(note.createdAt).getTime();
            if (!isNaN(t) && t > lastModTimestamp) lastModTimestamp = t;
          }
        });
      }

      // Payment dates
      if (Array.isArray(std.paymentHistory)) {
        std.paymentHistory.forEach((pm) => {
          if (pm.paidDate) {
            const t = new Date(pm.paidDate).getTime();
            if (!isNaN(t) && t > lastModTimestamp) lastModTimestamp = t;
          }
        });
      }
    });

    const decksCount = decksSet.size > 0 ? decksSet.size : (studentCount > 0 ? 1 : 0);
    // Settings count represents configuration items (active status, fee rates, level badges)
    const settingsCount = studentCount > 0 ? studentCount * 2 + 1 : 0;

    let lastModified: string | null = null;
    if (lastModTimestamp > 0) {
      lastModified = new Date(lastModTimestamp).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return {
      sizeFormatted,
      sizeBytes,
      lastModified,
      studentCount,
      classLogsCount,
      flashcardsCount,
      decksCount,
      sessionsCount,
      settingsCount,
    };
  } catch (err) {
    console.error('Error calculating backup stats:', err);
    return {
      sizeFormatted: '0 B',
      sizeBytes: 0,
      lastModified: null,
      studentCount: 0,
      classLogsCount: 0,
      flashcardsCount: 0,
      decksCount: 0,
      sessionsCount: 0,
      settingsCount: 0,
    };
  }
}

/**
 * Export current localStorage data as a JSON file download with metadata
 */
export function exportBackupJSON(): void {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      throw new Error('No backup available.');
    }

    let parsedData: unknown = [];
    try {
      parsedData = JSON.parse(rawData);
    } catch {
      throw new Error('No backup available.');
    }

    if (!parsedData || (Array.isArray(parsedData) && parsedData.length === 0)) {
      throw new Error('No backup available.');
    }

    const payload: BackupPayload = {
      app: 'English Teacher Studio',
      version: '6',
      exportedAt: new Date().toISOString(),
      data: parsedData,
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'english-teacher-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Unable to export backup.');
  }
}

/**
 * Validate backup JSON string structure
 */
export function validateBackupJSON(jsonText: string): { valid: boolean; students: Student[] | null; error?: string } {
  if (!jsonText || !jsonText.trim()) {
    return { valid: false, students: null, error: 'Backup file is corrupted.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { valid: false, students: null, error: 'Backup file is corrupted.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, students: null, error: 'Invalid backup file.' };
  }

  let studentArray: unknown = null;

  if (Array.isArray(parsed)) {
    studentArray = parsed;
  } else if ('data' in (parsed as Record<string, unknown>)) {
    studentArray = (parsed as Record<string, unknown>).data;
  }

  if (!Array.isArray(studentArray)) {
    return { valid: false, students: null, error: 'Invalid backup file.' };
  }

  // Validate student records
  const isAllValid = studentArray.every(
    (item) => item && typeof item === 'object' && typeof (item as Record<string, unknown>).id === 'string' && typeof (item as Record<string, unknown>).name === 'string'
  );

  if (!isAllValid) {
    return { valid: false, students: null, error: 'Invalid backup file.' };
  }

  return { valid: true, students: studentArray as Student[] };
}

/**
 * Import JSON file text, validate, and write to localStorage
 */
export function importBackupJSON(jsonText: string): Student[] {
  const validation = validateBackupJSON(jsonText);
  if (!validation.valid || !validation.students) {
    throw new Error(validation.error || 'Invalid backup file.');
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validation.students));
    return validation.students;
  } catch (err) {
    console.error('Failed to write backup to localStorage:', err);
    throw new Error('Unable to import backup.');
  }
}

/**
 * Clear only the application's key from localStorage
 */
export function clearLocalDataOnly(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear local data:', err);
  }
}
