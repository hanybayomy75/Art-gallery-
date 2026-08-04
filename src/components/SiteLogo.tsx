import React from 'react';

interface SiteLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const SiteLogo: React.FC<SiteLogoProps> = ({ className = '', size = 'md', showText = false }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative ${sizeMap[size]} shrink-0 group`}>
        {/* Outer Glow backdrop */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-amber-500 via-sky-500 to-amber-300 opacity-60 blur-sm group-hover:opacity-100 transition duration-300"></div>
        
        <div className="relative w-full h-full bg-slate-900 rounded-2xl p-1.5 border border-amber-500/40 shadow-xl flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="paletteGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="45%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <linearGradient id="brushWood" x1="0" y1="100" x2="100" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
            </defs>

            {/* Artistic Palette Base Shape */}
            <path
              d="M50 8 C25 8 10 25 10 50 C10 75 25 90 50 90 C62 90 68 82 68 74 C68 68 74 64 80 64 C88 64 92 56 92 48 C92 26 72 8 50 8 Z"
              fill="url(#paletteGrad)"
              stroke="url(#goldGrad)"
              strokeWidth="2.5"
            />

            {/* Paint Color Blobs on Palette */}
            <circle cx="26" cy="30" r="4.5" fill="#ef4444" />
            <circle cx="20" cy="46" r="4" fill="#3b82f6" />
            <circle cx="24" cy="64" r="4.5" fill="#10b981" />
            <circle cx="38" cy="76" r="3.5" fill="#a855f7" />
            <circle cx="56" cy="80" r="3.5" fill="#fbbf24" />

            {/* Thumb Hole on Palette */}
            <ellipse cx="78" cy="74" rx="5.5" ry="4" fill="#0f172a" stroke="url(#goldGrad)" strokeWidth="1.5" />

            {/* Retro Camera Body */}
            <rect x="36" y="32" width="46" height="32" rx="5" fill="#1e293b" stroke="url(#goldGrad)" strokeWidth="2" />
            {/* Camera Top Dial/Flash bump */}
            <rect x="52" y="27" width="14" height="6" rx="2" fill="url(#goldGrad)" />
            <circle cx="42" cy="29" r="2.5" fill="#f59e0b" />

            {/* Camera Lens Outer Gold Ring */}
            <circle cx="59" cy="48" r="11" fill="#0f172a" stroke="url(#goldGrad)" strokeWidth="2.5" />
            {/* Camera Lens Glass */}
            <circle cx="59" cy="48" r="7.5" fill="#0284c7" opacity="0.85" />
            <circle cx="57" cy="46" r="2.5" fill="#ffffff" opacity="0.7" />

            {/* Camera Gear Detail */}
            <circle cx="74" cy="40" r="3" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2 2" />

            {/* Paintbrush Handle Crossing Diagonally */}
            <path
              d="M12 92 L58 36"
              stroke="url(#brushWood)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Metallic Ferrule */}
            <path
              d="M58 36 L64 29"
              stroke="#e2e8f0"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Paintbrush Bristles & Tip */}
            <path
              d="M64 29 C68 24 74 15 76 12 C74 18 70 24 64 29 Z"
              fill="url(#goldGrad)"
            />
          </svg>
        </div>
      </div>

      {showText && (
        <div className="text-right">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight font-serif flex items-center gap-1.5">
            معرض الفنون
          </h1>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold tracking-wide">
            منصة الفنانين والمصورين العرب
          </p>
        </div>
      )}
    </div>
  );
};
