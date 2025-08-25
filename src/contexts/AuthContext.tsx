import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import app from '../lib/firebase';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { setAuthTokenProvider } from '../services/database';
// DatabaseService removed - using direct Firebase calls
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { UserRole, canAccessView, canAccessSettings, canManageUsers, canUploadData, canViewAllEmployees, debugPermissions } from '../lib/permissions';

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
  
  // Berechtigungsfunktionen
  canAccessView: (view: string) => boolean;
  canAccessSettings: (setting: string) => boolean;
  canManageUsers: () => boolean;
  canUploadData: () => boolean;
  canViewAllEmployees: () => boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface UserProfile {
  id?: string;
  uid?: string;
  email?: string;
  displayName?: string;
  role?: UserRole | string;
  canViewAll?: boolean;
  lob?: string | null;
  bereich?: string | null;
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

  // Neue Funktion: Rolle aus utilizationData Collection laden
  const loadUserRoleFromUtilizationData = useCallback(async (userEmail: string): Promise<UserRole> => {
    try {
      console.log('🔍 Lade Rolle für E-Mail:', userEmail);
      
      // Suche in utilizationData Collection nach der E-Mail
      const utilizationQuery = query(
        collection(db, 'utilizationData'),
        where('email', '==', userEmail)
      );
      
      const querySnapshot = await getDocs(utilizationQuery);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        const systemRole = userData.systemRole;
        const hasSystemAccess = userData.hasSystemAccess;
        
        console.log('📋 Gefundene Daten:', { systemRole, hasSystemAccess });
        
        // Prüfe ob Benutzer System-Zugriff hat
        if (hasSystemAccess && systemRole) {
          console.log('✅ Rolle zugewiesen:', systemRole);
          return systemRole as UserRole;
        } else {
          console.log('❌ Kein System-Zugriff oder keine Rolle');
          return 'unknown';
        }
      } else {
        console.log('📭 Keine Daten in utilizationData gefunden für:', userEmail);
        console.log('🔍 Mögliche Ursachen:');
        console.log('  - E-Mail nicht in utilizationData vorhanden');
        console.log('  - Groß-/Kleinschreibung unterschiedlich');
        console.log('  - Benutzer hat keine Rolle zugewiesen');
        
        return 'unknown'; // Kein Zugriff wenn nicht in System
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Rolle:', error);
      return 'unknown';
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const idTokenResult = await nextUser.getIdTokenResult(true);
          setToken(idTokenResult.token || null);
          
          // ✅ SCHRITT 1: Token Provider SOFORT nach Login setzen
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
          
          // Rolle aus utilizationData Collection laden
          if (nextUser.email) {
            const userRole = await loadUserRoleFromUtilizationData(nextUser.email);
            setRole(userRole);
            console.log('🎭 Rolle beim Login gesetzt:', userRole);
            debugPermissions(userRole); // Debug-Output für Entwicklung
          } else {
            setRole('unknown');
          }
          
          // Load server-side user profile
          try {
            // Direct Firebase call instead of DatabaseService
            const userDoc = await getDoc(doc(db, 'users', nextUser.uid));
            const me = userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
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
  }, [auth, loadUserRoleFromUtilizationData]);

  const refreshProfile = useCallback(async () => {
    try {
      // Direct Firebase call instead of DatabaseService
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const me = userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
      setProfile(me || null);
      
      // Rolle aus utilizationData laden
      if (user.email) {
        const userRole = await loadUserRoleFromUtilizationData(user.email);
        setRole(userRole);
        console.log('🎭 Rolle gesetzt:', userRole);
      }
    } catch {
      setProfile(null);
      setRole('unknown');
    }
  }, [user, loadUserRoleFromUtilizationData]);

  const updateProfile = useCallback(async (data: Partial<UserProfile & { canViewAll: boolean }>) => {
    // Direct Firebase call instead of DatabaseService
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, data, { merge: true });
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
    
    // Berechtigungsfunktionen - verwenden die aktuelle Rolle
    canAccessView: (view: string) => canAccessView(role, view),
    canAccessSettings: (setting: string) => canAccessSettings(role, setting),
    canManageUsers: () => canManageUsers(role),
    canUploadData: () => canUploadData(role),
    canViewAllEmployees: () => canViewAllEmployees(role),
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


