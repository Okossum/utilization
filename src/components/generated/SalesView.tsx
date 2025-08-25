import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EmployeeOverview } from './EmployeeOverview';
import { useUtilizationData } from '../../contexts/UtilizationDataContext';
import { getISOWeek } from 'date-fns';

interface Skill {
  id: string;
  name: string;
  rating: number;
}

interface Project {
  id: string;
  customer: string;
  projectName: string;
  startDate: string;
  endDate: string;
  description: string;
  skillsUsed: string[];
  employeeRole: string;
  utilization?: number;
  averageUtilization?: number; // Durchschnittliche Auslastung über konsolidierte Wochen
  probability?: 'Prospect' | 'Offered' | 'Planned' | 'Commissioned' | 'On-Hold' | 'Rejected';
}

interface Employee {
  id: string;
  name: string;
  lbs: string;              // Karrierestufe (wird als Untertitel angezeigt)
  cc: string;               // Competence Center
  team: string;
  mainRole: string;         // Hauptrolle (Projektleiter, Requirements Engineer, etc.)
  email?: string;           // E-Mail-Adresse
  vg?: string;              // Vorgesetzter
  profileUrl?: string;      // Link zum Profil
  skills: Skill[];
  completedProjects: Project[];
  plannedProjects: Project[];
  // Zusätzliche Felder aus EmployeeDetailView
  phone?: string;           // Telefonnummer
  location?: string;        // Standort
  startDate?: string;       // Startdatum
  status?: string;          // Status (aktiv, inaktiv, etc.)
  utilization?: number;     // Aktuelle Auslastung
  averageUtilization?: number; // Durchschnittliche Auslastung
  softSkills?: Skill[];     // Soft Skills
  technicalSkills?: Skill[]; // Technical Skills
  strengths?: string[];     // Stärken
  weaknesses?: string[];    // Schwächen
  utilizationComment?: string; // Auslastungskommentar
  planningComment?: string; // Planungskommentar
}

interface SalesViewProps {
  actionItems: Record<string, { actionItem: boolean; source: 'manual' | 'rule' | 'default'; updatedBy?: string }>;
}

// @component: SalesView
export const SalesView = ({ actionItems }: SalesViewProps) => {
  const { databaseData, personMeta, isLoading } = useUtilizationData();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Hilfsfunktion: Woche zu Datum konvertieren
  const weekToDate = (weekString: string, addDays: number = 0): string => {
    const [year, week] = weekString.split('/').map(Number);
    const fullYear = year < 50 ? 2000 + year : 1900 + year;
    
    // Erstes Datum des Jahres
    const jan1 = new Date(fullYear, 0, 1);
    // Finde den ersten Montag des Jahres
    const firstMonday = new Date(jan1);
    firstMonday.setDate(jan1.getDate() + (8 - jan1.getDay()) % 7);
    
    // Berechne das Datum der gewünschten Woche
    const targetDate = new Date(firstMonday);
    targetDate.setDate(firstMonday.getDate() + (week - 1) * 7 + addDays);
    
    return targetDate.toISOString().split('T')[0];
  };

  // Geplante Projekte aus einsatzplan und projectReferences transformieren
  const transformEinsatzplanToProjects = (record: any): Project[] => {
    const plannedProjects: Project[] = [];

    // 1. Projekte aus projectReferences (geplante Projekte)
    if (record.projectReferences) {
      const futureProjectRefs = record.projectReferences.filter((ref: any) => 
        ref.projectType === 'planned' || ref.projectType === 'future'
      );

      futureProjectRefs.forEach((ref: any) => {
        plannedProjects.push({
          id: ref.projectId || `planned-${Math.random().toString(36).substr(2, 9)}`,
          customer: ref.customer || 'Unknown Customer',
          projectName: ref.projectName || 'Planned Project',
          startDate: ref.startDate || '',
          endDate: ref.endDate || '',
          description: ref.description || 'Planned project assignment',
          skillsUsed: ref.skills || [],
          employeeRole: ref.roles?.[0] || 'Consultant',
          utilization: ref.utilization || undefined,
          averageUtilization: ref.averageUtilization || undefined,
          probability: (ref.probability as any) || 'Planned'
        });
      });
    }

    // 2. Projekte aus einsatzplan (nur zukünftige Wochen)
    if (record.einsatzplan) {
      const projectWeeks: { [key: string]: { weeks: string[], utilizations: number[], entries: any[] } } = {};
      const currentWeek = getISOWeek(new Date());
      const currentYear = new Date().getFullYear();
      
      Object.entries(record.einsatzplan).forEach(([week, entries]: [string, any]) => {
        if (Array.isArray(entries)) {
          entries.forEach((entry, index) => {
            const [year, weekNum] = week.split('/').map(Number);
            const fullYear = year < 50 ? 2000 + year : 1900 + year;
            const isCurrentOrFutureWeek = fullYear > currentYear || 
              (fullYear === currentYear && weekNum >= currentWeek);
            
            if (entry.projekt && entry.projekt !== '---' && 
                (entry.auslastungProzent || 0) > 0 && 
                isCurrentOrFutureWeek) {
              const projectKey = `${entry.projekt}-${entry.ort || 'Remote'}`;
              
              if (!projectWeeks[projectKey]) {
                projectWeeks[projectKey] = {
                  weeks: [],
                  utilizations: [],
                  entries: []
                };
              }
              
              projectWeeks[projectKey].weeks.push(week);
              projectWeeks[projectKey].utilizations.push(entry.auslastungProzent || 0);
              projectWeeks[projectKey].entries.push(entry);
            }
          });
        }
      });

      // Konsolidiere Einsatzplan-Projekte
      Object.entries(projectWeeks).forEach(([projectKey, data]) => {
        const firstEntry = data.entries[0];
        const weeks = data.weeks.sort();
        const utilizations = data.utilizations.filter(u => u > 0);
        
        const averageUtilization = utilizations.length > 0 
          ? Math.round(utilizations.reduce((sum, util) => sum + util, 0) / utilizations.length)
          : 0;
        
        const lastWeek = weeks[weeks.length - 1];
        const endDate = weekToDate(lastWeek, 6);
        
        plannedProjects.push({
          id: `${record.id}-einsatzplan-${projectKey}`,
          customer: firstEntry.projekt,
          projectName: `${firstEntry.projekt} Assignment`,
          startDate: weekToDate(weeks[0]),
          endDate: endDate,
          description: `Assignment at ${firstEntry.ort || 'Remote'} (${weeks.length} weeks)`,
          skillsUsed: [],
          employeeRole: 'Consultant',
          utilization: averageUtilization,
          averageUtilization: averageUtilization,
          probability: 'Planned'
        });
      });
    }

    return plannedProjects;
  };

  // Historische Projekte aus projectReferences in utilizationData laden
  const transformAuslastungToCompletedProjects = (record: any): Project[] => {
    if (!record.projectReferences) return [];

    // Filtere historische Projekte (projectType: 'historical' oder 'completed')
    const historicalProjects = record.projectReferences.filter((ref: any) => 
      ref.projectType === 'historical' || ref.projectType === 'completed'
    );

    return historicalProjects.map((ref: any) => ({
      id: ref.projectId || `hist-${Math.random().toString(36).substr(2, 9)}`,
      customer: ref.customer || 'Unknown Customer',
      projectName: ref.projectName || 'Historical Project',
      startDate: ref.startDate || '',
      endDate: ref.endDate || '',
      description: ref.description || 'Completed project assignment',
      skillsUsed: ref.skills || [],
      employeeRole: ref.roles?.[0] || 'Consultant',
      utilization: ref.utilization || undefined,
      averageUtilization: ref.averageUtilization || undefined,
      probability: 'Commissioned' as const
    }));
  };

  // Mock Skills Funktion entfernt - verwende nur echte Daten

  // Daten aus UtilizationDataContext transformieren
  const transformUtilizationDataToEmployees = () => {
    try {
      setError(null);

      if (!databaseData.utilizationData || !personMeta) {
        // console.log entfernt
        return;
      }

      console.log('🔍 Sales View - Transformiere UtilizationData:', {
        utilizationData: databaseData.utilizationData?.length || 0,
        personMeta: personMeta.size || 0
      });

      // Mitarbeiter-Daten aus utilizationData transformieren
      const transformedEmployees: Employee[] = [];
      
      databaseData.utilizationData.forEach((record: any) => {
        const meta = personMeta.get(record.person);
        
        // ✅ FILTER: Nur Mitarbeiter mit aktiviertem ACT-Toggle anzeigen
        const hasActToggle = actionItems[record.person]?.actionItem === true;
        if (!hasActToggle) {
          return; // Mitarbeiter überspringen, wenn ACT-Toggle nicht aktiviert
        }

        // Berechne Auslastungs-KPIs aus den echten Daten
        const calculateUtilizationKPIs = (record: any) => {
          const currentWeek = new Date().getFullYear().toString().slice(-2) + '/' + 
                             String(Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))).padStart(2, '0');
          
          // Aktuelle Auslastung aus Einsatzplan
          const currentUtilization = record.einsatzplan?.[currentWeek]?.[0]?.auslastungProzent || 
                                   record.auslastung?.[currentWeek] || null;
          
          // Durchschnittliche Auslastung der letzten 8 Wochen aus Auslastung
          const auslastungValues = record.auslastung ? Object.values(record.auslastung).filter((val: any) => typeof val === 'number' && val > 0) : [];
          const averageUtilization = auslastungValues.length > 0 ? 
            Math.round(auslastungValues.reduce((sum: number, val: any) => sum + val, 0) / auslastungValues.length) : null;
          
          return { currentUtilization, averageUtilization };
        };

        const { currentUtilization, averageUtilization } = calculateUtilizationKPIs(record);

        const employee: Employee = {
          id: record.id,
          name: record.person,
          lbs: meta?.careerLevel || record.lbs || 'Consultant',
          cc: meta?.cc || record.cc || 'Unknown CC',
          team: meta?.team || record.team || 'Unknown Team',
          mainRole: meta?.mainRole || record.mainRole || 'Consultant',
          email: meta?.email || record.email || undefined,
          vg: meta?.manager || record.vg || undefined,
          profileUrl: record.linkZumProfilUrl || undefined,
          
          // Zusätzliche Felder aus EmployeeDetailView
          phone: meta?.phone || record.phone || undefined,
          location: meta?.standort || record.standort || undefined,
          startDate: meta?.startDate || record.startDate || undefined,
          status: meta?.status || record.status || 'active',
          utilization: currentUtilization,
          averageUtilization: averageUtilization,
          
          // Skills nur aus echten Daten - KEINE Mock-Daten
          skills: [], // Leer lassen - wird durch technicalSkills/softSkills ersetzt
          technicalSkills: record.technicalSkills || undefined,
          softSkills: record.softSkills || undefined,
          
          // Stärken und Schwächen aus echten Daten
          strengths: record.strengths || meta?.strengths || undefined,
          weaknesses: record.weaknesses || meta?.weaknesses || undefined,
          
          // Kommentare aus echten Daten
          utilizationComment: meta?.utilizationComment || record.utilizationComment || undefined,
          planningComment: meta?.planningComment || record.planningComment || undefined,
          
          // Projekte
          completedProjects: transformAuslastungToCompletedProjects(record),
          plannedProjects: transformEinsatzplanToProjects(record)
        };

        // Debug-Logging für erweiterte Daten
        console.log('🔍 Sales View - Employee erweiterte Daten:', {
          name: employee.name,
          utilization: employee.utilization,
          averageUtilization: employee.averageUtilization,
          completedProjects: employee.completedProjects.length,
          plannedProjects: employee.plannedProjects.length,
          strengths: employee.strengths?.length || 0,
          weaknesses: employee.weaknesses?.length || 0,
          utilizationComment: !!employee.utilizationComment,
          planningComment: !!employee.planningComment,
          technicalSkills: employee.technicalSkills?.length || 0,
          softSkills: employee.softSkills?.length || 0
        });

        transformedEmployees.push(employee);
      });

      console.log('🔍 Sales View - ACT-Filter angewendet:', {
        totalRecords: databaseData.utilizationData.length,
        filteredEmployees: transformedEmployees.length,
        actionItemsCount: Object.keys(actionItems).length,
        activeActToggles: Object.values(actionItems).filter(item => item.actionItem === true).length
      });
      
      setEmployees(transformedEmployees);

    } catch (err) {
      // console.error entfernt
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    }
  };

  useEffect(() => {
    if (!isLoading && databaseData.utilizationData) {
      transformUtilizationDataToEmployees();
    }
  }, [isLoading, databaseData.utilizationData, personMeta, actionItems]);

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"
            />
            <span className="ml-3 text-gray-600">Lade Sales-Daten...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-red-800 font-semibold mb-2">Fehler beim Laden der Daten</h3>
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadSalesData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Erfolgreiche Darstellung mit echten Daten
  return <EmployeeOverview employees={employees} />;
};


