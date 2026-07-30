import { db } from './firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Artwork } from '../types';
import { fetchArtworkById, fetchApprovedArtworks } from './artworks';
import { triggerToast, addAppNotification } from './notifications';

const FAVORITES_STORAGE_KEY = 'gallery_user_favorites_v1';
export const FAVORITE_EVENT = 'artwork_favorite_changed';

function notifyFavoriteChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FAVORITE_EVENT));
  }
}

export function getLocalFavorites(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    }
  } catch (e) {
    // ignore
  }
  return {};
}

export function saveLocalFavorites(map: Record<string, string[]>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(map));
    notifyFavoriteChange();
  } catch (e) {
    // ignore
  }
}

export function getUserFavoriteIds(userId?: string): string[] {
  const key = userId || 'guest';
  const map = getLocalFavorites();
  return map[key] || [];
}

export function isArtworkFavorite(artId: string, userId?: string): boolean {
  if (!artId) return false;
  const ids = getUserFavoriteIds(userId);
  return ids.includes(artId);
}

export async function toggleFavoriteArtwork(artwork: Artwork, userId?: string): Promise<boolean> {
  const key = userId || 'guest';
  const map = getLocalFavorites();
  const currentIds = map[key] || [];
  const isFav = currentIds.includes(artwork.id);
  const newFavStatus = !isFav;

  let newIds: string[];
  if (isFav) {
    newIds = currentIds.filter((id) => id !== artwork.id);
  } else {
    newIds = [artwork.id, ...currentIds.filter((id) => id !== artwork.id)];
  }

  map[key] = newIds;
  saveLocalFavorites(map);

  // Sync to Firestore if user logged in
  if (userId && userId !== 'guest') {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        await updateDoc(userDocRef, {
          favorites: newFavStatus ? arrayUnion(artwork.id) : arrayRemove(artwork.id)
        });
      }
    } catch (e) {
      console.warn('Notice: Favorite synced locally (firestore sync skipped):', e);
    }
  }

  // Toast & Notification
  if (newFavStatus) {
    triggerToast({
      type: 'rating',
      title: 'تمت الإضافة للمفضلة 🔖',
      message: `حُفظت "${artwork.title}" في قائمة لوحاتك المفضلة`,
      artTitle: artwork.title,
      artImageUrl: artwork.imageUrl
    });

    addAppNotification({
      userId: key,
      type: 'rating',
      title: 'حفظ في المفضلة 🔖',
      message: `أضفت اللوحة "${artwork.title}" إلى لوحاتك المفضلة`,
      artId: artwork.id,
      artTitle: artwork.title,
      artImageUrl: artwork.imageUrl
    });
  } else {
    triggerToast({
      type: 'system',
      title: 'تم الإزالة من المفضلة 🗑️',
      message: `إزالة "${artwork.title}" من قائمة المفضلة`
    });
  }

  return newFavStatus;
}

export async function fetchFavoriteArtworks(userId?: string): Promise<Artwork[]> {
  const ids = getUserFavoriteIds(userId);
  if (ids.length === 0) return [];

  // Fetch approved artworks first for speed
  try {
    const allApproved = await fetchApprovedArtworks();
    const approvedFavs = allApproved.filter((art) => ids.includes(art.id));
    
    // Check if any missing IDs need direct fetching
    const foundIds = new Set(approvedFavs.map((a) => a.id));
    const missingIds = ids.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      const fetchedMissing = await Promise.all(
        missingIds.map((id) => fetchArtworkById(id).catch(() => null))
      );
      const validMissing = fetchedMissing.filter((a): a is Artwork => a !== null);
      return [...approvedFavs, ...validMissing];
    }

    return approvedFavs;
  } catch (e) {
    console.error('Error fetching favorite artworks:', e);
    return [];
  }
}
