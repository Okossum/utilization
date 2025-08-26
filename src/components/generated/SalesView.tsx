import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { EmployeeOverview } from './EmployeeOverview';
import { ProjectCreationModal } from './ProjectCreationModal';
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

import { Employee } from '../../lib/types';

interface SalesEmployee extends Employee {
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
  // Callback für Projekt-Erstellung
  onCreateProject?: () => void;
}

interface SalesViewProps {
  actionItems: Record<string, { actionItem: boolean; source: 'manual' | 'rule' | 'default'; updatedBy?: string }>;
}

// @component: SalesView
export const SalesView = ({ actionItems }: SalesViewProps) => {
  const { databaseData, personMeta, isLoading, refreshData } = useUtilizationData();
  const [employees, setEmployees] = useState<SalesEmployee[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Project Creation Modal States (wie in UtilizationReportView)
  const [isProjectCreationModalOpen, setIsProjectCreationModalOpen] = useState(false);
  const [projectCreationPersonId, setProjectCreationPersonId] = useState<string | null>(null);
  const [projectCreationPersonName, setProjectCreationPersonName] = useState<string | null>(null);

  // Speichere Projekt-Referenz in utilizationData Collection (zentraler Hub)
  const saveProjectToUtilizationData = async (projectData: any, employeeId: string) => {
    try {
      const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
      const { COLLECTIONS } = await import('../../lib/types');
      const { db } = await import('../../lib/firebase');
      
      
      
      // Finde den utilizationData Eintrag für diese Person
      let utilizationQuery = query(
        collection(db, COLLECTIONS.UTILIZATION_DATA),
        where('id', '==', employeeId)
      );
      
      let utilizationSnapshot = await getDocs(utilizationQuery);
      
      // Falls nicht gefunden, ist das ein Datenproblem
      if (utilizationSnapshot.empty) {

        return;
      }
      
      // Dokument gefunden - speichere Projekt-Referenz
      const utilizationDoc = utilizationSnapshot.docs[0];
      const currentData = utilizationDoc.data();
      
      // Füge Projekt-Referenz zu den bestehenden Projekt-Referenzen hinzu
      const existingProjectRefs = currentData.projectReferences || [];
      const newProjectRef = {
        projectId: projectData.id,
        projectName: projectData.projectName,
        customer: projectData.customer,
        projectType: projectData.projectType,
        addedAt: new Date().toISOString(),
        roles: projectData.roles || []
      };
      
      // Prüfe ob Projekt bereits referenziert ist
      const existingRef = existingProjectRefs.find((ref: any) => ref.projectId === projectData.id);
      if (!existingRef) {
        const updatedProjectRefs = [...existingProjectRefs, newProjectRef];
        
        // Aktualisiere utilizationData Dokument
        await updateDoc(doc(db, COLLECTIONS.UTILIZATION_DATA, utilizationDoc.id), {
          projectReferences: updatedProjectRefs,
          updatedAt: new Date().toISOString()
        });
        

      } else {

      }
      
    } catch (error) {

      throw error;
    }
  };

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
          employeeRole: ref.roles?.[0]?.name || 'Consultant',
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
      employeeRole: ref.roles?.[0]?.name || 'Consultant',
      utilization: ref.utilization || undefined,
      averageUtilization: ref.averageUtilization || undefined,
      probability: 'Commissioned' as const
    }));
  };

  // Mock Skills Funktion entfernt - verwende nur echte Daten

  // Erstelle dataForUI wie in UtilizationReportView (KORREKTE DATENQUELLE)
  const dataForUI = useMemo(() => {
    if (!databaseData.auslastung || !databaseData.einsatzplan) {
      return [];
    }
    
    const combinedData: any[] = [];
    
    // Verarbeite Auslastung-Daten (historisch)
    databaseData.auslastung.forEach(row => {
      if (row.values) {
        Object.entries(row.values).forEach(([weekKey, value]) => {
          if (typeof value === 'number' && weekKey.match(/^\d{2}\/\d{2}$/)) {
            combinedData.push({
              person: row.person || 'Unknown',
              personId: row.personId || row.id,
              week: weekKey,
              utilization: value,
              finalValue: value,
              isHistorical: true
            });
          }
        });
      }
    });
    
    // Verarbeite Einsatzplan-Daten (forecast)
    databaseData.einsatzplan.forEach(row => {
      if (row.values) {
        Object.entries(row.values).forEach(([weekKey, value]) => {
          if (typeof value === 'number' && weekKey.match(/^\d{2}\/\d{2}$/)) {
            combinedData.push({
              person: row.person || 'Unknown',
              personId: row.personId || row.id,
              week: weekKey,
              utilization: value,
              finalValue: value,
              isHistorical: false
            });
          }
        });
      }
    });
    
    return combinedData;
  }, [databaseData.auslastung, databaseData.einsatzplan]);

  // Daten aus UtilizationDataContext transformieren
  const transformUtilizationDataToEmployees = () => {
    try {
      setError(null);

      if (!databaseData.utilizationData || !personMeta || !dataForUI.length) {
        // console.log entfernt
        return;
      }



      // Mitarbeiter-Daten aus utilizationData transformieren
      const transformedEmployees: SalesEmployee[] = [];
      
      databaseData.utilizationData.forEach((record: any) => {
        const meta = personMeta.get(record.person);
        
        // ✅ FILTER: Nur Mitarbeiter mit aktiviertem ACT-Toggle anzeigen
        const hasActToggle = actionItems[record.person]?.actionItem === true;
        if (!hasActToggle) {
          return; // Mitarbeiter überspringen, wenn ACT-Toggle nicht aktiviert
        }

        // Berechne Auslastungs-KPIs mit der GLEICHEN Logik wie EmployeeDetailView
        const calculateUtilizationKPIs = (record: any) => {
          try {
            // Verwende dataForUI (wie EmployeeDetailView)
            const personName = record.person;
            const employeeId = record.id;
            
            // Filtere dataForUI für diese Person (wie in EmployeeDetailView)
            const filtered = dataForUI.filter(row => {
              const matchesPersonId = row.personId && row.personId === employeeId;
              const matchesPersonName = personName && (row.person === personName || row.name === personName);
              return matchesPersonId || matchesPersonName;
            });
            
            if (filtered.length === 0) {
              return { currentUtilization: null, averageUtilization: null };
            }
            
            // Berechne geplante Auslastung für den Rest des Jahres (EXAKT wie EmployeeDetailView)
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentWeekNumber = getISOWeek(currentDate);
            
            // EXAKTE Filterlogik aus EmployeeDetailView
            const plannedData = filtered.filter(row => {
              const isForecast = !row.isHistorical;
              
              // Parse week format YY/WW
              const [yearStr, weekStr] = row.week.split('/');
              const year = parseInt(yearStr) < 50 ? 2000 + parseInt(yearStr) : 1900 + parseInt(yearStr);
              const weekNum = parseInt(weekStr);
              
              const isCurrentYearOrLater = year >= currentYear;
              const isCurrentWeekOrLater = year > currentYear || (year === currentYear && weekNum >= currentWeekNumber);
              const hasValidValue = typeof row.finalValue === 'number' && row.finalValue > 0;
              
              return isForecast && isCurrentYearOrLater && isCurrentWeekOrLater && hasValidValue;
            });
            
            let currentUtilization: number | undefined = undefined;
            if (plannedData.length > 0) {
              const totalPlanned = plannedData.reduce((sum, row) => sum + row.finalValue, 0);
              const avgPlanned = totalPlanned / plannedData.length;
              currentUtilization = Math.round(avgPlanned);
            } else {
              // Wenn keine geplanten Daten gefunden werden, setze auf 0 (wie EmployeeDetailView)
              currentUtilization = 0;
            }
            
            // Berechne Durchschnittsauslastung (EXAKT wie EmployeeDetailView)
            const getWeekNumberForAvg = (date: Date): number => {
              const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
              const dayNum = d.getUTCDay() || 7;
              d.setUTCDate(d.getUTCDate() + 4 - dayNum);
              const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
              return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
            };
            
            const currentWeekForAvg = getWeekNumberForAvg(currentDate);
            
            // Filter für aktuelles Jahr bis zur aktuellen Woche (EXAKT wie EmployeeDetailView)
            const currentYearData = filtered.filter(row => {
              // Parse week format YY/WW
              const [yearStr, weekStr] = row.week.split('/');
              const year = parseInt(yearStr) < 50 ? 2000 + parseInt(yearStr) : 1900 + parseInt(yearStr);
              const weekNum = parseInt(weekStr);
              
              const isCurrentYear = year === currentYear;
              const isValidWeek = weekNum <= currentWeekForAvg;
              const hasValidValue = typeof row.finalValue === 'number' && !isNaN(row.finalValue);
              
              return isCurrentYear && isValidWeek && hasValidValue;
            });
            
            let averageUtilization: number | undefined = undefined;
            if (currentYearData.length > 0) {
              const sum = currentYearData.reduce((acc, row) => acc + row.finalValue, 0);
              const average = sum / currentYearData.length;
              averageUtilization = Math.round(average);
            } else {
              // Fallback: Verwende alle verfügbaren Daten (wie EmployeeDetailView)
              const allValidData = filtered.filter(row => 
                typeof row.finalValue === 'number' && row.finalValue > 0
              );
              if (allValidData.length > 0) {
                const sum = allValidData.reduce((acc, row) => acc + row.finalValue, 0);
                const average = sum / allValidData.length;
                averageUtilization = Math.round(average);
              }
            }
            
            return { currentUtilization, averageUtilization };
            
          } catch (error) {

            return { currentUtilization: null, averageUtilization: null };
          }
        };

        const { currentUtilization, averageUtilization } = calculateUtilizationKPIs(record);



        const employee: SalesEmployee = {
          id: record.id,
          name: record.person,
          lbs: meta?.careerLevel || record.lbs || 'Consultant',
          cc: meta?.cc || record.cc || 'Unknown CC',
          team: meta?.team || record.team || 'Unknown Team',
          mainRole: meta?.mainRole || record.mainRole || 'Consultant',
          role: meta?.mainRole || record.mainRole || 'Consultant',
          email: meta?.email || record.email || undefined,
          vg: meta?.manager || record.vg || undefined,
          profileUrl: record.linkZumProfilUrl || undefined,
          
          // Zusätzliche Felder aus EmployeeDetailView
          phone: meta?.phone || record.phone || undefined,
          location: meta?.standort || record.standort || undefined,
          startDate: meta?.startDate || record.startDate || undefined,
          status: meta?.status || record.status || 'active',
          utilization: currentUtilization ?? undefined,
          averageUtilization: averageUtilization ?? undefined,
          
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
          plannedProjects: transformEinsatzplanToProjects(record),
          
          // Callback für Project Creation (exakt wie in UtilizationReportView)
          onCreateProject: () => {
            setProjectCreationPersonId(record.id);  // ✅ KORREKT: Verwende ID statt Name!
            setProjectCreationPersonName(record.person);
            setIsProjectCreationModalOpen(true);
          }
        };

        // Debug-Logging entfernt - Problem behoben



        transformedEmployees.push(employee);
        

      });


      
      setEmployees(transformedEmployees);

    } catch (err) {
      // console.error entfernt
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    }
  };

  useEffect(() => {
    if (!isLoading && databaseData.utilizationData && dataForUI.length > 0) {
      transformUtilizationDataToEmployees();
    }
  }, [isLoading, databaseData.utilizationData, personMeta, actionItems, dataForUI]);

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
              onClick={() => window.location.reload()}
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
  return (
    <>
      <EmployeeOverview employees={employees} />
      
      {/* Project Creation Modal (exakt wie in UtilizationReportView Opportunities) */}
      <ProjectCreationModal
        isOpen={isProjectCreationModalOpen}
        onClose={() => {
          setIsProjectCreationModalOpen(false);
          setProjectCreationPersonId(null);
          setProjectCreationPersonName(null);
        }}
        onSave={async (projectData) => {
          try {
            // Speichere Projekt-Referenz in utilizationData (zentraler Hub)
            if (projectCreationPersonId) {
              await saveProjectToUtilizationData(projectData, projectCreationPersonId);  // ✅ KORREKT: ID verwenden!
            }
            
            setIsProjectCreationModalOpen(false);
            setProjectCreationPersonId(null);
            setProjectCreationPersonName(null);
            
            // Refresh data after project creation and reference storage
            await refreshData();
          } catch (error) {

          }
        }}
        employeeId={projectCreationPersonId || ''}  // ✅ KORREKT: ID verwenden!
        employeeName={projectCreationPersonName || ''}  // ✅ KORREKT: Name verwenden!
        forceProjectType="planned"
      />
    </>
  );
};


