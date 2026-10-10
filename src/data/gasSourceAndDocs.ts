/**
 * ============================================================================
 * مشروع السكرتير الرقمي الأكاديمي — Google Apps Script (Code.gs)
 * المرحلة الثانية: خدمة «طلب إحالة طبية» بقالب الكتاب الرسمي + اختبارات المحاكاة
 * ============================================================================
 */

export const GAS_CODE_GS = `/**
 * السكرتير الرقمي الأكاديمي - الخادم (Code.gs)
 * يدعم: الإعدادات، التحقق من هوية الطالب، إرسال طلب الإحالة الطبية وتوليد PDF رسمي
 */

const SETTING_KEYS = [
  'university',
  'college',
  'department',
  'studentsSheetUrl',
  'letterContact',
  'medicalAuthority',
  'academicYear',
  'headName',
  'copyTo'
];

const DEFAULT_SETTINGS = {
  university: 'جامعة الفرات الأوسط التقنية',
  college: 'كلية البوليتكنك - بابل',
  department: 'هندسة تقنيات تكنولوجيا المعلومات',
  studentsSheetUrl: '',
  letterContact: 'بابل - القاسم | info.poly@atu.edu.iq',
  medicalAuthority: 'مدير المستشفى العام في أبي غرق',
  academicYear: '2026-2027',
  headName: 'أ.م.د. عدنان عذاب كاظم السعيدي',
  copyTo: 'الاضبارة'
};

const SETTING_LABELS = {
  university: 'اسم الجامعة',
  college: 'اسم الكلية',
  department: 'اسم القسم العلمي',
  studentsSheetUrl: 'رابط جدول الطلبة',
  letterContact: 'الموقع والبريد في الترويسة',
  medicalAuthority: 'المخاطَب (الجهة الصحية)',
  academicYear: 'العام الدراسي',
  headName: 'اسم رئيس القسم',
  copyTo: 'نسخة منه إلى'
};

const STUDENT_HEADERS = {
  name: ['الاسم الثلاثي', 'الاسم الكامل', 'اسم الطالب'],
  stage: ['المرحلة', 'المرحلة الدراسية'],
  study: ['نوع الدراسة', 'الدراسة'],
  phone: ['رقم الهاتف', 'الهاتف', 'الموبايل'],
  card: ['رقم البطاقة', 'رقم الهوية'],
  dept: ['القسم', 'القسم العلمي']
};

/**
 * تنظيف القيم قبل كتابتها في خلايا Google Sheets لمنع حقن المعادلات (CSV/Formula Injection)
 */
function safeCell_(val, maxLen) {
  if (val === null || val === undefined) return '';
  var limit = maxLen || 150;
  var s = String(val)
    .replace(/[\\r\\n\\t]+/g, ' ')
    .replace(/[\\u0000-\\u001F\\u007F]/g, '')
    .trim();
  if (limit > 0 && s.length > limit) {
    s = s.substring(0, limit).trim();
  }
  if (/^[=+\\-@]/.test(s)) {
    return "'" + s;
  }
  return s;
}

/**
 * تركيب صيغة المخاطب: «السيد ... المحترم» دون تكرار
 */
function composeAddressee_(authority) {
  var raw = String(authority || '').replace(/[\\r\\n]+/g, ' ').trim();
  if (!raw) return 'السيد مدير المركز الصحي الجامعي المحترم';
  var hasPrefix = /^السيد(\\s|$)/.test(raw) || /^السيدة(\\s|$)/.test(raw);
  var hasSuffix = /(\\s|^)(المحترم|المحترمة)$/.test(raw);
  return ((hasPrefix ? '' : 'السيد ') + raw + (hasSuffix ? '' : ' المحترم'))
    .replace(/\\s+/g, ' ')
    .trim();
}

/**
 * تركيب سطر القسم في متن الجدول: {قسم الطالب} / {الكلية} دون تكرار الكلية
 */
function composeDepartmentLine_(studentDept, settingsDept, college) {
  var dept = (studentDept && String(studentDept).trim())
    ? String(studentDept).trim()
    : String(settingsDept || '').trim();
  var col = String(college || '').trim();
  if (!col) return dept;
  if (dept.indexOf(col) !== -1) return dept;
  return dept + ' / ' + col;
}

/**
 * تركيب عنوان التوقيع: «رئيس قسم » + department من الإعدادات دائماً
 */
function composeHeadTitle_(settingsDept) {
  var d = String(settingsDept || '').trim();
  if (!d) return 'رئيس القسم العلمي';
  if (/^رئيس\\s+قسم/.test(d)) return d;
  if (/^قسم(\\s|$)/.test(d)) return 'رئيس ' + d;
  return 'رئيس قسم ' + d;
}

/**
 * الهروب الآمن للنص البديل في DocumentApp.replaceText لأن $ له معنى خاص في Regex replacement
 */
function escapeReplacement_(text) {
  return String(text === null || text === undefined ? '' : text).replace(/\\$/g, '$$$$');
}

/**
 * حفظ الإعدادات (للمسؤول فقط) مع حد 150 حرفاً وتمريرها على safeCell_
 */
function saveSettings(payload) {
  assertAdmin_();
  var sheet = getOrCreateSheet_('الإعدادات', ['المفتاح', 'القيمة', 'الوصف']);
  var cleanSettings = {};
  SETTING_KEYS.forEach(function(k) {
    var rawVal = payload && payload[k] !== undefined ? payload[k] : DEFAULT_SETTINGS[k];
    cleanSettings[k] = safeCell_(rawVal, 150);
  });

  sheet.clearContents();
  var rows = [['المفتاح', 'القيمة', 'الوصف']];
  SETTING_KEYS.forEach(function(k) {
    rows.push([k, cleanSettings[k], SETTING_LABELS[k] || k]);
  });
  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  return { ok: true, settings: cleanSettings };
}

/**
 * دالة إرسال طلب الإحالة الطبية (خادم)
 * @param {{token: string, reason: string}} data
 */
function submitMedicalReferral(data) {
  try {
    if (!data || !data.token) {
      return { ok: false, message: 'جلسة التحقق غير صالحة أو منتهية، يرجى إعادة التحقق.' };
    }

    // 1. التحقق من الجلسة في الخادم (لا نأخذ الاسم أو المرحلة أو القسم من العميل أبداً)
    var cache = CacheService.getScriptCache();
    var sessionJson = cache.get('STU_SES_' + data.token);
    if (!sessionJson) {
      return { ok: false, message: 'انتهت صلاحية الجلسة (15 دقيقة). يرجى إعادة التحقق من الهوية.' };
    }
    var session = JSON.parse(sessionJson);

    // 2. تنظيف سبب الإحالة والتحقق من الطول (5 إلى 200 حرف)
    var rawReason = String(data.reason || '')
      .replace(/[\\r\\n\\t]+/g, ' ')
      .replace(/[\\u0000-\\u001F\\u007F]/g, '')
      .replace(/\\s+/g, ' ')
      .trim();

    if (rawReason.length < 5 || rawReason.length > 200) {
      return { ok: false, message: 'يرجى كتابة سبب الإحالة بحيث لا يقل عن 5 أحرف ولا يتجاوز 200 حرف.' };
    }

    // 3. حد الإرسال: طلب إحالة واحد لكل طالب كل ساعة عبر CacheService
    var rateKey = 'RATE_MED_' + Utilities.base64EncodeWebSafe(session.name);
    if (cache.get(rateKey)) {
      return { ok: false, message: 'لا يمكن إرسال أكثر من طلب إحالة طبية واحد خلال الساعة الواحدة.' };
    }

    // 4. أخذ قفل متزامن LockService وتوليد رقم الطلب المتسلسل (6 خانات)
    var lock = LockService.getScriptLock();
    lock.waitLock(15000);

    try {
      // إعادة فحص حد الساعة داخل القفل لمنع النقر المزدوج المتزامن
      if (cache.get(rateKey)) {
        return { ok: false, message: 'تم استلام طلبك بالفعل قبل لحظات.' };
      }

      var props = PropertiesService.getScriptProperties();
      var templateId = props.getProperty('MEDICAL_TEMPLATE_ID');
      if (!templateId) {
        console.error('MEDICAL_TEMPLATE_ID is missing in Script Properties.');
        return { ok: false, message: 'تعذّر إرسال الطلب، حاول لاحقاً' };
      }

      var currentSeq = parseInt(props.getProperty('REQUEST_SEQ_COUNTER') || '0', 10);
      var nextSeq = currentSeq + 1;
      props.setProperty('REQUEST_SEQ_COUNTER', String(nextSeq));
      var requestNo = ('000000' + nextSeq).slice(-6);

      var settings = getSettingsMap_();
      var now = new Date();
      var baghdadDate = Utilities.formatDate(now, 'Asia/Baghdad', 'dd/MM/yyyy');
      var fileDate = Utilities.formatDate(now, 'Asia/Baghdad', 'yyyy-MM-dd');

      // 5. نسخ القالب واستبدال العناصر النائبة في المتن والترويسة والتذييل
      var folder = getOrCreatePrivateFolder_(props);
      var tempFile = DriveApp.getFileById(templateId).makeCopy('TEMP_MED_' + requestNo, folder);
      var doc = DocumentApp.openById(tempFile.getId());

      var replacements = {
        '\\\\{\\\\{UNIVERSITY\\\\}\\\\}': settings.university,
        '\\\\{\\\\{COLLEGE\\\\}\\\\}': settings.college,
        '\\\\{\\\\{DEPARTMENT\\\\}\\\\}': settings.department,
        '\\\\{\\\\{LETTER_CONTACT\\\\}\\\\}': settings.letterContact || '',
        '\\\\{\\\\{DATE\\\\}\\\\}': baghdadDate,
        '\\\\{\\\\{ADDRESSEE\\\\}\\\\}': composeAddressee_(settings.medicalAuthority),
        '\\\\{\\\\{STUDENT_NAME\\\\}\\\\}': session.name,
        '\\\\{\\\\{STAGE\\\\}\\\\}': session.stage,
        '\\\\{\\\\{DEPARTMENT_LINE\\\\}\\\\}': composeDepartmentLine_(session.dept, settings.department, settings.college),
        '\\\\{\\\\{ACADEMIC_YEAR\\\\}\\\\}': settings.academicYear,
        '\\\\{\\\\{REASON\\\\}\\\\}': rawReason,
        '\\\\{\\\\{HEAD_NAME\\\\}\\\\}': settings.headName,
        '\\\\{\\\\{HEAD_TITLE\\\\}\\\\}': composeHeadTitle_(settings.department),
        '\\\\{\\\\{COPY_TO\\\\}\\\\}': settings.copyTo || 'الاضبارة'
      };

      var sections = [doc.getBody(), doc.getHeader(), doc.getFooter()];
      sections.forEach(function(sec) {
        if (!sec) return;
        Object.keys(replacements).forEach(function(pattern) {
          sec.replaceText(pattern, escapeReplacement_(replacements[pattern]));
        });
      });

      doc.saveAndClose();

      // 6. تصدير PDF وحذف النسخة المؤقتة
      var pdfBlob = tempFile.getAs(MimeType.PDF);
      pdfBlob.setName(requestNo + '-medical-referral-' + fileDate + '.pdf');
      var pdfFile = folder.createFile(pdfBlob);
      tempFile.setTrashed(true);

      // 7. إضافة صف إلى ورقة «الطلبات» مع safeCell_
      var reqSheet = getOrCreateSheet_('الطلبات', [
        'رقم الطلب', 'التاريخ', 'اسم الطالب', 'المرحلة', 'الخدمة', 'رابط الملف', 'الحالة'
      ]);
      reqSheet.appendRow([
        safeCell_(requestNo, 20),
        safeCell_(baghdadDate, 20),
        safeCell_(session.name, 150),
        safeCell_(session.stage, 50),
        safeCell_('إحالة طبية', 50),
        safeCell_(pdfFile.getUrl(), 300),
        safeCell_('جديد', 20)
      ]);

      // تثبيت قفل الساعة للطالب
      cache.put(rateKey, requestNo, 3600);

      // 8. إعادة {ok:true, requestNo} فقط دون رابط الملف أو بيانات شخصية
      return { ok: true, requestNo: requestNo };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error('submitMedicalReferral failed:', err);
    return { ok: false, message: 'تعذّر إرسال الطلب، حاول لاحقاً' };
  }
}
`;

export const README_TEMPLATE_GUIDE = `# دليل إعداد قالب «طلب الإحالة الطبية» (Google Docs & Script Properties)

## 1. العناصر النائبة المعتمدة في القالب (\`medical_referral_template.docx\`)
يحتوي ملف القالب على العناصر النائبة الأربعة عشر الآتية بنفس الترتيب الرسمي:

- الترويسة (Header):
  - \`{{UNIVERSITY}}\`
  - \`{{COLLEGE}}\`
  - \`{{DEPARTMENT}}\`
  - \`{{LETTER_CONTACT}}\` (يُحذف السطر تلقائياً إن تُرك فارغاً في الإعدادات)
- العدد والتاريخ:
  - \`العدد: ....................\`
  - \`التاريخ: {{DATE}}\` (بصيغة \`dd/MM/yyyy\` وأرقام لاتينية بتوقيت \`Asia/Baghdad\`)
- المخاطَب والموضوع:
  - \`{{ADDRESSEE}}\` (يُركَّب تلقائياً: «السيد ... المحترم»)
  - \`م/ فحص ومعالجة طالب\`
- جدول بيانات الطالب (خلفية العمود الأول \`#EDEDED\` وحدود \`#7F7F7F\`):
  - اسم الطالب: \`{{STUDENT_NAME}}\`
  - المرحلة الدراسية: \`{{STAGE}}\`
  - القسم: \`{{DEPARTMENT_LINE}}\` (\`{قسم الطالب} / {الكلية}\`)
  - العام الدراسي: \`{{ACADEMIC_YEAR}}\`
  - سبب الإحالة: \`{{REASON}}\`
- التوقيع (بدون مربع نص عائم لضمان عمل \`replaceText\`):
  - \`{{HEAD_NAME}}\`
  - \`{{HEAD_TITLE}}\` (\`رئيس قسم {department}\` من الإعدادات دائماً)
- نسخة منه إلى والتذييل (Footer):
  - \`{{COPY_TO}}\` (الافتراضي: «الاضبارة»)
  - \`{{UNIVERSITY}} | {{COLLEGE}} | {{DEPARTMENT}}\` فوق خط ذهبي رفيع

## 2. خطوات رفع القالب وتحويله إلى Google Docs
1. افتح مجلد Google Drive الخاص بحساب مسؤول النظام.
2. ارفع ملف القالب \`medical_referral_template.docx\` إلى Drive.
3. افتح الملف المرفوع ثم اختر من القائمة: **ملف (File) ← حفظ بتنسيق مستندات Google (Save as Google Docs)**.
4. تأكد من أن الخط المستخدم في المستند هو **Arial** أو **Amiri** لضمان سلامة الحروف العربية واتجاه RTL عند التصدير إلى PDF.
5. انسخ معرّف المستند (Document ID) من شريط العنوان:
   \`https://docs.google.com/document/d/YOUR_DOCUMENT_ID_HERE/edit\`
6. في محرر Google Apps Script، افتح **إعدادات المشروع (Project Settings) ← خصائص البرنامج النصي (Script Properties)** وأضف الخاصية:
   - **Property:** \`MEDICAL_TEMPLATE_ID\`
   - **Value:** معرّف مستند Google Docs الذي نسخته.
`;
