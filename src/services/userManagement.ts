import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS, UserProfile } from '../lib/types';

/**
 * 🔐 User Management Service
 * Separate Service für User-Verwaltung, getrennt von utilizationData
 */
export class UserManagementService {
  
  /**
   * Erstelle oder aktualisiere User-Profil
   */
  static async createOrUpdateUser(userData: Partial<UserProfile>): Promise<UserProfile> {
    if (!userData.uid || !userData.email) {
      throw new Error('UID und E-Mail sind erforderlich');
    }

    const userRef = doc(db, COLLECTIONS.USERS, userData.uid);
    const now = new Date();
    
    // Prüfe ob User bereits existiert
    const existingUser = await getDoc(userRef);
    
    const userProfile: UserProfile = {
      id: userData.uid,
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName || '',
      
      // System Access & Roles
      systemRole: userData.systemRole || 'unknown',
      hasSystemAccess: userData.hasSystemAccess || false,
      
      // Organizational Data
      employeeId: userData.employeeId,
      lob: userData.lob,
      bereich: userData.bereich,
      cc: userData.cc,
      team: userData.team,
      
      // Role Management Metadata
      roleAssignedBy: userData.roleAssignedBy,
      roleAssignedAt: userData.roleAssignedAt || now,
      lastRoleUpdate: now,
      roleHistory: userData.roleHistory || [],
      
      // Account Status
      isActive: userData.isActive !== false, // Default: true
      ...(userData.lastLoginAt && { lastLoginAt: userData.lastLoginAt }),
      ...(userData.accountCreatedBy && { accountCreatedBy: userData.accountCreatedBy }),
      
      // Firestore Metadata
      createdAt: existingUser.exists() ? existingUser.data().createdAt : now,
      updatedAt: now
    };

    // Füge Role History hinzu wenn Rolle geändert wird
    if (existingUser.exists()) {
      const existing = existingUser.data() as UserProfile;
      if (existing.systemRole !== userProfile.systemRole) {
        userProfile.roleHistory = [
          ...(existing.roleHistory || []),
          {
            role: existing.systemRole,
            assignedBy: existing.roleAssignedBy || 'system',
            assignedAt: existing.roleAssignedAt || existing.createdAt,
            reason: 'Role changed'
          }
        ];
      }
    }

    await setDoc(userRef, userProfile);
    return userProfile;
  }

  /**
   * Lade User-Profil per UID
   */
  static async getUserByUid(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }
    
    return userSnap.data() as UserProfile;
  }

  /**
   * Lade User-Profil per E-Mail
   */
  static async getUserByEmail(email: string): Promise<UserProfile | null> {
    const usersQuery = query(
      collection(db, COLLECTIONS.USERS),
      where('email', '==', email),
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(usersQuery);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    return querySnapshot.docs[0].data() as UserProfile;
  }

  /**
   * Lade alle aktiven User
   */
  static async getAllActiveUsers(): Promise<UserProfile[]> {
    // Vereinfachte Query ohne Index-Anforderung
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
    return querySnapshot.docs
      .map(doc => doc.data() as UserProfile)
      .filter(user => user.isActive)
      .sort((a, b) => a.email.localeCompare(b.email));
  }

  /**
   * Aktualisiere User-Rolle
   */
  static async updateUserRole(
    uid: string, 
    newRole: UserProfile['systemRole'], 
    hasAccess: boolean,
    assignedBy: string,
    reason?: string
  ): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error(`User mit UID ${uid} nicht gefunden`);
    }
    
    const existingUser = userSnap.data() as UserProfile;
    const now = new Date();
    
    // Füge zur Role History hinzu
    const newRoleHistory = [
      ...(existingUser.roleHistory || []),
      {
        role: existingUser.systemRole,
        assignedBy: existingUser.roleAssignedBy || 'system',
        assignedAt: existingUser.roleAssignedAt || existingUser.createdAt,
        reason: reason || 'Role updated'
      }
    ];

    await updateDoc(userRef, {
      systemRole: newRole,
      hasSystemAccess: hasAccess,
      roleAssignedBy: assignedBy,
      roleAssignedAt: now,
      lastRoleUpdate: now,
      roleHistory: newRoleHistory,
      updatedAt: now
    });
  }

  /**
   * Deaktiviere User-Account
   */
  static async deactivateUser(uid: string, deactivatedBy: string): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    
    await updateDoc(userRef, {
      isActive: false,
      hasSystemAccess: false,
      deactivatedBy,
      deactivatedAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Migriere User-Daten aus utilizationData Collection
   */
  static async migrateFromUtilizationData(): Promise<{
    migrated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migrated = 0;

    try {
      // Lade alle User mit systemRole aus utilizationData
      const utilizationQuery = query(
        collection(db, COLLECTIONS.UTILIZATION_DATA),
        where('systemRole', '!=', null)
      );
      
      const utilizationSnapshot = await getDocs(utilizationQuery);
      const batch = writeBatch(db);
      
      for (const utilizationDoc of utilizationSnapshot.docs) {
        try {
          const data = utilizationDoc.data();
          
          if (!data.email || !data.systemRole) {
            continue;
          }

          // Erstelle User-Profil
          const userProfile: UserProfile = {
            id: data.email, // Verwende E-Mail als ID für Migration
            uid: data.email, // Temporär, wird bei Firebase Auth ersetzt
            email: data.email,
            displayName: data.person || '',
            
            systemRole: data.systemRole,
            hasSystemAccess: data.hasSystemAccess || false,
            
            employeeId: utilizationDoc.id,
            lob: data.lob,
            bereich: data.bereich,
            cc: data.cc,
            team: data.team,
            
            roleAssignedBy: data.roleAssignedBy || 'migration',
            roleAssignedAt: data.roleAssignedAt || new Date(),
            lastRoleUpdate: data.lastRoleUpdate || new Date(),
            roleHistory: [],
            
            isActive: true,
            accountCreatedBy: 'migration',
            
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const userRef = doc(db, COLLECTIONS.USERS, data.email);
          batch.set(userRef, userProfile);
          migrated++;
          
        } catch (error) {
          errors.push(`Fehler bei Migration von ${utilizationDoc.id}: ${error}`);
        }
      }
      
      await batch.commit();
      
    } catch (error) {
      errors.push(`Allgemeiner Migrationsfehler: ${error}`);
    }

    return { migrated, errors };
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(uid: string): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    
    await updateDoc(userRef, {
      lastLoginAt: new Date(),
      updatedAt: new Date()
    });
  }
}
