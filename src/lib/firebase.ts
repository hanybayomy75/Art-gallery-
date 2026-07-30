import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  getDoc, 
  getDocFromCache,
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  addDoc, 
  deleteDoc, 
  increment, 
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';
import { UserProfile, UserRole } from '../types';

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseConfigData.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfigData.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfigData.appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore
const databaseId = metaEnv.VITE_FIREBASE_DATABASE_ID || firebaseConfigData.firestoreDatabaseId || '(default)';
export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const facebookProvider = new FacebookAuthProvider();

// Default Owner Email matching user context or system owner
export const SYSTEM_OWNER_EMAIL = 'hany.bayomy75@gmail.com';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  
  let localProfile: UserProfile | null = null;
  try {
    const localRaw = localStorage.getItem(`user_profile_${uid}`);
    if (localRaw) localProfile = JSON.parse(localRaw);
  } catch {
    // ignore
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const profile = userDoc.data() as UserProfile;
      try {
        localStorage.setItem(`user_profile_${uid}`, JSON.stringify(profile));
      } catch {}
      return profile;
    }
  } catch (error: any) {
    try {
      const cacheDoc = await getDocFromCache(doc(db, 'users', uid));
      if (cacheDoc.exists()) {
        const profile = cacheDoc.data() as UserProfile;
        try {
          localStorage.setItem(`user_profile_${uid}`, JSON.stringify(profile));
        } catch {}
        return profile;
      }
    } catch {
      // Ignore cache error
    }
    console.warn('Notice: Firestore offline while fetching user profile:', error?.message || error);
  }

  return localProfile;
}

export async function createOrUpdateUserProfile(user: FirebaseUser, extraData?: Partial<UserProfile>): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  let existingData: any = null;

  try {
    const localRaw = localStorage.getItem(`user_profile_${user.uid}`);
    if (localRaw) existingData = JSON.parse(localRaw);
  } catch {}

  try {
    const existing = await getDoc(userRef);
    if (existing.exists()) {
      existingData = existing.data();
    }
  } catch (err) {
    try {
      const cacheDoc = await getDocFromCache(userRef);
      if (cacheDoc.exists()) {
        existingData = cacheDoc.data();
      }
    } catch {
      // ignore
    }
  }

  let role: UserRole = 'user';
  
  // Determine if owner
  if (user.email?.toLowerCase() === SYSTEM_OWNER_EMAIL.toLowerCase()) {
    role = 'owner';
  } else if (existingData?.role) {
    role = existingData.role;
  }

  const profileData: UserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: extraData?.displayName || existingData?.displayName || user.displayName || user.email?.split('@')[0] || 'فنان معارض',
    artistName: extraData?.artistName || existingData?.artistName || user.displayName || user.email?.split('@')[0] || 'فنان معارض',
    photoURL: extraData?.photoURL || existingData?.photoURL || user.photoURL || '',
    bio: extraData?.bio !== undefined ? extraData.bio : (existingData?.bio || ''),
    role: role,
    themePreset: extraData?.themePreset || existingData?.themePreset || 'classic',
    themeMode: extraData?.themeMode || existingData?.themeMode || 'light',
    createdAt: existingData?.createdAt || new Date().toISOString()
  };

  try {
    localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(profileData));
  } catch {}

  try {
    await setDoc(userRef, profileData, { merge: true });
  } catch (err) {
    console.warn('Notice: Could not write user profile to server (client offline):', err);
  }

  return profileData;
}
