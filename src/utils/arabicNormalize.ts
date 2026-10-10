/**
 * توحيد الحروف العربية للمطابقة الدقيقة (أ/إ/آ -> ا، ى -> ي، ة -> ه)
 * وحذف التشكيل والمسافات المكررة
 */
export function normalizeArabicName(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // إزالة الحركات والتشكيل
    .replace(/[أإآٱ]/g, 'ا') // توحيد الألف
    .replace(/ى/g, 'ي') // توحيد الألف المقصورة والياء
    .replace(/ة/g, 'ه') // توحيد التاء المربوطة والهاء
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' '); // توحيد المسافات
}

/**
 * تحويل الأرقام الهندية/العربية المشرقية (٠-٩) والفارسية (۰-۹) إلى أرقام عالمية (0-9)
 */
export function normalizeDigits(input: string): string {
  if (!input) return '';
  const arabicIndic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianIndic = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let result = input;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(arabicIndic[i], 'g'), String(i));
    result = result.replace(new RegExp(persianIndic[i], 'g'), String(i));
  }
  return result;
}

/**
 * توحيد صيغة رقم الهاتف العراقي أو رقم البطاقة للمطابقة
 * يقبل 07xx و +9647xx و 009647xx ويوحّد الأرقام ويحذف المسافات والشارحة
 */
export function normalizeIdentifier(input: string): string {
  if (!input) return '';
  let cleaned = normalizeDigits(input)
    .replace(/[\s\-().]/g, '')
    .trim();

  // توحيد رمز الدولة العراقي +964 أو 00964 إلى 0
  if (cleaned.startsWith('+964')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('00964')) {
    cleaned = '0' + cleaned.slice(5);
  } else if (cleaned.startsWith('964') && cleaned.length === 13) {
    cleaned = '0' + cleaned.slice(3);
  }

  return cleaned.toUpperCase();
}

/**
 * استخراج معرّف جدول Google Sheet من الرابط الكامل أو إرجاعه إن كان معرفاً مباشراً
 */
export function extractSpreadsheetId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * تنسيق التاريخ بالعربية بصورة رسمية واضحة
 */
export function formatArabicDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * تنسيق التاريخ بصيغة dd/MM/yyyy وأرقام لاتينية بتوقيت Asia/Baghdad للكتب الرسمية
 */
export function formatBaghdadLatinDate(dateInput?: string | Date): string {
  try {
    const date = dateInput ? new Date(dateInput) : new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Baghdad',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(date);

    const day = parts.find((p) => p.type === 'day')?.value || '09';
    const month = parts.find((p) => p.type === 'month')?.value || '10';
    const year = parts.find((p) => p.type === 'year')?.value || '2026';
    return `${day}/${month}/${year}`;
  } catch {
    return '09/10/2026';
  }
}

/**
 * دالة safeCell_ لمنع حقن المعادلات في خلايا Google Sheets وتنظيف الأسطر الجديدة ومحارف التحكم
 */
export function safeCell(value: string, maxLen = 150): string {
  if (!value) return '';
  let cleaned = String(value)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();

  if (maxLen > 0 && cleaned.length > maxLen) {
    cleaned = cleaned.slice(0, maxLen).trim();
  }

  if (/^[=+\-@]/.test(cleaned)) {
    return `'${cleaned}`;
  }
  return cleaned;
}

/**
 * تركيب المخاطَب: «السيد ... المحترم» دون تكرار «السيد» أو «المحترم» إن كتبها المسؤول
 */
export function composeAddressee(medicalAuthority?: string): string {
  const raw = (medicalAuthority || '').replace(/[\r\n]+/g, ' ').trim();
  if (!raw) return 'السيد مدير المركز الصحي الجامعي المحترم';
  const hasSayed = /^السيد(\s|$)/.test(raw) || /^السيدة(\s|$)/.test(raw);
  const hasMuhtaram = /(\s|^)(المحترم|المحترمة)$/.test(raw);
  const prefix = hasSayed ? '' : 'السيد ';
  const suffix = hasMuhtaram ? '' : ' المحترم';
  return `${prefix}${raw}${suffix}`.replace(/\s+/g, ' ').trim();
}

/**
 * تركيب سطر القسم في الجدول: {قسم الطالب} / {الكلية} دون تكرار الكلية إن كانت مذكورة أصلاً
 */
export function composeDepartmentLine(
  studentDept: string | undefined,
  settingsDept: string,
  collegeName: string
): string {
  const dept = (studentDept && studentDept.trim() ? studentDept.trim() : settingsDept.trim()) || 'القسم العلمي';
  const college = (collegeName || '').trim();
  if (!college) return dept;
  if (normalizeArabicName(dept).includes(normalizeArabicName(college))) {
    return dept;
  }
  return `${dept} / ${college}`;
}

/**
 * تركيب عنوان التوقيع: «رئيس قسم » + department من الإعدادات دائماً، دون تكرار «رئيس قسم» أو «قسم»
 */
export function composeHeadTitle(settingsDept: string): string {
  const cleanDept = (settingsDept || '').trim();
  if (!cleanDept) return 'رئيس القسم العلمي';
  if (/^رئيس\s+قسم/.test(cleanDept)) return cleanDept;
  if (/^قسم(\s|$)/.test(cleanDept)) return `رئيس ${cleanDept}`;
  return `رئيس قسم ${cleanDept}`;
}

/**
 * التحقق مما إذا كان الإعلان قد نُشر خلال آخر 24 ساعة
 */
export function isRecentWithin24Hours(createdAtStr?: string): boolean {
  if (!createdAtStr) return false;
  const createdMs = new Date(createdAtStr).getTime();
  if (isNaN(createdMs)) return false;
  const diffMs = Date.now() - createdMs;
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  return diffMs >= -60_000 && diffMs <= twentyFourHoursMs;
}


