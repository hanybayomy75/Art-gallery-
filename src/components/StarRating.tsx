import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  ratingAverage?: number;
  rating?: number; // fallback alias for ratingAverage
  ratingCount?: number;
  userRating?: number | null;
  ratingDistribution?: Record<number, number>;
  onRate?: (stars: number) => void;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showDistribution?: boolean;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  ratingAverage,
  rating,
  ratingCount = 0,
  userRating = null,
  ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  onRate,
  interactive,
  size = 'md',
  showLabel = true,
  showDistribution = true,
  className = ''
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveRatingAverage = ratingAverage !== undefined ? ratingAverage : (rating !== undefined ? rating : 0);
  const isInteractive = interactive !== undefined ? interactive : Boolean(onRate);

  const starSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const currentDisplayRating = hoverRating !== null 
    ? hoverRating 
    : (userRating !== null ? userRating : effectiveRatingAverage);

  const ratingLabels: Record<number, string> = {
    1: 'سيء 😞',
    2: 'مقبول 😐',
    3: 'جيد 🙂',
    4: 'جيد جداً 😀',
    5: 'ممتاز وفائق الجمال 🌟'
  };

  const handleStarClick = (stars: number) => {
    if (!isInteractive || !onRate || isSubmitting) return;
    setIsSubmitting(true);
    try {
      onRate(stars);
    } finally {
      setTimeout(() => setIsSubmitting(false), 300);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Star Buttons */}
        <div className="flex items-center gap-0.5 dir-ltr" dir="ltr">
          {[1, 2, 3, 4, 5].map((starIndex) => {
            const isFilled = currentDisplayRating >= starIndex;
            const isHalf = !isFilled && currentDisplayRating > starIndex - 1 && currentDisplayRating < starIndex;

            return (
              <button
                key={starIndex}
                type="button"
                disabled={!isInteractive || isSubmitting}
                onClick={() => {
                  handleStarClick(starIndex);
                  setHoverRating(null);
                }}
                onMouseEnter={() => isInteractive && setHoverRating(starIndex)}
                onMouseLeave={() => isInteractive && setHoverRating(null)}
                onTouchEnd={() => isInteractive && setHoverRating(null)}
                className={`p-1 sm:p-1.5 rounded-xl transition-all duration-150 focus:outline-none flex items-center justify-center ${
                  isInteractive
                    ? 'cursor-pointer hover:bg-amber-500/10 hover:scale-125 active:scale-95'
                    : 'cursor-default'
                } ${isSubmitting ? 'opacity-60' : ''}`}
                title={isInteractive ? `تقييم ${starIndex} نجوم` : `التقييم: ${effectiveRatingAverage.toFixed(1)}`}
                aria-label={`تقييم ${starIndex} من 5 نجوم`}
              >
                <Star
                  className={`${starSizes[size]} transition-all duration-150 ${
                    isFilled
                      ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] scale-105'
                      : isHalf
                      ? 'fill-amber-400/50 text-amber-400'
                      : 'fill-slate-200 text-slate-300 dark:fill-slate-800 dark:text-slate-700'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Rating Score & Count Badge */}
        {showLabel && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="text-amber-500 font-extrabold text-sm">
              {effectiveRatingAverage > 0 ? effectiveRatingAverage.toFixed(1) : 'جديد'}
            </span>
            {ratingCount > 0 && (
              <span className="text-slate-400 text-[11px] font-medium">
                ({ratingCount} {ratingCount === 1 ? 'تقييم' : 'تقييمات'})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Interactive feedback label */}
      {isInteractive && showLabel && (
        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 min-h-[1.25rem]">
          {hoverRating !== null ? (
            <span className="text-amber-600 dark:text-amber-400 font-bold animate-pulse">
              اضغط للتقييم بـ {ratingLabels[hoverRating]}
            </span>
          ) : userRating !== null ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              ✓ تقييمك الحالي: {userRating} من 5 ({ratingLabels[userRating]})
            </span>
          ) : (
            <span className="text-slate-400 italic">
              انقر على النجوم لإضافة تقييمك لهذا العمل الفني
            </span>
          )}
        </div>
      )}

      {/* 1-5 Star Breakdown Progress Bars */}
      {showDistribution && ratingCount > 0 && (
        <div className="pt-2 border-t border-amber-500/20 space-y-1.5">
          {[5, 4, 3, 2, 1].map((starNum) => {
            const count = ratingDistribution[starNum] || 0;
            const percent = ratingCount > 0 ? Math.round((count / ratingCount) * 100) : 0;
            return (
              <div key={starNum} className="flex items-center gap-2 text-[11px]">
                <span className="w-12 text-slate-600 dark:text-slate-400 font-medium shrink-0 flex items-center gap-1">
                  <span>{starNum}</span>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                </span>
                <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-8 text-left text-slate-500 text-[10px] font-bold shrink-0">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
