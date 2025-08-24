"use client";

import React, { useEffect, useState } from 'react';
import { ArrowLeft, User, Mail, MapPin, Calendar, Clock, Star, TrendingUp, MessageSquare, Edit3, Video, UserPlus, FileText, ChevronDown, Activity, Award, Target, Edit, Trash2, Plus, ThumbsUp, ThumbsDown } from 'lucide-react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAssignments } from '../../contexts/AssignmentsContext';
import { useAuth } from '../../contexts/AuthContext';
import DatabaseService from '../../services/database';
import TechnicalSkillSelectionModal from './TechnicalSkillSelectionModal';
import RoleSelectionModal from './RoleSelectionModal';
import { ProjectHistoryList } from './ProjectHistoryList';
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
  
  const { getAssignmentsForEmployee } = useAssignments();
  const { token } = useAuth();
  
  console.log('🔑 Auth token status:', token ? 'present' : 'missing');
  const [personName, setPersonName] = useState<string>('');
  const [meta, setMeta] = useState<{ team?: string; cc?: string; lbs?: string; location?: string; startDate?: string } | null>(null);
  const [employeeData, setEmployeeData] = useState<{ email?: string; startDate?: string; location?: string; lbs?: string } | null>(null);
  const [utilization, setUtilization] = useState<number | null>(null);
  const [isTechSkillsOpen, setTechSkillsOpen] = useState(false);
  const [isRoleAssignOpen, setRoleAssignOpen] = useState(false);
  
  // Dossier-Daten State
  const [assignedRoles, setAssignedRoles] = useState<any[]>([]);
  const [assignedSkills, setAssignedSkills] = useState<any[]>([]);
  const [dossierLoading, setDossierLoading] = useState(false);

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

  // Load employee dossier data (roles and skills)
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
  }, [employeeId, token]);

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

  // Load simple utilization metric (best-effort)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data: any[] = await DatabaseService.getUtilizationData();
        if (cancelled || !Array.isArray(data)) return;
        const filtered = data.filter(row => (row.personId && row.personId === employeeId) || (personName && row.person === personName));
        if (filtered.length === 0) { setUtilization(null); return; }
        // Pick latest by year/weekNumber
        const latest = filtered.sort((a,b)=> (a.year - b.year) || (a.weekNumber - b.weekNumber)).pop();
        if (latest && typeof latest.finalValue === 'number') setUtilization(Math.round(latest.finalValue)); else setUtilization(null);
      } catch {
        if (!cancelled) setUtilization(null);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [employeeId, personName]);

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
    skills: true,
    assignments: true,
    strengths: true
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
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
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
      <main className="px-6 py-8" style={{
      paddingTop: "24px",
      paddingBottom: "24px",
      paddingRight: "24px",
      display: "block",
      alignItems: "center",
      height: "auto",
      minHeight: "min-content"
    }}>
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" style={{
          columnGap: "24px",
          rowGap: "24px",
          height: "auto",
          minHeight: "min-content"
        }}>
            
            {/* Left Column - Profile & Status */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Profile Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{
              paddingLeft: "14px",
              paddingRight: "14px",
              paddingTop: "8px",
              paddingBottom: "14px"
            }}>
                <div className="text-center mb-6" style={{
                marginBottom: "12px"
              }}>
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                  display: "none"
                }}>
                    <User className="w-12 h-12 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">
                    <span>{employee.name}</span>
                  </h2>
                  <p className="text-gray-600 mb-3">
                    <span>{employee.position}</span>
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
                      <span className="text-sm font-medium text-gray-700">Auslastung</span>
                    </div>
                    <span className="text-lg font-semibold text-blue-600">{utilization !== null ? `${utilization}%` : '—'}</span>
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
                      <Target className="w-4 h-4 text-green-600" />
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

              {/* Skills */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{
              paddingLeft: "14px",
              paddingRight: "14px",
              paddingTop: "8px",
              paddingBottom: "14px",
              height: "auto",
              minHeight: "min-content"
            }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    <span>Fähigkeiten</span>
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Fähigkeit hinzufügen">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleSection('skills')} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                      <ChevronDown className={`w-4 h-4 transform transition-transform ${expandedSections.skills ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
                
                {expandedSections.skills && <div className="space-y-4">
                    {employee.skills.map((skill, index) => <div key={index} className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded-lg transition-colors">
                        <span className="text-sm font-medium text-gray-700">
                          <span>{skill.name}</span>
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            {renderStars(skill.rating)}
                          </div>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Bearbeiten">
                              <Edit className="w-3 h-3" />
                            </button>
                            <button className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Löschen">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>)}
                  </div>}
              </div>

              {/* Assigned Roles and Technical Skills */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Zugewiesene Rollen & Skills
                  </h3>
                  <button onClick={() => toggleSection('assignments')} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <ChevronDown className={`w-4 h-4 transform transition-transform ${expandedSections.assignments ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                
                {expandedSections.assignments && (
                  <div className="space-y-6">
                    {/* Assigned Roles */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Award className="w-4 h-4 text-purple-600" />
                        <h4 className="text-sm font-semibold text-purple-700">
                          Zugewiesene Rollen ({assignedRoles.length})
                        </h4>
                      </div>
                      {dossierLoading ? (
                        <div className="text-sm text-gray-500">Lade Rollen...</div>
                      ) : assignedRoles.length === 0 ? (
                        <div className="text-sm text-gray-500 italic">Keine Rollen zugewiesen</div>
                      ) : (
                        <div className="space-y-2">
                          {assignedRoles.map((role: any) => (
                            <div key={role.id} className="group hover:bg-purple-50 p-3 rounded-lg transition-colors border border-purple-100">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="text-sm font-medium text-gray-900 mb-1">
                                    {role.roleName}
                                  </h5>
                                  <div className="flex items-center space-x-2">
                                    <div className="flex items-center space-x-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`w-3 h-3 ${
                                            star <= role.level 
                                              ? 'text-yellow-400 fill-current' 
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs text-gray-500">Level {role.level}</span>
                                  </div>
                                  {role.assignedAt && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Zugewiesen: {new Date(role.assignedAt.seconds * 1000).toLocaleDateString('de-DE')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assigned Technical Skills */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Star className="w-4 h-4 text-green-600" />
                        <h4 className="text-sm font-semibold text-green-700">
                          Technical Skills ({assignedSkills.length})
                        </h4>
                      </div>
                      {dossierLoading ? (
                        <div className="text-sm text-gray-500">Lade Skills...</div>
                      ) : assignedSkills.length === 0 ? (
                        <div className="text-sm text-gray-500 italic">Keine Technical Skills zugewiesen</div>
                      ) : (
                        <div className="space-y-2">
                          {assignedSkills.map((skill: any) => (
                            <div key={skill.id} className="group hover:bg-green-50 p-3 rounded-lg transition-colors border border-green-100">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="text-sm font-medium text-gray-900 mb-1">
                                    {skill.skillName}
                                  </h5>
                                  <div className="flex items-center space-x-2">
                                    <div className="flex items-center space-x-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`w-3 h-3 ${
                                            star <= skill.level 
                                              ? 'text-yellow-400 fill-current' 
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs text-gray-500">Level {skill.level}</span>
                                  </div>
                                  {skill.assignedAt && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Zugewiesen: {new Date(skill.assignedAt.seconds * 1000).toLocaleDateString('de-DE')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Strengths and Weaknesses */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{
              paddingLeft: "14px",
              paddingRight: "14px",
              paddingTop: "8px",
              paddingBottom: "14px",
              height: "auto",
              minHeight: "min-content"
            }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    <span>Stärken und Schwächen</span>
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Stärke/Schwäche hinzufügen">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleSection('strengths')} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                      <ChevronDown className={`w-4 h-4 transform transition-transform ${expandedSections.strengths ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
                
                {expandedSections.strengths && <div className="space-y-6">
                    {/* Strengths Section */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <ThumbsUp className="w-4 h-4 text-green-600" />
                        <h4 className="text-sm font-semibold text-green-700">
                          <span>Stärken</span>
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {employee.strengths?.map(strength => <div key={strength.id} className="group hover:bg-green-50 p-3 rounded-lg transition-colors border border-green-100">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="text-sm font-medium text-gray-900 mb-1">
                                  <span>{strength.name}</span>
                                </h5>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                  <span>{strength.description}</span>
                                </p>
                              </div>
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <button className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Bearbeiten">
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Löschen">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>)}
                      </div>
                    </div>

                    {/* Weaknesses Section */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <ThumbsDown className="w-4 h-4 text-orange-600" />
                        <h4 className="text-sm font-semibold text-orange-700">
                          <span>Schwächen</span>
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {employee.weaknesses?.map(weakness => <div key={weakness.id} className="group hover:bg-orange-50 p-3 rounded-lg transition-colors border border-orange-100">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="text-sm font-medium text-gray-900 mb-1">
                                  <span>{weakness.name}</span>
                                </h5>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                  <span>{weakness.description}</span>
                                </p>
                              </div>
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <button className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Bearbeiten">
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Löschen">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>)}
                      </div>
                    </div>
                  </div>}
              </div>
            </div>

            {/* Middle Column - Projects & Project Roles */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Current Projects */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{
              paddingTop: "8px",
              paddingLeft: "14px",
              paddingRight: "14px",
              paddingBottom: "14px"
            }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    <span>Aktuelle Projekte</span>
                  </h3>
                  <button onClick={() => toggleSection('projects')} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <ChevronDown className={`w-4 h-4 transform transition-transform ${expandedSections.projects ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                
                {expandedSections.projects && <div className="space-y-4">
                    {employee.projects.map((project, index) => <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200" style={{
                  paddingTop: "1px"
                }}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              <span>{project.name}</span>
                            </h4>
                            <p className="text-sm text-gray-600">
                              <span>{project.role}</span>
                            </p>
                          </div>
                          <span className="text-sm font-medium text-blue-600">
                            <span>{project.progress}%</span>
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{
                      width: `${project.progress}%`
                    }} />
                        </div>
                      </div>)}
                  </div>}
              </div>

              {/* Role Selection integrated via header buttons */}
            </div>

            {/* Right Column - Activity Timeline & Project History */}
            <div className="lg:col-span-1 space-y-6" style={{
            height: "auto",
            minHeight: "min-content"
          }}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{
              display: "none"
            }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    <span>Aktivitäten Timeline</span>
                  </h3>
                  <button onClick={() => toggleSection('activities')} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <ChevronDown className={`w-4 h-4 transform transition-transform ${expandedSections.activities ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                
                {expandedSections.activities && <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {employee.activities.map((activity, index) => <div key={index} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-b-0">
                        <div className="flex-shrink-0 mt-1">
                          {activity.type === 'status' && <Activity className="w-4 h-4 text-blue-600" />}
                          {activity.type === 'project' && <Target className="w-4 h-4 text-green-600" />}
                          {activity.type === 'meeting' && <Video className="w-4 h-4 text-purple-600" />}
                          {activity.type === 'comment' && <MessageSquare className="w-4 h-4 text-gray-600" />}
                          {activity.type === 'feedback' && <Award className="w-4 h-4 text-yellow-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            <span>{activity.description}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            <span>{formatTimestamp(activity.timestamp)}</span>
                          </p>
                        </div>
                      </div>)}
                  </div>}
              </div>

              {/* Project History (local, placeholder without persistence) */}
              <ProjectHistoryList projects={[]} onChange={() => {}} />
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
    </div>;
}