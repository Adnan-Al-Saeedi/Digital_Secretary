import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  CheckCircle2,
  Clock,
  BookOpen,
  UserCheck,
  MapPin,
} from 'lucide-react';
import {
  AcademicStage,
  GroupOption,
  ScheduleDayName,
  ScheduleLectureSlot,
  SectionOption,
  StudyType,
  SystemSettings,
} from '../types';
import {
  DAYS_OF_WEEK,
  GROUPS,
  SECTIONS,
  STAGES,
  buildScheduleKey,
  getDefaultWeekSchedule,
} from './ClassScheduleView';

interface ScheduleEditorSectionProps {
  settings: SystemSettings;
  onSaveCustomSchedules: (updatedSettings: SystemSettings) => void;
}

export const ScheduleEditorSection: React.FC<ScheduleEditorSectionProps> = ({
  settings,
  onSaveCustomSchedules,
}) => {
  const [stage, setStage] = useState<AcademicStage>('المرحلة الأولى');
  const [section, setSection] = useState<SectionOption>('شعبة A');
  const [group, setGroup] = useState<GroupOption>('مجموعة 1');
  const [studyType, setStudyType] = useState<StudyType>('صباحي');
  const [semester, setSemester] = useState<'firstSemester' | 'secondSemester'>('firstSemester');
  const [selectedDay, setSelectedDay] = useState<ScheduleDayName>('الأحد');
  const [savedNotice, setSavedNotice] = useState(false);

  const scheduleKey = buildScheduleKey(stage, section, group, studyType, semester);

  // Get current week schedule (custom or default)
  const currentWeekSchedule: Record<ScheduleDayName, ScheduleLectureSlot[]> =
    settings.customSchedules?.[scheduleKey] ||
    getDefaultWeekSchedule(stage, section, group, studyType, semester);

  const daySlots = currentWeekSchedule[selectedDay] || [];

  const updateDaySlots = (newSlots: ScheduleLectureSlot[]) => {
    const updatedWeek: Record<ScheduleDayName, ScheduleLectureSlot[]> = {
      ...currentWeekSchedule,
      [selectedDay]: newSlots.map((slot, index) => ({
        ...slot,
        periodIndex: index + 1,
      })),
    };

    const updatedSettings: SystemSettings = {
      ...settings,
      customSchedules: {
        ...(settings.customSchedules || {}),
        [scheduleKey]: updatedWeek,
      },
    };

    onSaveCustomSchedules(updatedSettings);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleSlotChange = (
    slotIndex: number,
    field: keyof ScheduleLectureSlot,
    value: string
  ) => {
    const next = daySlots.map((slot, idx) =>
      idx === slotIndex ? { ...slot, [field]: value } : slot
    );
    updateDaySlots(next);
  };

  const handleAddLecture = () => {
    const nextPeriod = daySlots.length + 1;
    const defaultTime =
      studyType === 'صباحي'
        ? nextPeriod === 1
          ? '08:30 - 10:00 ص'
          : nextPeriod === 2
          ? '10:15 - 11:45 ص'
          : '12:00 - 01:30 م'
        : nextPeriod === 1
        ? '02:00 - 03:30 م'
        : nextPeriod === 2
        ? '03:45 - 05:15 م'
        : '05:30 - 07:00 م';

    const newSlot: ScheduleLectureSlot = {
      id: `${selectedDay}-${Date.now()}`,
      periodIndex: nextPeriod,
      timeRange: defaultTime,
      subject: 'مادة دراسية جديدة',
      type: 'نظري',
      instructor: 'اسم التدريسي',
      room: 'قاعة (101)',
    };

    updateDaySlots([...daySlots, newSlot]);
  };

  const handleDeleteLecture = (slotIndex: number) => {
    const next = daySlots.filter((_, idx) => idx !== slotIndex);
    updateDaySlots(next);
  };

  const handleResetToDefault = () => {
    const nextCustom = { ...(settings.customSchedules || {}) };
    delete nextCustom[scheduleKey];
    onSaveCustomSchedules({
      ...settings,
      customSchedules: nextCustom,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-[#0F3D3E]" />
            <span>إدارة وتحرير جدول الدروس الأسبوعي</span>
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            اختر المرحلة والشعبة والمجموعة ونوع الدراسة، ثم عدّل المواد والتوقيتات وأسماء التدريسيين والقاعات لكل يوم. تُحفظ التعديلات تلقائياً وتظهر للطلبة فوراً.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تم حفظ التعديل تلقائياً</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleResetToDefault}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>استعادة الافتراضي لهذه الفئة</span>
          </button>
        </div>
      </div>

      {/* Filters Bar: Stage, Section, Group, StudyType, Semester */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* المرحلة */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              1. المرحلة الدراسية
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as AcademicStage)}
              className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-900"
            >
              {STAGES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* الشعبة */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              2. الشعبة
            </label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value as SectionOption)}
              className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-900"
            >
              {SECTIONS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          {/* المجموعة */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              3. المجموعة العملية
            </label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value as GroupOption)}
              className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-900"
            >
              {GROUPS.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>
          </div>

          {/* نوع الدراسة */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              4. نوع الدراسة
            </label>
            <select
              value={studyType}
              onChange={(e) => setStudyType(e.target.value as StudyType)}
              className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-900"
            >
              <option value="صباحي">دراسة صباحية</option>
              <option value="مسائي">دراسة مسائية</option>
            </select>
          </div>

          {/* الفصل الدراسي */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              5. الفصل الدراسي
            </label>
            <select
              value={semester}
              onChange={(e) =>
                setSemester(e.target.value as 'firstSemester' | 'secondSemester')
              }
              className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-900"
            >
              <option value="firstSemester">الفصل الدراسي الأول</option>
              <option value="secondSemester">الفصل الدراسي الثاني</option>
            </select>
          </div>
        </div>

        {/* Days Selector Tabs */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {DAYS_OF_WEEK.map((day) => {
              const active = selectedDay === day;
              const count = (currentWeekSchedule[day] || []).length;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                    active
                      ? 'bg-[#0F3D3E] text-white border-[#0F3D3E] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                  }`}
                >
                  <span>يوم {day}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] tabular-nums ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddLecture}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0F3D3E] hover:bg-[#0b2d2e] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة محاضرة في يوم {selectedDay}</span>
          </button>
        </div>
      </div>

      {/* Day Lectures Editor List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F3D3E]" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display">
              محاضرات يوم {selectedDay} — {stage} ({section} / {group} /{' '}
              {studyType === 'صباحي' ? 'صباحي' : 'مسائي'})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {daySlots.length} محاضرات
          </span>
        </div>

        {daySlots.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-slate-500">
              لا توجد محاضرات مضافة ليوم {selectedDay} في هذه الفئة.
            </p>
            <button
              type="button"
              onClick={handleAddLecture}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0F3D3E] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة محاضرة أولى</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {daySlots.map((slot, index) => (
              <div key={slot.id || index} className="p-4 sm:p-5 space-y-4 hover:bg-slate-50/40">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-[#0F3D3E] bg-[#0F3D3E]/8 border border-[#0F3D3E]/15 px-3 py-1 rounded-lg">
                    المحاضرة #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteLecture(index)}
                    className="min-h-[34px] px-3 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف المحاضرة</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {/* اسم المادة */}
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-[#0F3D3E]" />
                      <span>اسم المادة الدراسية</span>
                    </label>
                    <input
                      type="text"
                      value={slot.subject}
                      onChange={(e) => handleSlotChange(index, 'subject', e.target.value)}
                      placeholder="مثال: هياكل البيانات والخوارزميات"
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold"
                    />
                  </div>

                  {/* الوقت */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#0F3D3E]" />
                      <span>التوقيت (من - إلى)</span>
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={slot.timeRange}
                      onChange={(e) => handleSlotChange(index, 'timeRange', e.target.value)}
                      placeholder="08:30 - 10:00 ص"
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono text-left"
                    />
                  </div>

                  {/* النوع */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      نوع المحاضرة
                    </label>
                    <select
                      value={slot.type}
                      onChange={(e) =>
                        handleSlotChange(index, 'type', e.target.value as 'نظري' | 'عملي')
                      }
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold"
                    >
                      <option value="نظري">نظري</option>
                      <option value="عملي">عملي (مختبر)</option>
                    </select>
                  </div>

                  {/* القاعة أو المختبر */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#0F3D3E]" />
                      <span>القاعة / المختبر</span>
                    </label>
                    <input
                      type="text"
                      value={slot.room}
                      onChange={(e) => handleSlotChange(index, 'room', e.target.value)}
                      placeholder="مثال: قاعة (201) أو مختبر الشبكات"
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                    />
                  </div>

                  {/* اسم التدريسي */}
                  <div className="sm:col-span-2 lg:col-span-5">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-[#0F3D3E]" />
                      <span>اسم التدريسي / المحاضر</span>
                    </label>
                    <input
                      type="text"
                      value={slot.instructor}
                      onChange={(e) => handleSlotChange(index, 'instructor', e.target.value)}
                      placeholder="مثال: أ.م.د. عدنان عذاب السعيدي"
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
