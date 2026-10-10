import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  UserCheck,
  BookOpen,
  FlaskConical,
  ArrowRight,
  Sun,
  Moon,
  Printer,
  GraduationCap,
  Layers,
  Users,
  CheckCircle2,
  Loader2,
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
import { CURRICULUM_2026_2027 } from '../data/curriculumAndSeed';
import { printOrDownloadElement } from './OfficialPdfDocument';

interface ClassScheduleViewProps {
  settings: SystemSettings;
  onBack: () => void;
}

export interface DaySchedule {
  dayName: ScheduleDayName;
  slots: ScheduleLectureSlot[];
}

export const STAGES: AcademicStage[] = [
  'المرحلة الأولى',
  'المرحلة الثانية',
  'المرحلة الثالثة',
  'المرحلة الرابعة',
];

export const SECTIONS: SectionOption[] = ['شعبة A', 'شعبة B'];
export const GROUPS: GroupOption[] = ['مجموعة 1', 'مجموعة 2'];

export const DAYS_OF_WEEK: ScheduleDayName[] = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
];

const INSTRUCTORS_BY_STAGE: Record<AcademicStage, string[]> = {
  'المرحلة الأولى': [
    'أ.م.د. عدنان عذاب السعيدي',
    'م.د. حيدر كاظم الشمري',
    'م. زينب عبد الله الربيعي',
    'م.م. علي فاضل الموسوي',
    'م.د. سارة محمد الجنابي',
  ],
  'المرحلة الثانية': [
    'أ.د. محمد جاسم الخفاجي',
    'أ.م.د. رنا رحيم الفتلاوي',
    'م.د. مصطفى كامل العبيدي',
    'م. نور الهدى حسن',
    'م.م. أحمد ثامر الكناني',
  ],
  'المرحلة الثالثة': [
    'أ.م.د. عدنان عذاب السعيدي',
    'أ.م.د. وسام عبد الأمير',
    'م.د. فاطمة جواد كاظم',
    'م.د. كرار حيدر الياسري',
    'م.م. حسين علاء الدليمي',
  ],
  'المرحلة الرابعة': [
    'أ.د. صادق جعفر الحسيني',
    'أ.م.د. عدنان عذاب السعيدي',
    'أ.م.د. بان طارق العزاوي',
    'م.د. عمر فاروق الحديثي',
  ],
};

export function buildScheduleKey(
  stage: AcademicStage,
  section: SectionOption,
  group: GroupOption,
  studyType: StudyType,
  semester: 'firstSemester' | 'secondSemester'
): string {
  return `${stage}|${section}|${group}|${studyType}|${semester}`;
}

export function getDefaultWeekSchedule(
  stage: AcademicStage,
  section: SectionOption,
  group: GroupOption,
  studyType: StudyType,
  semester: 'firstSemester' | 'secondSemester'
): Record<ScheduleDayName, ScheduleLectureSlot[]> {
  const subjects = CURRICULUM_2026_2027[stage][semester];
  const instructors = INSTRUCTORS_BY_STAGE[stage];

  const morningTimes = [
    '08:30 - 10:00 ص',
    '10:15 - 11:45 ص',
    '12:00 - 01:30 م',
  ];
  const eveningTimes = [
    '02:00 - 03:30 م',
    '03:45 - 05:15 م',
    '05:30 - 07:00 م',
  ];

  const timeSlots = studyType === 'صباحي' ? morningTimes : eveningTimes;
  const sectionOffset = section === 'شعبة A' ? 0 : 1;
  const groupOffset = group === 'مجموعة 1' ? 0 : 1;
  const stageNum = STAGES.indexOf(stage) + 1;

  const result = {} as Record<ScheduleDayName, ScheduleLectureSlot[]>;

  DAYS_OF_WEEK.forEach((dayName, dayIdx) => {
    const slots: ScheduleLectureSlot[] = [];

    // First Period
    const subj1Idx = (dayIdx + sectionOffset) % subjects.length;
    const isPractical1 = (dayIdx + groupOffset) % 3 === 1;
    slots.push({
      id: `${dayName}-1`,
      periodIndex: 1,
      timeRange: timeSlots[0],
      subject: subjects[subj1Idx],
      type: isPractical1 ? 'عملي' : 'نظري',
      instructor: instructors[subj1Idx % instructors.length],
      room: isPractical1
        ? `مختبر الشبكات والبرمجة (${groupOffset + 1})`
        : `قاعة (${stageNum}0${sectionOffset + 1})`,
    });

    // Second Period
    const subj2Idx = (dayIdx + 2 + sectionOffset) % subjects.length;
    const isPractical2 = !isPractical1 && (dayIdx + groupOffset) % 2 === 0;
    slots.push({
      id: `${dayName}-2`,
      periodIndex: 2,
      timeRange: timeSlots[1],
      subject: subjects[subj2Idx],
      type: isPractical2 ? 'عملي' : 'نظري',
      instructor: instructors[subj2Idx % instructors.length],
      room: isPractical2
        ? `مختبر الأنظمة المتقدمة (${groupOffset + 2})`
        : `قاعة (${stageNum}0${sectionOffset + 2})`,
    });

    // Third Period
    if (dayIdx === 0 || dayIdx === 2 || dayIdx === 3) {
      const subj3Idx = (dayIdx + 3 + groupOffset) % subjects.length;
      slots.push({
        id: `${dayName}-3`,
        periodIndex: 3,
        timeRange: timeSlots[2],
        subject: subjects[subj3Idx],
        type: 'عملي',
        instructor: instructors[subj3Idx % instructors.length],
        room: `مختبر الحاسبات المركزي (${group === 'مجموعة 1' ? 'A' : 'B'})`,
      });
    }

    result[dayName] = slots;
  });

  return result;
}

export const ClassScheduleView: React.FC<ClassScheduleViewProps> = ({
  settings,
  onBack,
}) => {
  const [selectedStage, setSelectedStage] = useState<AcademicStage | ''>('');
  const [selectedSection, setSelectedSection] = useState<SectionOption | ''>('');
  const [selectedGroup, setSelectedGroup] = useState<GroupOption | ''>('');
  const [selectedStudyType, setSelectedStudyType] = useState<StudyType | ''>('');
  const [selectedSemester, setSelectedSemester] = useState<'firstSemester' | 'secondSemester'>('firstSemester');
  const [activeDayFilter, setActiveDayFilter] = useState<string>('الكل');
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrintSchedule = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    const fileName = `جدول_الدروس_${selectedStage}_${selectedSection}_${selectedGroup}`;
    await printOrDownloadElement('printable-schedule-area', fileName);
    setIsPrinting(false);
  };

  const isSelectionComplete =
    Boolean(selectedStage) &&
    Boolean(selectedSection) &&
    Boolean(selectedGroup) &&
    Boolean(selectedStudyType);

  // Read admin-customized schedule if saved, otherwise fallback to default schedule
  const scheduleData = useMemo<DaySchedule[]>(() => {
    if (!selectedStage || !selectedSection || !selectedGroup || !selectedStudyType) {
      return [];
    }

    const key = buildScheduleKey(
      selectedStage,
      selectedSection,
      selectedGroup,
      selectedStudyType,
      selectedSemester
    );

    const customWeek = settings.customSchedules?.[key];
    const defaultWeek = getDefaultWeekSchedule(
      selectedStage,
      selectedSection,
      selectedGroup,
      selectedStudyType,
      selectedSemester
    );

    const activeWeek = customWeek || defaultWeek;

    return DAYS_OF_WEEK.map((dayName) => ({
      dayName,
      slots: activeWeek[dayName] || [],
    }));
  }, [
    selectedStage,
    selectedSection,
    selectedGroup,
    selectedStudyType,
    selectedSemester,
    settings.customSchedules,
  ]);

  const filteredDays = useMemo(() => {
    if (activeDayFilter === 'الكل') return scheduleData;
    return scheduleData.filter((d) => d.dayName === activeDayFilter);
  }, [scheduleData, activeDayFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]" dir="rtl">
      {/* Header */}
      <header className="bg-[#0F3D3E] text-white border-b border-white/10 print:bg-white print:text-slate-900 print:border-slate-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {settings.logoDataUrl ? (
              <img
                src={settings.logoDataUrl}
                alt={settings.universityName}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-xl object-contain bg-white p-1 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                <CalendarDays className="w-6 h-6 text-emerald-200" />
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-xl font-bold font-display tracking-tight">
                جدول الدروس الأسبوعي
              </h1>
              <p className="text-xs text-emerald-100/85 print:text-slate-600">
                {settings.departmentName} · {settings.collegeName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="print:hidden min-h-[42px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للرئيسية</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Selection Panel (No login required) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#0F3D3E]" />
                <span>استعلام جدول المحاضرات الأسبوعي</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                متاح لجميع الطلبة مباشرة دون تسجيل — حدد المرحلة والشعبة والمجموعة ونوع الدراسة لعرض جدولك.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#0F3D3E] bg-emerald-50 border border-emerald-200/70 px-3 py-1.5 rounded-lg self-start sm:self-center">
              العام الدراسي {settings.academicYear || settings.curriculumYear}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. اختيار المرحلة */}
            <div className="space-y-2.5">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-[#0F3D3E]" />
                <span>1. اختيار المرحلة الدراسية</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STAGES.map((stage) => {
                  const active = selectedStage === stage;
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setSelectedStage(stage)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center text-center cursor-pointer ${
                        active
                          ? 'bg-[#0F3D3E] text-white border-[#0F3D3E] shadow-xs'
                          : 'bg-slate-50/80 text-slate-700 border-slate-200 hover:border-[#0F3D3E]/50 hover:bg-white'
                      }`}
                    >
                      {stage}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. اختيار الشعبة والمجموعة */}
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#0F3D3E]" />
                  <span>2. اختيار الشعبة والمجموعة</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SECTIONS.map((sec) => {
                    const active = selectedSection === sec;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setSelectedSection(sec)}
                        className={`min-h-[42px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center cursor-pointer ${
                          active
                            ? 'bg-[#0F3D3E] text-white border-[#0F3D3E] shadow-xs'
                            : 'bg-slate-50/80 text-slate-700 border-slate-200 hover:border-[#0F3D3E]/50 hover:bg-white'
                        }`}
                      >
                        {sec}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                {GROUPS.map((grp) => {
                  const active = selectedGroup === grp;
                  return (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => setSelectedGroup(grp)}
                      className={`min-h-[42px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        active
                          ? 'bg-[#0F3D3E] text-white border-[#0F3D3E] shadow-xs'
                          : 'bg-slate-50/80 text-slate-700 border-slate-200 hover:border-[#0F3D3E]/50 hover:bg-white'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{grp}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. اختيار نوع الدراسة */}
            <div className="space-y-2.5">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#0F3D3E]" />
                <span>3. اختيار نوع الدراسة</span>
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedStudyType('صباحي')}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-between cursor-pointer ${
                    selectedStudyType === 'صباحي'
                      ? 'bg-[#0F3D3E] text-white border-[#0F3D3E] shadow-xs'
                      : 'bg-slate-50/80 text-slate-700 border-slate-200 hover:border-[#0F3D3E]/50 hover:bg-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>دراسة صباحية</span>
                  </span>
                  <span className="text-[11px] opacity-80 font-normal">08:30 ص – 01:30 م</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStudyType('مسائي')}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-between cursor-pointer ${
                    selectedStudyType === 'مسائي'
                      ? 'bg-[#0F3D3E] text-white border-[#0F3D3E] shadow-xs'
                      : 'bg-slate-50/80 text-slate-700 border-slate-200 hover:border-[#0F3D3E]/50 hover:bg-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-sky-300" />
                    <span>دراسة مسائية</span>
                  </span>
                  <span className="text-[11px] opacity-80 font-normal">02:00 م – 07:00 م</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Empty State before completing selections */}
        {!isSelectionComplete ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0F3D3E]/8 border border-[#0F3D3E]/15 flex items-center justify-center mx-auto text-[#0F3D3E]">
              <CalendarDays className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                يرجى استكمال الاختيارات أعلاه لعرض الجدول
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                اختر المرحلة الدراسية، الشعبة والمجموعة، ونوع الدراسة (دراسة صباحية أو دراسة مسائية) ليظهر لك جدول الدروس الأسبوعي الكامل مع القاعات والمختبرات.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
              <span className={`px-3 py-1 rounded-lg border ${selectedStage ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                المرحلة: {selectedStage || 'لم تُحدد'}
              </span>
              <span className={`px-3 py-1 rounded-lg border ${selectedSection ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                الشعبة: {selectedSection || 'لم تُحدد'}
              </span>
              <span className={`px-3 py-1 rounded-lg border ${selectedGroup ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                المجموعة: {selectedGroup || 'لم تُحدد'}
              </span>
              <span className={`px-3 py-1 rounded-lg border ${selectedStudyType ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                نوع الدراسة: {selectedStudyType ? (selectedStudyType === 'صباحي' ? 'دراسة صباحية' : 'دراسة مسائية') : 'لم يُحدد'}
              </span>
            </div>
          </div>
        ) : (
          /* Schedule Display */
          <section id="printable-schedule-area" className="space-y-5">
            {/* Summary Bar & Controls */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>الجدول المعتمد</span>
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                    {selectedStage} — {selectedSection} ({selectedGroup}) —{' '}
                    {selectedStudyType === 'صباحي' ? 'دراسة صباحية' : 'دراسة مسائية'}
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  {settings.departmentName} · توزيع المحاضرات النظرية والمختبرات العملية
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 print:hidden">
                {/* Semester Switcher */}
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSelectedSemester('firstSemester')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      selectedSemester === 'firstSemester'
                        ? 'bg-white text-[#0F3D3E] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    الفصل الأول
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSemester('secondSemester')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      selectedSemester === 'secondSemester'
                        ? 'bg-white text-[#0F3D3E] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    الفصل الثاني
                  </button>
                </div>

                {/* Print / Download PDF Button */}
                <button
                  type="button"
                  disabled={isPrinting}
                  onClick={handlePrintSchedule}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isPrinting ? (
                    <>
                      <Loader2 className="w-4 h-4 text-[#0F3D3E] animate-spin" />
                      <span>جاري تجهيز PDF والطباعة...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4 text-[#0F3D3E]" />
                      <span>طباعة / تنزيل الجدول (PDF)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Day Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
              {['الكل', ...DAYS_OF_WEEK].map((day) => {
                const active = activeDayFilter === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setActiveDayFilter(day)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
                      active
                        ? 'bg-[#0F3D3E] text-white border-[#0F3D3E]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {day === 'الكل' ? 'جميع أيام الأسبوع' : `يوم ${day}`}
                  </button>
                );
              })}
            </div>

            {/* Weekly Timetable Cards */}
            <div className="space-y-4">
              {filteredDays.map((dayObj) => (
                <div
                  key={dayObj.dayName}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
                >
                  <div className="bg-slate-50/90 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0F3D3E]" />
                      <h4 className="text-base font-bold text-slate-900 font-display">
                        يوم {dayObj.dayName}
                      </h4>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {dayObj.slots.length} محاضرات
                    </span>
                  </div>

                  {dayObj.slots.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      لا توجد محاضرات مجدولة في هذا اليوم.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {dayObj.slots.map((slot, idx) => (
                        <div
                          key={slot.id || idx}
                          className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                        >
                          {/* Time & Period */}
                          <div className="md:col-span-3 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#0F3D3E]/8 border border-[#0F3D3E]/15 text-[#0F3D3E] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                              0{slot.periodIndex || idx + 1}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-[#0F3D3E]" />
                                <span dir="ltr">{slot.timeRange}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                المحاضرة #{slot.periodIndex || idx + 1}
                              </p>
                            </div>
                          </div>

                          {/* Subject Name & Type */}
                          <div className="md:col-span-5 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-sm sm:text-base font-bold text-slate-900 font-display">
                                {slot.subject}
                              </h5>
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                                  slot.type === 'عملي'
                                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                }`}
                              >
                                {slot.type === 'عملي' ? (
                                  <FlaskConical className="w-3 h-3 text-amber-700" />
                                ) : (
                                  <BookOpen className="w-3 h-3 text-emerald-700" />
                                )}
                                <span>{slot.type}</span>
                              </span>
                            </div>
                          </div>

                          {/* Instructor & Room */}
                          <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col lg:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-medium text-slate-700">{slot.instructor}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[#0F3D3E] font-bold bg-slate-100/80 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span>{slot.room}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
