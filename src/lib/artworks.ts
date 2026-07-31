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
  increment,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { Artwork, ArtworkComment, ArtworkStatus, SortOption } from '../types';
import { addAppNotification } from './notifications';

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

export function isPhotographyCategory(category?: string): boolean {
  if (!category) return false;
  const clean = category.trim().toLowerCase();
  return (
    clean === 'تصوير فوتوغرافي' ||
    clean === 'تصوير' ||
    clean === 'فوتوغرافي' ||
    clean === 'photography' ||
    clean === 'photo' ||
    clean.includes('تصوير') ||
    clean.includes('photograph')
  );
}

export function getArtistPrefix(category?: string): string {
  if (isPhotographyCategory(category)) {
    return 'تصوير الفنان';
  }
  return 'بريشة الفنان';
}

const LOCAL_STORAGE_KEY = 'local_user_uploaded_artworks';

export function getLocalUserArtworks(): Artwork[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const list: Artwork[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    const seenUrls = new Set<string>();
    const cleaned: Artwork[] = [];

    for (const art of list) {
      if (!art || !art.id) continue;
      const urlKey = art.imageUrl ? art.imageUrl.trim() : art.id;
      if (!seenUrls.has(urlKey)) {
        seenUrls.add(urlKey);
        cleaned.push(art);
      }
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

// Helper function to process raw approved artworks with filtering and sorting
function processApprovedArtworksList(
  rawList: Artwork[],
  categoryFilter: string = 'الكل',
  searchQuery: string = '',
  sortOption: SortOption = 'newest',
  limitCount: number = 500
): Artwork[] {
  let finalCombined = [...rawList];

  // Category filter
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
    const isPhotoSearch = isPhotographyCategory(effectiveCategory);
    finalCombined = finalCombined.filter((art) => {
      const artCat = (art.category || '').trim();
      if (isPhotoSearch) {
        if (isPhotographyCategory(artCat)) return true;
        if (art.tags?.some((t) => isPhotographyCategory(t))) return true;
      }
      if (artCat === effectiveCategory) return true;
      if (art.tags?.some((t) => (t || '').trim() === effectiveCategory)) return true;
      if (effectiveCategory === 'لوحات فنية' && (!ARTWORK_CATEGORIES.includes(artCat) || artCat === 'لوحات فنية')) return true;
      return false;
    });
  }

  // Featured filter
  if (sortOption === 'featured') {
    const featuredOnly = finalCombined.filter((art) => art.isFeatured);
    if (featuredOnly.length > 0) {
      finalCombined = featuredOnly;
    }
  }

  // Search query filtering
  if (searchQuery.trim()) {
    const qLower = searchQuery.toLowerCase().trim();
    finalCombined = finalCombined.filter((art) => 
      art.title?.toLowerCase().includes(qLower) ||
      art.artistName?.toLowerCase().includes(qLower) ||
      art.description?.toLowerCase().includes(qLower) ||
      art.tags?.some((t) => t.toLowerCase().includes(qLower))
    );
  }

  // Sorting
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
    finalCombined.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
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

// Realtime Firestore subscription for approved artworks (guarantees identical data for all accounts & guests)
export function subscribeToApprovedArtworks(
  onUpdate: (artworks: Artwork[]) => void,
  categoryFilter: string = 'الكل',
  searchQuery: string = '',
  sortOption: SortOption = 'newest',
  limitCount: number = 500
): () => void {
  // Trigger immediate fetch so UI updates without delay
  fetchApprovedArtworks(categoryFilter, searchQuery, sortOption, limitCount).then((initialList) => {
    onUpdate(initialList);
  });

  const artworksRef = collection(db, 'artworks');
  const qApproved = query(artworksRef, where('status', '==', 'approved'));

  const unsubscribe = onSnapshot(
    qApproved,
    (snap) => {
      const approvedMap = new Map<string, Artwork>();
      snap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const normalizedStatus = (data.status || 'approved').toString().trim().toLowerCase();
        if (normalizedStatus === 'approved' || normalizedStatus === 'published' || normalizedStatus === 'accepted') {
          const userId = data.userId || data.ownerId || data.artistId || data.uploadedBy || '';
          approvedMap.set(docSnap.id, {
            id: docSnap.id,
            ...data,
            userId,
            status: 'approved'
          } as Artwork);
        }
      });

      // Merge local storage user artworks
      const localList = getLocalUserArtworks();
      localList.forEach((art) => {
        const st = art?.status ? String(art.status) : '';
        if (art && art.id && (st === 'approved' || st === 'published' || !st)) {
          if (!approvedMap.has(art.id)) {
            approvedMap.set(art.id, { ...art, status: 'approved' });
          }
        }
      });

      const rawList = Array.from(approvedMap.values());
      const processed = processApprovedArtworksList(rawList, categoryFilter, searchQuery, sortOption, limitCount);
      onUpdate(processed);
    },
    (error) => {
      console.warn('Notice: Error in Firestore approved artworks snapshot, using fallback fetch:', error);
      fetchApprovedArtworks(categoryFilter, searchQuery, sortOption, limitCount).then(onUpdate);
    }
  );

  return unsubscribe;
}

export async function fetchApprovedArtworks(
  categoryFilter: string = 'الكل',
  searchQuery: string = '',
  sortOption: SortOption = 'newest',
  limitCount: number = 500,
  _currentUserId?: string
): Promise<Artwork[]> {
  const approvedMap = new Map<string, Artwork>();

  // 1. Primary query for approved artworks
  try {
    const artworksRef = collection(db, 'artworks');
    const qApproved = query(artworksRef, where('status', '==', 'approved'));
    const snap = await getDocs(qApproved);
    snap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const normalizedStatus = (data.status || 'approved').toString().trim().toLowerCase();
      if (normalizedStatus === 'approved' || normalizedStatus === 'published' || normalizedStatus === 'accepted') {
        const userId = data.userId || data.ownerId || data.artistId || data.uploadedBy || '';
        approvedMap.set(docSnap.id, {
          id: docSnap.id,
          ...data,
          userId,
          status: 'approved'
        } as Artwork);
      }
    });
  } catch (error) {
    console.warn('Notice: Error fetching Firestore approved artworks:', error);
  }

  // 2. Secondary fallback query for documents without status or with published status
  try {
    const artworksRef = collection(db, 'artworks');
    const snapAll = await getDocs(artworksRef);
    snapAll.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const st = (data.status || 'approved').toString().trim().toLowerCase();
      if (st === 'approved' || st === 'published' || st === 'accepted') {
        if (!approvedMap.has(docSnap.id)) {
          const userId = data.userId || data.ownerId || data.artistId || data.uploadedBy || '';
          approvedMap.set(docSnap.id, {
            id: docSnap.id,
            ...data,
            userId,
            status: 'approved'
          } as Artwork);
        }
      }
    });
  } catch (e) {
    // Ignore permissions check error for unauthenticated visitors
  }

  // 3. Local storage artworks fallback
  const localList = getLocalUserArtworks();
  localList.forEach((art) => {
    const st = art?.status ? String(art.status) : '';
    if (art && art.id && (st === 'approved' || st === 'published' || !st)) {
      if (!approvedMap.has(art.id)) {
        approvedMap.set(art.id, { ...art, status: 'approved' });
      }
    }
  });

  const rawList = Array.from(approvedMap.values());
  return processApprovedArtworksList(rawList, categoryFilter, searchQuery, sortOption, limitCount);
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

  if (userId && userId !== 'guest') {
    try {
      const artworksRef = collection(db, 'artworks');
      const qUser = query(artworksRef, where('userId', '==', userId));
      const snap = await getDocs(qUser);
      snap.forEach((d) => {
        const data = d.data() as Artwork;
        userMap.set(d.id, { id: d.id, ...data });
      });
    } catch (error) {
      console.warn('Notice: Error fetching user artworks from Firestore:', error);
    }
  }

  const localList = getLocalUserArtworks();
  localList.forEach((a) => {
    if (
      a.userId === userId || 
      (userDisplayName && (a.userName === userDisplayName || a.artistName === userDisplayName))
    ) {
      if (!userMap.has(a.id)) {
        userMap.set(a.id, a);
      }
    }
  });

  const list = Array.from(userMap.values());
  list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

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

  try {
    const artworksRef = collection(db, 'artworks');
    const qPending = query(artworksRef, where('status', '==', 'pending'));
    const snap = await getDocs(qPending);
    snap.forEach((d) => {
      const data = d.data() as Artwork;
      pendingMap.set(d.id, { id: d.id, ...data, status: 'pending' });
    });
  } catch (error) {
    console.error('Error fetching pending artworks:', error);
  }

  getLocalUserArtworks()
    .filter((a) => a.status === 'pending')
    .forEach((a) => {
      if (!pendingMap.has(a.id)) {
        pendingMap.set(a.id, a);
      }
    });

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
    favoritesCount: 0,
    viewsCount: 0,
    ratingAverage: 0,
    ratingCount: 0,
    ratingSum: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    createdAt: new Date().toISOString()
  };

  const id = `local-art-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const createdArt: Artwork = { id, ...newArtworkData };
  
  saveLocalUserArtwork(createdArt);
  notifyArtworkChange();

  try {
    const docRef = await addDoc(collection(db, 'artworks'), newArtworkData);
    removeLocalUserArtwork(id, data.imageUrl);
    saveLocalUserArtwork({ ...createdArt, id: docRef.id });
    notifyArtworkChange();
    return docRef.id;
  } catch (error) {
    console.warn('Notice: Artwork created locally (client offline):', error);
    return id;
  }
}

export async function updateArtworkStatus(
  artId: string, 
  status: ArtworkStatus, 
  rejectionReason: string = '',
  actorUser?: { uid: string; displayName?: string }
): Promise<void> {
  if (!artId || artId.startsWith('wm-') || artId.startsWith('sample-')) return;

  const artDoc = await fetchArtworkById(artId);

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

  // Send Notification to owner
  if (artDoc && artDoc.userId) {
    if (status === 'approved') {
      await addAppNotification({
        recipientUserId: artDoc.userId,
        actorUserId: actorUser?.uid || 'admin',
        actorName: actorUser?.displayName || 'إدارة المعرض',
        type: 'artwork_approved',
        title: 'تمت الموافقة على عملك الفني 🎉',
        message: 'تمت الموافقة على عملك ونشره في المعرض 🎉',
        artId: artDoc.id,
        artTitle: artDoc.title,
        artImageUrl: artDoc.imageUrl
      });
    } else if (status === 'rejected') {
      await addAppNotification({
        recipientUserId: artDoc.userId,
        actorUserId: actorUser?.uid || 'admin',
        actorName: actorUser?.displayName || 'إدارة المعرض',
        type: 'artwork_rejected',
        title: 'تم رفض عملك الفني ⚠️',
        message: rejectionReason 
          ? `تم رفض عملك. سبب الرفض: ${rejectionReason}`
          : 'تم رفض عملك. يمكنك مراجعة سبب الرفض داخل صفحة أعمالي.',
        artId: artDoc.id,
        artTitle: artDoc.title,
        artImageUrl: artDoc.imageUrl
      });
    }
  }

  notifyArtworkChange();
}

export async function deleteArtwork(artId: string, imageUrl?: string): Promise<void> {
  removeLocalUserArtwork(artId, imageUrl);
  notifyArtworkChange();

  if (!artId.startsWith('wm-') && !artId.startsWith('sample-') && !artId.startsWith('local-art-')) {
    try {
      const artRef = doc(db, 'artworks', artId);
      await deleteDoc(artRef);
    } catch (error) {
      console.warn('Notice: Could not delete artwork document from Firestore:', error);
    }
  }
}

export async function updateArtworkData(
  artId: string,
  updatedFields: Partial<Artwork>
): Promise<void> {
  const localList = getLocalUserArtworks();
  const index = localList.findIndex((a) => a.id === artId);
  if (index !== -1) {
    localList[index] = { ...localList[index], ...updatedFields };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localList));
  }

  if (!artId.startsWith('wm-') && !artId.startsWith('sample-') && !artId.startsWith('local-art-')) {
    try {
      const artRef = doc(db, 'artworks', artId);
      await updateDoc(artRef, updatedFields);
    } catch (error) {
      console.warn('Notice: Could not update artwork in Firestore:', error);
    }
  }

  notifyArtworkChange();
}

export async function updatePendingArtworkData(
  artId: string,
  updatedFields: Partial<Artwork>
): Promise<void> {
  await updateArtworkData(artId, updatedFields);
}

export async function toggleFeaturedArtwork(artId: string, currentFeaturedState: boolean): Promise<void> {
  const newFeatured = !currentFeaturedState;

  const localList = getLocalUserArtworks();
  const index = localList.findIndex((a) => a.id === artId);
  if (index !== -1) {
    localList[index].isFeatured = newFeatured;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localList));
  }

  if (!artId.startsWith('wm-') && !artId.startsWith('sample-') && !artId.startsWith('local-art-')) {
    try {
      const artRef = doc(db, 'artworks', artId);
      await updateDoc(artRef, { isFeatured: newFeatured });
    } catch (error) {
      console.warn('Notice: Could not update featured status in Firestore:', error);
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

export async function toggleLikeArtwork(
  artId: string, 
  userId: string,
  userProfile?: { displayName?: string; artistName?: string; photoURL?: string }
): Promise<boolean> {
  if (!artId || !userId || artId.startsWith('wm-') || artId.startsWith('sample-')) return false;
  try {
    const artRef = doc(db, 'artworks', artId);
    const likeRef = doc(db, 'artworks', artId, 'likes', userId);

    const result = await runTransaction(db, async (transaction) => {
      const artDoc = await transaction.get(artRef);
      const likeDoc = await transaction.get(likeRef);
      const artData = artDoc.exists() ? (artDoc.data() as Artwork) : null;

      if (likeDoc.exists()) {
        transaction.delete(likeRef);
        transaction.update(artRef, { likesCount: increment(-1) });
        return { isLiked: false, artData };
      } else {
        transaction.set(likeRef, { userId, createdAt: new Date().toISOString() });
        transaction.update(artRef, { likesCount: increment(1) });
        return { isLiked: true, artData };
      }
    });

    if (result.isLiked && result.artData && result.artData.userId) {
      const senderName = userProfile?.artistName || userProfile?.displayName || 'مستكشف الفنون';
      await addAppNotification({
        recipientUserId: result.artData.userId,
        actorUserId: userId,
        actorName: senderName,
        actorPhotoURL: userProfile?.photoURL || '',
        type: 'like',
        title: 'إعجاب جديد ❤️',
        message: `قام ${senderName} بالإعجاب بعملك ❤️`,
        artId: result.artData.id,
        artTitle: result.artData.title,
        artImageUrl: result.artData.imageUrl
      });
    }

    notifyArtworkChange();
    return result.isLiked;
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

    const artDoc = await fetchArtworkById(artId);
    if (artDoc && artDoc.userId) {
      await addAppNotification({
        recipientUserId: artDoc.userId,
        actorUserId: userId,
        actorName: userName,
        actorPhotoURL: userPhoto,
        type: 'comment',
        title: 'تعليق جديد 💬',
        message: `قام ${userName} بالتعليق على عملك: "${text.trim().slice(0, 40)}..."`,
        artId: artDoc.id,
        artTitle: artDoc.title,
        artImageUrl: artDoc.imageUrl
      });
    }
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

export function getArtworkRatingMeta(art: Artwork): { 
  ratingAverage: number; 
  ratingCount: number; 
  ratingSum: number;
  ratingDistribution: Record<number, number>;
} {
  if (!art) return { ratingAverage: 0, ratingCount: 0, ratingSum: 0, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`artwork_rating_meta_${art.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.ratingAverage === 'number' && typeof parsed.ratingCount === 'number') {
          return {
            ratingAverage: parsed.ratingAverage,
            ratingCount: parsed.ratingCount,
            ratingSum: parsed.ratingSum || Math.round(parsed.ratingAverage * parsed.ratingCount),
            ratingDistribution: parsed.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
          };
        }
      }
    } catch (e) {
      // ignore
    }
  }

  const avg = art.ratingAverage || 0;
  const count = art.ratingCount || 0;
  const sum = art.ratingSum || Math.round(avg * count);
  const dist = art.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  return {
    ratingAverage: avg,
    ratingCount: count,
    ratingSum: sum,
    ratingDistribution: dist
  };
}

export function enrichArtworkRating(art: Artwork): Artwork {
  if (!art) return art;
  const meta = getArtworkRatingMeta(art);
  return {
    ...art,
    ratingAverage: meta.ratingAverage,
    ratingCount: meta.ratingCount,
    ratingSum: meta.ratingSum,
    ratingDistribution: meta.ratingDistribution
  };
}

export async function fetchUserRatingFromFirestore(artId: string, userId: string): Promise<number | null> {
  if (!artId || !userId || userId === 'guest' || artId.startsWith('wm-') || artId.startsWith('sample-')) return null;
  try {
    const ratingDoc = await getDoc(doc(db, 'artworks', artId, 'ratings', userId));
    if (ratingDoc.exists()) {
      return Number(ratingDoc.data().rating);
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export async function rateArtwork(
  artId: string,
  rating: number,
  userId?: string,
  userProfile?: { displayName?: string; artistName?: string; photoURL?: string }
): Promise<{ 
  ratingAverage: number; 
  ratingCount: number; 
  userRating: number;
  ratingDistribution: Record<number, number>;
}> {
  if (!artId || rating < 1 || rating > 5) {
    return { ratingAverage: 0, ratingCount: 0, userRating: 0, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }

  const activeUserId = userId || getVisitorId();

  if (typeof window !== 'undefined') {
    localStorage.setItem(`artwork_user_rating_${artId}_${activeUserId}`, rating.toString());
  }

  if (artId.startsWith('wm-') || artId.startsWith('sample-') || activeUserId === 'guest') {
    const currentMeta = getArtworkRatingMeta({ id: artId } as Artwork);
    let newCount = currentMeta.ratingCount + 1;
    let newSum = currentMeta.ratingSum + rating;
    let newAverage = Math.round((newSum / newCount) * 10) / 10;
    const dist = { ...currentMeta.ratingDistribution, [rating]: (currentMeta.ratingDistribution[rating] || 0) + 1 };

    const updatedMeta = { ratingAverage: newAverage, ratingCount: newCount, ratingSum: newSum, ratingDistribution: dist };
    if (typeof window !== 'undefined') {
      localStorage.setItem(`artwork_rating_meta_${artId}`, JSON.stringify(updatedMeta));
    }
    notifyArtworkChange();
    return { ratingAverage: newAverage, ratingCount: newCount, userRating: rating, ratingDistribution: dist };
  }

  try {
    const artRef = doc(db, 'artworks', artId);
    const ratingRef = doc(db, 'artworks', artId, 'ratings', activeUserId);

    const result = await runTransaction(db, async (transaction) => {
      const artDoc = await transaction.get(artRef);
      const ratingDoc = await transaction.get(ratingRef);

      if (!artDoc.exists()) {
        throw new Error('Artwork not found');
      }

      const artData = artDoc.data() as Artwork;
      const existingRating = ratingDoc.exists() ? Number(ratingDoc.data().rating) : null;

      let dist: Record<number, number> = artData.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let newCount = artData.ratingCount || 0;
      let newSum = artData.ratingSum || 0;

      if (existingRating !== null) {
        dist[existingRating] = Math.max(0, (dist[existingRating] || 1) - 1);
        dist[rating] = (dist[rating] || 0) + 1;
        newSum = newSum - existingRating + rating;
      } else {
        dist[rating] = (dist[rating] || 0) + 1;
        newCount += 1;
        newSum += rating;
      }

      const newAverage = newCount > 0 ? Math.round((newSum / newCount) * 10) / 10 : 0;

      transaction.set(ratingRef, {
        artworkId: artId,
        userId: activeUserId,
        rating,
        updatedAt: new Date().toISOString(),
        createdAt: ratingDoc.exists() ? ratingDoc.data().createdAt : new Date().toISOString()
      });

      transaction.update(artRef, {
        ratingAverage: newAverage,
        ratingCount: newCount,
        ratingSum: newSum,
        ratingDistribution: dist
      });

      return {
        artData,
        newAverage,
        newCount,
        newSum,
        dist
      };
    });

    if (result.artData && result.artData.userId) {
      const senderName = userProfile?.artistName || userProfile?.displayName || 'مستكشف الفنون';
      await addAppNotification({
        recipientUserId: result.artData.userId,
        actorUserId: activeUserId,
        actorName: senderName,
        actorPhotoURL: userProfile?.photoURL || '',
        type: 'rating',
        title: 'تقييم جديد 🌟',
        message: `قام ${senderName} بتقييم عملك بـ ${rating} نجوم ⭐`,
        artId: result.artData.id,
        artTitle: result.artData.title,
        artImageUrl: result.artData.imageUrl
      });
    }

    notifyArtworkChange();

    return {
      ratingAverage: result.newAverage,
      ratingCount: result.newCount,
      userRating: rating,
      ratingDistribution: result.dist
    };
  } catch (err) {
    console.warn('Notice: Error rating artwork in Firestore:', err);
    return { ratingAverage: 0, ratingCount: 0, userRating: 0, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }
}
