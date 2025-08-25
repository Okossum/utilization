"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, User, Mail, MapPin, Calendar, Clock, Star, TrendingUp, MessageSquare, Edit3, Video, UserPlus, FileText, ChevronDown, Award, Edit, Trash2, Plus, ThumbsUp, ThumbsDown, Briefcase, Building, Pencil, Grid3X3, List, BarChart3, Heart } from 'lucide-react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

import { useAuth } from '../../contexts/AuthContext';
import DatabaseService from '../../services/database';
import { useUtilizationData } from '../../contexts/UtilizationDataContext';
import TechnicalSkillSelectionModal from './TechnicalSkillSelectionModal';
import { SoftSkillSelectionModal } from './SoftSkillSelectionModal';
import RoleSelectionModal from './RoleSelectionModal';
import { ProjectHistoryList } from './ProjectHistoryList';
import { EmployeeSkillAssignment } from './EmployeeSkillAssignment';
import EmployeeRoleAssignment from './EmployeeRoleAssignment';
import { ProjectHistorySection } from './ProjectHistorySection';

import { UtilizationComment } from './UtilizationComment';
import { PlanningComment } from './PlanningComment';
// ProjectHistoryEditorModal removed - using ProjectCreationModal for both create and edit
import { ProjectCreationModal } from './ProjectCreationModal';
import { ProjectCard, CompactProjectCard } from './ProjectCard';
import { ProjectTable } from './ProjectTable';
import { ProjectToast, useProjectToast } from './ProjectToast';
import type { ProjectHistoryItem } from '../../lib/types';
import { ProjectsByType } from '../../types/projects';
import { filterProjectsByType } from '../../utils/projectUtils';
import { createProjectNotification } from '../../utils/projectBusinessLogic';
export interface EmployeeDetailViewProps {
  // Treats employeeId as personId (MVP)
  employeeId: string;
  onBack: () => void;
}
interface Employee {
  id: string;
  name: string;
  position: string;
  team: string;
  email: string;
  phone: string;
  location: string;
  startDate: string;
  status: string;
  utilization: number;
  skills: Array<{
    name: string;
    rating: number;
  }>;
  projects: Array<{
    name: string;
    role: string;
    progress: number;
  }>;

  performance: {
    rating: number;
    goals: number;
    feedback: number;
  };
  strengths: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  weaknesses: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}
// Remove large mock dataset. We'll derive a minimal view model and fallback values.
const statusOptions = [{
  value: 'active',
  label: 'Aktiv',
  color: 'bg-green-100 text-green-800'
}, {
  value: 'inactive',
  label: 'Inaktiv',
  color: 'bg-red-100 text-red-800'
}, {
  value: 'vacation',
  label: 'Urlaub',
  color: 'bg-blue-100 text-blue-800'
}, {
  value: 'training',
  label: 'Schulung',
  color: 'bg-yellow-100 text-yellow-800'
}];
export default function EmployeeDetailView({
  employeeId,
  onBack
}: EmployeeDetailViewProps) {

  

  const { token } = useAuth();
  const { databaseData, personMeta } = useUtilizationData();
  
  // Create dataForUI similar to UtilizationReportView
  const dataForUI = useMemo(() => {
    if (!databaseData.auslastung || !databaseData.einsatzplan) return [];
    
    const result: any[] = [];
    
    // Process Auslastung data (historical)
    databaseData.auslastung.forEach((row: any) => {
      if (!row.values) return;
      
      Object.entries(row.values).forEach(([weekKey, value]) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
          const [yearStr, weekStr] = weekKey.split('/');
          const year = parseInt(`20${yearStr}`, 10);
          const weekNumber = parseInt(weekStr, 10);
          
          result.push({
            person: row.person,
            personId: row.personId || row.id,
            name: row.person,
            week: weekKey,
            year,
            weekNumber,
            finalValue: value,
            utilization: value,
            isHistorical: true
          });
        }
      });
    });
    
    // Process Einsatzplan data (forecast)
    databaseData.einsatzplan.forEach((row: any) => {
      if (!row.values) return;
      
      Object.entries(row.values).forEach(([weekKey, value]) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
          const [yearStr, weekStr] = weekKey.split('/');
          const year = parseInt(`20${yearStr}`, 10);
          const weekNumber = parseInt(weekStr, 10);
          
          result.push({
            person: row.person,
            personId: row.personId || row.id,
            name: row.person,
            week: weekKey,
            year,
            weekNumber,
            finalValue: value,
            utilization: value,
            isHistorical: false
          });
        }
      });
    });
    
    return result;
  }, [databaseData]);
  
  console.log('🔑 Auth token status:', token ? 'present' : 'missing');
  const [personName, setPersonName] = useState<string>('');
  const [meta, setMeta] = useState<{ team?: string; cc?: string; lbs?: string; location?: string; startDate?: string } | null>(null);
  const [employeeData, setEmployeeData] = useState<{ email?: string; startDate?: string; location?: string; lbs?: string } | null>(null);
  const [utilization, setUtilization] = useState<number | null>(null);
  const [averageUtilization, setAverageUtilization] = useState<number | null>(null);
  const [isTechSkillsOpen, setTechSkillsOpen] = useState(false);
  const [isSoftSkillsOpen, setSoftSkillsOpen] = useState(false);
  const [isRoleAssignOpen, setRoleAssignOpen] = useState(false);
  // isProjectHistoryModalOpen removed - using ProjectCreationModal for both create and edit
  const [isProjectCreationModalOpen, setProjectCreationModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectHistoryItem | null>(null);
  const [newProjectType, setNewProjectType] = useState<'historical' | 'planned'>('historical');
  
  // Dossier-Daten State
  const [assignedRoles, setAssignedRoles] = useState<any[]>([]);
  const [assignedSkills, setAssignedSkills] = useState<any[]>([]);
  const [assignedSoftSkills, setAssignedSoftSkills] = useState<any[]>([]);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierData, setDossierData] = useState<any>(null);

  // Projekte nach Typen filtern - JETZT AUS UTILIZATION DATA HUB
  const projectsByType: ProjectsByType = React.useMemo(() => {
    // Finde die Person in utilizationData
    const personData = databaseData?.utilizationData?.find(record => 
      record.person === employeeId || record.id === employeeId
    );
    
    const projects = personData?.projectReferences || [];
    console.log('🔍 DEBUG: Raw projects from utilizationData Hub:', projects);
    console.log('🔍 DEBUG: Projects structure:', projects.map(p => ({ 
      id: p.projectId, 
      projectName: p.projectName, 
      projectType: p.projectType,
      customer: p.customer,
      addedAt: p.addedAt
    })));
    
    // Konvertiere projectReferences zu ProjectHistoryItem Format
    const convertedProjects = projects.map(ref => ({
      id: ref.projectId,
      projectName: ref.projectName,
      customer: ref.customer,
      projectType: ref.projectType || 'planned',
      description: ref.description || '',
      startDate: ref.startDate || '',
      endDate: ref.endDate || '',
      duration: ref.duration || '',
      roles: ref.roles || [],
      skills: ref.skills || [],
      activities: ref.activities || []
    }));
    
    const filtered = filterProjectsByType(convertedProjects);
    console.log('🔍 DEBUG: Filtered projects by type from utilizationData:', filtered);
    return filtered;
  }, [databaseData?.utilizationData, employeeId]);

  // Toast-System für Benachrichtigungen
  const { notification, showToast, hideToast } = useProjectToast();
  
  // Editierbare Felder State
  const [formData, setFormData] = useState({
    strengths: '',
    weaknesses: '',
    comments: '',
    email: '',
    phone: '',
    location: '',
    position: '',
    team: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load person data from utilizationData (central hub)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Get person data from UtilizationDataContext
        const personData = personMeta.get(employeeId);
        if (personData && !cancelled) {
          console.log('🔍 UtilizationData person found:', personData);
          console.log('🔍 LBS from utilizationData:', personData.lbs);
          setPersonName(employeeId);
          setMeta({ 
            team: personData.team, 
            cc: personData.cc, 
            lbs: personData.lbs, 
            location: personData.location, 
            startDate: personData.startDate 
          });
          return;
        }
        
        // Fallback: Search by name in personMeta
        for (const [personName, data] of personMeta.entries()) {
          if (personName === employeeId && !cancelled) {
            console.log('🔍 UtilizationData person found by name:', data);
            console.log('🔍 LBS from utilizationData by name:', data.lbs);
            setPersonName(personName);
            setMeta({ 
              team: data.team, 
              cc: data.cc, 
              lbs: data.lbs, 
              location: data.location, 
              startDate: data.startDate 
            });
            return;
          }
        }
        
        // Last resort: use id as name
        if (!cancelled) {
          console.log('🔍 No person data found in utilizationData for:', employeeId);
          setPersonName(employeeId);
          setMeta(null);
        }
      } catch (error) {
        console.error('🔍 Error loading person data from utilizationData:', error);
        if (!cancelled) {
          setPersonName(employeeId);
          setMeta(null);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [employeeId, personMeta]);

  // Employee data is now loaded from utilizationData (no separate mitarbeiter collection needed)
  // All data comes from the central utilizationData hub via personMeta
  useEffect(() => {
    // No longer needed - all employee data comes from utilizationData via personMeta
    // Set employeeData to null since we get everything from meta now
    setEmployeeData(null);
  }, [personName]);

  // Extract skills and roles from utilizationData Hub
  useEffect(() => {
    // Finde die Person in utilizationData
    const personData = databaseData?.utilizationData?.find(record => 
      record.person === employeeId || record.id === employeeId
    );
    
    if (personData) {
      // Lade Skills/Rollen aus utilizationData Hub
      setAssignedSkills(personData.technicalSkills || []);
      setAssignedSoftSkills(personData.softSkills || []);
      setAssignedRoles(personData.assignedRoles || []);
      
      console.log('🎯 Skills/Rollen aus utilizationData Hub geladen:', {
        technicalSkills: personData.technicalSkills?.length || 0,
        softSkills: personData.softSkills?.length || 0,
        assignedRoles: personData.assignedRoles?.length || 0
      });
    } else {
      // Fallback: Lade aus separaten APIs (Legacy)
      console.log('⚠️ Fallback: Lade Skills/Rollen aus separaten APIs');
      // Existing dossier logic als Fallback
      if (dossierData) {
        setAssignedSkills(dossierData.assignedSkills || []);
        setAssignedSoftSkills(dossierData.assignedSoftSkills || []);
        setAssignedRoles(dossierData.assignedRoles || []);
      }
    }
  }, [databaseData?.utilizationData, employeeId, dossierData]);

  // Load employee dossier data (roles, skills, and form data)
  useEffect(() => {
    let cancelled = false;
    const loadDossierData = async () => {
      if (!employeeId || !token) {
        console.log('❌ Missing employeeId or token:', { employeeId, token: token ? 'present' : 'missing' });
        return;
      }
      
      console.log('🔄 Loading dossier data for:', employeeId, 'with token:', token ? 'present' : 'missing');
      console.log('🔍 Effect triggered, cancelled flag reset');
      
      setDossierLoading(true);
      try {
        // Skills/Rollen werden jetzt aus utilizationData Hub geladen (siehe useEffect oben)
        console.log('ℹ️ Skills/Rollen werden aus utilizationData Hub geladen, nicht mehr über separate APIs');
        
        // Load employee dossier data for form fields
        try {
          // ✅ FIX: Konsistente Employee-ID verwenden
          const consistentEmployeeId = employeeId || personName;
          console.log('🔍 DEBUG: Using consistent employeeId for load:', consistentEmployeeId);
          const loadedDossierData = await DatabaseService.getEmployeeDossier(consistentEmployeeId);
          if (loadedDossierData && !cancelled) {
            console.log('📋 Loaded dossier data:', loadedDossierData);
            console.log('🔍 DEBUG: ProjectHistory in loaded data:', loadedDossierData.projectHistory);
            setDossierData(loadedDossierData);
            setFormData({
              strengths: loadedDossierData.strengths || '',
              weaknesses: loadedDossierData.weaknesses || '',
              comments: loadedDossierData.comments || '',
              email: loadedDossierData.email || employeeData?.email || '',
              phone: loadedDossierData.phone || '',
              location: loadedDossierData.location || employeeData?.location || '',
              position: loadedDossierData.position || employeeData?.lbs || '',
              team: loadedDossierData.team || meta?.team || ''
            });
          }
        } catch (dossierError) {
          console.log('📋 No existing dossier data found, using defaults');
          // Initialize with current employee data
          if (!cancelled) {
            setFormData(prev => ({
              ...prev,
              email: employeeData?.email || '',
              location: employeeData?.location || '',
              position: employeeData?.lbs || '',
              team: meta?.team || ''
            }));
          }
        }
        
      } catch (error) {
        console.error('Error loading dossier data:', error);
      } finally {
        if (!cancelled) {
          setDossierLoading(false);
        }
      }
    };
    
    loadDossierData();
    return () => { cancelled = true; };
  }, [employeeId, token]); // Reduzierte Dependencies um Race Conditions zu vermeiden

  // Refresh dossier data function
  const refreshDossierData = async () => {
    if (!employeeId || !token) return;
    
    setDossierLoading(true);
    try {
      // Skills/Rollen werden automatisch über utilizationData Hub aktualisiert
      console.log('ℹ️ Skills/Rollen Refresh erfolgt automatisch über utilizationData Hub');
      
      // Load employee dossier data (includes soft skills)
      try {
        const consistentEmployeeId = employeeId;
        console.log('🔄 Refreshing dossier data for:', consistentEmployeeId);
        const loadedDossierData = await DatabaseService.getEmployeeDossier(consistentEmployeeId);
        if (loadedDossierData) {
          console.log('📋 Refreshed dossier data:', loadedDossierData);
          console.log('🔍 DEBUG: Soft skills in refreshed data:', loadedDossierData.assignedSoftSkills);
          setDossierData(loadedDossierData);
        }
      } catch (dossierError) {
        console.log('📋 Error refreshing dossier data:', dossierError);
      }
      
    } catch (error) {
      console.error('Error refreshing dossier data:', error);
    } finally {
      setDossierLoading(false);
    }
  };

  // Handle form field changes
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save dossier data
  const handleSave = async () => {
    if (!personName && !employeeId) return;
    
    setIsSaving(true);
    try {
      const dossierData = {
        uid: personName || employeeId,
        displayName: employee?.name || '',
        ...formData,
        skills: [], // Wird separat über EmployeeSkillAssignment verwaltet
        experience: 0,
        updatedAt: new Date()
      };
      
      // ✅ FIX: Konsistente Employee-ID verwenden
      const consistentEmployeeId = employeeId || personName;
      console.log('🔍 DEBUG: Using consistent employeeId for dossier save:', consistentEmployeeId);
      await DatabaseService.saveEmployeeDossier(consistentEmployeeId, dossierData);
      console.log('✅ Dossier data saved successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('❌ Error saving dossier data:', error);
      alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
    // Reload original data
    // This will be handled by the useEffect when isEditing changes
  };

  // Project History Handlers
  const handleAddProject = (projectType: 'historical' | 'planned' = 'historical') => {
    setEditingProject(null);
    setNewProjectType(projectType);
    setProjectCreationModalOpen(true);
  };

  const handleAddHistoricalProject = () => handleAddProject('historical');
  const handleAddPlannedProject = () => handleAddProject('planned');

  const handleEditProject = (project: ProjectHistoryItem) => {
    setEditingProject(project);
    setProjectCreationModalOpen(true);  // Use new modal for editing too!
  };

  const handleSaveProject = async (project: ProjectHistoryItem) => {
    console.log('💾 Saving project to utilizationData Hub:', project);
    
    try {
      // Speichere Projekt-Referenz in utilizationData Hub (zentraler Data Hub)
      const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
      const { COLLECTIONS } = await import('../../lib/types');
      
      // Finde utilizationData Eintrag für diese Person
      const utilizationQuery = query(
        collection(db, COLLECTIONS.UTILIZATION_DATA),
        where('person', '==', personName)
      );
      
      const utilizationSnapshot = await getDocs(utilizationQuery);
      
      if (!utilizationSnapshot.empty) {
        const utilizationDoc = utilizationSnapshot.docs[0];
        const currentData = utilizationDoc.data();
        
        // Aktualisiere oder füge Projekt-Referenz hinzu
        const existingProjectRefs = currentData.projectReferences || [];
        const projectRef = {
          projectId: project.id,
          projectName: project.projectName,
          customer: project.customer,
          projectType: project.projectType,
          description: project.description,
          startDate: project.startDate,
          endDate: project.endDate,
          duration: project.duration,
          roles: project.roles,
          skills: project.skills,
          activities: project.activities,
          addedAt: editingProject ? existingProjectRefs.find(ref => ref.projectId === project.id)?.addedAt : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        let updatedProjectRefs;
        if (editingProject) {
          // Update existing project reference
          updatedProjectRefs = existingProjectRefs.map(ref => 
            ref.projectId === project.id ? projectRef : ref
          );
        } else {
          // Add new project reference
          updatedProjectRefs = [...existingProjectRefs, projectRef];
        }
        
        // Speichere in utilizationData (zentraler Hub)
        await updateDoc(doc(db, COLLECTIONS.UTILIZATION_DATA, utilizationDoc.id), {
          projectReferences: updatedProjectRefs,
          updatedAt: new Date().toISOString()
        });
        
        console.log('✅ Project reference saved to utilizationData Hub successfully');
        
        // Show success notification
        const notificationEvent = editingProject ? 'updated' : 'created';
        const toast = createProjectNotification(notificationEvent, project);
        showToast(toast);
        
      } else {
        console.error('❌ No utilizationData entry found for person:', personName);
        showToast({ type: 'error', message: 'Kein Dateneintrag für Person gefunden' });
      }
      
    } catch (error) {
      console.error('❌ Error saving project to utilizationData Hub:', error);
      showToast({ type: 'error', message: 'Fehler beim Speichern des Projekts' });
    }
    
    // Close modal and reset editing state
    setProjectCreationModalOpen(false);
    setEditingProject(null);
  };

  const handleDeleteProject = async (projectId: string) => {
    console.log('🗑️ Deleting project from utilizationData Hub:', projectId);
    
    try {
      // Lösche Projekt-Referenz aus utilizationData Hub
      const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
      const { COLLECTIONS } = await import('../../lib/types');
      
      // Finde utilizationData Eintrag für diese Person
      const utilizationQuery = query(
        collection(db, COLLECTIONS.UTILIZATION_DATA),
        where('person', '==', personName)
      );
      
      const utilizationSnapshot = await getDocs(utilizationQuery);
      
      if (!utilizationSnapshot.empty) {
        const utilizationDoc = utilizationSnapshot.docs[0];
        const currentData = utilizationDoc.data();
        
        // Entferne Projekt-Referenz
        const existingProjectRefs = currentData.projectReferences || [];
        const updatedProjectRefs = existingProjectRefs.filter(ref => ref.projectId !== projectId);
        
        // Speichere in utilizationData (zentraler Hub)
        await updateDoc(doc(db, COLLECTIONS.UTILIZATION_DATA, utilizationDoc.id), {
          projectReferences: updatedProjectRefs,
          updatedAt: new Date().toISOString()
        });
        
        console.log('✅ Project reference deleted from utilizationData Hub successfully');
        
        // Show deletion notification
        const deletedProject = existingProjectRefs.find(ref => ref.projectId === projectId);
        if (deletedProject) {
          const toast = createProjectNotification('deleted', {
            id: deletedProject.projectId,
            projectName: deletedProject.projectName,
            customer: deletedProject.customer,
            projectType: deletedProject.projectType
          } as ProjectHistoryItem);
          showToast(toast);
        }
        
      } else {
        console.error('❌ No utilizationData entry found for person:', personName);
        showToast({ type: 'error', message: 'Kein Dateneintrag für Person gefunden' });
      }
      
    } catch (error) {
      console.error('❌ Error deleting project from utilizationData Hub:', error);
      showToast({ type: 'error', message: 'Fehler beim Löschen des Projekts' });
    }
  };

  // Load simple utilization metric from UtilizationDataContext
  useEffect(() => {
    if (!dataForUI || !Array.isArray(dataForUI) || (!employeeId && !personName)) {
      setUtilization(null);
      setAverageUtilization(null);
      return;
    }

    try {
      const data: any[] = dataForUI;
        if (!Array.isArray(data)) return;
        
        const filtered = data.filter(row => {
          const matchesPersonId = row.personId && row.personId === employeeId;
          const matchesPersonName = personName && (row.person === personName || row.name === personName);
          return matchesPersonId || matchesPersonName;
        });
        if (filtered.length === 0) { 
          setUtilization(null); 
          setAverageUtilization(null);
          return; 
        }
        
        // Calculate planned utilization for rest of year (from Einsatzplan)
        console.log('🔍 Found', filtered.length, 'utilization records for employee');
        
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        
        // Get current week number (ISO week)
        const getWeekNumber = (date: Date): number => {
          const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
          const dayNum = d.getUTCDay() || 7;
          d.setUTCDate(d.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
          return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        };
        
        const currentWeek = getWeekNumber(currentDate);
        
        // Filter for planned utilization (Einsatzplan = forecast data) from current week onwards
        const plannedData = filtered.filter(row => {
          const isForecast = !row.isHistorical; // Einsatzplan data
          const isCurrentYearOrLater = row.year >= currentYear;
          const isCurrentWeekOrLater = row.year > currentYear || (row.year === currentYear && row.weekNumber >= currentWeek);
          const hasValidValue = typeof row.finalValue === 'number' && !isNaN(row.finalValue);
          
          return isForecast && isCurrentYearOrLater && isCurrentWeekOrLater && hasValidValue;
        });
        
        console.log('🔍 Found', plannedData.length, 'planned utilization records for rest of year');
        
        if (plannedData.length > 0) {
          // Calculate average planned utilization
          const totalPlanned = plannedData.reduce((sum, row) => sum + row.finalValue, 0);
          const avgPlanned = totalPlanned / plannedData.length;
          const roundedValue = Math.round(avgPlanned);
          
          console.log('🔍 Calculated planned utilization:', roundedValue, 'from', plannedData.length, 'forecast records');
          setUtilization(roundedValue);
        } else {
          // No valid planned utilization data found
          console.log('🔍 No planned utilization data found for rest of year');
          setUtilization(null);
        }

        // Calculate average utilization from beginning of current year to current week
        // (currentDate and currentYear already defined above)
        
        // Get current week number for average calculation (reusing function)
        const getWeekNumberForAvg = (date: Date): number => {
          const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
          const dayNum = d.getUTCDay() || 7;
          d.setUTCDate(d.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
          return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        };
        
        const currentWeekForAvg = getWeekNumberForAvg(currentDate);
        
        // Calculate average for current year
        
        // Filter data for current year up to current week
        const currentYearData = filtered.filter(row => {
          const isCurrentYear = row.year === currentYear;
          const isValidWeek = row.weekNumber <= currentWeekForAvg;
          const hasValidValue = typeof row.finalValue === 'number' && !isNaN(row.finalValue);
          
          // Filter for current year data
          
          return isCurrentYear && isValidWeek && hasValidValue;
        });
        
        console.log('🔍 Found', currentYearData.length, 'records for current year average');
        
        if (currentYearData.length > 0) {
          const sum = currentYearData.reduce((acc, row) => acc + row.finalValue, 0);
          const average = sum / currentYearData.length;
          const roundedAverage = Math.round(average);
          
          console.log('🔍 Average utilization:', roundedAverage + '%');
          
          setAverageUtilization(roundedAverage);
        } else {
          console.log('🔍 No current year data found, trying fallback...');
          
          // Fallback: Use all available data if no current year data
          const allValidData = filtered.filter(row => 
            typeof row.finalValue === 'number' && !isNaN(row.finalValue)
          );
          
          if (allValidData.length > 0) {
            const sum = allValidData.reduce((acc, row) => acc + row.finalValue, 0);
            const average = sum / allValidData.length;
            const roundedAverage = Math.round(average);
            
            console.log('🔍 Fallback average utilization:', roundedAverage + '%');
            
            setAverageUtilization(roundedAverage);
          } else {
            setAverageUtilization(null);
          }
        }
        
      } catch (error) {
        console.log('🔍 Error processing utilization data:', error);
        setUtilization(null);
        setAverageUtilization(null);
      }
  }, [dataForUI, employeeId, personName]);

  // Debug LBS values from utilizationData
  console.log('🔍 Debug LBS values from utilizationData:', {
    metaLbs: meta?.lbs,
    finalPosition: meta?.lbs || 'LBS nicht verfügbar'
  });

  const employee: Employee | null = personName ? {
    id: employeeId,
    name: personName,
    position: meta?.lbs || 'LBS nicht verfügbar', // All data from utilizationData
    team: meta?.team || '',
    email: '', // Will be added to utilizationData in future
    phone: '', // Removed as requested
    location: meta?.location || '',
    startDate: meta?.startDate || '',
    status: 'active',
    utilization: utilization ?? 0,
    skills: [],
    projects: [],
    performance: { rating: 0, goals: 0, feedback: 0 },
    strengths: [],
    weaknesses: [],
  } : null;
  const [currentStatus, setCurrentStatus] = useState('active');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    projects: true,
    plannedProjects: true,
    projectHistory: true,
    historicalProjects: true,
    skills: true,
    strengths: true
  });
  
  // View-State für Projekt-Ansichten (card oder table)
  const [projectViews, setProjectViews] = useState<Record<string, 'card' | 'table'>>({
    active: 'card',
    planned: 'card',
    historical: 'card'
  });
  if (!employee) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            <span>Mitarbeiter nicht gefunden</span>
          </h2>
          <button onClick={onBack} className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück zur Übersicht</span>
          </button>
        </div>
      </div>;
  }
  const getStatusStyle = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption?.color || 'bg-gray-100 text-gray-800';
  };
  const getStatusLabel = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption?.label || status;
  };
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const renderStars = (rating: number) => {
    return Array.from({
      length: 5
    }, (_, i) => <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />);
  };
  return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-4">
            <button onClick={onBack} className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Zurück</span>
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                <span>Mitarbeiterdetails</span>
              </h1>
              <p className="text-sm text-gray-600">
                <span style={{
                display: "none"
              }}>Vollständige Übersicht und Verwaltung</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" style={{
            display: "none"
          }}>
              <Video className="w-4 h-4" />
              <span>Meeting planen</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" style={{
            display: "none"
          }}>
              <FileText className="w-4 h-4" />
              <span>Notiz hinzufügen</span>
            </button>
            <button onClick={() => setTechSkillsOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Edit3 className="w-4 h-4" />
              <span>Technical Skills</span>
            </button>
            <button onClick={() => setRoleAssignOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              <Edit3 className="w-4 h-4" />
              <span>Rollen</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-8 py-6" style={{
      display: "block",
      height: "auto",
      minHeight: "min-content"
    }}>
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6" style={{
          height: "auto",
          minHeight: "min-content"
        }}>
            
            {/* ========== LINKE SPALTE: Mitarbeiter-Informationen ========== */}
            <div className="lg:col-span-1 xl:col-span-1 2xl:col-span-1 space-y-4">
              
              {/* 👤 Profilbereich */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    {employee.name}
                  </h2>
                  <p className="text-sm text-gray-600 mb-3">
                    {employee.position}
                  </p>
                  <div className="flex items-center justify-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(currentStatus)}`} style={{
                    display: "none"
                  }}>
                      <span>{getStatusLabel(currentStatus)}</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {employee.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{employee.email}</span>
                    </div>
                  )}
                  {employee.location && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{employee.location}</span>
                    </div>
                  )}
                  {employee.startDate && (
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Seit {formatDate(employee.startDate)}</span>
                    </div>
                  )}
                  {employee.team && (
                    <div className="flex items-center space-x-3">
                      <UserPlus className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Team {employee.team}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{
              paddingLeft: "14px",
              paddingRight: "14px",
              paddingTop: "8px",
              paddingBottom: "14px"
            }}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  <span>Performance Übersicht</span>
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Geplante Auslastung</span>
                    </div>
                    <span className="text-lg font-semibold text-blue-600">
                      {utilization !== null ? `${utilization}%` : (personName ? 'Lädt...' : '—')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Ø Auslastung {new Date().getFullYear()}</span>
                    </div>
                    <span className="text-lg font-semibold text-green-600">
                      {averageUtilization !== null ? `${averageUtilization}%` : (personName ? 'Lädt...' : '—')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-700">Bewertung</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {renderStars(Math.floor(employee.performance.rating))}
                      <span className="text-sm text-gray-600 ml-2">{employee.performance.rating}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between" style={{
                  display: "none"
                }}>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Ziele</span>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{employee.performance.goals}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between" style={{
                  display: "none"
                }}>
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">Feedback</span>
                    </div>
                    <span className="text-sm font-semibold text-purple-600">{employee.performance.feedback}%</span>
                  </div>
                </div>
              </div>



              {/* 💪 Stärken & Schwächen - Kompakt & Editierbar */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-green-600" />
                    Stärken & Schwächen
                  </h3>
                  <div className="flex items-center space-x-2">
                    {!isEditing ? (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="Bearbeiten"
                      >
                        <Edit3 className="w-4 h-4" />
                    </button>
                    ) : (
                      <>
                        <button 
                          onClick={handleCancel}
                          disabled={isSaving}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Abbrechen
                        </button>
                        <button 
                          onClick={handleSave}
                          disabled={isSaving}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {isSaving ? 'Speichern...' : 'Speichern'}
                        </button>
                      </>
                    )}
                    <button onClick={() => toggleSection('strengths')} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                      <ChevronDown className={`w-4 h-4 transform transition-transform ${expandedSections.strengths ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
                
                {expandedSections.strengths && (
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <ThumbsUp className="w-3 h-3 text-green-600" />
                        <h4 className="text-xs font-semibold text-green-700">Stärken</h4>
                      </div>
                      {isEditing ? (
                        <textarea
                          value={formData.strengths}
                          onChange={(e) => handleInputChange('strengths', e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="Stärken des Mitarbeiters..."
                        />
                      ) : (
                        <div className="p-2 bg-green-50 rounded border border-green-100 min-h-[40px]">
                          <p className="text-xs text-gray-700 whitespace-pre-wrap">
                            {formData.strengths || 'Keine Stärken erfasst.'}
                                </p>
                              </div>
                      )}
                              </div>

                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <ThumbsDown className="w-3 h-3 text-orange-600" />
                        <h4 className="text-xs font-semibold text-orange-700">Schwächen</h4>
                            </div>
                      {isEditing ? (
                        <textarea
                          value={formData.weaknesses}
                          onChange={(e) => handleInputChange('weaknesses', e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="Entwicklungsbereiche des Mitarbeiters..."
                        />
                      ) : (
                        <div className="p-2 bg-orange-50 rounded border border-orange-100 min-h-[40px]">
                          <p className="text-xs text-gray-700 whitespace-pre-wrap">
                            {formData.weaknesses || 'Keine Schwächen erfasst.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                      </div>
                    </div>

            {/* ========== MITTLERE SPALTE: Projekte & Kommentare ========== */}
            <div className="lg:col-span-1 xl:col-span-2 2xl:col-span-2 space-y-4">
              

              {/* 🎭 Rollen - In mittlere Spalte verschoben */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-600" />
                    Rollen ({assignedRoles.length})
                  </h3>
                  <button 
                    onClick={() => setRoleAssignOpen(true)}
                    className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                  >
                    + Rolle
                  </button>
                </div>
                {dossierLoading ? (
                  <div className="text-xs text-gray-500">Lade Rollen...</div>
                ) : assignedRoles.length === 0 ? (
                  <div className="text-xs text-gray-500 italic">Keine Rollen zugewiesen</div>
                ) : (
                  <div className="space-y-1">
                    {assignedRoles.slice(0, 5).map((role: any) => (
                      <div key={role.id} className="flex items-center justify-between py-1">
                        <div className="flex-1">
                          <span className="text-xs font-medium text-gray-900">{role.roleName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-2.5 h-2.5 ${
                                star <= role.level 
                                  ? 'text-yellow-400 fill-current' 
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    {assignedRoles.length > 5 && (
                      <div className="text-xs text-gray-500 text-center pt-1">
                        +{assignedRoles.length - 5} weitere Rollen
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 🛠️ Technical Skills - In mittlere Spalte verschoben */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Star className="w-4 h-4 text-green-600" />
                    Technical Skills ({assignedSkills.length})
                  </h3>
                  <button 
                    onClick={() => setTechSkillsOpen(true)}
                    className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    + Skill
                  </button>
                </div>
                {dossierLoading ? (
                  <div className="text-xs text-gray-500">Lade Skills...</div>
                ) : assignedSkills.length === 0 ? (
                  <div className="text-xs text-gray-500 italic">Keine Skills zugewiesen</div>
                ) : (
                  <div className="space-y-1">
                    {assignedSkills.slice(0, 5).map((skill: any) => (
                      <div key={skill.id} className="flex items-center justify-between py-1">
                        <div className="flex-1">
                          <span className="text-xs font-medium text-gray-900">{skill.skillName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-2.5 h-2.5 ${
                                star <= skill.level 
                                  ? 'text-yellow-400 fill-current' 
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    {assignedSkills.length > 5 && (
                      <div className="text-xs text-gray-500 text-center pt-1">
                        +{assignedSkills.length - 5} weitere Skills
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 💝 Soft Skills - In mittlere Spalte verschoben */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-600" />
                    Soft Skills ({assignedSoftSkills.length})
                  </h3>
                  <button 
                    onClick={() => setSoftSkillsOpen(true)}
                    className="text-xs px-2 py-1 bg-pink-600 text-white rounded hover:bg-pink-700 transition-colors"
                  >
                    + Skill
                  </button>
                </div>
                {dossierLoading ? (
                  <div className="text-xs text-gray-500">Lade Soft Skills...</div>
                ) : assignedSoftSkills.length === 0 ? (
                  <div className="text-xs text-gray-500 italic">Keine Soft Skills zugewiesen</div>
                ) : (
                  <div className="space-y-1">
                    {assignedSoftSkills.slice(0, 5).map((skill: any) => (
                      <div key={skill.id} className="flex items-center justify-between py-1">
                        <div className="flex-1">
                          <span className="text-xs font-medium text-gray-900">{skill.skillName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-2.5 h-2.5 ${
                                star <= skill.level 
                                  ? 'text-yellow-400 fill-current' 
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    {assignedSoftSkills.length > 5 && (
                      <div className="text-xs text-gray-500 text-center pt-1">
                        +{assignedSoftSkills.length - 5} weitere Soft Skills
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 💬 Kommentare - Bestehende Felder aus UtilizationReportView */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Kommentare</h3>
                </div>
                
                <div className="space-y-6">
                  {/* Auslastungskommentar */}
                    <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Auslastungskommentar</h4>
                    <UtilizationComment
                      personId={employee.name}
                      initialValue=""
                      onLocalChange={() => {}}
                    />
                      </div>
                  
                  {/* Einsatzplan-Kommentar */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Einsatzplan-Kommentar</h4>
                    <PlanningComment
                      personId={employee.name}
                      initialValue=""
                      onLocalChange={() => {}}
                    />
                              </div>
                </div>
              </div>
              



            </div>

            {/* ========== RECHTE SPALTE: Projektvergangenheit ========== */}
            <div className="lg:col-span-1 xl:col-span-1 2xl:col-span-2 space-y-3">
              
              {/* 📜 Projektvergangenheit - Neues Design */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Projektvergangenheit
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {projectsByType.historical.length}
                          </span>
                    
                    {/* View Toggle Buttons */}
                    <div className="flex items-center bg-gray-100 rounded p-0.5">
                      <button
                        onClick={() => setProjectViews(prev => ({ ...prev, historical: 'card' }))}
                        className={`p-1 rounded transition-colors ${
                          projectViews.historical === 'card' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="Kartenansicht"
                      >
                        <Grid3X3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setProjectViews(prev => ({ ...prev, historical: 'table' }))}
                        className={`p-1 rounded transition-colors ${
                          projectViews.historical === 'table' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="Tabellenansicht"
                      >
                        <List className="w-3 h-3" />
                      </button>
                        </div>
                    
                    <button 
                      onClick={handleAddHistoricalProject}
                      className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                      title="Historisches Projekt hinzufügen"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => toggleSection('historicalProjects')} 
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ChevronDown className={`w-3 h-3 transform transition-transform ${expandedSections.historicalProjects ? 'rotate-180' : ''}`} />
                    </button>
                        </div>
              </div>

                {expandedSections.historicalProjects && (
                  <div className="max-h-48 overflow-y-auto">
                    {projectsByType.historical.length > 0 ? (
                      projectViews.historical === 'card' ? (
                        <div className="space-y-2">
                          {projectsByType.historical.map((project: ProjectHistoryItem) => (
                            <CompactProjectCard
                              key={project.id}
                              project={project}
                              type="historical"
                              onEdit={handleEditProject}
                              onDelete={handleDeleteProject}
                            />
                          ))}
                        </div>
                      ) : (
                        <ProjectTable
                          projects={projectsByType.historical}
                          type="historical"
                          onEdit={handleEditProject}
                          onDelete={handleDeleteProject}
                          compact={true}
                        />
                      )
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                        <p className="text-xs">Noch keine Projekte erfasst</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 🚀 Aktive Projekte - In rechte Spalte verschoben */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-green-600" />
                    Aktive Projekte
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {projectsByType.active.length}
                    </span>
                    
                    {/* View Toggle Buttons */}
                    <div className="flex items-center bg-gray-100 rounded p-0.5">
                      <button
                        onClick={() => setProjectViews(prev => ({ ...prev, active: 'card' }))}
                        className={`p-1 rounded transition-colors ${
                          projectViews.active === 'card' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="Kartenansicht"
                      >
                        <Grid3X3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setProjectViews(prev => ({ ...prev, active: 'table' }))}
                        className={`p-1 rounded transition-colors ${
                          projectViews.active === 'table' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="Tabellenansicht"
                      >
                        <List className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => toggleSection('projects')} 
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ChevronDown className={`w-3 h-3 transform transition-transform ${expandedSections.projects ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
                
                {expandedSections.projects && (
                  <div className="max-h-48 overflow-y-auto">
                    {projectsByType.active.length > 0 ? (
                      projectViews.active === 'card' ? (
                        <div className="space-y-2">
                          {projectsByType.active.map(project => (
                            <CompactProjectCard
                              key={project.id}
                              project={project}
                              type="active"
                              onEdit={handleEditProject}
                              onDelete={handleDeleteProject}
                            />
                          ))}
                        </div>
                      ) : (
                        <ProjectTable
                          projects={projectsByType.active}
                          type="active"
                          onEdit={handleEditProject}
                          onDelete={handleDeleteProject}
                          compact={true}
                        />
                      )
                    ) : (
                      <div className="p-3 text-center text-gray-500 text-xs">
                        Keine aktiven Projekte
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 📅 Geplante Projekte - In rechte Spalte verschoben */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Geplante Projekte
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {projectsByType.planned.length}
                    </span>
                    
                    {/* View Toggle Buttons */}
                    <div className="flex items-center bg-gray-100 rounded p-0.5">
                      <button
                        onClick={() => setProjectViews(prev => ({ ...prev, planned: 'card' }))}
                        className={`p-1 rounded transition-colors ${
                          projectViews.planned === 'card' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="Kartenansicht"
                      >
                        <Grid3X3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setProjectViews(prev => ({ ...prev, planned: 'table' }))}
                        className={`p-1 rounded transition-colors ${
                          projectViews.planned === 'table' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="Tabellenansicht"
                      >
                        <List className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <button 
                      onClick={handleAddPlannedProject}
                      className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                      title="Geplantes Projekt hinzufügen"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => toggleSection('plannedProjects')} 
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ChevronDown className={`w-3 h-3 transform transition-transform ${expandedSections.plannedProjects ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
                
                {expandedSections.plannedProjects && (
                  <div className="max-h-48 overflow-y-auto">
                    {projectsByType.planned.length > 0 ? (
                      projectViews.planned === 'card' ? (
                        <div className="space-y-2">
                          {projectsByType.planned.map(project => (
                            <CompactProjectCard
                              key={project.id}
                              project={project}
                              type="planned"
                              onEdit={handleEditProject}
                              onDelete={handleDeleteProject}
                            />
                          ))}
                        </div>
                      ) : (
                        <ProjectTable
                          projects={projectsByType.planned}
                          type="planned"
                          onEdit={handleEditProject}
                          onDelete={handleDeleteProject}
                          compact={true}
                        />
                      )
                    ) : (
                      <div className="p-3 text-center text-gray-500 text-xs">
                        Keine geplanten Projekte
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </main>
      {/* Modals */}
      <TechnicalSkillSelectionModal
        isOpen={isTechSkillsOpen}
        onClose={() => setTechSkillsOpen(false)}
        employeeId={employeeId}
        employeeName={employee.name}
        onSkillAssigned={refreshDossierData}
      />
      <SoftSkillSelectionModal
        isOpen={isSoftSkillsOpen}
        onClose={() => setSoftSkillsOpen(false)}
        employeeId={employeeId}
        employeeName={employee.name}
        onSkillAssigned={refreshDossierData}
      />
      <RoleSelectionModal
        isOpen={isRoleAssignOpen}
        onClose={() => setRoleAssignOpen(false)}
        employeeId={employeeId}
        employeeName={employee.name}
        onRoleAssigned={refreshDossierData}
      />

      {/* ProjectHistoryEditorModal removed - using ProjectCreationModal for both create and edit */}

      <ProjectCreationModal
        isOpen={isProjectCreationModalOpen}
        onClose={() => {
          setProjectCreationModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        employeeId={employeeId}
        employeeName={employee?.name || personName || 'Unknown'}
        project={editingProject || undefined}
      />

      {/* Toast Notifications */}
      <ProjectToast
        notification={notification}
        onClose={hideToast}
      />
    </div>;
}