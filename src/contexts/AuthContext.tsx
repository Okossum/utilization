import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import app from '../lib/firebase';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, User, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { setAuthTokenProvider } from '../services/database';
// DatabaseService removed - using direct Firebase calls
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { UserRole, canAccessView, canAccessSettings, canManageUsers, canUploadData, canViewAllEmployees } from '../lib/permissions';
import { UserManagementService } from '../services/userManagement';
import { COLLECTIONS } from '../lib/types';

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

  // 🔒 SICHERHEIT: Session-Persistenz konfigurieren - User wird beim Schließen des Tabs ausgeloggt
  useEffect(() => {
    const configurePersistence = async () => {
      try {
        await setPersistence(auth, browserSessionPersistence);
        console.log('🔒 Session-Persistenz konfiguriert: User wird beim Schließen des Tabs ausgeloggt');
      } catch (error) {
        console.error('❌ Fehler beim Konfigurieren der Session-Persistenz:', error);
      }
    };
    configurePersistence();
  }, [auth]);

  // 🔐 Neue Funktion: Rolle aus separater users Collection laden
  const loadUserRoleFromUserManagement = useCallback(async (userUid: string, userEmail: string): Promise<UserRole> => {
    try {
      console.log('🔍 Lade Rolle für UID/E-Mail:', userUid, userEmail);
      
      // Primär: Suche nach UID in users Collection
      let userProfile = await UserManagementService.getUserByUid(userUid);
      
      // Fallback: Suche nach E-Mail in users Collection
      if (!userProfile && userEmail) {
        userProfile = await UserManagementService.getUserByEmail(userEmail);
      }
      
      // Fallback: Suche in utilizationData Collection (Legacy)
      if (!userProfile && userEmail) {
        console.log('🔄 Fallback: Suche in utilizationData Collection');
        const utilizationQuery = query(
          collection(db, COLLECTIONS.UTILIZATION_DATA),
          where('email', '==', userEmail)
        );
        
        const querySnapshot = await getDocs(utilizationQuery);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          const systemRole = userData.systemRole;
          const hasSystemAccess = userData.hasSystemAccess;
          
          console.log('📋 Legacy-Daten gefunden:', { systemRole, hasSystemAccess });
          
          if (hasSystemAccess && systemRole) {
            console.log('✅ Legacy-Rolle zugewiesen:', systemRole);
            return systemRole as UserRole;
          }
        }
      }
      
      if (userProfile && userProfile.hasSystemAccess && userProfile.systemRole) {
        console.log('✅ Rolle aus users Collection:', userProfile.systemRole);
        
        // Update last login
        await UserManagementService.updateLastLogin(userUid);
        
        return userProfile.systemRole as UserRole;
      } else {
        console.log('❌ Kein System-Zugriff oder keine Rolle gefunden');
        return 'unknown';
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
          
          // Rolle aus users Collection laden (mit Legacy-Fallback)
          if (nextUser.uid && nextUser.email) {
            const userRole = await loadUserRoleFromUserManagement(nextUser.uid, nextUser.email);
            setRole(userRole);
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
  }, [auth, loadUserRoleFromUserManagement]);

  const refreshProfile = useCallback(async () => {
    try {
      // Direct Firebase call instead of DatabaseService
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const me = userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
      setProfile(me || null);
      
      // Rolle aus users Collection laden
      if (user.uid && user.email) {
        const userRole = await loadUserRoleFromUserManagement(user.uid, user.email);
        setRole(userRole);
        console.log('🎭 Rolle gesetzt:', userRole);
      }
    } catch {
      setProfile(null);
      setRole('unknown');
    }
  }, [user, loadUserRoleFromUserManagement]);

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


