import { Artwork } from '../types';

export interface EmailNotificationPayload {
  artistEmail: string;
  artistName: string;
  interactionType: 'like' | 'comment' | 'rating' | 'favorite' | 'summary';
  senderName?: string;
  artTitle: string;
  artId?: string;
  artImageUrl?: string;
  messageContent?: string;
  count?: number;
}

export interface EmailSettings {
  enabled: boolean;
  artistEmail: string;
  notifyLikes: boolean;
  notifyComments: boolean;
  notifyRatings: boolean;
  notifyFavorites: boolean;
}

const EMAIL_SETTINGS_KEY = 'gallery_artist_email_settings_v1';

export function getArtistEmailSettings(userId?: string): EmailSettings {
  const defaultSettings: EmailSettings = {
    enabled: true,
    artistEmail: '',
    notifyLikes: true,
    notifyComments: true,
    notifyRatings: true,
    notifyFavorites: true
  };

  if (typeof window === 'undefined') return defaultSettings;

  try {
    const raw = localStorage.getItem(`${EMAIL_SETTINGS_KEY}_${userId || 'guest'}`);
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch (e) {
    // ignore
  }

  return defaultSettings;
}

export function saveArtistEmailSettings(settings: EmailSettings, userId?: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${EMAIL_SETTINGS_KEY}_${userId || 'guest'}`,
      JSON.stringify(settings)
    );
  } catch (e) {
    // ignore
  }
}

export async function sendEmailNotification(payload: EmailNotificationPayload): Promise<{ success: boolean; message: string; previewUrl?: string }> {
  try {
    const response = await fetch('/api/send-artist-email-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return {
      success: data.success || false,
      message: data.message || 'تمت معالجة الطلب',
      previewUrl: data.previewUrl
    };
  } catch (err: any) {
    console.error('Error sending email notification:', err);
    return {
      success: false,
      message: 'تعذر الاتصال بخدمة البريد الإلكتروني'
    };
  }
}

export async function testSendSampleEmail(artistEmail: string, artistName: string): Promise<{ success: boolean; message: string; previewUrl?: string }> {
  return sendEmailNotification({
    artistEmail,
    artistName,
    interactionType: 'summary',
    senderName: 'فريق معرض الفنون',
    artTitle: 'لوحة الأصالة العربية',
    artImageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&q=80',
    messageContent: 'هناك 5 إعجابات جديدة وتعليقان جديدان وتقييم 5 نجوم على أعمالك الفنية اليوم!',
    count: 8
  });
}
