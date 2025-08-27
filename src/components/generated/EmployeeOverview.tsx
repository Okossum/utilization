import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Grid, List, Table, Users } from 'lucide-react';
import { EmployeeCard } from './EmployeeCard';
import { EmployeeTable } from './EmployeeTable';
import { SalesFilterBar } from './SalesFilterBar';
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
  // Callback für Projekt-Erstellung
  onCreateProject?: () => void;
}

interface EmployeeOverviewProps {
  employees: Employee[];
}
type ViewMode = 'cards' | 'table' | 'grid';

// @component: EmployeeOverview
export const EmployeeOverview = ({ employees }: EmployeeOverviewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  
  // KEINE MOCK-DATEN - nur echte Daten verwenden
  console.log('🔍 EmployeeOverview - Empfangene Employees:', employees?.length || 0, 'Mitarbeiter');
  const employeesData = employees || [];
  
  // Verwende gefilterte Daten oder alle Daten
  const displayEmployees = filteredEmployees.length > 0 ? filteredEmployees : employeesData;
  console.log('🔍 EmployeeOverview - Display Employees:', displayEmployees.length, '(', displayEmployees.length, ')');
  const viewModeButtons = [{
    mode: 'cards' as ViewMode,
    icon: List,
    label: 'Cards'
  }, {
    mode: 'table' as ViewMode,
    icon: Table,
    label: 'Table'
  }, {
    mode: 'grid' as ViewMode,
    icon: Grid,
    label: 'Grid'
  }] as any[];

  // @return
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex gap-2 bg-white rounded-xl p-2 shadow-sm border border-slate-200 w-fit">
            {viewModeButtons.map(({
            mode,
            icon: Icon,
            label
          }) => <button key={mode} onClick={() => setViewMode(mode)} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${viewMode === mode ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Icon className="w-4 h-4" />
                <span className="font-medium">{label}</span>
              </button>)}
          </div>
        </header>

        {/* Filter Bar */}
        <SalesFilterBar 
          employees={employeesData}
          onFilterChange={setFilteredEmployees}
        />

        <motion.main key={viewMode} initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.3
      }}>
          {viewMode === 'table' ? <EmployeeTable employees={displayEmployees} /> : <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
              {displayEmployees.map(employee => <EmployeeCard key={employee.id} employee={employee} isCompact={viewMode === 'grid'} onCreateProject={employee.onCreateProject} />)}
            </div>}
        </motion.main>
      </div>
    </div>;
};