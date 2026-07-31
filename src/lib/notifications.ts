import { AppNotification, NotificationType } from '../types';
import { db } from './firebase';
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';

const NOTIFICATIONS_STORAGE_KEY = 'gallery_user_notifications_v1';

// Custom DOM Event names
export const NOTIFICATION_EVENT = 'app_notification_updated';
export const TOAST_EVENT = 'app_toast_triggered';

export interface ToastMessage {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  artTitle?: string;
  artImageUrl?: string;
}

export function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT));
  }
}

export function triggerToast(toast: Omit<ToastMessage, 'id'>) {
  if (typeof window !== 'undefined') {
    const toastData: ToastMessage = {
      ...toast,
      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: toastData }));
  }
}

export function getLocalNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // ignore
  }
  return [];
}

export function saveLocalNotifications(list: AppNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
    notifyChange();
  } catch (e) {
    // ignore
  }
}

export async function fetchUserNotificationsFromFirestore(userId: string): Promise<AppNotification[]> {
  if (!userId || userId === 'guest') {
    const local = getLocalNotifications();
    return local.filter((n) => (n.recipientUserId || n.userId) === 'guest' || (n.recipientUserId || n.userId) === 'all');
  }

  const notifMap = new Map<string, AppNotification>();

  // 1. Add local notifications
  const local = getLocalNotifications();
  local.forEach((n) => {
    const recId = n.recipientUserId || n.userId;
    if (recId === userId || recId === 'all') {
      notifMap.set(n.id, n);
    }
  });

  // 2. Fetch from Firestore where recipientUserId == userId
  try {
    const notifRef = collection(db, 'notifications');
    const q1 = query(notifRef, where('recipientUserId', '==', userId));
    const snap1 = await getDocs(q1);
    snap1.forEach((d) => {
      const data = d.data();
      const item: AppNotification = {
        id: d.id,
        recipientUserId: data.recipientUserId || data.userId || userId,
        actorUserId: data.actorUserId || '',
        actorName: data.actorName || data.senderName || '',
        actorPhotoURL: data.actorPhotoURL || data.senderPhoto || '',
        userId: data.recipientUserId || data.userId || userId,
        type: data.type || 'system',
        title: data.title || '',
        message: data.message || '',
        artId: data.artId || '',
        artTitle: data.artTitle || '',
        artImageUrl: data.artImageUrl || '',
        senderName: data.actorName || data.senderName || '',
        senderPhoto: data.actorPhotoURL || data.senderPhoto || '',
        read: !!data.read,
        createdAt: data.createdAt || new Date().toISOString()
      };
      notifMap.set(d.id, item);
    });

    // Backwards compatibility query where userId == userId
    const q2 = query(notifRef, where('userId', '==', userId));
    const snap2 = await getDocs(q2);
    snap2.forEach((d) => {
      if (!notifMap.has(d.id)) {
        const data = d.data();
        const item: AppNotification = {
          id: d.id,
          recipientUserId: data.recipientUserId || data.userId || userId,
          actorUserId: data.actorUserId || '',
          actorName: data.actorName || data.senderName || '',
          actorPhotoURL: data.actorPhotoURL || data.senderPhoto || '',
          userId: data.userId || userId,
          type: data.type || 'system',
          title: data.title || '',
          message: data.message || '',
          artId: data.artId || '',
          artTitle: data.artTitle || '',
          artImageUrl: data.artImageUrl || '',
          senderName: data.actorName || data.senderName || '',
          senderPhoto: data.actorPhotoURL || data.senderPhoto || '',
          read: !!data.read,
          createdAt: data.createdAt || new Date().toISOString()
        };
        notifMap.set(d.id, item);
      }
    });
  } catch (e) {
    console.warn('Notice: Firestore notifications fetch fallback to local:', e);
  }

  const list = Array.from(notifMap.values());
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUserNotifications(userId?: string): AppNotification[] {
  const all = getLocalNotifications();
  if (!userId) {
    return all.filter((n) => (n.recipientUserId || n.userId) === 'guest' || (n.recipientUserId || n.userId) === 'all');
  }
  return all.filter((n) => (n.recipientUserId || n.userId) === userId || (n.recipientUserId || n.userId) === 'all');
}

export interface AddNotificationParams {
  recipientUserId: string; // The owner of the artwork receiving the notification
  actorUserId?: string;     // The user performing the action (like/rating/comment)
  actorName?: string;
  actorPhotoURL?: string;
  type: NotificationType;
  title: string;
  message: string;
  artId?: string;
  artTitle?: string;
  artImageUrl?: string;
}

export async function addAppNotification(
  data: AddNotificationParams
): Promise<AppNotification | null> {
  const recipientId = data.recipientUserId;
  const actorId = data.actorUserId;

  // CRITICAL REQUIREMENT #6:
  // Do NOT send notification if actorUserId == recipientUserId (self-interaction)
  if (actorId && recipientId && actorId === recipientId) {
    return null;
  }

  if (!recipientId || recipientId === 'guest') {
    return null;
  }

  const newNotif: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    recipientUserId: recipientId,
    actorUserId: actorId || '',
    actorName: data.actorName || '',
    actorPhotoURL: data.actorPhotoURL || '',
    userId: recipientId, // Backwards compatibility
    type: data.type,
    title: data.title,
    message: data.message,
    artId: data.artId || '',
    artTitle: data.artTitle || '',
    artImageUrl: data.artImageUrl || '',
    senderName: data.actorName || '',
    senderPhoto: data.actorPhotoURL || '',
    read: false,
    createdAt: new Date().toISOString()
  };

  // 1. Save locally for recipient if on same client
  const current = getLocalNotifications();
  const updated = [newNotif, ...current];
  saveLocalNotifications(updated);

  // 2. Save to Firestore for recipient
  try {
    const notifRef = collection(db, 'notifications');
    const docRef = await addDoc(notifRef, {
      recipientUserId: recipientId,
      actorUserId: actorId || '',
      actorName: data.actorName || '',
      actorPhotoURL: data.actorPhotoURL || '',
      userId: recipientId, // Legacy field
      type: data.type,
      title: data.title,
      message: data.message,
      artId: data.artId || '',
      artTitle: data.artTitle || '',
      artImageUrl: data.artImageUrl || '',
      read: false,
      createdAt: newNotif.createdAt
    });
    newNotif.id = docRef.id;
  } catch (e) {
    console.warn('Notice: Notification saved locally (client offline or firestore rules):', e);
  }

  notifyChange();
  return newNotif;
}

export function markNotificationAsRead(notifId: string): void {
  const all = getLocalNotifications();
  const updated = all.map((n) => (n.id === notifId ? { ...n, read: true } : n));
  saveLocalNotifications(updated);

  if (!notifId.startsWith('notif_')) {
    try {
      const docRef = doc(db, 'notifications', notifId);
      updateDoc(docRef, { read: true }).catch(() => {});
    } catch (e) {
      // ignore
    }
  }
}

export async function markAllNotificationsAsRead(userId?: string): Promise<void> {
  const all = getLocalNotifications();
  const updated = all.map((n) => {
    if (!userId || (n.recipientUserId || n.userId) === userId || (n.recipientUserId || n.userId) === 'all') {
      return { ...n, read: true };
    }
    return n;
  });
  saveLocalNotifications(updated);

  if (userId && userId !== 'guest') {
    try {
      const notifRef = collection(db, 'notifications');
      const q = query(notifRef, where('recipientUserId', '==', userId));
      const snap = await getDocs(q);
      const updates = snap.docs.map((d) => updateDoc(d.ref, { read: true }));
      await Promise.all(updates);
    } catch (e) {
      // ignore
    }
  }
  notifyChange();
}

export function clearUserNotifications(userId?: string): void {
  const all = getLocalNotifications();
  const updated = all.filter((n) => {
    if (!userId) return (n.recipientUserId || n.userId) !== 'guest';
    return (n.recipientUserId || n.userId) !== userId;
  });
  saveLocalNotifications(updated);
}
