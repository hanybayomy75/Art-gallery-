import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  fetchPendingArtworks, 
  fetchAllArtworksForAdmin, 
  updateArtworkStatus, 
  deleteArtwork, 
  toggleFeaturedArtwork 
} from '../lib/artworks';
import { 
  fetchContactMessages, 
  replyToContactMessage, 
  deleteContactMessage 
} from '../lib/contact';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { Artwork, UserProfile, UserRole, ContactMessage } from '../types';
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
  Reply
} from 'lucide-react';

interface AdminDashboardProps {
  onSelectArtwork: (art: Artwork) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSelectArtwork }) => {
  const { userProfile } = useAuth();

  const isOwner = userProfile?.role === 'owner';
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

      if (isOwner) {
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
    if (!window.confirm('هل أنت تأكد من حذف هذا العمل نهائيًا؟')) return;
    try {
      await deleteArtwork(artId);
      setPendingWorks((prev) => prev.filter((a) => a.id !== artId));
      setAllWorks((prev) => prev.filter((a) => a.id !== artId));
    } catch (err) {
      console.error(err);
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

  const handlePromoteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
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
    if (!isOwner) return;
    if (currentRole === 'owner') {
      alert('لا يمكن سحب صلاحيات مالك الموقع الأصلي!');
      return;
    }
    if (!window.confirm('هل تريد تحويل هذا المشرف إلى مستخدم عادي؟')) return;

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
    if (!window.confirm('هل تريد حذف هذه الرسالة؟')) return;
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

        {isOwner && (
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
                    <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden relative cursor-pointer" onClick={() => onSelectArtwork(art)}>
                      <img src={art.imageUrl} alt={art.title} className="w-full h-full object-cover" />
                      <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {art.category}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">{art.title}</h3>
                      <p className="text-xs text-slate-500">بقلم / {art.artistName} ({art.userName})</p>
                      {art.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                          {art.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-[var(--border-card)] flex items-center justify-between gap-2">
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
                  <img src={art.imageUrl} alt={art.title} className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-bold font-serif text-slate-900 dark:text-white truncate">{art.title}</h4>
                    <p className="text-xs text-slate-500 truncate">{art.artistName} • {art.category}</p>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                      art.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {art.status === 'approved' ? 'معتمد' : 'مرفوض'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border-card)] flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleToggleFeatured(art.id, !!art.isFeatured)}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 ${
                      art.isFeatured
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {art.isFeatured ? 'عمل مميز' : 'تمييز العمل'}
                  </button>

                  <button
                    onClick={() => handleDelete(art.id)}
                    className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="حذف العمل"
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

      {/* Tab 4: Users & Moderators Management (Owner Only) */}
      {activeTab === 'users' && isOwner && (
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

    </div>
  );
};
