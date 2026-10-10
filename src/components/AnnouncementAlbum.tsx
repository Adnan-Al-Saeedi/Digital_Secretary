import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ArrowLeft,
  Pause,
  Play,
  Images,
  Sparkles,
} from 'lucide-react';
import { AnnouncementItem, AnnouncementTransitionStyle } from '../types';
import { formatArabicDate, isRecentWithin24Hours } from '../utils/arabicNormalize';

interface AnnouncementAlbumProps {
  announcements: AnnouncementItem[];
  transitionStyle: AnnouncementTransitionStyle;
  intervalSec: number;
  onSelectAnnouncement: (ann: AnnouncementItem) => void;
}

export const TRANSITION_LABELS: Record<
  AnnouncementTransitionStyle,
  { title: string; description: string }
> = {
  album_stack: {
    title: 'ألبوم البطاقات المتراكبة',
    description: 'حركة تراكب ثلاثية الأبعاد تحاكي تقليب ألبوم الصور الفوتوغرافية.',
  },
  fade_zoom: {
    title: 'تلاشي سينمائي مع تقريب هادئ',
    description: 'انتقال ناعم مع تقريب تدريجي للصورة يمنح فخامة بصرية.',
  },
  slide_smooth: {
    title: 'انزلاق أفقي انسيابي',
    description: 'سحب متتابع وسلس بين شرائح الألبوم مع استجابة مرنة.',
  },
  flip_3d: {
    title: 'طي الصفحة ثلاثي الأبعاد',
    description: 'تأثير دوران منظور ثلاثي الأبعاد يحاكي تقليب صفحات المجلة.',
  },
};

export const AnnouncementAlbum: React.FC<AnnouncementAlbumProps> = ({
  announcements,
  transitionStyle = 'album_stack',
  intervalSec = 6,
  onSelectAnnouncement,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState(0);

  const count = announcements.length;
  const safeIndex = count > 0 ? activeIndex % count : 0;
  const current = announcements[safeIndex];

  // Auto-advance timer with smooth progress indicator
  useEffect(() => {
    if (count <= 1 || isPaused) {
      setProgress(0);
      return;
    }

    const stepMs = 50;
    const totalMs = Math.max(3, intervalSec) * 1000;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += stepMs;
      setProgress(Math.min(100, (elapsed / totalMs) * 100));
      if (elapsed >= totalMs) {
        setDirection(1);
        setActiveIndex((prev) => (prev + 1) % count);
        elapsed = 0;
        setProgress(0);
      }
    }, stepMs);

    return () => clearInterval(timer);
  }, [count, intervalSec, isPaused, safeIndex]);

  if (count === 0 || !current) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        لا توجد إعلانات نشطة حالياً.
      </div>
    );
  }

  const handleNext = () => {
    setDirection(1);
    setProgress(0);
    setActiveIndex((prev) => (prev + 1) % count);
  };

  const handlePrev = () => {
    setDirection(-1);
    setProgress(0);
    setActiveIndex((prev) => (prev - 1 + count) % count);
  };

  const handleSelectSlide = (idx: number) => {
    setDirection(idx > safeIndex ? 1 : -1);
    setProgress(0);
    setActiveIndex(idx);
  };

  // Animation variants according to admin-configured transitionStyle
  const getVariants = () => {
    switch (transitionStyle) {
      case 'fade_zoom':
        return {
          enter: { opacity: 0, scale: 1.06 },
          center: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.96 },
        };
      case 'slide_smooth':
        return {
          enter: (dir: number) => ({
            opacity: 0,
            x: dir > 0 ? -90 : 90,
          }),
          center: { opacity: 1, x: 0 },
          exit: (dir: number) => ({
            opacity: 0,
            x: dir > 0 ? 90 : -90,
          }),
        };
      case 'flip_3d':
        return {
          enter: (dir: number) => ({
            opacity: 0,
            rotateY: dir > 0 ? -25 : 25,
            scale: 0.94,
          }),
          center: { opacity: 1, rotateY: 0, scale: 1 },
          exit: (dir: number) => ({
            opacity: 0,
            rotateY: dir > 0 ? 25 : -25,
            scale: 0.94,
          }),
        };
      case 'album_stack':
      default:
        return {
          enter: (dir: number) => ({
            opacity: 0,
            y: dir > 0 ? 28 : -28,
            scale: 0.93,
          }),
          center: { opacity: 1, y: 0, scale: 1 },
          exit: (dir: number) => ({
            opacity: 0,
            y: dir > 0 ? -24 : 24,
            scale: 0.95,
          }),
        };
    }
  };

  const variants = getVariants();

  return (
    <div
      className="space-y-4 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Album Outer Stage with subtle stacked layers behind */}
      <div className="relative pt-2 pb-1">
        {/* Decorative stacked album back-cards when more than 1 announcement */}
        {count > 1 && (
          <>
            <div
              aria-hidden="true"
              className="hidden sm:block absolute inset-x-8 -bottom-2.5 h-8 rounded-3xl bg-slate-200/70 border border-slate-300/60 -z-20 transition-transform"
            />
            <div
              aria-hidden="true"
              className="hidden sm:block absolute inset-x-4 -bottom-1.5 h-8 rounded-3xl bg-slate-100 border border-slate-200 -z-10 transition-transform"
            />
          </>
        )}

        <div
          className="relative bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
          style={{ perspective: '1200px' }}
        >
          {/* Auto-play top progress bar */}
          {count > 1 && (
            <div className="h-1 w-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-[#0F3D3E] transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.45,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="grid grid-cols-1 lg:grid-cols-12"
            >
              {/* Album Visual Frame (16:9) */}
              <div
                onClick={() => onSelectAnnouncement(current)}
                className="lg:col-span-7 aspect-video relative bg-slate-900 cursor-pointer overflow-hidden group"
              >
                {current.images[0] && !brokenImages[current.id] ? (
                  <img
                    src={current.images[0]}
                    alt={current.title}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setBrokenImages((prev) => ({ ...prev, [current.id]: true }))
                    }
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#0F3D3E] to-slate-800 flex items-center justify-center p-8 text-white text-center">
                    <p className="text-lg font-bold font-display">{current.title}</p>
                  </div>
                )}

                {/* Subtle Gradient Scrim for Legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                {/* Top Album Counter, Orange New Badge (< 24h) & Multi-photo Indicator */}
                <div className="absolute top-3.5 right-3.5 left-3.5 flex items-center justify-between text-xs text-white/95 pointer-events-none">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="bg-black/45 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2">
                      <span className="tabular-nums font-semibold">
                        {safeIndex + 1} / {count}
                      </span>
                      {current.isPinned && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-300 font-bold">إعلان مثبّت</span>
                        </>
                      )}
                    </div>

                    {isRecentWithin24Hours(current.createdAt) && (
                      <div className="bg-orange-500 text-white px-3 py-1.5 rounded-xl font-bold shadow-md shadow-orange-950/30 flex items-center gap-1.5 border border-orange-300/40">
                        <Sparkles className="w-3.5 h-3.5 text-orange-100" />
                        <span>جديد (أقل من 24 ساعة)</span>
                      </div>
                    )}
                  </div>

                  {current.images.length > 1 && (
                    <div className="bg-black/45 backdrop-blur-md px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Images className="w-3.5 h-3.5 text-emerald-300" />
                      <span className="tabular-nums">{current.images.length} صور</span>
                    </div>
                  )}
                </div>

                {/* Mobile Overlay Title */}
                <div className="absolute bottom-3.5 right-4 left-4 sm:hidden text-white">
                  <p className="text-[11px] text-white/80 mb-0.5">
                    {formatArabicDate(current.createdAt)}
                  </p>
                  <h3 className="font-bold font-display text-base line-clamp-2 leading-snug">
                    {current.title}
                  </h3>
                </div>
              </div>

              {/* Album Editorial Story Panel */}
              <div className="lg:col-span-5 p-5 sm:p-7 flex flex-col justify-between space-y-5 bg-white">
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#0F3D3E]" />
                        <span>{formatArabicDate(current.createdAt)}</span>
                      </div>
                      {isRecentWithin24Hours(current.createdAt) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500 text-white text-[11px] font-bold shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <span>جديد</span>
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400">
                      نهاية العرض: {formatArabicDate(current.endDate)}
                    </span>
                  </div>

                  <h3
                    onClick={() => onSelectAnnouncement(current)}
                    className="hidden sm:block text-lg sm:text-xl font-bold text-slate-900 font-display leading-snug hover:text-[#0F3D3E] cursor-pointer transition-colors line-clamp-2"
                  >
                    {current.title}
                  </h3>

                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {current.summary || current.content}
                  </p>
                </div>

                {/* Action & Album Navigation Controls */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectAnnouncement(current)}
                    className="min-h-[44px] px-4 rounded-xl bg-[#0F3D3E] text-white text-xs font-bold hover:bg-[#0b2d2e] transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <span>فتح تفاصيل الإعلان</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>

                  {count > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handlePrev}
                        className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
                        aria-label="الإعلان السابق"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsPaused((p) => !p)}
                        className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                        aria-label={isPaused ? 'تشغيل التنقل التلقائي' : 'إيقاف التنقل التلقائي'}
                        title={isPaused ? 'تشغيل التنقل التلقائي' : 'إيقاف مؤقت'}
                      >
                        {isPaused ? (
                          <Play className="w-4 h-4 text-[#0F3D3E]" />
                        ) : (
                          <Pause className="w-4 h-4 text-slate-600" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleNext}
                        className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
                        aria-label="الإعلان التالي"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Album Filmstrip Thumbnails Bar (Replaces any long vertical announcement list) */}
      {count > 1 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-2">
          {announcements.map((ann, idx) => {
            const isActive = idx === safeIndex;
            const isNew = isRecentWithin24Hours(ann.createdAt);
            return (
              <button
                key={ann.id}
                type="button"
                onClick={() => handleSelectSlide(idx)}
                className={`group relative flex items-center gap-2.5 p-1.5 rounded-2xl border text-right transition-all shrink-0 max-w-[240px] cursor-pointer ${
                  isActive
                    ? 'border-[#0F3D3E] bg-[#0F3D3E]/5 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 opacity-75 hover:opacity-100'
                }`}
              >
                {isNew && (
                  <span className="absolute -top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-orange-500 text-white text-[10px] font-bold shadow-xs">
                    جديد
                  </span>
                )}
                <div className="w-14 aspect-video rounded-xl overflow-hidden bg-slate-200 shrink-0">
                  {ann.images[0] && !brokenImages[ann.id] ? (
                    <img
                      src={ann.images[0]}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#0F3D3E]" />
                  )}
                </div>
                <div className="pr-1 pl-2 overflow-hidden">
                  <p
                    className={`text-xs font-bold truncate font-display ${
                      isActive ? 'text-[#0F3D3E]' : 'text-slate-800'
                    }`}
                  >
                    {ann.title}
                  </p>
                  <span className="text-[10px] text-slate-500 block tabular-nums">
                    {ann.isPinned ? 'مثبّت · ' : ''}إعلان {idx + 1}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
