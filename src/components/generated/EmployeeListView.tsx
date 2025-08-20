import React, { useState, useEffect } from 'react';
import { Search, Filter, Users, Upload, UserCheck, UserX, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmployeeCard } from './EmployeeCard';
import { EmployeeUploadModal } from './EmployeeUploadModal';
import DatabaseService from '../../services/database';
import { useAssignments } from '../../contexts/AssignmentsContext';
import { MultiSelectFilter } from './MultiSelectFilter';
import { useAuth } from '../../contexts/AuthContext';

// ✅ KORRIGIERT: Props für Action-Items aus der Auslastungs-Übersicht
interface EmployeeListViewProps {
  actionItems: Record<string, { actionItem: boolean; source: 'manual' | 'rule' | 'default'; updatedBy?: string }>;
}
interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  skills: string[];
  experience: string;
  availability: 'Available' | 'Busy' | 'On Project';
  comments: string;
  email: string;
  phone: string;
  isActive: boolean;
  profileImage?: string;
  // Neue Dossier-Felder
  careerLevel?: string;           // LBS
  competenceCenter?: string;      // CC
  team?: string;                  // Team
  strengths?: string;             // Stärken
  weaknesses?: string;            // Schwächen
  roles?: string[];               // Rollen
  currentProjectAssignments?: Array<{  // Aktuelle Projektzuordnungen
    id: string;
    projectName: string;
    customer: string;
    role: string;
    startDate?: string;
    endDate?: string;
    workload?: number;
  }>;
  projectHistory?: Array<{        // Projekt Kurzlebenslauf
    id: string;
    projectName: string;
    customer: string;
    role: string;
    duration: string;
    activities: string[];
  }>;
  projectOffers?: Array<{         // Angebotene Projekte
    id: string;
    customerName: string;
    startWeek: string;
    endWeek: string;
    probability: number;
  }>;
}
const employeeData: Employee[] = [{
  id: '1',
  name: 'Sarah Chen',
  role: 'Senior Frontend Developer',
  department: 'Engineering',
  skills: ['React', 'TypeScript', 'UI/UX Design', 'Node.js'],
  experience: '5+ years',
  availability: 'Available',
  comments: 'Excellent track record with client-facing projects. Strong communication skills and proven ability to deliver complex frontend solutions on time.',
  email: 'sarah.chen@company.com',
  phone: '+1 (555) 123-4567',
  isActive: false
}, {
  id: '2',
  name: 'Marcus Rodriguez',
  role: 'DevOps Engineer',
  department: 'Infrastructure',
  skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'],
  experience: '7+ years',
  availability: 'On Project',
  comments: 'Infrastructure specialist with deep cloud expertise. Currently leading the migration project but available for consultation.',
  email: 'marcus.rodriguez@company.com',
  phone: '+1 (555) 234-5678',
  isActive: true
}, {
  id: '3',
  name: 'Emily Watson',
  role: 'Product Manager',
  department: 'Product',
  skills: ['Strategy', 'Analytics', 'Agile', 'Stakeholder Management'],
  experience: '6+ years',
  availability: 'Available',
  comments: 'Strategic thinker with excellent client relationship management. Has successfully delivered 15+ projects with high client satisfaction.',
  email: 'emily.watson@company.com',
  phone: '+1 (555) 345-6789',
  isActive: false
}, {
  id: '4',
  name: 'David Kim',
  role: 'Full Stack Developer',
  department: 'Engineering',
  skills: ['Python', 'Django', 'React', 'PostgreSQL'],
  experience: '4+ years',
  availability: 'Busy',
  comments: 'Versatile developer with strong backend and frontend capabilities. Currently wrapping up a major client project.',
  email: 'david.kim@company.com',
  phone: '+1 (555) 456-7890',
  isActive: false
}, {
  id: '5',
  name: 'Lisa Thompson',
  role: 'UX Designer',
  department: 'Design',
  skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
  experience: '5+ years',
  availability: 'Available',
  comments: 'Award-winning designer with expertise in enterprise applications. Excellent at translating complex requirements into intuitive interfaces.',
  email: 'lisa.thompson@company.com',
  phone: '+1 (555) 567-8901',
  isActive: true
}, {
  id: '6',
  name: 'Alex Johnson',
  role: 'Backend Developer',
  department: 'Engineering',
  skills: ['Java', 'Spring Boot', 'Microservices', 'MongoDB'],
  experience: '6+ years',
  availability: 'Available',
  comments: 'Scalable architecture expert with proven experience in high-traffic applications. Strong problem-solving skills and mentoring capabilities.',
  email: 'alex.johnson@company.com',
  phone: '+1 (555) 678-9012',
  isActive: false
}];

// @component: EmployeeListView
export const EmployeeListView = ({ actionItems }: EmployeeListViewProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
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
  
  // ✅ KORRIGIERT: Lade alle Mitarbeiter mit Act-Toggle, unabhängig von existierenden Dossiers
  useEffect(() => {
    const loadEmployeesWithActToggle = async () => {
      try {
        setIsLoading(true);
        
        // Lade Einsatzplan-Daten für Metadaten (CC, Team, LBS)
        const einsatzplanData = await DatabaseService.getEinsatzplan();
        const einsatzplanMap = new Map();
        einsatzplanData?.forEach(entry => {
          if (entry.person) {
            einsatzplanMap.set(entry.person, entry);
          }
        });
        
        console.log('🔍 DEBUG: Einsatzplan geladen:', einsatzplanData?.length || 0, 'Einträge');

        // ✅ NEUE LOGIK: Erstelle Employee-Objekte für alle Mitarbeiter mit Act-Toggle
        const allEmployeesWithActToggle: Employee[] = Object.keys(actionItems)
          .filter(name => actionItems[name]?.actionItem === true)
          .map(name => {
            const einsatzplanEntry = einsatzplanMap.get(name);
            
            return {
              id: name, // Verwende den Namen als ID
              name: name,
              role: einsatzplanEntry?.lbs || 'Keine Angabe',
              department: einsatzplanEntry?.team || einsatzplanEntry?.cc || 'Keine Angabe',
              skills: [], // Wird später aus dem Dossier geladen
              experience: einsatzplanEntry?.lbs || 'Keine Angabe',
              availability: 'Available',
              comments: 'Klicken Sie auf den Mitarbeiter, um das Dossier zu öffnen/erstellen',
              email: 'Keine E-Mail',
              phone: 'Kein Telefon',
              isActive: true,
              // Metadaten aus Einsatzplan
              careerLevel: einsatzplanEntry?.lbs,
              competenceCenter: einsatzplanEntry?.cc,
              team: einsatzplanEntry?.team,
              strengths: '',
              weaknesses: '',
              roles: [],
              currentProjectAssignments: [],
              projectHistory: [],
              projectOffers: [],
            };
          });
        
        console.log('🔍 DEBUG: Alle Mitarbeiter mit Act-Toggle:', allEmployeesWithActToggle);
        console.log('🔍 DEBUG: Anzahl Mitarbeiter mit Act-Toggle:', allEmployeesWithActToggle.length);
        
        setEmployees(allEmployeesWithActToggle);
      } catch (error) {
        console.error('Fehler beim Laden der Mitarbeiter mit Act-Toggle:', error);
        setEmployees([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    // ✅ DEBUG: Prüfe actionItems
    console.log('🔍 DEBUG: useEffect läuft mit actionItems:', actionItems);
    console.log('🔍 DEBUG: actionItems Länge:', Object.keys(actionItems).length);
    
    // Nur laden wenn actionItems verfügbar sind
    if (Object.keys(actionItems).length > 0) {
      console.log('🔍 DEBUG: Starte loadEmployeesWithActToggle');
      loadEmployeesWithActToggle();
    } else {
      console.log('🔍 DEBUG: Keine actionItems verfügbar');
    }
  }, [actionItems]);
  
  // Toggle ACT-Status für einen Mitarbeiter
  const handleToggleActive = async (employeeId: string) => {
    try {
      // Finde den Mitarbeiter
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) return;
      
      // Toggle den Status
      const newActiveStatus = !employee.isActive;
      
      // Aktualisiere den lokalen State
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId 
          ? { ...emp, isActive: newActiveStatus }
          : emp
      ));
      
      // Speichere den neuen Status in der Datenbank
      await DatabaseService.saveEmployeeDossier(employeeId, {
        uid: employeeId,
        displayName: employee.name,
        email: employee.email,
        skills: employee.skills,
        experience: 0, // Standard-Wert
        isActive: newActiveStatus
      });
      
      console.log(`✅ ACT-Status für ${employee.name} auf ${newActiveStatus ? 'aktiv' : 'inaktiv'} gesetzt`);
    } catch (error) {
      console.error('❌ Fehler beim Speichern des ACT-Status:', error);
      // Bei Fehler: Status zurücksetzen
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId 
          ? { ...emp, isActive: !emp.isActive }
          : emp
      ));
    }
  };
  
  // ✅ NEU: Filter-Optionen wie im UtilizationReportView
  const ccOptions = Array.from(new Set(employees.map(emp => emp.competenceCenter).filter(Boolean)));
  const lbsOptions = Array.from(new Set(employees.map(emp => emp.careerLevel).filter(Boolean)));
  const bereichOptions = Array.from(new Set(employees.map(emp => (emp as any).bereich).filter(Boolean)));
  const statusOptions = ['Urlaub', 'Elternzeit', 'Mutterschutz', 'Krankheit', 'Lange Abwesent', 'Kündigung'];
  
  const departments = ['All', ...Array.from(new Set(employees.map(emp => emp.department)))];
  
  // ✅ KORRIGIERT: Alle geladenen Mitarbeiter haben bereits den Act-Toggle aktiviert
  console.log('🔍 DEBUG: Alle Mitarbeiter mit Act-Toggle geladen:', employees.length);
  
  const filteredEmployees = employees.filter(employee => {
    // ✅ NEU: Erweiterte Filter-Logik wie im UtilizationReportView
    
    // Personensuche Filter
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         employee.role.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         employee.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Abteilungs-Filter
    const matchesDepartment = selectedDepartment === 'All' || employee.department === selectedDepartment;
    
    // Bereich-Filter
    const matchesBereich = !selectedBereich || (employee as any).bereich === selectedBereich;
    
    // CC Filter
    const matchesCC = filterCC.length === 0 || filterCC.includes(String(employee.competenceCenter || ''));
    
    // LBS Filter (INCLUDE)
    const matchesLBS = filterLBS.length === 0 || filterLBS.includes(String(employee.careerLevel || ''));
    
    // LBS Filter (EXCLUDE)
    const matchesLBSExclude = filterLBSExclude.length === 0 || !filterLBSExclude.includes(String(employee.careerLevel || ''));
    
    // Working Students Filter
    const matchesWorkingStudents = showWorkingStudents || 
      (employee.careerLevel !== 'Working Student' && 
       employee.careerLevel !== 'Working student' && 
       employee.careerLevel !== 'working student');
    
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
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              title="Mitarbeiter-Excel hochladen"
            >
              <Upload className="w-4 h-4" />
              <span className="font-medium">Excel Upload</span>
            </button>
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
                      <EmployeeCard employee={employee} onToggleActive={handleToggleActive} />
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
      
      {/* Upload Modal */}
      <EmployeeUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
    </div>;
};