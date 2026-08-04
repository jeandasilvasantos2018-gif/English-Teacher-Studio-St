import { Student } from '../types';

export interface BackupMetadata {
  app: string;
  version: string;
  exportedAt: string;
}

export interface BackupPayload {
  app?: string;
  version?: string;
  exportedAt?: string;
  data: Student[] | Record<string, unknown> | unknown;
}

export interface BackupStats {
  sizeFormatted: string;
  sizeBytes: number;
  lastModified: string | null;
  studentCount: number;
  classLogsCount: number;
  flashcardsCount: number;
  decksCount: number;
  sessionsCount: number;
  settingsCount: number;
}
