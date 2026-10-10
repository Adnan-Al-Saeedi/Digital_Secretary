import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  X,
  Download,
  Upload,
  RefreshCw,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { AcademicStage, StudentRecord, StudyType } from '../types';
import { normalizeArabicName, safeCell } from '../utils/arabicNormalize';
import { syncStudentRegistryToSheet } from '../services/googleWorkspace';

interface StudentRegistryManagerProps {
  students: StudentRecord[];
  defaultDepartment: string;
  studentSheetUrl: string;
  onUpdateStudents: (newList: StudentRecord[]) => void;
  onShowToast?: (message: string, subtext?: string) => void;
}

const STAGES: AcademicStage[] = [
  'المرحلة الأولى',
  'المرحلة الثانية',
  'المرحلة الثالثة',
  'المرحلة الرابعة',
];

export const StudentRegistryManager: React.FC<StudentRegistryManagerProps> = ({
  students,
  defaultDepartment,
  studentSheetUrl,
  onUpdateStudents,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [studyFilter, setStudyFilter] = useState<string>('all');

  // Add / Edit Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState(defaultDepartment);
  const [stage, setStage] = useState<AcademicStage>('المرحلة الأولى');
  const [studyType, setStudyType] = useState<StudyType>('صباحي');
  const [phone, setPhone] = useState('');
  const [cardId, setCardId] = useState('');
  const [formError, setFormError] = useState('');

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync with Google Sheet state
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null);

  const filteredStudents = useMemo(() => {
    const q = normalizeArabicName(searchQuery);
    const rawQ = searchQuery.trim().toLowerCase();

    return students.filter((st) => {
      const matchesStage = stageFilter === 'all' || st.stage === stageFilter;
      const matchesStudy = studyFilter === 'all' || st.studyType === studyFilter;
      if (!matchesStage || !matchesStudy) return false;

      if (!rawQ) return true;
      return (
        normalizeArabicName(st.fullName).includes(q) ||
        normalizeArabicName(st.department || '').includes(q) ||
        st.phone.toLowerCase().includes(rawQ) ||
        st.cardId.toLowerCase().includes(rawQ)
      );
    });
  }, [students, searchQuery, stageFilter, studyFilter]);

  const openAddForm = () => {
    setEditingStudentId(null);
    setFullName('');
    setDepartment(defaultDepartment);
    setStage('المرحلة الأولى');
    setStudyType('صباحي');
    setPhone('');
    setCardId('');
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditForm = (student: StudentRecord) => {
    setEditingStudentId(student.id);
    setFullName(student.fullName);
    setDepartment(student.department || defaultDepartment);
    setStage(student.stage);
    setStudyType(student.studyType);
    setPhone(student.phone);
    setCardId(student.cardId);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSaveStudent = () => {
    const cleanName = safeCell(fullName, 150);
    const cleanDept = safeCell(department || defaultDepartment, 150);
    const cleanPhone = safeCell(phone, 50);
    const cleanCard = safeCell(cardId, 100);

    if (!cleanName) {
      setFormError('يرجى إدخال الاسم الثلاثي للطالب.');
      return;
    }
    if (!cleanPhone && !cleanCard) {
      setFormError('يرجى إدخال رقم الهاتف أو رقم البطاقة الجامعية على الأقل ليتمكن الطالب من التحقق.');
      return;
    }

    if (editingStudentId) {
      const updated = students.map((s) =>
        s.id === editingStudentId
          ? {
              ...s,
              fullName: cleanName,
              department: cleanDept,
              stage,
              studyType,
              phone: cleanPhone,
              cardId: cleanCard,
            }
          : s
      );
      onUpdateStudents(updated);
      onShowToast?.(
        'تم تحديث بيانات الطالب بنجاح',
        `تم حفظ التعديلات للطالب (${cleanName}) في سجل النظام.`
      );
    } else {
      const newStudent: StudentRecord = {
        id: `STU-${Date.now()}`,
        fullName: cleanName,
        department: cleanDept,
        stage,
        studyType,
        phone: cleanPhone,
        cardId: cleanCard,
      };
      onUpdateStudents([newStudent, ...students]);
      onShowToast?.(
        'تمت إضافة الطالب بنجاح',
        `تم إدراج الطالب (${cleanName}) في سجل الطلبة المعتمد.`
      );
    }

    setIsFormOpen(false);
    setEditingStudentId(null);
  };

  const handleConfirmDelete = (id: string) => {
    const target = students.find((s) => s.id === id);
    const updated = students.filter((s) => s.id !== id);
    onUpdateStudents(updated);
    setDeletingId(null);
    if (target) {
      onShowToast?.(
        'تم حذف سجل الطالب',
        `تمت إزالة الطالب (${target.fullName}) من السجل.`
      );
    }
  };

  const handleExportCsv = () => {
    const headers = ['الاسم الثلاثي', 'القسم', 'المرحلة', 'نوع الدراسة', 'رقم الهاتف', 'رقم البطاقة'];
    const rows = students.map((s) => [
      s.fullName,
      s.department || defaultDepartment,
      s.stage,
      s.studyType,
      s.phone,
      s.cardId,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((r) => r.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `بيانات_الطلبة_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '').replace(/^\uFEFF/, '');
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 2) return;

      const parseLine = (line: string) => {
        const res: string[] = [];
        let cur = '';
        let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') {
            inQ = !inQ;
          } else if (c === ',' && !inQ) {
            res.push(cur.trim());
            cur = '';
          } else {
            cur += c;
          }
        }
        res.push(cur.trim());
        return res;
      };

      const headers = parseLine(lines[0]);
      const findCol = (aliases: string[]) =>
        headers.findIndex((h) =>
          aliases.some((a) => normalizeArabicName(h).includes(normalizeArabicName(a)))
        );

      const nameIdx = findCol(['الاسم الثلاثي', 'الاسم', 'اسم الطالب']);
      const deptIdx = findCol(['القسم', 'القسم العلمي']);
      const stageIdx = findCol(['المرحلة']);
      const studyIdx = findCol(['نوع الدراسة', 'الدراسة']);
      const phoneIdx = findCol(['رقم الهاتف', 'الهاتف', 'الموبايل']);
      const cardIdx = findCol(['رقم البطاقة', 'البطاقة', 'رقم الهوية']);

      const imported: StudentRecord[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseLine(lines[i]);
        const nameVal = cols[nameIdx !== -1 ? nameIdx : 0]?.trim();
        if (!nameVal) continue;

        const rawStage = cols[stageIdx !== -1 ? stageIdx : 2] || '';
        const normSt = normalizeArabicName(rawStage);
        let parsedStage: AcademicStage = 'المرحلة الأولى';
        if (normSt.includes('ثاني') || normSt.includes('2')) parsedStage = 'المرحلة الثانية';
        else if (normSt.includes('ثالث') || normSt.includes('3')) parsedStage = 'المرحلة الثالثة';
        else if (normSt.includes('رابع') || normSt.includes('4')) parsedStage = 'المرحلة الرابعة';

        const rawStudy = cols[studyIdx !== -1 ? studyIdx : 3] || '';
        const parsedStudy: StudyType = normalizeArabicName(rawStudy).includes('مساء')
          ? 'مسائي'
          : 'صباحي';

        imported.push({
          id: `CSV-${Date.now()}-${i}`,
          fullName: nameVal,
          department: (deptIdx !== -1 ? cols[deptIdx] : cols[1])?.trim() || defaultDepartment,
          stage: parsedStage,
          studyType: parsedStudy,
          phone: (phoneIdx !== -1 ? cols[phoneIdx] : cols[4])?.trim() || '',
          cardId: (cardIdx !== -1 ? cols[cardIdx] : cols[5])?.trim() || '',
        });
      }

      if (imported.length > 0) {
        onUpdateStudents(imported);
        onShowToast?.(
          'تم استيراد ملف CSV بنجاح',
          `تم استيراد وتحديث ${imported.length} طالباً وفق الأعمدة الستة المعتمدة.`
        );
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleSyncToGoogleSheet = async () => {
    setIsSyncingSheet(true);
    setSyncStatus(null);
    const res = await syncStudentRegistryToSheet(studentSheetUrl, students, defaultDepartment);
    setSyncStatus(res);
    setIsSyncingSheet(false);
    if (res.success) {
      onShowToast?.('تمت المزامنة مع Google Sheets', res.message);
    }
  };

  return (
    <div className="pt-4 border-t border-slate-200 space-y-4">
      {/* Top Bar: Title + Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm sm:text-base font-bold text-slate-900 font-display flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0F3D3E]" />
            <span>إدارة سجل بيانات الطلبة مباشرة (إضافة · تعديل · حذف)</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[#0F3D3E] text-xs font-mono">
              {students.length} طالب
            </span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            الأعمدة المعتمدة: <strong className="text-slate-700">الاسم الثلاثي، القسم، المرحلة، نوع الدراسة، رقم الهاتف، رقم البطاقة</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAddForm}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#0F3D3E] hover:bg-[#0b2d2e] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة طالب جديد</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#0F3D3E]" />
            <span>تصدير CSV</span>
          </button>

          <label className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-[#0F3D3E]" />
            <span>استيراد CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleImportCsvFile}
              className="hidden"
            />
          </label>

          <button
            type="button"
            disabled={isSyncingSheet}
            onClick={handleSyncToGoogleSheet}
            className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[#0F3D3E]/30 bg-[#0F3D3E]/5 hover:bg-[#0F3D3E]/10 text-[#0F3D3E] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin' : ''}`} />
            <span>{isSyncingSheet ? 'جاري الحفظ في Sheet...' : 'مزامنة التعديلات مع Google Sheet'}</span>
          </button>
        </div>
      </div>

      {syncStatus && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
            syncStatus.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{syncStatus.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncStatus(null)}
            className="text-slate-500 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add / Edit Student Drawer Panel */}
      {isFormOpen && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border-2 border-[#0F3D3E]/25 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <h5 className="text-sm font-bold text-slate-900 font-display">
              {editingStudentId ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد إلى السجل'}
            </h5>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 1. الاسم الثلاثي */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                1. الاسم الثلاثي <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: أحمد محمد علي"
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm"
              />
            </div>

            {/* 2. القسم */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                2. القسم
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder={defaultDepartment}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm"
              />
            </div>

            {/* 3. المرحلة */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                3. المرحلة الدراسية
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as AcademicStage)}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold"
              >
                {STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. نوع الدراسة */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                4. نوع الدراسة
              </label>
              <select
                value={studyType}
                onChange={(e) => setStudyType(e.target.value as StudyType)}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold"
              >
                <option value="صباحي">صباحي</option>
                <option value="مسائي">مسائي</option>
              </select>
            </div>

            {/* 5. رقم الهاتف */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                5. رقم الهاتف
              </label>
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07801234567"
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-mono text-left"
              />
            </div>

            {/* 6. رقم البطاقة */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                6. رقم البطاقة الجامعية
              </label>
              <input
                type="text"
                dir="ltr"
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                placeholder="ATU-2026-101"
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-mono text-left"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="min-h-[38px] px-4 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveStudent}
              className="min-h-[38px] px-5 rounded-xl bg-[#0F3D3E] hover:bg-[#0b2d2e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{editingStudentId ? 'حفظ التعديلات' : 'إضافة الطالب'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم الثلاثي، القسم، رقم الهاتف، أو رقم البطاقة..."
            className="w-full min-h-[40px] pr-9 pl-3 rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white text-xs"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 bg-slate-50/70 text-xs font-semibold text-slate-700"
          >
            <option value="all">جميع المراحل</option>
            {STAGES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={studyFilter}
            onChange={(e) => setStudyFilter(e.target.value)}
            className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 bg-slate-50/70 text-xs font-semibold text-slate-700"
          >
            <option value="all">جميع أنواع الدراسة</option>
            <option value="صباحي">صباحي</option>
            <option value="مسائي">مسائي</option>
          </select>
        </div>
      </div>

      {/* Students Table (6 Columns: الاسم الثلاثي, القسم, المرحلة, نوع الدراسة, رقم الهاتف, رقم البطاقة) */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto max-h-[440px]">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-3.5 font-bold">الاسم الثلاثي</th>
                <th className="py-3 px-3.5 font-bold">القسم</th>
                <th className="py-3 px-3.5 font-bold">المرحلة</th>
                <th className="py-3 px-3.5 font-bold">نوع الدراسة</th>
                <th className="py-3 px-3.5 font-bold">رقم الهاتف</th>
                <th className="py-3 px-3.5 font-bold">رقم البطاقة</th>
                <th className="py-3 px-3.5 font-bold text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    لا توجد سجلات طلبة مطابقة للبحث.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                      {st.fullName}
                    </td>
                    <td className="py-3 px-3.5 text-slate-700">
                      {st.department || defaultDepartment}
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap">
                      {st.stage}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          st.studyType === 'صباحي'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-sky-50 text-sky-800 border border-sky-200'
                        }`}
                      >
                        {st.studyType}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-700 whitespace-nowrap" dir="ltr">
                      {st.phone || '—'}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-700 whitespace-nowrap" dir="ltr">
                      {st.cardId || '—'}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditForm(st)}
                          className="min-h-[32px] px-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#0F3D3E]" />
                          <span>تعديل</span>
                        </button>

                        {deletingId === st.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleConfirmDelete(st.id)}
                              className="min-h-[32px] px-2.5 rounded-lg bg-red-600 text-white font-bold cursor-pointer"
                            >
                              تأكيد
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="min-h-[32px] px-2 rounded-lg border border-slate-300 text-slate-600 cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingId(st.id)}
                            className="min-h-[32px] px-2.5 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
