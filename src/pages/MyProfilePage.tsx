import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUserArtworks, deleteArtwork, updatePendingArtworkData } from '../lib/artworks';
import { createOrUpdateUserProfile } from '../lib/firebase';
import { Artwork, ArtworkStatus } from '../types';
import { ArtworkCard } from '../components/ArtworkCard';
import { 
  User, 
  Edit3, 
  Heart, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Save, 
  Sparkles, 
  Layers,
  ShieldCheck,
  Upload
} from 'lucide-react';

interface MyProfilePageProps {
  onSelectArtwork: (art: Artwork) => void;
}

export const MyProfilePage: React.FC<MyProfilePageProps> = ({ onSelectArtwork }) => {
  const { user, userProfile, refreshProfile, setIsUploadModalOpen } = useAuth();

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingArtId, setDeletingArtId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setArtistName(userProfile.artistName || userProfile.displayName || '');
      setBio(userProfile.bio || '');
    }
  }, [userProfile]);

  const loadMyArtworks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchUserArtworks(user.uid);
      setArtworks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyArtworks();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    try {
      await createOrUpdateUserProfile(user, {
        displayName: displayName.trim(),
        artistName: artistName.trim(),
        bio: bio.trim()
      });
      await refreshProfile();
      setIsEditingProfile(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleConfirmDeleteArtwork = async (artId: string) => {
    setIsDeleting(true);
    try {
      await deleteArtwork(artId);
      setArtworks((prev) => prev.filter((a) => a.id !== artId));
      setDeletingArtId(null);
    } catch (err: any) {
      console.error('Error deleting artwork:', err);
      alert('حدث خطأ أثناء حذف الصورة: ' + (err?.message || 'يرجى إعادة المحاولة'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user || !userProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500">يرجى تسجيل الدخول للوصول إلى لوحة بياناتك الفنية</p>
      </div>
    );
  }

  // Totals calculations
  const totalLikes = artworks.reduce((acc, curr) => acc + (curr.likesCount || 0), 0);
  const totalApproved = artworks.filter((a) => a.status === 'approved').length;
  const totalPending = artworks.filter((a) => a.status === 'pending').length;
  const totalRejected = artworks.filter((a) => a.status === 'rejected').length;

  // Filter artworks by tab
  const filteredArtworks = artworks.filter((a) => {
    if (activeTab === 'pending') return a.status === 'pending';
    if (activeTab === 'approved') return a.status === 'approved';
    if (activeTab === 'rejected') return a.status === 'rejected';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 text-right">
      
      {/* Profile Header Card */}
      <div className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 border border-[var(--border-card)] shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-right">
            {userProfile.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-[var(--color-primary)]/30 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold text-3xl flex items-center justify-center ring-4 ring-[var(--color-primary)]/30 shadow-lg">
                {userProfile.artistName?.[0] || 'ف'}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
                  {userProfile.artistName || userProfile.displayName}
                </h1>
                {userProfile.role === 'owner' && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    مالك الموقع
                  </span>
                )}
                {userProfile.role === 'admin' && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-600 text-white flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    مشرف
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{userProfile.email}</p>
              {userProfile.bio && (
                <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 max-w-lg leading-relaxed">
                  {userProfile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Edit Profile Action */}
          <button
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="px-4 py-2.5 rounded-2xl border border-[var(--border-card)] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 transition-all shadow-sm"
          >
            <Edit3 className="w-4 h-4 text-[var(--color-primary)]" />
            تعديل بيانات الحساب
          </button>

        </div>

        {/* Edit Form Drawer */}
        {isEditingProfile && (
          <form onSubmit={handleSaveProfile} className="pt-6 border-t border-[var(--border-card)] space-y-4 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم كاملاً
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم الفنان / Pen Name
                </label>
                <input
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نبذة عن إبداعك الفني
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                حفظ التعديلات
              </button>
            </div>
          </form>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[var(--border-card)]">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-[var(--border-card)] text-center">
            <p className="text-2xl font-bold font-serif text-slate-900 dark:text-white">{artworks.length}</p>
            <p className="text-xs text-slate-500">إجمالي الأعمال المرفوعة</p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-center">
            <p className="text-2xl font-bold font-serif text-rose-600 dark:text-rose-400">{totalLikes}</p>
            <p className="text-xs text-rose-600/80">إجمالي الإعجابات المستلمة</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
            <p className="text-2xl font-bold font-serif text-emerald-600 dark:text-emerald-400">{totalApproved}</p>
            <p className="text-xs text-emerald-600/80">أعمال منشورة ومقبولة</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-center">
            <p className="text-2xl font-bold font-serif text-amber-600 dark:text-amber-400">{totalPending}</p>
            <p className="text-xs text-amber-600/80">أعمال قيد المراجعة</p>
          </div>
        </div>

      </div>

      {/* Artworks List Header & Tabs */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">معرض أعمالي الفنية</h2>
            <p className="text-xs text-slate-500">تابع حالة إعمالك الفنية وردود أفعال الجمهور عليها</p>
          </div>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white text-xs font-bold shadow-md flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            أضف عمل فني جديد
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 border-b border-[var(--border-card)] pb-3">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            الكل ({artworks.length})
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white'
                : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            قيد المراجعة ({totalPending})
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'approved'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            تم القبول والنشر ({totalApproved})
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'rejected'
                ? 'bg-rose-600 text-white'
                : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            مرفوض ({totalRejected})
          </button>
        </div>

        {/* Artworks List Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredArtworks.length === 0 ? (
          <div className="text-center py-12 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-card)] p-6 space-y-3">
            <Layers className="w-12 h-12 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد أعمال في هذا القسم</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredArtworks.map((art) => (
              <div key={art.id} className="relative flex flex-col space-y-2">
                <ArtworkCard
                  artwork={art}
                  onClick={() => onSelectArtwork(art)}
                  showStatusBadge={true}
                />

                {/* Callout box if artwork rejected */}
                {art.status === 'rejected' && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                    <p className="font-bold flex items-center gap-1 text-rose-600">
                      <AlertCircle className="w-3.5 h-3.5" />
                      سبب عدم القبول:
                    </p>
                    <p>{art.rejectionReason || 'العمل غير مطابق لسياسة الجودة أو الشروط الفنية للمعرض.'}</p>
                  </div>
                )}

                {/* Option to delete artwork */}
                {deletingArtId === art.id ? (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 space-y-2 animate-in fade-in duration-150">
                    <p className="font-bold text-center">تأكيد حذف هذا العمل نهائياً؟</p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDeletingArtId(null)}
                        disabled={isDeleting}
                        className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-300"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmDeleteArtwork(art.id)}
                        disabled={isDeleting}
                        className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm"
                      >
                        {isDeleting ? 'جاري الحذف...' : 'حذف نهائي'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingArtId(art.id);
                    }}
                    className="w-full py-1.5 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center justify-center gap-1 transition-all"
                    title="حذف هذه الصورة والعمل الفني نهائياً"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {art.status === 'pending' ? 'سحب العمل وحذفه' : 'حذف الصورة'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
};
