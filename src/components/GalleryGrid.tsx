import React, { useState, useEffect } from 'react';
import { Artwork, SortOption } from '../types';
import { fetchApprovedArtworks, DEFAULT_CATEGORIES } from '../lib/artworks';
import { ArtworkCard } from './ArtworkCard';
import { Search, SlidersHorizontal, Sparkles, Filter, RefreshCw, Upload, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface GalleryGridProps {
  onSelectArtwork: (art: Artwork) => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({ 
  onSelectArtwork, 
  selectedCategory: propCategory, 
  onCategoryChange 
}) => {
  const { user } = useAuth();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [internalCategory, setInternalCategory] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  const selectedCategory = propCategory !== undefined ? propCategory : internalCategory;

  const handleCategorySelect = (cat: string) => {
    if (onCategoryChange) {
      onCategoryChange(cat);
    }
    setInternalCategory(cat);
  };

  const loadArtworks = async () => {
    setLoading(true);
    try {
      const data = await fetchApprovedArtworks(selectedCategory, searchQuery, sortOption, 60, user?.uid);
      setArtworks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArtworks();
  }, [selectedCategory, sortOption, user?.uid]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadArtworks();
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-right">
      
      {/* Control Bar: Search & Sorting */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[var(--bg-card)] p-4 sm:p-5 rounded-3xl border border-[var(--border-card)] shadow-sm">
        
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="w-full md:w-96 relative">
          <Search className="absolute top-3.5 right-4 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم، الفنان، أو الكلمة المفتاحية..."
            className="w-full pr-11 pl-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
          />
        </form>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
            الترتيب حسب:
          </span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="newest">الأحدث نشرًا</option>
            <option value="likes">الأكثر إعجابًا</option>
            <option value="comments">الأكثر تعليقًا</option>
            <option value="featured">الأعمال المميزة فقط</option>
          </select>
        </div>

      </div>

      {/* Category Scroll Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {DEFAULT_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          const isWorldMasters = cat === 'فنانين عالميين';
          const isUserUploaded = cat === 'أعمال الفنانين المرفوعة';
          return (
            <button
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-sm flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white scale-105 shadow-md'
                  : isUserUploaded
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
                  : isWorldMasters
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-[var(--bg-card)] border border-[var(--border-card)] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isUserUploaded && <Upload className="w-3.5 h-3.5 text-emerald-500" />}
              {isWorldMasters && <Crown className="w-3.5 h-3.5 text-amber-500" />}
              {cat}
            </button>
          );
        })}
      </div>

      {/* Artworks Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-[4/5] rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : artworks.length === 0 ? (
        <div className="text-center py-16 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-card)] p-8 space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] mx-auto flex items-center justify-center">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-white">لم نجد أعمالاً متطابقة</h3>
          <p className="text-xs text-slate-500">جرب البحث بكلمة مختلفة أو اختر تصنيفاً آخر لمشاهدة اللوحات المتاحة</p>
          <button
            onClick={() => {
              setSelectedCategory('الكل');
              setSearchQuery('');
              setSortOption('newest');
            }}
            className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold"
          >
            إعادة ضبط الفلاتر
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {artworks.map((art) => (
            <ArtworkCard
              key={art.id}
              artwork={art}
              onClick={() => onSelectArtwork(art)}
            />
          ))}
        </div>
      )}

    </section>
  );
};
