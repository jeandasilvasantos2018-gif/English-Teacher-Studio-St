import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { CheckCircle2, X, BookOpen, Clock, Calendar, Sparkles } from 'lucide-react';

interface QuickLogClassModalProps {
  student: Student | null;
  onClose: () => void;
  onLogClass: (
    studentId: string,
    logData: {
      date: string;
      durationMinutes: number;
      topic: string;
      grammarFocus: string;
      notes: string;
      homeworkAssigned: string;
      attended: boolean;
    }
  ) => void;
}

export const QuickLogClassModal: React.FC<QuickLogClassModalProps> = ({
  student,
  onClose,
  onLogClass,
}) => {
  if (!student) return null;

  const nextClassNum = student.currentClassNumber + 1;

  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [topic, setTopic] = useState<string>('');
  const [grammarFocus, setGrammarFocus] = useState<string>('');
  const [homeworkAssigned, setHomeworkAssigned] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogClass(student.id, {
      date: new Date(date).toISOString(),
      durationMinutes,
      topic,
      grammarFocus,
      notes,
      homeworkAssigned,
      attended: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Log Class #{nextClassNum} for {student.name}
              </h3>
              <p className="text-xs text-slate-500">
                Increments student session count from #{student.currentClassNumber} → #{nextClassNum}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Class Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duration (Minutes)
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
              >
                <option value={45}>45 mins</option>
                <option value={60}>60 mins (1 hour)</option>
                <option value={90}>90 mins (1.5 hours)</option>
                <option value={120}>120 mins (2 hours)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lesson Topic Covered
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Business Emailing & Negotiation Tactics"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Grammar / Vocabulary Focus
            </label>
            <input
              type="text"
              value={grammarFocus}
              onChange={(e) => setGrammarFocus(e.target.value)}
              placeholder="e.g. Second Conditional vs Third Conditional"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Homework Assigned
            </label>
            <input
              type="text"
              value={homeworkAssigned}
              onChange={(e) => setHomeworkAssigned(e.target.value)}
              placeholder="e.g. Write 1 paragraph describing past project challenges"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Teacher Notes & Feedback
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Pronunciation of 'schedule' improved. Keep practicing past continuous."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Log Class #{nextClassNum}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
