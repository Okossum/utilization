import { getISOWeek, getISOWeekYear, parseISO, isValid } from 'date-fns';

/**
 * Konvertiert ein Datum in das YY/WW Format (z.B. "25/12")
 */
export function dateToWeekFormat(date: Date): string {
  const year = getISOWeekYear(date);
  const week = getISOWeek(date);
  const yy = String(year).slice(-2);
  const ww = String(week).padStart(2, '0');
  return `${yy}/${ww}`;
}

/**
 * Berechnet alle Kalenderwochen zwischen zwei Daten (inklusive)
 */
export function getWeeksBetweenDates(startDate: string, endDate: string): string[] {
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    if (!isValid(start) || !isValid(end)) {
  
      return [];
    }
    
    if (start > end) {
  
      return [];
    }
    
    const weeks: string[] = [];
    const current = new Date(start);
    
    // Gehe durch alle Wochen vom Start- bis zum Enddatum
    while (current <= end) {
      const weekFormat = dateToWeekFormat(current);
      if (!weeks.includes(weekFormat)) {
        weeks.push(weekFormat);
      }
      
      // Gehe zur nächsten Woche (7 Tage weiter)
      current.setDate(current.getDate() + 7);
    }
    
    return weeks.sort();
  } catch (error) {

    return [];
  }
}

/**
 * Geplante Projekt-Daten für Kalenderwochen-Visualisierung
 */
export interface PlannedProjectData {
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  customer: string;
  startDate: string;
  endDate: string;
  plannedUtilization: number;
  probability: number;
  createdAt?: any;
}

/**
 * Berechnet die Auslastung pro Kalenderwoche für geplante Projekte
 */
export function calculatePlannedUtilizationByWeek(
  plannedProjects: PlannedProjectData[]
): Record<string, Record<string, { utilization: number; projects: PlannedProjectData[] }>> {
  
  const result: Record<string, Record<string, { utilization: number; projects: PlannedProjectData[] }>> = {};
  
  plannedProjects.forEach(project => {
    const weeks = getWeeksBetweenDates(project.startDate, project.endDate);
    
    weeks.forEach(week => {
      // Initialisiere Employee-Eintrag falls nicht vorhanden
      if (!result[project.employeeName]) {
        result[project.employeeName] = {};
      }
      
      // Initialisiere Wochen-Eintrag falls nicht vorhanden
      if (!result[project.employeeName][week]) {
        result[project.employeeName][week] = {
          utilization: 0,
          projects: []
        };
      }
      
      // Addiere Auslastung (mehrere Projekte können sich überschneiden)
      result[project.employeeName][week].utilization += project.plannedUtilization;
      result[project.employeeName][week].projects.push(project);
    });
  });
  
  return result;
}

/**
 * Erstellt eine Tooltip-Text für eine Kalenderwoche mit geplanten Projekten
 */
export function createPlannedProjectTooltip(
  weekData: { utilization: number; projects: PlannedProjectData[] }
): string {
  const { utilization, projects } = weekData;
  
  if (projects.length === 0) return '';
  
  const lines = [
    `Geplante Auslastung: ${utilization}%`,
    '',
    ...projects.map(p => `• ${p.projectName} (${p.customer}): ${p.plannedUtilization}%`)
  ];
  
  return lines.join('\n');
}
