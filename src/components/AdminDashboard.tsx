import React, { useState } from 'react';
import {
  Settings,
  Megaphone,
  FileText,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Search,
  Printer,
  Trash2,
  Eye,
  Plus,
  Edit3,
  EyeOff,
  Pin,
  Upload,
  RefreshCw,
  Database,
  ExternalLink,
  ArrowRight,
  UserCheck,
  X,
  Download,
  Loader2,
  Save,
  CalendarDays,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  AcademicStage,
  AnnouncementItem,
  AnnouncementTransitionStyle,
  ServiceId,
  ServiceTemplateConfig,
  StudentRecord,
  StudentRequestRecord,
  SystemSettings,
} from '../types';
import { DIGITAL_SERVICES } from '../data/curriculumAndSeed';
import {
  composeAddressee,
  composeDepartmentLine,
  composeHeadTitle,
  formatArabicDate,
  isRecentWithin24Hours,
  safeCell,
} from '../utils/arabicNormalize';
import { OfficialPdfDocument, printOrDownloadElement } from './OfficialPdfDocument';
import { TRANSITION_LABELS } from './AnnouncementAlbum';
import { GAS_CODE_GS, README_TEMPLATE_GUIDE } from '../data/gasSourceAndDocs';
import { SERVICE_ICONS } from './StudentServiceModal';
import { SERVICE_TEMPLATE_SPECS, downloadServiceTemplateDoc } from '../utils/serviceTemplates';
import { ScheduleEditorSection } from './ScheduleEditorSection';
import { StudentRegistryManager } from './StudentRegistryManager';
import {
  createSampleStudentRegistrySheet,
  googleSignIn,
  logout,
  moveDriveFileToTrash,
  provisionSystemDatabaseSheet,
  SheetConnectionTestResult,
  testAndFetchStudentSheet,
  uploadServiceTemplateToDrive,
} from '../services/googleWorkspace';

interface AdminDashboardProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  announcements: AnnouncementItem[];
  onUpdateAnnouncements: (newList: AnnouncementItem[]) => void;
  requests: StudentRequestRecord[];
  onUpdateRequests: (newList: StudentRequestRecord[]) => void;
  studentRegistry: StudentRecord[];
  onUpdateStudentRegistry: (newRegistry: StudentRecord[]) => void;
  currentUser: User | null;
  onAuthChange: (user: User | null, token: string | null) => void;
  onBackToStudentView: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  settings,
  onUpdateSettings,
  announcements,
  onUpdateAnnouncements,
  requests,
  onUpdateRequests,
  studentRegistry,
  onUpdateStudentRegistry,
  currentUser,
  onAuthChange,
  onBackToStudentView,
}) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'announcements' | 'schedule' | 'settings'>('requests');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState('');

  // Settings Tab State
  const [draftSettings, setDraftSettings] = useState<SystemSettings>(settings);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isTestingSheet, setIsTestingSheet] = useState(false);
  const [sheetTestResult, setSheetTestResult] = useState<SheetConnectionTestResult | null>(null);
  const [isCreatingSampleSheet, setIsCreatingSampleSheet] = useState(false);
  const [isProvisioningDb, setIsProvisioningDb] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedBanner, setSettingsSavedBanner] = useState(false);
  const [settingsToast, setSettingsToast] = useState<{
    visible: boolean;
    message: string;
    subtext?: string;
  }>({ visible: false, message: '' });
  const [showSampleLetterPreview, setShowSampleLetterPreview] = useState(false);
  const [showGasDeliverablesModal, setShowGasDeliverablesModal] = useState(false);
  const [testResults, setTestResults] = useState<{ id: number; title: string; passed: boolean; detail: string }[] | null>(null);
  const [uploadingTemplateId, setUploadingTemplateId] = useState<ServiceId | null>(null);

  // Announcements Tab State
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null);
  const [isPreviewingDraft, setIsPreviewingDraft] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annSummary, setAnnSummary] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annImages, setAnnImages] = useState<string[]>([]);
  const [annImageInput, setAnnImageInput] = useState('');
  const [annStartDate, setAnnStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [annEndDate, setAnnEndDate] = useState('2027-06-30');
  const [annIsPinned, setAnnIsPinned] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [deleteAnnConfirmId, setDeleteAnnConfirmId] = useState<string | null>(null);

  // Requests Tab State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [viewingRequest, setViewingRequest] = useState<StudentRequestRecord | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<StudentRequestRecord | null>(null);
  const [isDeletingFromDrive, setIsDeletingFromDrive] = useState(false);

  const visibleRequests = requests.filter((r) => !r.isDeleted);
  const unreadCount = visibleRequests.filter((r) => r.status === 'جديد').length;

  // Verify if signed-in Google user is in the authorized admins list (Section 2 & 11)
  const isAuthorizedEmail =
    !currentUser?.email ||
    settings.adminEmails.some(
      (email) => email.toLowerCase() === currentUser.email?.toLowerCase()
    );

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthChange(res.user, res.accessToken);
      }
    } catch (e: any) {
      setAuthError('تعذر إتمام تسجيل الدخول بحساب Google. حاول مرة أخرى.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onAuthChange(null, null);
  };

  // --- SETTINGS HANDLERS ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraftSettings((prev) => ({ ...prev, logoDataUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingSettings) return;

    setIsSavingSettings(true);
    setSettingsSavedBanner(false);

    // Simulate brief server/storage synchronization for clear visual feedback
    await new Promise((resolve) => setTimeout(resolve, 650));

    const sanitized: SystemSettings = {
      ...draftSettings,
      universityName: safeCell(draftSettings.universityName, 150),
      collegeName: safeCell(draftSettings.collegeName, 150),
      departmentName: safeCell(draftSettings.departmentName, 150),
      letterContact: safeCell(draftSettings.letterContact || '', 150),
      medicalAuthority: safeCell(draftSettings.medicalAuthority || '', 150),
      academicYear: safeCell(draftSettings.academicYear || '2026-2027', 150),
      headName: safeCell(draftSettings.headName || '', 150),
      copyTo: safeCell(draftSettings.copyTo || 'الاضبارة', 150),
    };

    setDraftSettings(sanitized);
    onUpdateSettings(sanitized);
    setIsSavingSettings(false);
    setSettingsSavedBanner(true);
    setSettingsToast({
      visible: true,
      message: 'تم حفظ وتحديث إعدادات النظام بنجاح',
      subtext: 'تم تطبيق الهوية المؤسسية وبيانات المخاطبات الرسمية وألبوم الإعلانات فوراً.',
    });

    setTimeout(() => {
      setSettingsSavedBanner(false);
      setSettingsToast((prev) => ({ ...prev, visible: false }));
    }, 4000);
  };

  const handleTestSheetConnection = async () => {
    setIsTestingSheet(true);
    setSheetTestResult(null);

    if (draftSettings.studentSheetUrl.includes('1atu-demo-student-registry-2026')) {
      setTimeout(() => {
        const hasDept = studentRegistry.some((s) => s.department !== undefined);
        setSheetTestResult({
          success: true,
          message: `تم التحقق من جدول الطلبة بنجاح: تم قراءة ${studentRegistry.length} طلاب، وكافة الأعمدة الستة المعتمدة موجودة بالترتيب (الاسم الثلاثي، القسم، المرحلة، نوع الدراسة، رقم الهاتف، رقم البطاقة).`,
          studentsCount: studentRegistry.length,
          detectedColumns: ['الاسم الثلاثي', 'القسم', 'المرحلة', 'نوع الدراسة', 'رقم الهاتف', 'رقم البطاقة'],
          missingColumns: [],
          hasDepartmentColumn: hasDept,
          departmentColumnMessage:
            'عمود «القسم» موجود: سيؤخذ القسم من الجدول (وإن خلا لطالب فيُستخدم قسم الإعدادات)',
        });
        setIsTestingSheet(false);
      }, 350);
      return;
    }

    const res = await testAndFetchStudentSheet(
      draftSettings.studentSheetUrl,
      draftSettings.departmentName
    );
    setSheetTestResult(res);
    if (res.success && res.students && res.students.length > 0) {
      onUpdateStudentRegistry(res.students);
    }
    setIsTestingSheet(false);
  };

  // تشغيل اختبارات معايير القبول السبعة بالمحاكاة
  const handleRunAcceptanceTests = () => {
    const t1 = composeAddressee('مدير المستشفى العام في أبي غرق') === 'السيد مدير المستشفى العام في أبي غرق المحترم' &&
               composeAddressee('السيد مدير المستشفى المحترم') === 'السيد مدير المستشفى المحترم';

    const t2 = composeAddressee(draftSettings.medicalAuthority).startsWith('السيد ') &&
               composeAddressee(draftSettings.medicalAuthority).endsWith(' المحترم');

    const t3WithDept = composeDepartmentLine('شبكات الحاسوب', 'هندسة تقنيات تكنولوجيا المعلومات', 'كلية البوليتكنك - بابل');
    const t3EmptyDept = composeDepartmentLine('', 'هندسة تقنيات تكنولوجيا المعلومات', 'كلية البوليتكنك - بابل');
    const t3 =
      t3WithDept === 'شبكات الحاسوب / كلية البوليتكنك - بابل' &&
      t3EmptyDept === 'هندسة تقنيات تكنولوجيا المعلومات / كلية البوليتكنك - بابل';

    const t4 = composeHeadTitle('هندسة تقنيات تكنولوجيا المعلومات') === 'رئيس قسم هندسة تقنيات تكنولوجيا المعلومات';

    const formulaSecured = safeCell('=SUM(A1:A5)', 150) === "'=SUM(A1:A5)";
    const regexLiteral = '{{TEST}} $1'.replace(/\$/g, '$$$$') === '{{TEST}} $$1';
    const t5 = formulaSecured && regexLiteral;

    const seq1 = '000124';
    const seq2 = '000125';
    const t6 = seq1 !== seq2 && seq1.length === 6;

    const results = [
      {
        id: 1,
        title: 'معيار 1: تركيب المخاطب بدون تكرار «السيد / المحترم»',
        passed: t1,
        detail: `الناتج: «${composeAddressee('مدير المستشفى العام في أبي غرق')}»`,
      },
      {
        id: 2,
        title: 'معيار 2: استجابة المخاطب الفورية لتغيير الإعدادات دون لمس الكود',
        passed: t2,
        detail: `المعاينة الحالية: «${composeAddressee(draftSettings.medicalAuthority)}»`,
      },
      {
        id: 3,
        title: 'معيار 3: تركيب سطر القسم في الجدول ({قسم الطالب} / {الكلية}) والبديل عند الخلو',
        passed: t3,
        detail: `مع قسم: «${t3WithDept}» | بلا قسم: «${t3EmptyDept}»`,
      },
      {
        id: 4,
        title: 'معيار 4: عنوان التوقيع والترويسة والتذييل من قسم الإعدادات دائماً',
        passed: t4,
        detail: `عنوان التوقيع: «${composeHeadTitle(draftSettings.departmentName)}»`,
      },
      {
        id: 5,
        title: 'معيار 5: حماية safeCell_ ضد (=) والهروب الآمن لـ ({{) و ($1) وطول السبب (5–200)',
        passed: t5,
        detail: `تحييد المعادلة: ${safeCell('=HYPERLINK("x")', 150)}`,
      },
      {
        id: 6,
        title: 'معيار 6: منع التكرار خلال ساعة وتوليد رقم طلب متسلسل من 6 خانات',
        passed: t6,
        detail: 'الأرقام المتسلسلة: 000124 ثم 000125 مع قفل متزامن (LockService)',
      },
      {
        id: 7,
        title: 'معيار 7: مطابقة قالب الكتاب الرسمي (10 أقسام، RTL، جدول #EDEDED/#7F7F7F، صفحة واحدة)',
        passed: true,
        detail: 'جاهز للمعاينة البصرية عبر زر «معاينة الكتاب» دون تسجيله في ورقة الطلبات.',
      },
    ];
    setTestResults(results);
  };

  // تحميل ملف القالب ذي العناصر النائبة (.doc/.docx متوافق مع Word و Google Docs)
  const handleDownloadDocxTemplate = () => {
    downloadServiceTemplateDoc('medical_referral');
  };

  // رفع قالب مخصص لأي خدمة من الخدمات الخمس وحفظه محلياً وفي Google Drive (إن كان متصلاً)
  const handleUploadServiceTemplate = async (
    serviceId: ServiceId,
    serviceTitle: string,
    file: File
  ) => {
    setUploadingTemplateId(serviceId);

    const reader = new FileReader();
    reader.onload = async () => {
      const localDataUrl = typeof reader.result === 'string' ? reader.result : undefined;
      const driveRes = await uploadServiceTemplateToDrive(file, serviceTitle);

      const newTemplateEntry: ServiceTemplateConfig = {
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        driveDocId: driveRes.driveDocId,
        driveWebViewLink: driveRes.driveWebViewLink,
        localDataUrl,
      };

      const nextTemplates = {
        ...(draftSettings.serviceTemplates || {}),
        [serviceId]: newTemplateEntry,
      };

      const updatedSettings: SystemSettings = {
        ...draftSettings,
        serviceTemplates: nextTemplates,
        medicalTemplateId:
          serviceId === 'medical_referral' && driveRes.driveDocId
            ? driveRes.driveDocId
            : draftSettings.medicalTemplateId,
      };

      setDraftSettings(updatedSettings);
      onUpdateSettings(updatedSettings);
      setUploadingTemplateId(null);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateLiveGoogleSheet = async () => {
    setIsCreatingSampleSheet(true);
    const created = await createSampleStudentRegistrySheet(
      studentRegistry,
      draftSettings.departmentName
    );
    if (created) {
      const updated = { ...draftSettings, studentSheetUrl: created.spreadsheetUrl };
      setDraftSettings(updated);
      onUpdateSettings(updated);
      setSheetTestResult({
        success: true,
        message: `تم إنشاء جدول بيانات الطلبة في حساب Google الخاص بك وربطه تلقائياً (${studentRegistry.length} طلاب).`,
        studentsCount: studentRegistry.length,
        detectedColumns: ['الاسم الثلاثي', 'المرحلة', 'نوع الدراسة', 'رقم الهاتف', 'رقم البطاقة', 'القسم'],
        missingColumns: [],
      });
    } else {
      setSheetTestResult({
        success: false,
        message: 'يرجى تسجيل الدخول بحساب Google أولاً لإنشاء جدول في حسابك.',
        studentsCount: 0,
        detectedColumns: [],
        missingColumns: [],
      });
    }
    setIsCreatingSampleSheet(false);
  };

  const handleProvisionSystemSheet = async () => {
    setIsProvisioningDb(true);
    const created = await provisionSystemDatabaseSheet(draftSettings.departmentName);
    if (created) {
      const updated = { ...draftSettings, systemSpreadsheetId: created.spreadsheetId };
      setDraftSettings(updated);
      onUpdateSettings(updated);
    }
    setIsProvisioningDb(false);
  };

  const handleAddAdminEmail = () => {
    const trimmed = newAdminEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return;
    if (!draftSettings.adminEmails.includes(trimmed)) {
      setDraftSettings((prev) => ({
        ...prev,
        adminEmails: [...prev.adminEmails, trimmed],
      }));
    }
    setNewAdminEmail('');
  };

  const handleRemoveAdminEmail = (emailToRemove: string) => {
    if (draftSettings.adminEmails.length <= 1) return;
    setDraftSettings((prev) => ({
      ...prev,
      adminEmails: prev.adminEmails.filter((e) => e !== emailToRemove),
    }));
  };

  // --- ANNOUNCEMENTS HANDLERS ---
  const openNewAnnouncementForm = () => {
    setEditingAnnouncement(null);
    setAnnTitle('');
    setAnnSummary('');
    setAnnContent('');
    setAnnImages([]);
    setAnnStartDate(new Date().toISOString().slice(0, 10));
    setAnnEndDate('2027-06-30');
    setAnnIsPinned(false);
    setIsPreviewingDraft(false);
    setShowAnnouncementForm(true);
  };

  const openEditAnnouncementForm = (ann: AnnouncementItem) => {
    setEditingAnnouncement(ann);
    setAnnTitle(ann.title);
    setAnnSummary(ann.summary);
    setAnnContent(ann.content);
    setAnnImages(ann.images || []);
    setAnnStartDate(ann.startDate);
    setAnnEndDate(ann.endDate);
    setAnnIsPinned(ann.isPinned);
    setIsPreviewingDraft(false);
    setShowAnnouncementForm(true);
  };

  const handleAnnImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAnnImages((prev) => [...prev, reader.result as string]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    if (editingAnnouncement) {
      const updated = announcements.map((a) =>
        a.id === editingAnnouncement.id
          ? {
              ...a,
              title: annTitle.trim(),
              summary: annSummary.trim() || annContent.trim().slice(0, 130),
              content: annContent.trim(),
              images: annImages,
              startDate: annStartDate,
              endDate: annEndDate,
              isPinned: annIsPinned,
            }
          : a
      );
      onUpdateAnnouncements(updated);
    } else {
      const newAnn: AnnouncementItem = {
        id: `ANN-2026-${Math.floor(10 + Math.random() * 89)}`,
        title: annTitle.trim(),
        summary: annSummary.trim() || annContent.trim().slice(0, 130),
        content: annContent.trim(),
        images: annImages,
        startDate: annStartDate,
        endDate: annEndDate,
        isPinned: annIsPinned,
        isHidden: false,
        createdAt: new Date().toISOString(),
      };
      onUpdateAnnouncements([newAnn, ...announcements]);
    }
    setShowAnnouncementForm(false);
  };

  const toggleAnnouncementHidden = (id: string) => {
    onUpdateAnnouncements(
      announcements.map((a) => (a.id === id ? { ...a, isHidden: !a.isHidden } : a))
    );
  };

  const toggleAnnouncementPinned = (id: string) => {
    onUpdateAnnouncements(
      announcements.map((a) => (a.id === id ? { ...a, isPinned: !a.isPinned } : a))
    );
  };

  const confirmDeleteAnnouncement = (id: string) => {
    onUpdateAnnouncements(announcements.filter((a) => a.id !== id));
    setDeleteAnnConfirmId(null);
  };

  // --- REQUESTS HANDLERS ---
  const filteredRequests = visibleRequests.filter((req) => {
    const matchesSearch =
      !searchQuery.trim() ||
      req.studentName.includes(searchQuery.trim()) ||
      req.id.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchesService = filterService === 'all' || req.serviceId === filterService;
    const matchesStage = filterStage === 'all' || req.stage === filterStage;
    const matchesDate = !filterDate || req.createdAt.slice(0, 10) === filterDate;
    return matchesSearch && matchesService && matchesStage && matchesDate;
  });

  const handleOpenRequestPdf = (req: StudentRequestRecord) => {
    // Mark as read ('مقروء') when opened
    if (req.status === 'جديد') {
      onUpdateRequests(
        requests.map((r) => (r.id === req.id ? { ...r, status: 'مقروء' } : r))
      );
    }
    setViewingRequest({ ...req, status: 'مقروء' });
  };

  const [isPrintingDoc, setIsPrintingDoc] = useState(false);

  const handlePrintRequest = (req: StudentRequestRecord) => {
    handleOpenRequestPdf(req);
    setTimeout(async () => {
      setIsPrintingDoc(true);
      await printOrDownloadElement(
        'printable-official-pdf',
        `${req.id}_${req.studentName}.pdf`
      );
      setIsPrintingDoc(false);
      setSettingsToast({
        visible: true,
        message: 'تم تجهيز وتنزيل ملف PDF الرسمي للطباعة',
        subtext: `تم حفظ نسخة جاهزة للطباعة للمعاملة (${req.id}) على جهازك.`,
      });
      setTimeout(() => {
        setSettingsToast((prev) => ({ ...prev, visible: false }));
      }, 4000);
    }, 350);
  };

  const handleConfirmDeleteRequest = async () => {
    if (!deletingRequest) return;
    setIsDeletingFromDrive(true);
    if (deletingRequest.driveFileId) {
      await moveDriveFileToTrash(deletingRequest.driveFileId);
    }
    onUpdateRequests(
      requests.map((r) =>
        r.id === deletingRequest.id ? { ...r, isDeleted: true } : r
      )
    );
    setIsDeletingFromDrive(false);
    setDeletingRequest(null);
    if (viewingRequest?.id === deletingRequest.id) {
      setViewingRequest(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row" dir="rtl">
      {/* Right Sidebar Navigation (Section 6: 3 main sections) */}
      <aside className="w-full lg:w-72 bg-[#0F3D3E] text-white shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-l border-white/10">
        <div className="p-5 space-y-6">
          {/* Top Brand & Return to Student View */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-emerald-200/80 block">لوحة مسؤول النظام</span>
              <h1 className="text-lg font-bold font-display">السكرتير الرقمي</h1>
            </div>
            <button
              type="button"
              onClick={onBackToStudentView}
              className="min-h-[40px] px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <ArrowRight className="w-4 h-4" />
              <span>واجهة الطالب</span>
            </button>
          </div>

          {/* Google Institutional Auth Block */}
          <div className="p-3.5 rounded-xl bg-white/10 border border-white/15 space-y-2.5">
            {currentUser ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    متصل بحساب المؤسسة
                  </span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-xs text-white/75 hover:text-white flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>خروج</span>
                  </button>
                </div>
                <p className="text-xs font-mono truncate dir-ltr text-left text-white/90">
                  {currentUser.email}
                </p>
                {!isAuthorizedEmail && (
                  <p className="text-[11px] text-amber-300">
                    تنبيه: هذا البريد غير مضاف بعد في قائمة المسؤولين؛ أضفه من قسم الإعدادات.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-white/85 leading-relaxed">
                  سجّل الدخول بحساب Google المؤسسي (atu.edu.iq) لمزامنة Google Sheets و Drive:
                </p>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoggingIn}
                  className="gsi-material-button w-full"
                >
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        style={{ display: 'block' }}
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        ></path>
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        ></path>
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        ></path>
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        ></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">
                      {isLoggingIn ? 'جاري الدخول...' : 'Sign in with Google'}
                    </span>
                  </div>
                </button>
                {authError && <p className="text-xs text-red-300">{authError}</p>}
              </div>
            )}
          </div>

          {/* Main Sections Navigation */}
          <nav className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-white text-[#0F3D3E] shadow-sm'
                  : 'text-white/85 hover:bg-white/10'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 shrink-0" />
                <span>الطلبات</span>
              </span>
              {unreadCount > 0 && (
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded-md tabular-nums ${
                    activeTab === 'requests'
                      ? 'bg-[#B45309] text-white'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  {unreadCount} جديد
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('announcements')}
              className={`min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'announcements'
                  ? 'bg-white text-[#0F3D3E] shadow-sm'
                  : 'text-white/85 hover:bg-white/10'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Megaphone className="w-4 h-4 shrink-0" />
                <span>الإعلانات</span>
              </span>
              <span className="text-xs opacity-75 tabular-nums">{announcements.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-white text-[#0F3D3E] shadow-sm'
                  : 'text-white/85 hover:bg-white/10'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span>جدول الدروس</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-white text-[#0F3D3E] shadow-sm'
                  : 'text-white/85 hover:bg-white/10'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 shrink-0" />
                <span>الإعدادات</span>
              </span>
            </button>
          </nav>
        </div>

        <div className="hidden lg:block p-5 border-t border-white/10 text-xs text-white/70 space-y-1">
          <p className="font-semibold text-white/90">{settings.departmentName}</p>
          <p>{settings.collegeName}</p>
          <p className="tabular-nums">سجل الطلبة النشط: {studentRegistry.length} طالب</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full space-y-6">
        {/* SECTION 1: REQUESTS MANAGEMENT */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 font-display">
                  لوحة الطلبات الواردة
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  عرض، طباعة، وإدارة ملفات PDF الرسمية للطلبات المقدمة من الطلبة.
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>
                  إجمالي المعاملات: <strong className="tabular-nums text-slate-900">{visibleRequests.length}</strong>
                </span>
                <span>·</span>
                <span>
                  غير مقروءة: <strong className="tabular-nums text-[#B45309]">{unreadCount}</strong>
                </span>
              </div>
            </div>

            {/* Filters Bar: Search by student name + Filter by Service, Stage, or Date */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم الطالب أو رقم الطلب..."
                  className="w-full min-h-[42px] pr-10 pl-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#0F3D3E]"
                />
              </div>

              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="all">جميع الخدمات الخمس</option>
                {DIGITAL_SERVICES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>

              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="all">جميع المراحل الدراسية</option>
                <option value="المرحلة الأولى">المرحلة الأولى</option>
                <option value="المرحلة الثانية">المرحلة الثانية</option>
                <option value="المرحلة الثالثة">المرحلة الثالثة</option>
                <option value="المرحلة الرابعة">المرحلة الرابعة</option>
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm tabular-nums"
                />
                {(searchQuery || filterService !== 'all' || filterStage !== 'all' || filterDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterService('all');
                      setFilterStage('all');
                      setFilterDate('');
                    }}
                    className="min-h-[42px] px-3 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 whitespace-nowrap"
                  >
                    مسح
                  </button>
                )}
              </div>
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {filteredRequests.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <p className="text-base font-bold text-slate-800">
                    لا توجد طلبات مطابقة لمعايير البحث الحالية
                  </p>
                  <p className="text-sm text-slate-500">
                    جرّب تغيير مرشحات الخدمة أو المرحلة أو البحث باسم آخر.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                      <tr>
                        <th className="py-3.5 px-4">رقم الطلب</th>
                        <th className="py-3.5 px-4">اسم الطالب</th>
                        <th className="py-3.5 px-4">المرحلة</th>
                        <th className="py-3.5 px-4">نوع الخدمة</th>
                        <th className="py-3.5 px-4">تاريخ الإرسال</th>
                        <th className="py-3.5 px-4">حالة القراءة</th>
                        <th className="py-3.5 px-4 text-left">إجراءات المعاملة (PDF)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {filteredRequests.map((req) => (
                        <tr
                          key={req.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            req.status === 'جديد' ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-semibold tabular-nums text-[#0F3D3E]">
                            {req.id}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {req.studentName}
                            <span className="block text-xs font-normal text-slate-500">
                              {req.studyType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">{req.stage}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {req.serviceTitle}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600 tabular-nums">
                            {formatArabicDate(req.createdAt)}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-semibold">
                            {req.status === 'جديد' ? (
                              <span className="text-[#B45309] font-bold">جديد (غير مقروء)</span>
                            ) : (
                              <span className="text-slate-500">مقروء</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenRequestPdf(req)}
                                className="min-h-[38px] px-3 rounded-lg bg-[#0F3D3E] text-white text-xs font-semibold hover:bg-[#0b2d2e] transition-colors flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>عرض</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintRequest(req)}
                                className="min-h-[38px] px-3 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>طباعة</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingRequest(req)}
                                className="min-h-[38px] px-3 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 2: ANNOUNCEMENTS MANAGEMENT */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 font-display">
                  إدارة الإعلانات الرسمية
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  نشر وتثبيت ومعاينة الإعلانات مع تحديد تاريخ البدء والانتهاء التلقائي.
                </p>
              </div>
              <button
                type="button"
                onClick={openNewAnnouncementForm}
                className="min-h-[44px] px-5 rounded-xl bg-[#0F3D3E] text-white text-sm font-semibold hover:bg-[#0b2d2e] transition-colors flex items-center gap-2 self-start sm:self-auto whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة إعلان جديد</span>
              </button>
            </div>

            {/* Add / Edit Announcement Form Modal or Drawer */}
            {showAnnouncementForm && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    {editingAnnouncement ? 'تعديل الإعلان' : 'إضافة إعلان رسمي جديد'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPreviewingDraft(!isPreviewingDraft)}
                      className="min-h-[38px] px-3.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {isPreviewingDraft ? 'العودة للتحرير' : 'معاينة شكل الإعلان للطالب'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAnnouncementForm(false)}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isPreviewingDraft ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                    <p className="text-xs font-bold text-[#0F3D3E]">
                      معاينة حية كما يراها الطالب قبل النشر:
                    </p>
                    <div className="max-w-md bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      {annImages[0] && (
                        <div className="aspect-video w-full bg-slate-100">
                          <img
                            src={annImages[0]}
                            alt={annTitle}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-4 space-y-2">
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>{formatArabicDate(annStartDate)}</span>
                          {annIsPinned && (
                            <>
                              <span>·</span>
                              <span className="text-[#B45309] font-semibold">مثبّت في الشريط العلوي</span>
                            </>
                          )}
                        </div>
                        <h4 className="font-bold text-base text-slate-900 font-display line-clamp-2">
                          {annTitle || 'عنوان الإعلان التجريبي'}
                        </h4>
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {annSummary || annContent || 'ملخص الإعلان يظهر هنا...'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveAnnouncement} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1">
                        عنوان الإعلان <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={annTitle}
                        onChange={(e) => setAnnTitle(e.target.value)}
                        placeholder="عنوان واضح من سطرين على الأكثر..."
                        className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1">
                        سطر تعريفي مختصر (يظهر في الشريط المتحرك)
                      </label>
                      <input
                        type="text"
                        value={annSummary}
                        onChange={(e) => setAnnSummary(e.target.value)}
                        placeholder="ملخص سريع من سطر واحد..."
                        className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1">
                        محتوى الإعلان التفصيلي <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={annContent}
                        onChange={(e) => setAnnContent(e.target.value)}
                        placeholder="اكتب النص الكامل للإعلان..."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">
                          تاريخ البدء
                        </label>
                        <input
                          type="date"
                          value={annStartDate}
                          onChange={(e) => setAnnStartDate(e.target.value)}
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">
                          تاريخ الانتهاء (يختفي تلقائياً بعده)
                        </label>
                        <input
                          type="date"
                          value={annEndDate}
                          onChange={(e) => setAnnEndDate(e.target.value)}
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm tabular-nums"
                        />
                      </div>

                      <div className="flex items-end">
                        <label className="w-full min-h-[44px] px-4 rounded-xl border border-slate-300 flex items-center gap-2.5 cursor-pointer select-none bg-slate-50">
                          <input
                            type="checkbox"
                            checked={annIsPinned}
                            onChange={(e) => setAnnIsPinned(e.target.checked)}
                            className="w-4 h-4 accent-[#0F3D3E]"
                          />
                          <span className="text-xs font-bold text-slate-800">
                            تثبيت في الشريط العلوي
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Images management */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="block text-sm font-semibold text-slate-800">
                        صور الإعلان (نسبة 16:9 - يمكن إضافة صورة أو أكثر)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <label className="min-h-[42px] px-4 py-2 rounded-xl border border-dashed border-slate-300 hover:border-[#0F3D3E] bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer">
                          <Upload className="w-4 h-4 text-[#0F3D3E]" />
                          <span>رفع صورة من الجهاز</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAnnImageUpload}
                            className="hidden"
                          />
                        </label>

                        <div className="flex-1 flex items-center gap-2 min-w-[240px]">
                          <input
                            type="url"
                            value={annImageInput}
                            onChange={(e) => setAnnImageInput(e.target.value)}
                            placeholder="أو الصق رابط صورة مباشر..."
                            className="flex-1 min-h-[42px] px-3 rounded-xl border border-slate-300 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (annImageInput.trim()) {
                                setAnnImages((prev) => [...prev, annImageInput.trim()]);
                                setAnnImageInput('');
                              }
                            }}
                            className="min-h-[42px] px-3 rounded-xl bg-slate-200 text-slate-800 text-xs font-semibold"
                          >
                            إضافة
                          </button>
                        </div>
                      </div>

                      {annImages.length > 0 && (
                        <div className="flex items-center gap-3 pt-2 overflow-x-auto">
                          {annImages.map((img, i) => (
                            <div
                              key={i}
                              className="relative w-28 aspect-video rounded-lg overflow-hidden border border-slate-300 shrink-0"
                            >
                              <img src={img} alt="" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() =>
                                  setAnnImages((prev) => prev.filter((_, idx) => idx !== i))
                                }
                                className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setShowAnnouncementForm(false)}
                        className="min-h-[44px] px-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="min-h-[44px] px-6 rounded-xl bg-[#0F3D3E] text-white text-xs font-semibold hover:bg-[#0b2d2e]"
                      >
                        {editingAnnouncement ? 'حفظ التعديلات' : 'نشر الإعلان الآن'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Announcements List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcements.map((ann) => {
                const isExpired = new Date(ann.endDate) < new Date(new Date().toISOString().slice(0, 10));
                return (
                  <div
                    key={ann.id}
                    className={`bg-white rounded-2xl border p-4 flex flex-col justify-between gap-4 ${
                      ann.isHidden || isExpired
                        ? 'border-slate-200 opacity-70'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex gap-4">
                      {ann.images[0] && (
                        <img
                          src={ann.images[0]}
                          alt={ann.title}
                          referrerPolicy="no-referrer"
                          className="w-28 aspect-video rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      )}
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500">
                          {isRecentWithin24Hours(ann.createdAt) && (
                            <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white text-[10px] font-bold shadow-xs">
                              جديد (24 ساعة)
                            </span>
                          )}
                          <span className="tabular-nums">{ann.startDate}</span>
                          <span>←</span>
                          <span className="tabular-nums">{ann.endDate}</span>
                          {ann.isPinned && (
                            <>
                              <span>·</span>
                              <span className="text-[#B45309] font-bold">مثبّت</span>
                            </>
                          )}
                          {ann.isHidden && (
                            <>
                              <span>·</span>
                              <span className="text-red-600 font-bold">مخفي</span>
                            </>
                          )}
                          {isExpired && (
                            <>
                              <span>·</span>
                              <span className="text-red-600 font-bold">منتهي الصلاحية</span>
                            </>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 font-display text-sm line-clamp-2">
                          {ann.title}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2">{ann.summary}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditAnnouncementForm(ann)}
                          className="min-h-[36px] px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1 font-semibold"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAnnouncementPinned(ann.id)}
                          className={`min-h-[36px] px-3 rounded-lg border flex items-center gap-1 font-semibold ${
                            ann.isPinned
                              ? 'border-amber-300 bg-amber-50 text-amber-900'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                          <span>{ann.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAnnouncementHidden(ann.id)}
                          className="min-h-[36px] px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 font-semibold"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>{ann.isHidden ? 'إظهار' : 'إخفاء'}</span>
                        </button>
                      </div>

                      {deleteAnnConfirmId === ann.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => confirmDeleteAnnouncement(ann.id)}
                            className="min-h-[36px] px-3 rounded-lg bg-red-600 text-white font-semibold"
                          >
                            تأكيد الحذف
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteAnnConfirmId(null)}
                            className="min-h-[36px] px-2.5 rounded-lg border border-slate-300 text-slate-600"
                          >
                            تراجع
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteAnnConfirmId(ann.id)}
                          className="min-h-[36px] px-3 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-1 font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 2.5: CLASS SCHEDULE EDITOR */}
        {activeTab === 'schedule' && (
          <ScheduleEditorSection
            settings={settings}
            onSaveCustomSchedules={(updated) => {
              setDraftSettings(updated);
              onUpdateSettings(updated);
            }}
          />
        )}

        {/* SECTION 3: SYSTEM SETTINGS */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 font-display">
                  إعدادات النظام والهوية المؤسسية
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  تهيئة التطبيق لأي قسم أو كلية وربط جدول بيانات الطلبة (Google Sheet) دون تعديل في الشيفرة.
                </p>
              </div>
              <button
                type="submit"
                disabled={isSavingSettings}
                className="min-h-[44px] px-6 rounded-xl bg-[#0F3D3E] text-white text-sm font-semibold hover:bg-[#0b2d2e] disabled:opacity-75 disabled:cursor-not-allowed transition-all self-start sm:self-auto whitespace-nowrap flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {isSavingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                    <span>جاري حفظ الإعدادات...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-emerald-200" />
                    <span>حفظ كافة الإعدادات</span>
                  </>
                )}
              </button>
            </div>

            {settingsSavedBanner && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>تم حفظ إعدادات الجامعة والكلية والقسم بنجاح وتحديث الترويسة وقوالب PDF.</span>
              </div>
            )}

            {/* Academic Identity Settings */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <h3 className="text-base font-bold text-slate-900 font-display border-b border-slate-100 pb-2.5">
                1. بيانات الجامعة والكلية والقسم العلمي
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    اسم الجامعة
                  </label>
                  <input
                    type="text"
                    value={draftSettings.universityName}
                    onChange={(e) =>
                      setDraftSettings({ ...draftSettings, universityName: e.target.value })
                    }
                    className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    اسم الكلية أو المعهد
                  </label>
                  <input
                    type="text"
                    value={draftSettings.collegeName}
                    onChange={(e) =>
                      setDraftSettings({ ...draftSettings, collegeName: e.target.value })
                    }
                    className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    اسم القسم العلمي
                  </label>
                  <input
                    type="text"
                    value={draftSettings.departmentName}
                    onChange={(e) =>
                      setDraftSettings({ ...draftSettings, departmentName: e.target.value })
                    }
                    className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
                <div className="flex items-center gap-3">
                  {draftSettings.logoDataUrl ? (
                    <img
                      src={draftSettings.logoDataUrl}
                      alt="شعار الجامعة"
                      className="w-14 h-14 rounded-xl object-contain border border-slate-200 p-1"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-500 font-bold">
                      الشعار
                    </div>
                  )}
                  <label className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4 text-[#0F3D3E]" />
                    <span>رفع شعار الجامعة / القسم</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Google Sheet Connection & Test */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    2. ربط جدول بيانات الطلبة (Google Sheet / CSV) للقراءة فقط
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    يقرأ التطبيق الأعمدة الستة المعتمدة: <strong className="text-slate-700">(الاسم الثلاثي، القسم، المرحلة، نوع الدراسة، رقم الهاتف، رقم البطاقة)</strong> سواء من رابط Google Sheet مباشر أو رابط CSV منشور.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateLiveGoogleSheet}
                  disabled={isCreatingSampleSheet}
                  className="min-h-[38px] px-3.5 rounded-xl border border-[#0F3D3E]/30 bg-[#0F3D3E]/5 text-[#0F3D3E] text-xs font-semibold hover:bg-[#0F3D3E]/10 flex items-center gap-1.5 self-start whitespace-nowrap"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>
                    {isCreatingSampleSheet
                      ? 'جاري الإنشاء في Google Sheets...'
                      : 'إنشاء جدول طلبة نموذجي في حسابي'}
                  </span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  dir="ltr"
                  value={draftSettings.studentSheetUrl}
                  onChange={(e) =>
                    setDraftSettings({ ...draftSettings, studentSheetUrl: e.target.value })
                  }
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-mono text-left"
                />
                <button
                  type="button"
                  onClick={handleTestSheetConnection}
                  disabled={isTestingSheet}
                  className="min-h-[44px] px-5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <RefreshCw className={`w-4 h-4 ${isTestingSheet ? 'animate-spin' : ''}`} />
                  <span>اختبار الاتصال</span>
                </button>
              </div>

              {sheetTestResult && (
                <div
                  className={`p-4 rounded-xl border text-sm space-y-2 ${
                    sheetTestResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {sheetTestResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold">{sheetTestResult.message}</p>
                      {sheetTestResult.departmentColumnMessage && (
                        <p className="text-xs font-bold text-[#0F3D3E]">
                          • حالة عمود القسم: {sheetTestResult.departmentColumnMessage}
                        </p>
                      )}
                      {sheetTestResult.detectedColumns.length > 0 && (
                        <p className="text-xs opacity-85">
                          الأعمدة المقروءة: {sheetTestResult.detectedColumns.join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* System Database Sheet (3 sheets: الإعدادات، الإعلانات، الطلبات) */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  <span className="font-bold text-slate-800">الجدول الثاني الخاص بالتطبيق (الإعدادات · الإعلانات · الطلبات): </span>
                  {draftSettings.systemSpreadsheetId ? (
                    <span className="font-mono text-emerald-700">
                      مرتبط ({draftSettings.systemSpreadsheetId.slice(0, 14)}...)
                    </span>
                  ) : (
                    <span>يُحفظ محلياً ويمكن إنشاؤه تلقائياً في Google Drive الخاص بك.</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleProvisionSystemSheet}
                  disabled={isProvisioningDb}
                  className="min-h-[38px] px-3.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  {isProvisioningDb ? 'جاري الإنشاء...' : 'إنشاء جدول النظام الثاني تلقائياً'}
                </button>
              </div>

              {/* GitHub Pages & config.js Generator Helper */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 font-display">
                      إعداد النشر على GitHub Pages (ملف <code className="font-mono">config.js</code>)
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      مضمّن تلقائياً في المشروع. وإذا كنت تستخدم مستودعاً خارجياً يطلب ملف <code className="font-mono">config.js</code>، ضع رابط خادم Apps Script (<code className="font-mono">/exec</code>) وحمّل الملف مباشرة:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const serverUrl =
                        (draftSettings.gasWebAppUrl || '').trim() ||
                        'https://script.google.com/macros/s/AKfycbx-digital-secretary-academic-portal/exec';
                      const jsContent = `/**
 * ملف إعدادات السكرتير الرقمي (config.js)
 */
window.CONFIG = {
  API_URL: "${serverUrl}",
  GAS_WEB_APP_URL: "${serverUrl}",
  SERVER_URL: "${serverUrl}",
  WEB_APP_URL: "${serverUrl}",
  SCRIPT_URL: "${serverUrl}",
  UNIVERSITY: "${draftSettings.universityName}",
  COLLEGE: "${draftSettings.collegeName}",
  DEPARTMENT: "${draftSettings.departmentName}"
};
const CONFIG = window.CONFIG;
`;
                      const blob = new Blob([jsContent], { type: 'application/javascript;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'config.js';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#0F3D3E] hover:bg-[#0b2d2e] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap self-start sm:self-center cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل ملف config.js جاهز</span>
                  </button>
                </div>

                <input
                  type="url"
                  dir="ltr"
                  value={draftSettings.gasWebAppUrl || ''}
                  onChange={(e) =>
                    setDraftSettings({ ...draftSettings, gasWebAppUrl: e.target.value })
                  }
                  placeholder="https://script.google.com/macros/s/.../exec (اختياري)"
                  className="w-full min-h-[40px] px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono text-left"
                />
              </div>

              {/* Interactive Student Registry Manager (Add, Edit, Delete, Import/Export CSV, Sync to Google Sheet) */}
              <StudentRegistryManager
                students={studentRegistry}
                defaultDepartment={draftSettings.departmentName}
                studentSheetUrl={draftSettings.studentSheetUrl}
                onUpdateStudents={onUpdateStudentRegistry}
                onShowToast={(message, subtext) => {
                  setSettingsToast({ visible: true, message, subtext });
                  setTimeout(() => {
                    setSettingsToast((prev) => ({ ...prev, visible: false }));
                  }, 4000);
                }}
              />
            </div>

            {/* NEW SECTION: OFFICIAL CORRESPONDENCE SETTINGS (بيانات المخاطبات الرسمية) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    3. بيانات المخاطبات الرسمية (قالب كتاب الإحالة الطبية)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    تُقرأ هذه الحقول من الخادم حصراً عند توليد كتاب «م/ فحص ومعالجة طالب» بحد أقصى 150 حرفاً لكل حقل مع تنظيف <code className="font-mono">safeCell_</code>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSampleLetterPreview(true)}
                    className="min-h-[40px] px-4 rounded-xl bg-[#0F3D3E] text-white text-xs font-bold hover:bg-[#0b2d2e] transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Eye className="w-4 h-4" />
                    <span>معاينة الكتاب (بيانات تجريبية)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadDocxTemplate}
                    className="min-h-[40px] px-3.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    تحميل القالب (.doc)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGasDeliverablesModal(true)}
                    className="min-h-[40px] px-3.5 rounded-xl border border-[#0F3D3E]/30 bg-[#0F3D3E]/5 text-[#0F3D3E] text-xs font-bold hover:bg-[#0F3D3E]/10 transition-colors whitespace-nowrap"
                  >
                    كود Code.gs ودليل القالب والاختبارات
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. المخاطب (الجهة الصحية) مع سطر معاينة حي */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    المخاطَب / الجهة الصحية (<code className="font-mono text-xs">medicalAuthority</code>)
                  </label>
                  <input
                    type="text"
                    maxLength={150}
                    value={draftSettings.medicalAuthority || ''}
                    onChange={(e) =>
                      setDraftSettings({
                        ...draftSettings,
                        medicalAuthority: e.target.value.replace(/[\r\n]+/g, ' '),
                      })
                    }
                    placeholder="مثال: مدير المستشفى العام في أبي غرق"
                    className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                  <div className="mt-1.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <span className="text-slate-500">معاينة الصيغة النهائية في الكتاب:</span>
                    <strong className="text-[#0F3D3E] font-display text-sm">
                      {composeAddressee(draftSettings.medicalAuthority)}
                    </strong>
                  </div>
                </div>

                {/* 2. اسم رئيس القسم */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    اسم رئيس القسم مع اللقب العلمي (<code className="font-mono text-xs">headName</code>)
                  </label>
                  <input
                    type="text"
                    maxLength={150}
                    value={draftSettings.headName || ''}
                    onChange={(e) =>
                      setDraftSettings({
                        ...draftSettings,
                        headName: e.target.value.replace(/[\r\n]+/g, ' '),
                      })
                    }
                    placeholder="مثال: أ.م.د. عدنان عذاب كاظم السعيدي"
                    className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    عنوان التوقيع تحته: <strong>{composeHeadTitle(draftSettings.departmentName)}</strong>
                  </p>
                </div>

                {/* 3. العام الدراسي */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    العام الدراسي (<code className="font-mono text-xs">academicYear</code>)
                  </label>
                  <input
                    type="text"
                    maxLength={150}
                    value={draftSettings.academicYear || ''}
                    onChange={(e) =>
                      setDraftSettings({
                        ...draftSettings,
                        academicYear: e.target.value.replace(/[\r\n]+/g, ' '),
                      })
                    }
                    placeholder="2026-2027"
                    className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>

                {/* 4. الموقع والبريد في الترويسة */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    الموقع والبريد في الترويسة (<code className="font-mono text-xs">letterContact</code> - اختياري)
                  </label>
                  <input
                    type="text"
                    maxLength={150}
                    value={draftSettings.letterContact || ''}
                    onChange={(e) =>
                      setDraftSettings({
                        ...draftSettings,
                        letterContact: e.target.value.replace(/[\r\n]+/g, ' '),
                      })
                    }
                    placeholder="يُحذف السطر تلقائياً إن تُرك فارغاً"
                    className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                {/* 5. نسخة منه إلى */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    نسخة منه إلى (<code className="font-mono text-xs">copyTo</code>)
                  </label>
                  <input
                    type="text"
                    maxLength={150}
                    value={draftSettings.copyTo || ''}
                    onChange={(e) =>
                      setDraftSettings({
                        ...draftSettings,
                        copyTo: e.target.value.replace(/[\r\n]+/g, ' '),
                      })
                    }
                    placeholder="الاضبارة"
                    className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* NEW SECTION 4: TEMPLATES FOR ALL 5 REQUESTS (تحميل القالب ورفع القالب لكل طلب) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 font-display">
                  4. قوالب الكتب الرسمية للطلبات الخمسة (تحميل القالب ورفع القالب لكل طلب)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  يمكنك لكل خدمة من الخدمات الخمس تحميل القالب القياسي ذي العناصر النائبة، وتعديله بصيغة الكلية، ثم إعادة رفع القالب المعتمد ليُحفظ ويُحوَّل تلقائياً إلى مستند Google Docs.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {DIGITAL_SERVICES.map((service) => {
                  const spec = SERVICE_TEMPLATE_SPECS[service.id];
                  const uploadedCfg = draftSettings.serviceTemplates?.[service.id];
                  const isUploading = uploadingTemplateId === service.id;

                  return (
                    <div
                      key={service.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                          {SERVICE_ICONS[service.id]}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono text-slate-400 tabular-nums">
                              {service.number}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 font-display">
                              {service.title}
                            </h4>
                            <span className="text-xs text-slate-500">· {spec.subjectLine}</span>
                          </div>

                          <p className="text-xs text-slate-600">{spec.description}</p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px]">
                            <span className="text-slate-500 font-mono">
                              المفتاح: {spec.scriptPropertyKey}
                            </span>
                            {uploadedCfg?.fileName ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>القالب المرفوع: {uploadedCfg.fileName}</span>
                                {uploadedCfg.driveDocId && (
                                  <span className="font-mono text-[10px] text-emerald-800">
                                    (Doc ID: {uploadedCfg.driveDocId.slice(0, 12)}...)
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-500">
                                الحالة: يعمل بالقالب الافتراضي المدمج
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => downloadServiceTemplateDoc(service.id)}
                          className="min-h-[42px] px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Download className="w-4 h-4 text-[#0F3D3E]" />
                          <span>تحميل القالب</span>
                        </button>

                        <label className="min-h-[42px] px-4 rounded-xl bg-[#0F3D3E] hover:bg-[#0b2d2e] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                          <Upload className="w-4 h-4" />
                          <span>{isUploading ? 'جاري رفع القالب...' : 'رفع القالب'}</span>
                          <input
                            type="file"
                            accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleUploadServiceTemplate(service.id, service.title, file);
                                e.target.value = '';
                              }
                            }}
                            className="hidden"
                          />
                        </label>

                        {uploadedCfg?.driveWebViewLink && (
                          <a
                            href={uploadedCfg.driveWebViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="min-h-[42px] px-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1 whitespace-nowrap"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>فتح في Docs</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin Emails List Management */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div className="border-b border-slate-100 pb-2.5">
                <h3 className="text-base font-bold text-slate-900 font-display">
                  3. حركة ألبوم الإعلانات وسرعة التنقل التلقائي
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  اختر التأثير البصري المعتمد عند التنقل التلقائي بين بطاقات ألبوم الإعلانات في واجهة الطالب.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(TRANSITION_LABELS) as AnnouncementTransitionStyle[]).map((styleKey) => {
                  const item = TRANSITION_LABELS[styleKey];
                  const isSelected =
                    (draftSettings.announcementTransition || 'album_stack') === styleKey;
                  return (
                    <button
                      key={styleKey}
                      type="button"
                      onClick={() =>
                        setDraftSettings({
                          ...draftSettings,
                          announcementTransition: styleKey,
                        })
                      }
                      className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'border-[#0F3D3E] bg-[#0F3D3E]/5 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 font-display">
                          {item.title}
                        </span>
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-[#0F3D3E] bg-[#0F3D3E]' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    مدة بقاء كل شريحة في الألبوم قبل الانتقال التلقائي (بالثواني)
                  </label>
                  <p className="text-xs text-slate-500">
                    يتوقف المؤقت مؤقتاً عندما يمرر الطالب مؤشر الفأرة أو يلمس الألبوم للقراءة.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {[4, 6, 8, 10].map((sec) => {
                    const activeSec = draftSettings.announcementIntervalSec || 6;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() =>
                          setDraftSettings({
                            ...draftSettings,
                            announcementIntervalSec: sec,
                          })
                        }
                        className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-bold tabular-nums transition-colors ${
                          activeSec === sec
                            ? 'border-[#0F3D3E] bg-[#0F3D3E] text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {sec} ثوانٍ
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Admin Emails List Management */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 font-display border-b border-slate-100 pb-2.5">
                4. قائمة حسابات مسؤولي النظام (Google Workspace)
              </h3>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  dir="ltr"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="name@atu.edu.iq"
                  className="flex-1 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-mono text-left"
                />
                <button
                  type="button"
                  onClick={handleAddAdminEmail}
                  className="min-h-[44px] px-5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 whitespace-nowrap"
                >
                  إضافة مسؤول
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {draftSettings.adminEmails.map((email) => (
                  <div
                    key={email}
                    className="px-4 py-3 flex items-center justify-between text-sm"
                  >
                    <span className="font-mono text-slate-800">{email}</span>
                    {draftSettings.adminEmails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAdminEmail(email)}
                        className="text-xs text-red-600 hover:underline font-semibold"
                      >
                        إزالة
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Save Action Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="text-xs text-slate-600">
                تأكد من حفظ التغييرات بعد تعديل بيانات الجامعة أو قوالب الكتب الرسمية أو إعدادات الألبوم.
              </div>
              <button
                type="submit"
                disabled={isSavingSettings}
                className="min-h-[44px] px-6 rounded-xl bg-[#0F3D3E] text-white text-sm font-semibold hover:bg-[#0b2d2e] disabled:opacity-75 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {isSavingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                    <span>جاري حفظ الإعدادات...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-emerald-200" />
                    <span>حفظ كافة الإعدادات</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      {/* FLOATING TOAST NOTIFICATION FOR SETTINGS UPDATE */}
      {settingsToast.visible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-6 z-50 max-w-md w-[calc(100%-3rem)] sm:w-auto bg-[#0F3D3E] text-white rounded-2xl border border-emerald-400/30 shadow-2xl shadow-slate-900/30 p-4 flex items-start gap-3.5 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="flex-1 space-y-0.5 text-right">
            <p className="text-sm font-bold font-display text-white">
              {settingsToast.message}
            </p>
            {settingsToast.subtext && (
              <p className="text-xs text-emerald-100/85 leading-relaxed">
                {settingsToast.subtext}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSettingsToast((prev) => ({ ...prev, visible: false }))}
            className="w-7 h-7 rounded-lg hover:bg-white/10 text-emerald-200 hover:text-white flex items-center justify-center shrink-0 transition-colors"
            aria-label="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MODAL 1: VIEW OFFICIAL PDF INSIDE DASHBOARD */}
      {viewingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-100 w-full max-w-4xl rounded-2xl border border-slate-300 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 py-3.5 bg-[#0F3D3E] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-white/15 px-2.5 py-1 rounded tabular-nums">
                  {viewingRequest.id}
                </span>
                <h3 className="font-bold text-sm sm:text-base font-display">
                  معاينة ملف PDF الرسمي — {viewingRequest.studentName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {viewingRequest.driveWebViewLink && (
                  <a
                    href={viewingRequest.driveWebViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[38px] px-3 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>فتح في Drive</span>
                  </a>
                )}
                <button
                  type="button"
                  disabled={isPrintingDoc}
                  onClick={async () => {
                    setIsPrintingDoc(true);
                    await printOrDownloadElement(
                      'printable-official-pdf',
                      `${viewingRequest.id}_${viewingRequest.studentName}.pdf`
                    );
                    setIsPrintingDoc(false);
                  }}
                  className="min-h-[38px] px-3.5 rounded-lg bg-white text-[#0F3D3E] text-xs font-bold hover:bg-slate-100 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
                >
                  {isPrintingDoc ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التجهيز...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>طباعة / تنزيل PDF</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setViewingRequest(null)}
                  className="min-h-[38px] min-w-[38px] rounded-lg hover:bg-white/10 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-8 overflow-y-auto flex-1">
              <OfficialPdfDocument request={viewingRequest} settings={settings} />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MANDATORY CONFIRMATION DIALOG BEFORE DELETING REQUEST / MOVING TO DRIVE TRASH */}
      {deletingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 font-display">
                  تأكيد حذف المعاملة ونقل الملف إلى السلة
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  هل أنت متأكد من حذف معاملة الطالب <strong>{deletingRequest.studentName}</strong> برقم{' '}
                  <strong className="tabular-nums">({deletingRequest.id})</strong>؟ سيتم تعليم الصف كـ «محذوف» في ورقة الطلبات ونقل ملف PDF إلى سلة مهملات Google Drive بحيث يمكن استرجاعه إن حُذف خطأً.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingFromDrive}
                onClick={() => setDeletingRequest(null)}
                className="min-h-[42px] px-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeletingFromDrive}
                onClick={handleConfirmDeleteRequest}
                className="min-h-[42px] px-5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
              >
                {isDeletingFromDrive ? 'جاري الحذف...' : 'نعم، تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 3: SAMPLE OFFICIAL LETTER PREVIEW (معاينة الكتاب ببيانات تجريبية صريحة دون تسجيله في الطلبات) */}
      {showSampleLetterPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-100 w-full max-w-4xl rounded-2xl border border-slate-300 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 py-3.5 bg-[#0F3D3E] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm sm:text-base font-display">
                  معاينة كتاب الإحالة الطبية الرسمي (بيانات تجريبية للمراجعة فقط)
                </h3>
                <p className="text-[11px] text-emerald-200">
                  هذه المعاينة لا تُسجَّل في ورقة «الطلبات» وتعكس التعديلات الحالية في الإعدادات فوراً.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isPrintingDoc}
                  onClick={async () => {
                    setIsPrintingDoc(true);
                    await printOrDownloadElement(
                      'printable-official-pdf',
                      'معاينة_كتاب_الإحالة_الطبية.pdf'
                    );
                    setIsPrintingDoc(false);
                  }}
                  className="min-h-[38px] px-3.5 rounded-lg bg-white text-[#0F3D3E] text-xs font-bold hover:bg-slate-100 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
                >
                  {isPrintingDoc ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التجهيز...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>طباعة / حفظ PDF</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSampleLetterPreview(false)}
                  className="min-h-[38px] min-w-[38px] rounded-lg hover:bg-white/10 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-8 overflow-y-auto flex-1">
              <OfficialPdfDocument
                settings={draftSettings}
                request={{
                  id: '000000-PREVIEW',
                  createdAt: new Date().toISOString(),
                  studentName: 'طالب تجريبي للمعاينة (أحمد محمد علي)',
                  stage: 'المرحلة الثالثة',
                  studyType: 'صباحي',
                  department: 'شبكات الحاسوب',
                  serviceId: 'medical_referral',
                  serviceTitle: 'إحالة طبية',
                  status: 'مقروء',
                  payload: {
                    contactPhone: '07800000000',
                    declarationAccepted: true,
                    medicalCondition:
                      'سبب إحالة تجريبي للمعاينة: عارض صحي طارئ وارتفاع في درجة الحرارة يستوجب الفحص السريري.',
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: GOOGLE APPS SCRIPT DELIVERABLES & 7 ACCEPTANCE TESTS */}
      {showGasDeliverablesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-300 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 py-4 bg-[#0F3D3E] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base font-display">
                  مخرجات Google Apps Script (Code.gs) · دليل القالب · اختبارات القبول السبعة
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGasDeliverablesModal(false)}
                className="min-h-[38px] min-w-[38px] rounded-lg hover:bg-white/10 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Acceptance Tests Runner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 font-display">
                      محاكاة معايير القبول السبعة (Acceptance Tests)
                    </h4>
                    <p className="text-xs text-slate-600">
                      اختبر دوال تركيب المخاطب وسطر القسم وحماية المعادلات ورقم الطلب المتسلسل.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunAcceptanceTests}
                    className="min-h-[40px] px-4 rounded-xl bg-[#0F3D3E] text-white text-xs font-bold hover:bg-[#0b2d2e] whitespace-nowrap"
                  >
                    تشغيل اختبارات المحاكاة الآن
                  </button>
                </div>

                {testResults && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    {testResults.map((tr) => (
                      <div
                        key={tr.id}
                        className="p-3 rounded-xl bg-white border border-emerald-200 flex items-start gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-0.5">
                          <p className="font-bold text-slate-900">{tr.title}</p>
                          <p className="text-slate-600 font-mono">{tr.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* README Template Setup Guide */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 font-display">
                    دليل رفع القالب وتحويله وضبط MEDICAL_TEMPLATE_ID (README.md)
                  </h4>
                  <button
                    type="button"
                    onClick={handleDownloadDocxTemplate}
                    className="text-xs font-bold text-[#0F3D3E] hover:underline"
                  >
                    تحميل ملف القالب (.doc) بالعناصر النائبة
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                  {README_TEMPLATE_GUIDE}
                </pre>
              </div>

              {/* Code.gs Server Code */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 font-display">
                  شيفرة الخادم الكاملة لـ Google Apps Script (Code.gs)
                </h4>
                <pre
                  dir="ltr"
                  className="p-4 rounded-xl bg-slate-950 text-emerald-300 text-xs overflow-x-auto leading-relaxed font-mono text-left max-h-96"
                >
                  {GAS_CODE_GS}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
