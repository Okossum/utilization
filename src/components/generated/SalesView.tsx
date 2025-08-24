import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EmployeeOverview } from './EmployeeOverview';
import { useUtilizationData } from '../../contexts/UtilizationDataContext';

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

  // Einsatzplan-Daten zu Projekten transformieren (aus utilizationData)
  const transformEinsatzplanToProjects = (record: any): Project[] => {
    if (!record.einsatzplan) return [];

    // Sammle alle Projekt-Einträge mit Wochen-Informationen (nur aktuelle und zukünftige Wochen)
    const projectWeeks: { [key: string]: { weeks: string[], utilizations: number[], entries: any[] } } = {};
    const currentWeek = new Date().getWeek(); // Aktuelle Kalenderwoche
    const currentYear = new Date().getFullYear();
    
    Object.entries(record.einsatzplan).forEach(([week, entries]: [string, any]) => {
      if (Array.isArray(entries)) {
        entries.forEach((entry, index) => {
          // Prüfe ob Woche >= aktuelle Woche
          const [year, weekNum] = week.split('/').map(Number);
          const fullYear = year < 50 ? 2000 + year : 1900 + year;
          const isCurrentOrFutureWeek = fullYear > currentYear || 
            (fullYear === currentYear && weekNum >= currentWeek);
          
          // Nur Projekte mit Auslastung > 0% und >= aktuelle KW berücksichtigen
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

    // Konsolidiere Projekte
    const consolidatedProjects: Project[] = [];
    
    Object.entries(projectWeeks).forEach(([projectKey, data]) => {
      const firstEntry = data.entries[0];
      const weeks = data.weeks.sort();
      const utilizations = data.utilizations.filter(u => u > 0);
      
      // Berechne durchschnittliche Auslastung
      const averageUtilization = utilizations.length > 0 
        ? Math.round(utilizations.reduce((sum, util) => sum + util, 0) / utilizations.length)
        : 0;
      
      // Ermittle Enddatum (späteste Woche)
      const lastWeek = weeks[weeks.length - 1];
      const endDate = weekToDate(lastWeek, 6);
      
      consolidatedProjects.push({
        id: `${record.id}-planned-${projectKey}`,
        customer: firstEntry.projekt,
        projectName: `${firstEntry.projekt} Assignment`,
        startDate: weekToDate(weeks[0]), // Wird nicht angezeigt, aber für interne Logik
        endDate: endDate,
        description: `Assignment at ${firstEntry.ort || 'Remote'} (${weeks.length} weeks)`,
        skillsUsed: [], // TODO: Aus Skills-Collection laden
        employeeRole: 'Consultant',
        utilization: averageUtilization, // Für Kompatibilität
        averageUtilization: averageUtilization,
        probability: 'Planned'
      });
    });

    return consolidatedProjects;
  };

  // Auslastung-Daten zu historischen Projekten transformieren (aus utilizationData)
  // DEAKTIVIERT: Keine historischen Projektkarten mehr anzeigen
  // Grund: Historische Auslastungsdaten haben keine Kundeninformationen
  const transformAuslastungToCompletedProjects = (record: any): Project[] => {
    // Keine historischen Projektkarten - nur Einsatzplan-Projekte werden angezeigt
    return [];
  };

  // Mock Skills basierend auf Karrierestufe generieren
  const generateMockSkills = (careerLevel: string, area: string): Skill[] => {
    const baseSkills = [
      { id: 's1', name: 'Communication', rating: 4 },
      { id: 's2', name: 'Project Management', rating: 3 },
    ];

    // Area-spezifische Skills
    if (area?.toLowerCase().includes('automotive')) {
      baseSkills.push(
        { id: 's3', name: 'Automotive Systems', rating: 4 },
        { id: 's4', name: 'AUTOSAR', rating: 3 }
      );
    }

    // Level-basierte Anpassung
    if (careerLevel?.toLowerCase().includes('senior')) {
      baseSkills.forEach(skill => skill.rating = Math.min(5, skill.rating + 1));
      baseSkills.push({ id: 's5', name: 'Leadership', rating: 4 });
    }

    return baseSkills;
  };

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

        const employee: Employee = {
          id: record.id,
          name: record.person,
          lbs: meta?.careerLevel || record.lbs || 'Consultant',
          cc: meta?.cc || record.cc || 'Unknown CC',
          team: meta?.team || record.team || 'Unknown Team',
          mainRole: 'Projektleiter', // Platzhalter - später aus utilizationData
          email: record.email || `${record.person.toLowerCase().replace(' ', '.')}@company.com`, // Platzhalter
          vg: meta?.manager || record.vg || 'Unknown Manager',
          profileUrl: record.linkZumProfilUrl || undefined, // Aus Datenbank
          skills: generateMockSkills(meta?.careerLevel || record.lbs, meta?.lob || record.lob),
          completedProjects: transformAuslastungToCompletedProjects(record),
          plannedProjects: transformEinsatzplanToProjects(record)
        };

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

// Hilfsfunktion für Wochennummer (vereinfacht)
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function() {
  const date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};
