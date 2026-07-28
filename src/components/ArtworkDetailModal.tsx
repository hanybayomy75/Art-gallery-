import React, { useState, useEffect } from 'react';
import { Artwork, ArtworkComment } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  checkIfUserLikedArtwork, 
  toggleLikeArtwork, 
  fetchArtworkComments, 
  addArtworkComment, 
  deleteArtworkComment, 
  fetchApprovedArtworks,
  incrementArtworkViews
} from '../lib/artworks';
import { getOptimizedImageUrl, getSocialShareImageUrl } from '../lib/cloudinary';
import { 
  X, 
  Heart, 
  MessageCircle, 
  Share2, 
  Copy, 
  Check, 
  Eye, 
  Maximize2, 
  Send, 
  Trash2, 
  User, 
  Sparkles,
  Calendar,
  Tag,
  AlertCircle
} from 'lucide-react';

interface ArtworkDetailModalProps {
  artwork: Artwork | null;
  onClose: () => void;
  onSelectArtwork?: (artwork: Artwork) => void;
}

export const ArtworkDetailModal: React.FC<ArtworkDetailModalProps> = ({
  artwork,
  onClose,
  onSelectArtwork
}) => {
  const { user, userProfile, requireAuth } = useAuth();

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<ArtworkComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [relatedWorks, setRelatedWorks] = useState<Artwork[]>([]);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [showSocialPreview, setShowSocialPreview] = useState(false);

  useEffect(() => {
    if (!artwork) return;

    setLikesCount(artwork.likesCount || 0);

    // Track view count
    incrementArtworkViews(artwork.id);

    // Check user like status
    if (user) {
      checkIfUserLikedArtwork(artwork.id, user.uid).then((liked) => setIsLiked(liked));
    } else {
      setIsLiked(false);
    }

    // Load comments
    fetchArtworkComments(artwork.id).then((list) => setComments(list));

    // Load related artworks
    fetchApprovedArtworks(artwork.category, '', 'newest', 6).then((list) => {
      setRelatedWorks(list.filter((a) => a.id !== artwork.id));
    });

  }, [artwork, user]);

  if (!artwork) return null;

  const shareUrl = `${window.location.origin}/art/${artwork.id}`;

  const handleLikeToggle = async () => {
    requireAuth('يرجى تسجيل الدخول للإعجاب بهذا العمل الفني', async () => {
      if (!user) return;

      setLikeAnimating(true);
      setTimeout(() => setLikeAnimating(false), 500);

      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikesCount((prev) => (newLikedState ? prev + 1 : Math.max(0, prev - 1)));

      try {
        await toggleLikeArtwork(artwork.id, user.uid);
      } catch (err) {
        // Revert on failure
        setIsLiked(!newLikedState);
        setLikesCount((prev) => (newLikedState ? Math.max(0, prev - 1) : prev + 1));
      }
    });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    requireAuth('يرجى تسجيل الدخول لكتابة تعليق', async () => {
      if (!user || !userProfile) return;

      setSubmittingComment(true);
      try {
        await addArtworkComment(
          artwork.id,
          user.uid,
          userProfile.artistName || userProfile.displayName || 'فنان معارض',
          userProfile.photoURL || '',
          commentText
        );
        setCommentText('');
        // Refresh comments list
        const updated = await fetchArtworkComments(artwork.id);
        setComments(updated);
      } catch (err) {
        console.error(err);
      } finally {
        setSubmittingComment(false);
      }
    });
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('هل أنت تأكد من رغبتك في حذف هذا التعليق؟')) return;

    try {
      await deleteArtworkComment(artwork.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: artwork.title,
          text: `شاهد العمل الفني "${artwork.title}" للفنان ${artwork.artistName} على منصة معرض الفنون`,
          url: shareUrl
        });
      } catch (err) {
        // user cancelled
      }
    } else {
      handleCopyShareLink();
    }
  };

  const highResUrl = getOptimizedImageUrl(artwork.imageUrl, 1600);

  const isStaff = userProfile?.role === 'owner' || userProfile?.role === 'admin';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
        <div className="relative w-full max-w-5xl bg-[var(--bg-card)] rounded-3xl shadow-2xl border border-[var(--border-card)] overflow-hidden text-right my-auto max-h-[92vh] flex flex-col md:flex-row">
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all shadow-md"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left / Top Side: Main Image Frame */}
          <div className="md:w-3/5 bg-slate-950 relative flex items-center justify-center min-h-[300px] md:min-h-[500px] p-4 group">
            <img
              src={highResUrl}
              alt={artwork.title}
              className="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl"
            />

            {/* Lightbox Trigger Button */}
            <button
              onClick={() => setIsLightboxOpen(true)}
              className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white text-xs font-bold px-3 py-2 rounded-xl backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-all shadow-lg"
            >
              <Maximize2 className="w-4 h-4" />
              تكبير الصورة
            </button>
          </div>

          {/* Right Side: Artwork Info & Interaction Panel */}
          <div className="md:w-2/5 p-6 flex flex-col justify-between overflow-y-auto space-y-6">
            
            {/* Artist & Title Info */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-4">
                <div className="flex items-center gap-3">
                  {artwork.userPhoto ? (
                    <img
                      src={artwork.userPhoto}
                      alt={artwork.artistName}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-[var(--color-primary)]/40"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold flex items-center justify-center text-lg">
                      {artwork.artistName?.[0] || 'ف'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white font-serif">
                      {artwork.artistName}
                    </h4>
                    <p className="text-xs text-slate-500">فنان المعرض</p>
                  </div>
                </div>

                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  {artwork.category}
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white leading-tight">
                  {artwork.title}
                </h2>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(artwork.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  {artwork.viewsCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {artwork.viewsCount} مشاهدة
                    </span>
                  )}
                </div>
              </div>

              {artwork.description && (
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-[var(--border-card)]">
                  {artwork.description}
                </p>
              )}

              {/* Tags */}
              {artwork.tags && artwork.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {artwork.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3 text-[var(--color-primary)]" />
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Like & Social Share Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-[var(--border-card)] space-y-3">
              <div className="flex items-center justify-between">
                
                {/* Like Button */}
                <button
                  onClick={handleLikeToggle}
                  className={`px-4 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${
                    isLiked
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                      : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600'
                  } ${likeAnimating ? 'scale-110' : ''}`}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-white' : 'text-rose-500'}`} />
                  <span>{likesCount} إعجاب</span>
                </button>

                <div className="flex items-center gap-2">
                  {/* Toggle Social Preview Card Button */}
                  <button
                    type="button"
                    onClick={() => setShowSocialPreview(!showSocialPreview)}
                    className="px-3 py-2 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all flex items-center gap-1.5"
                    title="معاينة شكل الصورة والرابط عند المشاركة على وسائل التواصل"
                  >
                    <Eye className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    {showSocialPreview ? 'إخفاء المعاينة' : 'معاينة البطاقة'}
                  </button>

                  {/* Native Share */}
                  <button
                    onClick={handleNativeShare}
                    className="px-4 py-2 rounded-2xl bg-[var(--color-primary)] text-white text-xs font-bold shadow-md hover:opacity-95 transition-all flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    مشاركة
                  </button>
                </div>

              </div>

              {/* Social Platforms Direct Buttons */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-bold text-slate-700 dark:text-slate-300">مشاركة مباشر مع بطاقة الصورة:</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`العمل الفني "${artwork.title}" بريشة الفنان ${artwork.artistName}`)}&url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="font-black text-xs">X</span> إكس (تويتر)
                  </a>

                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-[#1877F2] text-white font-bold hover:bg-[#166fe5] transition-all text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    فيسبوك
                  </a>

                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`شاهد العمل الفني "${artwork.title}" بريشة الفنان ${artwork.artistName}\n${shareUrl}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-[#25D366] text-white font-bold hover:bg-[#20bd5a] transition-all text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    واتساب
                  </a>

                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`العمل الفني "${artwork.title}" بريشة الفنان ${artwork.artistName}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-[#229ED9] text-white font-bold hover:bg-[#1d8cb0] transition-all text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    تيليجرام
                  </a>

                  <button
                    onClick={handleCopyShareLink}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold hover:bg-[var(--color-primary)] hover:text-white transition-all text-xs flex items-center gap-1.5 mr-auto"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'تم النسخ' : 'نسخ الرابط'}
                  </button>
                </div>
              </div>

              {/* Social Card Live Preview Display */}
              {showSocialPreview && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-600 dark:text-slate-300">
                      معاينة البطاقة الاجتماعية (Social Card Preview):
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      صورة بارزة + عنوان ورابط
                    </span>
                  </div>

                  {/* Open Graph Card Visualization */}
                  <div className="rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md">
                    {/* Image Banner */}
                    <div className="aspect-[1.91/1] w-full bg-slate-950 relative overflow-hidden flex items-center justify-center">
                      <img
                        src={getSocialShareImageUrl(artwork.imageUrl)}
                        alt={artwork.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[var(--color-primary)]" />
                        معرض الفنون
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="p-3 text-right space-y-1 bg-slate-50/80 dark:bg-slate-800/80">
                      <p className="text-[10px] font-mono font-bold text-slate-400 dir-ltr text-right">
                        {window.location.host}
                      </p>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white font-serif line-clamp-1">
                        {artwork.title} - بريشة الفنان {artwork.artistName}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight font-sans">
                        {artwork.description || `استكشف هذه اللوحة الفنية المميزة في معرض الفنون العربية والعالمية.`}
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center leading-normal">
                    💡 يظهر هذا المظهر المتكامل للصورة مع العنوان والوصف والرابط تلقائياً فور نشر الرابط على إكس (تويتر)، فيسبوك، واتساب، وتيليجرام.
                  </p>
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="space-y-3 flex-1 flex flex-col justify-end">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 font-serif">
                <MessageCircle className="w-4 h-4 text-[var(--color-primary)]" />
                التعليقات والآراء ({comments.length})
              </h3>

              {/* Comments List */}
              <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    كن أول من يترك تعليقًا أو انطباعًا فنيًا حول هذا العمل!
                  </p>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--border-card)] text-xs space-y-1 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{c.userName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                          </span>
                          {(user?.uid === c.userId || isStaff) && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="text-rose-500 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                              title="حذف التعليق"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-sans leading-relaxed">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="relative mt-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="اكتب تعليقك الفني..."
                  maxLength={500}
                  className="w-full pr-4 pl-12 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="absolute left-2 top-2 p-2 rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-40 transition-all"
                >
                  <Send className="w-4 h-4 rotate-180" />
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>

      {/* Lightbox Fullscreen Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 left-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all z-50"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={artwork.imageUrl}
            alt={artwork.title}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
};
