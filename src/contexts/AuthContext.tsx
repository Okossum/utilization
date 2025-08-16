import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import app from '../lib/firebase';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { setAuthTokenProvider } from '../services/database';
import DatabaseService from '../services/database';

type UserRole = 'bereichsleiter' | 'cc' | 'teamleiter' | 'sales' | 'unknown';

interface AuthContextValue {
  user: User | null;
  role: UserRole;
  loading: boolean;
  token: string | null;
  profile: UserProfile | null;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile & { canViewAll: boolean }>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface UserProfile {
  id?: string;
  uid?: string;
  email?: string;
  displayName?: string;
  role?: UserRole | string;
  canViewAll?: boolean;
  lob?: string | null;
  bereich?: string | null;
  businessUnit?: string | null;
  competenceCenter?: string | null;
  team?: string | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useMemo(() => getAuth(app), []);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('unknown');
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const idTokenResult = await nextUser.getIdTokenResult(true);
          setToken(idTokenResult.token || null);
          const claimedRole = (idTokenResult.claims?.role as string | undefined) || 'unknown';
          if (claimedRole === 'bereichsleiter' || claimedRole === 'cc' || claimedRole === 'teamleiter' || claimedRole === 'sales') {
            setRole(claimedRole);
          } else {
            setRole('unknown');
          }
          // Load server-side user profile
          try {
            const me = await DatabaseService.getMe();
            setProfile(me || null);
          } catch {
            setProfile(null);
          }
        } catch {
          setToken(null);
          setRole('unknown');
          setProfile(null);
        }
      } else {
        setToken(null);
        setRole('unknown');
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  // Provide token to API layer without using localStorage
  useEffect(() => {
    setAuthTokenProvider(async () => {
      try {
        const current = getAuth(app).currentUser;
        if (!current) return null;
        const t = await current.getIdToken();
        return t || null;
      } catch {
        return null;
      }
    });
  }, []);
  const refreshProfile = useCallback(async () => {
    try {
      const me = await DatabaseService.getMe();
      setProfile(me || null);
    } catch {
      setProfile(null);
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<UserProfile & { canViewAll: boolean }>) => {
    await DatabaseService.updateMe(data);
    await refreshProfile();
  }, [refreshProfile]);

  const loginWithEmailPassword = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, [auth]);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, [auth]);

  const value: AuthContextValue = {
    user,
    role,
    loading,
    token,
    profile,
    loginWithEmailPassword,
    logout,
    refreshProfile,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


