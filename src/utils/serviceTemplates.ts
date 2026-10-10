import { ServiceId } from '../types';

export interface ServiceTemplateSpec {
  serviceId: ServiceId;
  fileName: string;
  scriptPropertyKey: string;
  subjectLine: string;
  placeholders: string[];
  description: string;
}

export const SERVICE_TEMPLATE_SPECS: Record<ServiceId, ServiceTemplateSpec> = {
  medical_referral: {
    serviceId: 'medical_referral',
    fileName: 'template_01_medical_referral.doc',
    scriptPropertyKey: 'MEDICAL_TEMPLATE_ID',
    subjectLine: 'م/ فحص ومعالجة طالب',
    placeholders: [
      '{{UNIVERSITY}}',
      '{{COLLEGE}}',
      '{{DEPARTMENT}}',
      '{{LETTER_CONTACT}}',
      '{{DATE}}',
      '{{ADDRESSEE}}',
      '{{STUDENT_NAME}}',
      '{{STAGE}}',
      '{{DEPARTMENT_LINE}}',
      '{{ACADEMIC_YEAR}}',
      '{{REASON}}',
      '{{HEAD_NAME}}',
      '{{HEAD_TITLE}}',
      '{{COPY_TO}}',
    ],
    description: 'قالب كتاب الإحالة الطبية الرسمي الموجه إلى الجهة الصحية المعتمدة.',
  },
  enrollment_confirmation: {
    serviceId: 'enrollment_confirmation',
    fileName: 'template_02_enrollment_confirmation.doc',
    scriptPropertyKey: 'ENROLLMENT_TEMPLATE_ID',
    subjectLine: 'م/ تأييد استمرار بالدراسة',
    placeholders: [
      '{{UNIVERSITY}}',
      '{{COLLEGE}}',
      '{{DEPARTMENT}}',
      '{{LETTER_CONTACT}}',
      '{{DATE}}',
      '{{ADDRESSEE_ENTITY}}',
      '{{STUDENT_NAME}}',
      '{{STAGE}}',
      '{{STUDY_TYPE}}',
      '{{DEPARTMENT_LINE}}',
      '{{ACADEMIC_YEAR}}',
      '{{PURPOSE}}',
      '{{COPIES_COUNT}}',
      '{{LANGUAGE}}',
      '{{HEAD_NAME}}',
      '{{HEAD_TITLE}}',
      '{{COPY_TO}}',
    ],
    description: 'قالب كتاب تأييد الاستمرار بالدراسة المعنون إلى الدوائر والمؤسسات الرسمية.',
  },
  absence_waiver: {
    serviceId: 'absence_waiver',
    fileName: 'template_03_absence_waiver.doc',
    scriptPropertyKey: 'ABSENCE_TEMPLATE_ID',
    subjectLine: 'م/ طلب رفع نسبة الغياب',
    placeholders: [
      '{{UNIVERSITY}}',
      '{{COLLEGE}}',
      '{{DEPARTMENT}}',
      '{{DATE}}',
      '{{STUDENT_NAME}}',
      '{{STAGE}}',
      '{{STUDY_TYPE}}',
      '{{DEPARTMENT_LINE}}',
      '{{ACADEMIC_YEAR}}',
      '{{ABSENCE_SUBJECTS}}',
      '{{PERIOD_FROM}}',
      '{{PERIOD_TO}}',
      '{{EXCUSE_TYPE}}',
      '{{EXCUSE_DETAILS}}',
      '{{HEAD_NAME}}',
      '{{HEAD_TITLE}}',
    ],
    description: 'قالب طلب رفع الغيابات المسجلة في مواد المرحلة الدراسية بموجب عذر رسمي.',
  },
  temporary_id: {
    serviceId: 'temporary_id',
    fileName: 'template_04_temporary_id.doc',
    scriptPropertyKey: 'TEMP_ID_TEMPLATE_ID',
    subjectLine: 'م/ إصدار هوية طلابية مؤقتة',
    placeholders: [
      '{{UNIVERSITY}}',
      '{{COLLEGE}}',
      '{{DEPARTMENT}}',
      '{{DATE}}',
      '{{STUDENT_NAME}}',
      '{{STAGE}}',
      '{{STUDY_TYPE}}',
      '{{DEPARTMENT_LINE}}',
      '{{ACADEMIC_YEAR}}',
      '{{ID_REASON}}',
      '{{PREVIOUS_ID_NO}}',
      '{{LOSS_DATE}}',
      '{{POLICE_REPORT_NO}}',
      '{{HEAD_NAME}}',
      '{{HEAD_TITLE}}',
    ],
    description: 'قالب إصدار باج تعريف طلابي مؤقت لحين صدور الهوية الدائمة أو بدل ضائع.',
  },
  exam_appeal: {
    serviceId: 'exam_appeal',
    fileName: 'template_05_exam_appeal.doc',
    scriptPropertyKey: 'EXAM_APPEAL_TEMPLATE_ID',
    subjectLine: 'م/ طلب اعتراض على نتيجة الامتحان',
    placeholders: [
      '{{UNIVERSITY}}',
      '{{COLLEGE}}',
      '{{DEPARTMENT}}',
      '{{DATE}}',
      '{{STUDENT_NAME}}',
      '{{STAGE}}',
      '{{STUDY_TYPE}}',
      '{{DEPARTMENT_LINE}}',
      '{{ACADEMIC_YEAR}}',
      '{{SEMESTER_AND_ROUND}}',
      '{{APPEALED_SUBJECTS_TABLE}}',
      '{{HEAD_NAME}}',
      '{{HEAD_TITLE}}',
    ],
    description: 'قالب تدقيق الدفتر الامتحاني وجمع الدرجات الموجه إلى اللجنة الامتحانية.',
  },
};

/**
 * توليد وتحميل ملف القالب الرسمي (.doc متوافق مع Word و Google Docs) لأي خدمة من الخدمات الخمس
 */
export function downloadServiceTemplateDoc(serviceId: ServiceId): void {
  const spec = SERVICE_TEMPLATE_SPECS[serviceId];

  let bodyRowsHtml = '';
  let bodyIntroHtml = '';
  let bodyClosingHtml = '';

  if (serviceId === 'medical_referral') {
    bodyIntroHtml = `
      <p class="center-bold">{{ADDRESSEE}}</p>
      <p class="center-bold" style="text-decoration: underline;">${spec.subjectLine}</p>
      <p><strong>تحية طيبة،</strong></p>
      <p>نحيل إليكم الطالب المبينة بياناته في الجدول أدناه، لحاجته إلى الفحص الطبي والرعاية الصحية.</p>
    `;
    bodyRowsHtml = `
      <tr><th>اسم الطالب</th><td>{{STUDENT_NAME}}</td></tr>
      <tr><th>المرحلة الدراسية</th><td>{{STAGE}}</td></tr>
      <tr><th>القسم</th><td>{{DEPARTMENT_LINE}}</td></tr>
      <tr><th>العام الدراسي</th><td>{{ACADEMIC_YEAR}}</td></tr>
      <tr><th>سبب الإحالة</th><td>{{REASON}}</td></tr>
    `;
    bodyClosingHtml = `
      <p><strong>يرجى التفضل بالآتي:</strong></p>
      <p>أولاً: إجراء الفحص الطبي اللازم للطالب وتقديم العلاج المناسب لحالته الصحية.</p>
      <p>ثانياً: تزويده بتقرير طبي يبين حالته الصحية ومدة الراحة الطبية الممنوحة له إن تطلب الأمر ذلك.</p>
      <p>شاكرين لكم حسن تعاونكم.</p>
    `;
  } else if (serviceId === 'enrollment_confirmation') {
    bodyIntroHtml = `
      <p class="center-bold">إلى / {{ADDRESSEE_ENTITY}} المحترمين</p>
      <p class="center-bold" style="text-decoration: underline;">${spec.subjectLine}</p>
      <p><strong>تحية طيبة،</strong></p>
      <p>تؤيد رئاسة القسم العلمي استمرار الطالب المدرجة بياناته في الجدول أدناه بالدوام الرسمي للعام الدراسي {{ACADEMIC_YEAR}}:</p>
    `;
    bodyRowsHtml = `
      <tr><th>اسم الطالب</th><td>{{STUDENT_NAME}}</td></tr>
      <tr><th>المرحلة الدراسية</th><td>{{STAGE}}</td></tr>
      <tr><th>نوع الدراسة</th><td>{{STUDY_TYPE}}</td></tr>
      <tr><th>القسم</th><td>{{DEPARTMENT_LINE}}</td></tr>
      <tr><th>الغرض من التأييد</th><td>{{PURPOSE}}</td></tr>
      <tr><th>عدد النسخ واللغة</th><td>{{COPIES_COUNT}} — ({{LANGUAGE}})</td></tr>
    `;
    bodyClosingHtml = `
      <p>وقد زُوّد بهذا التأييد بناءً على طلبه لتقديمه إلى الجهة المعنية دون تحمل الكلية أي تبعات مالية.</p>
    `;
  } else if (serviceId === 'absence_waiver') {
    bodyIntroHtml = `
      <p class="center-bold">إلى / اللجنة العلمية ومقررية القسم المحترمة</p>
      <p class="center-bold" style="text-decoration: underline;">${spec.subjectLine}</p>
      <p><strong>تحية طيبة،</strong></p>
      <p>يرجى التفضل بالنظر في طلب رفع نسبة الغياب للطالب المبينة بياناته وتفاصيل عذره أدناه:</p>
    `;
    bodyRowsHtml = `
      <tr><th>اسم الطالب</th><td>{{STUDENT_NAME}}</td></tr>
      <tr><th>المرحلة ونوع الدراسة</th><td>{{STAGE}} — {{STUDY_TYPE}}</td></tr>
      <tr><th>القسم</th><td>{{DEPARTMENT_LINE}}</td></tr>
      <tr><th>المواد الدراسية المشمولة</th><td>{{ABSENCE_SUBJECTS}}</td></tr>
      <tr><th>فترة الغياب</th><td>من {{PERIOD_FROM}} إلى {{PERIOD_TO}}</td></tr>
      <tr><th>نوع العذر وشرحه</th><td>{{EXCUSE_TYPE}} — {{EXCUSE_DETAILS}}</td></tr>
    `;
    bodyClosingHtml = `
      <p>مع المرفقات الثبوتية المربوطة بالمعاملة لاتخاذ ما يلزم وفق الضوابط الجامعية.</p>
    `;
  } else if (serviceId === 'temporary_id') {
    bodyIntroHtml = `
      <p class="center-bold">إلى / شعبة التسجيل وشؤون الطلبة المحترمة</p>
      <p class="center-bold" style="text-decoration: underline;">${spec.subjectLine}</p>
      <p><strong>تحية طيبة،</strong></p>
      <p>يرجى التفضل بالموافقة على تزويد الطالب المدرجة بياناته أدناه بهوية طلابية مؤقتة للعام الدراسي {{ACADEMIC_YEAR}}:</p>
    `;
    bodyRowsHtml = `
      <tr><th>اسم الطالب</th><td>{{STUDENT_NAME}}</td></tr>
      <tr><th>المرحلة ونوع الدراسة</th><td>{{STAGE}} — {{STUDY_TYPE}}</td></tr>
      <tr><th>القسم</th><td>{{DEPARTMENT_LINE}}</td></tr>
      <tr><th>سبب طلب الهوية المؤقتة</th><td>{{ID_REASON}}</td></tr>
      <tr><th>رقم الهوية السابقة</th><td>{{PREVIOUS_ID_NO}}</td></tr>
      <tr><th>تاريخ الفقدان ورقم المحضر</th><td>{{LOSS_DATE}} — {{POLICE_REPORT_NO}}</td></tr>
    `;
    bodyClosingHtml = `
      <p>مع التقدير.</p>
    `;
  } else {
    bodyIntroHtml = `
      <p class="center-bold">إلى / اللجنة الامتحانية في القسم المحترمة</p>
      <p class="center-bold" style="text-decoration: underline;">${spec.subjectLine}</p>
      <p><strong>تحية طيبة،</strong></p>
      <p>يرجى التفضل بتدقيق الدفتر الامتحاني وجمع الدرجات للطالب المبينة بياناته والمواد المعترض عليها أدناه:</p>
    `;
    bodyRowsHtml = `
      <tr><th>اسم الطالب</th><td>{{STUDENT_NAME}}</td></tr>
      <tr><th>المرحلة ونوع الدراسة</th><td>{{STAGE}} — {{STUDY_TYPE}}</td></tr>
      <tr><th>القسم</th><td>{{DEPARTMENT_LINE}}</td></tr>
      <tr><th>الفصل والدور الامتحاني</th><td>{{SEMESTER_AND_ROUND}}</td></tr>
      <tr><th>المواد المعترض عليها وأسبابها</th><td>{{APPEALED_SUBJECTS_TABLE}}</td></tr>
    `;
    bodyClosingHtml = `
      <p>راجين بيان نتيجة التدقيق وفق التعليمات الامتحانية النافذة.</p>
    `;
  }

  const htmlDoc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" dir="rtl" lang="ar">
<head><meta charset="utf-8"><title>${spec.subjectLine}</title>
<style>
  body { font-family: 'Arial', sans-serif; direction: rtl; text-align: right; padding: 30px; }
  .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 16px; }
  .header p { margin: 2px 0; font-weight: bold; }
  .contact { font-size: 10pt; font-weight: normal; color: #444; }
  .center-bold { text-align: center; font-weight: bold; font-size: 14pt; margin: 12px 0; }
  table.student-table { width: 100%; border-collapse: collapse; margin: 16px 0; direction: rtl; }
  table.student-table th { background-color: #EDEDED; border: 1px solid #7F7F7F; padding: 8px 12px; width: 32%; text-align: right; font-weight: bold; }
  table.student-table td { border: 1px solid #7F7F7F; padding: 8px 12px; text-align: right; }
  .footer { margin-top: 40px; text-align: center; font-size: 9pt; border-bottom: 2px solid #B45309; padding-bottom: 4px; }
</style>
</head>
<body>
  <div class="header">
    <p style="font-size:14pt;">{{UNIVERSITY}}</p>
    <p style="font-size:13pt;">{{COLLEGE}}</p>
    <p style="font-size:13pt;">{{DEPARTMENT}}</p>
    <p class="contact">{{LETTER_CONTACT}}</p>
  </div>
  <p><strong>العدد: ....................</strong></p>
  <p><strong>التاريخ: {{DATE}}</strong></p>
  ${bodyIntroHtml}
  <table class="student-table">
    ${bodyRowsHtml}
  </table>
  ${bodyClosingHtml}
  <p style="text-align:center; font-weight:bold;">مع فائق الاحترام والتقدير،</p>
  <table style="width:100%; border:none; margin-top:24px;">
    <tr>
      <td style="width:60%; border:none;"></td>
      <td style="width:40%; border:none; text-align:center;">
        <p style="margin:2px 0;"><strong>{{HEAD_NAME}}</strong></p>
        <p style="margin:2px 0;"><strong>{{HEAD_TITLE}}</strong></p>
      </td>
    </tr>
  </table>
  <p style="margin-top:20px;"><strong><u>نسخة منه إلى:</u></strong></p>
  <ul><li>{{COPY_TO}}</li></ul>
  <div class="footer">{{UNIVERSITY}} | {{COLLEGE}} | {{DEPARTMENT}}</div>
</body></html>`;

  const blob = new Blob(['\ufeff', htmlDoc], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = spec.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
