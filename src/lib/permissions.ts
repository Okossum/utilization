// Berechtigungslogik für rollenbasierte Zugriffskontrolle

export type UserRole = 'admin' | 'führungskraft' | 'sales' | 'user' | 'unknown';

export interface RolePermissions {
  views: string[];
  settings: string[];
  canManageUsers: boolean;
  canUploadData: boolean;
  canViewAllEmployees: boolean;
}

// Zentrale Berechtigungsmatrix
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    views: ['utilization', 'employees', 'sales'],
    settings: ['all'], // Vollzugriff auf alle Settings
    canManageUsers: true,
    canUploadData: true,
    canViewAllEmployees: true
  },
  führungskraft: {
    views: ['utilization', 'employees'],
    settings: ['excel-upload'], // Nur Excel-Upload im Settings
    canManageUsers: false,
    canUploadData: true,
    canViewAllEmployees: true
  },
  sales: {
    views: ['sales'],
    settings: [], // Kein Settings-Zugriff
    canManageUsers: false,
    canUploadData: false,
    canViewAllEmployees: false
  },
  user: {
    views: ['utilization'], // Nur Auslastungsansicht
    settings: [], // Keine Settings
    canManageUsers: false,
    canUploadData: false,
    canViewAllEmployees: false // Nur eigenes Profil später
  },
  unknown: {
    views: [],
    settings: [],
    canManageUsers: false,
    canUploadData: false,
    canViewAllEmployees: false
  }
};

// Helper-Funktionen für Berechtigungsprüfungen
export const canAccessView = (role: UserRole, view: string): boolean => {
  return ROLE_PERMISSIONS[role].views.includes(view);
};

export const canAccessSettings = (role: UserRole, setting: string): boolean => {
  const permissions = ROLE_PERMISSIONS[role].settings;
  return permissions.includes('all') || permissions.includes(setting);
};

export const canManageUsers = (role: UserRole): boolean => {
  return ROLE_PERMISSIONS[role].canManageUsers;
};

export const canUploadData = (role: UserRole): boolean => {
  return ROLE_PERMISSIONS[role].canUploadData;
};

export const canViewAllEmployees = (role: UserRole): boolean => {
  return ROLE_PERMISSIONS[role].canViewAllEmployees;
};

// Alle verfügbaren Views
export const ALL_VIEWS = ['utilization', 'employees', 'sales'] as const;

// Alle verfügbaren Settings
export const ALL_SETTINGS = [
  'excel-upload',
  'user-management', 
  'role-management',
  'technical-skills',
  'soft-skills',
  'hierarchical-roles',
  'customer-projects',
  'auslastungserklaerung'
] as const;

// Debug-Funktion für Entwicklung
export const debugPermissions = (role: UserRole) => {
  console.log(`🎭 Berechtigungen für Rolle "${role}":`, ROLE_PERMISSIONS[role]);
};
