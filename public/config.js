/**
 * ملف إعدادات السكرتير الرقمي (config.js)
 * يدعم التشغيل على GitHub Pages وربط واجهة التطبيق بخادم Google Apps Script (Web App URL) إن وجد،
 * كما يسمح للتطبيق بالعمل مباشرة بالوضع المستقل (Standalone / Google Workspace OAuth).
 */
window.CONFIG = window.CONFIG || {
  // ضع رابط نشر Google Apps Script Web App هنا (ينتهي بـ /exec) أو اتركه كما هو ليعمل التطبيق مباشرة
  API_URL: "https://script.google.com/macros/s/AKfycbx-digital-secretary-academic-portal/exec",
  GAS_WEB_APP_URL: "https://script.google.com/macros/s/AKfycbx-digital-secretary-academic-portal/exec",
  SERVER_URL: "https://script.google.com/macros/s/AKfycbx-digital-secretary-academic-portal/exec",
  APP_NAME: "السكرتير الرقمي الأكاديمي",
  UNIVERSITY: "جامعة الفرات الأوسط التقنية",
  COLLEGE: "كلية البوليتكنك - بابل",
  DEPARTMENT: "هندسة تقنيات تكنولوجيا المعلومات",
  STANDALONE_MODE: true
};

const CONFIG = window.CONFIG;
