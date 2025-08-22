import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EmployeeOverview } from './EmployeeOverview';
import DatabaseService from '../../services/database';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

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
  probability?: 'Prospect' | 'Offered' | 'Planned' | 'Commissioned' | 'On-Hold' | 'Rejected';
}

interface Employee {
  id: string;
  name: string;
  area: string;
  competenceCenter: string;
  team: string;
  careerLevel: string;
  skills: Skill[];
  completedProjects: Project[];
  plannedProjects: Project[];
}

// @component: SalesView
export const SalesView = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Einsatzplan-Daten zu Projekten transformieren
  const transformEinsatzplanToProjects = (einsatzplanData: any[], personId: string): Project[] => {
    const personData = einsatzplanData.find(e => e.personId === personId);
    if (!personData?.values) return [];

    const projects: Project[] = [];
    
    Object.entries(personData.values).forEach(([week, entries]: [string, any]) => {
      if (Array.isArray(entries)) {
        entries.forEach((entry, index) => {
          if (entry.projekt && entry.projekt !== '---') {
            projects.push({
              id: `${personId}-${week}-${index}`,
              customer: entry.projekt,
              projectName: `${entry.projekt} Assignment`,
              startDate: weekToDate(week),
              endDate: weekToDate(week, 6),
              description: `Assignment at ${entry.ort || 'Remote'}`,
              skillsUsed: [], // TODO: Aus Skills-Collection laden
              employeeRole: 'Consultant',
              utilization: entry.auslastungProzent || 0,
              probability: 'Planned'
            });
          }
        });
      }
    });

    return projects;
  };

  // Auslastung-Daten zu historischen Projekten transformieren
  const transformAuslastungToCompletedProjects = (auslastungData: any[], personId: string): Project[] => {
    const personData = auslastungData.find(a => a.personId === personId);
    if (!personData?.values) return [];

    const projects: Project[] = [];
    const currentWeek = new Date().getWeek(); // Vereinfacht
    
    Object.entries(personData.values).forEach(([week, utilization]: [string, any]) => {
      const [year, weekNum] = week.split('/').map(Number);
      const fullYear = year < 50 ? 2000 + year : 1900 + year;
      
      // Nur vergangene Wochen als "completed" betrachten
      if (fullYear <= new Date().getFullYear() && weekNum < currentWeek && utilization > 0) {
        projects.push({
          id: `${personId}-completed-${week}`,
          customer: 'Client Assignment',
          projectName: `Week ${week} Assignment`,
          startDate: weekToDate(week),
          endDate: weekToDate(week, 6),
          description: `Completed assignment with ${utilization}% utilization`,
          skillsUsed: [],
          employeeRole: 'Consultant',
          utilization: utilization
        });
      }
    });

    return projects.slice(0, 3); // Nur die letzten 3 für Übersichtlichkeit
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

  // Daten aus Firebase laden
  const loadSalesData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Parallel laden aller benötigten Daten
      const [mitarbeiterSnap, auslastungData, einsatzplanData] = await Promise.all([
        getDocs(collection(db, 'mitarbeiter')),
        DatabaseService.getAuslastung().catch(() => []),
        DatabaseService.getEinsatzplan().catch(() => [])
      ]);

      console.log('🔍 Sales View - Geladene Daten:', {
        mitarbeiter: mitarbeiterSnap.size,
        auslastung: auslastungData?.length || 0,
        einsatzplan: einsatzplanData?.length || 0
      });

      // Mitarbeiter-Daten transformieren
      const transformedEmployees: Employee[] = [];
      
      mitarbeiterSnap.forEach(doc => {
        const data = doc.data();
        
        const employee: Employee = {
          id: doc.id,
          name: data.person || `${data.vorname} ${data.nachname}`,
          area: data.lob || data.bereich || 'Unknown Area',
          competenceCenter: data.cc || 'Unknown CC',
          team: data.team || 'Unknown Team',
          careerLevel: data.lbs || data.erfahrungSeitJahr || 'Consultant',
          skills: generateMockSkills(data.lbs, data.lob),
          completedProjects: transformAuslastungToCompletedProjects(auslastungData || [], doc.id),
          plannedProjects: transformEinsatzplanToProjects(einsatzplanData || [], doc.id)
        };

        transformedEmployees.push(employee);
      });

      console.log('✅ Sales View - Transformierte Employees:', transformedEmployees.length);
      setEmployees(transformedEmployees);

    } catch (err) {
      console.error('❌ Fehler beim Laden der Sales-Daten:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();
  }, []);

  // Loading State
  if (loading) {
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
