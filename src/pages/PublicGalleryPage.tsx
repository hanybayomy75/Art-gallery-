import React, { useState, useEffect } from 'react';
import { Artwork, SortOption } from '../types';
import { 
  DEFAULT_CATEGORIES, 
  subscribeToApprovedArtworks, 
  getArtworkRatingMeta,
  getArtistPrefix 
} from '../lib/artworks';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import { 
  Search, 
  Sparkles, 
  Filter, 
  Heart, 
  Eye, 
  Star, 
  Tag, 
  Grid, 
  ShieldCheck, 
  ChevronLeft,
  ArrowUpDown,
  Home
} from 'lucide-react';

interface PublicGalleryPageProps {
  onSelectArtwork: (artwork: Artwork) => void;
  onNavigateHome: () => void;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export const PublicGalleryPage: React.FC<PublicGalleryPageProps> = ({
  onSelectArtwork,
  onNavigateHome,
  selectedCategory: initialCategory = 'الكل',
  onSelectCategory
}) => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  // Sync initial category when prop changes
  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  // Subscribe to all approved artworks
  useEffect(() => {
    setLoading(true);
    document.title = 'المعرض العام للأعمال المقبولة - منصة الفنانين والمصورين العرب';

    const unsubscribe = subscribeToApprovedArtworks(
      (list) => {
        setArtworks(list);
        setLoading(false);
      },
      selectedCategory,
      searchQuery,
      sortOption,
      500
    );

    return () => unsubscribe();
  }, [selectedCategory, searchQuery, sortOption]);

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    if (onSelectCategory) {
      onSelectCategory(cat);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-20">
      
      {/* Hero Header for Public Gallery Page */}
      <div className="bg-gradient-to-b from-amber-500/10 via-[var(--bg-card)] to-[var(--bg-card)] border-b border-[var(--border-card)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>المعرض العام للوحات والأعمال الفنية المعتمدة</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif text-slate-900 dark:text-white leading-tight">
            تصفح أروع الأعمال الفنية المعتمدة
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            منصة الفنانين والمصورين العرب لعرض وتوثيق الأعمال الفنية المقبولة بريشة ونظرة نخبة من الفنانين والمبدعين.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto pt-4">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 absolute right-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم العمل الفني، الفنان، أو الكلمات المفتاحية..."
                className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-4 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  مسح
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Main Content & Gallery Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Category Tabs Scrollbar & Sort Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-card)] shadow-sm">
          
          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {DEFAULT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort Selector & Stats */}
          <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 font-semibold shrink-0">
              المعروض: <span className="text-[var(--color-primary)] font-bold">{artworks.length}</span> عمل مقبولة
            </span>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="newest">الأحدث اعتمادات</option>
                <option value="likes">الأكثر إعجاباً</option>
                <option value="rating">الأعلى تقييماً</option>
                <option value="comments">الأكثر تفاعلاً</option>
              </select>
            </div>
          </div>

        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-500 animate-pulse">
              جاري جلب الأعمال الفنية المقبولة...
            </p>
          </div>
        ) : artworks.length === 0 ? (
          <div className="py-20 text-center bg-[var(--bg-card)] rounded-3xl border border-[var(--border-card)] p-8 space-y-3">
            <Grid className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              لم يتم العثور على أعمال معتمدة تنطبق عليها شروط البحث
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              جرّب تغيير فئة العرض أو البحث عن كلمة رئيسية أخرى لرؤية المزيد من الأعمال الفنية المعتمدة.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('الكل');
                setSearchQuery('');
              }}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold"
            >
              إعادة تعيين الفلاتر
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {artworks.map((art) => {
              const ratingMeta = getArtworkRatingMeta(art);
              const artist = art.artistName || art.userName || 'فنان المعرض';
              const prefix = getArtistPrefix(art.category);

              return (
                <div
                  key={art.id}
                  onClick={() => onSelectArtwork(art)}
                  className="group bg-[var(--bg-card)] rounded-3xl overflow-hidden border border-[var(--border-card)] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
                >
                  {/* Artwork Image */}
                  <div className="aspect-[4/3] relative overflow-hidden bg-slate-900/5 dark:bg-slate-900/50">
                    <img
                      src={getOptimizedImageUrl(art.imageUrl, 600)}
                      alt={art.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />

                    {/* Category Badge */}
                    <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold">
                      {art.category || 'لوحات فنية'}
                    </span>

                    {/* Verified Approved Badge */}
                    <span className="absolute top-3 left-3 p-1.5 rounded-full bg-emerald-500 text-white shadow-md" title="عمل فني معتمد">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  {/* Card Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white line-clamp-1 group-hover:text-[var(--color-primary)] transition-colors">
                        {art.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium truncate">
                        {prefix} <span className="font-bold text-slate-700 dark:text-slate-300">{artist}</span>
                      </p>
                    </div>

                    {/* Footer stats line */}
                    <div className="pt-3 border-t border-[var(--border-card)] flex items-center justify-between text-xs text-slate-500">
                      
                      {/* Rating */}
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        <span>{ratingMeta.ratingAverage > 0 ? ratingMeta.ratingAverage : 'جديد'}</span>
                      </div>

                      {/* Likes & Views */}
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>{art.viewsCount || 1}</span>
                        </span>
                        <span className="flex items-center gap-1 text-rose-500 font-semibold">
                          <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
                          <span>{art.likesCount || 0}</span>
                        </span>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

    </div>
  );
};
