import React from 'react';
import { FrameStyle, FilterStyle } from '../types';

export interface FrameOption {
  id: FrameStyle;
  name: string;
  nameEn: string;
  previewBg: string;
}

export interface FilterOption {
  id: FilterStyle;
  name: string;
  cssFilter: string;
}

export const FRAME_OPTIONS: FrameOption[] = [
  { id: 'none', name: 'بدون إطار', nameEn: 'Borderless', previewBg: 'bg-slate-200 dark:bg-slate-700' },
  { id: 'gold_baroque', name: 'إطار ذهبي فاخر', nameEn: 'Baroque Gold', previewBg: 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-700' },
  { id: 'wood_classic', name: 'خشب ماهوجني', nameEn: 'Classic Mahogany', previewBg: 'bg-amber-950' },
  { id: 'black_modern', name: 'أسود مع ماكيت أبيض', nameEn: 'Modern Black Gallery', previewBg: 'bg-slate-900 border-2 border-white' },
  { id: 'white_gallery', name: 'إطار متحف أبيض', nameEn: 'Museum White', previewBg: 'bg-slate-100 border border-slate-300' },
  { id: 'floating_canvas', name: 'كانفاس عائم', nameEn: 'Canvas Float', previewBg: 'bg-neutral-800' },
  { id: 'bronze_vintage', name: 'برونزي أثري', nameEn: 'Antique Bronze', previewBg: 'bg-yellow-900' },
];

export const FILTER_OPTIONS: FilterOption[] = [
  { id: 'normal', name: 'طبيعي', cssFilter: 'none' },
  { id: 'grayscale', name: 'أبيض وأسود', cssFilter: 'grayscale(100%)' },
  { id: 'sepia', name: 'سيبيا كلاسيكي', cssFilter: 'sepia(90%) contrast(105%)' },
  { id: 'vintage', name: 'فينتاج دافئ', cssFilter: 'sepia(45%) contrast(115%) brightness(95%) hue-rotate(-10deg)' },
  { id: 'vivid', name: 'ألوان زاهية', cssFilter: 'saturate(180%) contrast(115%)' },
  { id: 'warm', name: 'دفء الشمس', cssFilter: 'sepia(30%) saturate(140%) brightness(105%)' },
  { id: 'cool', name: 'بارد سينمائي', cssFilter: 'brightness(105%) hue-rotate(180deg) saturate(120%)' },
  { id: 'contrast', name: 'تباين عالي', cssFilter: 'contrast(160%) brightness(105%)' },
  { id: 'invert', name: 'معكوس (سالب)', cssFilter: 'invert(100%)' },
  { id: 'blur_soft', name: 'ضبابي ناعم', cssFilter: 'blur(1.5px) brightness(110%) saturate(120%)' },
];

export function getFilterCss(filterStyle?: FilterStyle | string): string {
  if (!filterStyle) return 'none';
  const opt = FILTER_OPTIONS.find((f) => f.id === filterStyle);
  return opt ? opt.cssFilter : 'none';
}

interface ArtworkFrameProps {
  src: string;
  alt: string;
  frameStyle?: FrameStyle;
  filterStyle?: FilterStyle;
  rotation?: number; // 0, 90, 180, 270
  className?: string;
  imgClassName?: string;
  onClick?: () => void;
  onLoad?: () => void;
}

export const ArtworkFrame: React.FC<ArtworkFrameProps> = ({
  src,
  alt,
  frameStyle = 'none',
  filterStyle = 'normal',
  rotation = 0,
  className = '',
  imgClassName = '',
  onClick,
  onLoad
}) => {
  const filterCss = getFilterCss(filterStyle);
  const combinedImgStyle: React.CSSProperties = {
    transform: `rotate(${rotation || 0}deg)`,
    filter: filterCss,
    transition: 'transform 0.3s ease-in-out, filter 0.3s ease-in-out'
  };

  const renderFramedImage = () => {
    switch (frameStyle) {
      case 'gold_baroque':
        return (
          <div className="relative p-2.5 sm:p-4 bg-gradient-to-br from-[#d4af37] via-[#f3e5ab] to-[#aa7c11] rounded-lg shadow-[0_15px_35px_rgba(0,0,0,0.6)] border-[6px] sm:border-[10px] border-[#8c620d] outline outline-2 outline-[#f1d072]">
            <div className="p-1 sm:p-2 bg-[#4a3507] rounded-sm shadow-[inset_0_0_12px_rgba(0,0,0,0.8)]">
              <div className="overflow-hidden rounded-sm bg-black flex items-center justify-center">
                <img
                  src={src}
                  alt={alt}
                  onLoad={onLoad}
                  onError={onLoad}
                  referrerPolicy="no-referrer"
                  style={combinedImgStyle}
                  className={`max-w-full max-h-full object-contain ${imgClassName}`}
                />
              </div>
            </div>
          </div>
        );

      case 'wood_classic':
        return (
          <div className="relative p-3 sm:p-5 bg-gradient-to-br from-[#3d2314] via-[#5c3720] to-[#26150b] rounded-md shadow-[0_16px_40px_rgba(0,0,0,0.65)] border-[8px] sm:border-[12px] border-[#29170c] outline outline-1 outline-[#7a482b]">
            <div className="p-1 sm:p-2 bg-[#170c06] rounded-sm shadow-[inset_0_0_15px_rgba(0,0,0,0.9)]">
              <div className="overflow-hidden rounded-sm bg-black flex items-center justify-center">
                <img
                  src={src}
                  alt={alt}
                  onLoad={onLoad}
                  onError={onLoad}
                  referrerPolicy="no-referrer"
                  style={combinedImgStyle}
                  className={`max-w-full max-h-full object-contain ${imgClassName}`}
                />
              </div>
            </div>
          </div>
        );

      case 'black_modern':
        return (
          <div className="relative p-3 sm:p-6 bg-white dark:bg-slate-100 rounded-sm shadow-[0_15px_35px_rgba(0,0,0,0.4)] border-[8px] sm:border-[14px] border-[#111111] outline outline-1 outline-neutral-800">
            <div className="p-1 bg-neutral-200/60 rounded-xs shadow-[inset_0_0_6px_rgba(0,0,0,0.2)]">
              <div className="overflow-hidden bg-white flex items-center justify-center">
                <img
                  src={src}
                  alt={alt}
                  onLoad={onLoad}
                  onError={onLoad}
                  referrerPolicy="no-referrer"
                  style={combinedImgStyle}
                  className={`max-w-full max-h-full object-contain ${imgClassName}`}
                />
              </div>
            </div>
          </div>
        );

      case 'white_gallery':
        return (
          <div className="relative p-3 sm:p-6 bg-[#f8f9fa] rounded-sm shadow-[0_12px_30px_rgba(0,0,0,0.18)] border-[8px] sm:border-[14px] border-[#e2e8f0] outline outline-1 outline-slate-300">
            <div className="p-1 bg-[#e2e8f0]/40 rounded-xs">
              <div className="overflow-hidden bg-white flex items-center justify-center">
                <img
                  src={src}
                  alt={alt}
                  onLoad={onLoad}
                  onError={onLoad}
                  referrerPolicy="no-referrer"
                  style={combinedImgStyle}
                  className={`max-w-full max-h-full object-contain ${imgClassName}`}
                />
              </div>
            </div>
          </div>
        );

      case 'floating_canvas':
        return (
          <div className="relative p-2 bg-[#1a1a1a] rounded-sm shadow-[0_20px_45px_rgba(0,0,0,0.7)] border border-neutral-700">
            <div className="p-1 bg-[#0d0d0d] rounded-xs shadow-[inset_0_0_10px_rgba(0,0,0,0.9)]">
              <div className="overflow-hidden bg-black flex items-center justify-center">
                <img
                  src={src}
                  alt={alt}
                  onLoad={onLoad}
                  onError={onLoad}
                  referrerPolicy="no-referrer"
                  style={combinedImgStyle}
                  className={`max-w-full max-h-full object-contain ${imgClassName}`}
                />
              </div>
            </div>
          </div>
        );

      case 'bronze_vintage':
        return (
          <div className="relative p-2.5 sm:p-4 bg-gradient-to-br from-[#7a623e] via-[#9e8357] to-[#4d3d25] rounded-lg shadow-[0_15px_35px_rgba(0,0,0,0.6)] border-[6px] sm:border-[10px] border-[#42341f] outline outline-1 outline-[#ba9d6c]">
            <div className="p-1.5 bg-[#291e10] rounded-sm shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]">
              <div className="overflow-hidden rounded-sm bg-black flex items-center justify-center">
                <img
                  src={src}
                  alt={alt}
                  onLoad={onLoad}
                  onError={onLoad}
                  referrerPolicy="no-referrer"
                  style={combinedImgStyle}
                  className={`max-w-full max-h-full object-contain ${imgClassName}`}
                />
              </div>
            </div>
          </div>
        );

      case 'none':
      default:
        return (
          <div className="overflow-hidden flex items-center justify-center w-full h-full">
            <img
              src={src}
              alt={alt}
              onLoad={onLoad}
              onError={onLoad}
              referrerPolicy="no-referrer"
              style={combinedImgStyle}
              className={`max-w-full max-h-full object-contain ${imgClassName}`}
            />
          </div>
        );
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center max-w-full transition-all ${className}`}
    >
      {renderFramedImage()}
    </div>
  );
};
