import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Shield,
  ArrowLeft,
  CalendarDays,
  FilePlus2,
  Star,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  AnnouncementItem,
  ServiceId,
  StudentRecord,
  StudentRequestRecord,
  SystemSettings,
} from './types';
import {
  DEFAULT_SYSTEM_SETTINGS,
  DIGITAL_SERVICES,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_REQUESTS,
  INITIAL_STUDENT_REGISTRY,
  ServiceDefinition,
} from './data/curriculumAndSeed';
import { SERVICE_ICONS, StudentServiceModal } from './components/StudentServiceModal';
import { AnnouncementDetailModal } from './components/AnnouncementDetailModal';
import { AnnouncementAlbum } from './components/AnnouncementAlbum';
import { AdminDashboard } from './components/AdminDashboard';
import { ClassScheduleView } from './components/ClassScheduleView';
import { initAuth, uploadRequestPdfToDriveAndSheet } from './services/googleWorkspace';

export default function App() {
  // View routing: 'student' (Main 3-layer student portal) | 'schedule' (Public class schedule) | 'admin' (3-section admin dashboard)
  const [currentView, setCurrentView] = useState<'student' | 'schedule' | 'admin'>('student');

  // Persistent System State
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('sec_settings_v1');
    return saved ? { ...DEFAULT_SYSTEM_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SYSTEM_SETTINGS;
  });

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(() => {
    const saved = localStorage.getItem('sec_announcements_v1');
    return saved ? JSON.parse(saved) : INITIAL_ANNOUNCEMENTS;
  });

  const [requests, setRequests] = useState<StudentRequestRecord[]>(() => {
    const saved = localStorage.getItem('sec_requests_v1');
    return saved ? JSON.parse(saved) : INITIAL_REQUESTS;
  });

  const [studentRegistry, setStudentRegistry] = useState<StudentRecord[]>(() => {
    const saved = localStorage.getItem('sec_students_v1');
    return saved ? JSON.parse(saved) : INITIAL_STUDENT_REGISTRY;
  });

  // Google Auth State for Admin
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Active modals in Student View
  const [selectedService, setSelectedService] = useState<ServiceDefinition | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);

  // Favorite / Popular Services chosen by the student (persisted in localStorage)
  const [favoriteServiceIds, setFavoriteServiceIds] = useState<ServiceId[]>(() => {
    try {
      const saved = localStorage.getItem('sec_favorite_services_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavoriteService = (serviceId: ServiceId, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setFavoriteServiceIds((prev) => {
      const next = prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId];
      localStorage.setItem('sec_favorite_services_v1', JSON.stringify(next));
      return next;
    });
  };

  const favoriteServices = DIGITAL_SERVICES.filter((s) =>
    favoriteServiceIds.includes(s.id)
  );

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setCurrentUser(user);
      },
      () => {
        setCurrentUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleUpdateSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    localStorage.setItem('sec_settings_v1', JSON.stringify(newSettings));
  };

  const handleUpdateAnnouncements = (newList: AnnouncementItem[]) => {
    setAnnouncements(newList);
    localStorage.setItem('sec_announcements_v1', JSON.stringify(newList));
  };

  const handleUpdateRequests = (newList: StudentRequestRecord[]) => {
    setRequests(newList);
    localStorage.setItem('sec_requests_v1', JSON.stringify(newList));
  };

  const handleUpdateStudentRegistry = (newRegistry: StudentRecord[]) => {
    setStudentRegistry(newRegistry);
    localStorage.setItem('sec_students_v1', JSON.stringify(newRegistry));
  };

  // Filter active announcements: Pinned announcements lead first in the unified album, followed by newest active announcements
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeAnnouncements = announcements
    .filter((a) => !a.isHidden && a.endDate >= todayStr)
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Handle new student request submission
  const handleStudentRequestSubmitted = async (
    newRequest: StudentRequestRecord,
    pdfBlob: Blob | null
  ) => {
    let driveMeta: { fileId?: string; webViewLink?: string } = {};
    if (pdfBlob) {
      driveMeta = await uploadRequestPdfToDriveAndSheet(
        newRequest,
        pdfBlob,
        settings.systemSpreadsheetId
      );
    }

    const enrichedRequest: StudentRequestRecord = {
      ...newRequest,
      driveFileId: driveMeta.fileId,
      driveWebViewLink: driveMeta.webViewLink,
    };

    const updated = [enrichedRequest, ...requests];
    handleUpdateRequests(updated);
  };

  const unreadRequestsCount = requests.filter((r) => !r.isDeleted && r.status === 'جديد').length;

  if (currentView === 'admin') {
    return (
      <AdminDashboard
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        announcements={announcements}
        onUpdateAnnouncements={handleUpdateAnnouncements}
        requests={requests}
        onUpdateRequests={handleUpdateRequests}
        studentRegistry={studentRegistry}
        onUpdateStudentRegistry={handleUpdateStudentRegistry}
        currentUser={currentUser}
        onAuthChange={(user) => setCurrentUser(user)}
        onBackToStudentView={() => setCurrentView('student')}
      />
    );
  }

  if (currentView === 'schedule') {
    return (
      <ClassScheduleView
        settings={settings}
        onBack={() => setCurrentView('student')}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]" dir="rtl">
      {/* LAYER 1: ACADEMIC INSTITUTION HEADER (Section 5) */}
      <header className="bg-[#0F3D3E] text-white border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Title */}
          <div className="flex items-center gap-3.5">
            {settings.logoDataUrl ? (
              <img
                src={settings.logoDataUrl}
                alt={settings.universityName}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-contain bg-white p-1 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                <GraduationCap className="w-6 h-6 text-emerald-200" />
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-xl font-bold font-display tracking-tight">
                {settings.departmentName}
              </h1>
              <p className="text-xs text-emerald-100/85">
                {settings.universityName} · {settings.collegeName}
              </p>
            </div>
          </div>

          {/* Zone 2 & 3: Action Icons (جدول الدروس & تقديم طلب لطالب) */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCurrentView('schedule')}
              title="جدول الدروس"
              aria-label="جدول الدروس"
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <CalendarDays className="w-5 h-5 text-emerald-200 shrink-0" />
              <span>جدول الدروس</span>
            </button>

            <a
              href="#services"
              title="تقديم طلب لطالب"
              aria-label="تقديم طلب لطالب"
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white text-[#0F3D3E] text-xs font-bold hover:bg-emerald-50 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 shadow-xs"
            >
              <FilePlus2 className="w-5 h-5 shrink-0" />
              <span>تقديم طلب لطالب</span>
            </a>
          </div>
        </div>
      </header>

      {/* MAIN STUDENT PORTAL BODY (Read from Top to Bottom: My Popular Services -> Unified Album -> 5 Digital Services) */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-12">
        {/* TOP SECTION: MY POPULAR / FAVORITE SERVICES (خدماتي الشائعة) */}
        {favoriteServices.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-display">
                    خدماتي الشائعة
                  </h2>
                  <p className="text-xs text-slate-500">
                    وصول سريع إلى المعاملات والخدمات التي أضفتها إلى مفضلتك
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg tabular-nums">
                {favoriteServices.length} مفضلة
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteServices.map((service) => (
                <div
                  key={`fav-${service.id}`}
                  onClick={() => setSelectedService(service)}
                  className="text-right bg-white rounded-2xl border border-amber-200/90 p-4 shadow-xs hover:border-[#0F3D3E]/70 hover:shadow-xl hover:shadow-[#0F3D3E]/10 hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 ease-out flex flex-col justify-between gap-4 group cursor-pointer"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl bg-[#0F3D3E]/8 border border-[#0F3D3E]/15 flex items-center justify-center group-hover:bg-[#0F3D3E] group-hover:text-white transition-all duration-300">
                        {SERVICE_ICONS[service.id]}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => toggleFavoriteService(service.id, e)}
                        className="min-h-[32px] px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="إزالة من المفضلة"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>في المفضلة</span>
                      </button>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 font-display group-hover:text-[#0F3D3E] transition-colors">
                      {service.title}
                    </h3>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 w-full flex items-center justify-between text-xs font-bold text-[#0F3D3E]">
                    <span>بدء المعاملة فوراً</span>
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1.5 transition-transform duration-300" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* LAYER 2: UNIFIED INTERACTIVE ANNOUNCEMENTS ALBUM */}
        <section id="announcements" className="space-y-5">
          <div className="flex items-baseline justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
                ألبوم الإعلانات والتبليغات الرسمية
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                التبليغات الصادرة من رئاسة القسم واللجنة الامتحانية للعام الدراسي {settings.curriculumYear}
              </p>
            </div>
            <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
              {activeAnnouncements.length} في الألبوم
            </span>
          </div>

          <AnnouncementAlbum
            announcements={activeAnnouncements}
            transitionStyle={settings.announcementTransition || 'album_stack'}
            intervalSec={settings.announcementIntervalSec || 6}
            onSelectAnnouncement={(ann) => setSelectedAnnouncement(ann)}
          />
        </section>

        {/* LAYER 3: THE FIVE DIGITAL SERVICES GRID (Section 5 & Section 7) */}
        <section id="services" className="space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
              الخدمات والمعاملات الرقمية للطلبة
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              اختر الخدمة المطلوبة وأدخل رقم هاتفك أو رقم بطاقتك الجامعية فقط لجلب بياناتك وتقديم الطلب في دقيقة واحدة دون حساب.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DIGITAL_SERVICES.map((service) => {
              const isFavorite = favoriteServiceIds.includes(service.id);
              return (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className="text-right bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-[#0F3D3E]/70 hover:shadow-xl hover:shadow-[#0F3D3E]/10 hover:-translate-y-1.5 hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 ease-out flex flex-col justify-between gap-5 group min-h-[180px] cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-12 h-12 rounded-xl bg-[#0F3D3E]/8 border border-[#0F3D3E]/15 flex items-center justify-center group-hover:bg-[#0F3D3E] group-hover:text-white group-hover:scale-110 transition-all duration-300">
                        {SERVICE_ICONS[service.id]}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => toggleFavoriteService(service.id, e)}
                          className={`min-h-[34px] px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isFavorite
                              ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-800'
                          }`}
                          title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                        >
                          <Star
                            className={`w-3.5 h-3.5 transition-transform ${
                              isFavorite
                                ? 'fill-amber-500 text-amber-500 scale-110'
                                : 'text-slate-400'
                            }`}
                          />
                          <span>{isFavorite ? 'في المفضلة' : 'إضافة إلى المفضلة'}</span>
                        </button>

                        <span className="text-xs font-mono text-slate-400 group-hover:text-[#0F3D3E]/70 transition-colors tabular-nums">
                          {service.number}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 font-display group-hover:text-[#0F3D3E] transition-colors">
                      {service.title}
                    </h3>

                    <p className="text-sm text-slate-600 leading-relaxed">
                      {service.shortDescription}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 group-hover:border-[#0F3D3E]/15 w-full flex items-center justify-between text-xs font-bold text-[#0F3D3E] transition-colors">
                    <span>بدء المعاملة والتحقق</span>
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1.5 transition-transform duration-300" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* QUIET INSTITUTIONAL FOOTER WITH ADMIN ENTRY LINK (Section 3: المسؤول يدخل من رابط صغير في أسفلها) */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span>{settings.universityName}</span>
            <span className="mx-1.5">·</span>
            <span>{settings.collegeName}</span>
            <span className="mx-1.5">·</span>
            <span>{settings.departmentName}</span>
          </div>

          <button
            type="button"
            onClick={() => setCurrentView('admin')}
            className="min-h-[40px] px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-[#0F3D3E] hover:bg-slate-100 transition-colors flex items-center gap-1.5 font-semibold"
          >
            <Shield className="w-3.5 h-3.5 text-[#0F3D3E]" />
            <span>دخول مسؤول النظام (الشعبة الإدارية)</span>
            {unreadRequestsCount > 0 && (
              <span className="tabular-nums text-[#B45309] font-bold">
                ({unreadRequestsCount})
              </span>
            )}
          </button>
        </div>
      </footer>

      {/* STUDENT 7-STEP SERVICE MODAL */}
      {selectedService && (
        <StudentServiceModal
          service={selectedService}
          settings={settings}
          studentRegistry={studentRegistry}
          existingRequests={requests}
          onClose={() => setSelectedService(null)}
          onSubmitSuccess={handleStudentRequestSubmitted}
        />
      )}

      {/* ANNOUNCEMENT FULL DETAIL MODAL */}
      {selectedAnnouncement && (
        <AnnouncementDetailModal
          announcement={selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
        />
      )}
    </div>
  );
}
