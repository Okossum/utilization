import { Timestamp } from 'firebase/firestore';

export interface KnowledgeCategory {
  id: string;
  name: string;        // "Frameworks"
  nameLower: string;   // for case-insensitive matches
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isDeleted?: boolean; // soft delete
}

export interface KnowledgeSkill {
  id: string;
  name: string;              // "Spring Boot"
  nameLower: string;         // for case-insensitive matches
  categoryId: string;
  categoryName: string;      // denormalized
  status?: "Standard" | "Neu eingefügt";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isDeleted?: boolean;       // soft delete
  source?: "upload" | "manual";
}

export interface ImportRow {
  kategorie: string;
  auswahl: string;
  status?: string;
}

export interface ImportResult {
  success: boolean;
  categoriesCreated: number;
  categoriesUpdated: number;
  skillsCreated: number;
  skillsUpdated: number;
  skillsArchived: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  data: ImportRow;
  reason: string;
}

export interface KnowledgeFilters {
  q?: string;
  categoryId?: string;
  includeArchived?: boolean;
  status?: "Standard" | "Neu eingefügt";
}
