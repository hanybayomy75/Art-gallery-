import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendContactMessage } from '../lib/contact';
import { X, Send, Mail, User, CheckCircle2, AlertCircle, PhoneCall } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const { user, userProfile } = useAuth();

  const [name, setName] = useState(userProfile?.artistName || userProfile?.displayName || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('يرجى إدخال الاسم الكامل');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('يرجى إدخال بريد إلكتروني صحيح للتواصل معك');
      return;
    }
    if (!message.trim()) {
      setErrorMsg('يرجى كتابة نص الرسالة');
      return;
    }

    setLoading(true);
    try {
      await sendContactMessage({
        senderName: name.trim(),
        senderEmail: email.trim(),
        message: message.trim(),
        userId: user?.uid,
      });

      setSuccessMsg('تم إرسال رسالتك بنجاح! سيقوم منشئ وإدارة الموقع (م. هاني بيومي) بالرد عليك في أقرب وقت.');
      setMessage('');
      
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة لاحقًا.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-3xl shadow-2xl border border-[var(--border-card)] p-6 sm:p-8 text-right">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">اتصل بنا</h2>
            <p className="text-xs text-slate-500">تواصل مباشر مع منشئ وإدارة معرض الفنون</p>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              الاسم الكامل <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسمك الكامل..."
                className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              البريد الإلكتروني <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@domain.com"
                className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              رسالتك أو استفسارك <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب رسالتك، اقتراحك، أو استفسارك الفني هنا..."
                className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !!successMsg}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold text-xs shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                إرسال الرسالة إلى إدارة الموقع
              </>
            )}
          </button>
        </form>

        {/* Creator Info Footer */}
        <div className="mt-6 pt-4 border-t border-[var(--border-card)] text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            إعداد المهندس هاني بيومي
          </p>
          <p className="font-mono text-xs text-[var(--color-primary)] dir-ltr font-bold">01276502639</p>
        </div>

      </div>
    </div>
  );
};
