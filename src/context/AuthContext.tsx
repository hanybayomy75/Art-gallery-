import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider, getUserProfile, createOrUpdateUserProfile } from '../lib/firebase';
import { UserProfile, ThemePreset, ThemeMode } from '../types';
import { applyThemeToDocument } from '../lib/theme';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
  isThemeModalOpen: boolean;
  setIsThemeModalOpen: (open: boolean) => void;
  authActionPrompt: string | null;
  requireAuth: (promptMessage?: string, action?: () => void) => boolean;
  themePreset: ThemePreset;
  themeMode: ThemeMode;
  setThemePreset: (preset: ThemePreset) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  registerWithEmail: (e: string, p: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [authActionPrompt, setAuthActionPrompt] = useState<string | null>(null);

  // Local theme state
  const [themePreset, setThemePresetState] = useState<ThemePreset>(() => {
    return (localStorage.getItem('theme_preset') as ThemePreset) || 'classic';
  });
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme_mode') as ThemeMode) || 'light';
  });

  // Apply theme when state changes
  useEffect(() => {
    applyThemeToDocument(themePreset, themeMode);
    localStorage.setItem('theme_preset', themePreset);
    localStorage.setItem('theme_mode', themeMode);
  }, [themePreset, themeMode]);

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        let profile = await getUserProfile(currentUser.uid);
        if (!profile) {
          profile = await createOrUpdateUserProfile(currentUser);
        }
        setUserProfile(profile);

        // Sync theme preference from profile if present
        if (profile.themePreset) {
          setThemePresetState(profile.themePreset as ThemePreset);
        }
        if (profile.themeMode) {
          setThemeModeState(profile.themeMode as ThemeMode);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const profile = await getUserProfile(user.uid);
      if (profile) {
        setUserProfile(profile);
      }
    }
  };

  const requireAuth = (promptMessage?: string, action?: () => void): boolean => {
    if (!user) {
      setAuthActionPrompt(promptMessage || 'يرجى تسجيل الدخول للقيام بهذا الإجراء');
      setIsAuthModalOpen(true);
      return false;
    }
    if (action) action();
    return true;
  };

  const setThemePreset = async (preset: ThemePreset) => {
    setThemePresetState(preset);
    if (user && userProfile) {
      await createOrUpdateUserProfile(user, { themePreset: preset });
      setUserProfile((prev) => prev ? { ...prev, themePreset: preset } : null);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    if (user && userProfile) {
      await createOrUpdateUserProfile(user, { themeMode: mode });
      setUserProfile((prev) => prev ? { ...prev, themeMode: mode } : null);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const profile = await createOrUpdateUserProfile(res.user);
      setUserProfile(profile);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      throw new Error(err.message || 'حدث خطأ أثناء تسجيل الدخول برابط Google');
    }
  };

  const signInWithFacebook = async () => {
    try {
      const res = await signInWithPopup(auth, facebookProvider);
      const profile = await createOrUpdateUserProfile(res.user);
      setUserProfile(profile);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.error('Facebook Sign-In Error:', err);
      throw new Error('حدث خطأ أثناء تسجيل الدخول عبر Facebook. تأكد من تفعيل مزود Facebook في إعدادات Firebase');
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    const profile = await createOrUpdateUserProfile(res.user);
    setUserProfile(profile);
    setIsAuthModalOpen(false);
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    const profile = await createOrUpdateUserProfile(res.user, { displayName: name, artistName: name });
    setUserProfile(profile);
    setIsAuthModalOpen(false);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isUploadModalOpen,
        setIsUploadModalOpen,
        isThemeModalOpen,
        setIsThemeModalOpen,
        authActionPrompt,
        requireAuth,
        themePreset,
        themeMode,
        setThemePreset,
        setThemeMode,
        signInWithGoogle,
        signInWithFacebook,
        loginWithEmail,
        registerWithEmail,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
