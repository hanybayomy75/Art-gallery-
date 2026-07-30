import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Upload, Sparkles, Palette, Compass, ChevronRight, ChevronLeft, Heart, MessageCircle, Eye } from 'lucide-react';
import { Artwork } from '../types';
import { fetchApprovedArtworks } from '../lib/artworks';
import { ArtworkFrame } from './ArtworkFrame';
import { getOptimizedImageUrl } from '../lib/cloudinary';

interface HeroSectionProps {
  onExploreClick: () => void;
  onSelectArtwork?: (art: Artwork) => void;
  stats: {
    totalWorks: number;
    totalLikes: number;
    totalCategories: number;
  };
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onExploreClick, onSelectArtwork, stats }) => {
  const { requireAuth, setIsUploadModalOpen } = useAuth();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load uploaded site artworks for the sequential showcase
  useEffect(() => {
    let isMounted = true;
    fetchApprovedArtworks('الكل', '', 'newest', 20)
      .then((data) => {
        if (isMounted) {
          setArtworks(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error loading showcase artworks:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Automatic sequence (slideshow) every 4 seconds
  useEffect(() => {
    if (artworks.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % artworks.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [artworks.length, isPaused]);

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (artworks.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % artworks.length);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (artworks.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + artworks.length) % artworks.length);
    }
  };

  const handleUploadClick = () => {
    requireAuth('يرجى تسجيل الدخول لنشر عملك الفني في المعرض', () => {
      setIsUploadModalOpen(true);
    });
  };

  const currentArtwork = artworks[currentIndex];

  return (
    <section className="relative overflow-hidden bg-[var(--bg-card)] border-b border-[var(--border-card)] transition-colors duration-200">
      {/* Subtle Background Lighting Effects */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[var(--color-accent)]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Right Column: Arabic Copy & Call to Action */}
          <div className="lg:col-span-7 text-right space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
              <span>المنصة الفنية المتكاملة للمبدعين العرب</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif text-slate-900 dark:text-white leading-[1.25] tracking-tight">
              اكتشف أجمل اللوحات <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-accent)] to-amber-600">
                والأعمال الفنية العربية
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl font-sans">
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

          {/* Left Column: Visual Sequential Artwork Showcase Box */}
          <div className="lg:col-span-5 relative">
            <div
              className="relative mx-auto max-w-md"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {/* Main Decorative Frame Showcase Box */}
              <div className="relative rounded-3xl p-3 bg-gradient-to-tr from-[var(--color-primary)]/30 to-[var(--color-accent)]/30 shadow-2xl backdrop-blur-sm border border-white/20 transition-all">
                
                {/* Header label inside frame */}
                <div className="flex items-center justify-between text-xs font-bold px-2 pb-2 text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-[var(--color-primary)]">
                    <Sparkles className="w-3.5 h-3.5" />
                    عرض متسلسل لأعمال المعرض
                  </span>
                  {artworks.length > 0 && (
                    <span className="bg-black/20 dark:bg-white/10 px-2.5 py-0.5 rounded-full text-[11px]">
                      {currentIndex + 1} / {artworks.length}
                    </span>
                  )}
                </div>

                <div 
                  onClick={() => currentArtwork && onSelectArtwork?.(currentArtwork)}
                  className="aspect-[4/5] rounded-2xl overflow-hidden bg-slate-950 relative group cursor-pointer shadow-inner"
                >
                  {loading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                      <Sparkles className="w-8 h-8 animate-spin" />
                      <span className="text-xs font-medium">جاري تحميل المعرض...</span>
                    </div>
                  ) : currentArtwork ? (
                    <>
                      <ArtworkFrame
                        src={getOptimizedImageUrl(currentArtwork.imageUrl, 800, 1000, 'c_fill')}
                        alt={currentArtwork.title}
                        frameStyle={currentArtwork.frameStyle || 'none'}
                        filterStyle={currentArtwork.filterStyle || 'normal'}
                        rotation={currentArtwork.rotation || 0}
                        className="w-full h-full flex items-center justify-center"
                        imgClassName="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />

                      {/* Inside Image Overlay: Artist Name, Title, and Details */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-between p-5 text-white text-right">
                        
                        {/* Top Badge inside image */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/90 text-white shadow-md backdrop-blur-md flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {currentArtwork.category || 'لوحة فنية'}
                          </span>

                          <span className="text-[11px] font-medium bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-slate-200">
                            انقر للتفاصيل
                          </span>
                        </div>

                        {/* Bottom Information inside image */}
                        <div className="space-y-2">
                          <h3 className="text-xl sm:text-2xl font-bold font-serif leading-tight drop-shadow-md">
                            {currentArtwork.title}
                          </h3>

                          {/* Artist Name inside image prominent display */}
                          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-amber-400/40 w-fit shadow-lg">
                            <Palette className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-xs sm:text-sm font-bold text-amber-300">
                              الفنان / {currentArtwork.artistName || currentArtwork.userName}
                            </span>
                          </div>

                          {/* Stats inside image */}
                          <div className="flex items-center gap-4 text-xs text-slate-300 font-medium pt-1">
                            <span className="flex items-center gap-1 text-rose-400 font-bold">
                              <Heart className="w-3.5 h-3.5 fill-rose-400" />
                              {currentArtwork.likesCount || 0} إعجاب
                            </span>
                            <span className="flex items-center gap-1 text-sky-400">
                              <MessageCircle className="w-3.5 h-3.5" />
                              {currentArtwork.commentsCount || 0} تعليق
                            </span>
                          </div>
                        </div>

                      </div>
                    </>
                  ) : (
                    /* Clean empty state when no artworks uploaded yet */
                    <div className="w-full h-full relative flex flex-col items-center justify-center p-6 bg-slate-900 text-center text-white">
                      <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center mb-4 border border-[var(--color-primary)]/30">
                        <Upload className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold font-serif mb-2">معرض الأعمال الفنية</h3>
                      <p className="text-xs text-slate-300 mb-5 max-w-xs leading-relaxed">
                        كن أول من ينشر عمله الفني في المعرض لإبهار الجمهور والمهتمين بالإبداع!
                      </p>
                      <button
                        onClick={handleUploadClick}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        أضف عملك الفني الآن
                      </button>
                    </div>
                  )}

                  {/* Navigation Arrows on sides inside image box */}
                  {artworks.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="absolute top-1/2 left-3 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-80 hover:opacity-100"
                        title="اللوحة التالية"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        onClick={handlePrev}
                        className="absolute top-1/2 right-3 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-80 hover:opacity-100"
                        title="اللوحة السابقة"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Dots indicator at the bottom of sequence frame */}
                {artworks.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 pt-3">
                    {artworks.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentIndex(idx);
                        }}
                        className={`h-2 rounded-full transition-all ${
                          idx === currentIndex
                            ? 'w-6 bg-[var(--color-primary)]'
                            : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                        }`}
                        title={`الانتقال للعمل ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}

              </div>

              {/* Floating Badge */}
              <div className="absolute -bottom-5 -right-5 bg-[var(--bg-card)] p-3.5 rounded-2xl shadow-xl border border-[var(--border-card)] flex items-center gap-3 animate-bounce-slow z-20">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">جودة وتصاميم نادرة</p>
                  <p className="text-[11px] text-slate-500">تسلسل متجدد لأحدث أعمال الفنانين</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

