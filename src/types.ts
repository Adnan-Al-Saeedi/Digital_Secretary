export type ServiceId =
  | 'medical_referral'
  | 'enrollment_confirmation'
  | 'absence_waiver'
  | 'temporary_id'
  | 'exam_appeal';

export type AcademicStage = 'المرحلة الأولى' | 'المرحلة الثانية' | 'المرحلة الثالثة' | 'المرحلة الرابعة';

export type StudyType = 'صباحي' | 'مسائي';

export type SectionOption = 'شعبة A' | 'شعبة B';
export type GroupOption = 'مجموعة 1' | 'مجموعة 2';
export type ScheduleDayName = 'الأحد' | 'الاثنين' | 'الثلاثاء' | 'الأربعاء' | 'الخميس';

export interface ScheduleLectureSlot {
  id: string;
  periodIndex: number;
  timeRange: string;
  subject: string;
  type: 'نظري' | 'عملي';
  instructor: string;
  room: string;
}

/**
 * مفتاح الجدول يركب بالشكل:
 * `${stage}|${section}|${group}|${studyType}|${semester}`
 */
export type CustomScheduleMap = Record<string, Record<ScheduleDayName, ScheduleLectureSlot[]>>;

export interface StudentRecord {
  id: string;
  fullName: string; // الاسم الثلاثي
  stage: AcademicStage; // المرحلة
  studyType: StudyType; // نوع الدراسة
  phone: string; // رقم الهاتف (لا يرسل إلى واجهة الطالب العامة قبل المطابقة)
  cardId: string; // رقم البطاقة
  department?: string; // القسم (إن وجد في الجدول)
}

export interface VerifiedStudentSession {
  token: string;
  expiresAt: number;
  student: {
    fullName: string;
    department: string;
    stage: AcademicStage;
    studyType: StudyType;
    contactPhone: string;
  };
}

export type AnnouncementTransitionStyle =
  | 'album_stack'
  | 'fade_zoom'
  | 'slide_smooth'
  | 'flip_3d';

export interface ServiceTemplateConfig {
  fileName?: string;
  uploadedAt?: string;
  driveDocId?: string;
  driveWebViewLink?: string;
  localDataUrl?: string;
}

export interface SystemSettings {
  universityName: string;
  collegeName: string;
  departmentName: string;
  logoDataUrl: string;
  studentSheetUrl: string;
  systemSpreadsheetId?: string;
  driveFolderId?: string;
  adminEmails: string[];
  curriculumYear: string;
  announcementTransition?: AnnouncementTransitionStyle;
  announcementIntervalSec?: number;

  // بيانات المخاطبات الرسمية (Official Correspondence Settings)
  letterContact?: string;      // الموقع والبريد في الترويسة (اختياري)
  medicalAuthority?: string;   // المخاطب (الجهة الصحية)
  academicYear?: string;       // العام الدراسي (مثل 2026-2027)
  headName?: string;           // اسم رئيس القسم (مع لقبه العلمي)
  copyTo?: string;             // نسخة منه إلى (الافتراضي: الاضبارة)
  medicalTemplateId?: string;  // معرف قالب Google Docs (يُحفظ في الخادم/الإعدادات)

  // قوالب الخدمات الخمس (تحميل ورفع القالب لكل طلب)
  serviceTemplates?: Partial<Record<ServiceId, ServiceTemplateConfig>>;

  // جداول الدروس الأسبوعية المخصصة التي يحررها المسؤول
  customSchedules?: CustomScheduleMap;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  images: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  isPinned: boolean;
  isHidden: boolean;
  createdAt: string;
}

export interface ExamAppealSubjectItem {
  subjectName: string;
  reason: 'خطأ في الجمع' | 'سؤال لم يُصحَّح' | 'أخرى';
  details: string;
}

export interface ServiceFormPayload {
  contactPhone: string;
  declarationAccepted: boolean;
  attachmentName?: string;
  attachmentDataUrl?: string;

  // 1. طلب إحالة طبية (medical_referral)
  medicalCondition?: string;
  conditionStartDate?: string;
  expectedDurationDays?: number;
  affectedSubjectsOrExams?: string;

  // 2. طلب تأييد استمرار بالدراسة (enrollment_confirmation)
  addressedToEntity?: string;
  purposeOfConfirmation?: string;
  copiesCount?: number;
  confirmationLanguage?: 'عربي' | 'إنكليزي';

  // 3. طلب رفع نسبة الغياب (absence_waiver)
  absenceSubjects?: string[];
  absencePeriodFrom?: string;
  absencePeriodTo?: string;
  excuseType?: 'مرضي' | 'ظرف عائلي' | 'حادث' | 'أخرى';
  excuseExplanation?: string;

  // 4. طلب هوية مؤقتة (temporary_id)
  idRequestReason?: 'فقدان' | 'تلف' | 'لم تصدر بعد';
  previousIdNumber?: string;
  lossDate?: string;
  policeReportNumber?: string;

  // 5. طلب اعتراض على نتيجة الامتحان (exam_appeal)
  semesterAndRound?: string;
  appealedSubjects?: ExamAppealSubjectItem[];
}

export interface StudentRequestRecord {
  id: string; // رقم الطلب e.g., REQ-2026-1042
  createdAt: string; // ISO date
  studentName: string;
  stage: AcademicStage;
  studyType: StudyType;
  department: string;
  serviceId: ServiceId;
  serviceTitle: string;
  status: 'جديد' | 'مقروء';
  isDeleted?: boolean;
  driveFileId?: string;
  driveWebViewLink?: string;
  payload: ServiceFormPayload;
}
