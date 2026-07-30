import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  ratingAverage?: number;
  ratingCount?: number;
  userRating?: number | null;
  onRate?: (stars: number) => void;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  ratingAverage = 0,
  ratingCount = 0,
  userRating = null,
  onRate,
  interactive = false,
  size = 'md',
  showLabel = true,
  className = ''
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const starSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const currentDisplayRating = hoverRating !== null 
    ? hoverRating 
    : (userRating !== null ? userRating : ratingAverage);

  const ratingLabels: Record<number, string> = {
    1: 'سيء 😞',
    2: 'مقبول 😐',
    3: 'جيد 🙂',
    4: 'جيد جداً 😀',
    5: 'ممتاز وفائق الجمال 🌟'
  };

  const handleStarClick = (stars: number) => {
    if (!interactive || !onRate || isSubmitting) return;
    setIsSubmitting(true);
    try {
      onRate(stars);
    } finally {
      setTimeout(() => setIsSubmitting(false), 300);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Star Buttons */}
        <div className="flex items-center gap-1 dir-ltr" dir="ltr">
          {[1, 2, 3, 4, 5].map((starIndex) => {
            const isFilled = currentDisplayRating >= starIndex;
            const isHalf = !isFilled && currentDisplayRating > starIndex - 1 && currentDisplayRating < starIndex;

            return (
              <button
                key={starIndex}
                type="button"
                disabled={!interactive || isSubmitting}
                onClick={() => handleStarClick(starIndex)}
                onMouseEnter={() => interactive && setHoverRating(starIndex)}
                onMouseLeave={() => interactive && setHoverRating(null)}
                className={`transition-all duration-150 focus:outline-none ${
                  interactive ? 'cursor-pointer hover:scale-125 active:scale-95' : 'cursor-default'
                } ${isSubmitting ? 'opacity-60' : ''}`}
                title={interactive ? `تقييم ${starIndex} نجوم` : `التقييم: ${ratingAverage.toFixed(1)}`}
              >
                <Star
                  className={`${starSizes[size]} ${
                    isFilled
                      ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
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
              {ratingAverage > 0 ? ratingAverage.toFixed(1) : 'جديد'}
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
      {interactive && showLabel && (
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
    </div>
  );
};
