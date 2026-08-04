import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  fetchPendingArtworks, 
  fetchAllArtworksForAdmin, 
  updateArtworkStatus, 
  deleteArtwork, 
  toggleFeaturedArtwork,
  updateArtworkData,
  DEFAULT_CATEGORIES,
  getArtworkCategories
} from '../lib/artworks';
import {
  subscribeToCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus
} from '../lib/categories';
import { ArtworkFrame, FRAME_OPTIONS, FILTER_OPTIONS } from '../components/ArtworkFrame';
import { 
  fetchContactMessages, 
  replyToContactMessage, 
  deleteContactMessage 
} from '../lib/contact';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { addAppNotification } from '../lib/notifications';
import { Artwork, UserProfile, UserRole, ContactMessage, FrameStyle, FilterStyle, CategoryItem } from '../types';
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
  Tag,
  HeartHandshake,
  SendHorizontal,
  BellRing,
  FolderTree,
  Plus,
  Layers,
  EyeOff,
  AlertTriangle,
  Search,
  Check,
  ChevronDown
} from 'lucide-react';

const WELCOME_PRESETS = [
  {
    id: 'standard',
    label: '🎨 رسالة الترحيب القياسية (جاهزة بضغطة زر)',
    title: '🎨 أهلاً وسهلاً بك في معرض الفنون العربية!',
    message: 'أهلاً وسهلاً بك يا فناننا المبدع! نرحب بك في مجتمع معرض الفنون العربية. يمكنك الآن رفع لوحاتك وأعمالك الفنية والتفاعل مع القراء والمبدعين من خلال التعليقات والتقييمات وحفظ المفضلة. نتمنى لك رحلة فنية ملهمة ورائعة!'
  },
  {
    id: 'upload',
    label: '🖼️ دعوة لنشر العمل الفني الأول',
    title: '🖼️ المعرض بانتظار إبداعك الأول!',
    message: 'مرحباً بك! يسعد مالك وإدارة معرض الفنون العربية دعوتك لنشر أولى لوحاتك الفنية أو صورك اليوم ليراها زوار المعرض ويتفاعلوا معها.'
  },
  {
    id: 'appreciation',
    label: '🌟 شكر وتقدير من مالك وإدارة المعرض',
    title: '🌟 شكر وتقدير من إدارة المعرض',
    message: 'عزيزي المشترك، نتقدم لك بخالص الشكر والتقدير لانضمامك وتفاعلك في المنصة. نحن هنا دائمًا لدعم مسيرتك الفنية وإبراز أعمالك بأرقى صورة.'
  },
  {
    id: 'features',
    label: '🔔 جديد المميزات والتحديثات',
    title: '🔔 ميزات جديدة في المعرض!',
    message: 'تم إضافة ميزات تفاعلية جديدة في المعرض تشمل العرض بكامل الشاشة والتكبير العالي والإطارات الفنية. تصفح المعرض واستمتع بالتجربة!'
  }
];

interface AdminDashboardProps {
  onSelectArtwork: (art: Artwork) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSelectArtwork }) => {
  const { user, userProfile } = useAuth();

  const isOwner = userProfile?.role === 'owner' || user?.email?.toLowerCase() === 'hany.bayomy75@gmail.com';
  const isAdmin = userProfile?.role === 'admin' || isOwner;

  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'categories' | 'messages' | 'users'>('pending');
  
  const [pendingWorks, setPendingWorks] = useState<Artwork[]>([]);
  const [allWorks, setAllWorks] = useState<Artwork[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Categories management state
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryGroupFilter, setCategoryGroupFilter] = useState('الكل');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [catFormName, setCatFormName] = useState('');
  const [catFormGroup, setCatFormGroup] = useState('لوحات وفنون تشكيلية');
  const [catFormDesc, setCatFormDesc] = useState('');
  const [catFormSortOrder, setCatFormSortOrder] = useState<number>(0);
  const [catFormIsActive, setCatFormIsActive] = useState<boolean>(true);
  const [catFormError, setCatFormError] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [deletingCatError, setDeletingCatError] = useState<string | null>(null);

  // Subscribe to categories
  useEffect(() => {
    const unsub = subscribeToCategories((cats) => {
      setCategoriesList(cats);
    }, true); // include hidden
    return () => unsub();
  }, []);

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

  // Welcome & Admin Message Modal state
  const [welcomeTargetUser, setWelcomeTargetUser] = useState<UserProfile | 'all' | null>(null);
  const [welcomeTitle, setWelcomeTitle] = useState(WELCOME_PRESETS[0].title);
  const [welcomeMsgContent, setWelcomeMsgContent] = useState(WELCOME_PRESETS[0].message);
  const [isSendingWelcome, setIsSendingWelcome] = useState(false);
  const [welcomeSuccess, setWelcomeSuccess] = useState<string | null>(null);

  const handleOpenWelcomeModal = (target: UserProfile | 'all') => {
    setWelcomeTargetUser(target);
    setWelcomeTitle(WELCOME_PRESETS[0].title);
    setWelcomeMsgContent(WELCOME_PRESETS[0].message);
    setWelcomeSuccess(null);
  };

  const handleApplyPreset = (presetId: string) => {
    const found = WELCOME_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setWelcomeTitle(found.title);
      setWelcomeMsgContent(found.message);
    }
  };

  const handleSendWelcomeMessage = async () => {
    if (!welcomeTargetUser || !welcomeTitle.trim() || !welcomeMsgContent.trim()) return;
    setIsSendingWelcome(true);
    setWelcomeSuccess(null);

    try {
      const actorName = userProfile?.artistName || userProfile?.displayName || 'مالك المعرض';
      const actorUserId = user?.uid || 'admin';

      if (welcomeTargetUser === 'all') {
        const promises = usersList.map((u) =>
          addAppNotification({
            recipientUserId: u.uid,
            type: 'system',
            title: welcomeTitle.trim(),
            message: welcomeMsgContent.trim(),
            actorName,
            actorUserId
          })
        );
        await Promise.all(promises);
        setWelcomeSuccess(`تم إرسال الرسالة بنجاح إلى جميع أعضاء المعرض (${usersList.length} مشترك)`);
      } else {
        await addAppNotification({
          recipientUserId: welcomeTargetUser.uid,
          type: 'system',
          title: welcomeTitle.trim(),
          message: welcomeMsgContent.trim(),
          actorName,
          actorUserId
        });
        setWelcomeSuccess(`تم إرسال الرسالة بنجاح إلى ${welcomeTargetUser.artistName || welcomeTargetUser.displayName}`);
      }

      setTimeout(() => {
        setWelcomeTargetUser(null);
        setWelcomeSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error('Error sending welcome notification:', err);
      alert('حدث خطأ أثناء إرسال الإشعار الترحيبي');
    } finally {
      setIsSendingWelcome(false);
    }
  };

  const handleQuickSendWelcomeInstant = async (targetUser: UserProfile) => {
    const preset = WELCOME_PRESETS[0];
    const actorName = userProfile?.artistName || userProfile?.displayName || 'مالك المعرض';
    const actorUserId = user?.uid || 'admin';

    try {
      await addAppNotification({
        recipientUserId: targetUser.uid,
        type: 'system',
        title: preset.title,
        message: preset.message,
        actorName,
        actorUserId
      });
      setUserMsg(`✨ تم إرسال الرسالة الترحيبية الجاهزة فوراً إلى ${targetUser.artistName || targetUser.displayName}`);
      setTimeout(() => setUserMsg(null), 3500);
    } catch (err) {
      console.error(err);
    }
  };

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
      const handleRefresh = () => loadData();
      window.addEventListener('artwork_changed', handleRefresh);
      window.addEventListener('artwork_uploaded', handleRefresh);
      return () => {
        window.removeEventListener('artwork_changed', handleRefresh);
        window.removeEventListener('artwork_uploaded', handleRefresh);
      };
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

  const handleDelete = async (artId: string, imageUrl?: string) => {
    try {
      await deleteArtwork(artId, imageUrl);
      setPendingWorks((prev) => prev.filter((a) => a.id !== artId && a.imageUrl !== imageUrl));
      setAllWorks((prev) => prev.filter((a) => a.id !== artId && a.imageUrl !== imageUrl));
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

  // Category Handlers
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCatFormName('');
    setCatFormGroup('لوحات وفنون تشكيلية');
    setCatFormDesc('');
    setCatFormSortOrder(categoriesList.length + 1);
    setCatFormIsActive(true);
    setCatFormError(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCatFormName(cat.name);
    setCatFormGroup(cat.group || 'لوحات وفنون تشكيلية');
    setCatFormDesc(cat.description || '');
    setCatFormSortOrder(cat.sortOrder ?? 0);
    setCatFormIsActive(cat.isActive ?? true);
    setCatFormError(null);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormName.trim()) {
      setCatFormError('يرجى إدخال اسم التصنيف');
      return;
    }
    setIsSavingCategory(true);
    setCatFormError(null);

    try {
      let res;
      if (editingCategory) {
        res = await updateCategory(
          editingCategory.id,
          {
            name: catFormName.trim(),
            group: catFormGroup.trim(),
            description: catFormDesc.trim(),
            sortOrder: Number(catFormSortOrder),
            isActive: catFormIsActive
          },
          categoriesList
        );
      } else {
        res = await addCategory(
          {
            name: catFormName.trim(),
            group: catFormGroup.trim(),
            description: catFormDesc.trim(),
            sortOrder: Number(catFormSortOrder),
            isActive: catFormIsActive
          },
          user?.uid || 'admin',
          categoriesList
        );
      }

      if (!res.success) {
        setCatFormError(res.message || 'تعذر حفظ التصنيف');
      } else {
        setIsCategoryModalOpen(false);
      }
    } catch (err: any) {
      setCatFormError(err.message || 'حدث خطأ أثناء حفظ التصنيف');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategoryItem = async (cat: CategoryItem) => {
    setDeletingCatError(null);

    if (!confirm(`هل أنت تأكد من إزالة التصنيف "${cat.name}"؟`)) return;

    try {
      const res = await deleteCategory(cat);
      if (!res.success) {
        setDeletingCatError(res.message || 'تعذر حذف التصنيف');
      }
    } catch (err: any) {
      setDeletingCatError(err.message || 'حدث خطأ أثناء حذف التصنيف');
    }
  };

  const handleToggleCategoryActive = async (cat: CategoryItem) => {
    try {
      await toggleCategoryStatus(cat.id, cat.isActive);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تغيير حالة التصنيف');
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
          onClick={() => setActiveTab('categories')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'categories'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          نظام التصنيفات ({categoriesList.length})
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

      {/* Tab 2.5: Dynamic Categories Management */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Categories Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 text-center">
              <p className="text-2xl font-bold font-serif text-amber-600">{categoriesList.length}</p>
              <p className="text-xs text-amber-700/80 font-medium">إجمالي التصنيفات</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 text-center">
              <p className="text-2xl font-bold font-serif text-emerald-600">
                {categoriesList.filter((c) => c.isActive !== false).length}
              </p>
              <p className="text-xs text-emerald-700/80 font-medium">تصنيفات نشطة</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
              <p className="text-2xl font-bold font-serif text-slate-600 dark:text-slate-300">
                {categoriesList.filter((c) => c.isActive === false).length}
              </p>
              <p className="text-xs text-slate-500 font-medium">تصنيفات مخفية</p>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/50 text-center">
              <p className="text-2xl font-bold font-serif text-indigo-600">
                {new Set(categoriesList.map((c) => c.group || 'لوحات وفنون تشكيلية')).size}
              </p>
              <p className="text-xs text-indigo-700/80 font-medium">المجموعات الرئيسية</p>
            </div>
          </div>

          {/* Delete Warning Banner */}
          {deletingCatError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start justify-between gap-3 text-rose-800 dark:text-rose-200 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <p className="text-xs font-bold leading-relaxed">{deletingCatError}</p>
              </div>
              <button
                onClick={() => setDeletingCatError(null)}
                className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Control Bar: Search, Group Filter, Add Button */}
          <div className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-3xl border border-[var(--border-card)] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute top-3 right-3 text-slate-400" />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="البحث في التصنيفات..."
                  className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              {/* Filter Group */}
              <select
                value={categoryGroupFilter}
                onChange={(e) => setCategoryGroupFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="الكل">جميع المجموعات</option>
                {Array.from(new Set(categoriesList.map((c) => c.group || 'لوحات وفنون تشكيلية'))).map((grp) => (
                  <option key={grp} value={grp}>{grp}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleOpenCreateCategory}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة تصنيف جديد</span>
            </button>
          </div>

          {/* Categories Grid / List */}
          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-card)] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-card)]">
              <h3 className="text-sm font-bold font-serif text-slate-900 dark:text-white flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-amber-500" />
                قائمة التصنيفات الابتدائية والديناميكية
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                تحديث تلقائي من Firestore
              </span>
            </div>

            {categoriesList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                جاري تحميل التصنيفات أو لا توجد تصنيفات معرفة بعد.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoriesList
                  .filter((cat) => {
                    const matchesSearch =
                      !categorySearch ||
                      cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                      (cat.description && cat.description.toLowerCase().includes(categorySearch.toLowerCase()));
                    const matchesGroup =
                      categoryGroupFilter === 'الكل' || (cat.group || 'لوحات وفنون تشكيلية') === categoryGroupFilter;
                    return matchesSearch && matchesGroup;
                  })
                  .map((cat) => {
                    const usageCount = allWorks.filter((a) => {
                      const { categories } = getArtworkCategories(a);
                      return categories.includes(cat.name) || a.category === cat.name;
                    }).length;

                    return (
                      <div
                        key={cat.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          cat.isActive !== false
                            ? 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80'
                            : 'bg-slate-100/50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 font-bold">
                                <Tag className="w-4 h-4" />
                              </span>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  {cat.name}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-mono dir-ltr block">
                                  {cat.slug || cat.id}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                cat.isActive !== false
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                              }`}
                            >
                              {cat.isActive !== false ? 'نشط' : 'مخفي'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {cat.description || 'لا يوجد وصف محدد لهذا التصنيف.'}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                              {cat.group || 'لوحات وفنون تشكيلية'}
                            </span>
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              {usageCount} عمل
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleCategoryActive(cat)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                cat.isActive !== false
                                  ? 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              }`}
                              title={cat.isActive !== false ? 'إخفاء التصنيف من المعرض' : 'تفعيل وإظهار التصنيف'}
                            >
                              {cat.isActive !== false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>

                            <button
                              onClick={() => handleOpenEditCategory(cat)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              title="تعديل التصنيف"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteCategoryItem(cat)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="حذف التصنيف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
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
          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-card)] p-6 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border-card)] pb-4">
              <div>
                <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[var(--color-primary)]" />
                  قائمة أعضاء المعرض والصلاحيات
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  يمكن لمالك والمشرفين إرسال رسائل ترحيبية فورية أو تنبيهات إدارية مخصصة للأعضاء والمشاركين الجدد.
                </p>
              </div>

              <button
                onClick={() => handleOpenWelcomeModal('all')}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-95 shrink-0"
              >
                <HeartHandshake className="w-4 h-4" />
                إرسال ترحيب جماعي لجميع الأعضاء
              </button>
            </div>

            <div className="divide-y divide-[var(--border-card)]">
              {usersList.map((u) => (
                <div key={u.uid} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      {u.artistName?.[0] || u.displayName?.[0] || 'ف'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{u.artistName || u.displayName}</p>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          u.role === 'owner' 
                            ? 'bg-amber-500 text-white' 
                            : u.role === 'admin' 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          {u.role === 'owner' ? 'مالك الموقع' : u.role === 'admin' ? 'مشرف الإدارة' : 'فنان / مشترك'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                    {/* Send Instant Ready Welcome Button */}
                    <button
                      onClick={() => handleQuickSendWelcomeInstant(u)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[11px] flex items-center gap-1.5 transition-all"
                      title="إرسال رسالة ترحيبية جاهزة فوراً بضغطة زر واحدة"
                    >
                      <HeartHandshake className="w-3.5 h-3.5" />
                      ترحيب جاهز (بضغطة زر)
                    </button>

                    {/* Send Custom Message Button */}
                    <button
                      onClick={() => handleOpenWelcomeModal(u)}
                      className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold text-[11px] flex items-center gap-1.5 transition-all"
                      title="تخصيص وكتابة رسالة ترحيبية أو إشعار للمشارك"
                    >
                      <SendHorizontal className="w-3.5 h-3.5" />
                      رسالة مخصصة
                    </button>

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

      {/* Admin Welcome & Custom Notification Modal */}
      {welcomeTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-[var(--border-card)] space-y-5 text-right relative my-8 shadow-2xl">
            <button
              onClick={() => setWelcomeTargetUser(null)}
              className="absolute top-5 left-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-white">
                  إرسال رسالة ترحيبية / إشعار مخصص
                </h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                  المستلم:{' '}
                  {welcomeTargetUser === 'all'
                    ? `جميع أعضاء ومشاركي المعرض (${usersList.length} مشترك)`
                    : `${welcomeTargetUser.artistName || welcomeTargetUser.displayName} (${welcomeTargetUser.email})`}
                </p>
              </div>
            </div>

            {welcomeSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>{welcomeSuccess}</span>
              </div>
            )}

            {/* Ready Presets Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                اختر رسالة جاهزة بضغطة زر واحدة (أو قم بتعديلها):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {WELCOME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.id)}
                    className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                      welcomeTitle === preset.title
                        ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xs font-bold line-clamp-1">{preset.label}</span>
                    <span className="text-[10px] opacity-75 line-clamp-2 mt-1 font-sans">{preset.message}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Title Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                عنوان الإشعار
              </label>
              <input
                type="text"
                value={welcomeTitle}
                onChange={(e) => setWelcomeTitle(e.target.value)}
                placeholder="أدخل عنوان الرسالة الترحيبية..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
              />
            </div>

            {/* Notification Message Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                نص الرسالة الترحيبية الموجهة
              </label>
              <textarea
                rows={4}
                value={welcomeMsgContent}
                onChange={(e) => setWelcomeMsgContent(e.target.value)}
                placeholder="اكتب نص الرسالة الترحيبية أو التنبيه الإداري هنا..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white leading-relaxed"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[var(--border-card)]">
              <button
                type="button"
                onClick={() => setWelcomeTargetUser(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={isSendingWelcome}
                onClick={handleSendWelcomeMessage}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <SendHorizontal className="w-4 h-4" />
                {isSendingWelcome ? 'جاري إرسال الإشعار...' : 'إرسال الإشعار الترحيبي الفوري'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Add/Edit Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[var(--border-card)] space-y-5 text-right relative shadow-2xl">
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute top-5 left-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <FolderTree className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-white">
                  {editingCategory ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
                </h3>
                <p className="text-xs text-slate-500">
                  إدارة وتخصيص التصنيفات الابتدائية والديناميكية للمعرض دون الحاجة إلى تعديل الكود.
                </p>
              </div>
            </div>

            {catFormError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{catFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم التصنيف <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={catFormName}
                  onChange={(e) => setCatFormName(e.target.value)}
                  placeholder="مثال: لوحات تجريدية، تصوير بورتريه، خط ديواني..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              {/* Group */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  المجموعة الرئيسية
                </label>
                <div className="space-y-2">
                  <select
                    value={catFormGroup}
                    onChange={(e) => setCatFormGroup(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value="لوحات وفنون تشكيلية">لوحات وفنون تشكيلية</option>
                    <option value="خط عربي وزخرفة">خط عربي وزخرفة</option>
                    <option value="تصوير فوتوغرافي">تصوير فوتوغرافي</option>
                    <option value="تصميم وجرافيك">تصميم وجرافيك</option>
                    <option value="فنون رسم رقمي">فنون رسم رقمي</option>
                    <option value="تصنيفات أخرى">تصنيفات أخرى</option>
                  </select>

                  <input
                    type="text"
                    value={catFormGroup}
                    onChange={(e) => setCatFormGroup(e.target.value)}
                    placeholder="أو اكتب اسم مجموعة جديدة..."
                    className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  وصف التصنيف (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={catFormDesc}
                  onChange={(e) => setCatFormDesc(e.target.value)}
                  placeholder="وصف مختصر يوضح نوعية الأعمال المندرجة تحت هذا التصنيف..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Sort Order & Active Toggle */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ترتيب الظهور
                  </label>
                  <input
                    type="number"
                    value={catFormSortOrder}
                    onChange={(e) => setCatFormSortOrder(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    حالة التصنيف
                  </label>
                  <button
                    type="button"
                    onClick={() => setCatFormIsActive(!catFormIsActive)}
                    className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      catFormIsActive
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                    }`}
                  >
                    {catFormIsActive ? <Check className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4" />}
                    <span>{catFormIsActive ? 'نشط في المعرض' : 'مخفي من القوائم'}</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--border-card)]">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSavingCategory ? 'جاري الحفظ...' : editingCategory ? 'تحديث التصنيف' : 'حفظ التصنيف الجديد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
