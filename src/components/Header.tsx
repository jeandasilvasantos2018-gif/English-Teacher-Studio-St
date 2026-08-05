import React from 'react';
import { ViewMode, Student } from '../types';
import { NotificationCenter } from './NotificationCenter';
import { 
  GraduationCap, 
  Users, 
  CalendarDays, 
  CalendarCheck,
  DollarSign, 
  Plus, 
  CheckCircle2, 
  RotateCcw,
  Sparkles,
  Download,
  Upload,
  HardDrive,
  Database,
  LogIn
} from 'lucide-react';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onOpenAddStudent: () => void;
  onOpenQuickLog: () => void;
  onOpenAiPlanner: () => void;
  onResetData: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  studentCount: number;
  students?: Student[];
  onSelectStudent?: (studentId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  onOpenAddStudent,
  onOpenQuickLog,
  onOpenAiPlanner,
  onResetData,
  onExportData,
  onImportData,
  studentCount,
  students,
  onSelectStudent,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* Logo & App Title */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                    English Teacher Studio
                  </h1>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 font-semibold border border-indigo-200/80 dark:border-indigo-800 shrink-0 whitespace-nowrap">
                    {studentCount} {studentCount === 1 ? 'Aluno' : 'Alunos'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap hidden sm:block">
                  Gestão de horários, mensalidades e progresso dos alunos
                </p>
              </div>
            </div>

            {/* Mobile View Switches */}
            <div className="flex items-center gap-1.5 lg:hidden">
              <NotificationCenter
                students={students}
                onSelectStudent={onSelectStudent}
                onNavigateToCalendar={() => setViewMode('calendar')}
                onNavigateToPayments={() => setViewMode('payments')}
              />
              <button
                onClick={onOpenAddStudent}
                className="h-9 px-3 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition flex items-center gap-1"
                title="Novo Aluno"
              >
                <Plus className="w-4 h-4" />
                <span className="whitespace-nowrap">Aluno</span>
              </button>
            </div>
          </div>

          {/* Navigation View Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 overflow-x-auto border border-slate-200/70 dark:border-slate-700/70">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-3.5 h-8 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                viewMode === 'grid' || viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Alunos</span>
            </button>

            <button
              onClick={() => setViewMode('weekly')}
              className={`flex items-center gap-2 px-3.5 h-8 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                viewMode === 'weekly'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>Grade Semanal</span>
            </button>

            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3.5 h-8 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-4 h-4 shrink-0 text-indigo-500" />
              <span>Calendar</span>
            </button>

            <button
              onClick={() => setViewMode('availability')}
              className={`flex items-center gap-2 px-3.5 h-8 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                viewMode === 'availability'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarCheck className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Horários Livres</span>
            </button>

            <button
              onClick={() => setViewMode('payments')}
              className={`flex items-center gap-2 px-3.5 h-8 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                viewMode === 'payments'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <DollarSign className="w-4 h-4 shrink-0" />
              <span>Pagamentos Mensais</span>
            </button>

            <button
              onClick={() => setViewMode('backup')}
              className={`flex items-center gap-2 px-3.5 h-8 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                viewMode === 'backup'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HardDrive className="w-4 h-4 shrink-0 text-indigo-500" />
              <span>Backup & Restore</span>
            </button>

            <button
              onClick={() => {
                setViewMode('supabase_test');
              }}
              className={`flex items-center gap-2 px-3.5 h-8 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                viewMode === 'supabase_test'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Database className="w-4 h-4 shrink-0 text-cyan-500" />
              <span>Supabase Test</span>
            </button>

            <button
              onClick={() => {
                setViewMode('login');
                if (window.location.pathname !== '/login') {
                  window.history.pushState({}, '', '/login');
                }
              }}
              className={`flex items-center gap-2 px-3.5 h-8 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                viewMode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Login / Auth</span>
            </button>
          </div>

          {/* Top Actions */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <NotificationCenter
              students={students}
              onSelectStudent={onSelectStudent}
              onNavigateToCalendar={() => setViewMode('calendar')}
              onNavigateToPayments={() => setViewMode('payments')}
            />

            <button
              onClick={onOpenAiPlanner}
              className="h-9 px-3 text-xs font-semibold whitespace-nowrap text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 rounded-xl border border-purple-200/80 dark:border-purple-800 transition flex items-center gap-1.5"
              title="Gerar sugestões de aulas com IA"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>Assistente IA</span>
            </button>

            <button
              onClick={onOpenQuickLog}
              className="h-9 px-3 text-xs font-semibold whitespace-nowrap text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 rounded-xl border border-emerald-200/80 dark:border-emerald-800 transition flex items-center gap-1.5"
              title="Registrar aula realizada"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Registrar Aula</span>
            </button>

            <button
              onClick={onOpenAddStudent}
              className="h-9 px-3.5 text-xs font-semibold whitespace-nowrap text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Novo Aluno</span>
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />

            {/* Secondary Utilities */}
            <div className="flex items-center gap-1">
              <button
                onClick={onExportData}
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                title="Exportar Backup JSON"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                title="Importar Backup"
              >
                <Upload className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={onImportData}
              />

              <button
                onClick={onResetData}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition"
                title="Restaurar Dados Iniciais"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

