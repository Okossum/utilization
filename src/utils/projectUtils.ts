// Utility-Funktionen für Projekt-Management
import { ProjectHistoryItem, ProjectRole, ProjectSkill } from '../lib/types';
import { ProjectType, ProjectsByType, ProjectStats, ProbabilityLevel } from '../types/projects';

// ===== PROJEKT-FILTERUNG =====

export function filterProjectsByType(projects: ProjectHistoryItem[]): ProjectsByType {
  return {
    // ✅ FIX: Alte Projekte ohne projectType als 'historical' behandeln
    historical: projects.filter(p => p.projectType === 'historical' || !p.projectType),
    planned: projects.filter(p => p.projectType === 'planned'),
    active: projects.filter(p => p.projectType === 'active')
  };
}

export function getProjectsByEmployee(projects: ProjectHistoryItem[], employeeId: string): ProjectHistoryItem[] {
  return projects.filter(p => p.employeeId === employeeId);
}

// ===== PROJEKT-STATISTIKEN =====

export function calculateProjectStats(projects: ProjectHistoryItem[]): ProjectStats {
  const byType = filterProjectsByType(projects);
  const plannedProjects = byType.planned;
  
  const totalProbability = plannedProjects.reduce((sum, p) => sum + (p.probability || 0), 0);
  const averageProbability = plannedProjects.length > 0 ? totalProbability / plannedProjects.length : 0;
  
  const totalDailyRate = [...byType.planned, ...byType.active]
    .reduce((sum, p) => sum + (p.dailyRate || 0), 0);
  
  return {
    totalProjects: projects.length,
    activeProjects: byType.active.length,
    plannedProjects: byType.planned.length,
    historicalProjects: byType.historical.length,
    averageProbability: Math.round(averageProbability),
    totalDailyRate
  };
}

// ===== PROJEKT-VALIDIERUNG =====

export function validateProject(project: Partial<ProjectHistoryItem>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!project.customer?.trim()) {
    errors.push('Kunde ist erforderlich');
  }
  
  if (!project.projectName?.trim()) {
    errors.push('Projektname ist erforderlich');
  }
  
  if (project.projectType === 'planned') {
    if (project.probability === undefined || project.probability < 0 || project.probability > 100) {
      errors.push('Wahrscheinlichkeit muss zwischen 0 und 100% liegen');
    }
    
    if (project.dailyRate !== undefined && project.dailyRate < 0) {
      errors.push('Tagessatz muss positiv sein');
    }
    
    if (project.startDate && project.endDate && new Date(project.startDate) > new Date(project.endDate)) {
      errors.push('Startdatum muss vor Enddatum liegen');
    }
    
    if (project.projectSource === 'jira' && !project.jiraTicketId?.trim()) {
      errors.push('JIRA Ticket ID ist bei JIRA-Projekten erforderlich');
    }
  }
  
  if (project.projectType === 'historical') {
    if (!project.duration?.trim()) {
      errors.push('Projektdauer ist bei historischen Projekten erforderlich');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ===== PROJEKT-TRANSFORMATION =====

export function createNewProject(
  employeeId: string,
  projectType: ProjectType,
  basicData: {
    customer: string;
    projectName: string;
  }
): ProjectHistoryItem {
  const now = new Date();
  
  return {
    id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    employeeId,
    projectType,
    customer: basicData.customer,
    projectName: basicData.projectName,
    roles: [],
    skills: [],
    createdAt: now,
    updatedAt: now
  };
}

export function upgradeProjectToActive(project: ProjectHistoryItem): ProjectHistoryItem {
  if (project.projectType !== 'planned') {
    throw new Error('Nur geplante Projekte können zu aktiven Projekten werden');
  }
  
  return {
    ...project,
    projectType: 'active',
    probability: 100,
    updatedAt: new Date()
  };
}

// ===== LEGACY-MIGRATION =====

export function migrateLegacyProject(legacyProject: any): ProjectHistoryItem {
  const now = new Date();
  
  return {
    id: legacyProject.id || `legacy_${Date.now()}`,
    employeeId: legacyProject.employeeId || '',
    projectType: legacyProject.status === 'active' ? 'active' : 'historical',
    customer: legacyProject.customer || '',
    projectName: legacyProject.projectName || '',
    roles: legacyProject.roles || (legacyProject.role ? [{
      id: `role_${Date.now()}`,
      name: legacyProject.role,
      categoryName: 'Legacy',
      tasks: legacyProject.activities || []
    }] : []),
    skills: legacyProject.skills || [],
    
    // Legacy-Felder beibehalten
    role: legacyProject.role,
    duration: legacyProject.duration,
    activities: legacyProject.activities,
    status: legacyProject.status,
    plannedAllocationPct: legacyProject.plannedAllocationPct,
    comment: legacyProject.comment,
    
    createdAt: legacyProject.createdAt || now,
    updatedAt: now
  };
}

// ===== DISPLAY-HELPERS =====

export function getProjectTypeColor(projectType: ProjectType): string {
  switch (projectType) {
    case 'active':
      return 'bg-green-100 border-green-200 text-green-800';
    case 'planned':
      return 'bg-blue-100 border-blue-200 text-blue-800';
    case 'historical':
      return 'bg-orange-100 border-orange-200 text-orange-800';
    default:
      return 'bg-gray-100 border-gray-200 text-gray-800';
  }
}

export function getProbabilityColor(probability: number): string {
  if (probability >= 100) return 'bg-green-100 text-green-800';
  if (probability >= 75) return 'bg-blue-100 text-blue-800';
  if (probability >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

export function formatProjectDuration(startDate?: string, endDate?: string, duration?: string): string {
  // Priorität: Start-/Enddatum vor Freitext-Dauer
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 Tag';
    if (diffDays < 30) return `${diffDays} Tage`;
    if (diffDays < 365) {
      const months = Math.round(diffDays / 30);
      return months === 1 ? '1 Monat' : `${months} Monate`;
    }
    const years = Math.round(diffDays / 365);
    return years === 1 ? '1 Jahr' : `${years} Jahre`;
  }
  
  // Fallback: Legacy-Dauer-Feld
  if (duration) return duration;
  
  return 'Unbekannt';
}

export function formatCurrency(amount: number, currency = '€'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency === '€' ? 'EUR' : 'USD'
  }).format(amount);
}

// ===== ROLLEN & SKILLS =====

export function addRoleToProject(project: ProjectHistoryItem, role: ProjectRole): ProjectHistoryItem {
  const existingRoleIndex = project.roles.findIndex(r => r.id === role.id);
  
  if (existingRoleIndex >= 0) {
    // Update existing role
    const updatedRoles = [...project.roles];
    updatedRoles[existingRoleIndex] = role;
    
    return {
      ...project,
      roles: updatedRoles,
      updatedAt: new Date()
    };
  } else {
    // Add new role
    return {
      ...project,
      roles: [...project.roles, role],
      updatedAt: new Date()
    };
  }
}

export function removeRoleFromProject(project: ProjectHistoryItem, roleId: string): ProjectHistoryItem {
  return {
    ...project,
    roles: project.roles.filter(r => r.id !== roleId),
    updatedAt: new Date()
  };
}

export function addSkillToProject(project: ProjectHistoryItem, skill: ProjectSkill): ProjectHistoryItem {
  const existingSkillIndex = project.skills.findIndex(s => s.id === skill.id);
  
  if (existingSkillIndex >= 0) {
    // Update existing skill
    const updatedSkills = [...project.skills];
    updatedSkills[existingSkillIndex] = skill;
    
    return {
      ...project,
      skills: updatedSkills,
      updatedAt: new Date()
    };
  } else {
    // Add new skill
    return {
      ...project,
      skills: [...project.skills, skill],
      updatedAt: new Date()
    };
  }
}

export function removeSkillFromProject(project: ProjectHistoryItem, skillId: string): ProjectHistoryItem {
  return {
    ...project,
    skills: project.skills.filter(s => s.id !== skillId),
    updatedAt: new Date()
  };
}
