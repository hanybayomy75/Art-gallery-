import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  fetchPendingArtworks, 
  fetchAllArtworksForAdmin, 
  updateArtworkStatus, 
  deleteArtwork, 
  toggleFeaturedArtwork,
  updateArtworkData,
  DEFAULT_CATEGORIES
} from '../lib/artworks';
import { ArtworkFrame, FRAME_OPTIONS, FILTER_OPTIONS } from '../components/ArtworkFrame';
import { 
  fetchContactMessages, 
  replyToContactMessage, 
  deleteContactMessage 
} from '../lib/contact';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { Artwork, UserProfile, UserRole, ContactMessage, FrameStyle, FilterStyle } from '../types';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Trash2, 
  Users, 
  Clock, 
  Eye, 
  UserCheck, 
  UserMinus, 
  Mail,
  MessageSquare,
  ShieldCheck,
  Send,
  Reply,
  Edit,
  RotateCw,
  Frame as FrameIcon,
  X,
  Save,
  Tag
} from 'lucide-react';

interface AdminDashboardProps {
  onSelectArtwork: (art: Artwork) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSelectArtwork }) => {
  const { user, userProfile } = useAuth();

  const isOwner = userProfile?.role === 'owner' || user?.email?.toLowerCase() === 'hany.bayomy75@gmail.com';
  const isAdmin = userProfile?.role === 'admin' || isOwner;

  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'messages' | 'users'>('pending');
  
  const [pendingWorks, setPendingWorks] = useState<Artwork[]>([]);
  const [allWorks, setAllWorks] = useState<Artwork[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Rejection modal state
  const [rejectingArtId, setRejectingArtId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Deletion modal state
  const [deletingArtId, setDeletingArtId] = useState<string | null>(null);

  // Artwork Edit Modal State
  const [editingArt, setEditingArt] = useState<Artwork | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState(DEFAULT_CATEGORIES[1]);
  const [editFrame, setEditFrame] = useState<FrameStyle>('none');
  const [editFilter, setEditFilter] = useState<FilterStyle>('normal');
  const [editRotation, setEditRotation] = useState<number>(0);
  const [editTags, setEditTags] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // User management state
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [userMsg, setUserMsg] = useState<string | null>(null);

  // Message reply state
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const pending = await fetchPendingArtworks();
      setPendingWorks(pending);

      const all = await fetchAllArtworksForAdmin();
      setAllWorks(all);

      const msgs = await fetchContactMessages();
      setContactMessages(msgs);

      if (isAdmin) {
        const userSnap = await getDocs(collection(db, 'users'));
        const uList: UserProfile[] = [];
        userSnap.forEach((d) => uList.push(d.data() as UserProfile));
        setUsersList(uList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, isOwner]);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">غير مصرح بالوصول</h2>
        <p className="text-xs text-slate-500">هذه الصفحة مخصصة لمالك الموقع ومشرفي الإدارة فقط.</p>
      </div>
    );
  }

  const handleApprove = async (artId: string) => {
    try {
      await updateArtworkStatus(artId, 'approved');
      setPendingWorks((prev) => prev.filter((a) => a.id !== artId));
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingArtId) return;
    try {
      await updateArtworkStatus(rejectingArtId, 'rejected', rejectionReason.trim());
      setRejectingArtId(null);
      setRejectionReason('');
      setPendingWorks((prev) => prev.filter((a) => a.id !== rejectingArtId));
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (artId: string) => {
    try {
      await deleteArtwork(artId);
      setPendingWorks((prev) => prev.filter((a) => a.id !== artId));
      setAllWorks((prev) => prev.filter((a) => a.id !== artId));
      setDeletingArtId(null);
    } catch (err: any) {
      console.error('Error deleting artwork:', err);
      alert('حدث خطأ أثناء حذف العمل: ' + (err?.message || 'يرجى المحاولة مجددًا'));
    }
  };

  const handleToggleFeatured = async (artId: string, currentFeatured: boolean) => {
    try {
      await toggleFeaturedArtwork(artId, !currentFeatured);
      setAllWorks((prev) =>
        prev.map((a) => (a.id === artId ? { ...a, isFeatured: !currentFeatured } : a))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditModal = (art: Artwork) => {
    setEditingArt(art);
    setEditTitle(art.title || '');
    setEditDesc(art.description || '');
    setEditCategory(art.category || DEFAULT_CATEGORIES[1]);
    setEditFrame(art.frameStyle || 'none');
    setEditFilter(art.filterStyle || 'normal');
    setEditRotation(art.rotation || 0);
    setEditTags(art.tags ? art.tags.join(', ') : '');
  };

  const handleSaveArtworkEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArt) return;
    setIsSavingEdit(true);

    try {
      const tagsArray = editTags
        .split(/[,،\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      const updates: Partial<Artwork> = {
        title: editTitle.trim(),
        description: editDesc.trim(),
        category: editCategory,
        frameStyle: editFrame,
        filterStyle: editFilter,
        rotation: editRotation,
        tags: tagsArray
      };

      await updateArtworkData(editingArt.id, updates);

      // Update local state
      const updateList = (list: Artwork[]) =>
        list.map((item) => (item.id === editingArt.id ? { ...item, ...updates } : item));

      setAllWorks(updateList);
      setPendingWorks(updateList);
      setEditingArt(null);
    } catch (err) {
      console.error('Error updating artwork details:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleRotateArtworkQuick = async (art: Artwork) => {
    const nextRot = ((art.rotation || 0) + 90) % 360;
    try {
      await updateArtworkData(art.id, { rotation: nextRot });
      const updateList = (list: Artwork[]) =>
        list.map((item) => (item.id === art.id ? { ...item, rotation: nextRot } : item));

      setAllWorks(updateList);
      setPendingWorks(updateList);
    } catch (err) {
      console.error('Error rotating artwork:', err);
    }
  };

  const handlePromoteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setUserMsg(null);

    const targetEmail = newAdminEmail.trim().toLowerCase();
    if (!targetEmail) return;

    try {
      const q = query(collection(db, 'users'), where('email', '==', targetEmail));
      const snap = await getDocs(q);

      if (snap.empty) {
        setUserMsg('لم يتم العثور على مستخدم بهذا البريد الإلكتروني');
        return;
      }

      const targetDoc = snap.docs[0];
      const targetData = targetDoc.data() as UserProfile;

      if (targetData.role === 'owner') {
        setUserMsg('لا يمكن تغيير صلاحيات مالك الموقع الأصلي');
        return;
      }

      await updateDoc(doc(db, 'users', targetDoc.id), { role: 'admin' });
      setUserMsg(`تم تعيين ${targetData.displayName || targetEmail} كمشرف إداري بنجاح`);
      setNewAdminEmail('');
      loadData();
    } catch (err: any) {
      setUserMsg(err.message || 'حدث خطأ أثناء تعديل صلاحية المستخدم');
    }
  };

  const handleDemoteAdmin = async (uid: string, currentRole: UserRole) => {
    if (!isAdmin) return;
    if (currentRole === 'owner') {
      alert('لا يمكن سحب صلاحيات مالك الموقع الأصلي!');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', uid), { role: 'user' });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendReply = async (msgId: string) => {
    if (!replyText.trim()) return;
    try {
      await replyToContactMessage(msgId, replyText.trim());
      setReplyingMessageId(null);
      setReplyText('');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await deleteContactMessage(msgId);
      setContactMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error(err);
    }
  };

  const newMessagesCount = contactMessages.filter((m) => m.status === 'new').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-right">
      
      {/* Admin Dashboard Header */}
      <div className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 border border-[var(--border-card)] shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
              <h1 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">لوحة الإدارة والسيطرة</h1>
            </div>
            <p className="text-xs text-slate-500">
              مراجعة الأعمال الفنية، تحكم الاعتماد والنشر، متابعة رسائل التواصل، وإدارة المشرفين.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              صلاحية: {isOwner ? 'مالك الموقع (Owner)' : 'مشرف (Admin)'}
            </span>
          </div>
        </div>

        {/* KPI Summaries */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[var(--border-card)]">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 text-center">
            <p className="text-2xl font-bold font-serif text-amber-600">{pendingWorks.length}</p>
            <p className="text-xs text-amber-700/80 font-medium">أعمال قيد المراجعة</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 text-center">
            <p className="text-2xl font-bold font-serif text-emerald-600">
              {allWorks.filter((a) => a.status === 'approved').length}
            </p>
            <p className="text-xs text-emerald-700/80 font-medium">أعمال معتمدة ومنشورة</p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/50 text-center">
            <p className="text-2xl font-bold font-serif text-indigo-600">{newMessagesCount}</p>
            <p className="text-xs text-indigo-700/80 font-medium">رسائل تواصل جديدة</p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 text-center">
            <p className="text-2xl font-bold font-serif text-rose-600">
              {allWorks.filter((a) => a.status === 'rejected').length}
            </p>
            <p className="text-xs text-rose-700/80 font-medium">أعمال مرفوضة</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--border-card)] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          طابور المراجعة ({pendingWorks.length})
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'all'
              ? 'bg-[var(--color-primary)] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Eye className="w-4 h-4" />
          إدارة جميع الأعمال ({allWorks.length})
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'messages'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Mail className="w-4 h-4" />
          رسائل اتصل بنا {newMessagesCount > 0 && `(${newMessagesCount} جديدة)`}
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'users'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            إدارة المشرفين والمستخدمين ({usersList.length})
          </button>
        )}
      </div>

      {/* Tab 1: Pending Review Queue */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : pendingWorks.length === 0 ? (
            <div className="text-center py-16 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-card)] p-8 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">طابور المراجعة فارغ!</h3>
              <p className="text-xs text-slate-500">تمت مراجعة جميع الأعمال المرفوعة بنجاح.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingWorks.map((art) => (
                <div
                  key={art.id}
                  className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-card)] overflow-hidden shadow-md space-y-4 p-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden relative cursor-pointer flex items-center justify-center p-2" onClick={() => onSelectArtwork(art)}>
                      <ArtworkFrame
                        src={art.imageUrl}
                        alt={art.title}
                        frameStyle={art.frameStyle || 'none'}
                        rotation={art.rotation || 0}
                        imgClassName="max-h-full max-w-full object-contain"
                      />
                      <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                        {art.category}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">{art.title}</h3>
                        <button
                          onClick={() => handleOpenEditModal(art)}
                          className="px-2.5 py-1 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white text-xs font-bold transition-all flex items-center gap-1"
                          title="تعديل تفاصيل وقسم وإطار اللوحة"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          تعديل
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">بريشة الفنان / {art.artistName} ({art.userName})</p>
                      {art.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                          {art.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-[var(--border-card)] flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleRotateArtworkQuick(art)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1"
                        title="تدوير الصورة 90 درجة"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-amber-500" />
                        تدوير ({art.rotation || 0}°)
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(art)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1"
                      >
                        <FrameIcon className="w-3.5 h-3.5 text-indigo-500" />
                        الإطار ({FRAME_OPTIONS.find((f) => f.id === (art.frameStyle || 'none'))?.name})
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleApprove(art.id)}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        اعتماد ونشر
                      </button>

                      <button
                        onClick={() => setRejectingArtId(art.id)}
                        className="py-2 px-3 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 text-xs font-bold flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        رفض
                      </button>

                      <button
                        onClick={() => handleDelete(art.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="حذف نهائي"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Manage All Artworks */}
      {activeTab === 'all' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allWorks.map((art) => (
              <div
                key={art.id}
                className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-card)] p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-2xl bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center p-1 relative cursor-pointer" onClick={() => onSelectArtwork(art)}>
                    <ArtworkFrame
                      src={art.imageUrl}
                      alt={art.title}
                      frameStyle={art.frameStyle || 'none'}
                      rotation={art.rotation || 0}
                      imgClassName="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="overflow-hidden flex-1 space-y-1">
                    <h4 className="text-sm font-bold font-serif text-slate-900 dark:text-white truncate">{art.title}</h4>
                    <p className="text-xs text-slate-500 truncate">{art.artistName} • <span className="font-semibold text-[var(--color-primary)]">{art.category}</span></p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        art.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {art.status === 'approved' ? 'معتمد' : 'مرفوض'}
                      </span>
                      {art.rotation ? (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300 font-bold">
                          مدوّر {art.rotation}°
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border-card)] flex items-center justify-between gap-1 text-xs">
                  <button
                    onClick={() => handleToggleFeatured(art.id, !!art.isFeatured)}
                    className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 ${
                      art.isFeatured
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {art.isFeatured ? 'مميز' : 'تمييز'}
                  </button>

                  <button
                    onClick={() => handleRotateArtworkQuick(art)}
                    className="p-2 rounded-xl text-amber-600 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 transition-all"
                    title="تدوير الصورة 90 درجة"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(art)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white font-bold text-[11px] flex items-center gap-1 transition-all"
                    title="تعديل التفاصيل، التصنيف والإطار"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    تعديل
                  </button>

                  <button
                    onClick={() => handleDelete(art.id)}
                    className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="حذف العمل نهائياً"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Contact Us Messages */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-card)] p-6 space-y-4">
            <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              رسائل أصحاب الأعمال والزوار الواردة
            </h3>
            <p className="text-xs text-slate-500">
              يمكنك الاطلاع على استفسارات ورسائل المستخدمين والرد المباشر عليها.
            </p>

            {contactMessages.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                لا توجد رسائل تواصل في الوقت الحالي.
              </div>
            ) : (
              <div className="space-y-4">
                {contactMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-5 rounded-2xl border transition-all space-y-3 ${
                      msg.status === 'new'
                        ? 'border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-800'
                        : 'border-[var(--border-card)] bg-slate-50/50 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--border-card)] pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{msg.senderName}</h4>
                        <p className="text-xs text-slate-500 dir-ltr text-right">{msg.senderEmail}</p>
                        {msg.subject && (
                          <p className="text-xs font-semibold text-[var(--color-primary)] mt-1">الموضوع: {msg.subject}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          msg.status === 'unread'
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}>
                          {msg.status === 'unread' ? 'غير مقروءة' : 'تم الرد'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(msg.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-[var(--border-card)]">
                      {msg.message}
                    </p>

                    {msg.replyText && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs space-y-1">
                        <p className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <Reply className="w-3.5 h-3.5" />
                          رد الإدارة والمنشئ:
                        </p>
                        <p className="text-emerald-900 dark:text-emerald-200">{msg.replyText}</p>
                      </div>
                    )}

                    {/* Message Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => {
                          setReplyingMessageId(msg.id);
                          setReplyText(msg.replyText || '');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        {msg.replyText ? 'تعديل الرد' : 'إضافة رد'}
                      </button>

                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="حذف الرسالة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Inline Reply Form */}
                    {replyingMessageId === msg.id && (
                      <div className="mt-3 p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-[var(--border-card)] space-y-3">
                        <textarea
                          rows={3}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="اكتب ردك المباشر للزائر..."
                          className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setReplyingMessageId(null)}
                            className="px-3 py-1.5 rounded-xl text-xs text-slate-500"
                          >
                            إلغاء
                          </button>
                          <button
                            onClick={() => handleSendReply(msg.id)}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" />
                            حفظ الرد
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Users & Moderators Management */}
      {activeTab === 'users' && isAdmin && (
        <div className="space-y-6">
          {/* Add Admin Form */}
          <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-card)] space-y-4">
            <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              تعيين مشرف إداري جديد
            </h3>
            <p className="text-xs text-slate-500">
              أدخل البريد الإلكتروني للمستخدم المسجل لمنحه صلاحية المشرف (Admin) لمراجعة وقبول اللوحات.
            </p>

            {userMsg && (
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 text-xs font-semibold">
                {userMsg}
              </div>
            )}

            <form onSubmit={handlePromoteAdmin} className="flex gap-2">
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="ادخل البريد الإلكتروني للمستخدم..."
                className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md"
              >
                منح صلاحية مشرف
              </button>
            </form>
          </div>

          {/* Users List */}
          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-card)] p-6 space-y-4">
            <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">قائمة اعضاء المعرض والصلاحيات</h3>

            <div className="divide-y divide-[var(--border-card)]">
              {usersList.map((u) => (
                <div key={u.uid} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold flex items-center justify-center">
                      {u.artistName?.[0] || 'ف'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{u.artistName || u.displayName}</p>
                      <p className="text-[11px] text-slate-400">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                      u.role === 'owner' 
                        ? 'bg-amber-500 text-white' 
                        : u.role === 'admin' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {u.role === 'owner' ? 'مالك الموقع' : u.role === 'admin' ? 'مشرف الإدارة' : 'مستخدم'}
                    </span>

                    {u.role === 'admin' && (
                      <button
                        onClick={() => handleDemoteAdmin(u.uid, u.role)}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="سحب الصلاحيات"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal Input */}
      {rejectingArtId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] rounded-3xl p-6 max-w-md w-full border border-[var(--border-card)] space-y-4 text-right">
            <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-white">رفض نشر العمل الفني</h3>
            <p className="text-xs text-slate-500">اكتب سبب الرفض الموجه للفنان لمساعدته على تحسين عمله القادم:</p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="مثال: الصورة غير واضحة، أو غير مطابقة لتصنيف اللوحات..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectingArtId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Artwork Modal */}
      {editingArt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-[var(--border-card)] space-y-5 text-right relative my-8">
            <button
              onClick={() => setEditingArt(null)}
              className="absolute top-5 left-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-[var(--border-card)] pb-4">
              <Edit className="w-5 h-5 text-[var(--color-primary)]" />
              <div>
                <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-white">تعديل اللوحة الفنية والإطار</h3>
                <p className="text-xs text-slate-500">تحديث العنوان، التصنيف، الاتجاه، والإطار المخصص للوحة</p>
              </div>
            </div>

            <form onSubmit={handleSaveArtworkEdits} className="space-y-4">
              {/* Image Preview with Frame & Rotate Controls */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center gap-3">
                <div className="max-h-52 flex items-center justify-center p-2">
                  <ArtworkFrame
                    src={editingArt.imageUrl}
                    alt={editTitle}
                    frameStyle={editFrame}
                    filterStyle={editFilter}
                    rotation={editRotation}
                    imgClassName="max-h-44 w-auto object-contain shadow-xl"
                  />
                </div>

                <div className="flex items-center justify-between w-full pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-300 font-bold flex items-center gap-1">
                    <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                    تدوير الصورة:
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditRotation((prev) => (prev + 90) % 360)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    تدوير 90° ({editRotation}°)
                  </button>
                </div>
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">عنوان اللوحة</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">القسم والتصنيف الفني</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    {DEFAULT_CATEGORIES.filter((c) => c !== 'الكل').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Frame Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اختيار إطار العرض الجداري
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1">
                  {FRAME_OPTIONS.map((fOpt) => (
                    <button
                      key={fOpt.id}
                      type="button"
                      onClick={() => setEditFrame(fOpt.id)}
                      className={`p-2 rounded-2xl text-xs font-bold border flex items-center gap-2 transition-all text-right ${
                        editFrame === fOpt.id
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full shrink-0 ${fOpt.previewBg}`} />
                      <span className="truncate">{fOpt.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اختيار فلتر وتأثير اللوحة
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1">
                  {FILTER_OPTIONS.map((fOpt) => (
                    <button
                      key={fOpt.id}
                      type="button"
                      onClick={() => setEditFilter(fOpt.id)}
                      className={`p-2 rounded-2xl text-xs font-bold border flex items-center justify-between transition-all text-right ${
                        editFilter === fOpt.id
                          ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-2 ring-sky-500/30'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{fOpt.name}</span>
                      {editFilter === fOpt.id && <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">وصف العمل الفني</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الكلمات المفتاحية (التاجات)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="طبيعة، لوحة زيتية، ألوان..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-card)]">
                <button
                  type="button"
                  onClick={() => setEditingArt(null)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 rounded-2xl bg-[var(--color-primary)] text-white text-xs font-bold shadow-md hover:opacity-95 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {isSavingEdit ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
