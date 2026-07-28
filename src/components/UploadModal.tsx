import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadImageToCloudinary } from '../lib/cloudinary';
import { createArtwork, DEFAULT_CATEGORIES } from '../lib/artworks';
import { X, Upload, Image as ImageIcon, Sparkles, CheckCircle2, AlertCircle, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { ArtworkStatus } from '../types';

interface UploadModalProps {
  onSuccess?: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ onSuccess }) => {
  const { isUploadModalOpen, setIsUploadModalOpen, user, userProfile } = useAuth();

  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[1]); // Default 'لوحات فنية'
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [artistName, setArtistName] = useState(userProfile?.artistName || userProfile?.displayName || '');

  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isUploadModalOpen) return null;

  const isAdminOrOwner = userProfile?.role === 'admin' || userProfile?.role === 'owner';

  const handleFilesSelect = (selectedFileList: FileList | File[]) => {
    setError(null);
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    const fileArray = Array.from(selectedFileList);

    for (const selectedFile of fileArray) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('بعض الملفات ليست صوراً صالحة. تم اختيار الصور فقط (JPG, PNG, WebP)');
        continue;
      }
      if (selectedFile.size > 15 * 1024 * 1024) {
        setError('بعض الصور حجمها كبير جداً (أكثر من 15 ميجابايت) وتم استبعادها');
        continue;
      }
      validFiles.push(selectedFile);
    }

    if (validFiles.length === 0) return;

    // Append to existing files
    const updatedFiles = [...files, ...validFiles];
    setFiles(updatedFiles);

    // Generate previews
    let loadedCount = 0;
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        newPreviews.push(reader.result as string);
        loadedCount++;
        if (loadedCount === validFiles.length) {
          setPreviewUrls((prev) => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (files.length === 0) {
      setError('يرجى اختيار صورة واحدة على الأقل للعمل الفني');
      return;
    }
    if (!title.trim()) {
      setError('يرجى كتابة عنوان للعمل الفني');
      return;
    }
    if (!user || !userProfile) {
      setError('يرجى تسجيل الدخول لرفع الأعمال الفنية');
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);

    try {
      const tagsArray = tagsInput
        .split(/[,،\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      const targetStatus: ArtworkStatus = isAdminOrOwner ? 'approved' : 'pending';

      for (let i = 0; i < files.length; i++) {
        setUploadingIndex(i + 1);
        const currentFile = files[i];

        // Upload file to Cloudinary
        const cloudRes = await uploadImageToCloudinary(currentFile, (percent) => {
          const overallPercent = Math.round(((i + percent / 100) / files.length) * 100);
          setUploadProgress(Math.min(98, Math.max(5, overallPercent)));
        });

        // Determine item title
        let itemTitle = title.trim();
        if (files.length > 1) {
          itemTitle = `${title.trim()} (${i + 1})`;
        }

        // Save artwork document in Firestore
        await createArtwork({
          title: itemTitle,
          description: description.trim(),
          category,
          tags: tagsArray,
          imageUrl: cloudRes.secure_url,
          cloudinaryPublicId: cloudRes.public_id,
          artistName: artistName.trim() || userProfile.displayName || 'فنان معارض',
          userId: user.uid,
          userName: userProfile.displayName || 'فنان معارض',
          userPhoto: userProfile.photoURL || '',
          status: targetStatus
        });
      }

      setUploadProgress(100);

      if (isAdminOrOwner) {
        setSuccessMsg(
          files.length === 1
            ? 'تم نشر العمل الفني فوراً وبشكل مباشر في المعرض العام!'
            : `تم نشر جميع الأعمال الفنية (${files.length} أعمال) فوراً وبشكل مباشر في المعرض العام!`
        );
      } else {
        setSuccessMsg(
          files.length === 1
            ? 'تم رفع عملك الفني بنجاح! سينتقل العمل لمراجعة الإدارة وسينشر في المعرض العام فور اعتماده.'
            : `تم رفع ${files.length} أعمال بنجاح! ستنتقل لمراجعة الإدارة وستُنشر في المعرض العام فور اعتمادها.`
        );
      }

      setTimeout(() => {
        setIsUploadModalOpen(false);
        resetForm();
        if (onSuccess) onSuccess();
      }, 2500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء رفع الصور أو حفظ بيانات الأعمال');
    } finally {
      setIsUploading(false);
      setUploadingIndex(null);
    }
  };

  const resetForm = () => {
    setFiles([]);
    setPreviewUrls([]);
    setTitle('');
    setDescription('');
    setTagsInput('');
    setUploadProgress(0);
    setUploadingIndex(null);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-[var(--border-card)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">إضافة عمل فني جديد</h2>
              <p className="text-xs text-slate-500">رفع صورة منفردة أو مجموعة أعمال متعددة دفعة واحدة</p>
            </div>
          </div>

          {isAdminOrOwner && (
            <span className="self-start sm:self-auto text-[11px] font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              نشر مباشر بدون مراجعة
            </span>
          )}
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMsg}</span>
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
          {/* File Drag and Drop Zone / Previews */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                صور الأعمال الفنية <span className="text-rose-500">*</span>
              </label>
              {files.length > 0 && (
                <span className="text-xs font-bold text-[var(--color-primary)]">
                  تم اختيار {files.length} {files.length === 1 ? 'صورة' : 'صور'}
                </span>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => e.target.files && handleFilesSelect(e.target.files)}
              className="hidden"
            />

            {previewUrls.length === 0 ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 text-center cursor-pointer hover:border-[var(--color-primary)] dark:hover:border-[var(--color-primary)] bg-slate-50/50 dark:bg-slate-800/40 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] mx-auto flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  اسحب الصور هنا أو انقر لاختيار عمل واحد أو عدة أعمال
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  يمكنك تحديد عدة صور معاً (JPG, PNG, WebP حتى 15 ميجابايت للكل)
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-[var(--border-card)]">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-700 group">
                      <img src={url} alt={`معاينة ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="absolute top-1 left-1 p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-md"
                        title="حذف هذه الصورة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 rounded-2xl border border-dashed border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  إضافة صور أخرى للقائمة
                </button>
              </div>
            )}
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {files.length > 1 ? 'العنوان الأساسي للأعمال' : 'عنوان العمل الفني'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={files.length > 1 ? 'مثال: مجموعة لوحات الطبيعة' : 'مثال: غروب الشمس في الصحراء'}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              {files.length > 1 && (
                <p className="text-[10px] text-slate-400 mt-1">سيتم ترقيم الأعمال تلقائياً: {title || 'العنوان'} (1)، (2)، إلخ.</p>
              )}
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
              نبذة أو وصف مختصر
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
                <span>
                  {uploadingIndex
                    ? `جاري رفع العمل (${uploadingIndex} من ${files.length})...`
                    : 'جاري معالجة الصور...'}
                </span>
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
                {isAdminOrOwner
                  ? files.length > 1
                    ? `نشر المجمّعة (${files.length} أعمال) فوراً`
                    : 'نشر العمل الفني فوراً'
                  : files.length > 1
                  ? `إرسال المجمّعة (${files.length} أعمال) للمراجعة`
                  : 'إرسال العمل الفني للمراجعة'}
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
