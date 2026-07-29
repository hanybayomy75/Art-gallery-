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
  orderBy, 
  limit, 
  runTransaction, 
  serverTimestamp,
  increment,
  setDoc,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';
import { Artwork, ArtworkComment, ArtworkStatus, SortOption } from '../types';
import { WORLD_MASTERS_ARTWORKS } from '../data/worldMastersData';

export const DEFAULT_CATEGORIES = [
  'الكل',
  'أعمال الفنانين المرفوعة',
  'فنانين عالميين',
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

export async function fetchApprovedArtworks(
  categoryFilter: string = 'الكل',
  searchQuery: string = '',
  sortOption: SortOption = 'newest',
  limitCount: number = 60,
  currentUserId?: string
): Promise<Artwork[]> {
  try {
    const artworksRef = collection(db, 'artworks');
    // Fetch approved artworks from Firestore
    const qApproved = query(artworksRef, where('status', '==', 'approved'), limit(200));
    const snapApproved = await getDocs(qApproved);

    const userUploadedList: Artwork[] = [];
    const seenIds = new Set<string>();

    snapApproved.forEach((docSnap) => {
      seenIds.add(docSnap.id);
      userUploadedList.push({ id: docSnap.id, ...docSnap.data() } as Artwork);
    });

    // If a user is logged in, also fetch their pending artworks so they immediately see their uploaded works
    if (currentUserId) {
      try {
        const qUserPending = query(
          artworksRef, 
          where('userId', '==', currentUserId), 
          where('status', '==', 'pending')
        );
        const snapUserPending = await getDocs(qUserPending);
        snapUserPending.forEach((docSnap) => {
          if (!seenIds.has(docSnap.id)) {
            seenIds.add(docSnap.id);
            userUploadedList.push({ id: docSnap.id, ...docSnap.data() } as Artwork);
          }
        });
      } catch (e) {
        // Ignore if query fails
      }
    }

    // Sort user uploaded works by createdAt descending
    userUploadedList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    let finalCombined: Artwork[] = [];

    if (categoryFilter === 'أعمال الفنانين المرفوعة') {
      finalCombined = [...userUploadedList];
    } else if (categoryFilter === 'فنانين عالميين') {
      finalCombined = [...WORLD_MASTERS_ARTWORKS];
    } else if (categoryFilter !== 'الكل') {
      // Filter user uploads by category
      const filteredUserUploads = userUploadedList.filter((art) => art.category === categoryFilter);
      // Filter world masters if any match (world masters are strictly category 'فنانين عالميين')
      const filteredWorldMasters = WORLD_MASTERS_ARTWORKS.filter((art) => art.category === categoryFilter);
      finalCombined = [...filteredUserUploads, ...filteredWorldMasters];
    } else {
      // 'الكل': User uploaded artworks ALWAYS come FIRST at the top!
      finalCombined = [...userUploadedList, ...WORLD_MASTERS_ARTWORKS];
    }

    // Client-side featured filter
    if (sortOption === 'featured') {
      finalCombined = finalCombined.filter((art) => art.isFeatured);
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
    } else if (sortOption === 'newest') {
      // User uploads stay at top, but order by date
      finalCombined.sort((a, b) => {
        const isAUser = !a.id.startsWith('wm-');
        const isBUser = !b.id.startsWith('wm-');
        if (isAUser && !isBUser) return -1;
        if (!isAUser && isBUser) return 1;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
    }

    return finalCombined.slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching artworks:', error);
    // Fallback if firestore offline
    let fallback = WORLD_MASTERS_ARTWORKS;
    if (categoryFilter === 'فنانين عالميين') {
      fallback = WORLD_MASTERS_ARTWORKS;
    } else if (categoryFilter !== 'الكل') {
      fallback = fallback.filter((art) => art.category === categoryFilter);
    }
    return fallback.slice(0, limitCount);
  }
}

export async function fetchArtworkById(artId: string): Promise<Artwork | null> {
  // Check if it's a world master artwork
  const wm = WORLD_MASTERS_ARTWORKS.find((item) => item.id === artId);
  if (wm) return wm;

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

export async function fetchUserArtworks(userId: string): Promise<Artwork[]> {
  try {
    const q = query(
      collection(db, 'artworks'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const list: Artwork[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Artwork));
    // Sort by createdAt descending
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error fetching user artworks:', error);
    return [];
  }
}

export async function fetchPendingArtworks(): Promise<Artwork[]> {
  try {
    const q = query(
      collection(db, 'artworks'),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    const list: Artwork[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Artwork));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error fetching pending artworks:', error);
    return [];
  }
}

export async function fetchAllArtworksForAdmin(): Promise<Artwork[]> {
  try {
    const snap = await getDocs(collection(db, 'artworks'));
    const list: Artwork[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Artwork));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error fetching all artworks for admin:', error);
    return [];
  }
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

  const docRef = await addDoc(collection(db, 'artworks'), newArtworkData);
  return docRef.id;
}

export async function updateArtworkStatus(
  artId: string, 
  status: ArtworkStatus, 
  rejectionReason: string = ''
): Promise<void> {
  const artRef = doc(db, 'artworks', artId);
  await updateDoc(artRef, {
    status,
    rejectionReason: status === 'rejected' ? rejectionReason : ''
  });
}

export async function toggleFeaturedArtwork(artId: string, isFeatured: boolean): Promise<void> {
  const artRef = doc(db, 'artworks', artId);
  await updateDoc(artRef, { isFeatured });
}

export async function updatePendingArtworkData(
  artId: string, 
  updates: Partial<Artwork>
): Promise<void> {
  const artRef = doc(db, 'artworks', artId);
  await updateDoc(artRef, updates);
}

export const updateArtworkData = updatePendingArtworkData;

export async function deleteArtwork(artId: string): Promise<void> {
  await deleteDoc(doc(db, 'artworks', artId));
}

// Like System
export async function checkIfUserLikedArtwork(artId: string, userId: string): Promise<boolean> {
  if (!userId) return false;
  const likeDoc = await getDoc(doc(db, 'artworks', artId, 'likes', userId));
  return likeDoc.exists();
}

export async function toggleLikeArtwork(artId: string, userId: string): Promise<boolean> {
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
}

// Comments System
export async function fetchArtworkComments(artId: string): Promise<ArtworkComment[]> {
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
    console.error('Error fetching comments:', error);
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
  if (!text.trim()) return;

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
}

export async function deleteArtworkComment(artId: string, commentId: string): Promise<void> {
  const commentRef = doc(db, 'artworks', artId, 'comments', commentId);
  const artRef = doc(db, 'artworks', artId);

  await deleteDoc(commentRef);
  await updateDoc(artRef, { commentsCount: increment(-1) });
}

export async function incrementArtworkViews(artId: string): Promise<void> {
  try {
    const artRef = doc(db, 'artworks', artId);
    await updateDoc(artRef, { viewsCount: increment(1) });
  } catch (err) {
    // ignore
  }
}
