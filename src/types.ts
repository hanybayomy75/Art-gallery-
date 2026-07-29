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
  category: string;
  tags: string[];
  imageUrl: string;
  cloudinaryPublicId?: string;
  artistName: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  status: ArtworkStatus;
  rejectionReason?: string;
  isFeatured?: boolean;
  likesCount: number;
  commentsCount: number;
  viewsCount?: number;
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

export interface Category {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

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

export type SortOption = 'newest' | 'likes' | 'comments' | 'featured';
