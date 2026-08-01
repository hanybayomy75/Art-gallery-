import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ContactModal } from './ContactModal';
import { NotificationCenter } from './NotificationCenter';
import { THEME_PRESETS } from '../lib/theme';
import { 
  Palette, 
  Upload, 
  User, 
  LogOut, 
  ShieldAlert, 
  Menu, 
  X, 
  Sparkles, 
  Home,
  Sun,
  Moon,
  Monitor,
  Mail,
  PhoneCall,
  Check,
  ChevronLeft,
  Crown
} from 'lucide-react';

interface NavbarProps {
  onOpenSearch?: () => void;
  activeView: 'home' | 'profile' | 'admin';
  setActiveView: (view: 'home' | 'profile' | 'admin') => void;
  onSelectCategory?: (category: string) => void;
  selectedCategory?: string;
  onSelectArtwork?: (artId: string, fallbackNotif?: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeView, setActiveView, onSelectCategory, selectedCategory, onSelectArtwork }) => {

  const { 
    user, 
    userProfile, 
    setIsAuthModalOpen, 
    setIsUploadModalOpen, 
    setIsThemeModalOpen, 
    themePreset,
    setThemePreset,
    themeMode,
    setThemeMode,
    logout,
    requireAuth
  } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const handleUploadClick = () => {
    requireAuth('يرجى تسجيل الدخول لنشر عملك الفني في المعرض', () => {
      setIsUploadModalOpen(true);
    });
  };

  const isOwnerEmail = user?.email?.toLowerCase() === 'hany.bayomy75@gmail.com';
  const isStaff = isOwnerEmail || userProfile?.role === 'owner' || userProfile?.role === 'admin';

  return (
    <>
      <header className="sticky top-0 z-40 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border-card)] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Right Group: Sidebar Toggle & Brand */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2 shadow-sm"
                title="افتح القائمة الجانبية"
              >
                <Menu className="w-5 h-5 text-[var(--color-primary)]" />
                <span className="hidden sm:inline text-xs font-bold">القائمة</span>
              </button>

              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('home')}>
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-accent)] p-0.5 shadow-md flex items-center justify-center">
                  <div className="w-full h-full bg-[var(--bg-card)] rounded-[14px] flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-[var(--color-primary)]" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 font-serif">
                    معرض الفنون
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">المنصة العربية الفنية الأولى</p>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveView('home');
                  onSelectCategory?.('الكل');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeView === 'home'
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Home className="w-4 h-4" />
                الرئيسية والجاليري
              </button>

              {user && (
                <button
                  onClick={() => setActiveView('profile')}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                    activeView === 'profile'
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <User className="w-4 h-4" />
                  حسابي وأعمالي
                </button>
              )}

              {isStaff && (
                <button
                  onClick={() => setActiveView('admin')}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                    activeView === 'admin'
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  لوحة الإدارة
                  {userProfile?.role === 'owner' && (
                    <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-sans">المالك</span>
                  )}
                </button>
              )}

              <button
                onClick={() => setIsContactOpen(true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Mail className="w-4 h-4 text-[var(--color-primary)]" />
                اتصل بنا
              </button>
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">
              {/* Notification Center */}
              <NotificationCenter onSelectArtwork={onSelectArtwork} />

              {/* Add Artwork CTA */}
              <button
                onClick={handleUploadClick}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white text-sm font-bold shadow-md hover:shadow-lg hover:opacity-95 transition-all flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">أضف عملك الفني</span>
              </button>


              {/* User Profile / Auth */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1.5 sm:pr-3 rounded-2xl border border-[var(--border-card)] hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
                  >
                    {userProfile?.photoURL ? (
                      <img
                        src={userProfile.photoURL}
                        alt={userProfile.displayName}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-[var(--color-primary)]/30"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold flex items-center justify-center text-sm">
                        {userProfile?.artistName?.[0] || 'ف'}
                      </div>
                    )}
                    <span className="hidden sm:inline text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[100px] truncate">
                      {userProfile?.artistName || userProfile?.displayName}
                    </span>
                  </button>

                  {/* User Dropdown */}
                  {isUserMenuOpen && (
                    <div className="absolute left-0 mt-2 w-56 bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-card)] p-2 z-50 animate-in fade-in slide-in-from-top-2 text-right">
                      <div className="px-3 py-2 border-b border-[var(--border-card)] mb-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {userProfile?.artistName || userProfile?.displayName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{userProfile?.email}</p>
                      </div>

                      <button
                        onClick={() => {
                          setActiveView('profile');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                      >
                        <User className="w-4 h-4 text-[var(--color-primary)]" />
                        حسابي وأعمالي
                      </button>

                      {isStaff && (
                        <button
                          onClick={() => {
                            setActiveView('admin');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-right px-3 py-2 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-2"
                        >
                          <ShieldAlert className="w-4 h-4" />
                          لوحة الإدارة
                        </button>
                      )}

                      <div className="border-t border-[var(--border-card)] my-1" />

                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        تسجيل الخروج
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-bold hover:bg-[var(--color-primary)]/10 transition-all"
                >
                  تسجيل الدخول
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Full Sidebar Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div 
            onClick={() => setIsSidebarOpen(false)} 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          />

          {/* Drawer Content */}
          <div className="relative w-80 max-w-[85vw] bg-[var(--bg-card)] border-l border-[var(--border-card)] shadow-2xl flex flex-col justify-between h-full z-10 text-right animate-in slide-in-from-right duration-200 p-6 overflow-y-auto">
            
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="font-bold font-serif text-slate-900 dark:text-white text-lg">قائمة المعرض</span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Day / Night Mode Toggle Options */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  وضع الإضاءة (نهاري / ليلي)
                </label>
                <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl">
                  <button
                    onClick={() => setThemeMode('light')}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      themeMode === 'light'
                        ? 'bg-[var(--bg-card)] text-[var(--color-primary)] shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    نهاري
                  </button>

                  <button
                    onClick={() => setThemeMode('dark')}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      themeMode === 'dark'
                        ? 'bg-[var(--bg-card)] text-[var(--color-primary)] shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    ليلي
                  </button>

                  <button
                    onClick={() => setThemeMode('auto')}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      themeMode === 'auto'
                        ? 'bg-[var(--bg-card)] text-[var(--color-primary)] shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    تلقائي
                  </button>
                </div>
              </div>

              {/* Theme Presets List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Palette className="w-4 h-4 text-[var(--color-primary)]" />
                    تغيير ثيمات الموقع
                  </label>
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      setIsThemeModalOpen(true);
                    }}
                    className="text-[11px] text-[var(--color-primary)] font-bold hover:underline"
                  >
                    المزيد
                  </button>
                </div>

                <div className="space-y-1.5">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected = themePreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => setThemePreset(preset.id)}
                        className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 font-bold text-slate-900 dark:text-white'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded-lg bg-gradient-to-tr ${preset.previewGradient}`} />
                          <span className="text-xs">{preset.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[var(--color-primary)]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Links in Drawer */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-card)]">
                <button
                  onClick={() => {
                    setActiveView('home');
                    onSelectCategory?.('الكل');
                    setIsSidebarOpen(false);
                  }}
                  className="w-full text-right p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-bold flex items-center gap-2"
                >
                  <Home className="w-4 h-4 text-[var(--color-primary)]" />
                  الرئيسية والجاليري
                </button>

                {user && (
                  <button
                    onClick={() => {
                      setActiveView('profile');
                      setIsSidebarOpen(false);
                    }}
                    className="w-full text-right p-3 rounded-2xl text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2"
                  >
                    <User className="w-4 h-4 text-[var(--color-primary)]" />
                    حسابي وأعمالي
                  </button>
                )}

                {isStaff && (
                  <button
                    onClick={() => {
                      setActiveView('admin');
                      setIsSidebarOpen(false);
                    }}
                    className="w-full text-right p-3 rounded-2xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-bold flex items-center gap-2"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    لوحة الإدارة
                  </button>
                )}

                {/* Contact Us Action Button */}
                <button
                  onClick={() => {
                    setIsSidebarOpen(false);
                    setIsContactOpen(true);
                  }}
                  className="w-full text-right p-3 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>اتصل بنا (تواصل مع المنشئ)</span>
                  </div>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Sidebar Footer with Developer Credits */}
            <div className="pt-6 border-t border-[var(--border-card)] text-center space-y-1.5">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                إعداد المهندس هاني بيومي
              </p>
              <p className="font-mono text-sm font-bold text-[var(--color-primary)] dir-ltr">
                01276502639
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Contact Modal */}
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </>
  );
};
