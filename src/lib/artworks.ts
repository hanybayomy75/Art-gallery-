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

export async function fetchApprovedArtworks(
  categoryFilter: string = 'الكل',
  searchQuery: string = '',
  sortOption: SortOption = 'newest',
  limitCount: number = 30
): Promise<Artwork[]> {
  try {
    const artworksRef = collection(db, 'artworks');
    // Fetch approved artworks using simple equality query to avoid composite index requirement
    const q = query(artworksRef, where('status', '==', 'approved'), limit(200));
    const querySnapshot = await getDocs(q);

    let list: Artwork[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Artwork);
    });

    // Client-side category filtering
    if (categoryFilter !== 'الكل') {
      list = list.filter((art) => art.category === categoryFilter);
    }

    // Client-side featured filter
    if (sortOption === 'featured') {
      list = list.filter((art) => art.isFeatured);
    }

    // Client-side search query filtering
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase().trim();
      list = list.filter((art) => 
        art.title?.toLowerCase().includes(qLower) ||
        art.artistName?.toLowerCase().includes(qLower) ||
        art.description?.toLowerCase().includes(qLower) ||
        art.tags?.some((t) => t.toLowerCase().includes(qLower))
      );
    }

    // Client-side sorting
    if (sortOption === 'likes') {
      list.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else if (sortOption === 'comments') {
      list.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
    } else { // 'newest' or default or 'featured'
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return list.slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching artworks:', error);
    return [];
  }
}

export async function fetchArtworkById(artId: string): Promise<Artwork | null> {
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
