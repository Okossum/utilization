// ========================================
// DATABASE TYPES - Ersetzt alle any Types
// ========================================

// API Request/Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User Profile Types
export interface UserProfileData {
  displayName?: string;
  role?: string;
  email?: string;
  uid?: string;
  isAdmin?: boolean;
}

export interface UserUpdateData {
  displayName?: string;
  role?: string;
  isAdmin?: boolean;
  lob?: string | null;
  bereich?: string | null;
  competenceCenter?: string | null;
  team?: string | null;
  canViewAll?: boolean;
}

// Auslastung (Utilization) Types
export interface AuslastungDataItem {
  person: string;
  project: string;
  week: number;
  year: number;
  utilization: number;
  [key: string]: any; // Für zusätzliche dynamische Felder
}

export interface AuslastungSaveRequest {
  fileName: string;
  data: AuslastungDataItem[];
}

// Einsatzplan (Deployment Plan) Types
export interface EinsatzplanDataItem {
  person: string;
  project: string;
  week: number;
  year: number;
  hours: number;
  [key: string]: any; // Für zusätzliche dynamische Felder
}

export interface EinsatzplanSaveRequest {
  fileName: string;
  data: EinsatzplanDataItem[];
}

// Employee Dossier Types
export interface EmployeeDossierData {
  uid: string;
  displayName: string;
  email: string;
  skills: string[];
  experience: number;
  location?: string;
  availability?: string;
  [key: string]: any; // Für zusätzliche dynamische Felder
}

export interface EmployeeDossierSaveRequest {
  uid: string;
  data: EmployeeDossierData;
}

// Upload History Types
export interface UploadHistoryItem {
  id: string;
  fileName: string;
  uploadDate: string;
  fileType: 'auslastung' | 'einsatzplan';
  status: 'success' | 'error' | 'processing';
  recordsCount: number;
}

// Consolidated Data Types
export interface ConsolidatedDataItem {
  person: string;
  project: string;
  week: number;
  year: number;
  utilization: number;
  plannedHours: number;
  actualHours?: number;
  variance?: number;
  [key: string]: any; // Für zusätzliche dynamische Felder
}

export interface ConsolidatedDataSaveRequest {
  data: ConsolidatedDataItem[];
  timestamp: string;
}

// Generic Data Types für Flexibilität
export type GenericDataArray = Array<Record<string, any>>;
export type GenericDataObject = Record<string, any>;

// API Endpoint Types
export type ApiEndpoint = 
  | '/me'
  | '/users'
  | '/auslastung'
  | '/einsatzplan'
  | '/upload-history'
  | '/employee-dossier'
  | '/employee-dossiers'
  | '/utilization-data/bulk';

// HTTP Method Types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// Request Options Types
export interface RequestOptions {
  method: HttpMethod;
  body?: string;
  headers?: Record<string, string>;
}
