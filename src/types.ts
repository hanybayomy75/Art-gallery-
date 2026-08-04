export type UserRole = 'owner' | 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  artistName?: string;
  photoURL?: string;
  bio?: string;
  role: UserRole;
  themePreset?: string;
  themeMode?: 'light' | 'dark' | 'auto';
  createdAt: string;
}

export type ArtworkStatus = 'pending' | 'approved' | 'rejected';

export type FrameStyle = 
  | 'none' 
  | 'gold_baroque' 
  | 'wood_classic' 
  | 'black_modern' 
  | 'white_gallery' 
  | 'floating_canvas' 
  | 'bronze_vintage';

export type FilterStyle = 
  | 'normal' 
  | 'grayscale' 
  | 'sepia' 
  | 'vintage' 
  | 'vivid' 
  | 'cool' 
  | 'warm' 
  | 'contrast' 
  | 'invert' 
  | 'blur_soft';

export interface Artwork {
  id: string;
  title: string;
  description: string;
  category: string; // Legacy primary category name
  primaryCategory?: string; // New primary category name
  categories?: string[]; // Array of categories for multi-category filtering
  tags: string[];
  imageUrl: string;
  cloudinaryPublicId?: string;
  artistName: string;
  artistEmail?: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  status: ArtworkStatus;
  rejectionReason?: string;
  isFeatured?: boolean;
  likesCount: number;
  commentsCount: number;
  favoritesCount?: number;
  viewsCount?: number;
  ratingAverage?: number;
  ratingCount?: number;
  ratingSum?: number;
  ratingDistribution?: Record<number, number>;
  rotation?: number; // 0, 90, 180, 270 degrees
  frameStyle?: FrameStyle;
  filterStyle?: FilterStyle;
  createdAt: string;
}

export interface ArtworkComment {
  id: string;
  artId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  isHidden?: boolean;
}

export type ThemePreset = 'classic' | 'modern' | 'dark_art' | 'watercolor' | 'white_gallery';
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  group: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type Category = CategoryItem;

export interface ContactMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  message: string;
  subject?: string;
  status: 'unread' | 'replied';
  replyText?: string;
  repliedAt?: string;
  createdAt: string;
  userId?: string;
}

export type NotificationType = 
  | 'like' 
  | 'rating' 
  | 'favorite' 
  | 'comment' 
  | 'artwork_approved' 
  | 'artwork_rejected' 
  | 'system';

export interface AppNotification {
  id: string;
  recipientUserId: string;
  actorUserId?: string;
  actorName?: string;
  actorPhotoURL?: string;
  userId?: string; // Backwards compatibility
  type: NotificationType;
  title: string;
  message: string;
  artId?: string;
  artTitle?: string;
  artImageUrl?: string;
  senderName?: string;
  senderPhoto?: string;
  read: boolean;
  createdAt: string;
}


export type SortOption = 'newest' | 'likes' | 'comments' | 'featured' | 'rating';
