export const CLOUDINARY_CLOUD_NAME = 'fdl4gjvt';
export const CLOUDINARY_UPLOAD_PRESET = 'gallery_upload';

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Compresses large images on the client side before uploading.
 * Reduces 10-15MB phone camera photos down to ~200KB-500KB in milliseconds,
 * dramatically accelerating upload speed without losing visual artistic quality.
 */
export async function compressImage(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.80
): Promise<File> {
  // If file is already small (< 400 KB) and not an oversized raw image, return directly
  if (file.size < 400 * 1024 && !file.type.includes('bmp') && !file.type.includes('tiff')) {
    return file;
  }

  return new Promise((resolve) => {
    // Safety timer to guarantee resolution within 2.5s even on slow devices
    const timeoutTimer = setTimeout(() => resolve(file), 2500);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize if dimensions exceed maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          clearTimeout(timeoutTimer);
          resolve(file); // fallback to original file if canvas ctx is null
          return;
        }

        // Fast image smoothing setup
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            clearTimeout(timeoutTimer);
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        clearTimeout(timeoutTimer);
        resolve(file);
      };
    };

    reader.onerror = () => {
      clearTimeout(timeoutTimer);
      resolve(file);
    };
  });
}

export async function uploadImageToCloudinary(
  file: File,
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResponse> {
  // Compress image client-side first for lightning-fast uploads (~200KB)
  const optimizedFile = await compressImage(file, 1600, 0.80);

  const attemptUpload = (currentFile: File, retriesLeft: number): Promise<CloudinaryUploadResponse> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

      const formData = new FormData();
      formData.append('file', currentFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      xhr.open('POST', url, true);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              secure_url: response.secure_url,
              public_id: response.public_id,
              width: response.width,
              height: response.height,
              format: response.format
            });
          } catch (err) {
            reject(new Error('خطأ في معالجة استجابة الخادم'));
          }
        } else if (retriesLeft > 0) {
          setTimeout(() => {
            attemptUpload(currentFile, retriesLeft - 1).then(resolve).catch(reject);
          }, 1000);
        } else {
          reject(new Error('فشل رفع الصورة إلى Cloudinary'));
        }
      };

      xhr.onerror = () => {
        if (retriesLeft > 0) {
          setTimeout(() => {
            attemptUpload(currentFile, retriesLeft - 1).then(resolve).catch(reject);
          }, 1000);
        } else {
          reject(new Error('حدث خطأ أثناء نقل الصورة عبر الشبكة. يرجى التحقق من الاتصال والمحاولة مجدداً'));
        }
      };

      xhr.send(formData);
    });
  };

  return attemptUpload(optimizedFile, 2);
}

/**
 * Generates an optimized Cloudinary thumbnail URL with custom width/height/crop
 */
export function getOptimizedImageUrl(
  urlOrPublicId: string,
  width: number = 800,
  height?: number,
  crop: string = 'c_limit'
): string {
  if (!urlOrPublicId) return '';
  if (!urlOrPublicId.includes('cloudinary.com')) {
    return urlOrPublicId;
  }

  // Insert transformations into Cloudinary URL
  const uploadIndex = urlOrPublicId.indexOf('/upload/');
  if (uploadIndex === -1) return urlOrPublicId;

  const transformString = height 
    ? `f_auto,q_auto,w_${width},h_${height},${crop}`
    : `f_auto,q_auto,w_${width},${crop}`;

  return urlOrPublicId.slice(0, uploadIndex + 8) + transformString + '/' + urlOrPublicId.slice(uploadIndex + 8);
}

/**
 * Generates an Open Graph social media sharing image URL (1200x630)
 * Uses pad or contain fit with blurred/art background to prevent cropping portrait/square artwork
 */
export function getSocialShareImageUrl(urlOrPublicId: string): string {
  if (!urlOrPublicId) return 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop';
  if (!urlOrPublicId.includes('cloudinary.com')) {
    return urlOrPublicId;
  }

  const uploadIndex = urlOrPublicId.indexOf('/upload/');
  if (uploadIndex === -1) return urlOrPublicId;

  // Transform: 1200x630, auto format, quality auto, c_pad, b_auto:predominant or blur
  const transformString = 'f_auto,q_auto,w_1200,h_630,c_pad,b_auto:predominant';

  return urlOrPublicId.slice(0, uploadIndex + 8) + transformString + '/' + urlOrPublicId.slice(uploadIndex + 8);
}
