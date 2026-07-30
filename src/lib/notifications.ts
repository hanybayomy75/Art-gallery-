import { AppNotification } from '../types';
import { db } from './firebase';
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';

const NOTIFICATIONS_STORAGE_KEY = 'gallery_user_notifications_v1';

// Custom DOM Event names
export const NOTIFICATION_EVENT = 'app_notification_updated';
export const TOAST_EVENT = 'app_toast_triggered';

export interface ToastMessage {
  id: string;
  type: 'like' | 'comment' | 'rating' | 'system';
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

export function getUserNotifications(userId?: string): AppNotification[] {
  const all = getLocalNotifications();
  if (!userId) {
    return all.filter((n) => n.userId === 'guest' || n.userId === 'all');
  }
  return all.filter((n) => n.userId === userId || n.userId === 'all');
}

export async function addAppNotification(
  data: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
): Promise<AppNotification> {
  const newNotif: AppNotification = {
    ...data,
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    read: false,
    createdAt: new Date().toISOString()
  };

  // 1. Save locally
  const current = getLocalNotifications();
  const updated = [newNotif, ...current];
  saveLocalNotifications(updated);

  // 2. Trigger toast
  triggerToast({
    type: data.type,
    title: data.title,
    message: data.message,
    artTitle: data.artTitle,
    artImageUrl: data.artImageUrl
  });

  // 3. Save to Firestore if connected and not guest
  if (data.userId && data.userId !== 'guest') {
    try {
      const notifRef = collection(db, 'notifications');
      await addDoc(notifRef, {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        artId: data.artId || '',
        artTitle: data.artTitle || '',
        artImageUrl: data.artImageUrl || '',
        senderName: data.senderName || '',
        senderPhoto: data.senderPhoto || '',
        read: false,
        createdAt: newNotif.createdAt
      });
    } catch (e) {
      console.warn('Notice: Notification saved locally (client offline or firestore rules):', e);
    }
  }

  return newNotif;
}

export function markNotificationAsRead(notifId: string): void {
  const all = getLocalNotifications();
  const updated = all.map((n) => (n.id === notifId ? { ...n, read: true } : n));
  saveLocalNotifications(updated);

  // Firestore update async
  if (!notifId.startsWith('notif_')) {
    try {
      const docRef = doc(db, 'notifications', notifId);
      updateDoc(docRef, { read: true }).catch(() => {});
    } catch (e) {
      // ignore
    }
  }
}

export function markAllNotificationsAsRead(userId?: string): void {
  const all = getLocalNotifications();
  const updated = all.map((n) => {
    if (!userId || n.userId === userId || n.userId === 'all') {
      return { ...n, read: true };
    }
    return n;
  });
  saveLocalNotifications(updated);
}

export function clearUserNotifications(userId?: string): void {
  const all = getLocalNotifications();
  const updated = all.filter((n) => {
    if (!userId) return n.userId !== 'guest';
    return n.userId !== userId;
  });
  saveLocalNotifications(updated);
}
