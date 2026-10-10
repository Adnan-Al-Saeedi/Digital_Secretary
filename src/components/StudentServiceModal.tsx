import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  FileCheck2,
  CalendarClock,
  IdCard,
  Scale,
  X,
  CheckCircle2,
  AlertCircle,
  Upload,
  Lock,
  ArrowLeft,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  ExamAppealSubjectItem,
  ServiceFormPayload,
  ServiceId,
  StudentRecord,
  StudentRequestRecord,
  SystemSettings,
  VerifiedStudentSession,
} from '../types';
import { CURRICULUM_2026_2027, ServiceDefinition } from '../data/curriculumAndSeed';
import { normalizeIdentifier } from '../utils/arabicNormalize';
import { OfficialPdfDocument, generatePdfBlobFromElement } from './OfficialPdfDocument';

interface StudentServiceModalProps {
  service: ServiceDefinition;
  settings: SystemSettings;
  studentRegistry: StudentRecord[];
  existingRequests: StudentRequestRecord[];
  onClose: () => void;
  onSubmitSuccess: (newRequest: StudentRequestRecord, pdfBlob: Blob | null) => Promise<void>;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes per section 11
const DUPLICATE_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes general services
const MEDICAL_REFERRAL_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour rate limit for medical referral per prompt

export const SERVICE_ICONS: Record<ServiceId, React.ReactNode> = {
  medical_referral: <Stethoscope className="w-6 h-6 text-[#0F3D3E] group-hover:text-white transition-colors duration-300" />,
  enrollment_confirmation: <FileCheck2 className="w-6 h-6 text-[#0F3D3E] group-hover:text-white transition-colors duration-300" />,
  absence_waiver: <CalendarClock className="w-6 h-6 text-[#0F3D3E] group-hover:text-white transition-colors duration-300" />,
  temporary_id: <IdCard className="w-6 h-6 text-[#0F3D3E] group-hover:text-white transition-colors duration-300" />,
  exam_appeal: <Scale className="w-6 h-6 text-[#0F3D3E] group-hover:text-white transition-colors duration-300" />,
};

/**
 * تنظيف سبب الإحالة: إزالة محارف التحكم، تحويل الأسطر الجديدة إلى مسافة، وتوحيد المسافات
 */
function sanitizeReferralReason(input: string): string {
  return String(input || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * توليد رقم طلب متسلسل من 6 خانات (مثال: 000124) كما في Script Properties
 */
function getNextSixDigitRequestNo(): string {
  const current = Number(localStorage.getItem('sec_req_seq_counter') || '123');
  const next = current + 1;
  localStorage.setItem('sec_req_seq_counter', String(next));
  return String(next).padStart(6, '0');
}

export const StudentServiceModal: React.FC<StudentServiceModalProps> = ({
  service,
  settings,
  studentRegistry,
  existingRequests,
  onClose,
  onSubmitSuccess,
}) => {
  // Step state: 'verify' (Steps 2-3) -> 'form' (Steps 4-6) -> 'success' (Step 7)
  const [step, setStep] = useState<'verify' | 'form' | 'success'>('verify');

  // Verification inputs (الدخول باستخدام رقم الهاتف أو رقم البطاقة الجامعية فقط)
  const [authMethod, setAuthMethod] = useState<'phone' | 'cardId'>('phone');
  const [identifierInput, setIdentifierInput] = useState('');
  const [verifyError, setVerifyError] = useState('');

  // Lockout tracking (Section 11: after 5 failed attempts, pause for 15 minutes)
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    return Number(sessionStorage.getItem('sec_failed_attempts') || '0');
  });
  const [lockoutUntil, setLockoutUntil] = useState<number>(() => {
    return Number(sessionStorage.getItem('sec_lockout_until') || '0');
  });

  // Short-lived verified student session (15 minutes)
  const [session, setSession] = useState<VerifiedStudentSession | null>(null);

  // Service Form fields
  const [contactPhone, setContactPhone] = useState('');
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentDataUrl, setAttachmentDataUrl] = useState('');

  // 1. Medical Referral (Single required field: سبب الإحالة، 5 to 200 chars)
  const [medicalCondition, setMedicalCondition] = useState('');

  // 2. Enrollment Confirmation
  const [addressedToEntity, setAddressedToEntity] = useState('');
  const [purposeOfConfirmation, setPurposeOfConfirmation] = useState('');
  const [copiesCount, setCopiesCount] = useState<number>(1);
  const [confirmationLanguage, setConfirmationLanguage] = useState<'عربي' | 'إنكليزي'>('عربي');

  // 3. Absence Waiver
  const [selectedSemester, setSelectedSemester] = useState<'firstSemester' | 'secondSemester'>('firstSemester');
  const [absenceSubjects, setAbsenceSubjects] = useState<string[]>([]);
  const [absencePeriodFrom, setAbsencePeriodFrom] = useState('');
  const [absencePeriodTo, setAbsencePeriodTo] = useState('');
  const [excuseType, setExcuseType] = useState<'مرضي' | 'ظرف عائلي' | 'حادث' | 'أخرى'>('مرضي');
  const [excuseExplanation, setExcuseExplanation] = useState('');

  // 4. Temporary ID
  const [idRequestReason, setIdRequestReason] = useState<'فقدان' | 'تلف' | 'لم تصدر بعد'>('لم تصدر بعد');
  const [previousIdNumber, setPreviousIdNumber] = useState('');
  const [lossDate, setLossDate] = useState('');
  const [policeReportNumber, setPoliceReportNumber] = useState('');

  // 5. Exam Appeal
  const [appealSemester, setAppealSemester] = useState<'firstSemester' | 'secondSemester'>('firstSemester');
  const [appealRound, setAppealRound] = useState<'الدور الأول' | 'الدور الثاني'>('الدور الأول');
  const [appealedSubjects, setAppealedSubjects] = useState<ExamAppealSubjectItem[]>([]);

  // Form validation & submission state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<StudentRequestRecord | null>(null);
  const [countdown, setCountdown] = useState(6);

  // Auto-return countdown on Step 7
  useEffect(() => {
    if (step !== 'success') return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, onClose]);

  const isLockedOut = lockoutUntil > Date.now();
  const remainingLockoutMinutes = isLockedOut
    ? Math.ceil((lockoutUntil - Date.now()) / 60000)
    : 0;

  // Quick fill demo student helper
  const handleFillDemoStudent = (student: StudentRecord) => {
    if (authMethod === 'phone') {
      setIdentifierInput(student.phone);
    } else {
      setIdentifierInput(student.cardId);
    }
    setVerifyError('');
  };

  // Step 3: Verify Student Identity using Phone Number OR University Card ID
  const handleVerifyIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    const normId = normalizeIdentifier(identifierInput);

    if (!normId) {
      setVerifyError(
        authMethod === 'phone'
          ? 'يرجى إدخال رقم الهاتف المسجل لدى القسم.'
          : 'يرجى إدخال رقم البطاقة الجامعية المسجل لدى القسم.'
      );
      return;
    }

    const matchedStudent = studentRegistry.find((stu) => {
      const stuPhone = normalizeIdentifier(stu.phone);
      const stuCard = normalizeIdentifier(stu.cardId);
      return authMethod === 'phone' ? stuPhone === normId : stuCard === normId;
    });

    if (!matchedStudent) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      sessionStorage.setItem('sec_failed_attempts', String(nextAttempts));

      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        setLockoutUntil(until);
        sessionStorage.setItem('sec_lockout_until', String(until));
      }

      setVerifyError('لم نعثر على بياناتك، تأكد من الرقم المدخل أو راجع الشعبة الإدارية');
      return;
    }

    // Reset failed attempts on match
    setFailedAttempts(0);
    sessionStorage.removeItem('sec_failed_attempts');
    sessionStorage.removeItem('sec_lockout_until');
    setVerifyError('');

    // Issue short-lived session token (15 minutes) storing student name, stage, and department from the server/sheet registry
    const randomToken = 'SES-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const resolvedDept =
      matchedStudent.department && matchedStudent.department.trim()
        ? matchedStudent.department.trim()
        : settings.departmentName;

    const verifiedSession: VerifiedStudentSession = {
      token: randomToken,
      expiresAt: Date.now() + 15 * 60 * 1000,
      student: {
        fullName: matchedStudent.fullName,
        department: resolvedDept,
        stage: matchedStudent.stage,
        studyType: matchedStudent.studyType,
        contactPhone: matchedStudent.phone,
      },
    };

    setSession(verifiedSession);
    setContactPhone(matchedStudent.phone);
    setStep('form');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAttachmentDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleAbsenceSubject = (subj: string) => {
    setAbsenceSubjects((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );
  };

  const toggleAppealedSubject = (subj: string) => {
    setAppealedSubjects((prev) => {
      const exists = prev.find((item) => item.subjectName === subj);
      if (exists) {
        return prev.filter((item) => item.subjectName !== subj);
      }
      return [...prev, { subjectName: subj, reason: 'خطأ في الجمع', details: '' }];
    });
  };

  const updateAppealedSubjectItem = (
    subj: string,
    field: 'reason' | 'details',
    value: string
  ) => {
    setAppealedSubjects((prev) =>
      prev.map((item) =>
        item.subjectName === subj ? { ...item, [field]: value } : item
      )
    );
  };

  // Validate form fields per service
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Check session expiry
    if (!session || session.expiresAt < Date.now()) {
      errors.duplicate = 'انتهت صلاحية الجلسة (15 دقيقة). يرجى إعادة التحقق من الهوية.';
      setFormErrors(errors);
      return false;
    }

    if (service.id === 'medical_referral') {
      const cleanedReason = sanitizeReferralReason(medicalCondition);
      if (cleanedReason.length < 5 || cleanedReason.length > 200) {
        errors.medicalCondition = 'يرجى كتابة سبب الإحالة بحيث لا يقل عن 5 أحرف ولا يتجاوز 200 حرف.';
      }

      // Rate limit: 1 medical referral per student per hour
      const recentMedical = existingRequests.find(
        (r) =>
          !r.isDeleted &&
          r.studentName === session.student.fullName &&
          r.serviceId === 'medical_referral' &&
          Date.now() - new Date(r.createdAt).getTime() < MEDICAL_REFERRAL_COOLDOWN_MS
      );
      if (recentMedical) {
        errors.duplicate = `لا يمكن إرسال أكثر من طلب إحالة طبية واحد خلال الساعة الواحدة. رقم طلبك السابق: (${recentMedical.id}).`;
      }
    } else {
      if (!contactPhone.trim()) {
        errors.contactPhone = 'يرجى إدخال رقم هاتف فعال للتواصل.';
      }

      if (service.id === 'enrollment_confirmation') {
        if (!addressedToEntity.trim()) {
          errors.addressedToEntity = 'يرجى كتابة اسم الجهة أو الدائرة الموجّه إليها التأييد.';
        }
        if (!purposeOfConfirmation.trim()) {
          errors.purposeOfConfirmation = 'يرجى توضيح الغرض من طلب التأييد.';
        }
        if (!copiesCount || copiesCount < 1 || copiesCount > 10) {
          errors.copiesCount = 'الرجاء تحديد عدد نسخ بين 1 و 10.';
        }
      } else if (service.id === 'absence_waiver') {
        if (absenceSubjects.length === 0) {
          errors.absenceSubjects = 'يرجى اختيار مادة دراسية واحدة على الأقل من مواد مرحلتك.';
        }
        if (!absencePeriodFrom) errors.absencePeriodFrom = 'يرجى تحديد تاريخ بداية فترة الغياب.';
        if (!absencePeriodTo) errors.absencePeriodTo = 'يرجى تحديد تاريخ نهاية فترة الغياب.';
        if (!excuseExplanation.trim()) {
          errors.excuseExplanation = 'يرجى كتابة شرح موجز للعذر.';
        }
      } else if (service.id === 'temporary_id') {
        if (idRequestReason === 'فقدان') {
          if (!lossDate) errors.lossDate = 'يرجى تحديد تاريخ فقدان الهوية.';
          if (!policeReportNumber.trim()) {
            errors.policeReportNumber = 'يرجى إدخال رقم محضر الإخبار عند الفقدان.';
          }
        }
      } else if (service.id === 'exam_appeal') {
        if (appealedSubjects.length === 0) {
          errors.appealedSubjects = 'يرجى اختيار مادة واحدة على الأقل للاعتراض على نتيجتها.';
        }
      }

      if (!declarationAccepted) {
        errors.declarationAccepted = 'يجب الموافقة على إقرار صحة المعلومات قبل الإرسال.';
      }

      const recentDuplicate = existingRequests.find(
        (r) =>
          !r.isDeleted &&
          r.studentName === session.student.fullName &&
          r.serviceId === service.id &&
          Date.now() - new Date(r.createdAt).getTime() < DUPLICATE_COOLDOWN_MS
      );
      if (recentDuplicate) {
        errors.duplicate = `لقد قدّمت "${service.title}" بالفعل قبل لحظات برقم (${recentDuplicate.id}). يمنع النظام تكرار الطلب نفسه خلال دقائق قليلة.`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 6: Submit Request & Generate Official PDF (saved for admin only; student only receives requestNo)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    // 6-digit sequential request number for medical referral, or standard ID
    const reqNumber =
      service.id === 'medical_referral'
        ? getNextSixDigitRequestNo()
        : `REQ-2026-${Math.floor(1050 + Math.random() * 8900)}`;

    const cleanedReason = sanitizeReferralReason(medicalCondition);

    const payload: ServiceFormPayload = {
      contactPhone: contactPhone.trim(),
      declarationAccepted: service.id === 'medical_referral' ? true : declarationAccepted,
      attachmentName: attachmentName || undefined,
      attachmentDataUrl: attachmentDataUrl || undefined,
      medicalCondition: service.id === 'medical_referral' ? cleanedReason : undefined,
      addressedToEntity: service.id === 'enrollment_confirmation' ? addressedToEntity : undefined,
      purposeOfConfirmation: service.id === 'enrollment_confirmation' ? purposeOfConfirmation : undefined,
      copiesCount: service.id === 'enrollment_confirmation' ? copiesCount : undefined,
      confirmationLanguage: service.id === 'enrollment_confirmation' ? confirmationLanguage : undefined,
      absenceSubjects: service.id === 'absence_waiver' ? absenceSubjects : undefined,
      absencePeriodFrom: service.id === 'absence_waiver' ? absencePeriodFrom : undefined,
      absencePeriodTo: service.id === 'absence_waiver' ? absencePeriodTo : undefined,
      excuseType: service.id === 'absence_waiver' ? excuseType : undefined,
      excuseExplanation: service.id === 'absence_waiver' ? excuseExplanation : undefined,
      idRequestReason: service.id === 'temporary_id' ? idRequestReason : undefined,
      previousIdNumber: service.id === 'temporary_id' ? previousIdNumber : undefined,
      lossDate: service.id === 'temporary_id' ? lossDate : undefined,
      policeReportNumber: service.id === 'temporary_id' ? policeReportNumber : undefined,
      semesterAndRound:
        service.id === 'exam_appeal'
          ? `${appealSemester === 'firstSemester' ? 'الفصل الأول' : 'الفصل الثاني'} - ${appealRound}`
          : undefined,
      appealedSubjects: service.id === 'exam_appeal' ? appealedSubjects : undefined,
    };

    const newRequest: StudentRequestRecord = {
      id: reqNumber,
      createdAt: new Date().toISOString(),
      studentName: session.student.fullName,
      stage: session.student.stage,
      studyType: session.student.studyType,
      department: session.student.department,
      serviceId: service.id,
      serviceTitle: service.id === 'medical_referral' ? 'إحالة طبية' : service.title,
      status: 'جديد',
      payload,
    };

    setCreatedRequest(newRequest);

    // Generate PDF silently in background and store in Admin dashboard & Drive
    setTimeout(async () => {
      try {
        const pdfBlob = await generatePdfBlobFromElement('hidden-student-pdf-generator');
        await onSubmitSuccess(newRequest, pdfBlob);
        setIsSubmitting(false);
        setStep('success');
      } catch (err) {
        console.error('Error generating or saving request:', err);
        setFormErrors({
          duplicate: 'تعذّر إرسال الطلب، حاول لاحقاً',
        });
        setIsSubmitting(false);
      }
    }, 150);
  };

  const stageSubjects = session
    ? CURRICULUM_2026_2027[session.student.stage] || CURRICULUM_2026_2027['المرحلة الأولى']
    : CURRICULUM_2026_2027['المرحلة الأولى'];

  const sanitizedReasonLength = sanitizeReferralReason(medicalCondition).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Modal Header */}
        <div className="px-5 py-4 bg-[#0F3D3E] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono opacity-75 tabular-nums">{service.number}</span>
            <h2 className="text-base sm:text-lg font-bold font-display">{service.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* STEP 1: IDENTITY VERIFICATION */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyIdentity} className="space-y-5">
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900 font-display">
                  الدخول السريع للطالب
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  أدخل رقم هاتفك أو رقم بطاقتك الجامعية فقط لجلب اسمك وبياناتك تلقائياً من سجل القسم والبدء بتقديم الطلب.
                </p>
              </div>

              {isLockedOut ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold">تم إيقاف المحاولات مؤقتاً لحماية الخصوصية</p>
                    <p className="mt-1">
                      بعد 5 محاولات غير متطابقة، يُوقف النظام التحقق لمدة 15 دقيقة. يرجى المحاولة بعد{' '}
                      <span className="tabular-nums font-bold">{remainingLockoutMinutes}</span> دقيقة أو مراجعة الشعبة الإدارية.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      اختر طريقة الدخول <span className="text-red-600">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('phone');
                          setIdentifierInput('');
                          setVerifyError('');
                        }}
                        className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                          authMethod === 'phone'
                            ? 'bg-white text-[#0F3D3E] shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        رقم الهاتف
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('cardId');
                          setIdentifierInput('');
                          setVerifyError('');
                        }}
                        className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                          authMethod === 'cardId'
                            ? 'bg-white text-[#0F3D3E] shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        رقم البطاقة الجامعية
                      </button>
                    </div>

                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {authMethod === 'phone' ? 'أدخل رقم الهاتف المسجل' : 'أدخل رقم البطاقة الجامعية'}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      autoFocus
                      value={identifierInput}
                      onChange={(e) => setIdentifierInput(e.target.value)}
                      placeholder={
                        authMethod === 'phone'
                          ? '07801234567 أو +9647801234567'
                          : 'ATU-2026-301'
                      }
                      className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-right tabular-nums focus:outline-none focus:border-[#0F3D3E] focus:ring-2 focus:ring-[#0F3D3E]/15"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      يقبل النظام الأرقام العربية والهندية (٠–٩ و 0–9) وصيغ الهاتف 07xx و +964 معاً.
                    </p>
                  </div>

                  {verifyError && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">{verifyError}</p>
                        <p className="text-xs text-red-700 mt-0.5 tabular-nums">
                          المحاولات المتبقية قبل القفل المؤقت: {MAX_FAILED_ATTEMPTS - failedAttempts}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Quick Test Selector */}
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-2">
                      أرقام طلبة تجريبية جاهزة للدخول الفوري (اضغط للتعبئة):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {studentRegistry.slice(0, 3).map((stu) => (
                        <button
                          key={stu.id}
                          type="button"
                          onClick={() => handleFillDemoStudent(stu)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                        >
                          <span className="font-semibold">{stu.fullName}</span>
                          <span className="mx-1">·</span>
                          <span className="font-mono tabular-nums">
                            {authMethod === 'phone' ? stu.phone : stu.cardId}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="min-h-[48px] px-5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="min-h-[48px] px-6 rounded-xl bg-[#0F3D3E] text-white text-sm font-semibold hover:bg-[#0b2d2e] transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <span>تحقق ومتابعة للطلب</span>
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* STEP 2: VERIFIED STUDENT CARD + SERVICE FORM */}
          {step === 'form' && session && (
            <form onSubmit={handleSubmitForm} className="space-y-6">
              {/* Read-only Student Welcome & Verified Data Card (الاسم، المرحلة، القسم للقراءة فقط من الجدول) */}
              <div className="bg-[#0F3D3E]/5 border border-[#0F3D3E]/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#0F3D3E]/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#0F3D3E]" />
                    <span className="text-sm font-bold text-[#0F3D3E] font-display">
                      مرحباً بك، {session.student.fullName}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">
                    جلسة صالحة (15 د)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">الاسم الثلاثي (للقراءة فقط)</span>
                    <span className="font-bold text-slate-900">{session.student.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">المرحلة الدراسية (للقراءة فقط)</span>
                    <span className="font-bold text-slate-900">{session.student.stage}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">القسم (للقراءة فقط)</span>
                    <span className="font-bold text-slate-900">{session.student.department}</span>
                  </div>
                </div>
              </div>

              {/* Service-Specific Dynamic Fields */}
              <div className="space-y-4">
                {/* 1. MEDICAL REFERRAL (نموذج الطالب المعتمد: حقل واحد فقط «سبب الإحالة» إلزامي 5 إلى 200 حرف مع عدّاد أحرف) */}
                {service.id === 'medical_referral' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold text-slate-900 font-display">
                        سبب الإحالة <span className="text-red-600">*</span>
                      </label>
                      <span
                        className={`text-xs font-mono tabular-nums ${
                          sanitizedReasonLength < 5 || sanitizedReasonLength > 200
                            ? 'text-amber-700 font-semibold'
                            : 'text-emerald-700 font-semibold'
                        }`}
                      >
                        {sanitizedReasonLength} / 200 حرف (الحد الأدنى 5)
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      maxLength={200}
                      value={medicalCondition}
                      onChange={(e) => setMedicalCondition(e.target.value)}
                      placeholder="اكتب سبب الإحالة الطبية بإيجاز (مثال: وعكة صحية طارئة وارتفاع في درجة الحرارة يتطلب الفحص الطبي)..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#0F3D3E] focus:ring-2 focus:ring-[#0F3D3E]/15"
                    />
                    <p className="text-xs text-slate-500">
                      سيُدرج هذا السبب في كتاب الإحالة الرسمي المعنون إلى ({settings.medicalAuthority || 'الجهة الصحية المعتمدة'}).
                    </p>

                    {formErrors.medicalCondition && (
                      <p className="text-xs text-red-600 font-semibold mt-1">
                        {formErrors.medicalCondition}
                      </p>
                    )}
                  </div>
                )}

                {/* 2. ENROLLMENT CONFIRMATION */}
                {service.id === 'enrollment_confirmation' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1">
                        الجهة الموجّه إليها التأييد <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={addressedToEntity}
                        onChange={(e) => setAddressedToEntity(e.target.value)}
                        placeholder="مثال: مديرية التقاعد العامة / دائرة الرعاية الاجتماعية"
                        className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm"
                      />
                      {formErrors.addressedToEntity && (
                        <p className="text-xs text-red-600 mt-1">{formErrors.addressedToEntity}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1">
                        الغرض من التأييد <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={purposeOfConfirmation}
                        onChange={(e) => setPurposeOfConfirmation(e.target.value)}
                        placeholder="مثال: إثبات الاستمرار بالدراسة للعام الدراسي الحالي"
                        className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm"
                      />
                      {formErrors.purposeOfConfirmation && (
                        <p className="text-xs text-red-600 mt-1">{formErrors.purposeOfConfirmation}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">
                          عدد النسخ <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={copiesCount}
                          onChange={(e) => setCopiesCount(Number(e.target.value))}
                          className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm tabular-nums"
                        />
                        {formErrors.copiesCount && (
                          <p className="text-xs text-red-600 mt-1">{formErrors.copiesCount}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">
                          لغة التأييد <span className="text-red-600">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                          {(['عربي', 'إنكليزي'] as const).map((lang) => (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => setConfirmationLanguage(lang)}
                              className={`min-h-[40px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                                confirmationLanguage === lang
                                  ? 'bg-white text-[#0F3D3E] shadow-sm'
                                  : 'text-slate-600'
                              }`}
                            >
                              {lang}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* 3. ABSENCE WAIVER */}
                {service.id === 'absence_waiver' && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-slate-800">
                          اختر المواد المطلوب رفع غيابها ({session.student.stage} · {settings.curriculumYear}){' '}
                          <span className="text-red-600">*</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-3">
                        <button
                          type="button"
                          onClick={() => setSelectedSemester('firstSemester')}
                          className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                            selectedSemester === 'firstSemester'
                              ? 'bg-white text-[#0F3D3E] shadow-sm'
                              : 'text-slate-600'
                          }`}
                        >
                          مواد الفصل الأول
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSemester('secondSemester')}
                          className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                            selectedSemester === 'secondSemester'
                              ? 'bg-white text-[#0F3D3E] shadow-sm'
                              : 'text-slate-600'
                          }`}
                        >
                          مواد الفصل الثاني
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {stageSubjects[selectedSemester].map((subj) => {
                          const checked = absenceSubjects.includes(subj);
                          return (
                            <button
                              key={subj}
                              type="button"
                              onClick={() => toggleAbsenceSubject(subj)}
                              className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-right text-xs font-semibold flex items-center justify-between transition-colors ${
                                checked
                                  ? 'border-[#0F3D3E] bg-[#0F3D3E]/5 text-[#0F3D3E]'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>{subj}</span>
                              <span
                                className={`w-4 h-4 rounded flex items-center justify-center border ${
                                  checked
                                    ? 'bg-[#0F3D3E] border-[#0F3D3E] text-white'
                                    : 'border-slate-300'
                                }`}
                              >
                                {checked && '✓'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {formErrors.absenceSubjects && (
                        <p className="text-xs text-red-600 mt-1">{formErrors.absenceSubjects}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">
                          فترة الغياب من تاريخ <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="date"
                          value={absencePeriodFrom}
                          onChange={(e) => setAbsencePeriodFrom(e.target.value)}
                          className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm tabular-nums"
                        />
                        {formErrors.absencePeriodFrom && (
                          <p className="text-xs text-red-600 mt-1">{formErrors.absencePeriodFrom}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">
                          إلى تاريخ <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="date"
                          value={absencePeriodTo}
                          onChange={(e) => setAbsencePeriodTo(e.target.value)}
                          className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm tabular-nums"
                        />
                        {formErrors.absencePeriodTo && (
                          <p className="text-xs text-red-600 mt-1">{formErrors.absencePeriodTo}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1">
                        نوع العذر <span className="text-red-600">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['مرضي', 'ظرف عائلي', 'حادث', 'أخرى'] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setExcuseType(type)}
                            className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap ${
                              excuseType === type
                                ? 'border-[#0F3D3E] bg-[#0F3D3E] text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1">
                        شرح العذر <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={excuseExplanation}
                        onChange={(e) => setExcuseExplanation(e.target.value)}
                        placeholder="اكتب توضيحاً مختصراً لظرف الغياب..."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                      {formErrors.excuseExplanation && (
                        <p className="text-xs text-red-600 mt-1">{formErrors.excuseExplanation}</p>
                      )}
                    </div>
                  </>
                )}

                {/* 4. TEMPORARY ID */}
                {service.id === 'temporary_id' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                        سبب طلب الهوية المؤقتة <span className="text-red-600">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['لم تصدر بعد', 'فقدان', 'تلف'] as const).map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => setIdRequestReason(reason)}
                            className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap ${
                              idRequestReason === reason
                                ? 'border-[#0F3D3E] bg-[#0F3D3E] text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1">
                        رقم الهوية السابقة (إن وجد)
                      </label>
                      <input
                        type="text"
                        value={previousIdNumber}
                        onChange={(e) => setPreviousIdNumber(e.target.value)}
                        placeholder="مثال: ATU-2025-110"
                        className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm tabular-nums"
                      />
                    </div>

                    {idRequestReason === 'فقدان' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                        <div>
                          <label className="block text-xs font-bold text-amber-900 mb-1">
                            تاريخ الفقدان <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="date"
                            value={lossDate}
                            onChange={(e) => setLossDate(e.target.value)}
                            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm tabular-nums"
                          />
                          {formErrors.lossDate && (
                            <p className="text-xs text-red-600 mt-1">{formErrors.lossDate}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-amber-900 mb-1">
                            رقم محضر الإخبار الرسمي <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={policeReportNumber}
                            onChange={(e) => setPoliceReportNumber(e.target.value)}
                            placeholder="رقم كتاب أو محضر مركز الشرطة"
                            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm tabular-nums"
                          />
                          {formErrors.policeReportNumber && (
                            <p className="text-xs text-red-600 mt-1">{formErrors.policeReportNumber}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 5. EXAM APPEAL */}
                {service.id === 'exam_appeal' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          الفصل الدراسي
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                          <button
                            type="button"
                            onClick={() => {
                              setAppealSemester('firstSemester');
                              setAppealedSubjects([]);
                            }}
                            className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                              appealSemester === 'firstSemester'
                                ? 'bg-white text-[#0F3D3E] shadow-sm'
                                : 'text-slate-600'
                            }`}
                          >
                            الفصل الأول
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAppealSemester('secondSemester');
                              setAppealedSubjects([]);
                            }}
                            className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                              appealSemester === 'secondSemester'
                                ? 'bg-white text-[#0F3D3E] shadow-sm'
                                : 'text-slate-600'
                            }`}
                          >
                            الفصل الثاني
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          الدور الامتحاني
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                          {(['الدور الأول', 'الدور الثاني'] as const).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setAppealRound(r)}
                              className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                                appealRound === r
                                  ? 'bg-white text-[#0F3D3E] shadow-sm'
                                  : 'text-slate-600'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">
                        المواد المعترض عليها ({session.student.stage}) <span className="text-red-600">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {stageSubjects[appealSemester].map((subj) => {
                          const isSelected = appealedSubjects.some((i) => i.subjectName === subj);
                          return (
                            <button
                              key={subj}
                              type="button"
                              onClick={() => toggleAppealedSubject(subj)}
                              className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-right text-xs font-semibold flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'border-[#0F3D3E] bg-[#0F3D3E]/5 text-[#0F3D3E]'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>{subj}</span>
                              <span
                                className={`w-4 h-4 rounded flex items-center justify-center border ${
                                  isSelected
                                    ? 'bg-[#0F3D3E] border-[#0F3D3E] text-white'
                                    : 'border-slate-300'
                                }`}
                              >
                                {isSelected && '✓'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {formErrors.appealedSubjects && (
                        <p className="text-xs text-red-600 mt-1">{formErrors.appealedSubjects}</p>
                      )}
                    </div>

                    {appealedSubjects.length > 0 && (
                      <div className="space-y-3 pt-2">
                        {appealedSubjects.map((item) => (
                          <div
                            key={item.subjectName}
                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5"
                          >
                            <p className="text-xs font-bold text-[#0F3D3E]">{item.subjectName}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[11px] text-slate-600 mb-1">
                                  سبب الاعتراض
                                </label>
                                <select
                                  value={item.reason}
                                  onChange={(e) =>
                                    updateAppealedSubjectItem(
                                      item.subjectName,
                                      'reason',
                                      e.target.value
                                    )
                                  }
                                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                                >
                                  <option value="خطأ في الجمع">خطأ في الجمع</option>
                                  <option value="سؤال لم يُصحَّح">سؤال لم يُصحَّح</option>
                                  <option value="أخرى">أخرى</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] text-slate-600 mb-1">
                                  تفاصيل إضافية
                                </label>
                                <input
                                  type="text"
                                  value={item.details}
                                  onChange={(e) =>
                                    updateAppealedSubjectItem(
                                      item.subjectName,
                                      'details',
                                      e.target.value
                                    )
                                  }
                                  placeholder="توضيح مختصر للجنة التدقيق..."
                                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Shared Fields for the other 4 services */}
                {service.id !== 'medical_referral' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">
                          رقم هاتف للتواصل (قابل للتعديل) <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm text-right tabular-nums"
                        />
                        {formErrors.contactPhone && (
                          <p className="text-xs text-red-600 mt-1">{formErrors.contactPhone}</p>
                        )}
                      </div>

                      {service.id !== 'enrollment_confirmation' && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-800 mb-1">
                            {service.attachmentLabel}
                          </label>
                          <label className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-dashed border-slate-300 hover:border-[#0F3D3E] bg-slate-50 hover:bg-slate-100/70 transition-colors flex items-center justify-between cursor-pointer text-xs text-slate-700">
                            <span className="truncate max-w-[200px]">
                              {attachmentName || 'اضغط لاختيار صورة أو ملف PDF...'}
                            </span>
                            <Upload className="w-4 h-4 text-[#0F3D3E] shrink-0" />
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                        <input
                          type="checkbox"
                          checked={declarationAccepted}
                          onChange={(e) => setDeclarationAccepted(e.target.checked)}
                          className="mt-1 w-4 h-4 accent-[#0F3D3E] rounded"
                        />
                        <span className="text-xs text-slate-700 leading-relaxed">
                          أقرّ بصحة كافة المعلومات والبيانات المدخلة أعلاه، وأوافق على إصدار كتاب رسمي بالمعاملة وإرساله إلى الشعبة الإدارية في القسم. <span className="text-red-600">*</span>
                        </span>
                      </label>
                      {formErrors.declarationAccepted && (
                        <p className="text-xs text-red-600 mt-1">{formErrors.declarationAccepted}</p>
                      )}
                    </div>
                  </>
                )}

                {formErrors.duplicate && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                    {formErrors.duplicate}
                  </div>
                )}
              </div>

              {/* Submit Bar */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep('verify')}
                  disabled={isSubmitting}
                  className="min-h-[48px] px-4 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  تغيير بيانات الطالب
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[48px] px-6 rounded-xl bg-[#0F3D3E] text-white text-sm font-semibold hover:bg-[#0b2d2e] disabled:opacity-60 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري إرسال الطلب...</span>
                    </>
                  ) : (
                    <span>إرسال الطلب</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3 (Journey Step 7): SUCCESS & AUTO-RETURN (Returns only requestNo to student; PDF is strictly for Admin) */}
          {step === 'success' && createdRequest && (
            <div className="py-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 font-display">
                  تم إرسال طلبك بنجاح إلى الشعبة الإدارية
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  تم تسجيل معاملتك وتوليد الكتاب الرسمي لدى مسؤول النظام للمراجعة والاعتماد. رقم الطلب الخاص بك:
                </p>
              </div>

              <div className="inline-block bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4">
                <span className="text-xs text-slate-500 block mb-1">رقم الطلب</span>
                <span className="text-2xl font-bold text-[#0F3D3E] tabular-nums tracking-wide">
                  {createdRequest.id}
                </span>
              </div>

              <p className="text-xs text-slate-500 tabular-nums">
                سيعود التطبيق تلقائياً إلى الواجهة الرئيسية خلال {countdown} ثوانٍ...
              </p>

              <div className="pt-2 flex items-center justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-6 rounded-xl bg-[#0F3D3E] text-white text-xs font-semibold hover:bg-[#0b2d2e] transition-colors whitespace-nowrap"
                >
                  العودة إلى الواجهة الرئيسية
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden off-screen container to render high-resolution Arabic RTL PDF for Admin storage */}
      {createdRequest && (
        <div className="fixed -left-[9999px] top-0 w-[794px]">
          <OfficialPdfDocument
            id="hidden-student-pdf-generator"
            request={createdRequest}
            settings={settings}
          />
        </div>
      )}
    </div>
  );
};
