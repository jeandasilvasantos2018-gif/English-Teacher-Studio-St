import React, { useState, useMemo } from 'react';
import { Student, DayOfWeek } from '../types';
import { DAYS_ORDER, CEFR_LEVELS } from '../utils/helpers';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Coffee, 
  CalendarCheck, 
  Copy, 
  Check, 
  Filter, 
  Plus, 
  MessageSquare,
  Sparkles,
  Info,
  Calendar
} from 'lucide-react';

interface AvailabilityViewProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onOpenAddStudentWithSlot: (day: DayOfWeek, startTime: string, endTime: string) => void;
  onOpenWhatsApp: (student: Student) => void;
}

// 08:00 to 21:00 time blocks (1-hour standard intervals)
const TIME_SLOTS = [
  { startTime: '08:00', endTime: '09:00', label: '08:00 - 09:00' },
  { startTime: '09:00', endTime: '10:00', label: '09:00 - 10:00' },
  { startTime: '10:00', endTime: '11:00', label: '10:00 - 11:00' },
  { startTime: '11:00', endTime: '12:00', label: '11:00 - 12:00' },
  { startTime: '12:00', endTime: '13:00', label: '12:00 - 13:00' },
  { startTime: '13:00', endTime: '14:00', label: '13:00 - 14:00' },
  { startTime: '14:00', endTime: '15:00', label: '14:00 - 15:00' },
  { startTime: '15:00', endTime: '16:00', label: '15:00 - 16:00' },
  { startTime: '16:00', endTime: '17:00', label: '16:00 - 17:00' },
  { startTime: '17:00', endTime: '18:00', label: '17:00 - 18:00' },
  { startTime: '18:00', endTime: '19:00', label: '18:00 - 19:00' },
  { startTime: '19:00', endTime: '20:00', label: '19:00 - 20:00' },
  { startTime: '20:00', endTime: '21:00', label: '20:00 - 21:00' },
];

// De Segunda a Sábado
const WORK_DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_LABELS_PT: Record<DayOfWeek, string> = {
  Monday: 'Segunda-feira',
  Tuesday: 'Terça-feira',
  Wednesday: 'Quarta-feira',
  Thursday: 'Quinta-feira',
  Friday: 'Sexta-feira',
  Saturday: 'Sábado',
  Sunday: 'Domingo',
};

const DAY_SHORT_PT: Record<DayOfWeek, string> = {
  Monday: 'Seg',
  Tuesday: 'Ter',
  Wednesday: 'Qua',
  Thursday: 'Qui',
  Friday: 'Sex',
  Saturday: 'Sáb',
  Sunday: 'Dom',
};

export interface SlotAnalysis {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  status: 'occupied' | 'interval' | 'available';
  student?: Student;
  slotInfo?: Student['schedules'][0];
  reason?: string;
}

export const AvailabilityView: React.FC<AvailabilityViewProps> = ({
  students,
  onSelectStudent,
  onOpenAddStudentWithSlot,
}) => {
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'available' | 'occupied' | 'interval'>('all');
  const [bufferHours, setBufferHours] = useState<number>(1); // Default 1 hour interval rule
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [showWhatsAppPreview, setShowWhatsAppPreview] = useState(false);

  // Helper to convert time "HH:MM" to total minutes
  const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
    return h * 60 + m;
  };

  // Compute all slots across Segunda a Sábado (8h as 21h)
  const scheduleMatrix = useMemo(() => {
    const activeStudents = students.filter((s) => s.active);

    // List of all occupied classes per day
    const occupiedByDay: Record<DayOfWeek, Array<{ student: Student; slot: Student['schedules'][0]; startMin: number; endMin: number }>> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: [],
    };

    activeStudents.forEach((student) => {
      student.schedules.forEach((slot) => {
        const startMin = timeToMinutes(slot.startTime);
        const endMin = timeToMinutes(slot.endTime);
        if (occupiedByDay[slot.day]) {
          occupiedByDay[slot.day].push({ student, slot, startMin, endMin });
        }
      });
    });

    const matrix: Record<DayOfWeek, SlotAnalysis[]> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: [],
    };

    WORK_DAYS.forEach((day) => {
      const dayOccupied = occupiedByDay[day];

      TIME_SLOTS.forEach((ts) => {
        const tsStartMin = timeToMinutes(ts.startTime);
        const tsEndMin = timeToMinutes(ts.endTime);

        // Check 1: Direct class mapping (match class that starts in this hour slot)
        const directClass = dayOccupied.find((occ) => {
          return occ.startMin >= tsStartMin && occ.startMin < tsEndMin;
        });

        if (directClass) {
          matrix[day].push({
            day,
            startTime: ts.startTime,
            endTime: ts.endTime,
            status: 'occupied',
            student: directClass.student,
            slotInfo: directClass.slot,
            reason: `Aula agendada com ${directClass.student.name}`,
          });
          return;
        }

        // Check 2: Mandatory interval / buffer rule
        if (bufferHours > 0) {
          const bufferMinutes = bufferHours * 60;

          // Post-class pause: class ended recently before this slot
          const postClassPause = dayOccupied.find((occ) => {
            const gapAfter = tsStartMin - occ.endMin;
            return gapAfter >= 0 && gapAfter < bufferMinutes;
          });

          // Pre-class pause: next class starts shortly after this slot
          const preClassPause = dayOccupied.find((occ) => {
            const gapBefore = occ.startMin - tsEndMin;
            return gapBefore >= 0 && gapBefore < bufferMinutes;
          });

          if (postClassPause) {
            matrix[day].push({
              day,
              startTime: ts.startTime,
              endTime: ts.endTime,
              status: 'interval',
              reason: `Pausa pós-aula (${postClassPause.student.name})`,
            });
            return;
          }

          if (preClassPause) {
            matrix[day].push({
              day,
              startTime: ts.startTime,
              endTime: ts.endTime,
              status: 'interval',
              reason: `Pausa pré-aula (${preClassPause.student.name})`,
            });
            return;
          }
        }

        // Check 3: Otherwise Available
        matrix[day].push({
          day,
          startTime: ts.startTime,
          endTime: ts.endTime,
          status: 'available',
          reason: 'Horário livre e disponível para agendamento',
        });
      });
    });

    return matrix;
  }, [students, bufferHours]);

  // Aggregate Stats
  const stats = useMemo(() => {
    let totalSlots = 0;
    let availableCount = 0;
    let occupiedCount = 0;
    let intervalCount = 0;

    WORK_DAYS.forEach((day) => {
      const slots = scheduleMatrix[day] || [];
      slots.forEach((s) => {
        totalSlots++;
        if (s.status === 'available') availableCount++;
        else if (s.status === 'occupied') occupiedCount++;
        else if (s.status === 'interval') intervalCount++;
      });
    });

    const occupancyRate = totalSlots > 0 ? Math.round((occupiedCount / totalSlots) * 100) : 0;

    return { totalSlots, availableCount, occupiedCount, intervalCount, occupancyRate };
  }, [scheduleMatrix]);

  // Generate WhatsApp formatted text for available slots
  const whatsappAvailableText = useMemo(() => {
    let text = `🇬🇧 *Horários Disponíveis para Aulas de Inglês*\n`;
    text += `_Grade de Segunda a Sábado (com ${bufferHours}h de intervalo entre aulas)_\n\n`;

    let hasAnyAvailable = false;

    WORK_DAYS.forEach((day) => {
      const daySlots = (scheduleMatrix[day] || []).filter((s) => s.status === 'available');
      if (daySlots.length > 0) {
        hasAnyAvailable = true;
        text += `📅 *${DAY_LABELS_PT[day]}:*\n`;
        daySlots.forEach((s) => {
          text += `  • ${s.startTime} às ${s.endTime}\n`;
        });
        text += `\n`;
      }
    });

    if (!hasAnyAvailable) {
      text += `No momento todos os horários estão preenchidos! Entre em contato para lista de espera.\n\n`;
    } else {
      text += `💬 *Entre em contato para agendar o seu horário semanal!*`;
    }

    return text;
  }, [scheduleMatrix, bufferHours]);

  const handleCopyWhatsAppText = () => {
    navigator.clipboard.writeText(whatsappAvailableText);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  const daysToRender = selectedDay !== 'all' ? WORK_DAYS.filter((d) => d === selectedDay) : WORK_DAYS;

  return (
    <div className="space-y-5">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20 shrink-0">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Verificador de Horários e Vagas Disponíveis
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                08h às 21h (Seg a Sáb)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Análise inteligente de horários ocupados, intervalos de descanso e vagas abertas para novos alunos.
            </p>
          </div>
        </div>

        {/* Top Right Action: Share Available Slots */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowWhatsAppPreview(!showWhatsAppPreview)}
            className="flex-1 md:flex-initial px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>{showWhatsAppPreview ? 'Ocultar Texto WhatsApp' : 'Copiar Vagas p/ WhatsApp'}</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Copy Box Dropdown / Modal */}
      {showWhatsAppPreview && (
        <div className="bg-emerald-950/10 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Texto Formato WhatsApp para Enviar aos Alunos
              </span>
            </div>
            <button
              onClick={handleCopyWhatsAppText}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center gap-1.5 shadow-xs"
            >
              {copiedSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSuccess ? 'Copiado para Área de Transferência!' : 'Copiar Texto'}</span>
            </button>
          </div>

          <pre className="p-3 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
            {whatsappAvailableText}
          </pre>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Horários Livres */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Horários Livres
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.availableCount}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Vagas abertas na grade</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Aulas Agendadas */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Aulas Agendadas
            </span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {stats.occupiedCount}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Horários ocupados</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Intervalos Obrigatórios */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Intervalos de Pausa
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats.intervalCount}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Pausas ({bufferHours}h pós-aula)</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Coffee className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Ocupação Total */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Taxa de Ocupação
            </span>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {stats.occupancyRate}%
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Aulas / Grade Total</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Configuração e Filtros da Grade
            </span>
          </div>

          {/* Rule Info Tooltip */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Regra ativa: Seg a Sáb (8h-21h) com {bufferHours}h de intervalo pré/pós aula</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Day Selection */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Dia da Semana
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
            >
              <option value="all">Segunda a Sábado (Todos)</option>
              {WORK_DAYS.map((d) => (
                <option key={d} value={d}>
                  {DAY_LABELS_PT[d]} ({DAY_SHORT_PT[d]})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Filtrar por Tipo de Horário
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
            >
              <option value="all">Todos os Horários (Ocupados + Livres + Pausas)</option>
              <option value="available">Apenas Vagas Livres (Disponíveis)</option>
              <option value="occupied">Apenas Aulas Ocupadas</option>
              <option value="interval">Apenas Intervalos de Pausa</option>
            </select>
          </div>

          {/* Buffer Rule Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Tempo do Intervalo entre Aulas
            </label>
            <select
              value={bufferHours}
              onChange={(e) => setBufferHours(parseFloat(e.target.value))}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
            >
              <option value={1}>1 Hora de Intervalo (Pré-estabelecido)</option>
              <option value={0.5}>30 Minutos de Intervalo</option>
              <option value={0}>Sem Intervalo (Aulas Seguida/Back-to-Back)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" />
          <span className="text-slate-700 dark:text-slate-300">Horário Livre (Disponível para Novo Aluno)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-indigo-600 inline-block" />
          <span className="text-slate-700 dark:text-slate-300">Horário Ocupado (Com Aluno)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-amber-400 inline-block" />
          <span className="text-slate-700 dark:text-slate-300">Intervalo Obrigatório ({bufferHours}h de Pausa)</span>
        </div>
      </div>

      {/* Grid of Days (Segunda a Sábado) */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${daysToRender.length === 1 ? 'lg:grid-cols-1 max-w-xl mx-auto' : 'lg:grid-cols-6'} gap-3`}>
        {daysToRender.map((day) => {
          const allSlots = scheduleMatrix[day] || [];
          
          // Apply status filter
          const filteredSlots = allSlots.filter((slot) => {
            if (selectedStatus === 'all') return true;
            return slot.status === selectedStatus;
          });

          const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;

          return (
            <div
              key={day}
              className={`bg-white dark:bg-slate-900 rounded-2xl border flex flex-col transition-all overflow-hidden ${
                isToday
                  ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-sm'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {/* Day Header */}
              <div className={`p-3 border-b text-center font-bold text-xs flex items-center justify-between ${
                isToday
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-slate-100 dark:border-slate-800'
              }`}>
                <span>{DAY_LABELS_PT[day]}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isToday ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}>
                  {allSlots.filter((s) => s.status === 'available').length} livres
                </span>
              </div>

              {/* Time Slots List */}
              <div className="p-2 space-y-2 flex-1">
                {filteredSlots.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs italic">
                    Nenhum horário correspondente ao filtro.
                  </div>
                ) : (
                  filteredSlots.map((slot) => {
                    if (slot.status === 'occupied' && slot.student) {
                      const levelInfo = CEFR_LEVELS[slot.student.englishLevel] || CEFR_LEVELS.B1;

                      return (
                        <div
                          key={`${day}-${slot.startTime}`}
                          onClick={() => onSelectStudent(slot.student!)}
                          className="bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 transition cursor-pointer space-y-1 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-indigo-600" />
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${levelInfo.badgeBg}`}>
                              {levelInfo.code}
                            </span>
                          </div>

                          <div className="font-bold text-xs text-indigo-950 dark:text-indigo-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 truncate">
                            {slot.student.name}
                          </div>

                          <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 font-medium flex items-center justify-between">
                            <span>Aula #{slot.student.currentClassNumber}</span>
                            <span className="font-semibold text-indigo-700 dark:text-indigo-300">Ocupado</span>
                          </div>
                        </div>
                      );
                    }

                    if (slot.status === 'interval') {
                      return (
                        <div
                          key={`${day}-${slot.startTime}`}
                          className="bg-amber-50/60 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/70 dark:border-amber-900/40 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                              <Coffee className="w-3 h-3 text-amber-600" />
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-200/80 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200">
                              Pausa {bufferHours}h
                            </span>
                          </div>
                          <div className="text-[10px] text-amber-700 dark:text-amber-400 italic">
                            {slot.reason || 'Intervalo obrigatório'}
                          </div>
                        </div>
                      );
                    }

                    // Available Slot
                    return (
                      <div
                        key={`${day}-${slot.startTime}`}
                        className="bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 p-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 transition space-y-1.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                            LIVRE
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenAddStudentWithSlot(day, slot.startTime, slot.endTime)}
                          className="w-full mt-1 py-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-200/70 dark:bg-emerald-900/80 hover:bg-emerald-300 dark:hover:bg-emerald-800 rounded-lg transition flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Agendar Novo Aluno</span>
                        </button>
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
