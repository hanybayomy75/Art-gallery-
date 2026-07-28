import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Upload, Sparkles, Image, Palette, Compass } from 'lucide-react';

interface HeroSectionProps {
  onExploreClick: () => void;
  stats: {
    totalWorks: number;
    totalLikes: number;
    totalCategories: number;
  };
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onExploreClick, stats }) => {
  const { requireAuth, setIsUploadModalOpen } = useAuth();

  const handleUploadClick = () => {
    requireAuth('يرجى تسجيل الدخول لنشر عملك الفني في المعرض', () => {
      setIsUploadModalOpen(true);
    });
  };

  return (
    <section className="relative overflow-hidden bg-[var(--bg-card)] border-b border-[var(--border-card)] transition-colors duration-200">
      {/* Subtle Background Lighting Effects */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[var(--color-accent)]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Right Column: Arabic Copy & Call to Action */}
          <div className="lg:col-span-7 text-right space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>المنصة الفنية المتكاملة للمبدعين العرب</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-serif text-slate-900 dark:text-white leading-[1.25] tracking-tight">
              اكتشف أجمل اللوحات <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-accent)] to-amber-600">
                والأعمال الفنية العربية
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl font-sans">
              منصة راقية متكاملة تتيح للفنانين والمصورين العرب عرض أعمالهم ونشرها، وتفاعل محبي الفن مع اللوحات والرسومات والصور الفوتوغرافية بأعلى جودة بصريّة.
            </p>

            {/* CTA Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onExploreClick}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2.5"
              >
                <Compass className="w-5 h-5" />
                استكشف المعرض
              </button>

              <button
                onClick={handleUploadClick}
                className="px-6 py-3.5 rounded-2xl border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-bold hover:bg-[var(--color-primary)]/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2.5"
              >
                <Upload className="w-5 h-5" />
                أضف عملك الفني
              </button>
            </div>

            {/* Stats Overview Pill */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-[var(--border-card)] max-w-lg">
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-serif">
                  +{stats.totalWorks}
                </p>
                <p className="text-xs text-slate-500 font-medium">عمل فني مقبول</p>
              </div>

              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-serif">
                  +{stats.totalLikes}
                </p>
                <p className="text-xs text-slate-500 font-medium">إعجاب من الجمهور</p>
              </div>

              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-serif">
                  {stats.totalCategories}
                </p>
                <p className="text-xs text-slate-500 font-medium">تصنيف فني متنوع</p>
              </div>
            </div>
          </div>

          {/* Left Column: Visual Artwork Collage Display */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md">
              {/* Main Decorative Frame */}
              <div className="relative rounded-3xl p-3 bg-gradient-to-tr from-[var(--color-primary)]/30 to-[var(--color-accent)]/30 shadow-2xl backdrop-blur-sm border border-white/20">
                <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-slate-900 relative group">
                  <img
                    src="https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1000&auto=format&fit=crop&q=80"
                    alt="معرض الفنون"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 flex flex-col justify-end p-6 text-white text-right">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/80 w-fit mb-2">
                      لوحة مميزة
                    </span>
                    <h3 className="text-xl font-bold font-serif">هارموني الألوان الشرقية</h3>
                    <p className="text-xs text-slate-300">رسم رقمي بحس كلاسيكي</p>
                  </div>
                </div>
              </div>

              {/* Floating Badge 1 */}
              <div className="absolute -bottom-6 -right-6 bg-[var(--bg-card)] p-4 rounded-2xl shadow-xl border border-[var(--border-card)] flex items-center gap-3 animate-bounce-slow">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">جودة وتصاميم نادرة</p>
                  <p className="text-[11px] text-slate-500">مراجعة واعتناء بكل عمل</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
