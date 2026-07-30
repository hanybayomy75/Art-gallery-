import React from 'react';
import { useAuth } from '../context/AuthContext';
import { THEME_PRESETS } from '../lib/theme';
import { ThemePreset, ThemeMode } from '../types';
import { X, Palette, Sun, Moon, Monitor, Check } from 'lucide-react';

export const ThemeSettingsModal: React.FC = () => {
  const { 
    isThemeModalOpen, 
    setIsThemeModalOpen, 
    themePreset, 
    themeMode, 
    setThemePreset, 
    setThemeMode 
  } = useAuth();

  if (!isThemeModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-3xl shadow-2xl border border-[var(--border-card)] p-5 sm:p-8 text-right my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Close Button */}
        <button
          onClick={() => setIsThemeModalOpen(false)}
          className="absolute top-5 left-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">تخصيص مظهر المعرض</h2>
            <p className="text-xs text-slate-500">اختر القالب الفني ونمط الإضاءة المناسب لعينيك</p>
          </div>
        </div>

        {/* Mode Selector (Light, Dark, Auto) */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            وضع الإضاءة (النهاري / الليلي)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setThemeMode('light')}
              className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                themeMode === 'light'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Sun className="w-4 h-4" />
              نهاري
            </button>

            <button
              onClick={() => setThemeMode('dark')}
              className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                themeMode === 'dark'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Moon className="w-4 h-4" />
              ليلي
            </button>

            <button
              onClick={() => setThemeMode('auto')}
              className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                themeMode === 'auto'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Monitor className="w-4 h-4" />
              تلقائي
            </button>
          </div>
        </div>

        {/* Theme Presets List */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            القوالب الفنية الجاهزة
          </label>
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {THEME_PRESETS.map((preset) => {
              const isSelected = themePreset === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => setThemePreset(preset.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${preset.previewGradient} shadow-sm shrink-0`} />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white font-serif">
                        {preset.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {preset.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Done CTA */}
        <button
          onClick={() => setIsThemeModalOpen(false)}
          className="w-full mt-6 py-3 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold text-sm shadow-md"
        >
          تم وتطبيق المظهر
        </button>

      </div>
    </div>
  );
};
