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
  status?: 'prospect' | 'planned' | 'active' | 'onHold' | 'closed';
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillDoc {
  name: string;
  createdAt: Date;
  updatedAt: Date;
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
  UTILIZATION_DATA: 'utilization_data',
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
  PERSON_AUSLASTUNGSERKLAERUNGEN: 'person_auslastungserklaerungen'

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


