// Berechtigungslogik für rollenbasierte Zugriffskontrolle

export type UserRole = 'admin' | 'führungskraft' | 'sales' | 'user' | 'unknown';

export interface RolePermissions {
  views: string[];
  settings: string[];
  canManageUsers: boolean;
  canUploadData: boolean;
  canViewAllEmployees: boolean;
}

// 🎯 PRODUKTIVE BERECHTIGUNGEN: Rollenbasierte Zugriffskontrolle
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    views: ['utilization', 'employees', 'sales'],
    settings: ['all'], // Vollzugriff auf alle Settings
    canManageUsers: true,
    canUploadData: true,
    canViewAllEmployees: true
  },
  führungskraft: {
    views: ['utilization', 'employees', 'sales'],
    settings: ['excel-upload', 'help'], // Excel-Upload und Help erlaubt
    canManageUsers: false,
    canUploadData: true, // Darf Excel-Daten hochladen
    canViewAllEmployees: true // Kann alle Mitarbeiter sehen
  },
  sales: {
    views: ['sales'], // Nur Sales View - kein Zugriff auf 'utilization' oder 'employees'
    settings: ['help'], // Nur Help-Berechtigung
    canManageUsers: false,
    canUploadData: false,
    canViewAllEmployees: false // Nur eigenen Bereich
  },
  user: {
    views: [], // Kein Zugriff auf Views
    settings: [], // Kein Zugriff auf Settings
    canManageUsers: false,
    canUploadData: false,
    canViewAllEmployees: false
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
  'auslastungserklaerung',
  'profiler-import',
  'general-settings',
  'data-management',
  'help'
] as const;

// Settings-Kategorien für UI-Gruppierung
export const SETTINGS_CATEGORIES = {
  'help': {
    title: 'Hilfe & Anleitung',
    icon: 'HelpCircle',
    settings: ['help'],
    description: 'Benutzeranleitung und Support'
  },
  'data': {
    title: 'Daten-Management',
    icon: 'Database',
    settings: ['excel-upload', 'profiler-import', 'data-management'],
    description: 'Excel-Upload, Profiler-Import und Datenmanagement'
  },
  'users': {
    title: 'Benutzerverwaltung',
    icon: 'Users',
    settings: ['user-management', 'role-management'],
    description: 'Benutzer- und Rollenverwaltung'
  },
  'skills': {
    title: 'Skills & Rollen',
    icon: 'Star',
    settings: ['technical-skills', 'soft-skills', 'hierarchical-roles'],
    description: 'Skill- und Rollenverwaltung'
  },
  'projects': {
    title: 'Projekte',
    icon: 'Briefcase',
    settings: ['customer-projects', 'auslastungserklaerung'],
    description: 'Projekt- und Auslastungsverwaltung'
  },
  'general': {
    title: 'Allgemeine Einstellungen',
    icon: 'Settings',
    settings: ['general-settings'],
    description: 'Allgemeine App-Einstellungen'
  }
} as const;


