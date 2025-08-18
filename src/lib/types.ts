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
  updatedAt: Date;
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
  PERSON_TRAVEL_READINESS: 'person_travel_readiness',
  CUSTOMERS: 'customers',
  PROJECTS: 'projects',
  SKILLS: 'skills',
  EMPLOYEE_SKILLS: 'employee_skills'
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


