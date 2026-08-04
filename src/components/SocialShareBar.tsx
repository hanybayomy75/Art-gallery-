import React, { useState } from 'react';
import { Link2, Check, Share2 } from 'lucide-react';
import { getArtistPrefix } from '../lib/artworks';

interface SocialShareBarProps {
  shareUrl: string;
  title?: string;
  artworkTitle: string;
  artistName: string;
  category?: string;
  className?: string;
}

export const SocialShareBar: React.FC<SocialShareBarProps> = ({
  shareUrl,
  title,
  artworkTitle,
  artistName,
  category,
  className = ''
}) => {
  const [copied, setCopied] = useState(false);

  const prefix = getArtistPrefix(category);
  const shareText = title || `شاهد العمل الفني "${artworkTitle}" ${prefix} ${artistName}`;

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: artworkTitle,
          text: shareText,
          url: shareUrl
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink(e);
    }
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {/* Native Web Share API (if supported on mobile) */}
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[var(--color-primary)] text-white hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-sm relative group shrink-0 focus:outline-none"
          title="مشاركة عبر التطبيقات"
          aria-label="مشاركة عبر التطبيقات"
        >
          <Share2 className="w-5 h-5" />
          <span className="absolute -top-8 right-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
            مشاركة
          </span>
        </button>
      )}

      {/* WhatsApp */}
      <a
        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-sm relative group shrink-0 focus:outline-none"
        title="مشاركة عبر واتساب"
        aria-label="مشاركة عبر واتساب"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.012 2c-5.506 0-9.989 4.478-9.989 9.984 0 1.758.459 3.474 1.33 4.982L2 22l5.176-1.338c1.45.79 3.097 1.21 4.836 1.21 5.507 0 9.989-4.478 9.989-9.984 0-2.666-1.037-5.172-2.925-7.059C17.188 3.037 14.68 2 12.012 2zm5.83 14.333c-.244.687-1.42 1.309-1.97 1.365-.515.051-1.18.073-3.39-.838-2.828-1.167-4.633-4.05-4.774-4.24-.14-.19-1.144-1.524-1.144-2.908 0-1.384.726-2.066.986-2.348.26-.282.568-.352.757-.352.189 0 .378.002.54.01.173.008.406-.065.635.485.244.586.828 2.02.9 2.168.073.148.121.32.023.515-.098.196-.148.318-.292.492-.145.173-.306.388-.437.521-.144.148-.294.309-.126.598.168.289.748 1.233 1.605 1.996 1.103.981 2.032 1.286 2.32 1.434.288.148.458.123.627-.073.17-.196.726-.846.92-1.137.195-.29.388-.242.652-.145.263.097 1.673.788 1.96 1.281.288.492.288.74.044 1.427z" />
        </svg>
        <span className="absolute -top-8 right-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
          واتساب
        </span>
      </a>

      {/* Facebook */}
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1877F2] hover:bg-[#166fe5] text-white hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-sm relative group shrink-0 focus:outline-none"
        title="مشاركة عبر فيسبوك"
        aria-label="مشاركة عبر فيسبوك"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        <span className="absolute -top-8 right-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
          فيسبوك
        </span>
      </a>

      {/* X / Twitter */}
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-900 hover:bg-black text-white hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-sm relative group shrink-0 focus:outline-none"
        title="مشاركة عبر منصة X"
        aria-label="مشاركة عبر منصة X"
      >
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <span className="absolute -top-8 right-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
          منصة X
        </span>
      </a>

      {/* Telegram */}
      <a
        href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#229ED9] hover:bg-[#1d8cb0] text-white hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-sm relative group shrink-0 focus:outline-none"
        title="مشاركة عبر تلجرام"
        aria-label="مشاركة عبر تلجرام"
      >
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
        </svg>
        <span className="absolute -top-8 right-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
          تلجرام
        </span>
      </a>

      {/* Copy Link */}
      <button
        type="button"
        onClick={handleCopyLink}
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-all duration-200 flex items-center justify-center shadow-sm relative group shrink-0 focus:outline-none ${
          copied
            ? 'bg-emerald-500 text-white scale-105'
            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:scale-110 active:scale-95'
        }`}
        title={copied ? 'تم نسخ الرابط!' : 'نسخ رابط العمل الفني'}
        aria-label="نسخ الرابط"
      >
        {copied ? <Check className="w-5 h-5 text-white" /> : <Link2 className="w-5 h-5" />}
        <span className="absolute -top-8 right-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
          {copied ? 'تم النسخ!' : 'نسخ الرابط'}
        </span>
      </button>
    </div>
  );
};
