import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadImageToCloudinary } from '../lib/cloudinary';
import { createArtwork, DEFAULT_CATEGORIES } from '../lib/artworks';
import { X, Upload, Image as ImageIcon, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface UploadModalProps {
  onSuccess?: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ onSuccess }) => {
  const { isUploadModalOpen, setIsUploadModalOpen, user, userProfile } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[1]); // Default 'لوحات فنية'
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [artistName, setArtistName] = useState(userProfile?.artistName || userProfile?.displayName || '');

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isUploadModalOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    if (!selectedFile.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالحة (JPG, PNG, WebP)');
      return;
    }
    if (selectedFile.size > 15 * 1024 * 1024) {
      setError('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 15 ميجابايت');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('يرجى اختيار صورة للعمل الفني');
      return;
    }
    if (!title.trim()) {
      setError('يرجى كتابة عنوان للعمل الفني');
      return;
    }
    if (!user || !userProfile) {
      setError('يرجى تسجيل الدخول لرفع عملك الفني');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // 1. Upload image to Cloudinary
      const cloudRes = await uploadImageToCloudinary(file, (percent) => {
        setUploadProgress(Math.min(90, Math.max(10, percent)));
      });

      setUploadProgress(95);

      // 2. Parse tags
      const tagsArray = tagsInput
        .split(/[,،\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      // 3. Save to Firestore with status 'pending'
      await createArtwork({
        title: title.trim(),
        description: description.trim(),
        category,
        tags: tagsArray,
        imageUrl: cloudRes.secure_url,
        cloudinaryPublicId: cloudRes.public_id,
        artistName: artistName.trim() || userProfile.displayName || 'فنان معارض',
        userId: user.uid,
        userName: userProfile.displayName || 'فنان معارض',
        userPhoto: userProfile.photoURL || ''
      });

      setUploadProgress(100);
      setSuccessMsg('تم رفع عملك الفني بنجاح! سينتقل العمل لمراجعة الإدارة وسينشر في المعرض العام فور اعتماده.');

      setTimeout(() => {
        setIsUploadModalOpen(false);
        resetForm();
        if (onSuccess) onSuccess();
      }, 2500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء رفع الصورة أو حفظ بيانات العمل');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreviewUrl(null);
    setTitle('');
    setDescription('');
    setTagsInput('');
    setUploadProgress(0);
    setError(null);
    setSuccessMsg(null);
  };

  const filteredCategories = DEFAULT_CATEGORIES.filter((c) => c !== 'الكل');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[var(--bg-card)] rounded-3xl shadow-2xl border border-[var(--border-card)] p-6 sm:p-8 text-right my-8">
        
        {/* Close Button */}
        <button
          onClick={() => {
            if (!isUploading) {
              setIsUploadModalOpen(false);
              resetForm();
            }
          }}
          className="absolute top-5 left-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">إضافة عمل فني جديد</h2>
            <p className="text-xs text-slate-500">شارك إبداعك الفني مع جمهور معرض الفنون</p>
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
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* File Drag and Drop Zone / Preview */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              صورة العمل الفني <span className="text-rose-500">*</span>
            </label>

            {!previewUrl ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 text-center cursor-pointer hover:border-[var(--color-primary)] dark:hover:border-[var(--color-primary)] bg-slate-50/50 dark:bg-slate-800/40 transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] mx-auto flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  اسحب صورة العمل الفني هنا أو انقر للاختيار
                </p>
                <p className="text-xs text-slate-400 mt-1">يدعم صيغ JPG, PNG, WebP حتى 15 ميجابايت</p>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-[var(--border-card)] bg-slate-900 aspect-video max-h-64 flex items-center justify-center group">
                <img src={previewUrl} alt="معاينة الصورة" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-3 left-3 bg-rose-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow-md hover:bg-rose-700 transition-all"
                >
                  تغيير الصورة
                </button>
              </div>
            )}
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                عنوان العمل الفني <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: غروب الشمس في الصحراء"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                اسم الفنان / صاحب العمل
              </label>
              <input
                type="text"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="اسمك الفني الذي سيظهر للجمهور"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                التصنيف الفني <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {filteredCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                كلمات مفتاحية (تاجات اختيارية)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="ألوان زاهية، طبيعة، ألوان مائية..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              نبذة أو وصف مختصر للعمل
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب القصة أو الأدوات المستخدمة أو شعورك أثناء رسم هذا العمل..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>جاري معالجة الصورة ونقلها إلى Cloudinary...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={isUploading || !!successMsg}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold text-base shadow-xl hover:opacity-95 transition-all flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                إرسال العمل الفني للمراجعة
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
