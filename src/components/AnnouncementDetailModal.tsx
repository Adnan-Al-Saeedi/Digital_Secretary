import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Calendar, Sparkles } from 'lucide-react';
import { AnnouncementItem } from '../types';
import { formatArabicDate, isRecentWithin24Hours } from '../utils/arabicNormalize';

interface AnnouncementDetailModalProps {
  announcement: AnnouncementItem;
  onClose: () => void;
}

export const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({
  announcement,
  onClose,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});

  const images = announcement.images || [];
  const hasMultipleImages = images.length > 1;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
            <Calendar className="w-4 h-4 text-[#0F3D3E]" />
            <span>تاريخ النشر: {formatArabicDate(announcement.createdAt)}</span>
            {isRecentWithin24Hours(announcement.createdAt) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-orange-500 text-white text-[11px] font-bold shadow-xs">
                <Sparkles className="w-3 h-3" />
                <span>إعلان جديد (خلال 24 ساعة)</span>
              </span>
            )}
            {announcement.isPinned && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#B45309]">إعلان مثبّت</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
            aria-label="إغلاق الإعلان"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Image Gallery (16:9) */}
          {images.length > 0 && (
            <div className="space-y-3">
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                {!imgError[activeImageIndex] ? (
                  <img
                    src={images[activeImageIndex]}
                    alt={announcement.title}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setImgError((prev) => ({ ...prev, [activeImageIndex]: true }))
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#0F3D3E] to-slate-800 flex items-center justify-center p-6 text-center text-white">
                    <p className="font-display font-bold text-base">{announcement.title}</p>
                  </div>
                )}

                {hasMultipleImages && (
                  <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIndex((prev) =>
                          prev === 0 ? images.length - 1 : prev - 1
                        )
                      }
                      className="pointer-events-auto min-h-[44px] min-w-[44px] rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                      aria-label="الصورة السابقة"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIndex((prev) =>
                          prev === images.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="pointer-events-auto min-h-[44px] min-w-[44px] rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                      aria-label="الصورة التالية"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {hasMultipleImages && (
                <div className="flex items-center justify-center gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === activeImageIndex
                          ? 'w-6 bg-[#0F3D3E]'
                          : 'w-2 bg-slate-300 hover:bg-slate-400'
                      }`}
                      aria-label={`صورة ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Title & Full Text */}
          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display leading-snug">
              {announcement.title}
            </h2>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>صالح لغاية: {formatArabicDate(announcement.endDate)}</span>
            </div>
            <div className="pt-2 border-t border-slate-100 text-base text-slate-800 whitespace-pre-line leading-relaxed">
              {announcement.content}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 rounded-xl bg-[#0F3D3E] text-white text-sm font-semibold hover:bg-[#0b2d2e] transition-colors whitespace-nowrap"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
