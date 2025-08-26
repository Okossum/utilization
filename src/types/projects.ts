// Projekt-spezifische TypeScript Interfaces
// Erweiterte Projekt-Typen für Historisch, Geplant und Aktiv

import { ProjectHistoryItem, ProjectRole, ProjectSkill } from '../lib/types';

// ===== PROJEKT-TYP ENUMS =====

export type ProjectType = 'historical' | 'planned' | 'active';
export type ProjectSource = 'regular' | 'jira';
export type ProbabilityLevel = 25 | 50 | 75 | 100;

// ===== FORM-DATEN INTERFACES =====

export interface ProjectFormData {
  // Schritt 1: Projekt-Typ
  projectType: ProjectType;
  
  // Schritt 2: Projekt-Quelle (nur bei planned)
  projectSource?: ProjectSource;
  
  // Schritt 3: Grunddaten
  customer: string;
  projectName: string;
  description?: string;              // ✨ NEU: Projektbeschreibung
  
  // Schritt 4: Projekt-Details (nur bei planned)
  probability?: ProbabilityLevel;
  dailyRate?: number;
  plannedUtilization?: number;
  startDate?: string;
  endDate?: string;
  internalContact?: string;
  customerContact?: string;
  jiraTicketId?: string;
  
  // Schritt 4: Historisch-spezifisch
  duration?: string;
  activities?: string[];
  
  // Schritt 5: Rollen & Skills
  roles: ProjectRole[];
  skills: ProjectSkill[];
}

// ===== MODAL PROPS =====

export interface ProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: ProjectHistoryItem) => void;
  employeeId: string;
  employeeName: string;
  project?: ProjectHistoryItem; // Für Edit-Modus
  forceProjectType?: ProjectType; // Erzwingt einen bestimmten Projekt-Typ (z.B. nur 'planned')
}

export interface ProjectCardProps {
  project: ProjectHistoryItem;
  type: ProjectType;
  onEdit?: (project: ProjectHistoryItem) => void;
  onDelete?: (projectId: string) => void;
  onView?: (project: ProjectHistoryItem) => void;
  compact?: boolean;
}

// ===== EMPLOYEE DROPDOWN =====

export interface Employee {
  id: string;
  name: string;
  displayName: string;
  email: string;
  bereich?: string;
  cc?: string;
  team?: string;
  lob?: string;
}

export interface EmployeeDropdownProps {
  value?: string;
  onChange: (employeeId: string) => void;
  filterBy?: ('bereich' | 'cc' | 'team' | 'lob')[];
  label?: string;
  placeholder?: string;
  employees?: Employee[];
}

export interface EmployeeFilter {
  bereich: string;
  cc: string;
  team: string;
  lob: string;
}

// ===== PROBABILITY SELECTOR =====

export interface ProbabilitySelectorProps {
  value?: ProbabilityLevel;
  onChange: (probability: ProbabilityLevel) => void;
  label?: string;
  showPercentage?: boolean;
}

export interface ProbabilityOption {
  value: ProbabilityLevel;
  label: string;
  description: string;
  color: string;
}

// ===== UTILITY TYPES =====

export interface ProjectsByType {
  historical: ProjectHistoryItem[];
  planned: ProjectHistoryItem[];
  active: ProjectHistoryItem[];
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  plannedProjects: number;
  historicalProjects: number;
  averageProbability: number;
  totalDailyRate: number;
}

// ===== VALIDATION =====

export interface ProjectValidation {
  isValid: boolean;
  errors: {
    customer?: string;
    projectName?: string;
    probability?: string;
    dailyRate?: string;
    startDate?: string;
    endDate?: string;
    jiraTicketId?: string;
    roles?: string;
    skills?: string;
  };
}

// ===== CONSTANTS =====

export const PROBABILITY_OPTIONS: ProbabilityOption[] = [
  {
    value: 25,
    label: 'Interessent',
    description: 'Erste Gespräche, unverbindlich',
    color: 'bg-red-100 text-red-800'
  },
  {
    value: 50,
    label: 'Qualifiziert',
    description: 'Konkretes Interesse, Anforderungen bekannt',
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    value: 75,
    label: 'Verhandlung',
    description: 'Angebot erstellt, in Verhandlung',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    value: 100,
    label: 'Beauftragt',
    description: 'Vertrag unterschrieben, Projekt startet',
    color: 'bg-green-100 text-green-800'
  }
];

export const PROJECT_TYPE_LABELS = {
  historical: 'Historisches Projekt',
  planned: 'Geplantes Projekt',
  active: 'Aktives Projekt'
} as const;

export const PROJECT_SOURCE_LABELS = {
  regular: 'Reguläres Kundenprojekt',
  jira: 'JIRA Ticket (andere LoB)'
} as const;
