import React, { useState, useEffect } from 'react';
import { Artwork, ArtworkComment, FrameStyle, FilterStyle } from '../types';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ArtworkFrame, FRAME_OPTIONS, FILTER_OPTIONS } from './ArtworkFrame';
import { StarRating } from './StarRating';
import { 
  checkIfUserLikedArtwork, 
  toggleLikeArtwork, 
  fetchArtworkComments, 
  addArtworkComment, 
  deleteArtworkComment, 
  fetchApprovedArtworks,
  incrementArtworkViews,
  updateArtworkData,
  deleteArtwork,
  rateArtwork,
  getUserArtworkRating,
  getArtworkRatingMeta,
  getArtistPrefix
} from '../lib/artworks';
import { addAppNotification } from '../lib/notifications';
import { sendEmailNotification, getArtistEmailSettings } from '../lib/emailService';

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
  AlertCircle,
  RotateCw,
  Frame as FrameIcon,
  Save,
  Star,
  Bookmark,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { isArtworkFavorite, toggleFavoriteArtwork, FAVORITE_EVENT } from '../lib/favorites';

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
  const [zoomLevel, setZoomLevel] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [relatedWorks, setRelatedWorks] = useState<Artwork[]>([]);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [showSocialPreview, setShowSocialPreview] = useState(false);
  const [isFav, setIsFav] = useState(false);

  // Rating system state
  const [ratingMeta, setRatingMeta] = useState<{
    ratingAverage: number;
    ratingCount: number;
    ratingSum: number;
    ratingDistribution: Record<number, number>;
  }>({ ratingAverage: 0, ratingCount: 0, ratingSum: 0, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingToast, setRatingToast] = useState(false);

  // Interactive Frame, Rotation & Filter state
  const [activeFrame, setActiveFrame] = useState<FrameStyle>('none');
  const [activeRotation, setActiveRotation] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<FilterStyle>('normal');
  const [isSavingFrame, setIsSavingFrame] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Lock body scroll when Lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen]);

  useEffect(() => {
    if (!artwork) return;

    setLikesCount(artwork.likesCount || 0);
    setActiveFrame(artwork.frameStyle || 'none');
    setActiveRotation(artwork.rotation || 0);
    setActiveFilter(artwork.filterStyle || 'normal');
    setShowConfirmDelete(false);

    // Initialize rating meta and existing user rating
    const meta = getArtworkRatingMeta(artwork);
    setRatingMeta(meta);
    const existing = getUserArtworkRating(artwork.id, user?.uid);
    setUserRating(existing);

    // Dynamic prefix based on category (e.g. "تصوير الفنان" vs "بريشة الفنان")
    const artistPrefix = getArtistPrefix(artwork.category);

    // Update client-side document head meta tags for browser extensions/sharers
    const titleText = `${artwork.title} - ${artistPrefix} ${artwork.artistName || 'فنان المعرض'} | معرض الفنون`;
    document.title = titleText;

    const setMeta = (nameOrProperty: string, content: string, isName = false) => {
      const attr = isName ? 'name' : 'property';
      let meta = document.querySelector(`meta[${attr}="${nameOrProperty}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, nameOrProperty);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const directImg = `${window.location.origin}/api/artwork-image/${artwork.id}.jpg`;
    const fallbackImg = getSocialShareImageUrl(artwork.imageUrl);
    const shareImg = (artwork.id && !artwork.id.startsWith('wm-') && !artwork.id.startsWith('sample-')) ? directImg : fallbackImg;

    setMeta('og:title', `${artwork.title} - ${artistPrefix} ${artwork.artistName || 'فنان المعرض'}`);
    setMeta('og:image', shareImg);
    setMeta('og:image:secure_url', shareImg);
    setMeta('og:image:type', 'image/jpeg');
    setMeta('og:image:width', '1200');
    setMeta('og:image:height', '630');
    setMeta('og:url', `${window.location.origin}/art/${artwork.id}`);
    setMeta('twitter:title', `${artwork.title} - ${artistPrefix} ${artwork.artistName || 'فنان المعرض'}`, true);
    setMeta('twitter:image', shareImg, true);

    // Check user favorite status
    const updateFavStatus = () => {
      setIsFav(isArtworkFavorite(artwork.id, user?.uid));
    };
    updateFavStatus();
    window.addEventListener(FAVORITE_EVENT, updateFavStatus);

    // Track view count
    incrementArtworkViews(artwork.id).catch(() => {});

    // Check user like status
    const isSampleOrWm = artwork.id.startsWith('wm-') || artwork.id.startsWith('sample-');
    if (user && !isSampleOrWm) {
      checkIfUserLikedArtwork(artwork.id, user.uid)
        .then((liked) => setIsLiked(liked))
        .catch(() => setIsLiked(false));
    } else {
      setIsLiked(false);
    }

    // Load initial comments
    if (!isSampleOrWm) {
      fetchArtworkComments(artwork.id)
        .then((list) => setComments(list))
        .catch(() => setComments([]));
    } else {
      setComments([]);
    }

    // Load related artworks
    fetchApprovedArtworks(artwork.category, '', 'newest', 6)
      .then((list) => {
        setRelatedWorks(list.filter((a) => a.id !== artwork.id));
      })
      .catch(() => setRelatedWorks([]));

    // Realtime Firestore listeners for instant statistics & comments updates
    let unsubArtDoc: (() => void) | null = null;
    let unsubComments: (() => void) | null = null;

    if (!isSampleOrWm) {
      try {
        const artRef = doc(db, 'artworks', artwork.id);
        unsubArtDoc = onSnapshot(artRef, (docSnap) => {
          if (docSnap.exists()) {
            const freshData = docSnap.data() as Artwork;
            if (freshData.likesCount !== undefined) {
              setLikesCount(freshData.likesCount);
            }
            const freshMeta = getArtworkRatingMeta(freshData);
            setRatingMeta(freshMeta);
          }
        });

        const commentsRef = collection(db, 'artworks', artwork.id, 'comments');
        const qComments = query(commentsRef, orderBy('createdAt', 'desc'));
        unsubComments = onSnapshot(qComments, (snap) => {
          const freshComments: ArtworkComment[] = [];
          snap.forEach((d) => {
            freshComments.push({ id: d.id, ...d.data() } as ArtworkComment);
          });
          setComments(freshComments);
        });
      } catch (err) {
        console.warn('Notice: Realtime snapshot error in ArtworkDetailModal:', err);
      }
    }

    return () => {
      window.removeEventListener(FAVORITE_EVENT, updateFavStatus);
      if (unsubArtDoc) unsubArtDoc();
      if (unsubComments) unsubComments();
    };
  }, [artwork, user]);

  if (!artwork) return null;

  const isStaff = userProfile?.role === 'owner' || userProfile?.role === 'admin';
  const isOwnerOfWork = user?.uid === artwork.userId;
  const canEditFrame = isStaff || isOwnerOfWork;
  const canDelete = isStaff || isOwnerOfWork;

  const handleRotate = () => {
    setActiveRotation((prev) => (prev + 90) % 360);
  };

  const handleSaveFrameAndRotation = async () => {
    setIsSavingFrame(true);
    try {
      await updateArtworkData(artwork.id, {
        frameStyle: activeFrame,
        rotation: activeRotation,
        filterStyle: activeFilter
      });
      artwork.frameStyle = activeFrame;
      artwork.rotation = activeRotation;
      artwork.filterStyle = activeFilter;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingFrame(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!artwork) return;
    setIsDeleting(true);
    try {
      await deleteArtwork(artwork.id, artwork.imageUrl);
      onClose();
    } catch (err: any) {
      console.error('Error deleting artwork:', err);
      alert('حدث خطأ أثناء حذف الصورة: ' + (err?.message || 'يرجى إعادة المحاولة'));
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const handleRate = async (stars: number) => {
    if (!artwork) return;
    const res = await rateArtwork(artwork.id, stars, user?.uid, userProfile || undefined);
    setUserRating(res.userRating);
    setRatingMeta({
      ratingAverage: res.ratingAverage,
      ratingCount: res.ratingCount,
      ratingSum: Math.round(res.ratingAverage * res.ratingCount),
      ratingDistribution: res.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    });
    setRatingToast(true);
    setTimeout(() => setRatingToast(false), 2500);

    const senderName = userProfile?.artistName || userProfile?.displayName || 'زائر المعرض';

    // Send offline email summary to artist if enabled
    if (artwork.userId && artwork.userId !== user?.uid) {
      const targetSettings = getArtistEmailSettings(artwork.userId);
      const targetEmail = artwork.artistEmail || targetSettings.artistEmail || 'artist@arabartgallery.com';
      if (targetSettings.enabled && targetSettings.notifyRatings && targetEmail) {
        sendEmailNotification({
          artistEmail: targetEmail,
          artistName: artwork.artistName || 'الفنان',
          interactionType: 'rating',
          senderName,
          artTitle: artwork.title,
          artId: artwork.id,
          artImageUrl: artwork.imageUrl,
          messageContent: `قام ${senderName} بتزويد عملك الفني "${artwork.title}" بتقييم قدره ${stars} نجوم! ⭐`
        }).catch(() => {});
      }
    }
  };

  const shareUrl = `${window.location.origin}/art/${artwork.id}`;

  const handleFavoriteToggle = async () => {
    if (!artwork) return;
    const newStatus = await toggleFavoriteArtwork(artwork, user?.uid, userProfile || undefined);
    setIsFav(newStatus);

    if (newStatus && artwork.userId && artwork.userId !== user?.uid) {
      const senderName = userProfile?.artistName || userProfile?.displayName || 'مستكشف الفنون';
      const targetSettings = getArtistEmailSettings(artwork.userId);
      const targetEmail = artwork.artistEmail || targetSettings.artistEmail || 'artist@arabartgallery.com';
      if (targetSettings.enabled && targetSettings.notifyFavorites && targetEmail) {
        sendEmailNotification({
          artistEmail: targetEmail,
          artistName: artwork.artistName || 'الفنان',
          interactionType: 'favorite',
          senderName,
          artTitle: artwork.title,
          artId: artwork.id,
          artImageUrl: artwork.imageUrl,
          messageContent: `قام ${senderName} بحفظ لوحتك "${artwork.title}" في قائمته المفضلة! 🔖`
        }).catch(() => {});
      }
    }
  };

  const handleLikeToggle = async () => {
    requireAuth('يرجى تسجيل الدخول للإعجاب بهذا العمل الفني', async () => {
      if (!user) return;

      setLikeAnimating(true);
      setTimeout(() => setLikeAnimating(false), 500);

      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikesCount((prev) => (newLikedState ? prev + 1 : Math.max(0, prev - 1)));

      try {
        await toggleLikeArtwork(artwork.id, user.uid, userProfile || undefined);

        if (newLikedState && artwork.userId && artwork.userId !== user.uid) {
          const senderName = userProfile?.artistName || userProfile?.displayName || 'فنان معارض';
          const targetSettings = getArtistEmailSettings(artwork.userId);
          const targetEmail = artwork.artistEmail || targetSettings.artistEmail || 'artist@arabartgallery.com';
          if (targetSettings.enabled && targetSettings.notifyLikes && targetEmail) {
            sendEmailNotification({
              artistEmail: targetEmail,
              artistName: artwork.artistName || 'الفنان',
              interactionType: 'like',
              senderName,
              artTitle: artwork.title,
              artId: artwork.id,
              artImageUrl: artwork.imageUrl,
              messageContent: `أبدى ${senderName} إعجابه بعملائك الفني الرائع "${artwork.title}" ❤️`
            }).catch(() => {});
          }
        }
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

      const textToComment = commentText;
      setSubmittingComment(true);
      try {
        await addArtworkComment(
          artwork.id,
          user.uid,
          userProfile.artistName || userProfile.displayName || 'فنان معارض',
          userProfile.photoURL || '',
          textToComment
        );
        setCommentText('');

        const senderName = userProfile.artistName || userProfile.displayName || 'فنان معارض';
        const trimmedComment = textToComment.trim();

        // Send offline email summary to artist if enabled
        if (artwork.userId && artwork.userId !== user.uid) {
          const targetSettings = getArtistEmailSettings(artwork.userId);
          const targetEmail = artwork.artistEmail || targetSettings.artistEmail || 'artist@arabartgallery.com';
          if (targetSettings.enabled && targetSettings.notifyComments && targetEmail) {
            sendEmailNotification({
              artistEmail: targetEmail,
              artistName: artwork.artistName || 'الفنان',
              interactionType: 'comment',
              senderName,
              artTitle: artwork.title,
              artId: artwork.id,
              artImageUrl: artwork.imageUrl,
              messageContent: `كتب ${senderName} تعليقاً جديداً: "${trimmedComment}"`
            }).catch(() => {});
          }
        }


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

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
        <div className="relative w-full max-w-5xl bg-[var(--bg-card)] rounded-3xl shadow-2xl border border-[var(--border-card)] text-right my-auto max-h-[90vh] md:max-h-[92vh] flex flex-col md:flex-row overflow-y-auto md:overflow-hidden custom-scrollbar">
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all shadow-md"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left / Top Side: Main Image Frame */}
          <div className="md:w-3/5 bg-slate-950 relative flex flex-col items-center justify-between p-3 sm:p-4 group overflow-y-auto min-h-0 max-h-full custom-scrollbar">
            <div 
              onClick={() => setIsLightboxOpen(true)}
              className="flex-1 flex items-center justify-center my-auto w-full p-2 cursor-pointer relative group/img"
              title="انقر لتكبير الصورة بملء الشاشة"
            >
              <ArtworkFrame
                src={highResUrl}
                alt={artwork.title}
                frameStyle={activeFrame}
                filterStyle={activeFilter}
                rotation={activeRotation}
                className="max-h-[45vh] md:max-h-[55vh]"
                imgClassName="max-h-[40vh] md:max-h-[50vh] w-auto object-contain shadow-2xl"
              />

              {/* Floating Mobile/Desktop Fullscreen Zoom Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(true);
                }}
                className="absolute top-3 right-3 z-30 min-w-[44px] min-h-[44px] p-2.5 rounded-full bg-black/75 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95"
                title="عرض ملء الشاشة (Fullscreen)"
              >
                <Maximize2 className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">تكبير الشاشة</span>
              </button>
            </div>

            {/* Frame & Filter Controls Bar */}
            <div className="w-full bg-black/70 backdrop-blur-md rounded-2xl p-2.5 border border-white/10 flex flex-col gap-2 z-10 mt-2">
              
              {/* Rotation & Lightbox Controls */}
              <div className="flex items-center justify-between gap-2 text-white text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <FrameIcon className="w-3.5 h-3.5 text-amber-400" />
                    الإطار والتأثيرات:
                  </span>
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 font-bold flex items-center gap-1 transition-all text-[11px]"
                    title="تدوير الصورة 90 درجة"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    تدوير ({activeRotation}°)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {canEditFrame && (
                    <button
                      type="button"
                      onClick={handleSaveFrameAndRotation}
                      disabled={isSavingFrame}
                      className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1 transition-all text-[11px] ${
                        saveSuccess 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                    >
                      {saveSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          تم الحفظ
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          {isSavingFrame ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                        </>
                      )}
                    </button>
                  )}

                  {/* Lightbox Trigger Button */}
                  <button
                    onClick={() => setIsLightboxOpen(true)}
                    className="bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl border border-white/10 flex items-center gap-1 transition-all"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    تكبير
                  </button>
                </div>
              </div>

              {/* Frames Selector Options */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
                <span className="text-[10px] font-bold text-amber-400 shrink-0">الإطارات:</span>
                {FRAME_OPTIONS.map((frameOpt) => (
                  <button
                    key={frameOpt.id}
                    type="button"
                    onClick={() => setActiveFrame(frameOpt.id)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all flex items-center gap-1.5 border ${
                      activeFrame === frameOpt.id
                        ? 'bg-white text-slate-900 border-white shadow-md scale-105'
                        : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${frameOpt.previewBg}`} />
                    {frameOpt.name}
                  </button>
                ))}
              </div>

              {/* Filters Selector Options */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin border-t border-white/10">
                <span className="text-[10px] font-bold text-sky-400 shrink-0">فلاتر الصورة:</span>
                {FILTER_OPTIONS.map((filterOpt) => (
                  <button
                    key={filterOpt.id}
                    type="button"
                    onClick={() => setActiveFilter(filterOpt.id)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all flex items-center gap-1 border ${
                      activeFilter === filterOpt.id
                        ? 'bg-sky-500 text-white border-sky-400 shadow-md scale-105'
                        : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {filterOpt.name}
                  </button>
                ))}
              </div>

              {/* Clear Delete Button Directly Under Image */}
              {canDelete && (
                <div className="pt-2 border-t border-white/10 w-full">
                  {!showConfirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(true)}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all border border-rose-400/30"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                      <span>حذف الصورة والعمل الفني نهائياً</span>
                    </button>
                  ) : (
                    <div className="p-3 rounded-2xl bg-rose-950/95 border border-rose-500/80 text-white space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-start gap-2 text-rose-200">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold leading-relaxed">
                          هل أنت متأكد من رغبتك في حذف هذه الصورة وهذا العمل الفني نهائياً؟ لن تتمكن من استرجاعه.
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-800/60">
                        <button
                          type="button"
                          onClick={() => setShowConfirmDelete(false)}
                          disabled={isDeleting}
                          className="px-3.5 py-1 rounded-xl bg-white/10 text-slate-200 text-xs font-bold hover:bg-white/20 transition-all"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={handleExecuteDelete}
                          disabled={isDeleting}
                          className="px-4 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                        >
                          {isDeleting ? (
                            <span>جاري الحذف...</span>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>نعم، تأكيد الحذف النهائي</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Right Side: Artwork Info & Interaction Panel */}
          <div className="md:w-2/5 p-5 sm:p-6 flex flex-col justify-between overflow-y-auto min-h-0 max-h-full space-y-6 custom-scrollbar">
            
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

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                    {artwork.category}
                  </span>
                </div>
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

              {/* Interactive Star Rating Box */}
              <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-amber-100 font-serif">
                      تقييم الزوار لهذا العمل الفني:
                    </span>
                  </div>
                  {ratingToast && (
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full animate-bounce">
                      تم حفظ تقييمك بنجاح! ✨
                    </span>
                  )}
                </div>

                <StarRating
                  ratingAverage={ratingMeta.ratingAverage}
                  ratingCount={ratingMeta.ratingCount}
                  userRating={userRating}
                  ratingDistribution={ratingMeta.ratingDistribution}
                  onRate={handleRate}
                  interactive={true}
                  size="lg"
                  showLabel={true}
                  showDistribution={true}
                />
              </div>

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

              {/* Like & Favorite & Social Share Bar */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-[var(--border-card)] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  
                  <div className="flex items-center gap-2">
                    {/* Like Button */}
                    <button
                      onClick={handleLikeToggle}
                      className={`px-3.5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all ${
                        isLiked
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                          : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600'
                      } ${likeAnimating ? 'scale-110' : ''}`}
                    >
                      <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-white' : 'text-rose-500'}`} />
                      <span>{likesCount}</span>
                    </button>

                    {/* Bookmark / Favorite Button */}
                    <button
                      onClick={handleFavoriteToggle}
                      className={`px-3.5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all border ${
                        isFav
                          ? 'bg-amber-500 text-white border-amber-400 shadow-md scale-105'
                          : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-600'
                      }`}
                      title={isFav ? 'إزالة من القائمة المفضلة' : 'حفظ في القائمة المفضلة'}
                    >
                      <Bookmark className={`w-4 h-4 sm:w-5 sm:h-5 ${isFav ? 'fill-white text-white' : 'text-amber-500'}`} />
                      <span>{isFav ? 'في المفضلة 🔖' : 'حفظ بالمفضلة'}</span>
                    </button>
                  </div>

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
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`شاهد العمل الفني "${artwork.title}" ${getArtistPrefix(artwork.category)} ${artwork.artistName}\n${shareUrl}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-[#25D366] text-white font-bold hover:bg-[#20bd5a] transition-all text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    واتساب
                  </a>

                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`العمل الفني "${artwork.title}" ${getArtistPrefix(artwork.category)} ${artwork.artistName}`)}`}
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
                        referrerPolicy="no-referrer"
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
                        {artwork.title} - {getArtistPrefix(artwork.category)} {artwork.artistName}
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

      {/* Enhanced Lightbox Fullscreen Modal */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[99999] w-screen h-screen h-[100dvh] bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 animate-in fade-in duration-300 select-none overflow-hidden"
          dir="rtl"
        >
          {/* Header Bar with Safe Touch Areas */}
          <div className="w-full flex items-center justify-between text-white z-50 gap-2 pb-2 border-b border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 overflow-hidden">
              <span className="text-sm font-bold font-serif line-clamp-1 text-amber-300">{artwork.title}</span>
              <span className="text-xs text-slate-400 font-sans truncate">({getArtistPrefix(artwork.category)}: {artwork.artistName})</span>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(z + 0.5, 3.5))}
                className="min-w-[44px] min-h-[44px] p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all shadow-md flex items-center justify-center"
                title="تكبير (Zoom in)"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(z - 0.5, 1))}
                className="min-w-[44px] min-h-[44px] p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all shadow-md flex items-center justify-center"
                title="تصغير (Zoom out)"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="min-w-[44px] min-h-[44px] p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all shadow-md text-xs font-bold flex items-center justify-center"
                title="إعادة التكبير (1:1)"
              >
                1:1
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLightboxOpen(false);
                  setZoomLevel(1);
                }}
                className="min-w-[44px] min-h-[44px] p-2.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white transition-all shadow-md flex items-center justify-center"
                title="إغلاق (Close)"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Main Image View Container with Mobile Touch Zoom */}
          <div 
            className="relative flex-1 w-full flex items-center justify-center overflow-auto my-2 p-2 custom-scrollbar touch-pan-x touch-pan-y"
            onDoubleClick={() => setZoomLevel((z) => (z > 1 ? 1 : 2))}
          >
            <ArtworkFrame
              src={artwork.imageUrl}
              alt={artwork.title}
              frameStyle={activeFrame}
              filterStyle={activeFilter}
              rotation={activeRotation}
              className="max-w-full max-h-full flex items-center justify-center"
              imgClassName="max-w-full max-h-[85vh] object-contain transition-transform duration-200 select-none shadow-2xl rounded-md cursor-zoom-in"
            />
          </div>

          {/* Footer Mobile Touch Guide */}
          <div className="w-full flex items-center justify-between text-xs text-slate-400 z-50 pt-2 border-t border-white/10">
            <span>انقر مرتين للتكبير / التصغير</span>
            <span className="font-bold text-amber-400">مستوى التكبير: {Math.round(zoomLevel * 100)}%</span>
          </div>
        </div>
      )}
    </>
  );
};
