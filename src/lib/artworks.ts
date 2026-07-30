import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  limit, 
  runTransaction, 
  increment
} from 'firebase/firestore';
import { db } from './firebase';
import { Artwork, ArtworkComment, ArtworkStatus, SortOption } from '../types';

export const DEFAULT_CATEGORIES = [
  'الكل',
  'لوحات فنية',
  'رسم يدوي',
  'رسم رقمي',
  'تصوير فوتوغرافي',
  'فن معماري',
  'مناظر طبيعية',
  'بورتريه',
  'أعمال تجريدية',
  'أعمال أخرى',
];

export const ARTWORK_CATEGORIES = DEFAULT_CATEGORIES.filter(
  (c) => c !== 'الكل'
);

const LOCAL_STORAGE_KEY = 'local_user_uploaded_artworks';

export function getLocalUserArtworks(): Artwork[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const list: Artwork[] = JSON.parse(raw);
    let modified = false;

    // Deduplicate list by imageUrl / title and ensure statuses are valid
    const seenUrls = new Set<string>();
    const cleaned: Artwork[] = [];

    for (const art of list) {
      if (!art || !art.id) continue;
      
      let updatedArt = { ...art };
      if (updatedArt.status === 'pending') {
        updatedArt.status = 'approved';
        modified = true;
      }

      const urlKey = updatedArt.imageUrl ? updatedArt.imageUrl.trim() : updatedArt.id;
      if (!seenUrls.has(urlKey)) {
        seenUrls.add(urlKey);
        cleaned.push(updatedArt);
      } else {
        modified = true;
      }
    }

    if (modified) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (e) {
    return [];
  }
}

export function saveLocalUserArtwork(art: Artwork): void {
  try {
    const existing = getLocalUserArtworks();
    const artUrlKey = art.imageUrl ? art.imageUrl.trim() : '';
    const updated = [
      art,
      ...existing.filter((item) => {
        if (item.id === art.id) return false;
        if (artUrlKey && item.imageUrl && item.imageUrl.trim() === artUrlKey) return false;
        return true;
      })
    ];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Notice: Could not cache artwork locally:', e);
  }
}

export function removeLocalUserArtwork(artId: string, imageUrl?: string): void {
  try {
    const existing = getLocalUserArtworks();
    const artUrlKey = imageUrl ? imageUrl.trim() : '';
    const updated = existing.filter((item) => {
      if (item.id === artId) return false;
      if (artUrlKey && item.imageUrl && item.imageUrl.trim() === artUrlKey) return false;
      return true;
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Notice: Could not remove artwork locally:', e);
  }
}

export function notifyArtworkChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('artwork_changed'));
    window.dispatchEvent(new Event('artwork_uploaded'));
  }
}

export async function fetchApprovedArtworks(
  categoryFilter: string = 'الكل',
  searchQuery: string = '',
  sortOption: SortOption = 'newest',
  limitCount: number = 100,
  currentUserId?: string
): Promise<Artwork[]> {
  const localList = getLocalUserArtworks();
  const userUploadedMap = new Map<string, Artwork>();

  // Load local artworks first
  localList.forEach((art) => {
    if (art && art.id && art.status !== 'rejected') {
      userUploadedMap.set(art.id, art);
    }
  });

  // Fetch from Firestore
  try {
    const artworksRef = collection(db, 'artworks');
    const snap = await getDocs(artworksRef);
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Artwork;
      const artObj = { id: docSnap.id, ...data };
      if (data.status !== 'rejected') {
        userUploadedMap.set(docSnap.id, artObj);
        saveLocalUserArtwork(artObj);
      }
    });
  } catch (error) {
    console.warn('Notice: Error fetching Firestore artworks:', error);
  }

  const userUploadedList = Array.from(userUploadedMap.values());
  userUploadedList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  let finalCombined: Artwork[] = [...userUploadedList];

  // Clean and validate category filter
  const cleanFilter = (categoryFilter || 'الكل').trim();
  let effectiveCategory = cleanFilter;

  if (
    effectiveCategory !== 'الكل' && 
    effectiveCategory !== 'أعمال الفنانين المرفوعة' && 
    !DEFAULT_CATEGORIES.includes(effectiveCategory)
  ) {
    effectiveCategory = 'الكل';
  }

  if (effectiveCategory !== 'الكل' && effectiveCategory !== 'أعمال الفنانين المرفوعة') {
    finalCombined = finalCombined.filter((art) => {
      const artCat = (art.category || '').trim();
      if (artCat === effectiveCategory) return true;
      if (art.tags?.some((t) => (t || '').trim() === effectiveCategory)) return true;
      if (effectiveCategory === 'لوحات فنية' && (!ARTWORK_CATEGORIES.includes(artCat) || artCat === 'لوحات فنية')) return true;
      return false;
    });
  }

  // Client-side featured filter
  if (sortOption === 'featured') {
    const featuredOnly = finalCombined.filter((art) => art.isFeatured);
    if (featuredOnly.length > 0) {
      finalCombined = featuredOnly;
    }
  }

  // Client-side search query filtering
  if (searchQuery.trim()) {
    const qLower = searchQuery.toLowerCase().trim();
    finalCombined = finalCombined.filter((art) => 
      art.title?.toLowerCase().includes(qLower) ||
      art.artistName?.toLowerCase().includes(qLower) ||
      art.description?.toLowerCase().includes(qLower) ||
      art.tags?.some((t) => t.toLowerCase().includes(qLower))
    );
  }

  // Client-side sorting
  if (sortOption === 'likes') {
    finalCombined.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  } else if (sortOption === 'comments') {
    finalCombined.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
  } else if (sortOption === 'rating') {
    finalCombined.sort((a, b) => {
      const aMeta = getArtworkRatingMeta(a);
      const bMeta = getArtworkRatingMeta(b);
      return (bMeta.ratingAverage - aMeta.ratingAverage) || (bMeta.ratingCount - aMeta.ratingCount);
    });
  } else if (sortOption === 'newest') {
    finalCombined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  // Deduplicate by artwork ID & imageUrl
  const uniqueMap = new Map<string, Artwork>();
  const seenImageUrls = new Set<string>();

  finalCombined.forEach((art) => {
    if (art && art.id) {
      const enriched = enrichArtworkRating(art);
      const urlKey = enriched.imageUrl ? enriched.imageUrl.trim() : enriched.id;
      if (!uniqueMap.has(enriched.id) && !seenImageUrls.has(urlKey)) {
        uniqueMap.set(enriched.id, enriched);
        seenImageUrls.add(urlKey);
      }
    }
  });

  return Array.from(uniqueMap.values()).slice(0, limitCount);
}

export async function fetchArtworkById(artId: string): Promise<Artwork | null> {
  const localList = getLocalUserArtworks();
  const localArt = localList.find((item) => item.id === artId);
  if (localArt) return localArt;

  try {
    const artDoc = await getDoc(doc(db, 'artworks', artId));
    if (artDoc.exists()) {
      return { id: artDoc.id, ...artDoc.data() } as Artwork;
    }
    return null;
  } catch (error) {
    console.error('Error fetching artwork by id:', error);
    return null;
  }
}

export async function fetchUserArtworks(userId: string, userDisplayName?: string): Promise<Artwork[]> {
  const userMap = new Map<string, Artwork>();

  const localList = getLocalUserArtworks();
  localList.forEach((a) => {
    if (
      !a.userId || 
      a.userId === userId || 
      (userDisplayName && (a.userName === userDisplayName || a.artistName === userDisplayName))
    ) {
      userMap.set(a.id, a);
    }
  });

  try {
    const snap = await getDocs(collection(db, 'artworks'));
    snap.forEach((d) => {
      const data = d.data() as Artwork;
      if (
        data.userId === userId || 
        (!data.userId && userDisplayName && (data.userName === userDisplayName || data.artistName === userDisplayName))
      ) {
        const artObj = { id: d.id, ...data };
        userMap.set(d.id, artObj);
        saveLocalUserArtwork(artObj);
      }
    });
  } catch (error) {
    console.warn('Notice: Error fetching user artworks from Firestore:', error);
  }

  const list = Array.from(userMap.values());
  list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // Deduplicate user artworks by imageUrl / ID
  const uniqueUserMap = new Map<string, Artwork>();
  const seenUrls = new Set<string>();
  list.forEach((art) => {
    const key = art.imageUrl ? art.imageUrl.trim() : art.id;
    if (!uniqueUserMap.has(art.id) && !seenUrls.has(key)) {
      uniqueUserMap.set(art.id, art);
      seenUrls.add(key);
    }
  });
  return Array.from(uniqueUserMap.values());
}

export async function fetchPendingArtworks(): Promise<Artwork[]> {
  const pendingMap = new Map<string, Artwork>();

  getLocalUserArtworks()
    .filter((a) => a.status === 'pending')
    .forEach((a) => pendingMap.set(a.id, a));

  try {
    const snap = await getDocs(collection(db, 'artworks'));
    snap.forEach((d) => {
      const data = d.data() as Artwork;
      if (data.status === 'pending') {
        pendingMap.set(d.id, { id: d.id, ...data });
      }
    });
  } catch (error) {
    console.error('Error fetching pending artworks:', error);
  }

  const list = Array.from(pendingMap.values());
  return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export async function fetchAllArtworksForAdmin(): Promise<Artwork[]> {
  const adminMap = new Map<string, Artwork>();

  getLocalUserArtworks().forEach((a) => adminMap.set(a.id, a));

  try {
    const snap = await getDocs(collection(db, 'artworks'));
    snap.forEach((d) => adminMap.set(d.id, { id: d.id, ...d.data() } as Artwork));
  } catch (error) {
    console.error('Error fetching all artworks for admin:', error);
  }

  const list = Array.from(adminMap.values());
  return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export async function createArtwork(
  data: Omit<Artwork, 'id' | 'likesCount' | 'commentsCount' | 'createdAt'> & { status?: ArtworkStatus }
): Promise<string> {
  const newArtworkData = {
    ...data,
    status: data.status || ('pending' as ArtworkStatus),
    rejectionReason: '',
    isFeatured: false,
    likesCount: 0,
    commentsCount: 0,
    viewsCount: 0,
    createdAt: new Date().toISOString()
  };

  const id = `local-art-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const createdArt: Artwork = { id, ...newArtworkData };
  
  // Save locally IMMEDIATELY so artwork appears instantly without network delay
  saveLocalUserArtwork(createdArt);
  notifyArtworkChange();

  // Attempt Firestore sync in background with a 2s timeout
  try {
    const addDocPromise = addDoc(collection(db, 'artworks'), newArtworkData);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore write timeout')), 2000)
    );
    const docRef = await Promise.race([addDocPromise, timeoutPromise]);
    if (docRef && docRef.id) {
      removeLocalUserArtwork(id);
      const serverArt: Artwork = { id: docRef.id, ...newArtworkData };
      saveLocalUserArtwork(serverArt);
      notifyArtworkChange();
      return docRef.id;
    }
  } catch (err) {
    console.warn('Notice: Created artwork saved locally (Firestore write timed out or offline):', err);
  }

  return id;
}

export async function updateArtworkStatus(
  artId: string, 
  status: ArtworkStatus, 
  rejectionReason: string = ''
): Promise<void> {
  if (!artId || artId.startsWith('wm-') || artId.startsWith('sample-')) return;

  const localList = getLocalUserArtworks();
  const found = localList.find((a) => a.id === artId);
  if (found) {
    saveLocalUserArtwork({
      ...found,
      status,
      rejectionReason: status === 'rejected' ? rejectionReason : ''
    });
  }

  try {
    const artRef = doc(db, 'artworks', artId);
    await updateDoc(artRef, {
      status,
      rejectionReason: status === 'rejected' ? rejectionReason : ''
    });
  } catch (error) {
    console.warn('Notice: Failed to update artwork status (client offline):', error);
  }
  notifyArtworkChange();
}

export async function toggleFeaturedArtwork(artId: string, isFeatured: boolean): Promise<void> {
  if (!artId || artId.startsWith('wm-') || artId.startsWith('sample-')) return;
  const localList = getLocalUserArtworks();
  const found = localList.find((a) => a.id === artId);
  if (found) {
    saveLocalUserArtwork({ ...found, isFeatured });
  }
  try {
    const artRef = doc(db, 'artworks', artId);
    await updateDoc(artRef, { isFeatured });
  } catch (error) {
    console.warn('Notice: Failed to toggle featured state (client offline):', error);
  }
  notifyArtworkChange();
}

export async function updatePendingArtworkData(
  artId: string, 
  updates: Partial<Artwork>
): Promise<void> {
  if (!artId || artId.startsWith('wm-') || artId.startsWith('sample-')) return;
  const localList = getLocalUserArtworks();
  const found = localList.find((a) => a.id === artId);
  if (found) {
    saveLocalUserArtwork({ ...found, ...updates });
  }
  try {
    const artRef = doc(db, 'artworks', artId);
    await updateDoc(artRef, updates);
  } catch (error) {
    console.warn('Notice: Failed to update artwork data (client offline):', error);
  }
  notifyArtworkChange();
}

export const updateArtworkData = updatePendingArtworkData;

export async function deleteArtwork(artId: string, imageUrl?: string): Promise<void> {
  if (!artId) return;
  removeLocalUserArtwork(artId, imageUrl);

  if (!artId.startsWith('wm-') && !artId.startsWith('sample-')) {
    try {
      const deletePromise = deleteDoc(doc(db, 'artworks', artId));
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));
      await Promise.race([deletePromise, timeoutPromise]);
    } catch (error) {
      console.warn('Notice: Could not delete artwork in Firestore:', error);
    }
  }

  notifyArtworkChange();
}

// Like System
export async function checkIfUserLikedArtwork(artId: string, userId: string): Promise<boolean> {
  if (!userId || !artId || artId.startsWith('wm-') || artId.startsWith('sample-')) return false;
  try {
    const likeDoc = await getDoc(doc(db, 'artworks', artId, 'likes', userId));
    return likeDoc.exists();
  } catch (error) {
    console.warn('Notice: Failed to check like status (client offline or doc missing):', error);
    return false;
  }
}

export async function toggleLikeArtwork(artId: string, userId: string): Promise<boolean> {
  if (!artId || !userId || artId.startsWith('wm-') || artId.startsWith('sample-')) return false;
  try {
    const artRef = doc(db, 'artworks', artId);
    const likeRef = doc(db, 'artworks', artId, 'likes', userId);

    return await runTransaction(db, async (transaction) => {
      const likeDoc = await transaction.get(likeRef);
      if (likeDoc.exists()) {
        // Remove like
        transaction.delete(likeRef);
        transaction.update(artRef, { likesCount: increment(-1) });
        return false;
      } else {
        // Add like
        transaction.set(likeRef, { userId, createdAt: new Date().toISOString() });
        transaction.update(artRef, { likesCount: increment(1) });
        return true;
      }
    });
  } catch (err) {
    console.warn('Notice: Failed to toggle like (client offline):', err);
    return false;
  }
}

// Comments System
export async function fetchArtworkComments(artId: string): Promise<ArtworkComment[]> {
  if (!artId || artId.startsWith('wm-') || artId.startsWith('sample-')) return [];
  try {
    const commentsRef = collection(db, 'artworks', artId, 'comments');
    const snap = await getDocs(commentsRef);
    const list: ArtworkComment[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (!data.isHidden) {
        list.push({ id: d.id, ...data } as ArtworkComment);
      }
    });
    return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch (error) {
    console.warn('Notice: Error fetching comments (client offline):', error);
    return [];
  }
}

export async function addArtworkComment(
  artId: string,
  userId: string,
  userName: string,
  userPhoto: string,
  text: string
): Promise<void> {
  if (!text.trim() || !artId || artId.startsWith('wm-') || artId.startsWith('sample-')) return;

  try {
    const commentsRef = collection(db, 'artworks', artId, 'comments');
    const artRef = doc(db, 'artworks', artId);

    await addDoc(commentsRef, {
      artId,
      userId,
      userName,
      userPhoto: userPhoto || '',
      text: text.trim().slice(0, 500),
      createdAt: new Date().toISOString(),
      isHidden: false
    });

    await updateDoc(artRef, { commentsCount: increment(1) });
  } catch (err) {
    console.warn('Notice: Failed to add comment (client offline):', err);
  }
}

export async function deleteArtworkComment(artId: string, commentId: string): Promise<void> {
  if (!artId || artId.startsWith('wm-') || artId.startsWith('sample-')) return;
  try {
    const commentRef = doc(db, 'artworks', artId, 'comments', commentId);
    const artRef = doc(db, 'artworks', artId);

    await deleteDoc(commentRef);
    await updateDoc(artRef, { commentsCount: increment(-1) });
  } catch (err) {
    console.warn('Notice: Failed to delete comment (client offline):', err);
  }
}

export async function incrementArtworkViews(artId: string): Promise<void> {
  if (!artId || artId.startsWith('wm-') || artId.startsWith('sample-')) return;
  try {
    const artRef = doc(db, 'artworks', artId);
    await updateDoc(artRef, { viewsCount: increment(1) });
  } catch (err) {
    // ignore
  }
}

// Rating System Helpers
export function getVisitorId(): string {
  if (typeof window === 'undefined') return 'visitor_default';
  let vId = localStorage.getItem('art_visitor_id');
  if (!vId) {
    vId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('art_visitor_id', vId);
  }
  return vId;
}

export function getUserArtworkRating(artId: string, raterId?: string): number | null {
  if (!artId || typeof window === 'undefined') return null;
  const idToUse = raterId || getVisitorId();
  const saved = localStorage.getItem(`artwork_user_rating_${artId}_${idToUse}`);
  if (saved) {
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) return parsed;
  }
  return null;
}

export function getArtworkRatingMeta(art: Artwork): { ratingAverage: number; ratingCount: number; ratingSum: number } {
  if (!art) return { ratingAverage: 0, ratingCount: 0, ratingSum: 0 };

  // Check local override first
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`artwork_rating_meta_${art.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.ratingAverage === 'number' && typeof parsed.ratingCount === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  const avg = art.ratingAverage || 0;
  const count = art.ratingCount || 0;
  const sum = art.ratingSum || Math.round(avg * count);
  return {
    ratingAverage: avg,
    ratingCount: count,
    ratingSum: sum
  };
}

export function enrichArtworkRating(art: Artwork): Artwork {
  if (!art) return art;
  const meta = getArtworkRatingMeta(art);
  return {
    ...art,
    ratingAverage: meta.ratingAverage,
    ratingCount: meta.ratingCount,
    ratingSum: meta.ratingSum
  };
}

export async function rateArtwork(
  artId: string,
  rating: number,
  raterId?: string
): Promise<{ ratingAverage: number; ratingCount: number; userRating: number }> {
  if (!artId || rating < 1 || rating > 5) {
    return { ratingAverage: 0, ratingCount: 0, userRating: 0 };
  }

  const activeRaterId = raterId || getVisitorId();
  const existingUserRating = getUserArtworkRating(artId, activeRaterId);

  // Save user rating locally
  if (typeof window !== 'undefined') {
    localStorage.setItem(`artwork_user_rating_${artId}_${activeRaterId}`, rating.toString());
  }

  // Get current rating meta
  const currentMeta = getArtworkRatingMeta({ id: artId } as Artwork);

  let newCount = currentMeta.ratingCount;
  let newSum = currentMeta.ratingSum;

  if (existingUserRating !== null) {
    // User is changing their existing rating
    const delta = rating - existingUserRating;
    newSum += delta;
  } else {
    // Brand new rating
    newCount += 1;
    newSum += rating;
  }

  if (newCount < 1) newCount = 1;
  if (newSum < 0) newSum = 0;

  const newAverage = Math.round((newSum / newCount) * 10) / 10;

  const updatedMeta = {
    ratingAverage: newAverage,
    ratingCount: newCount,
    ratingSum: newSum
  };

  // Cache updated meta in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(`artwork_rating_meta_${artId}`, JSON.stringify(updatedMeta));
  }

  // If local user uploaded artwork, update it in LOCAL_STORAGE_KEY
  try {
    const localList = getLocalUserArtworks();
    const foundIdx = localList.findIndex((a) => a.id === artId);
    if (foundIdx !== -1) {
      localList[foundIdx] = {
        ...localList[foundIdx],
        ratingAverage: newAverage,
        ratingCount: newCount,
        ratingSum: newSum
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localList));
    }
  } catch (e) {
    // ignore
  }

  // If Firestore artwork, update in Firestore
  if (!artId.startsWith('wm-') && !artId.startsWith('sample-')) {
    try {
      const artRef = doc(db, 'artworks', artId);
      await updateDoc(artRef, {
        ratingAverage: newAverage,
        ratingCount: newCount,
        ratingSum: newSum
      });
    } catch (err) {
      console.warn('Notice: Rating updated locally (client offline or doc missing in Firestore):', err);
    }
  }

  // Notify components to update in real time
  notifyArtworkChange();

  return {
    ratingAverage: newAverage,
    ratingCount: newCount,
    userRating: rating
  };
}
