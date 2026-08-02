import React, { useState } from 'react';
import { Student, EnglishLevel, DayOfWeek, ClassScheduleSlot } from '../types';
import { CEFR_LEVELS, DAYS_ORDER } from '../utils/helpers';
import { UserPlus, X, Calendar, Clock, DollarSign, BookOpen, Target, Plus, Trash2 } from 'lucide-react';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStudent: (newStudent: Student) => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onAddStudent }) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [englishLevel, setEnglishLevel] = useState<EnglishLevel>('B1');
  const [targetGoal, setTargetGoal] = useState('');
  const [monthlyFee, setMonthlyFee] = useState<number>(150);
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  const [dueDayOfMonth, setDueDayOfMonth] = useState<number>(5);
  const [initialClassNumber, setInitialClassNumber] = useState<number>(1);
  const [initialNote, setInitialNote] = useState('');

  // Schedules state
  const [schedules, setSchedules] = useState<ClassScheduleSlot[]>([
    { id: 'sch-init-1', day: 'Monday', startTime: '15:00', endTime: '16:00', locationUrl: 'Google Meet' },
  ]);

  const [slotDay, setSlotDay] = useState<DayOfWeek>('Wednesday');
  const [slotStartTime, setSlotStartTime] = useState('15:00');
  const [slotEndTime, setSlotEndTime] = useState('16:00');
  const [slotLocation, setSlotLocation] = useState('Google Meet');

  const handleAddSlot = () => {
    setSchedules([
      ...schedules,
      {
        id: `sch-${Date.now()}`,
        day: slotDay,
        startTime: slotStartTime,
        endTime: slotEndTime,
        locationUrl: slotLocation,
      },
    ]);
  };

  const handleRemoveSlot = (id: string) => {
    setSchedules(schedules.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const student: Student = {
      id: `std-${Date.now()}`,
      name,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      phone,
      englishLevel,
      targetGoal: targetGoal || 'General English Fluency',
      currencySymbol,
      monthlyFee,
      dueDayOfMonth,
      currentClassNumber: initialClassNumber,
      active: true,
      createdAt: new Date().toISOString(),
      schedules,
      paymentHistory: [
        {
          id: `pay-init-${Date.now()}`,
          monthYear: new Date().toISOString().slice(0, 7),
          amount: monthlyFee,
          status: 'pending',
          notes: 'New enrollment',
        },
      ],
      classLogs: [],
      notes: initialNote
        ? [
            {
              id: `note-init-${Date.now()}`,
              createdAt: new Date().toISOString(),
              category: 'general',
              title: 'Student Enrollment Note',
              content: initialNote,
              pinned: true,
            },
          ]
        : [],
    };

    onAddStudent(student);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full my-auto border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-indigo-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Add New English Student</h2>
              <p className="text-xs text-indigo-100">Set schedule, monthly rate, level, and class number</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-indigo-100 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Section 1: Basic Profile */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b pb-1 dark:border-slate-800">
              1. Student Basic Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria Gonzalez"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. maria@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  English Level (CEFR)
                </label>
                <select
                  value={englishLevel}
                  onChange={(e) => setEnglishLevel(e.target.value as EnglishLevel)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white"
                >
                  <option value="A1">A1 Beginner</option>
                  <option value="A2">A2 Elementary</option>
                  <option value="B1">B1 Intermediate</option>
                  <option value="B2">B2 Upper-Intermediate</option>
                  <option value="C1">C1 Advanced</option>
                  <option value="C2">C2 Proficient</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Learning Goal / Exam Target
              </label>
              <input
                type="text"
                value={targetGoal}
                onChange={(e) => setTargetGoal(e.target.value)}
                placeholder="e.g. IELTS 7.0, Job Interview Preparation, Travel Fluency"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Section 2: Days & Hours Control */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b pb-1 dark:border-slate-800 flex items-center justify-between">
              <span>2. Class Days & Hours Schedule</span>
            </h3>

            <div className="space-y-2">
              {schedules.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3 font-semibold">
                    <span className="text-indigo-600 font-bold">{slot.day}</span>
                    <span>{slot.startTime} - {slot.endTime}</span>
                    <span className="text-slate-400 text-[10px]">({slot.locationUrl})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(slot.id)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">+ Add Schedule Time Slot</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <select
                  value={slotDay}
                  onChange={(e) => setSlotDay(e.target.value as DayOfWeek)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-medium"
                >
                  {DAYS_ORDER.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={slotStartTime}
                  onChange={(e) => setSlotStartTime(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold"
                />
                <input
                  type="time"
                  value={slotEndTime}
                  onChange={(e) => setSlotEndTime(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold"
                />
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="bg-indigo-600 text-white font-bold rounded-lg p-2 hover:bg-indigo-700 transition"
                >
                  Add Slot
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Monthly Fee & Class Session Counter */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b pb-1 dark:border-slate-800">
              3. Payment & Class Counter Controls
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Tuition Rate
                </label>
                <input
                  type="number"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Due Day of Month
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dueDayOfMonth}
                  onChange={(e) => setDueDayOfMonth(parseInt(e.target.value, 10) || 5)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Class Session #
                </label>
                <input
                  type="number"
                  min={1}
                  value={initialClassNumber}
                  onChange={(e) => setInitialClassNumber(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Initial Notes */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Initial Student Notes / Background
            </label>
            <textarea
              rows={2}
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              placeholder="e.g. Student prefers American English pronunciation focus. Works as a project manager."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs"
            >
              Save Student Profile
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
