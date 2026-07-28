import { ThemePreset, ThemeMode } from '../types';

export interface ThemeConfig {
  id: ThemePreset;
  name: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  bgLight: string;
  bgDark: string;
  cardLight: string;
  cardDark: string;
  borderLight: string;
  borderDark: string;
  previewGradient: string;
}

export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: 'classic',
    name: 'كلاسيكي (معرض دافئ)',
    description: 'طابع كلاسيكي بألوان الخشب الدافئ والذهب العتيق واللمسات الفنية',
    primaryColor: '#b45309',
    accentColor: '#d97706',
    bgLight: '#fdfbf7',
    bgDark: '#1c1917',
    cardLight: '#ffffff',
    cardDark: '#262626',
    borderLight: '#f3f0e6',
    borderDark: '#404040',
    previewGradient: 'from-amber-700 via-amber-600 to-amber-900',
  },
  {
    id: 'modern',
    name: 'عصري (مودرن أنيق)',
    description: 'تصميم حديث ونظيف بدرجات النيلي والرمادي الفاخر',
    primaryColor: '#4f46e5',
    accentColor: '#6366f1',
    bgLight: '#f8fafc',
    bgDark: '#0f172a',
    cardLight: '#ffffff',
    cardDark: '#1e293b',
    borderLight: '#e2e8f0',
    borderDark: '#334155',
    previewGradient: 'from-indigo-600 via-indigo-500 to-slate-800',
  },
  {
    id: 'dark_art',
    name: 'داكن فني (معرض ليلى)',
    description: 'أجواء المعارض الفنية الليلية مع تركيز الإضاءة على اللوحات',
    primaryColor: '#f43f5e',
    accentColor: '#fb7185',
    bgLight: '#f1f5f9',
    bgDark: '#090d16',
    cardLight: '#ffffff',
    cardDark: '#131b2e',
    borderLight: '#cbd5e1',
    borderDark: '#1e293b',
    previewGradient: 'from-rose-600 via-slate-900 to-black',
  },
  {
    id: 'watercolor',
    name: 'ألوان مائية (باستيل هادئ)',
    description: 'تدرجات ناعمة مستوحاة من الرسم بالألوان المائية والرقيقة',
    primaryColor: '#0d9488',
    accentColor: '#14b8a6',
    bgLight: '#f0fdfa',
    bgDark: '#062c26',
    cardLight: '#ffffff',
    cardDark: '#0f3d36',
    borderLight: '#ccfbf1',
    borderDark: '#115e59',
    previewGradient: 'from-teal-600 via-cyan-500 to-emerald-700',
  },
  {
    id: 'white_gallery',
    name: 'معرض أبيض (مينيملست)',
    description: 'بساطة مطلقة مع تباين عالي يُبرز ألوان اللوحات فقط',
    primaryColor: '#18181b',
    accentColor: '#27272a',
    bgLight: '#ffffff',
    bgDark: '#121212',
    cardLight: '#fafafa',
    cardDark: '#1e1e1e',
    borderLight: '#e4e4e7',
    borderDark: '#27272a',
    previewGradient: 'from-zinc-900 via-zinc-700 to-zinc-400',
  },
];

export function applyThemeToDocument(preset: ThemePreset, mode: ThemeMode) {
  const root = document.documentElement;
  
  // Resolve mode
  let isDark = false;
  if (mode === 'dark') {
    isDark = true;
  } else if (mode === 'light') {
    isDark = false;
  } else {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  const selectedPreset = THEME_PRESETS.find((p) => p.id === preset) || THEME_PRESETS[0];

  root.style.setProperty('--color-primary', selectedPreset.primaryColor);
  root.style.setProperty('--color-accent', selectedPreset.accentColor);
  root.style.setProperty('--bg-app', isDark ? selectedPreset.bgDark : selectedPreset.bgLight);
  root.style.setProperty('--bg-card', isDark ? selectedPreset.cardDark : selectedPreset.cardLight);
  root.style.setProperty('--border-card', isDark ? selectedPreset.borderDark : selectedPreset.borderLight);

  root.setAttribute('data-theme-preset', preset);
}
