import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || 'خطأ غير متوقع' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-6"
        >
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-4 shadow-sm">
            <h1 className="text-lg font-bold text-[#0F3D3E]">
              السكرتير الرقمي الأكاديمي
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              حدث خطأ عارض أثناء تحميل البيانات المحفوظة ({this.state.errorMessage}).
            </p>
            <button
              type="button"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-[#0F3D3E] text-white text-xs font-bold hover:bg-[#0b2d2e] cursor-pointer"
            >
              إعادة ضبط البيانات وتشغيل التطبيق
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);

