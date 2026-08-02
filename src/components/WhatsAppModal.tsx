import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { getCurrentMonthPaymentStatus, formatCurrency, getNextClassInfo } from '../utils/helpers';
import { MessageCircle, Send, Copy, Check, X, Phone, AlertCircle, FileText } from 'lucide-react';

interface WhatsAppModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  defaultTemplate?: 'payment' | 'schedule' | 'homework' | 'custom';
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  student,
  isOpen,
  onClose,
  defaultTemplate = 'payment',
}) => {
  const [templateType, setTemplateType] = useState<'payment' | 'schedule' | 'homework' | 'custom'>(defaultTemplate);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customText, setCustomText] = useState('');
  const [pixKey, setPixKey] = useState('suachave@pix.com.br');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (student) {
      setPhoneNumber(student.phone || '');
      setTemplateType(defaultTemplate);
    }
  }, [student, defaultTemplate]);

  useEffect(() => {
    if (!student) return;

    const paymentInfo = getCurrentMonthPaymentStatus(student);
    const nextClass = getNextClassInfo(student);
    const lastClass = student.classLogs[student.classLogs.length - 1];

    if (templateType === 'payment') {
      const isOverdue = paymentInfo.status === 'overdue';
      if (isOverdue) {
        setCustomText(
          `Olá, ${student.name}! 👋 Tudo bem?\n\nConsta aqui como pendente a mensalidade de inglês no valor de ${formatCurrency(
            student.monthlyFee,
            student.currencySymbol
          )}, com vencimento no dia 08. 🗓️\n\nChave PIX: ${pixKey}\n\nCaso já tenha efetuado o pagamento, por favor me envie o comprovante. Qualquer dúvida estou à disposição! 🇬🇧✨`
        );
      } else {
        setCustomText(
          `Olá, ${student.name}! 👋 Tudo bem?\n\nPassando para lembrar que o vencimento da mensalidade de inglês (${formatCurrency(
            student.monthlyFee,
            student.currencySymbol
          )}) é no dia 08. 🗓️\n\nChave PIX: ${pixKey}\n\nQualquer dúvida estou à disposição! Bons estudos! 🇬🇧✨`
        );
      }
    } else if (templateType === 'schedule') {
      const classDetail = nextClass ? `será ${nextClass.formattedText}` : 'já está agendada no nosso horário habitual';
      const location = student.schedules[0]?.locationUrl ? `\n\nLink do Google Meet: ${student.schedules[0].locationUrl}` : '';
      setCustomText(
        `Olá, ${student.name}! 📚\n\nLembrando que nossa próxima aula de inglês ${classDetail}.${location}\n\nAté breve e bons estudos! 🇬🇧`
      );
    } else if (templateType === 'homework') {
      if (lastClass) {
        setCustomText(
          `Olá, ${student.name}! 📝\n\nSegue o resumo da nossa última aula (Aula #${lastClass.classNumber}):\n- Tópico: ${lastClass.topic}\n- Foco: ${lastClass.grammarFocus || 'Vocabulário'}\n- Dever de casa: ${lastClass.homeworkAssigned || 'Revisar anotações'}\n\nQualquer dúvida me chame aqui!`
        );
      } else {
        setCustomText(
          `Olá, ${student.name}! 📝\n\nEstou passando para enviar suas atividades de fixação da aula de inglês. Por favor revise as últimas anotações e faça os exercícios praticando a pronúncia!`
        );
      }
    }
  }, [student, templateType, pixKey]);

  if (!isOpen || !student) return null;

  const cleanPhone = phoneNumber.replace(/\D/g, '');

  const handleOpenWhatsApp = () => {
    if (!cleanPhone) {
      alert('Por favor insira um número de telefone com DDD!');
      return;
    }
    const encodedText = encodeURIComponent(customText);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}&text=${encodedText}`;
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(customText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <MessageCircle className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-base">Lembrete via WhatsApp</h3>
              <p className="text-xs text-emerald-100">Enviar mensagem para {student.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          
          {/* Phone Number Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              Telefone / WhatsApp do Aluno:
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Ex: +55 11 98888-8888"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-900 dark:text-white"
            />
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Escolha o Tipo de Lembrete:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTemplateType('payment')}
                className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition flex items-center gap-2 ${
                  templateType === 'payment'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Cobrança (Dia 08)</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('schedule')}
                className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition flex items-center gap-2 ${
                  templateType === 'schedule'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Lembrete de Aula</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('homework')}
                className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition flex items-center gap-2 ${
                  templateType === 'homework'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Resumo / Dever</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('custom')}
                className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition flex items-center gap-2 ${
                  templateType === 'custom'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Personalizado</span>
              </button>
            </div>
          </div>

          {/* Pix Key Config if Payment template */}
          {templateType === 'payment' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Sua Chave PIX (incluída na mensagem):
              </label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden font-medium text-slate-800 dark:text-slate-200"
              />
            </div>
          )}

          {/* Message Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mensagem a ser enviada:
            </label>
            <textarea
              rows={6}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-900 dark:text-slate-100 leading-relaxed resize-none"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyText}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copiar Texto</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Abrir no WhatsApp</span>
          </button>
        </div>

      </div>
    </div>
  );
};
