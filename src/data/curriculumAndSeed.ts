import { AcademicStage, AnnouncementItem, ServiceId, StudentRecord, StudentRequestRecord, SystemSettings } from '../types';
import academicCalendarImg from '../assets/images/announcement_academic_calendar_1791498999755.jpg';
import examScheduleImg from '../assets/images/announcement_exam_schedule_1791499012496.jpg';
import registrationGuideImg from '../assets/images/announcement_registration_guide_1791499022583.jpg';

export interface ServiceDefinition {
  id: ServiceId;
  number: string;
  title: string;
  shortDescription: string;
  attachmentLabel: string;
  attachmentRequired: boolean;
}

export const DIGITAL_SERVICES: ServiceDefinition[] = [
  {
    id: 'medical_referral',
    number: '01',
    title: 'طلب إحالة طبية',
    shortDescription: 'توثيق العذر المرضي وإحالة الطالب للمركز الصحي أو المستشفى الجامعي.',
    attachmentLabel: 'التقرير الطبي (صورة واضحة أو ملف PDF)',
    attachmentRequired: false,
  },
  {
    id: 'enrollment_confirmation',
    number: '02',
    title: 'طلب تأييد استمرار بالدراسة',
    shortDescription: 'إصدار كتاب تأييد رسمي بالاستمرار بالدراسة معنون إلى الدوائر والمؤسسات.',
    attachmentLabel: 'لا توجد مرفقات مطلوبة',
    attachmentRequired: false,
  },
  {
    id: 'absence_waiver',
    number: '03',
    title: 'طلب رفع نسبة الغياب',
    shortDescription: 'تقديم عذر رسمي لرفع الغيابات المسجلة في مواد المرحلة الدراسية.',
    attachmentLabel: 'مستند العذر الرسمي (تقرير أو وثيقة إثبات)',
    attachmentRequired: false,
  },
  {
    id: 'temporary_id',
    number: '04',
    title: 'طلب هوية مؤقتة',
    shortDescription: 'إصدار باج تعريف طلابي مؤقت لحين صدور الهوية الدائمة أو بدل ضائع.',
    attachmentLabel: 'صورة شخصية حديثة بخلفية بيضاء',
    attachmentRequired: false,
  },
  {
    id: 'exam_appeal',
    number: '05',
    title: 'طلب اعتراض على نتيجة الامتحان',
    shortDescription: 'تدقيق الدفتر الامتحاني وجمع الدرجات للمواد الدراسية وفق الضوابط.',
    attachmentLabel: 'وصل رسوم الاعتراض الصادر من الحسابات (اختياري)',
    attachmentRequired: false,
  },
];

/**
 * جدول المناهج المعتمد للعام الدراسي 2026-2027 بحسب مرحلة الطالب
 * يُستخدم لبناء قوائم المواد تلقائياً في خدمتي رفع نسبة الغياب والاعتراض على النتيجة
 */
export const CURRICULUM_2026_2027: Record<AcademicStage, { firstSemester: string[]; secondSemester: string[] }> = {
  'المرحلة الأولى': {
    firstSemester: [
      'مبادئ البرمجة المهيكلة',
      'الرياضيات المتقطعة',
      'تركيب الحاسوب والمنطق الرقمي',
      'حقوق الإنسان والديمقراطية',
      'اللغة الإنكليزية الأكاديمية (1)',
    ],
    secondSemester: [
      'البرمجة الكينونية (OOP)',
      'التفاضل والتكامل المتقدم',
      'مهارات الحاسوب وتطبيقاته المكتبية',
      'اللغة العربية والتحرير الإداري',
      'فيزياء الأجهزة الإلكترونية',
    ],
  },
  'المرحلة الثانية': {
    firstSemester: [
      'هياكل البيانات والخوارزميات',
      'قواعد البيانات العلائقية',
      'شبكات الحاسوب والاتصالات',
      'الطرق العددية والاحتمالات',
      'معمارية المعالجات الدقيقة',
    ],
    secondSemester: [
      'تطوير تطبيقات الويب الحديثة',
      'نظم التشغيل (Operating Systems)',
      'تحليل وتصميم النظم',
      'النظرية الاحتسابية والأوتوماتا',
      'أخلاقيات المهنة الأكاديمية',
    ],
  },
  'المرحلة الثالثة': {
    firstSemester: [
      'هندسة البرمجيات المتقدمة',
      'الذكاء الاصطناعي وتعلم الآلة',
      'أمنية المعلومات والتشفير',
      'إدارة خوادم قواعد البيانات',
      'معالجة الصور الرقمية',
    ],
    secondSemester: [
      'الحوسبة السحابية والأنظمة الموزعة',
      'برمجة تطبيقات الهواتف الذكية',
      'شبكات الجيل القادم اللاسلكية',
      'تصميم المترجمات (Compilers)',
      'منهجية البحث العلمي',
    ],
  },
  'المرحلة الرابعة': {
    firstSemester: [
      'مشروع التخرج (الجزء الأول)',
      'أمن الشبكات السيبراني المتقدم',
      'تعدين البيانات والبيانات الضخمة',
      'إنترنت الأشياء والأنظمة المدمجة',
    ],
    secondSemester: [
      'مشروع التخرج (الجزء الثاني)',
      'إدارة المشاريع التقنية والجودة',
      'الرؤية الحاسوبية والشبكات العصبية',
      'التدريب الميداني والتطبيقات الصناعية',
    ],
  },
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  universityName: 'جامعة الفرات الأوسط التقنية',
  collegeName: 'كلية البوليتكنك - بابل',
  departmentName: 'هندسة تقنيات تكنولوجيا المعلومات',
  logoDataUrl: '',
  studentSheetUrl: 'https://docs.google.com/spreadsheets/d/1atu-demo-student-registry-2026/edit',
  adminEmails: ['adn.ak21@atu.edu.iq'],
  curriculumYear: '2026–2027',
  announcementTransition: 'album_stack',
  announcementIntervalSec: 6,
  letterContact: 'بابل - القاسم | info.poly@atu.edu.iq',
  medicalAuthority: 'مدير المستشفى العام في أبي غرق',
  academicYear: '2026-2027',
  headName: 'أ.م.د. عدنان عذاب كاظم السعيدي',
  copyTo: 'الاضبارة',
};

/**
 * سجل طلبة نموذجي مطابق تماماً لأعمدة Google Sheet الموصوفة في الفقرة 8
 * يُستخدم كبيانات فورية جاهزة للتجربة وعند عدم ربط جدول خارجي بعد
 */
export const INITIAL_STUDENT_REGISTRY: StudentRecord[] = [
  {
    id: 'STU-001',
    fullName: 'أحمد محمد علي',
    stage: 'المرحلة الثالثة',
    studyType: 'صباحي',
    phone: '07801234567',
    cardId: 'ATU-2026-301',
    department: 'هندسة تقنيات تكنولوجيا المعلومات',
  },
  {
    id: 'STU-002',
    fullName: 'فاطمة حسن كاظم',
    stage: 'المرحلة الثانية',
    studyType: 'صباحي',
    phone: '07709876543',
    cardId: 'ATU-2026-204',
    department: 'شبكات الحاسوب',
  },
  {
    id: 'STU-003',
    fullName: 'حسين عبد الله جاسم',
    stage: 'المرحلة الرابعة',
    studyType: 'مسائي',
    phone: '07811122233',
    cardId: 'ATU-2026-412',
    department: '',
  },
  {
    id: 'STU-004',
    fullName: 'زينب عقيل مهدي',
    stage: 'المرحلة الأولى',
    studyType: 'صباحي',
    phone: '07715556677',
    cardId: 'ATU-2026-109',
    department: 'قسم هندسة تقنيات الحاسوب',
  },
  {
    id: 'STU-005',
    fullName: 'مصطفى حيدر كريم',
    stage: 'المرحلة الثالثة',
    studyType: 'مسائي',
    phone: '07823334455',
    cardId: 'ATU-2026-318',
    department: 'قسم هندسة تقنيات الحاسوب',
  },
];

export const INITIAL_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ANN-2026-01',
    title: 'ضوابط التقديم الرقمي للمعاملات الطلابية للعام الدراسي 2026–2027',
    summary: 'إطلاق نافذة السكرتير الرقمي لتقديم طلبات التأييد والإحالات الطبية ورفع الغيابات إلكترونياً دون الحاجة لمراجعة الشعبة الإدارية.',
    content: `تعلن رئاسة القسم العلمي عن اعتماد منظومة السكرتير الرقمي لاستلام كافة معاملات الطلبة اليومية للعام الدراسي 2026–2027.

يمكن للطلبة الأعزاء تقديم الطلبات الخمسة المعتمدة مباشرة من الهاتف المحمول عبر مطابقة الاسم الثلاثي ورقم الهاتف أو رقم البطاقة الجامعية المسجل لدى القسم:
1. طلب إحالة طبية (خلال 48 ساعة من تاريخ الوعكة الصحية).
2. طلب تأييد استمرار بالدراسة معنون إلى كافة الدوائر الرسمية.
3. طلب رفع نسبة الغياب بموجب عذر رسمي موثق.
4. طلب إصدار هوية طلابية مؤقتة.
5. طلب الاعتراض على نتائج الامتحانات الفصلية والنهائية.

يُصدِر النظام رقم متابعة فوري لكل معاملة ويُحوّلها بصيغة كتاب رسمي PDF إلى الشعبة الإدارية للمصادقة والطباعة.`,
    images: [academicCalendarImg, registrationGuideImg],
    startDate: '2026-10-01',
    endDate: '2027-06-30',
    isPinned: true,
    isHidden: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ANN-2026-02',
    title: 'جدول الامتحانات الفصلية وتوقيتات القاعات الدراسية للدراستين الصباحية والمسائية',
    summary: 'يرجى من طلبة المراحل كافة الاطلاع على توزيع القاعات الامتحانية والالتزام بالزي الموحد والهوية الجامعية.',
    content: `تسترعي اللجنة الامتحانية انتباه طلبة الدراستين الصباحية والمسائية إلى ضرورة الالتزام بالتعليمات الامتحانية المقررة:

- الحضور قبل موعد الامتحان بـ 15 دقيقة على الأقل.
- إبراز الهوية الجامعية النافذة أو الهوية المؤقتة الصادرة من الشعبة الإدارية.
- في حال وجود عذر مرضي طارئ يمنع الطالب من أداء الامتحان، يجب تقديم "طلب إحالة طبية" عبر السكرتير الرقمي في صباح يوم الامتحان حصراً لتثبيت الموقف الرسمي.`,
    images: [examScheduleImg],
    startDate: '2026-10-05',
    endDate: '2027-03-15',
    isPinned: true,
    isHidden: false,
    createdAt: '2026-10-07T10:30:00Z',
  },
  {
    id: 'ANN-2026-03',
    title: 'تحديث بيانات البطاقة الجامعية وأرقام الهواتف في سجل القسم',
    summary: 'دعوة لطلبة المرحلة الأولى لتأكيد مطابقة أسمائهم الثلاثية وأرقام هواتفهم في السجل الموحد.',
    content: `يرجى من طلبة المرحلة الأولى الجدد التأكد من تسجيل أرقام هواتفهم الفعالة وأرقام بطاقاتهم الجامعية لدى مقرر القسم لضمان عمل التحقق الفوري في بوابة الخدمات الرقمية دون توقف.`,
    images: [registrationGuideImg],
    startDate: '2026-10-01',
    endDate: '2027-05-01',
    isPinned: false,
    isHidden: false,
    createdAt: '2026-10-06T09:15:00Z',
  },
];

export const INITIAL_REQUESTS: StudentRequestRecord[] = [
  {
    id: 'REQ-2026-1041',
    createdAt: '2026-10-08T11:20:00Z',
    studentName: 'أحمد محمد علي',
    stage: 'المرحلة الثالثة',
    studyType: 'صباحي',
    department: 'قسم هندسة تقنيات الحاسوب',
    serviceId: 'enrollment_confirmation',
    serviceTitle: 'طلب تأييد استمرار بالدراسة',
    status: 'جديد',
    payload: {
      contactPhone: '07801234567',
      declarationAccepted: true,
      addressedToEntity: 'مديرية التقاعد العامة / فرع النجف الأشرف',
      purposeOfConfirmation: 'إثبات الاستمرار بالدراسة لصرف الراتب التقاعدي',
      copiesCount: 2,
      confirmationLanguage: 'عربي',
    },
  },
  {
    id: 'REQ-2026-1042',
    createdAt: '2026-10-08T13:45:00Z',
    studentName: 'فاطمة حسن كاظم',
    stage: 'المرحلة الثانية',
    studyType: 'صباحي',
    department: 'قسم هندسة تقنيات الحاسوب',
    serviceId: 'absence_waiver',
    serviceTitle: 'طلب رفع نسبة الغياب',
    status: 'جديد',
    payload: {
      contactPhone: '07709876543',
      declarationAccepted: true,
      absenceSubjects: ['هياكل البيانات والخوارزميات', 'قواعد البيانات العلائقية'],
      absencePeriodFrom: '2026-10-04',
      absencePeriodTo: '2026-10-06',
      excuseType: 'مرضي',
      excuseExplanation: 'إجازة مرضية مصدقة من مستشفى الحكيم التعليمي لمدة ثلاثة أيام.',
      attachmentName: 'تقرير_طبي_فاطمة_حسن.pdf',
    },
  },
  {
    id: 'REQ-2026-1039',
    createdAt: '2026-10-07T09:10:00Z',
    studentName: 'حسين عبد الله جاسم',
    stage: 'المرحلة الرابعة',
    studyType: 'مسائي',
    department: 'قسم هندسة تقنيات الحاسوب',
    serviceId: 'exam_appeal',
    serviceTitle: 'طلب اعتراض على نتيجة الامتحان',
    status: 'مقروء',
    payload: {
      contactPhone: '07811122233',
      declarationAccepted: true,
      semesterAndRound: 'الفصل الأول - الدور الأول',
      appealedSubjects: [
        {
          subjectName: 'أمن الشبكات السيبراني المتقدم',
          reason: 'خطأ في الجمع',
          details: 'يرجى إعادة تدقيق جمع درجات السؤال الثالث والرابع في الدفتر الامتحاني.',
        },
      ],
      attachmentName: 'وصل_قبض_اعتراض_8821.jpg',
    },
  },
];
