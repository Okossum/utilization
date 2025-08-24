"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, User, Mail, MapPin, Calendar, Clock, Star, TrendingUp, MessageSquare, Edit3, Video, UserPlus, FileText, ChevronDown, Activity, Award, Edit, Trash2, Plus, ThumbsUp, ThumbsDown, Briefcase, Building, Pencil, Grid3X3, List, BarChart3 } from 'lucide-react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

import { useAuth } from '../../contexts/AuthContext';
import DatabaseService from '../../services/database';
import { useUtilizationData } from '../../contexts/UtilizationDataContext';
import TechnicalSkillSelectionModal from './TechnicalSkillSelectionModal';
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
  activities: Array<{
    type: string;
    description: string;
    timestamp: string;
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
  console.log('🏗️ EmployeeDetailView rendered with:', { employeeId });
  

  const { token } = useAuth();
  const { databaseData } = useUtilizationData();
  
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
  const [isRoleAssignOpen, setRoleAssignOpen] = useState(false);
  // isProjectHistoryModalOpen removed - using ProjectCreationModal for both create and edit
  const [isProjectCreationModalOpen, setProjectCreationModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectHistoryItem | null>(null);
  const [newProjectType, setNewProjectType] = useState<'historical' | 'planned'>('historical');
  
  // Dossier-Daten State
  const [assignedRoles, setAssignedRoles] = useState<any[]>([]);
  const [assignedSkills, setAssignedSkills] = useState<any[]>([]);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierData, setDossierData] = useState<any>(null);

  // Projekte nach Typen filtern
  const projectsByType: ProjectsByType = React.useMemo(() => {
    const projects = dossierData?.projectHistory || [];
    console.log('🔍 DEBUG: Raw projects from dossierData:', projects);
    console.log('🔍 DEBUG: Projects structure:', projects.map(p => ({ 
      id: p.id, 
      projectName: p.projectName, 
      projectType: p.projectType,
      startDate: p.startDate,
      endDate: p.endDate,
      duration: p.duration
    })));
    const filtered = filterProjectsByType(projects);
    console.log('🔍 DEBUG: Filtered projects by type:', filtered);
    return filtered;
  }, [dossierData?.projectHistory]);

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

  // Resolve personName and meta from Firestore einsatzplan by personId, with safe fallbacks
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Try personId match
        const q1 = query(collection(db, 'einsatzplan'), where('personId', '==', employeeId), limit(1));
        const s1 = await getDocs(q1);
        if (!cancelled && !s1.empty) {
          const doc = s1.docs[0];
          const d: any = doc.data();
          setPersonName(String(d.person || ''));
          setMeta({ team: d.team, cc: d.cc, lbs: d.lbs, location: d.location, startDate: d.startDate });
          return;
        }
        // Fallback: person equals employeeId (legacy name-based)
        const q2 = query(collection(db, 'einsatzplan'), where('person', '==', employeeId), limit(1));
        const s2 = await getDocs(q2);
        if (!cancelled && !s2.empty) {
          const doc = s2.docs[0];
          const d: any = doc.data();
          setPersonName(String(d.person || ''));
          setMeta({ team: d.team, cc: d.cc, lbs: d.lbs, location: d.location, startDate: d.startDate });
          return;
        }
        // Last resort: use id as name
        if (!cancelled) {
          setPersonName(employeeId);
          setMeta(null);
        }
      } catch {
        if (!cancelled) {
          setPersonName(employeeId);
          setMeta(null);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [employeeId]);

  // Load employee data from mitarbeiter collection
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!personName) return; // Wait for personName to be resolved first
      
      try {
        const employees = await DatabaseService.getEmployeeStammdaten();
        if (cancelled || !Array.isArray(employees)) return;
        
        console.log('🔍 Loading employee data for:', { employeeId, personName });
        console.log('📋 Available employees:', employees.length);
        
        // Debug: Show all employee names for comparison
        console.log('👥 All employee names in mitarbeiter collection:');
        employees.forEach((emp, index) => {
          if (index < 10) { // Show first 10 for debugging
            console.log(`  ${index + 1}. Name: "${emp.name}" | DisplayName: "${emp.displayName}" | PersonId: "${emp.personId}" | Id: "${emp.id}"`);
          }
        });
        
        // Try multiple matching strategies
        let employeeRecord = null;
        
        // Strategy 1: Match by personId
        if (employeeId) {
          employeeRecord = employees.find(emp => 
            emp.personId === employeeId || emp.id === employeeId
          );
          if (employeeRecord) console.log('✅ Found by personId:', employeeRecord);
        }
        
        // Strategy 2: Match by name (exact)
        if (!employeeRecord && personName) {
          employeeRecord = employees.find(emp => 
            emp.name === personName || emp.displayName === personName
          );
          if (employeeRecord) console.log('✅ Found by name (exact):', employeeRecord);
        }
        
        // Strategy 3: Match by name (case insensitive)
        if (!employeeRecord && personName) {
          employeeRecord = employees.find(emp => 
            (emp.name && emp.name.toLowerCase() === personName.toLowerCase()) ||
            (emp.displayName && emp.displayName.toLowerCase() === personName.toLowerCase())
          );
          if (employeeRecord) console.log('✅ Found by name (case insensitive):', employeeRecord);
        }
        
        // Strategy 4: Match by name format conversion (Vorname Nachname <-> Nachname, Vorname)
        if (!employeeRecord && personName) {
          const normalizeAndSplit = (name: string) => {
            return name.toLowerCase().replace(/[,\s]+/g, ' ').trim().split(' ').filter(Boolean);
          };
          
          const searchParts = normalizeAndSplit(personName);
          console.log('🔍 Search name parts:', searchParts);
          
          employeeRecord = employees.find(emp => {
            const empName = emp.name || emp.displayName || '';
            const empParts = normalizeAndSplit(empName);
            
            // Check if all parts of search name are in employee name (in any order)
            const allPartsMatch = searchParts.every(part => 
              empParts.some(empPart => empPart.includes(part) || part.includes(empPart))
            );
            
            // Also check reverse: all parts of employee name are in search name
            const allEmpPartsMatch = empParts.every(empPart => 
              searchParts.some(part => part.includes(empPart) || empPart.includes(part))
            );
            
            return allPartsMatch && allEmpPartsMatch && searchParts.length >= 2 && empParts.length >= 2;
          });
          
          if (employeeRecord) console.log('✅ Found by name format conversion:', employeeRecord);
        }
        
        // Strategy 5: Match by partial name (fallback)
        if (!employeeRecord && personName) {
          employeeRecord = employees.find(emp => 
            (emp.name && emp.name.toLowerCase().includes(personName.toLowerCase())) ||
            (emp.displayName && emp.displayName.toLowerCase().includes(personName.toLowerCase())) ||
            (personName.toLowerCase().includes((emp.name || '').toLowerCase())) ||
            (personName.toLowerCase().includes((emp.displayName || '').toLowerCase()))
          );
          if (employeeRecord) console.log('✅ Found by partial name:', employeeRecord);
        }
        
        if (employeeRecord && !cancelled) {
          console.log('📊 Employee record found:', employeeRecord);
          setEmployeeData({
            email: employeeRecord.email || employeeRecord.mail || employeeRecord.e_mail || '',
            startDate: employeeRecord.startDate || employeeRecord.eintrittsdatum || employeeRecord.start_date || '',
            location: employeeRecord.location || employeeRecord.standort || employeeRecord.ort || employeeRecord.office || '',
            lbs: employeeRecord.lbs || employeeRecord.careerLevel || employeeRecord.career_level || ''
          });
        } else {
          console.log('❌ No employee record found for:', { employeeId, personName });
          console.log('📋 Sample employee records:', employees.slice(0, 3));
          if (!cancelled) setEmployeeData(null);
        }
      } catch (error) {
        console.error('❌ Error loading employee data:', error);
        if (!cancelled) setEmployeeData(null);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [employeeId, personName]);

  // Load employee dossier data (roles, skills, and form data)
  useEffect(() => {
    let cancelled = false;
    const loadDossierData = async () => {
      if (!employeeId || !token) {
        console.log('❌ Missing employeeId or token:', { employeeId, token: token ? 'present' : 'missing' });
        return;
      }
      
      console.log('🔄 Loading dossier data for:', employeeId, 'with token:', token ? 'present' : 'missing');
      
      setDossierLoading(true);
      try {
        // Load assigned roles
        const rolesResponse = await fetch(`/api/employee-roles/${employeeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (rolesResponse.ok && !cancelled) {
          const rolesData = await rolesResponse.json();
          console.log('🎭 Loaded assigned roles:', rolesData);
          setAssignedRoles(rolesData);
        } else {
          console.error('❌ Failed to load roles:', rolesResponse.status, rolesResponse.statusText);
        }
        
        // Load assigned technical skills
        const skillsResponse = await fetch(`/api/employee-technical-skills/${employeeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (skillsResponse.ok && !cancelled) {
          const skillsData = await skillsResponse.json();
          console.log('🛠️ Loaded assigned skills:', skillsData);
          setAssignedSkills(skillsData);
        } else {
          console.error('❌ Failed to load skills:', skillsResponse.status, skillsResponse.statusText);
        }
        
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
  }, [employeeId, token, personName, employeeData, meta]);

  // Refresh dossier data function
  const refreshDossierData = async () => {
    if (!employeeId || !token) return;
    
    setDossierLoading(true);
    try {
      // Load assigned roles
      const rolesResponse = await fetch(`/api/employee-roles/${employeeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        setAssignedRoles(rolesData);
      }
      
      // Load assigned technical skills
      const skillsResponse = await fetch(`/api/employee-technical-skills/${employeeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (skillsResponse.ok) {
        const skillsData = await skillsResponse.json();
        setAssignedSkills(skillsData);
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
    console.log('💾 Saving project:', project);
    console.log('🔍 DEBUG: Project structure being saved:', {
      id: project.id,
      projectName: project.projectName,
      projectType: project.projectType,
      startDate: project.startDate,
      endDate: project.endDate,
      duration: project.duration,
      customer: project.customer,
      roles: project.roles,
      skills: project.skills
    });
    
    // Update dossier data with new/updated project
    const currentProjects = dossierData?.projectHistory || [];
    let updatedProjects;
    
    if (editingProject) {
      // Update existing project
      updatedProjects = currentProjects.map((p: ProjectHistoryItem) => 
        p.id === project.id ? project : p
      );
    } else {
      // Add new project
      updatedProjects = [...currentProjects, project];
    }
    
    // Update local state
    setDossierData(prev => ({
      ...prev,
      projectHistory: updatedProjects
    }));
    
    // Save to database
    try {
      const updatedDossierData = {
        ...dossierData,
        projectHistory: updatedProjects,
        updatedAt: new Date()
      };
      
      // ✅ FIX: Konsistente Employee-ID verwenden
      const consistentEmployeeId = employeeId || personName;
      console.log('🔍 DEBUG: Using consistent employeeId for save:', consistentEmployeeId);
      await DatabaseService.saveEmployeeDossier(consistentEmployeeId, updatedDossierData);
      console.log('✅ Project history saved to database successfully');
      
      // Show success notification
      const wasUpgraded = project.projectType === 'active' && 
                         editingProject && 
                         editingProject.projectType === 'planned';
      
      const notificationEvent = wasUpgraded ? 'upgraded' : 
                               editingProject ? 'updated' : 'created';
      
      const toast = createProjectNotification(notificationEvent, project);
      showToast(toast);
    } catch (error) {
      console.error('❌ Error saving project history:', error);
      // TODO: Show error toast to user
    }
    
    console.log('📋 Updated project history:', updatedProjects);
    
    // Close modal and reset editing state
    setProjectCreationModalOpen(false);
    setEditingProject(null);
  };

  const handleDeleteProject = async (projectId: string) => {
    console.log('🗑️ Deleting project:', projectId);
    
    const currentProjects = dossierData?.projectHistory || [];
    const updatedProjects = currentProjects.filter((p: ProjectHistoryItem) => p.id !== projectId);
    
    // Update local state
    setDossierData(prev => ({
      ...prev,
      projectHistory: updatedProjects
    }));
    
    // Save to database
    try {
      const updatedDossierData = {
        ...dossierData,
        projectHistory: updatedProjects,
        updatedAt: new Date()
      };
      
      // ✅ FIX: Konsistente Employee-ID verwenden
      const consistentEmployeeId = employeeId || personName;
      console.log('🔍 DEBUG: Using consistent employeeId for delete:', consistentEmployeeId);
      await DatabaseService.saveEmployeeDossier(consistentEmployeeId, updatedDossierData);
      console.log('✅ Project history deletion saved to database successfully');
      
      // Show deletion notification
      const deletedProject = currentProjects.find((p: ProjectHistoryItem) => p.id === projectId);
      if (deletedProject) {
        const toast = createProjectNotification('deleted', deletedProject);
        showToast(toast);
      }
    } catch (error) {
      console.error('❌ Error saving project history deletion:', error);
      // TODO: Show error toast to user
    }
    
    console.log('📋 Updated project history after delete:', updatedProjects);
    
    setProjectCreationModalOpen(false);
    setEditingProject(null);
  };

  // Load simple utilization metric from UtilizationDataContext
  useEffect(() => {
    console.log('🔍 Utilization useEffect triggered:', {
      dataForUI: dataForUI ? 'present' : 'missing',
      isArray: Array.isArray(dataForUI),
      length: Array.isArray(dataForUI) ? dataForUI.length : 'N/A',
      employeeId,
      personName
    });

    if (!dataForUI || !Array.isArray(dataForUI) || (!employeeId && !personName)) {
      console.log('🔍 Early return - missing data or identifiers');
      setUtilization(null);
      setAverageUtilization(null);
      return;
    }

    try {
      const data: any[] = dataForUI;
        if (!Array.isArray(data)) return;
        
        console.log('🔍 Using UtilizationDataContext data:', {
          totalRecords: data.length,
          employeeId,
          personName,
          sampleRecord: data[0],
          dataStructure: data.slice(0, 2).map(row => ({
            person: row.person,
            personId: row.personId,
            name: row.name,
            finalValue: row.finalValue,
            year: row.year,
            weekNumber: row.weekNumber,
            keys: Object.keys(row)
          }))
        });
        
        const filtered = data.filter(row => {
          const matchesPersonId = row.personId && row.personId === employeeId;
          const matchesPersonName = personName && (row.person === personName || row.name === personName);
          const matches = matchesPersonId || matchesPersonName;
          
          if (matches) {
            console.log('🔍 Found matching utilization row:', {
              person: row.person,
              name: row.name,
              personId: row.personId,
              finalValue: row.finalValue,
              year: row.year,
              weekNumber: row.weekNumber,
              matchedBy: matchesPersonId ? 'personId' : 'personName'
            });
          }
          
          return matches;
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

  const employee: Employee | null = personName ? {
    id: employeeId,
    name: personName,
    position: employeeData?.lbs || meta?.lbs || '', // Prefer mitarbeiter collection LBS
    team: meta?.team || '',
    email: employeeData?.email || '',
    phone: '', // Removed as requested
    location: employeeData?.location || meta?.location || '',
    startDate: employeeData?.startDate || meta?.startDate || '',
    status: 'active',
    utilization: utilization ?? 0,
    skills: [],
    projects: [],
    activities: [],
    performance: { rating: 0, goals: 0, feedback: 0 },
    strengths: [],
    weaknesses: [],
  } : null;
  const [currentStatus, setCurrentStatus] = useState('active');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    activities: true,
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

                            {/* 🛠️ Technical Skills - Kompakt */}
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
              
              {/* 🎭 Rollen - Kompakt */}
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
              
              {/* 🚀 Aktive Projekte - Neues System */}
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

              {/* 📅 Geplante Projekte - Neues System */}
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


              {/* 📊 Aktivitäten Timeline - Kompakt */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-600" />
                    Aktivitäten
                  </h3>
                  <button onClick={() => toggleSection('activities')} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <ChevronDown className={`w-3 h-3 transform transition-transform ${expandedSections.activities ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                
                {expandedSections.activities && (
                  <div className="space-y-2 max-h-[150px] overflow-y-auto">
                    <div className="flex items-start space-x-2 py-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-900">Projekt "E-Commerce" abgeschlossen</p>
                        <p className="text-xs text-gray-500">vor 2 Tagen</p>
                        </div>
                        </div>
                    
                    <div className="flex items-start space-x-2 py-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-900">Skill "React Advanced" hinzugefügt</p>
                        <p className="text-xs text-gray-500">vor 1 Woche</p>
                      </div>
              </div>

                    <div className="flex items-start space-x-2 py-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-900">Rolle "Senior Developer" zugewiesen</p>
                        <p className="text-xs text-gray-500">vor 2 Wochen</p>
                      </div>
                    </div>
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