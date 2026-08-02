import React, { useState } from 'react';
import { Student, EnglishLevel } from '../types';
import { CEFR_LEVELS } from '../utils/helpers';
import { Sparkles, X, BookOpen, MessageSquare, Check, Copy, RefreshCw } from 'lucide-react';

interface LessonPlannerAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
}

export const LessonPlannerAIModal: React.FC<LessonPlannerAIModalProps> = ({
  isOpen,
  onClose,
  students,
}) => {
  if (!isOpen) return null;

  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [level, setLevel] = useState<EnglishLevel>('B1');
  const [customFocus, setCustomFocus] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeStudent = students.find((s) => s.id === selectedStudentId);

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedPlan(null);

    const targetLevel = activeStudent ? activeStudent.englishLevel : level;
    const targetGoal = activeStudent ? activeStudent.targetGoal : 'General English fluency';
    const classNum = activeStudent ? activeStudent.currentClassNumber + 1 : 15;
    const focusStr = customFocus || 'Grammar & Spoken Fluency';

    try {
      const response = await fetch('/api/lesson-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: activeStudent?.name || 'Student',
          englishLevel: targetLevel,
          targetGoal,
          classNumber: classNum,
          customFocus: focusStr,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedPlan(data.plan);
      } else {
        // Fallback local generator if server route is offline
        setGeneratedPlan(generateLocalFallbackPlan(targetLevel, focusStr, activeStudent?.name || 'Student', classNum));
      }
    } catch (err) {
      setGeneratedPlan(generateLocalFallbackPlan(targetLevel, focusStr, activeStudent?.name || 'Student', classNum));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedPlan) return;
    navigator.clipboard.writeText(generatedPlan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                AI Lesson Plan & Exercise Generator
              </h3>
              <p className="text-xs text-slate-500">
                Tailored for student's exact CEFR level & class number
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs overflow-y-auto p-1 flex-1">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Student
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  const std = students.find((s) => s.id === e.target.value);
                  if (std) setLevel(std.englishLevel);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.englishLevel} - Class #{s.currentClassNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lesson Topic or Focus (Optional)
              </label>
              <input
                type="text"
                value={customFocus}
                onChange={(e) => setCustomFocus(e.target.value)}
                placeholder="e.g. Email writing, Past Tense, Job Interview"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating custom lesson plan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Class #{activeStudent ? activeStudent.currentClassNumber + 1 : 15} Plan</span>
              </>
            )}
          </button>

          {/* Result Output */}
          {generatedPlan && (
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 relative">
              <div className="flex items-center justify-between border-b pb-2 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1">
                  <BookOpen className="w-4 h-4 text-purple-600" /> Lesson Outline Ready
                </span>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Plan'}</span>
                </button>
              </div>

              <div className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans text-xs leading-relaxed space-y-2">
                {generatedPlan}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

function generateLocalFallbackPlan(
  level: EnglishLevel,
  focus: string,
  studentName: string,
  classNum: number
): string {
  const levelInfo = CEFR_LEVELS[level] || CEFR_LEVELS.B1;

  return `📚 LESSON PLAN FOR ${studentName.toUpperCase()} — CLASS #${classNum}
Level: ${levelInfo.code} (${levelInfo.name})
Focus Area: ${focus}

1. WARM-UP (5-10 mins)
• Question: "What was the most interesting event that happened in your work or study week?"
• Target Skill: Spontaneous speaking & past tense fluency.

2. TARGET VOCABULARY & PHRASES (${levelInfo.code})
• Key Term 1: "To bring up" (phrasal verb) — to introduce a topic.
• Key Term 2: "In terms of..." — structuring opinions clearly.
• Key Term 3: "At the end of the day..." — summarizing conclusions.

3. GRAMMAR FOCUS
• Concept: ${level === 'A1' || level === 'A2' ? 'Present Simple vs Present Continuous' : 'Present Perfect Continuous for ongoing activities'}
• Exercise: Have student form 3 sentences relating to their own daily routine or career.

4. SPEAKING & ROLEPLAY ACTIVITY (20 mins)
• Scenario: ${focus}
• Task: Student presents a 2-minute update and answers 3 follow-up questions from the teacher.

5. HOMEWORK ASSIGNMENT
• Task: Write 5 example sentences using today's target vocabulary and send via email/WhatsApp.`;
}
