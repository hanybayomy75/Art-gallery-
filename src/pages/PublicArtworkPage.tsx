import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Artwork, ArtworkComment, FrameStyle, FilterStyle } from '../types';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ArtworkFrame, FRAME_OPTIONS } from '../components/ArtworkFrame';
import { StarRating } from '../components/StarRating';
import { SocialShareBar } from '../components/SocialShareBar';
import { 
  fetchArtworkById, 
  fetchApprovedArtworks, 
  checkIfUserLikedArtwork, 
  toggleLikeArtwork, 
  fetchArtworkComments, 
  addArtworkComment, 
  deleteArtworkComment, 
  incrementArtworkViews, 
  rateArtwork, 
  getUserArtworkRating, 
  getArtworkRatingMeta, 
  getArtistPrefix,
  getArtworkCategories
} from '../lib/artworks';
import { isArtworkFavorite, toggleFavoriteArtwork } from '../lib/favorites';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Copy, 
  Check, 
  Eye, 
  Maximize2, 
  Send, 
  Trash2, 
  Sparkles, 
  Tag, 
  RotateCw, 
  Frame as FrameIcon, 
  Star, 
  Bookmark, 
  ChevronRight, 
  ArrowRight, 
  ShieldCheck,
  Info,
  Grid,
  Home,
  X
} from 'lucide-react';

interface PublicArtworkPageProps {
  artworkId: string;
  onNavigateHome: () => void;
  onNavigateGallery: () => void;
  onSelectArtwork: (art: Artwork) => void;
  onSelectArtist?: (artistName: string) => void;
}

export const PublicArtworkPage: React.FC<PublicArtworkPageProps> = ({
  artworkId,
  onNavigateHome,
  onNavigateGallery,
  onSelectArtwork,
  onSelectArtist
}) => {
  const { user, userProfile, requireAuth } = useAuth();

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Interaction states
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [comments, setComments] = useState<ArtworkComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Rating states
  const [userRating, setUserRating] = useState<number>(0);
  const [ratingMeta, setRatingMeta] = useState({ ratingAverage: 0, ratingCount: 0 });

  // Customization & Lightbox
  const [frameStyle, setFrameStyle] = useState<FrameStyle>('none');
  const [filterStyle] = useState<FilterStyle>('normal');
  const [rotation, setRotation] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Related Approved Artworks
  const [artistArtworks, setArtistArtworks] = useState<Artwork[]>([]);
  const [similarArtworks, setSimilarArtworks] = useState<Artwork[]>([]);

  // Always reset window scroll position to top when artwork changes
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const rafId = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(rafId);
  }, [artworkId]);

  // Load artwork data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setNotFound(false);

    fetchArtworkById(artworkId).then((art) => {
      if (!isMounted) return;
      if (art && (art.status === 'approved' || !art.status)) {
        setArtwork(art);
        setLikesCount(art.likesCount || 0);
        setIsFavorite(isArtworkFavorite(art.id));
        setRatingMeta(getArtworkRatingMeta(art));
        setLoading(false);

        // Update document title for public view
        const artist = art.artistName || art.userName || 'فنان المعرض';
        const prefix = getArtistPrefix(art.category);
        document.title = `${art.title} - ${prefix} ${artist} | معرض الفنون`;

        // Increment page view counter once
        incrementArtworkViews(art.id);

        // Load liked state for current user
        if (user) {
          checkIfUserLikedArtwork(art.id, user.uid).then((liked) => {
            if (isMounted) setIsLiked(liked);
          });
          const r = getUserArtworkRating(art.id, user.uid);
          if (isMounted && r) setUserRating(r);
        }

        // Fetch related works by artist and similar category works
        fetchApprovedArtworks('الكل').then((allApproved) => {
          if (!isMounted) return;
          
          // Same artist approved works
          const artistNameClean = (art.artistName || art.userName || '').toLowerCase().trim();
          const artistWorks = allApproved.filter(
            (item) => item.id !== art.id && 
            (item.artistName?.toLowerCase().trim() === artistNameClean || 
             (item.userId && item.userId === art.userId))
          ).slice(0, 4);
          setArtistArtworks(artistWorks);

          // Similar category approved works
          const catWorks = allApproved.filter(
            (item) => item.id !== art.id && 
            item.category === art.category &&
            !artistWorks.some((aw) => aw.id === item.id)
          ).slice(0, 6);
          setSimilarArtworks(catWorks);
        });

      } else {
        setNotFound(true);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setNotFound(true);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [artworkId, user]);

  // Realtime comments listener
  useEffect(() => {
    if (!artworkId) return;

    const commentsRef = collection(db, 'artworks', artworkId, 'comments');
    const qComments = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      qComments,
      (snapshot) => {
        const list: ArtworkComment[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as ArtworkComment);
        });
        setComments(list);
      },
      (error) => {
        console.warn('Comments realtime subscription fallback:', error);
        fetchArtworkComments(artworkId).then(setComments);
      }
    );

    return () => unsubscribe();
  }, [artworkId]);

  // Inject Schema.org JSON-LD Structured Data for search engines
  useEffect(() => {
    if (!artwork) return;

    const scriptId = 'schema-jsonld-artwork';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = scriptId;
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }

    const artistName = artwork.artistName || artwork.userName || 'فنان المعرض';
    const jsonLdData = {
      '@context': 'https://schema.org',
      '@type': 'VisualArtwork',
      'name': artwork.title,
      'description': artwork.description || `${artwork.title} بريشة ${artistName}`,
      'image': artwork.imageUrl,
      'artMedium': artwork.category || 'لوحات فنية',
      'creator': {
        '@type': 'Person',
        'name': artistName
      },
      'aggregateRating': ratingMeta.ratingCount > 0 ? {
        '@type': 'AggregateRating',
        'ratingValue': ratingMeta.ratingAverage,
        'reviewCount': ratingMeta.ratingCount,
        'bestRating': '5',
        'worstRating': '1'
      } : undefined
    };

    scriptEl.text = JSON.stringify(jsonLdData);

    return () => {
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, [artwork, ratingMeta]);

  // Handle Like
  const handleToggleLike = async () => {
    if (!artwork) return;
    requireAuth('يرجى تسجيل الدخول للإعجاب بالأعمال الفنية', async () => {
      if (!user) return;
      const prevLiked = isLiked;
      const prevCount = likesCount;
      setIsLiked(!prevLiked);
      setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

      const success = await toggleLikeArtwork(
        artwork.id, 
        user.uid, 
        { displayName: userProfile?.displayName || user.email || 'مستخدم' }
      );

      if (!success) {
        setIsLiked(prevLiked);
        setLikesCount(prevCount);
      }
    });
  };

  // Handle Rating
  const handleRate = async (ratingVal: number) => {
    if (!artwork) return;
    setUserRating(ratingVal);
    const res = await rateArtwork(
      artwork.id, 
      ratingVal, 
      user?.uid, 
      userProfile ? { displayName: userProfile.displayName, photoURL: userProfile.photoURL } : undefined
    );
    if (res) {
      setRatingMeta({ ratingAverage: res.ratingAverage, ratingCount: res.ratingCount });
    }
  };

  // Handle Favorite Toggle
  const handleToggleFavorite = () => {
    if (!artwork) return;
    const newState = toggleFavoriteArtwork(artwork);
    setIsFavorite(newState);
  };

  // Handle Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artwork || !commentText.trim() || submittingComment) return;

    requireAuth('يرجى تسجيل الدخول لإضافة تعليق', async () => {
      if (!user) return;
      setSubmittingComment(true);
      try {
        await addArtworkComment(
          artwork.id,
          user.uid,
          userProfile?.displayName || user.displayName || 'مشارك بالفن',
          userProfile?.photoURL || user.photoURL || '',
          commentText.trim()
        );
        setCommentText('');
      } catch (e) {
        console.error('Error submitting comment:', e);
      } finally {
        setSubmittingComment(false);
      }
    });
  };

  // Handle Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    if (!artwork) return;
    if (window.confirm('هل انت متاكد من حذف هذا التعليق؟')) {
      await deleteArtworkComment(artwork.id, commentId);
    }
  };

  // Handle Copy Link
  const handleCopyPageUrl = () => {
    const fullUrl = window.location.href;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Social share URLs
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = artwork ? `${artwork.title} - ${getArtistPrefix(artwork.category)} ${artwork.artistName || artwork.userName || 'فنان المعرض'}` : '';

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center py-20 px-4">
        <div className="w-16 h-16 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 dark:text-slate-300 font-medium text-sm animate-pulse">
          جاري تحميل العمل الفني المعتمد...
        </p>
      </div>
    );
  }

  if (notFound || !artwork) {
    return (
      <div className="min-h-[70vh] max-w-3xl mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center mb-6">
          <Info className="w-10 h-10" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 dark:text-white mb-3">
          عذراً، هذا العمل الفني غير متوفر حالياً
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto mb-8 leading-relaxed">
          قد يكون العمل الفني تحت المراجعة أو تم نقله بواسطة صاحبه. يمكنك استكشاف العديد من الأعمال الفنية المعتمدة والمتميزة في المعرض العام.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onNavigateGallery}
            className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-md"
          >
            <Grid className="w-4 h-4" />
            <span>المعرض العام للأعمال المقبولة</span>
          </button>
          <button
            onClick={onNavigateHome}
            className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>الرئيسية</span>
          </button>
        </div>
      </div>
    );
  }

  const artistName = artwork.artistName || artwork.userName || 'فنان المعرض';
  const prefix = getArtistPrefix(artwork.category);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-20">
      
      {/* Top Header / Breadcrumbs Bar */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border-card)] sticky top-20 z-30 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center flex-wrap gap-2 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            <button 
              onClick={onNavigateHome}
              className="hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span>الرئيسية</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 rotate-180" />
            <button 
              onClick={onNavigateGallery}
              className="hover:text-[var(--color-primary)] transition-colors"
            >
              الأعمال المقبولة
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 rotate-180" />
            <span className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[180px] sm:max-w-xs">
              {artwork.title}
            </span>
          </nav>

          {/* Quick Action Badges */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>عمل فني معتمد</span>
            </span>

            <button
              onClick={handleCopyPageUrl}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all flex items-center gap-1.5 text-xs font-medium"
              title="نسخ رابط الصفحة العام"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">مشاركة الرابط</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        
        {/* Primary Artwork Presentation Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Interactive Artwork Stage (7/12 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[var(--bg-card)] rounded-3xl p-4 sm:p-6 border border-[var(--border-card)] shadow-md space-y-4">
              
              {/* Artwork Frame Wrapper */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950/5 dark:bg-slate-900/50 min-h-[380px] sm:min-h-[500px] flex items-center justify-center p-4">
                <ArtworkFrame
                  src={getOptimizedImageUrl(artwork.imageUrl, 1200)}
                  alt={artwork.title}
                  frameStyle={frameStyle}
                  filterStyle={filterStyle}
                  rotation={rotation}
                  className="max-h-[650px] w-auto max-w-full object-contain cursor-zoom-in transition-all duration-300"
                  onClick={() => setIsLightboxOpen(true)}
                />

                {/* Lightbox trigger overlay */}
                <button
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute bottom-4 left-4 p-2.5 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white backdrop-blur-md transition-all shadow-lg"
                  title="تكبير الصورة بالحجم الكامل"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>

              {/* Presentation Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-[var(--border-card)]">
                
                {/* Frame Selector */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-slate-500 font-semibold text-[11px] flex items-center gap-1 shrink-0">
                    <FrameIcon className="w-3.5 h-3.5" /> الإطار:
                  </span>
                  {FRAME_OPTIONS.slice(0, 5).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFrameStyle(f.id)}
                      className={`px-2.5 py-1 rounded-lg transition-all shrink-0 font-medium ${
                        frameStyle === f.id
                          ? 'bg-[var(--color-primary)] text-white shadow-sm font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>

                {/* Rotate button */}
                <button
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all flex items-center gap-1 font-medium text-xs"
                  title="تدوير الصورة"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>تدوير</span>
                </button>

              </div>

            </div>
          </div>

          {/* Right Column: Artwork Metadata & Actions (5/12 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 border border-[var(--border-card)] shadow-md space-y-6">
              
              {/* Category Tags & Category Links */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {getArtworkCategories(artwork).categories.map((catName) => (
                    <button
                      key={catName}
                      type="button"
                      onClick={() => onNavigateGallery && onNavigateGallery()}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold text-xs transition-colors"
                      title={`عرض كل الأعمال الفنية في تصنيف: ${catName}`}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      {catName}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1" title="عدد المشاهدات">
                    <Eye className="w-4 h-4 text-slate-400" />
                    <span>{artwork.viewsCount || 1} مشاهدة</span>
                  </span>
                </div>
              </div>

              {/* Title & Artist */}
              <div className="space-y-3">
                <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 dark:text-white leading-tight">
                  {artwork.title}
                </h1>

                {/* Artist Info Card */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
                      {artistName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                        {prefix}
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {artistName}
                      </p>
                    </div>
                  </div>

                  {onSelectArtist && (
                    <button
                      onClick={() => onSelectArtist(artistName)}
                      className="px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-[var(--color-primary)] hover:text-white transition-all text-xs font-bold"
                    >
                      تصفح الأعمال
                    </button>
                  )}
                </div>
              </div>

              {/* Interactive Rating Component */}
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    تقييم العمل الفني:
                  </span>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {ratingMeta.ratingAverage > 0 ? `${ratingMeta.ratingAverage} / 5 (${ratingMeta.ratingCount} تقييم)` : 'كن أول من يقيّم'}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <StarRating
                    ratingAverage={ratingMeta.ratingAverage}
                    ratingCount={ratingMeta.ratingCount}
                    userRating={userRating}
                    onRate={handleRate}
                    interactive={true}
                    size="md"
                  />
                  {userRating !== null && userRating > 0 && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                      تم تقييمك ({userRating} نجوم)
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {artwork.description && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    نبذة عن العمل الفني
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    {artwork.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {artwork.tags && artwork.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {artwork.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Primary Action Buttons (Like, Favorite, Share) */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleToggleLike}
                  className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
                    isLiked
                      ? 'bg-rose-500 text-white shadow-rose-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} />
                  <span>إعجاب ({likesCount})</span>
                </button>

                <button
                  onClick={handleToggleFavorite}
                  className={`p-3 rounded-2xl font-bold transition-all ${
                    isFavorite
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-amber-100 dark:hover:bg-amber-950/40'
                  }`}
                  title={isFavorite ? 'محفوظ في المفضلة' : 'حفظ في المفضلة'}
                >
                  <Bookmark className={`w-5 h-5 ${isFavorite ? 'fill-white' : ''}`} />
                </button>
              </div>

              {/* Social Share Bar */}
              <div className="pt-4 border-t border-[var(--border-card)] space-y-2">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" /> نشر العمل الفني على وسائل التواصل:
                </span>
                
                <SocialShareBar
                  shareUrl={shareUrl}
                  title={shareTitle}
                  artworkTitle={artwork.title}
                  artistName={artwork.artistName || artwork.userName || 'فنان المعرض'}
                  category={artwork.category}
                />
              </div>

            </div>

          </div>

        </div>

        {/* Section: Artist's Other Approved Works */}
        {artistArtworks.length > 0 && (
          <section className="space-y-6 pt-6 border-t border-[var(--border-card)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
                  أعمال معتمدة أخرى بريشة {artistName}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  استكشف بقية إبداعات هذا الفنان المعتمدة في المعرض
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {artistArtworks.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectArtwork(item)}
                  className="group bg-[var(--bg-card)] rounded-2xl overflow-hidden border border-[var(--border-card)] shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col"
                >
                  <div className="aspect-[4/3] relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <img
                      src={getOptimizedImageUrl(item.imageUrl, 500)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3 space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate">
                      {item.category || 'لوحات فنية'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section: Comments & Opinions */}
        <section className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 border border-[var(--border-card)] shadow-md space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[var(--color-primary)]" />
              التعليقات والآراء الفنية ({comments.length})
            </h3>
          </div>

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="space-y-3">
            <div className="relative">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={user ? "اكتب تعليقك أو رأيك النقدي حول العمل الفني..." : "يرجى تسجيل الدخول لإضافة تعليق..."}
                disabled={!user || submittingComment}
                rows={3}
                className="w-full p-4 text-xs sm:text-sm rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition-all resize-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!user || !commentText.trim() || submittingComment}
                className="absolute bottom-3 left-3 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white font-bold text-xs hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال</span>
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-3 pt-2">
            {comments.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-8">
                لا توجد تعليقات بعد. كن أول من يترك انطباعه عن هذا العمل الفني المميز!
              </p>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                      {c.userName ? c.userName.charAt(0) : 'م'}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {c.userName || 'زائر المعرض'}
                      </p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {c.comment || c.text}
                      </p>
                    </div>
                  </div>

                  {user && (user.uid === c.userId || userProfile?.role === 'admin' || userProfile?.role === 'owner') && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      title="حذف التعليق"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Section: Similar Approved Works */}
        {similarArtworks.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">
                  أعمال معتمدة من نفس الفئة ({artwork.category})
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  شاهد المزيد من الأعمال الفنية المعتمدة ضمن هذه الفئة
                </p>
              </div>

              <button
                onClick={onNavigateGallery}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
              >
                <span>تصفح الكل</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {similarArtworks.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectArtwork(item)}
                  className="group bg-[var(--bg-card)] rounded-2xl overflow-hidden border border-[var(--border-card)] shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col"
                >
                  <div className="aspect-square relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <img
                      src={getOptimizedImageUrl(item.imageUrl, 400)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2.5 space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate">
                      {item.artistName || item.userName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 left-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <img
            src={artwork.imageUrl}
            alt={artwork.title}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

    </div>
  );
};
