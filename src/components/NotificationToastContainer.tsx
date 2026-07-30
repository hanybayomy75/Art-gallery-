import React, { useState, useEffect } from 'react';
import { TOAST_EVENT, ToastMessage } from '../lib/notifications';
import { Heart, MessageSquare, Star, Sparkles, X } from 'lucide-react';

export const NotificationToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastMessage>;
      if (customEvent.detail) {
        const newToast = customEvent.detail;
        setToasts((prev) => [newToast, ...prev].slice(0, 4));

        // Auto remove after 4 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, 4000);
      }
    };

    window.addEventListener(TOAST_EVENT, handleToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 right-5 sm:left-auto sm:right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        let icon = <Sparkles className="w-5 h-5 text-amber-500" />;
        let borderColor = 'border-amber-500/30';
        let bgGradient = 'from-amber-500/10 to-amber-500/5';

        if (toast.type === 'like') {
          icon = <Heart className="w-5 h-5 fill-rose-500 text-rose-500 animate-bounce" />;
          borderColor = 'border-rose-500/40';
          bgGradient = 'from-rose-500/15 to-rose-500/5';
        } else if (toast.type === 'comment') {
          icon = <MessageSquare className="w-5 h-5 text-blue-500 fill-blue-500/20" />;
          borderColor = 'border-blue-500/40';
          bgGradient = 'from-blue-500/15 to-blue-500/5';
        } else if (toast.type === 'rating') {
          icon = <Star className="w-5 h-5 fill-amber-400 text-amber-400 animate-spin-slow" />;
          borderColor = 'border-amber-400/40';
          bgGradient = 'from-amber-400/15 to-amber-400/5';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl bg-[var(--bg-card)]/95 backdrop-blur-xl border ${borderColor} bg-gradient-to-r ${bgGradient} shadow-2xl shadow-black/10 transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in flex items-start gap-3 text-slate-900 dark:text-white`}
          >
            <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 shadow-sm shrink-0">
              {icon}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-xs font-bold font-serif text-slate-900 dark:text-white flex items-center justify-between gap-1">
                <span>{toast.title}</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                {toast.message}
              </p>
              {toast.artTitle && (
                <span className="inline-block mt-1 text-[11px] font-semibold text-[var(--color-primary)] truncate max-w-full">
                  🖼️ {toast.artTitle}
                </span>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
