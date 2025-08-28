import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmployeeOverview } from './EmployeeOverview';
import { ProjectCreationModal } from './ProjectCreationModal';
import { ProjectDetailModal } from './ProjectDetailModal';
import { useUtilizationData } from '../../contexts/UtilizationDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { getISOWeek } from 'date-fns';
import type { ProjectHistoryItem } from '../../lib/types';
import { filterProjectsByType } from '../../utils/projectUtils';

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
  averageUtilization?: number;
  probability?: 'Prospect' | 'Offered' | 'Planned' | 'Commissioned' | 'On-Hold' | 'Rejected';
  projectType?: 'historical' | 'planned' | 'active';
  projectSource?: 'regular' | 'jira';
  dailyRate?: number;
  plannedUtilization?: number;
  dueDate?: string; // Follow-up Datum für geplante Projekte
  internalContact?: string;
  customerContact?: string;
  jiraTicketId?: string;
  duration?: string;
  activities?: string[];
  roles?: any[];
  skills?: any[];
}

interface Employee {
  id: string;
  name: string;
  lbs: string;              // Karrierestufe (LBS)
  cc: string;               // Competence Center
  team: string;
  role: string;
  mainRole: string;         // Hauptrolle
  email?: string;           // E-Mail-Adresse
  phone?: string;           // Telefonnummer
  location?: string;        // Standort
  startDate?: string;       // Startdatum
  status?: string;          // Status (aktiv, inaktiv, etc.)
  utilization?: number;     // Aktuelle Auslastung
  averageUtilization?: number; // Durchschnittliche Auslastung
  
  // Skills
  skills: Skill[];          // Technical Skills
  softSkills?: Skill[];     // Soft Skills
  
  // Projekte
  completedProjects: Project[];
  activeProjects: Project[];
  plannedProjects: Project[];
  
  // Stärken/Schwächen
  strengths?: string[];
  weaknesses?: string[];
  
  // Kommentare
  utilizationComment?: string;
  planningComment?: string;
  
  // Callback für Project Creation
  onCreateProject?: () => void;
}

interface SalesViewProps {
  actionItems: Record<string, { actionItem: boolean; source: 'manual' | 'rule' | 'default'; updatedBy?: string }>;
}

// @component: SalesView
export const SalesView = ({ actionItems }: SalesViewProps) => {
  const { databaseData, personMeta, isLoading, refreshData } = useUtilizationData();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Project Creation Modal States (wie in UtilizationReportView)
  const [isProjectCreationModalOpen, setIsProjectCreationModalOpen] = useState(false);
  const [projectCreationPersonId, setProjectCreationPersonId] = useState<string | null>(null);
  const [projectCreationPersonName, setProjectCreationPersonName] = useState<string | null>(null);
  
  // Project Modals States (wie EmployeeDetailView)
  const [isProjectDetailModalOpen, setIsProjectDetailModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectHistoryItem | null>(null);
  const [selectedProjectType, setSelectedProjectType] = useState<'active' | 'planned' | 'historical'>('planned');
  const [editingProject, setEditingProject] = useState<ProjectHistoryItem | null>(null);
  const [newProjectType, setNewProjectType] = useState<'historical' | 'planned'>('planned');
  
  // Echte Projekte aus projects Collection
  const [plannedProjects, setPlannedProjects] = useState<any[]>([]);
  const { user, token } = useAuth();

  // Handler für Projekt-Bearbeitung (wie EmployeeDetailView)
  const handleEditProject = (project: Project) => {
    // Sales darf nur geplante Projekte bearbeiten
    if (project.projectType !== 'planned') {
      console.warn('Sales darf nur geplante Projekte bearbeiten:', project);
      return;
    }
    
    console.log('📝 Öffne ProjectCreationModal für Projekt:', project.projectName);
    
    // Konvertiere Project zu ProjectHistoryItem
    const projectHistoryItem: ProjectHistoryItem = {
      id: project.id,
      projectName: project.projectName,
      customer: project.customer,
      startDate: project.startDate,
      endDate: project.endDate,
      description: project.description,
      projectType: project.projectType as 'historical' | 'planned',
      employeeId: '', // Wird im Modal gesetzt
      roles: project.roles || [],
      skills: project.skills || [],
      // probability: project.probability, // String, nicht number
      dailyRate: project.dailyRate,
      plannedAllocationPct: project.plannedUtilization,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setEditingProject(projectHistoryItem);
    setIsProjectCreationModalOpen(true);
  };

  const handleViewProject = (project: ProjectHistoryItem) => {
    setSelectedProject(project);
    setSelectedProjectType('planned');
    setIsProjectDetailModalOpen(true);
  };

  const handleAddPlannedProject = (employeeId: string, employeeName: string) => {
    setEditingProject(null);
    setNewProjectType('planned');
    setProjectCreationPersonId(employeeId);
    setProjectCreationPersonName(employeeName);
    setIsProjectCreationModalOpen(true);
  };

  // Lade echte geplante Projekte aus projects Collection
  const loadPlannedProjects = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/planned-projects', {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const projects = await response.json();
      setPlannedProjects(projects);
      console.log('📊 Geplante Projekte geladen:', projects.length);
    } catch (error) {
      console.error('❌ Fehler beim Laden der geplanten Projekte:', error);
    }
  };

  // Speichere Projekt (wie EmployeeDetailView)
  const handleSaveProject = async (project: ProjectHistoryItem) => {
    console.log('💾 Saving project to projects Collection:', project);
    
    try {
      // Speichere Projekt-Referenz in utilizationData Hub (zentraler Data Hub)
      const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
      const { COLLECTIONS } = await import('../../lib/types');
      const { db } = await import('../../lib/firebase');
      
      // Finde utilizationData Eintrag für diese Person über ID
      const utilizationQuery = query(
        collection(db, COLLECTIONS.UTILIZATION_DATA),
        where('id', '==', project.employeeId)
      );
      
      const querySnapshot = await getDocs(utilizationQuery);
      
      if (querySnapshot.empty) {
        throw new Error(`Kein utilizationData Eintrag für Employee ID: ${project.employeeId}`);
      }
      
      // Update alle gefundenen Dokumente (sollte nur eins sein)
      const updatePromises = querySnapshot.docs.map(async (docSnapshot) => {
        const docRef = doc(db, COLLECTIONS.UTILIZATION_DATA, docSnapshot.id);
        const currentData = docSnapshot.data();
        
        // Initialisiere projectReferences falls nicht vorhanden
        const projectReferences = currentData.projectReferences || [];
        
        // Prüfe ob Projekt bereits existiert
        const existingIndex = projectReferences.findIndex((ref: any) => ref.projectId === project.id);
        
        const projectRef = {
          projectId: project.id,
          employeeId: project.employeeId,
          assignedAt: new Date(),
          updatedAt: new Date()
        };
        
        if (existingIndex >= 0) {
          // Update existierende Referenz
          projectReferences[existingIndex] = { ...projectReferences[existingIndex], ...projectRef };
        } else {
          // Füge neue Referenz hinzu
          projectReferences.push(projectRef);
        }
        
        await updateDoc(docRef, {
          projectReferences,
          updatedAt: new Date()
        });
      });
      
      await Promise.all(updatePromises);
      
      // Lade Daten neu
      await loadPlannedProjects();
      refreshData();
      
      console.log('✅ Projekt erfolgreich gespeichert');
    } catch (error) {
      console.error('❌ Fehler beim Speichern des Projekts:', error);
      throw error;
    }
    
    // Close modal and reset editing state
    setIsProjectCreationModalOpen(false);
    setEditingProject(null);
  };

  // Lade geplante Projekte beim Mount und bei Datenänderungen
  useEffect(() => {
    if (token) {
      loadPlannedProjects();
    }
  }, [token, databaseData]);

  // Hilfsfunktion: Woche zu Datum
  const weekToDate = (weekString: string, dayOffset: number = 0): string => {
    const [year, week] = weekString.split('/').map(Number);
    
    // Erstelle ein Datum für den ersten Tag des Jahres
    const firstDayOfYear = new Date(year, 0, 1);
    
    // Finde den ersten Montag des Jahres
    const firstMonday = new Date(firstDayOfYear);
    const dayOfWeek = firstDayOfYear.getDay();
    const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    firstMonday.setDate(firstDayOfYear.getDate() + daysToAdd);
    
    // Berechne das Zieldatum
    const targetDate = new Date(firstMonday);
    targetDate.setDate(firstMonday.getDate() + (week - 1) * 7 + dayOffset);
    
    return targetDate.toISOString().split('T')[0];
  };

  // Transformiere Auslastungsdaten zu abgeschlossenen Projekten
  const transformAuslastungToCompletedProjects = (record: any): Project[] => {
    const completedProjects: Project[] = [];
    
    // 1. Historische Projekte aus projectReferences
    if (record.projectReferences) {
      record.projectReferences.forEach((ref: any) => {
        // ✅ NEU: Prüfe explizit auf projectType: 'historical'
        if (ref.projectName && ref.customer && ref.projectType === 'historical') {
          completedProjects.push({
            id: ref.projectId || `historical-${Math.random().toString(36).substr(2, 9)}`,
            customer: ref.customer || 'Unknown Customer',
            projectName: ref.projectName || 'Historical Project',
            startDate: ref.startDate || '',
            endDate: ref.endDate || '',
            description: ref.description || 'Historical project assignment',
            skillsUsed: ref.skills?.map((s: any) => s.name) || [],
            employeeRole: ref.roles?.[0]?.name || ref.role || 'Consultant',
            utilization: ref.utilization || undefined,
            averageUtilization: ref.averageUtilization || undefined,
            probability: 'Commissioned', // Historische Projekte sind abgeschlossen
            projectType: 'historical',
            projectSource: ref.projectSource || 'regular',
            dailyRate: ref.dailyRate || undefined,
            plannedUtilization: ref.plannedUtilization || undefined,
            dueDate: ref.dueDate || undefined, // Follow-up Datum (falls vorhanden)
            duration: ref.duration || undefined,
            activities: ref.activities || [],
            roles: ref.roles || [],
            skills: ref.skills || []
          });
        }
      });
    }
    
    // 2. Historische Projekte aus Auslastungsdaten (bestehende Logik)
    if (record.auslastung && typeof record.auslastung === 'object') {
      const projectGroups: Record<string, any[]> = {};
      
      // Gruppiere Einträge nach Projekt
      Object.entries(record.auslastung).forEach(([week, entries]: [string, any]) => {
        if (Array.isArray(entries)) {
          entries.forEach((entry: any) => {
            if (entry.projekt && entry.projekt !== 'Bench' && entry.projekt !== 'Urlaub') {
              const projectKey = entry.projekt;
              if (!projectGroups[projectKey]) {
                projectGroups[projectKey] = [];
              }
              projectGroups[projectKey].push({ ...entry, week });
            }
          });
        }
      });
      
      // Erstelle Projekte aus Gruppen
      Object.entries(projectGroups).forEach(([projectKey, entries]) => {
        const firstEntry = entries[0];
        const weeks = entries.map(e => e.week).sort();
        
        // Berechne Durchschnittsauslastung
        const totalUtilization = entries.reduce((sum, entry) => sum + (entry.auslastung || 0), 0);
        const averageUtilization = entries.length > 0 
          ? Math.round(totalUtilization / entries.length)
          : 0;
        
        const lastWeek = weeks[weeks.length - 1];
        const endDate = weekToDate(lastWeek, 6);
        
        completedProjects.push({
          id: `${record.id}-auslastung-${projectKey}`,
          customer: firstEntry.projekt,
          projectName: `${firstEntry.projekt} Project`,
          startDate: weekToDate(weeks[0]),
          endDate: endDate,
          description: `Completed project at ${firstEntry.ort || 'Remote'} (${weeks.length} weeks)`,
          skillsUsed: [],
          employeeRole: 'Consultant',
          utilization: averageUtilization,
          averageUtilization: averageUtilization,
          projectType: 'historical',
          projectSource: 'regular',
          duration: `${weeks.length} weeks`,
          activities: [`Work at ${firstEntry.ort || 'Remote'}`]
        });
      });
    }
    
    // 3. FALLBACK: Unterstütze alte completedProjects/historicalProjects während Migration
    if (record.completedProjects && Array.isArray(record.completedProjects)) {
      record.completedProjects.forEach((project: any) => {
        if (project.projectType === 'historical' || !project.projectType) {
          completedProjects.push({
            id: project.id || `legacy-historical-${Math.random().toString(36).substr(2, 9)}`,
            customer: project.customer || 'Unknown Customer',
            projectName: project.projectName || 'Legacy Historical Project',
            startDate: project.startDate || '',
            endDate: project.endDate || '',
            description: project.description || 'Legacy historical project',
            skillsUsed: project.skills?.map((s: any) => s.name) || [],
            employeeRole: project.roles?.[0]?.name || project.role || 'Consultant',
            utilization: project.utilization || undefined,
            averageUtilization: project.averageUtilization || undefined,
            probability: 'Commissioned',
            projectType: 'historical',
            projectSource: project.projectSource || 'regular',
            duration: project.duration || undefined,
            activities: project.activities || [],
            roles: project.roles || [],
            skills: project.skills || []
          });
        }
      });
    }
    
    return completedProjects;
  };

  // Transformiere zu aktiven Projekten aus projectReferences
  const transformToActiveProjects = (record: any): Project[] => {
    const activeProjects: Project[] = [];

    // 1. Aktive Projekte aus projectReferences
    if (record.projectReferences) {
      record.projectReferences.forEach((ref: any) => {
        // ✅ KORRIGIERT: Prüfe explizit auf projectType: 'active'
        if (ref.projectName && ref.customer && ref.projectType === 'active') {
          activeProjects.push({
            id: ref.projectId || `active-${Math.random().toString(36).substr(2, 9)}`,
            customer: ref.customer || 'Unknown Customer',
            projectName: ref.projectName || 'Active Project',
            startDate: ref.startDate || '',
            endDate: ref.endDate || '',
            description: ref.description || 'Active project assignment',
            skillsUsed: ref.skills?.map((s: any) => s.name) || [],
            employeeRole: ref.roles?.[0]?.name || ref.role || 'Consultant',
            utilization: ref.utilization || undefined,
            averageUtilization: ref.averageUtilization || undefined,
            probability: 'Commissioned', // Aktive Projekte sind immer commissioned
            projectType: 'active',
            projectSource: ref.projectSource || 'regular',
            dailyRate: ref.dailyRate || undefined,
            plannedUtilization: ref.plannedUtilization || undefined,
            dueDate: ref.dueDate || undefined, // Follow-up Datum
            roles: ref.roles || [],
            skills: ref.skills || []
          });
        }
      });
    }

    // 2. FALLBACK: Unterstütze alte activeProjects während Migration
    if (record.activeProjects && Array.isArray(record.activeProjects)) {
      record.activeProjects.forEach((project: any) => {
        if (project.projectType === 'active') {
          activeProjects.push({
            id: project.id || `legacy-active-${Math.random().toString(36).substr(2, 9)}`,
            customer: project.customer || 'Unknown Customer',
            projectName: project.projectName || 'Legacy Active Project',
            startDate: project.startDate || '',
            endDate: project.endDate || '',
            description: project.description || 'Legacy active project',
            skillsUsed: project.skills?.map((s: any) => s.name) || [],
            employeeRole: project.roles?.[0]?.name || project.role || 'Consultant',
            utilization: project.utilization || undefined,
            averageUtilization: project.averageUtilization || undefined,
            probability: 'Commissioned',
            projectType: 'active',
            projectSource: project.projectSource || 'regular',
            roles: project.roles || [],
            skills: project.skills || []
          });
        }
      });
    }

    return activeProjects;
  };

  // Geplante Projekte aus einsatzplan und projectReferences transformieren
  const transformEinsatzplanToProjects = (record: any): Project[] => {
    const plannedProjects: Project[] = [];

    // 1. Projekte aus projectReferences (nur geplante Projekte)
    if (record.projectReferences) {
      record.projectReferences.forEach((ref: any) => {
        // ✅ KORRIGIERT: Nur Projekte mit projectType: 'planned' oder ohne projectType (Legacy)
        if (ref.projectName && ref.customer && (ref.projectType === 'planned' || !ref.projectType)) {
          plannedProjects.push({
            id: ref.projectId || `planned-${Math.random().toString(36).substr(2, 9)}`,
            customer: ref.customer || 'Unknown Customer',
            projectName: ref.projectName || 'Planned Project',
            startDate: ref.startDate || '',
            endDate: ref.endDate || '',
            description: ref.description || 'Planned project assignment',
            skillsUsed: ref.skills?.map((s: any) => s.name) || [],
            employeeRole: ref.roles?.[0]?.name || ref.role || 'Consultant',
            utilization: ref.utilization || undefined,
            averageUtilization: ref.averageUtilization || undefined,
            probability: ref.probability || 'Planned',
            projectType: 'planned',
            projectSource: 'regular',
            dailyRate: ref.dailyRate || undefined,
            plannedUtilization: ref.plannedUtilization || undefined,
            dueDate: ref.dueDate || undefined, // ✅ WICHTIG: Follow-up Datum für Vertrieb
            roles: ref.roles || [],
            skills: ref.skills || []
          });
        }
      });
    }

    // 2. FALLBACK: Unterstütze alte plannedProjects während Migration
    if (record.plannedProjects && Array.isArray(record.plannedProjects)) {
      record.plannedProjects.forEach((project: any) => {
        if (project.projectType === 'planned') {
          plannedProjects.push({
            id: project.id || `legacy-${Math.random().toString(36).substr(2, 9)}`,
            customer: project.customer || 'Unknown Customer',
            projectName: project.projectName || 'Legacy Project',
            startDate: project.startDate || '',
            endDate: project.endDate || '',
            description: project.description || 'Legacy planned project',
            skillsUsed: project.skills?.map((s: any) => s.name) || [],
            employeeRole: project.roles?.[0]?.name || project.role || 'Consultant',
            utilization: project.utilization || undefined,
            averageUtilization: project.averageUtilization || undefined,
            probability: project.probability || 'Planned',
            projectType: 'planned',
            projectSource: 'regular',
            roles: project.roles || [],
            skills: project.skills || []
          });
        }
      });
    }

    return plannedProjects;
  };

  // Verarbeite Daten wenn verfügbar
  useEffect(() => {
    if (!databaseData || !databaseData.utilizationData || databaseData.utilizationData.length === 0) {
      setEmployees([]);
      return;
    }

    try {
      // ✅ KORRIGIERT: Filtere nur Mitarbeiter mit Act-Toggle (actionItem: true)
      const actToggleEmployees = databaseData.utilizationData.filter((record: any) => {
        const hasActToggle = actionItems[record.person]?.actionItem === true;
        console.log('🔍 Sales Filter Check:', {
          person: record.person,
          hasActToggle,
          actionItemData: actionItems[record.person],
          allRecordKeys: Object.keys(record),
          recordRole: record.role,
          recordMainRole: record.mainRole,
          recordLbs: record.lbs,
          // Alle Felder die "role" oder ähnliches enthalten könnten
          allFieldsWithRole: Object.keys(record).filter(key => 
            key.toLowerCase().includes('role') || 
            key.toLowerCase().includes('job') || 
            key.toLowerCase().includes('position') ||
            key.toLowerCase().includes('title')
          ).reduce((obj, key) => ({ ...obj, [key]: record[key] }), {}),
          // Alle String-Felder die "Batch" enthalten könnten
          fieldsWithBatch: Object.keys(record).filter(key => 
            typeof record[key] === 'string' && 
            record[key].includes('Batch')
          ).reduce((obj, key) => ({ ...obj, [key]: record[key] }), {})
        });
        return hasActToggle;
      });

      console.log('🎯 Sales View - Gefilterte Mitarbeiter mit Act-Toggle:', actToggleEmployees.length, 'von', databaseData.utilizationData.length);

      const processedEmployees: Employee[] = actToggleEmployees.map((record: any) => {
        const meta = personMeta[record.person] || {};
        
        const employee: Employee = {
          id: record.id || record.person,
          name: record.person,
          lbs: record.lbs || meta.lbs || '', // ✅ LBS aus utilizationData oder personMeta
          cc: record.cc || meta.cc || '', // ✅ CC aus utilizationData oder personMeta
          team: record.team || meta.team || '',
          role: record.role || record.mainRole || meta.role || 'Consultant',
          mainRole: record.mainRole || record.role || meta.mainRole || 'Consultant',
          email: meta.email || record.email || undefined, // ✅ E-Mail aus personMeta oder record
          
          // ✅ ERWEITERT: Skills aus personMeta (wie in EmployeeDetailView)
          skills: meta.technicalSkills || [],
          softSkills: meta.softSkills || [],
          
          // Projekte
          completedProjects: transformAuslastungToCompletedProjects(record),
          activeProjects: transformToActiveProjects(record),
          plannedProjects: transformEinsatzplanToProjects(record),
          
          // ✅ ERWEITERT: Weitere Felder aus EmployeeDetailView
          phone: meta.phone || record.phone || undefined,
          location: meta.standort || record.standort || undefined,
          startDate: meta.startDate || record.startDate || undefined,
          status: 'Aktiv', // Default Status für Sales
          utilization: undefined, // Wird später berechnet
          averageUtilization: undefined, // Wird später berechnet
          
          // Kommentare
          utilizationComment: meta?.utilizationComment || record.utilizationComment || undefined,
          planningComment: meta?.planningComment || record.planningComment || undefined,
          
          // ✅ ERWEITERT: Stärken/Schwächen aus personMeta
          strengths: meta.strengths ? [meta.strengths] : [],
          weaknesses: meta.weaknesses ? [meta.weaknesses] : [],
          
          // Callback für Project Creation (exakt wie in UtilizationReportView)
          onCreateProject: () => {
            setProjectCreationPersonId(record.id);  // ✅ KORREKT: Verwende ID statt Name!
            setProjectCreationPersonName(record.person);
            setIsProjectCreationModalOpen(true);
          }
        };

        console.log('✅ Sales Employee processed:', {
          name: employee.name,
          email: employee.email,
          lbs: employee.lbs,
          cc: employee.cc,
          role: employee.role,
          mainRole: employee.mainRole,
          recordRole: record.role,
          recordMainRole: record.mainRole,
          metaRole: meta.role,
          metaMainRole: meta.mainRole,
          skillsCount: employee.skills?.length || 0,
          // ✅ ERWEITERT: Projekt-Debugging
          projectReferencesCount: record.projectReferences?.length || 0,
          projectReferences: record.projectReferences?.map((ref: any) => ({
            projectName: ref.projectName,
            customer: ref.customer,
            projectType: ref.projectType,
            hasProjectType: !!ref.projectType
          })) || [],
          activeProjectsCount: employee.activeProjects?.length || 0,
          plannedProjectsCount: employee.plannedProjects?.length || 0,
          completedProjectsCount: employee.completedProjects?.length || 0
        });

        return employee;
      });

      setEmployees(processedEmployees);
      setError(null);
    } catch (err) {
      console.error('❌ Fehler beim Verarbeiten der Sales-Daten:', err);
      setError('Fehler beim Laden der Daten');
      setEmployees([]);
    }
  }, [databaseData, personMeta, actionItems]); // ✅ KORRIGIERT: actionItems als Dependency hinzugefügt

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Sales-Daten...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Fehler beim Laden</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Neu laden
          </button>
        </div>
      </div>
    );
  }

  // Empty State
  if (!employees || employees.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Keine Daten verfügbar</h2>
          <p className="text-gray-600 mb-4">Es wurden keine Mitarbeiterdaten gefunden.</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Daten neu laden
          </button>
        </div>
      </div>
    );
  }

  // Erfolgreiche Darstellung mit echten Daten
  return (
    <>
      <EmployeeOverview 
        employees={employees} 
        onEditProject={handleEditProject} 
      />
      
      {/* Project Creation Modal (exakt wie in UtilizationReportView Opportunities) */}
      <ProjectCreationModal
        isOpen={isProjectCreationModalOpen}
        onClose={() => {
          setIsProjectCreationModalOpen(false);
          setProjectCreationPersonId(null);
          setProjectCreationPersonName(null);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        employeeId={projectCreationPersonId || ''}
        employeeName={projectCreationPersonName || ''}
        forceProjectType="planned"
        project={editingProject || undefined}
      />
      
      {/* Project Detail Modal */}
      <AnimatePresence>
        {isProjectDetailModalOpen && (
          <ProjectDetailModal
            isOpen={isProjectDetailModalOpen}
            onClose={() => setIsProjectDetailModalOpen(false)}
            project={selectedProject}
            type={selectedProjectType}
          />
        )}
      </AnimatePresence>
    </>
  );
};