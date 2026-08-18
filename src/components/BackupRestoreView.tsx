import React, { useState, useEffect, useRef } from 'react';
import { Student } from '../types';
import { BackupStats } from '../types/backup';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { migrateLocalStorageToSupabase, getStudentsFromSupabase } from '../services/sync';
import { saveStudents } from '../utils/storage';
import {
  calculateBackupStats,
  exportBackupJSON,
  importBackupJSON,
  clearLocalDataOnly,
} from '../utils/backup';
import {
  Download,
  Upload,
  HardDrive,
  Trash2,
  AlertTriangle,
  Users,
  BookOpen,
  Calendar,
  Layers,
  Settings,
  Clock,
  Database,
  FileCheck2,
  Loader2,
  X,
  FileJson,
  ShieldAlert,
  Cloud,
  CloudUpload,
  CloudDownload,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react';

interface BackupRestoreViewProps {
  students: Student[];
  onStudentsUpdated: (updatedStudents: Student[]) => void;
  onShowToast: (message: string) => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  students,
  onStudentsUpdated,
  onShowToast,
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<BackupStats>(() => calculateBackupStats(students));
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cloud Sync state
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isRestoringCloud, setIsRestoringCloud] = useState(false);
  const [cloudSyncMessage, setCloudSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-calculate stats when students prop changes
  useEffect(() => {
    setStats(calculateBackupStats(students));
  }, [students]);

  // Handle Cloud Sync (Local -> Supabase)
  const handleSyncWithSupabase = async () => {
    setIsSyncingCloud(true);
    setCloudSyncMessage(null);
    try {
      const res = await migrateLocalStorageToSupabase();
      if (res.success) {
        const msg = `Dados sincronizados com sucesso (${res.count ?? 0} alunos enviados).`;
        setCloudSyncMessage({
          type: 'success',
          text: msg,
        });
        onShowToast(msg);
      } else {
        const msg = res.message || res.error || 'Erro ao sincronizar com Supabase.';
        setCloudSyncMessage({
          type: 'error',
          text: msg,
        });
        onShowToast(msg);
      }
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : 'Erro inesperado durante a sincronização.';
      setCloudSyncMessage({ type: 'error', text: errorText });
      onShowToast(errorText);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Handle Restore from Supabase (Supabase -> Local)
  const handleRestoreFromSupabase = async () => {
    setIsRestoringCloud(true);
    setCloudSyncMessage(null);
    try {
      const { data, error } = await getStudentsFromSupabase();
      if (error) {
        setCloudSyncMessage({
          type: 'error',
          text: `Erro ao restaurar do Supabase: ${error}`,
        });
        onShowToast(`Erro ao restaurar: ${error}`);
      } else if (data) {
        saveStudents(data);
        onStudentsUpdated(data);
        setStats(calculateBackupStats(data));
        const msg = `Restauração concluída! ${data.length} aluno(s) obtidos do Supabase e salvos localmente (chave: english_teacher_students_v6).`;
        setCloudSyncMessage({
          type: 'success',
          text: msg,
        });
        onShowToast(`Restauração do Supabase concluída (${data.length} alunos).`);
      }
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : 'Erro inesperado na restauração.';
      setCloudSyncMessage({ type: 'error', text: errorText });
      onShowToast(errorText);
    } finally {
      setIsRestoringCloud(false);
    }
  };

  // Handle Export Backup
  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        exportBackupJSON();
        onShowToast('Backup exportado com sucesso.');
      } catch (err: unknown) {
        if (err instanceof Error) {
          onShowToast(err.message);
        } else {
          onShowToast('Unable to export backup.');
        }
      } finally {
        setIsExporting(false);
      }
    }, 300);
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        onShowToast('Invalid backup file.');
        return;
      }
      setSelectedFile(file);
    }
  };

  // Process Import
  const handleImport = () => {
    if (!selectedFile) {
      onShowToast('Invalid backup file.');
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      setTimeout(() => {
        try {
          const content = e.target?.result as string;
          const updatedStudents = importBackupJSON(content);
          onStudentsUpdated(updatedStudents);
          setStats(calculateBackupStats(updatedStudents));
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          onShowToast('Backup imported successfully.');
        } catch (err: unknown) {
          if (err instanceof Error) {
            onShowToast(err.message);
          } else {
            onShowToast('Unable to import backup.');
          }
        } finally {
          setIsImporting(false);
        }
      }, 400);
    };

    reader.onerror = () => {
      setIsImporting(false);
      onShowToast('Unable to import backup.');
    };

    reader.readAsText(selectedFile);
  };

  // Handle Confirm Clear Data
  const handleConfirmClear = () => {
    setIsDeleting(true);
    setTimeout(() => {
      try {
        clearLocalDataOnly();
        onStudentsUpdated([]);
        setStats(calculateBackupStats([]));
        setIsClearModalOpen(false);
        onShowToast('Dados locais removidos com sucesso.');
      } catch (err) {
        console.error(err);
        onShowToast('Erro ao remover dados locais.');
      } finally {
        setIsDeleting(false);
      }
    }, 300);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Backup & Restore
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Gerencie, exporte, restaure e limpe com segurança os dados locais do seu aplicativo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 shrink-0 text-xs text-slate-600 dark:text-slate-300">
          <Database className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>
            Chave Local: <strong className="font-mono text-indigo-600 dark:text-indigo-400">english_teacher_students_v6</strong>
          </span>
        </div>
      </div>

      {/* Cloud Sync Section */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-700/50 rounded-2xl p-6 shadow-lg text-white space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">Cloud Sync</h3>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Supabase
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Sincronize ou restaure seus alunos e diários de aula diretamente na nuvem.
              </p>
            </div>
          </div>

          {/* User / Supabase Status */}
          <div className="flex items-center gap-2.5 bg-indigo-950/80 border border-indigo-800/80 px-3.5 py-2 rounded-xl text-xs shrink-0">
            {isSupabaseConfigured ? (
              <>
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-indigo-300 font-medium">Usuário Autenticado</span>
                  <span className="font-semibold text-white truncate max-w-[200px]">
                    {user?.email || 'Nenhum usuário conectado'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <Database className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-amber-300 font-medium">Armazenamento Ativo</span>
                  <span className="font-semibold text-white truncate max-w-[200px]">
                    Modo Local (Navegador)
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {!isSupabaseConfigured && (
          <div className="p-3 bg-indigo-950/50 border border-indigo-800/60 rounded-xl text-xs text-indigo-200/90 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              O Supabase não está configurado. Para sincronização na nuvem em tempo real, defina <code className="font-mono text-indigo-300">VITE_SUPABASE_URL</code> e <code className="font-mono text-indigo-300">VITE_SUPABASE_ANON_KEY</code>. No momento, todos os seus dados continuam 100% seguros no armazenamento local do navegador e você pode utilizar os backups em JSON abaixo a qualquer momento.
            </span>
          </div>
        )}

        {/* Sync Feedback Message */}
        {cloudSyncMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              cloudSyncMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
            }`}
          >
            {cloudSyncMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span className="font-medium leading-relaxed">{cloudSyncMessage.text}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Sync Button (Local -> Supabase) */}
          <button
            type="button"
            onClick={handleSyncWithSupabase}
            disabled={isSyncingCloud || isRestoringCloud}
            className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-950 flex items-center justify-center gap-2 border border-indigo-400/30 cursor-pointer"
          >
            {isSyncingCloud ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
                <span>Sincronizando dados...</span>
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4 text-indigo-200" />
                <span>Sync with Supabase</span>
              </>
            )}
          </button>

          {/* Restore Button (Supabase -> Local) */}
          <button
            type="button"
            onClick={handleRestoreFromSupabase}
            disabled={isSyncingCloud || isRestoringCloud}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
          >
            {isRestoringCloud ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Buscando do Supabase...</span>
              </>
            ) : (
              <>
                <CloudDownload className="w-4 h-4 text-cyan-400" />
                <span>Restore from Supabase</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid of 4 Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: Export Backup */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                Download JSON
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                1. Export Backup
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Gere e baixe um arquivo de backup completo (<code className="font-mono text-indigo-600 dark:text-indigo-400">english-teacher-backup.json</code>) contendo todos os alunos, diários de aula, notas e relatórios financeiros.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-emerald-500" />
                <span>Status dos Dados</span>
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {stats.studentCount > 0 ? `${stats.studentCount} aluno(s) prontos` : 'Sem dados para exportar'}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || stats.studentCount === 0}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando Backup...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Backup</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* CARD 2: Import Backup */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                Restauração JSON
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                2. Import Backup
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Selecione um arquivo <code className="font-mono text-indigo-600 dark:text-indigo-400">.json</code> válido de backup para substituir e restaurar integralmente o banco de dados do seu navegador.
              </p>
            </div>

            {/* Upload Selector */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl text-center cursor-pointer transition group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 truncate">
                    <FileCheck2 className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate font-semibold">{selectedFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-md transition"
                  >
                    <X className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  <Upload className="w-4 h-4" />
                  <span>Clique ou arraste um arquivo .json aqui</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting || !selectedFile}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando e Importando...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Import Backup</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* CARD 3: Backup Information */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all md:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                Estatísticas
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                3. Backup Information
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Métricas calculadas dinamicamente a partir dos dados do seu armazenamento local.
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 block font-medium">Tamanho do backup</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{stats.sizeFormatted}</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 block font-medium">Última modificação</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {stats.lastModified || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center gap-2.5">
                <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 block font-medium">Qtd. de alunos</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{stats.studentCount}</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 block font-medium">Qtd. de aulas</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{stats.classLogsCount}</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 block font-medium">Qtd. de flashcards</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{stats.flashcardsCount}</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 block font-medium">Qtd. de decks</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{stats.decksCount}</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 block font-medium">Qtd. de sessões</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{stats.sessionsCount}</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 block font-medium">Qtd. de configurações</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{stats.settingsCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 4: Clear Local Data */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-rose-200 dark:hover:border-rose-900/60 transition-all md:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/80 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
                Zona de Perigo
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                4. Clear Local Data
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Apague permanentemente a chave de armazenamento <code className="font-mono text-rose-600 dark:text-rose-400">english_teacher_students_v6</code>. Outras chaves e dados do navegador não serão afetados.
              </p>
            </div>

            <div className="bg-rose-50/60 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                Esta ação remove todos os dados salvos localmente no navegador. Recomenda-se exportar um backup antes de prosseguir.
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsClearModalOpen(true)}
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Local Data</span>
            </button>
          </div>
        </div>

      </div>

      {/* Confirmation Modal for Clear Local Data */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  This action cannot be undone.
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Confirmação de exclusão do armazenamento local
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
              Do you really want to delete all local data?
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
              Isso apagará apenas a chave <code className="font-mono font-bold text-rose-600 dark:text-rose-400">english_teacher_students_v6</code> e zerará a lista de alunos atual.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
