import React, { useState } from 'react';
import { Artwork } from '../types';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import { Heart, MessageCircle, Eye, Sparkles, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

interface ArtworkCardProps {
  artwork: Artwork;
  onClick: () => void;
  showStatusBadge?: boolean;
}

export const ArtworkCard: React.FC<ArtworkCardProps> = ({ artwork, onClick, showStatusBadge = false }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const thumbnailUrl = getOptimizedImageUrl(artwork.imageUrl, 600, 600, 'c_fill');

  const renderStatusBadge = () => {
    if (!showStatusBadge) return null;

    if (artwork.status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/90 text-white backdrop-blur-md shadow-sm">
          <Clock className="w-3 h-3" />
          قيد المراجعة
        </span>
      );
    }
    if (artwork.status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/90 text-white backdrop-blur-md shadow-sm">
          <CheckCircle2 className="w-3 h-3" />
          تم الاعتماد
        </span>
      );
    }
    if (artwork.status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/90 text-white backdrop-blur-md shadow-sm">
          <AlertCircle className="w-3 h-3" />
          مرفوض
        </span>
      );
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-[var(--bg-card)] rounded-2xl overflow-hidden border border-[var(--border-card)] shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col"
    >
      {/* Image Frame Area */}
      <div className="relative aspect-[4/5] bg-slate-100 dark:bg-slate-800 overflow-hidden">
        
        {/* Skeleton Loader */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-slate-400" />
          </div>
        )}

        <img
          src={thumbnailUrl}
          alt={artwork.title}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Hover Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 text-white">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20">
              {artwork.category}
            </span>
            {artwork.isFeatured && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500 text-white shadow-md flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                مميز
              </span>
            )}
          </div>

          <div>
            <p className="text-xs text-slate-300 line-clamp-2">{artwork.description}</p>
          </div>
        </div>

        {/* Status Badge Positioned at top right */}
        {showStatusBadge && (
          <div className="absolute top-3 right-3 z-10">
            {renderStatusBadge()}
          </div>
        )}
      </div>

      {/* Card Info Details */}
      <div className="p-4 flex flex-col justify-between flex-1 text-right space-y-2">
        <div>
          <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
            {artwork.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            بقلم / {artwork.artistName}
          </p>
        </div>

        {/* Counters Footer */}
        <div className="pt-2 border-t border-[var(--border-card)] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-rose-500 font-bold">
              <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
              {artwork.likesCount || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5 text-sky-500" />
              {artwork.commentsCount || 0}
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            {new Date(artwork.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
          </span>
        </div>

      </div>
    </div>
  );
};
