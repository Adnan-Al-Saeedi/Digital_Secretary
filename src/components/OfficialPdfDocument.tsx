import React from 'react';
import { StudentRequestRecord, SystemSettings } from '../types';
import {
  composeAddressee,
  composeDepartmentLine,
  composeHeadTitle,
  formatArabicDate,
  formatBaghdadLatinDate,
} from '../utils/arabicNormalize';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface OfficialPdfDocumentProps {
  request: StudentRequestRecord;
  settings: SystemSettings;
  id?: string;
}

export const OfficialPdfDocument: React.FC<OfficialPdfDocumentProps> = ({
  request,
  settings,
  id = 'printable-official-pdf',
}) => {
  const { payload } = request;

  // قالب الكتاب الرسمي المعتمد لـ «طلب إحالة طبية» (م/ فحص ومعالجة طالب) مطابق لبنية الملف المرفق حرفياً
  if (request.serviceId === 'medical_referral') {
    const letterDate = formatBaghdadLatinDate(request.createdAt);
    const addresseeLine = composeAddressee(settings.medicalAuthority);
    const departmentLine = composeDepartmentLine(
      request.department,
      settings.departmentName,
      settings.collegeName
    );
    const academicYear = (settings.academicYear || settings.curriculumYear || '2026-2027').trim();
    const reasonText = (payload.medicalCondition || '').trim();
    const headName = (settings.headName || '').trim() || 'رئيس القسم العلمي';
    const headTitle = composeHeadTitle(settings.departmentName);
    const copyToText = (settings.copyTo || 'الاضبارة').trim();
    const letterContact = (settings.letterContact || '').trim();

    return (
      <div
        id={id}
        dir="rtl"
        className="bg-white text-slate-950 border border-slate-300 mx-auto p-8 sm:p-12 max-w-[794px] min-h-[1040px] shadow-sm flex flex-col justify-between leading-relaxed"
        style={{ fontFamily: 'Arial, "Cairo", sans-serif' }}
      >
        <div className="space-y-6">
          {/* 1. الترويسة (Header): ثلاثة أسطر عريضة (الجامعة، الكلية، القسم)، ثم سطر صغير بالموقع والبريد، ثم خط فاصل */}
          <div className="text-center border-b-2 border-slate-800 pb-4 space-y-1">
            <p className="text-lg font-bold text-slate-950">{settings.universityName}</p>
            <p className="text-base font-bold text-slate-900">{settings.collegeName}</p>
            <p className="text-base font-bold text-slate-900">{settings.departmentName}</p>
            {letterContact && (
              <p className="text-xs text-slate-600 pt-1">{letterContact}</p>
            )}
          </div>

          {/* 2. العدد والتاريخ: «العدد: .......» منقطاً ليملأه الديوان، والتاريخ بصيغة dd/MM/yyyy وأرقام لاتينية */}
          <div className="space-y-1 text-sm font-semibold text-slate-900 text-right">
            <div>العدد: ....................</div>
            <div>
              <span>التاريخ: </span>
              <span className="font-mono tabular-nums" dir="ltr">
                {letterDate}
              </span>
            </div>
          </div>

          {/* 3. المخاطَب: «السيد … المحترم» بخط عريض */}
          <div className="text-center pt-2">
            <p className="text-lg font-bold text-slate-950">{addresseeLine}</p>
          </div>

          {/* 4. الموضوع: م/ فحص ومعالجة طالب (نص ثابت) */}
          <div className="text-center">
            <p className="text-base font-bold text-slate-950 underline underline-offset-8">
              م/ فحص ومعالجة طالب
            </p>
          </div>

          {/* 5. «تحية طيبة،» ثم فقرة تمهيد ثابتة */}
          <div className="space-y-2 text-sm sm:text-base text-slate-900 pt-1">
            <p className="font-semibold">تحية طيبة،</p>
            <p className="leading-relaxed">
              نحيل إليكم الطالب المبينة بياناته في الجدول أدناه، لحاجته إلى الفحص الطبي والرعاية الصحية.
            </p>
          </div>

          {/* 6. جدول بعمودين (تسمية بخلفية رمادية #EDEDED وحدود #7F7F7F) بخمسة صفوف */}
          <div className="my-4">
            <table
              className="w-full text-right border-collapse text-sm sm:text-base"
              style={{ border: '1px solid #7F7F7F' }}
            >
              <tbody>
                <tr>
                  <th
                    className="py-2.5 px-4 font-bold w-1/3 text-slate-900"
                    style={{ backgroundColor: '#EDEDED', border: '1px solid #7F7F7F' }}
                  >
                    اسم الطالب
                  </th>
                  <td
                    className="py-2.5 px-4 font-semibold text-slate-950"
                    style={{ border: '1px solid #7F7F7F' }}
                  >
                    {request.studentName}
                  </td>
                </tr>
                <tr>
                  <th
                    className="py-2.5 px-4 font-bold text-slate-900"
                    style={{ backgroundColor: '#EDEDED', border: '1px solid #7F7F7F' }}
                  >
                    المرحلة الدراسية
                  </th>
                  <td
                    className="py-2.5 px-4 text-slate-900"
                    style={{ border: '1px solid #7F7F7F' }}
                  >
                    {request.stage}
                  </td>
                </tr>
                <tr>
                  <th
                    className="py-2.5 px-4 font-bold text-slate-900"
                    style={{ backgroundColor: '#EDEDED', border: '1px solid #7F7F7F' }}
                  >
                    القسم
                  </th>
                  <td
                    className="py-2.5 px-4 text-slate-900"
                    style={{ border: '1px solid #7F7F7F' }}
                  >
                    {departmentLine}
                  </td>
                </tr>
                <tr>
                  <th
                    className="py-2.5 px-4 font-bold text-slate-900"
                    style={{ backgroundColor: '#EDEDED', border: '1px solid #7F7F7F' }}
                  >
                    العام الدراسي
                  </th>
                  <td
                    className="py-2.5 px-4 font-mono tabular-nums text-slate-900"
                    style={{ border: '1px solid #7F7F7F' }}
                  >
                    {academicYear}
                  </td>
                </tr>
                <tr>
                  <th
                    className="py-2.5 px-4 font-bold text-slate-900"
                    style={{ backgroundColor: '#EDEDED', border: '1px solid #7F7F7F' }}
                  >
                    سبب الإحالة
                  </th>
                  <td
                    className="py-2.5 px-4 text-slate-950"
                    style={{ border: '1px solid #7F7F7F' }}
                  >
                    {reasonText}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 7. الطلبان بنصهما الحرفي ثم الخاتمة */}
          <div className="space-y-2.5 text-sm sm:text-base text-slate-900 pt-1">
            <p className="font-semibold">يرجى التفضل بالآتي:</p>
            <p className="pr-2">
              <strong>أولاً:</strong> إجراء الفحص الطبي اللازم للطالب وتقديم العلاج المناسب لحالته الصحية.
            </p>
            <p className="pr-2">
              <strong>ثانياً:</strong> تزويده بتقرير طبي يبين حالته الصحية ومدة الراحة الطبية الممنوحة له إن تطلب الأمر ذلك.
            </p>
            <p className="pt-2">شاكرين لكم حسن تعاونكم.</p>
            <p className="text-center font-semibold pt-2">مع فائق الاحترام والتقدير،</p>
          </div>

          {/* 8. التوقيع: اسم رئيس القسم بخط عريض وتحته «رئيس قسم …» (في جدول/فقرة ثابتة يسار الصفحة بلا نص عائم) */}
          <div className="pt-6 flex justify-end">
            <div className="w-64 text-center space-y-1">
              <p className="text-base font-bold text-slate-950">{headName}</p>
              <p className="text-sm font-semibold text-slate-800">{headTitle}</p>
            </div>
          </div>

          {/* 9. «نسخة منه إلى:» وتحتها بند نقطي («الاضبارة») */}
          <div className="pt-6 text-xs sm:text-sm text-slate-800 space-y-1">
            <p className="font-bold underline underline-offset-4">نسخة منه إلى:</p>
            <ul className="list-disc list-inside pr-2">
              <li>{copyToText}</li>
            </ul>
          </div>
        </div>

        {/* 10. التذييل (Footer): «الجامعة | الكلية | القسم» بخط صغير فوق خط ذهبي رفيع */}
        <div className="pt-8 mt-8">
          <p className="text-center text-xs text-slate-600 pb-2">
            {settings.universityName} | {settings.collegeName} | {settings.departmentName}
          </p>
          <div className="h-[2px] w-full bg-[#B45309]" />
        </div>
      </div>
    );
  }

  // القالب العام للخدمات الأربع الأخرى
  return (
    <div
      id={id}
      dir="rtl"
      className="bg-white text-slate-900 border border-slate-300 mx-auto p-8 md:p-10 max-w-[794px] shadow-sm font-body leading-relaxed"
    >
      {/* الترويسة الرسمية */}
      <div className="flex items-start justify-between border-b-2 border-[#0F3D3E] pb-5 mb-6 gap-4">
        <div className="space-y-1 text-right">
          <p className="text-xs text-slate-600 font-semibold">جمهورية العراق</p>
          <p className="text-sm font-bold text-[#0F3D3E] font-display">{settings.universityName}</p>
          <p className="text-sm font-semibold text-slate-800">{settings.collegeName}</p>
          <p className="text-xs font-medium text-slate-700">{settings.departmentName}</p>
        </div>

        <div className="flex flex-col items-center justify-center">
          {settings.logoDataUrl ? (
            <img
              src={settings.logoDataUrl}
              alt="شعار المؤسسة"
              referrerPolicy="no-referrer"
              className="w-16 h-16 object-contain"
            />
          ) : (
            <div className="w-16 h-16 rounded-full border-2 border-[#0F3D3E] bg-[#0F3D3E]/5 flex items-center justify-center text-[#0F3D3E] font-display font-bold text-xs text-center p-1">
              شعار القسم الرسمي
            </div>
          )}
          <span className="text-[11px] text-slate-500 mt-1">
            العام الدراسي {settings.academicYear || settings.curriculumYear}
          </span>
        </div>

        <div className="space-y-1 text-left text-xs text-slate-700">
          <div>
            <span>رقم المعاملة: </span>
            <span className="tabular-nums font-semibold text-slate-900">{request.id}</span>
          </div>
          <div>
            <span>التاريخ: </span>
            <span className="font-medium">{formatArabicDate(request.createdAt)}</span>
          </div>
          <div>
            <span>الحالة: </span>
            <span className="font-medium">وثيقة إلكترونية مسجلة</span>
          </div>
        </div>
      </div>

      {/* عنوان الطلب الرسمي */}
      <div className="text-center my-6">
        <h2 className="text-xl font-bold text-[#0F3D3E] font-display inline-block border-b-2 border-[#B45309] pb-1.5 px-6">
          م / {request.serviceTitle}
        </h2>
      </div>

      {/* الديباجة */}
      <p className="text-sm text-slate-800 mb-4 font-semibold">
        إلى / رئاسة {request.department || settings.departmentName} المحترمة
      </p>
      <p className="text-sm text-slate-700 mb-5">
        تحية طيبة... يرجى التفضل بالموافقة على النظر في طلبي المدرجة تفاصيله وبياناتي الأساسية أدناه:
      </p>

      {/* كتلة بيانات الطالب الأساسية */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
        <h3 className="text-xs font-bold text-[#0F3D3E] mb-3 font-display">
          أولاً: البيانات الأساسية للطالب (مطابقة من السجل الرسمي)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-sm">
          <div>
            <span className="text-slate-500 text-xs block">الاسم الثلاثي واللقب</span>
            <span className="font-semibold text-slate-900">{request.studentName}</span>
          </div>
          <div>
            <span className="text-slate-500 text-xs block">القسم العلمي</span>
            <span className="font-semibold text-slate-900">{request.department || settings.departmentName}</span>
          </div>
          <div>
            <span className="text-slate-500 text-xs block">المرحلة الدراسية</span>
            <span className="font-semibold text-slate-900">{request.stage}</span>
          </div>
          <div>
            <span className="text-slate-500 text-xs block">نوع الدراسة</span>
            <span className="font-semibold text-slate-900">{request.studyType}</span>
          </div>
          <div>
            <span className="text-slate-500 text-xs block">رقم الهاتف للتواصل</span>
            <span className="font-semibold text-slate-900 tabular-nums" dir="ltr">
              {payload.contactPhone}
            </span>
          </div>
        </div>
      </div>

      {/* تفاصيل الخدمة المحددة */}
      <div className="border border-slate-200 rounded-lg p-4 mb-6">
        <h3 className="text-xs font-bold text-[#0F3D3E] mb-3 font-display">
          ثانياً: تفاصيل {request.serviceTitle}
        </h3>

        {request.serviceId === 'enrollment_confirmation' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500 text-xs block">الجهة الموجّه إليها التأييد</span>
              <span className="font-semibold text-slate-900">{payload.addressedToEntity || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 text-xs block">الغرض من التأييد</span>
              <span className="font-semibold text-slate-900">{payload.purposeOfConfirmation || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 text-xs block">عدد النسخ المطلوبة</span>
              <span className="font-semibold tabular-nums">{payload.copiesCount ?? 1} نسخة</span>
            </div>
            <div>
              <span className="text-slate-500 text-xs block">لغة كتاب التأييد</span>
              <span className="font-semibold text-slate-900">{payload.confirmationLanguage || 'عربي'}</span>
            </div>
          </div>
        )}

        {request.serviceId === 'absence_waiver' && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-500 text-xs block">فترة الغياب من تاريخ</span>
                <span className="font-semibold tabular-nums">{payload.absencePeriodFrom || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">إلى تاريخ</span>
                <span className="font-semibold tabular-nums">{payload.absencePeriodTo || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">نوع العذر</span>
                <span className="font-semibold text-slate-900">{payload.excuseType || '—'}</span>
              </div>
            </div>
            <div>
              <span className="text-slate-500 text-xs block">المواد المطلوب رفع غيابها (منهاج {settings.curriculumYear})</span>
              <p className="font-semibold text-slate-900 mt-1">
                {payload.absenceSubjects && payload.absenceSubjects.length > 0
                  ? payload.absenceSubjects.join(' ، ')
                  : '—'}
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-xs block">شرح العذر التفصيلي</span>
              <p className="font-medium text-slate-900 mt-0.5">{payload.excuseExplanation || '—'}</p>
            </div>
          </div>
        )}

        {request.serviceId === 'temporary_id' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500 text-xs block">سبب طلب الهوية المؤقتة</span>
              <span className="font-semibold text-slate-900">{payload.idRequestReason || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 text-xs block">رقم الهوية السابقة (إن وجد)</span>
              <span className="font-semibold tabular-nums">{payload.previousIdNumber || 'غير متوفر'}</span>
            </div>
            {payload.idRequestReason === 'فقدان' && (
              <>
                <div>
                  <span className="text-slate-500 text-xs block">تاريخ الفقدان</span>
                  <span className="font-semibold tabular-nums">{payload.lossDate || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">رقم محضر الإخبار الرسمي</span>
                  <span className="font-semibold tabular-nums">{payload.policeReportNumber || '—'}</span>
                </div>
              </>
            )}
          </div>
        )}

        {request.serviceId === 'exam_appeal' && (
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-slate-500 text-xs block">الفصل الدراسي والدور الامتحاني</span>
              <span className="font-semibold text-slate-900">{payload.semesterAndRound || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 text-xs block mb-2">المواد المعترض عليها وأسباب الاعتراض</span>
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">المادة الدراسية</th>
                      <th className="py-2 px-3">سبب الاعتراض</th>
                      <th className="py-2 px-3">التفاصيل والملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(payload.appealedSubjects || []).map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-slate-900">{item.subjectName}</td>
                        <td className="py-2 px-3 text-slate-800">{item.reason}</td>
                        <td className="py-2 px-3 text-slate-600">{item.details || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* المرفقات */}
      <div className="border border-slate-200 rounded-lg p-3.5 mb-6 text-xs flex items-center justify-between bg-slate-50/60">
        <div>
          <span className="font-bold text-slate-700">ثالثاً: المرفقات المربوطة بالمعاملة: </span>
          <span className="text-slate-800 font-medium">
            {payload.attachmentName ? payload.attachmentName : 'لا يوجد مرفق مضاف'}
          </span>
        </div>
        {payload.attachmentDataUrl && payload.attachmentDataUrl.startsWith('data:image') && (
          <img
            src={payload.attachmentDataUrl}
            alt="مرفق المعاملة"
            className="w-14 h-14 object-cover rounded border border-slate-300"
          />
        )}
      </div>

      {/* الإقرار والتواقيع */}
      <div className="border-t border-slate-300 pt-4 mt-6">
        <p className="text-xs text-slate-700 mb-8">
          <span className="font-bold">إقرار الطالب: </span>
          أقرّ أنا الطالب ({request.studentName}) بصحة كافة البيانات والمرفقات المدرجة في هذا الطلب وأتحمل المسؤولية القانونية والإدارية كاملة في حال ثبوت خلاف ذلك.
        </p>

        <div className="grid grid-cols-3 gap-4 text-center text-xs pt-2">
          <div className="space-y-8">
            <p className="font-bold text-slate-800">توقيع الطالب مقدم الطلب</p>
            <div className="border-b border-dashed border-slate-400 w-32 mx-auto" />
          </div>
          <div className="space-y-8">
            <p className="font-bold text-slate-800">تدقيق الشعبة الإدارية / التسجيل</p>
            <div className="border-b border-dashed border-slate-400 w-32 mx-auto" />
          </div>
          <div className="space-y-8">
            <p className="font-bold text-slate-800">موافقة وتوقيع رئاسة القسم</p>
            <div className="border-b border-dashed border-slate-400 w-32 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * توليد ملف PDF فعلي من عنصر الوثيقة الرسمي لإرساله إلى Google Drive أو تحميله
 */
export async function generatePdfBlobFromElement(elementId: string): Promise<Blob | null> {
  const element = document.getElementById(elementId);
  if (!element) return null;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    return pdf.output('blob');
  } catch (e) {
    console.error('Failed to generate PDF blob:', e);
    return null;
  }
}

/**
 * طباعة أو تنزيل أي وثيقة أو جدول بصيغة PDF بشكل موثوق حتى داخل إطارات المعاينة المحمية (Sandboxed iFrames)
 */
export async function printOrDownloadElement(
  elementId: string,
  fileName = 'document.pdf'
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    try {
      window.print();
    } catch {
      // ignore
    }
    return false;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // 1. Trigger direct PDF download so the user immediately gets the ready-to-print file even if iframe blocks print dialog
    const cleanName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    pdf.save(cleanName);

    // 2. Also attempt clean image print via hidden iframe for browsers that permit iframe printing
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
            <head>
              <title>${cleanName}</title>
              <style>
                @page { size: A4; margin: 0; }
                body { margin: 0; padding: 0; display: flex; justify-content: center; background: #fff; }
                img { width: 100%; max-width: 210mm; height: auto; display: block; }
              </style>
            </head>
            <body>
              <img src="${imgData}" onload="setTimeout(function(){ window.focus(); window.print(); }, 150);" />
            </body>
          </html>
        `);
        doc.close();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 5000);
      }
    } catch {
      // Fallback if sandbox blocks iframe print
    }

    return true;
  } catch (e) {
    console.error('Print/PDF error:', e);
    try {
      window.print();
    } catch {
      // ignore
    }
    return false;
  }
}

