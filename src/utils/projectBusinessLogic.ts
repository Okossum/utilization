// Business Logic für erweiterte Projekt-Typen
import { ProjectHistoryItem } from '../lib/types';
import { ProbabilityLevel } from '../types/projects';
import DatabaseService from '../services/database';

// ===== AUTOMATISCHE ÜBERFÜHRUNG =====

export interface ProjectUpgradeResult {
  success: boolean;
  upgradedProject?: ProjectHistoryItem;
  message: string;
  showNotification?: boolean;
}

/**
 * Überführt ein geplantes Projekt automatisch zu einem aktiven Projekt
 * wenn die Wahrscheinlichkeit auf 100% gesetzt wird
 */
export async function handleProbabilityChange(
  project: ProjectHistoryItem,
  newProbability: ProbabilityLevel,
  employeeId: string,
  onProjectUpgrade?: (upgradedProject: ProjectHistoryItem) => void
): Promise<ProjectUpgradeResult> {
  
  // Nur bei geplanten Projekten und 100% Wahrscheinlichkeit
  if (project.projectType !== 'planned' || newProbability !== 100) {
    return {
      success: true,
      message: 'Wahrscheinlichkeit aktualisiert'
    };
  }

  try {
    // Projekt zu aktivem Projekt überführen
    const upgradedProject: ProjectHistoryItem = {
      ...project,
      projectType: 'active',
      probability: 100,
      updatedAt: new Date()
    };

    // Callback für UI-Update
    if (onProjectUpgrade) {
      onProjectUpgrade(upgradedProject);
    }

    return {
      success: true,
      upgradedProject,
      message: `Projekt "${project.projectName}" wurde zu aktivem Projekt überführt!`,
      showNotification: true
    };

  } catch (error) {
    console.error('Error upgrading project:', error);
    return {
      success: false,
      message: 'Fehler beim Überführen des Projekts'
    };
  }
}

/**
 * Validiert und speichert Projekt-Änderungen mit Business Logic
 */
export async function saveProjectWithBusinessLogic(
  project: ProjectHistoryItem,
  employeeId: string,
  dossierData: any,
  onSave: (updatedDossierData: any) => void
): Promise<{ success: boolean; message: string }> {
  
  try {
    // Business Logic: Automatische Überführung prüfen
    let finalProject = { ...project };
    
    if (project.projectType === 'planned' && project.probability === 100) {
      const upgradeResult = await handleProbabilityChange(
        project,
        100,
        employeeId
      );
      
      if (upgradeResult.success && upgradeResult.upgradedProject) {
        finalProject = upgradeResult.upgradedProject;
      }
    }

    // Projekt in Dossier-Daten aktualisieren
    const currentProjects = dossierData?.projectHistory || [];
    const existingIndex = currentProjects.findIndex((p: ProjectHistoryItem) => p.id === finalProject.id);
    
    let updatedProjects;
    if (existingIndex >= 0) {
      // Update existing project
      updatedProjects = [...currentProjects];
      updatedProjects[existingIndex] = finalProject;
    } else {
      // Add new project
      updatedProjects = [...currentProjects, finalProject];
    }

    // Dossier-Daten aktualisieren
    const updatedDossierData = {
      ...dossierData,
      projectHistory: updatedProjects,
      updatedAt: new Date()
    };

    // In Datenbank speichern
    await DatabaseService.saveEmployeeDossier(employeeId, updatedDossierData);

    // UI-Update
    onSave(updatedDossierData);

    return {
      success: true,
      message: finalProject.projectType === 'active' && project.projectType === 'planned'
        ? `Projekt wurde erfolgreich als aktives Projekt gespeichert!`
        : 'Projekt erfolgreich gespeichert!'
    };

  } catch (error) {
    console.error('Error saving project with business logic:', error);
    return {
      success: false,
      message: 'Fehler beim Speichern des Projekts'
    };
  }
}

// ===== PROJEKT-VALIDIERUNG =====

export interface ProjectValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Erweiterte Projekt-Validierung mit Business Rules
 */
export function validateProjectBusinessRules(project: ProjectHistoryItem): ProjectValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basis-Validierung
  if (!project.customer?.trim()) {
    errors.push('Kunde ist erforderlich');
  }

  if (!project.projectName?.trim()) {
    errors.push('Projektname ist erforderlich');
  }

  // Typ-spezifische Validierung
  switch (project.projectType) {
    case 'planned':
      // Geplante Projekte
      if (project.probability === undefined || project.probability < 0 || project.probability > 100) {
        errors.push('Wahrscheinlichkeit muss zwischen 0 und 100% liegen');
      }

      if (project.projectSource === 'jira' && !project.jiraTicketId?.trim()) {
        errors.push('JIRA Ticket ID ist bei JIRA-Projekten erforderlich');
      }

      if (project.dailyRate !== undefined && project.dailyRate <= 0) {
        errors.push('Tagessatz muss positiv sein');
      }

      if (project.startDate && project.endDate) {
        const start = new Date(project.startDate);
        const end = new Date(project.endDate);
        if (start > end) {
          errors.push('Startdatum muss vor Enddatum liegen');
        }

        // Warnung bei sehr kurzen Projekten
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
          warnings.push('Projekt ist sehr kurz (weniger als 1 Woche)');
        }
      }

      // Warnung bei niedrigen Wahrscheinlichkeiten ohne Ansprechpartner
      if (project.probability && project.probability < 50 && !project.internalContact) {
        warnings.push('Bei niedriger Wahrscheinlichkeit sollte ein Ansprechpartner definiert werden');
      }
      break;

    case 'active':
      // Aktive Projekte sollten immer 100% Wahrscheinlichkeit haben
      if (project.probability !== 100) {
        warnings.push('Aktive Projekte sollten 100% Wahrscheinlichkeit haben');
      }

      if (!project.startDate) {
        warnings.push('Aktive Projekte sollten ein Startdatum haben');
      }
      break;

    case 'historical':
      // Historische Projekte
      if (!project.duration?.trim() && (!project.startDate || !project.endDate)) {
        errors.push('Projektdauer oder Start-/Enddatum ist erforderlich');
      }

      if (project.activities && project.activities.length === 0) {
        warnings.push('Historische Projekte sollten Tätigkeiten enthalten');
      }
      break;
  }

  // Rollen & Skills Validierung
  if (project.roles.length === 0 && project.skills.length === 0) {
    warnings.push('Projekt sollte mindestens eine Rolle oder einen Skill enthalten');
  }

  // Duplikat-Prüfung (würde in echtem System gegen DB prüfen)
  if (project.roles.length > 0) {
    const roleIds = project.roles.map(r => r.id);
    const uniqueRoleIds = [...new Set(roleIds)];
    if (roleIds.length !== uniqueRoleIds.length) {
      errors.push('Doppelte Rollen sind nicht erlaubt');
    }
  }

  if (project.skills.length > 0) {
    const skillIds = project.skills.map(s => s.id);
    const uniqueSkillIds = [...new Set(skillIds)];
    if (skillIds.length !== uniqueSkillIds.length) {
      errors.push('Doppelte Skills sind nicht erlaubt');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ===== PROJEKT-STATISTIKEN =====

export interface ProjectMetrics {
  totalValue: number; // Gesamtwert aller Projekte
  averageDuration: number; // Durchschnittliche Projektdauer in Tagen
  successRate: number; // Erfolgsrate (aktive + historische / geplante)
  utilizationRate: number; // Auslastungsgrad
  topSkills: Array<{ name: string; count: number; category: string }>;
  topRoles: Array<{ name: string; count: number; category: string }>;
}

/**
 * Berechnet Projekt-Metriken für einen Mitarbeiter
 */
export function calculateProjectMetrics(projects: ProjectHistoryItem[]): ProjectMetrics {
  const totalValue = projects.reduce((sum, project) => {
    if (project.dailyRate && project.startDate && project.endDate) {
      const start = new Date(project.startDate);
      const end = new Date(project.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return sum + (project.dailyRate * days);
    }
    return sum;
  }, 0);

  const projectsWithDuration = projects.filter(p => p.startDate && p.endDate);
  const averageDuration = projectsWithDuration.length > 0
    ? projectsWithDuration.reduce((sum, project) => {
        const start = new Date(project.startDate!);
        const end = new Date(project.endDate!);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / projectsWithDuration.length
    : 0;

  const plannedProjects = projects.filter(p => p.projectType === 'planned').length;
  const successfulProjects = projects.filter(p => p.projectType === 'active' || p.projectType === 'historical').length;
  const successRate = (plannedProjects + successfulProjects) > 0 
    ? (successfulProjects / (plannedProjects + successfulProjects)) * 100 
    : 0;

  // Skill-Häufigkeit
  const skillCounts = new Map<string, { count: number; category: string }>();
  projects.forEach(project => {
    project.skills.forEach(skill => {
      const existing = skillCounts.get(skill.name) || { count: 0, category: skill.categoryName };
      skillCounts.set(skill.name, { count: existing.count + 1, category: skill.categoryName });
    });
  });

  const topSkills = Array.from(skillCounts.entries())
    .map(([name, data]) => ({ name, count: data.count, category: data.category }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Rollen-Häufigkeit
  const roleCounts = new Map<string, { count: number; category: string }>();
  projects.forEach(project => {
    project.roles.forEach(role => {
      const existing = roleCounts.get(role.name) || { count: 0, category: role.categoryName };
      roleCounts.set(role.name, { count: existing.count + 1, category: role.categoryName });
    });
  });

  const topRoles = Array.from(roleCounts.entries())
    .map(([name, data]) => ({ name, count: data.count, category: data.category }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Auslastungsgrad (vereinfacht)
  const activeProjects = projects.filter(p => p.projectType === 'active').length;
  const utilizationRate = Math.min(activeProjects * 25, 100); // Max 4 aktive Projekte = 100%

  return {
    totalValue,
    averageDuration: Math.round(averageDuration),
    successRate: Math.round(successRate),
    utilizationRate,
    topSkills,
    topRoles
  };
}

// ===== NOTIFICATION HELPERS =====

export interface ProjectNotification {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  duration?: number;
}

/**
 * Erstellt Benachrichtigungen für Projekt-Events
 */
export function createProjectNotification(
  event: 'created' | 'updated' | 'deleted' | 'upgraded' | 'validated',
  project: ProjectHistoryItem,
  details?: any
): ProjectNotification {
  
  switch (event) {
    case 'created':
      return {
        type: 'success',
        title: 'Projekt erstellt',
        message: `"${project.projectName}" wurde erfolgreich erstellt.`,
        duration: 3000
      };

    case 'updated':
      return {
        type: 'success',
        title: 'Projekt aktualisiert',
        message: `"${project.projectName}" wurde erfolgreich aktualisiert.`,
        duration: 3000
      };

    case 'deleted':
      return {
        type: 'info',
        title: 'Projekt gelöscht',
        message: `"${project.projectName}" wurde gelöscht.`,
        duration: 3000
      };

    case 'upgraded':
      return {
        type: 'success',
        title: 'Projekt aktiviert',
        message: `"${project.projectName}" wurde zu einem aktiven Projekt überführt!`,
        duration: 5000
      };

    case 'validated':
      const hasErrors = details?.errors?.length > 0;
      const hasWarnings = details?.warnings?.length > 0;
      
      if (hasErrors) {
        return {
          type: 'error',
          title: 'Validierungsfehler',
          message: `${details.errors.length} Fehler gefunden. Bitte korrigieren Sie diese.`,
          duration: 5000
        };
      } else if (hasWarnings) {
        return {
          type: 'warning',
          title: 'Validierungshinweise',
          message: `${details.warnings.length} Hinweise gefunden. Projekt kann trotzdem gespeichert werden.`,
          duration: 4000
        };
      } else {
        return {
          type: 'success',
          title: 'Validierung erfolgreich',
          message: 'Alle Projektdaten sind korrekt.',
          duration: 2000
        };
      }

    default:
      return {
        type: 'info',
        title: 'Projekt-Update',
        message: 'Projekt wurde bearbeitet.',
        duration: 3000
      };
  }
}
