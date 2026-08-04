import React, { useState } from 'react';
import { Student } from '../types';
import { StudentAvatar } from './StudentAvatar';
import { CEFR_LEVELS, getCurrentMonthPaymentStatus, formatCurrency } from '../utils/helpers';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { 
  FileText, 
  Printer, 
  Copy, 
  Check, 
  X, 
  GraduationCap, 
  Award, 
  Calendar, 
  CheckCircle2, 
  BookOpen, 
  Sparkles,
  MessageSquare,
  AlertCircle,
  Download,
  Loader2
} from 'lucide-react';

interface StudentReportModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StudentReportModal: React.FC<StudentReportModalProps> = ({
  student,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [reportMonth, setReportMonth] = useState(() => {
    const d = new Date();
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  });

  // Custom editable fields for the feedback
  const [pronunciationNotes, setPronunciationNotes] = useState(
    'Treinar entonação em frases afirmativas e atenção especial na pronúncia de sons vocálicos em inglês.'
  );
  const [homeworkStatus, setHomeworkStatus] = useState(
    'Deveres de casa entregues com assiduidade e bom comprometimento com os exercícios práticos.'
  );
  const [generalProgress, setGeneralProgress] = useState(
    'Excelente evolução na fluência e compreensão auditiva ao longo das últimas aulas.'
  );

  if (!isOpen || !student) return null;

  const levelInfo = CEFR_LEVELS[student.englishLevel] || CEFR_LEVELS.B1;
  const paymentInfo = getCurrentMonthPaymentStatus(student);
  const recentLogs = student.classLogs.slice(-6).reverse(); // Last 6 logged classes

  // Function to download directly as PDF using html2pdf
  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-report');
    if (!element) return;

    setIsGeneratingPdf(true);
    try {
      const opt = {
        margin: [0.3, 0.3, 0.3, 0.3] as [number, number, number, number],
        filename: `Relatorio_Pedagogico_${student.name.replace(/\s+/g, '_')}_${reportMonth.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('Não foi possível gerar o PDF direto. Você pode usar o botão "Imprimir / Abrir Janela".');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Function to open dedicated popup print window (bypasses iframe restrictions)
  const handlePrint = () => {
    const reportElement = document.getElementById('printable-report');
    if (!reportElement) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // Fallback if popup blocked
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório Pedagógico - ${student.name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #ffffff; padding: 20px; color: #1e293b; }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div className="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">
              🖨️ Imprimir / Salvar como PDF
            </button>
          </div>
          ${reportElement.innerHTML}
          <script>
            setTimeout(() => {
              window.print();
            }, 500);
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const generateReportText = () => {
    let text = `=====================================\n`;
    text += `RELATÓRIO DE DESEMPENHO - ENGLISH TEACHER STUDIO\n`;
    text += `=====================================\n\n`;
    text += `Aluno(a): ${student.name}\n`;
    text += `Mês de Referência: ${reportMonth}\n`;
    text += `Nível CEFR: ${levelInfo.code} (${levelInfo.label})\n`;
    text += `Total de Aulas Concluídas: ${student.currentClassNumber} aulas\n\n`;
    text += `--- TÓPICOS ESTUDADOS ---\n`;
    if (recentLogs.length > 0) {
      recentLogs.forEach((log) => {
        text += `• Aula #${log.classNumber} (${new Date(log.date).toLocaleDateString('pt-BR')}): ${log.topic} | Foco: ${log.grammarFocus || 'Geral'}\n`;
      });
    } else {
      text += `Aulas em andamento conforme o plano inicial.\n`;
    }
    text += `\n--- PARECER PEDAGÓGICO ---\n`;
    text += `• Pronúncia & Fonética: ${pronunciationNotes}\n`;
    text += `• Tarefas de Casa: ${homeworkStatus}\n`;
    text += `• Avaliação Geral: ${generalProgress}\n\n`;
    text += `Qualquer dúvida estou à disposição!\n`;
    return text;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generateReportText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white print:fixed print:inset-0">
      
      {/* CSS for print isolation */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:border-none print:shadow-none print:w-full">
        
        {/* Top Header Controls (Hidden on Print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Relatório Pedagógico / Feedback em PDF</h3>
              <p className="text-xs text-slate-400">Gerar boletim individual para {student.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar Texto'}</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Abrir Janela</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document Container */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50 dark:bg-slate-950/40 print:bg-white print:p-0" id="printable-report">
          
          {/* Printable Header Banner */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs print:border-b-2 print:border-indigo-600 print:rounded-none print:p-0 print:pb-4 print:mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl print:bg-indigo-600">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white print:text-black">
                    English Teacher Studio
                  </h1>
                  <p className="text-xs text-slate-500 print:text-slate-600 font-medium">
                    Relatório Individual de Desempenho & Acompanhamento
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 print:bg-slate-100 print:text-indigo-900 rounded-lg text-xs font-extrabold uppercase tracking-wide">
                  {reportMonth}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 print:border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <StudentAvatar name={student.name} avatarUrl={student.avatarUrl} className="w-14 h-14 rounded-2xl" />
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white print:text-black">
                    {student.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600">
                    Objetivo: {student.targetGoal || 'Aprimoramento Geral'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-center px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700 print:bg-slate-100 print:border-slate-300">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Nível Atual</span>
                  <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 print:text-indigo-900">
                    {levelInfo.code} - {levelInfo.label}
                  </span>
                </div>

                <div className="text-center px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700 print:bg-slate-100 print:border-slate-300">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Aulas dadas</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white print:text-black">
                    Class #{student.currentClassNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Topics & Content Logged */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs print:border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white print:text-black mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Conteúdo Lecionado e Registro de Aulas</span>
            </h3>

            {recentLogs.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                {recentLogs.map((log) => (
                  <div key={log.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 print:text-black">
                      <span>
                        Aula #{log.classNumber} - {log.topic}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(log.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 print:text-slate-700 mt-1 space-y-0.5">
                      {log.grammarFocus && (
                        <p>
                          <strong className="text-slate-700 dark:text-slate-300 print:text-black">Foco Gramatical:</strong>{' '}
                          {log.grammarFocus}
                        </p>
                      )}
                      {log.homeworkAssigned && (
                        <p>
                          <strong className="text-slate-700 dark:text-slate-300 print:text-black">Dever de Casa:</strong>{' '}
                          {log.homeworkAssigned}
                        </p>
                      )}
                      {log.notes && (
                        <p className="text-slate-500 italic">
                          Obs: {log.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Nenhum registro individual de aula gravado ainda.</p>
            )}
          </div>

          {/* Section 2: Pedagogical Feedback & Editable Notes */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs print:border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white print:text-black flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Parecer Pedagógico do Professor</span>
            </h3>

            {/* Pronunciation & Phonetics */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 print:text-black mb-1">
                Ajustes de Pronúncia e Leitura:
              </label>
              <textarea
                rows={2}
                value={pronunciationNotes}
                onChange={(e) => setPronunciationNotes(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden font-medium text-slate-800 dark:text-slate-200 print:bg-white print:border-none print:p-0 print:resize-none"
              />
            </div>

            {/* Homework Commitment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 print:text-black mb-1">
                Dedicação com Deveres de Casa & Prática Extra:
              </label>
              <textarea
                rows={2}
                value={homeworkStatus}
                onChange={(e) => setHomeworkStatus(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden font-medium text-slate-800 dark:text-slate-200 print:bg-white print:border-none print:p-0 print:resize-none"
              />
            </div>

            {/* General Evolution */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 print:text-black mb-1">
                Avaliação Geral de Evolução:
              </label>
              <textarea
                rows={2}
                value={generalProgress}
                onChange={(e) => setGeneralProgress(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden font-medium text-slate-800 dark:text-slate-200 print:bg-white print:border-none print:p-0 print:resize-none"
              />
            </div>
          </div>

          {/* Section 3: Class Schedule & Payment Status */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs print:border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Horários Fixos</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {student.schedules.map((s) => (
                  <span key={s.id} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold print:border">
                    {s.day.slice(0, 3)}: {s.startTime} - {s.endTime}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Situação Mensal (Venc. Dia 08)</span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 print:text-emerald-900">
                {paymentInfo.status === 'paid' ? 'Mensalidade em Dia' : 'Aguardando Pagamento'}
              </span>
            </div>
          </div>

          {/* Print Footer Stamp */}
          <div className="text-center pt-4 border-t border-slate-200/80 text-[11px] text-slate-400 print:text-slate-600">
            English Teacher Studio • Documento de Acompanhamento Pedagógico • {new Date().toLocaleDateString('pt-BR')}
          </div>

        </div>

      </div>
    </div>
  );
};
