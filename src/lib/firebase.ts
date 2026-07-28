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

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID and long polling fallback for sandbox compatibility
const databaseId = firebaseConfigData.firestoreDatabaseId || '(default)';
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  }, databaseId);
} catch {
  firestoreDb = getFirestore(app, databaseId);
}

export const db = firestoreDb;
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const facebookProvider = new FacebookAuthProvider();

// Default Owner Email matching user context or system owner
export const SYSTEM_OWNER_EMAIL = 'hany.bayomy75@gmail.com';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function createOrUpdateUserProfile(user: FirebaseUser, extraData?: Partial<UserProfile>): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const existing = await getDoc(userRef);

  let role: UserRole = 'user';
  
  // Determine if owner
  if (user.email?.toLowerCase() === SYSTEM_OWNER_EMAIL.toLowerCase()) {
    role = 'owner';
  } else if (existing.exists()) {
    role = existing.data().role || 'user';
  }

  const profileData: UserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: extraData?.displayName || user.displayName || user.email?.split('@')[0] || 'فنان معارض',
    artistName: extraData?.artistName || existing.data()?.artistName || user.displayName || user.email?.split('@')[0] || 'فنان معارض',
    photoURL: extraData?.photoURL || user.photoURL || '',
    bio: extraData?.bio || existing.data()?.bio || '',
    role: role,
    themePreset: extraData?.themePreset || existing.data()?.themePreset || 'classic',
    themeMode: extraData?.themeMode || existing.data()?.themeMode || 'light',
    createdAt: existing.exists() ? existing.data().createdAt : new Date().toISOString()
  };

  await setDoc(userRef, profileData, { merge: true });
  return profileData;
}
