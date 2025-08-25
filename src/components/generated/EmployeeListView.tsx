import React, { useState, useEffect } from 'react';
import { Search, Filter, Users, Upload, UserCheck, UserX, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmployeeCard } from './EmployeeCard';


// DatabaseService removed - using direct Firebase calls
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { useAssignments } from '../../contexts/AssignmentsContext';
import { MultiSelectFilter } from './MultiSelectFilter';
import { useAuth } from '../../contexts/AuthContext';
import { useUtilizationData } from '../../contexts/UtilizationDataContext';

// Type definitions für Skills und Rollen (aus utilizationData)
interface AssignedRole {
  id: string;
  roleId: string;
  roleName: string;
  assignedAt?: string;
}

interface TechnicalSkill {
  id: string;
  skillId: string;
  skillName: string;
  rating: number;
}

interface SoftSkill {
  id: string;
  skillId: string;
  skillName: string;
  rating: number;
}

// ✅ KORRIGIERT: Props für Action-Items aus der Auslastungs-Übersicht
interface EmployeeListViewProps {
  actionItems: Record<string, { actionItem: boolean; source: 'manual' | 'rule' | 'default'; updatedBy?: string }>;
  onOpenEmployeeDetail?: (personId: string) => void;
}
// Skill Interface für EmployeeCard Kompatibilität
interface Skill {
  id: string;
  name: string;
  rating: number;
}

// Project Interface für EmployeeCard Kompatibilität
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
}

// Employee Interface kompatibel mit EmployeeCard
interface Employee {
  id: string;
  name: string;                   // Mapping von person -> name
  lbs: string;                    // Karrierestufe (wird als Untertitel angezeigt)
  cc: string;                     // Competence Center
  team: string;
  role: string;                   // Hauptrolle (erste assignedRole oder default)
  email?: string;                 // E-Mail-Adresse
  vg?: string;                    // Vorgesetzter
  profileUrl?: string;            // Link zum Profil
  skills: Skill[];                // Kombinierte Skills für EmployeeCard
  completedProjects: Project[];   // Abgeschlossene Projekte
  plannedProjects: Project[];     // Geplante Projekte
  // Zusätzliche Felder aus EmployeeDetailView
  phone?: string;                 // Telefonnummer
  location?: string;              // Standort (mapping von standort)
  startDate?: string;             // Startdatum
  status?: string;                // Status (aktiv, inaktiv, etc.)
  utilization?: number;           // Aktuelle Auslastung
  averageUtilization?: number;    // Durchschnittliche Auslastung
  softSkills?: Skill[];           // Soft Skills
  technicalSkills?: Skill[];      // Technical Skills
  strengths?: string[];           // Stärken
  weaknesses?: string[];          // Schwächen
  utilizationComment?: string;    // Auslastungskommentar
  planningComment?: string;       // Planungskommentar
}
// Mock-Daten entfernt - verwende echte Daten aus utilizationData


// @component: EmployeeListView
export const EmployeeListView = ({ actionItems, onOpenEmployeeDetail }: EmployeeListViewProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Verwende echte Daten aus utilizationData
  const { databaseData, isLoading: dataLoading } = useUtilizationData();
  
  // Transformiere utilizationData zu Employee-Objekten (kompatibel mit EmployeeCard)
  useEffect(() => {
    if (!dataLoading && databaseData.utilizationData) {
      const transformedEmployees: Employee[] = databaseData.utilizationData.map((record: any) => {
        // Transformiere technicalSkills und softSkills zu Skill[]
        const technicalSkills: Skill[] = (record.technicalSkills || []).map((skill: any) => ({
          id: skill.id || skill.skillId || '',
          name: skill.skillName || skill.name || '',
          rating: skill.rating || 0
        }));
        
        const softSkills: Skill[] = (record.softSkills || []).map((skill: any) => ({
          id: skill.id || skill.skillId || '',
          name: skill.skillName || skill.name || '',
          rating: skill.rating || 0
        }));
        
        // Kombiniere alle Skills für EmployeeCard
        const allSkills = [...technicalSkills, ...softSkills];
        
        // Bestimme role aus assignedRoles
        const role = record.assignedRoles && record.assignedRoles.length > 0 
          ? record.assignedRoles[0].roleName 
          : record.lbs || 'Mitarbeiter';
        
        // Erstelle completedProjects und plannedProjects aus projectReferences
        const completedProjects: Project[] = [];
        const plannedProjects: Project[] = [];
        
        if (record.projectReferences && Array.isArray(record.projectReferences)) {
          record.projectReferences.forEach((projectRef: any) => {
            const projectObj: Project = {
              id: projectRef.id || projectRef.projectId || '',
              customer: projectRef.customer || projectRef.customerName || 'Unbekannt',
              projectName: projectRef.projectName || projectRef.name || 'Unbekanntes Projekt',
              startDate: projectRef.startDate || projectRef.startWeek || '',
              endDate: projectRef.endDate || projectRef.endWeek || '',
              description: projectRef.description || `${projectRef.projectName || 'Projekt'} bei ${projectRef.customer || 'Unbekannt'}`,
              skillsUsed: projectRef.skillsUsed || projectRef.requiredSkills || [],
              employeeRole: projectRef.role || projectRef.employeeRole || role,
              utilization: projectRef.utilization || projectRef.workload || 0,
              averageUtilization: projectRef.averageUtilization,
              probability: projectRef.probability || 'Commissioned'
            };
            
            // Entscheide basierend auf Status/Datum ob completed oder planned
            const isCompleted = projectRef.status === 'completed' || 
                               projectRef.status === 'abgeschlossen' ||
                               (projectRef.endDate && new Date(projectRef.endDate) < new Date());
            
            if (isCompleted) {
              completedProjects.push(projectObj);
            } else {
              plannedProjects.push(projectObj);
            }
          });
        }
        
        return {
          id: record.id,
          name: record.person,                    // person -> name mapping
          lbs: record.lbs || '',
          cc: record.cc || '',
          team: record.team || '',
          role: role,
          email: record.email || '',
          vg: record.vg || '',
          location: record.standort || '',        // standort -> location mapping
          skills: allSkills,                      // Kombinierte Skills
          completedProjects: completedProjects,   // Aus einsatzplan abgeleitete abgeschlossene Projekte
          plannedProjects: plannedProjects,       // Aus einsatzplan abgeleitete geplante Projekte
          phone: record.phone || '',
          startDate: record.startDate || '',
          status: record.isActive ? 'aktiv' : 'inaktiv',
          utilization: record.utilization,
          averageUtilization: record.averageUtilization,
          softSkills: softSkills,
          technicalSkills: technicalSkills,
          strengths: record.strengths ? [record.strengths] : [],
          weaknesses: record.weaknesses ? [record.weaknesses] : [],
          utilizationComment: record.utilizationComment || '',
          planningComment: record.planningComment || '',
          profileUrl: record.linkZumProfilUrl || ''
        };
      });
      
      setEmployees(transformedEmployees);
      setIsLoading(false);
    }
  }, [dataLoading, databaseData.utilizationData]);

  // ✅ NEU: Filter-States wie im UtilizationReportView
  const [filterCC, setFilterCC] = useState<string[]>([]);
  const [filterLBS, setFilterLBS] = useState<string[]>([]);
  const [filterLBSExclude, setFilterLBSExclude] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [showWorkingStudents, setShowWorkingStudents] = useState(true);
  const [selectedBereich, setSelectedBereich] = useState('');
  
  // Auth Context für Profil-Informationen
  const { profile } = useAuth();
  
  // Assignments Context für Projektzuordnungen
  const { getAssignmentsForEmployee } = useAssignments();
  
  // Alter useEffect entfernt - verwende jetzt utilizationData
  
  // handleToggleActive entfernt - nicht mehr benötigt mit utilizationData
  
  // ✅ NEU: Avatar-Click-Handler für EmployeeDetailView
  const handleAvatarClick = (employee: Employee) => {
    onOpenEmployeeDetail?.(employee.id);
  };
  
  // ✅ NEU: Filter-Optionen wie im UtilizationReportView
  const ccOptions = Array.from(new Set(employees.map(emp => emp.cc).filter(Boolean)));
  const lbsOptions = Array.from(new Set(employees.map(emp => emp.lbs).filter(Boolean)));
  const bereichOptions = Array.from(new Set(employees.map(emp => (emp as any).bereich).filter(Boolean)));
  const statusOptions = ['Urlaub', 'Elternzeit', 'Mutterschutz', 'Krankheit', 'Lange Abwesent', 'Kündigung'];
  
  const departments = ['All', ...Array.from(new Set(employees.map(emp => (emp as any).bereich || 'Unbekannt')))];
  
  // ✅ KORRIGIERT: Alle geladenen Mitarbeiter haben bereits den Act-Toggle aktiviert
  // console.log entfernt
  
  const filteredEmployees = employees.filter(employee => {
    // ✅ NEU: Erweiterte Filter-Logik wie im UtilizationReportView
    
    // Personensuche Filter
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                  employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.skills.some(skill => skill.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Abteilungs-Filter
    const matchesDepartment = selectedDepartment === 'All' || (employee as any).bereich === selectedDepartment;
    
    // Bereich-Filter
    const matchesBereich = !selectedBereich || (employee as any).bereich === selectedBereich;
    
    // CC Filter
    const matchesCC = filterCC.length === 0 || filterCC.includes(String(employee.cc || ''));
    
    // LBS Filter (INCLUDE)
    const matchesLBS = filterLBS.length === 0 || filterLBS.includes(String(employee.lbs || ''));
    
    // LBS Filter (EXCLUDE)
    const matchesLBSExclude = filterLBSExclude.length === 0 || !filterLBSExclude.includes(String(employee.lbs || ''));
    
    // Working Students Filter
    const matchesWorkingStudents = showWorkingStudents || 
      (employee.lbs !== 'Working Student' && 
       employee.lbs !== 'Working student' && 
       employee.lbs !== 'working student');
    
    // Status Filter (hier vereinfacht, da wir keine Status-Daten haben)
    const matchesStatus = filterStatus.length === 0; // Alle anzeigen, da keine Status-Daten
    
    return matchesSearch && matchesDepartment && matchesBereich && matchesCC && matchesLBS && matchesLBSExclude && matchesWorkingStudents && matchesStatus;
  });

  // @return
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }} 
          className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 lg:p-8 mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-4xl font-bold text-slate-800 mb-1">
                  Mitarbeiter für Projekte
                </h1>
                <p className="text-slate-600 text-sm lg:text-lg">
                  Identifizieren und vorschlagen Sie Mitarbeiter für Kundenprojekte
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-3 bg-gray-300 text-gray-600 rounded-xl">
              <Upload className="w-4 h-4" />
              <span className="font-medium">Upload deaktiviert</span>
            </div>
          </div>
        </motion.div>

        {/* Filter & Search Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.2 }} 
          className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8"
        >
          <div className="flex flex-col gap-6">
            {/* Search and Filter Row */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Suche nach Name, Rolle oder Fähigkeiten..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm" 
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <select 
                  value={selectedDepartment} 
                  onChange={e => setSelectedDepartment(e.target.value)} 
                  className="pl-12 pr-8 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white min-w-48 text-sm"
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept === 'All' ? 'Alle Abteilungen' : dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Statistics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Gesamt Mitarbeiter</div>
                  <div className="text-lg font-bold text-blue-600">{employees.length}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Mit Act-Toggle</div>
                  <div className="text-lg font-bold text-green-600">{employees.length}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Gefilterte Ergebnisse</div>
                  <div className="text-lg font-bold text-amber-600">{filteredEmployees.length}</div>
                </div>
              </div>
            </div>
            
            {/* ✅ NEU: Erweiterte Filter wie im UtilizationReportView */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
              {/* Bereich-Filter */}
              <MultiSelectFilter 
                label="Bereich" 
                options={bereichOptions} 
                selected={[selectedBereich].filter(Boolean)} 
                onChange={(values) => setSelectedBereich(values[0] || '')} 
                placeholder="Alle Bereiche" 
              />
              
              {/* CC-Filter */}
              <MultiSelectFilter 
                label="CC" 
                options={ccOptions} 
                selected={filterCC} 
                onChange={setFilterCC} 
                placeholder="Alle CC" 
              />
              
              {/* LBS-Filter */}
              <MultiSelectFilter 
                label="LBS" 
                options={lbsOptions} 
                selected={filterLBS} 
                onChange={setFilterLBS} 
                placeholder="Alle LBS" 
              />
              
              {/* LBS (Ausblenden)-Filter */}
              <MultiSelectFilter 
                label="LBS (Ausblenden)" 
                options={lbsOptions} 
                selected={filterLBSExclude} 
                onChange={setFilterLBSExclude} 
                placeholder="Alle LBS" 
              />
              
              {/* Status-Filter */}
              <MultiSelectFilter 
                label="Status" 
                options={statusOptions} 
                selected={filterStatus} 
                onChange={setFilterStatus} 
                placeholder="Alle Status" 
              />
              
              {/* Working Students Toggle */}
              <div className="flex items-center justify-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWorkingStudents}
                    onChange={(e) => setShowWorkingStudents(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Working Students</span>
                </label>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Employee Cards Section */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {isLoading ? (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">Lade Mitarbeiter-Dossiers</h3>
              <p className="text-slate-500">Bitte warten Sie einen Moment...</p>
            </div>
          ) : (
            <>
              {/* Info-Banner für Act-Toggle */}
              {false && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <UserX className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-blue-800 mb-1">
                        Act-Toggle Filter aktiv
                      </h4>
                      <p className="text-xs text-blue-700">
                        Alle <span className="font-medium">{employees.length}</span> Mitarbeiter mit Act-Toggle werden angezeigt.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Employee Cards Grid - Single Column für bessere Listendarstellung */}
              <div className="grid grid-cols-1 gap-4">
                <AnimatePresence>
                  {filteredEmployees.map((employee, index) => (
                    <motion.div 
                      key={employee.id} 
                      initial={{ opacity: 0, y: 20, scale: 0.95 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ 
                        duration: 0.4, 
                        delay: index * 0.05,
                        ease: "easeOut"
                      }}
                      layout
                    >
                      <EmployeeCard 
                  employee={employee} 
                  onToggleActive={undefined}
                  onAvatarClick={handleAvatarClick}
                  onOpenDetail={onOpenEmployeeDetail ? () => onOpenEmployeeDetail(employee.id) : undefined}
                />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </motion.div>

        {/* Empty State */}
        {!isLoading && filteredEmployees.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center"
          >
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-700 mb-3">
              Keine Mitarbeiter gefunden
            </h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              {employees.length === 0 
                ? "Keine Mitarbeiter haben das Act-Toggle in der Auslastungs-Übersicht aktiviert."
                : "Versuchen Sie, Ihre Suchkriterien anzupassen oder wählen Sie eine andere Abteilung."
              }
            </p>
                          {employees.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-700">
                  💡 <strong>Tipp:</strong> Aktivieren Sie das Act-Toggle für Mitarbeiter in der Auslastungs-Übersicht, 
                  um sie hier anzuzeigen.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>
      

      

    </div>;
};