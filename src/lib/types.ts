// Firebase Firestore Datenmodelle für Resource Utilization

export interface UploadedFile {
  name: string;
  data: any[];
  isValid: boolean;
  error?: string;
  preview?: string[][];
  debug?: string[];
  uploadedAt: Date;
  fileSize: number;
}

export interface UtilizationData {
  person: string;
  week: string;
  utilization: number | null;
  isHistorical: boolean;
}

export interface PlannedEngagement {
  person: string;
  customer: string;
  project: string;
  startDate: string;
  endDate: string;
  utilization: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonStatus {
  person: string;
  status: string;
  source: 'manual' | 'rule' | 'default';
  updatedAt: Date;
}

export interface PersonActionItem {
  person: string;
  actionItem: boolean;
  source: 'manual' | 'rule' | 'default';
  updatedAt: Date;
  updatedBy?: string; // Name des Benutzers, der die Änderung vorgenommen hat
}

export interface PersonTravelReadiness {
  person: string;
  readiness: number; // 0-100
  updatedAt: Date;
}

export interface Customer {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDoc {
  name: string;
  customer: string;
  createdAt: Date;
  updatedAt: Date;
}

// NEU: Assignment (Projekt-Zuordnung Mitarbeiter ↔ Projekt)
export interface AssignmentDoc {
  // Aktuell nutzen wir employeeName analog zu bestehenden Strukturen
  employeeName: string;
  // Projekt-Referenz per ID (aus projects Collection)
  projectId: string;
  // Optional denormalisierte Felder (können bei Erstellung mitgegeben werden)
  projectName?: string;
  customer?: string;
  // Metadaten
  startDate?: string; // ISO-String
  endDate?: string;   // ISO-String
  offeredSkill?: string;
  plannedAllocationPct?: number; // 0-100
  role?: string;
  status?: 'prospect' | 'planned' | 'active' | 'onHold' | 'closed' | 'proposed';
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillDoc {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Skill Interface für Employee
export interface Skill {
  id: string;
  name: string;
  level?: number;
  rating?: number;      // Für SkillRating Kompatibilität
  categoryId?: string;  // Für EmployeeSkillAssignment Kompatibilität
}

// Project Interface für Employee (kompatibel mit ProjectHistoryItem)
export interface Project {
  id: string;
  name: string;
  projectName?: string;     // Alias für name
  customer?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  activities?: string[];
  description?: string;
  skillsUsed?: string[];
  employeeRole?: string;
}

// Einheitliche Employee Interface für alle Komponenten
export interface Employee {
  id: string;
  name: string;
  lbs: string;              // Karrierestufe (wird als Untertitel angezeigt)
  cc: string;               // Competence Center
  team: string;
  role: string;             // Für EmployeeCard Kompatibilität
  bereich?: string;         // Optional für erweiterte Filterung
  lob?: string;             // Line of Business
  displayName?: string;     // Optional für erweiterte Anzeige
  email?: string;           // Optional für Kontakt
  position?: string;        // Optional für Position
  
  // Erweiterte Properties für EmployeeCard
  mainRole?: string;        // Hauptrolle
  profileUrl?: string;      // Link zum Profil
  vg?: string;              // Vorgesetzter
  phone?: string;           // Telefonnummer
  location?: string;        // Standort
  startDate?: string;       // Startdatum
  status?: string;          // Status (aktiv, inaktiv, etc.)
  utilization?: number;     // Aktuelle Auslastung
  averageUtilization?: number; // Durchschnittliche Auslastung
  
  // Skills und Projekte
  skills?: Skill[];
  technicalSkills?: Skill[];
  softSkills?: Skill[];
  completedProjects?: Project[];
  plannedProjects?: Project[];
  
  // Stärken/Schwächen
  strengths?: string[];
  weaknesses?: string[];
  
  // Kommentare
  utilizationComment?: string;
  planningComment?: string;
  
  // Callback für Projekt-Erstellung
  onCreateProject?: () => void;
}

export interface EmployeeSkillDoc {
  employeeName: string;
  skillId: string;
  skillName: string;
  level: number; // 0-5, step 0.5
  createdAt: Date;
  updatedAt: Date;
}



// Firestore Collection Names
export const COLLECTIONS = {
  UPLOADED_FILES: 'uploaded_files',
  UTILIZATION_DATA: 'utilizationData',
  PLANNED_ENGAGEMENTS: 'planned_engagements',
  PERSON_STATUS: 'person_status',
  PERSON_ACTION_ITEMS: 'person_action_items',
  PERSON_TRAVEL_READINESS: 'person_travel_readiness',
  CUSTOMERS: 'customers',
  PROJECTS: 'projects',
  SKILLS: 'skills',
  EMPLOYEE_SKILLS: 'employee_skills',
  ASSIGNMENTS: 'assignments',
  AUSLASTUNGSERKLAERUNGEN: 'auslastungserklaerungen',
  PERSON_AUSLASTUNGSERKLAERUNGEN: 'person_auslastungserklaerungen',
  PERSON_STANDARD_STATUSES: 'person_standard_statuses'
} as const;

// Firestore Document IDs
export interface FirestoreDocument {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Erweiterte Interfaces mit Firestore-spezifischen Feldern
export interface FirestoreUploadedFile extends UploadedFile, FirestoreDocument {
  userId?: string; // Für zukünftige Authentifizierung
}

export interface FirestorePlannedEngagement extends PlannedEngagement, FirestoreDocument {
  userId?: string;
}

export interface FirestorePersonStatus extends PersonStatus, FirestoreDocument {
  userId?: string;
}

export interface FirestorePersonActionItem extends PersonActionItem, FirestoreDocument {
  userId?: string;
}

export interface FirestorePersonTravelReadiness extends PersonTravelReadiness, FirestoreDocument {
  userId?: string;
}

export interface FirestoreCustomer extends Customer, FirestoreDocument {
  userId?: string;
}

export interface FirestoreProject extends ProjectDoc, FirestoreDocument {
  userId?: string;
}

export interface FirestoreSkill extends SkillDoc, FirestoreDocument {
  userId?: string;
}

export interface FirestoreEmployeeSkill extends EmployeeSkillDoc, FirestoreDocument {
  userId?: string;
}

export interface FirestoreAssignment extends AssignmentDoc, FirestoreDocument {
  userId?: string;
}

// ===== UTILIZATION DATA HUB - SKILLS & ROLLEN =====

export interface AssignedRole {
  roleId: string;
  roleName: string;
  categoryName: string;
  level?: number; // 1-5 Sterne
  tasks?: string[];
  assignedAt: string; // ISO Date
  assignedBy?: string; // User ID/Email
  updatedAt?: string; // ISO Date
}

export interface AssignedTechnicalSkill {
  skillId: string;
  skillName: string;
  categoryName: string;
  rating: number; // 0-5, step 0.5
  assessedAt: string; // ISO Date
  assessedBy?: string; // User ID/Email
  updatedAt?: string; // ISO Date
  certificationLevel?: string; // "Beginner", "Intermediate", "Advanced", "Expert"
}

export interface AssignedSoftSkill {
  skillId: string;
  skillName: string;
  categoryName: string;
  rating: number; // 0-5, step 0.5
  assessedAt: string; // ISO Date
  assessedBy?: string; // User ID/Email
  updatedAt?: string; // ISO Date
  description?: string; // Freitext-Beschreibung
}

// Erweiterte UtilizationData mit Skills & Rollen Hub
export interface UtilizationDataHub {
  // Basis-Felder (bestehend)
  person: string;
  id: string; // Eindeutige Person-ID
  lob?: string; // Line of Business
  bereich?: string; // Bereich
  cc?: string; // Cost Center
  team?: string; // Team
  email?: string; // E-Mail
  
  // Auslastungs- und Einsatzplan-Daten
  values?: Record<string, number>; // Week keys: "25/01", "25/02", etc.
  
  // Projekt-Referenzen (bereits implementiert)
  projectReferences?: Array<{
    projectId: string;
    projectName: string;
    customer: string;
    projectType: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    duration?: string;
    roles?: ProjectRole[];
    skills?: ProjectSkill[];
    activities?: string[];
    addedAt: string;
    updatedAt: string;
  }>;
  
  // NEU: Skills & Rollen Hub
  assignedRoles?: AssignedRole[];
  technicalSkills?: AssignedTechnicalSkill[];
  softSkills?: AssignedSoftSkill[];
  
  // NEU: Mitarbeiter-Dossier Daten
  strengths?: string; // Stärken des Mitarbeiters
  weaknesses?: string; // Schwächen/Entwicklungsbereiche
  comments?: string; // Allgemeine Kommentare
  phone?: string; // Telefonnummer
  location?: string; // Standort
  position?: string; // Position/Rolle
  
  // Meta-Daten
  createdAt?: string; // ISO Date
  updatedAt?: string; // ISO Date
}

// ===== ERWEITERTE PROJEKT-TYPEN =====

export interface ProjectRole {
  id: string;
  name: string;
  categoryName: string;
  tasks: string[];
  level?: number; // 1-5 Sterne
}

export interface ProjectSkill {
  id: string;
  name: string;
  categoryName: string;
  level: number; // 1-5 Sterne
}

export interface ProjectHistoryItem {
  id: string;
  
  // ===== BASIS-FELDER (alle Typen) =====
  customer: string;
  projectName: string;
  description?: string;              // ✨ NEU: Projektbeschreibung
  roles: ProjectRole[];
  skills: ProjectSkill[];
  
  // ===== TYP-KLASSIFIZIERUNG =====
  projectType: 'historical' | 'planned' | 'active';
  projectSource?: 'regular' | 'jira'; // nur bei planned/active
  
  // ===== GEPLANT/AKTIV-SPEZIFISCHE FELDER =====
  probability?: number; // 0-100%
  dailyRate?: number; // €/Tag
  startDate?: string; // ISO Date
  endDate?: string; // ISO Date
  internalContact?: string; // Mitarbeiter-ID
  customerContact?: string; // Freitext
  jiraTicketId?: string; // JIRA-12345
  
  // ===== HISTORISCH-SPEZIFISCHE FELDER =====
  duration?: string; // "6 Monate" (nur bei historical)
  activities?: string[]; // ["Task 1", "Task 2"] (nur bei historical)
  
  // ===== LEGACY-FELDER (Rückwärtskompatibilität) =====
  role?: string; // Hauptrolle (deprecated, use roles array)
  status?: 'closed' | 'active'; // (deprecated, use projectType)
  plannedAllocationPct?: number; // (deprecated)
  comment?: string; // (deprecated)
  
  // ===== META-DATEN =====
  createdAt: Date;
  updatedAt: Date;
  employeeId: string; // Zuordnung zum Mitarbeiter
}

export interface ProjectOffer {
  id: string;
  customerName: string;
  projectName: string;
  probability: number; // 0-100%
  dailyRate?: number;
  startDate?: string;
  endDate?: string;
  internalContact?: string;
  customerContact?: string;
  jiraTicketId?: string;
  roles: ProjectRole[];
  skills: ProjectSkill[];
  createdAt: Date;
  updatedAt: Date;
}

// Firestore-Versionen
export interface FirestoreProjectHistoryItem extends ProjectHistoryItem, FirestoreDocument {
  userId?: string;
}

export interface FirestoreProjectOffer extends ProjectOffer, FirestoreDocument {
  userId?: string;
}

export interface FirestorePersonActionItem extends PersonActionItem, FirestoreDocument {
  // Zusätzliche Firestore-spezifische Felder falls nötig
}


