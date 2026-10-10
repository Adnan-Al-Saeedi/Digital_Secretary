import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { AcademicStage, StudentRecord, StudentRequestRecord, StudyType } from '../types';
import { extractSpreadsheetId, normalizeArabicName, safeCell } from '../utils/arabicNormalize';

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/documents',
];

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let provider: GoogleAuthProvider | null = null;

try {
  if (firebaseConfig && firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    provider = new GoogleAuthProvider();
    SCOPES.forEach((scope) => provider?.addScope(scope));
    provider.setCustomParameters({
      prompt: 'select_account',
    });
  }
} catch (err) {
  console.warn('Firebase initialization skipped or failed:', err);
}

let isSigningIn = false;
// Cache the access token strictly in memory per security guidelines
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!auth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!auth || !provider) {
    throw new Error('لم يتم تهيئة خدمة مصادقة Google في هذه البيئة.');
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('تعذر الحصول على رمز الصلاحية من حساب Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logout = async () => {
  if (auth) {
    await auth.signOut();
  }
  cachedAccessToken = null;
};

/**
 * فحص اتصال جدول بيانات الطلبة في Google Sheets وقراءة الأعمدة بأسمائها لا بترتيبها
 * الأعمدة المطلوبة: الاسم الثلاثي، المرحلة، نوع الدراسة، رقم الهاتف، رقم البطاقة، (اختياري: القسم)
 */
export interface SheetConnectionTestResult {
  success: boolean;
  message: string;
  studentsCount: number;
  detectedColumns: string[];
  missingColumns: string[];
  hasDepartmentColumn?: boolean;
  departmentColumnMessage?: string;
  students?: StudentRecord[];
}

const REQUIRED_COLUMNS = [
  { key: 'fullName', label: 'الاسم الثلاثي', aliases: ['الاسم الثلاثي', 'الاسم الكامل', 'اسم الطالب', 'الاسم'] },
  { key: 'department', label: 'القسم', aliases: ['القسم', 'القسم العلمي'] },
  { key: 'stage', label: 'المرحلة', aliases: ['المرحلة', 'المرحلة الدراسية'] },
  { key: 'studyType', label: 'نوع الدراسة', aliases: ['نوع الدراسة', 'الدراسة'] },
  { key: 'phone', label: 'رقم الهاتف', aliases: ['رقم الهاتف', 'الهاتف', 'الموبايل', 'رقم الموبايل'] },
  { key: 'cardId', label: 'رقم البطاقة', aliases: ['رقم البطاقة', 'رقم الهوية', 'البطاقة الجامعية', 'البطاقة'] },
];

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const nextCh = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"' && nextCh === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (ch === '\n' || (ch === '\r' && nextCh === '\n')) {
        if (ch === '\r') i++;
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else if (ch === '\r') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function matchHeaderIndex(headers: string[], aliases: string[]): number {
  const normalizedAliases = aliases.map((a) => normalizeArabicName(a));
  return headers.findIndex((h) => {
    const normH = normalizeArabicName(h);
    return normalizedAliases.some((alias) => normH === alias || normH.includes(alias));
  });
}

function normalizeStageValue(raw: string): AcademicStage {
  const norm = normalizeArabicName(raw);
  if (norm.includes('اول') || norm.includes('1') || norm.includes('١')) return 'المرحلة الأولى';
  if (norm.includes('ثاني') || norm.includes('2') || norm.includes('٢')) return 'المرحلة الثانية';
  if (norm.includes('ثالث') || norm.includes('3') || norm.includes('٣')) return 'المرحلة الثالثة';
  if (norm.includes('رابع') || norm.includes('4') || norm.includes('٤')) return 'المرحلة الرابعة';
  return 'المرحلة الأولى';
}

function normalizeStudyTypeValue(raw: string): StudyType {
  const norm = normalizeArabicName(raw);
  if (norm.includes('مساء') || norm.includes('مسائي')) return 'مسائي';
  return 'صباحي';
}

export async function testAndFetchStudentSheet(
  sheetUrl: string,
  defaultDepartment: string
): Promise<SheetConnectionTestResult> {
  const trimmedUrl = (sheetUrl || '').trim();
  if (!trimmedUrl) {
    return {
      success: false,
      message: 'يرجى إدخال رابط جدول بيانات الطلبة (Google Sheet أو رابط CSV).',
      studentsCount: 0,
      detectedColumns: [],
      missingColumns: REQUIRED_COLUMNS.map((c) => c.label),
    };
  }

  const spreadsheetId = extractSpreadsheetId(trimmedUrl);
  const isDirectCsvUrl =
    trimmedUrl.includes('output=csv') ||
    trimmedUrl.endsWith('.csv') ||
    trimmedUrl.includes('/pub?');

  if (!spreadsheetId && !isDirectCsvUrl && !trimmedUrl.startsWith('http')) {
    return {
      success: false,
      message: 'الرابط المدخل لا يمثل رابط جدول Google Sheet أو CSV صالحاً.',
      studentsCount: 0,
      detectedColumns: [],
      missingColumns: REQUIRED_COLUMNS.map((c) => c.label),
    };
  }

  let rows: string[][] = [];
  let sourceTitle = 'بيانات الطلبة';

  try {
    const token = getAccessToken();

    // 1. Try Google Sheets API v4 if authenticated and spreadsheetId is available
    if (token && spreadsheetId && !isDirectCsvUrl) {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?IncludeGridData=false`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (metaRes.ok) {
        const metaData = await metaRes.json();
        sourceTitle = metaData.sheets?.[0]?.properties?.title || 'Sheet1';

        const valuesRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sourceTitle)}!A1:Z2000`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (valuesRes.ok) {
          const valuesData = await valuesRes.json();
          rows = valuesData.values || [];
        }
      }
    }

    // 2. Fallback or direct CSV fetch (works for published links, CSV links, or shared Google Sheets without requiring OAuth token)
    if (rows.length === 0) {
      let csvFetchUrl = trimmedUrl;
      if (spreadsheetId && !isDirectCsvUrl) {
        const gidMatch = trimmedUrl.match(/[#&?]gid=([0-9]+)/);
        const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
        csvFetchUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv${gidParam}`;
      }

      const csvRes = await fetch(csvFetchUrl);
      if (!csvRes.ok) {
        if (!token) {
          return {
            success: false,
            message:
              'تعذر قراءة الرابط مباشرة. تأكد من أن الجدول منشور أو مشارك للعرض، أو سجّل الدخول بحساب Google المؤسسي في القائمة الجانبية.',
            studentsCount: 0,
            detectedColumns: [],
            missingColumns: [],
          };
        }
        return {
          success: false,
          message: 'تعذر الوصول إلى الجدول. تأكد من صحة الرابط وصلاحية المشاركة.',
          studentsCount: 0,
          detectedColumns: [],
          missingColumns: [],
        };
      }

      const csvText = await csvRes.text();
      rows = parseCsvRows(csvText);
    }

    if (rows.length === 0) {
      return {
        success: false,
        message: 'الجدول فارغ ولا يحتوي على صف عناوين الأعمدة.',
        studentsCount: 0,
        detectedColumns: [],
        missingColumns: REQUIRED_COLUMNS.map((c) => c.label),
      };
    }

    const headers = rows[0].map((h) => String(h || '').replace(/^\uFEFF/, '').trim());
    const colMap: Record<string, number> = {};
    const missingColumns: string[] = [];

    for (const reqCol of REQUIRED_COLUMNS) {
      const idx = matchHeaderIndex(headers, reqCol.aliases);
      if (idx === -1) {
        // القسم يمكن تعويضه من الإعدادات إن لم يكن موجوداً، لكن نتحقق منه
        if (reqCol.key !== 'department') {
          missingColumns.push(reqCol.label);
        }
      } else {
        colMap[reqCol.key] = idx;
      }
    }

    const deptIdx = colMap.department !== undefined ? colMap.department : matchHeaderIndex(headers, ['القسم', 'القسم العلمي']);
    const hasDepartmentColumn = deptIdx !== -1;
    const departmentColumnMessage = hasDepartmentColumn
      ? 'عمود «القسم» موجود: سيؤخذ القسم من الجدول (الاسم الثلاثي، القسم، المرحلة، نوع الدراسة، رقم الهاتف، رقم البطاقة)'
      : 'عمود «القسم» غير موجود: سيُستخدم قسم الإعدادات';

    if (missingColumns.length > 0) {
      return {
        success: false,
        message: `تم الاتصال بالجدول، لكن الأعمدة الآتية غير موجودة: (${missingColumns.join('، ')})`,
        studentsCount: 0,
        detectedColumns: headers.filter(Boolean),
        missingColumns,
        hasDepartmentColumn,
        departmentColumnMessage,
      };
    }

    const parsedStudents: StudentRecord[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const fullName = String(row[colMap.fullName] || '').trim();
      if (!fullName) continue;

      parsedStudents.push({
        id: `SHEET-${i}`,
        fullName,
        department: deptIdx !== -1 && row[deptIdx] ? String(row[deptIdx]).trim() : defaultDepartment,
        stage: normalizeStageValue(String(row[colMap.stage] || '')),
        studyType: normalizeStudyTypeValue(String(row[colMap.studyType] || '')),
        phone: String(row[colMap.phone] || '').trim(),
        cardId: String(row[colMap.cardId] || '').trim(),
      });
    }

    return {
      success: true,
      message: `تم الاتصال بنجاح وقراءة ${parsedStudents.length} طالباً من "${sourceTitle}" وفق الهيكلة المعتمدة (الاسم الثلاثي، القسم، المرحلة، نوع الدراسة، رقم الهاتف، رقم البطاقة).`,
      studentsCount: parsedStudents.length,
      detectedColumns: headers.filter(Boolean),
      missingColumns: [],
      hasDepartmentColumn,
      departmentColumnMessage,
      students: parsedStudents,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `حدث خطأ أثناء الاتصال بمصدر بيانات الطلبة: ${err?.message || 'خطأ غير معروف'}`,
      studentsCount: 0,
      detectedColumns: [],
      missingColumns: [],
    };
  }
}

/**
 * إنشاء جدول نموذجي للطلبة في حساب Google الخاص بالمسؤول بنقرة واحدة للتجربة الفورية
 */
export async function createSampleStudentRegistrySheet(
  sampleStudents: StudentRecord[],
  departmentTitle: string
): Promise<{ spreadsheetUrl: string; spreadsheetId: string } | null> {
  const token = getAccessToken();
  if (!token) return null;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `سجل بيانات طلبة - ${departmentTitle} (2026-2027)`,
        locale: 'ar_IQ',
      },
      sheets: [
        {
          properties: {
            title: 'بيانات الطلبة',
            rightToLeft: true,
          },
        },
      ],
    }),
  });

  if (!createRes.ok) return null;
  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl = created.spreadsheetUrl;

  const values = [
    ['الاسم الثلاثي', 'القسم', 'المرحلة', 'نوع الدراسة', 'رقم الهاتف', 'رقم البطاقة'],
    ...sampleStudents.map((s) => [
      s.fullName,
      s.department || departmentTitle,
      s.stage,
      s.studyType,
      s.phone,
      s.cardId,
    ]),
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('بيانات الطلبة')}!A1:F${values.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  return { spreadsheetUrl, spreadsheetId };
}

/**
 * مزامنة وحفظ سجل الطلبة المحدث (الاسم الثلاثي، القسم، المرحلة، نوع الدراسة، رقم الهاتف، رقم البطاقة) إلى Google Sheet
 */
export async function syncStudentRegistryToSheet(
  sheetUrl: string,
  students: StudentRecord[],
  defaultDepartment: string
): Promise<{ success: boolean; message: string }> {
  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  if (!spreadsheetId || sheetUrl.includes('1atu-demo-student-registry-2026')) {
    return {
      success: false,
      message: 'الجدول الحالي هو الجدول النموذجي المحلي. لمزامنته سحابياً، اضغط «إنشاء جدول طلبة في حسابي» أو اربط جدول Google Sheet خاصاً بك.',
    };
  }

  const token = getAccessToken();
  if (!token) {
    return {
      success: false,
      message: 'يرجى تسجيل الدخول بحساب Google في القائمة الجانبية أولاً للكتابة في Google Sheets.',
    };
  }

  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?IncludeGridData=false`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!metaRes.ok) {
      return {
        success: false,
        message: 'تعذر الوصول إلى جدول Google Sheet. تأكد من صلاحية التعديل على الجدول.',
      };
    }

    const metaData = await metaRes.json();
    const firstSheetTitle = metaData.sheets?.[0]?.properties?.title || 'Sheet1';

    // مسح النطاق القديم ثم كتابة البيانات المحدثة بالترتيب المعتمد: الاسم الثلاثي,القسم,المرحلة,نوع الدراسة,رقم الهاتف,رقم البطاقة
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(firstSheetTitle)}!A1:F2000:clear`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const values = [
      ['الاسم الثلاثي', 'القسم', 'المرحلة', 'نوع الدراسة', 'رقم الهاتف', 'رقم البطاقة'],
      ...students.map((s) => [
        safeCell(s.fullName, 150),
        safeCell(s.department || defaultDepartment, 150),
        safeCell(s.stage, 100),
        safeCell(s.studyType, 50),
        safeCell(s.phone, 50),
        safeCell(s.cardId, 100),
      ]),
    ];

    const putRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(firstSheetTitle)}!A1:F${values.length}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    if (!putRes.ok) {
      return {
        success: false,
        message: 'فشلت الكتابة في الجدول. تأكد من أن حسابك يمتلك صلاحية المحرر (Editor) على الجدول.',
      };
    }

    return {
      success: true,
      message: `تمت مزامنة وحفظ ${students.length} طالباً في ورقة "${firstSheetTitle}" بنجاح.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `حدث خطأ أثناء المزامنة: ${err?.message || 'خطأ غير معروف'}`,
    };
  }
}

/**
 * إنشاء الجدول الثاني الخاص بالنظام تلقائياً (ثلاث أوراق: الإعدادات، الإعلانات، الطلبات)
 */
export async function provisionSystemDatabaseSheet(
  departmentTitle: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string } | null> {
  const token = getAccessToken();
  if (!token) return null;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `قاعدة بيانات السكرتير الرقمي - ${departmentTitle}`,
      },
      sheets: [
        { properties: { title: 'الإعدادات', rightToLeft: true } },
        { properties: { title: 'الإعلانات', rightToLeft: true } },
        { properties: { title: 'الطلبات', rightToLeft: true } },
      ],
    }),
  });

  if (!createRes.ok) return null;
  const data = await createRes.json();
  const spreadsheetId = data.spreadsheetId;

  // تهيئة رؤوس ورقة الطلبات كما في الفقرة 8
  const requestHeaders = [
    ['رقم الطلب', 'التاريخ', 'اسم الطالب', 'المرحلة', 'الخدمة', 'رابط ملف PDF', 'الحالة'],
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('الطلبات')}!A1:G1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: requestHeaders }),
    }
  );

  return {
    spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
  };
}

/**
 * حفظ ملف PDF المُصدَّر في Google Drive وتوثيق الصف في ورقة الطلبات إن كان المسؤول متصلاً
 */
export async function uploadRequestPdfToDriveAndSheet(
  request: StudentRequestRecord,
  pdfBlob: Blob,
  systemSpreadsheetId?: string
): Promise<{ fileId?: string; webViewLink?: string }> {
  const token = getAccessToken();
  if (!token) return {};

  try {
    const datePart = request.createdAt.slice(0, 10);
    const fileName =
      request.serviceId === 'medical_referral'
        ? `${request.id}-medical-referral-${datePart}.pdf`
        : `${request.id}_${request.serviceTitle}_${datePart}.pdf`;
    const metadata = {
      name: fileName,
      mimeType: 'application/pdf',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', pdfBlob);

    const driveRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      }
    );

    let fileId: string | undefined;
    let webViewLink: string | undefined;

    if (driveRes.ok) {
      const driveData = await driveRes.json();
      fileId = driveData.id;
      webViewLink = driveData.webViewLink;
    }

    if (systemSpreadsheetId) {
      const serviceColLabel =
        request.serviceId === 'medical_referral' ? 'إحالة طبية' : request.serviceTitle;
      const rowValues = [
        [
          safeCell(request.id, 50),
          safeCell(request.createdAt, 50),
          safeCell(request.studentName, 150),
          safeCell(request.stage, 80),
          safeCell(serviceColLabel, 80),
          safeCell(webViewLink || 'محفوظ محلياً', 300),
          safeCell(request.status, 30),
        ],
      ];

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${systemSpreadsheetId}/values/${encodeURIComponent('الطلبات')}:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: rowValues }),
        }
      );
    }

    return { fileId, webViewLink };
  } catch (e) {
    console.error('Error syncing PDF to Drive/Sheet:', e);
    return {};
  }
}

/**
 * نقل ملف PDF إلى سلة المهملات في Google Drive عند حذفه من قبل المسؤول (بعد التأكيد)
 */
export async function moveDriveFileToTrash(fileId: string): Promise<boolean> {
  const token = getAccessToken();
  if (!token || !fileId) return false;

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trashed: true }),
  });

  return res.ok;
}

/**
 * رفع ملف قالب (.doc / .docx) وتحويله تلقائياً إلى مستند Google Docs في حساب المسؤول
 */
export async function uploadServiceTemplateToDrive(
  file: File,
  serviceTitle: string
): Promise<{ driveDocId?: string; driveWebViewLink?: string }> {
  const token = getAccessToken();
  if (!token) return {};

  try {
    const metadata = {
      name: `قالب السكرتير الرقمي - ${serviceTitle}`,
      mimeType: 'application/vnd.google-apps.document',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      }
    );

    if (!res.ok) return {};
    const data = await res.json();
    return {
      driveDocId: data.id,
      driveWebViewLink: data.webViewLink,
    };
  } catch (e) {
    console.error('Error uploading template to Drive:', e);
    return {};
  }
}
