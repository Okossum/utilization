import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Clock, ChevronDown, ChevronUp, User, Briefcase, Target, Award, TrendingUp, Calendar, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAssignments } from '../../contexts/AssignmentsContext';
import { AssignmentEditorModal } from './AssignmentEditorModal';
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
interface EmployeeCardProps {
  employee: Employee;
  onToggleActive: (employeeId: string) => void;
  onAvatarClick?: (employee: Employee) => void; // ✅ NEU: Avatar-Click-Handler
}

// @component: EmployeeCard
export const EmployeeCard = ({
  employee,
  onToggleActive,
  onAvatarClick
}: EmployeeCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Assignments Context
  const { getAssignmentsForEmployee } = useAssignments();
  
  // Lade Assignments für diesen Mitarbeiter
  useEffect(() => {
    const loadAssignments = async () => {
      if (!employee.name) return;
      
      setAssignmentsLoading(true);
      try {
        const assignmentsList = await getAssignmentsForEmployee(employee.name);
        setAssignments(assignmentsList || []);
        console.log('🔍 Assignments geladen für', employee.name, ':', assignmentsList);
      } catch (error) {
        console.error('Fehler beim Laden der Assignments:', error);
        setAssignments([]);
      } finally {
        setAssignmentsLoading(false);
      }
    };
    
    loadAssignments();
  }, [employee.name, getAssignmentsForEmployee]);

  // Handler für Assignment-Editing - vereinfacht: Klick auf Card öffnet Edit-Modal
  const handleAssignmentClick = (assignment: any) => {
    console.log('Assignment clicked:', assignment);
    setEditingAssignment(assignment);
    setShowEditModal(true);
  };



  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'Available':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Busy':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'On Project':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };
  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'Available':
        return 'Verfügbar';
      case 'Busy':
        return 'Beschäftigt';
      case 'On Project':
        return 'Im Projekt';
      default:
        return availability;
    }
  };

  // @return
  return <motion.div whileHover={{
    y: -1,
    scale: 1.005
  }} transition={{
    duration: 0.2
  }} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300">
      
      {/* Kompakter horizontaler Header */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {/* ✅ NEU: Klickbares Avatar-Icon */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAvatarClick?.(employee)}
              className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0 cursor-pointer hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
              title={`${employee.name} Dossier öffnen`}
            >
              {employee.profileImage ? 
                <img src={employee.profileImage} alt={`${employee.name} profile`} className="w-full h-full rounded-xl object-cover" /> : 
                <User className="w-6 h-6" />
              }
            </motion.button>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-slate-800 mb-1 truncate">
                {employee.name}
              </h3>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <Award className="w-3 h-3 text-blue-600" />
                  <span className="text-xs text-slate-600">{employee.role}</span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getAvailabilityColor(employee.availability)}`}>
                  {getAvailabilityText(employee.availability)}
                </div>
              </div>
            </div>
            
            {/* Kompakte Grundinformationen im Header */}
            <div className="hidden lg:flex items-center gap-4 text-xs text-slate-600">
              {employee.department && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-500" />
                  <span>{employee.department}</span>
                </div>
              )}
              {employee.careerLevel && (
                <div className="flex items-center gap-1">
                  <Award className="w-3 h-3 text-purple-500" />
                  <span>LBS: {employee.careerLevel}</span>
                </div>
              )}
              {employee.competenceCenter && (
                <div className="flex items-center gap-1">
                  <Building className="w-3 h-3 text-green-500" />
                  <span>CC: {employee.competenceCenter}</span>
                </div>
              )}
            </div>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }} 
            onClick={() => onToggleActive(employee.id)} 
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-4 flex-shrink-0 ${employee.isActive ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <motion.span 
              animate={{ x: employee.isActive ? 20 : 3 }} 
              transition={{ duration: 0.2 }} 
              className="inline-block h-5 w-5 transform rounded-full bg-white shadow-lg" 
            />
            <span className={`absolute text-xs font-bold ${employee.isActive ? 'left-1 text-white' : 'right-1 text-slate-600'}`}>
              ACT
            </span>
          </motion.button>
        </div>
      </div>

      {/* Kompakter Main Content */}
      <div className="p-4">
        {/* Kompakte Zusatzinformationen nur auf Mobile */}
        <div className="lg:hidden bg-slate-50 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {employee.team && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-orange-500" />
                <span className="text-slate-600">Team: {employee.team}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-500" />
              <span className="text-slate-600">{employee.experience}</span>
            </div>
          </div>
        </div>

        {/* Horizontale Kachel-Ansicht für bessere Raumnutzung */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          
          {/* Linke Spalte */}
          <div className="space-y-4">
            
            {/* Kompakte Fähigkeiten */}
            <div className="bg-slate-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Award className="w-3 h-3 text-slate-600" />
                Fähigkeiten
                <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full">
                  {employee.skills.length}
                </span>
              </h4>
              <div className="flex flex-wrap gap-1">
                {employee.skills.slice(0, 6).map(skill => (
                  <span key={skill} className="px-2 py-1 bg-white text-slate-700 rounded text-xs font-medium border border-slate-200 hover:bg-slate-100 transition-colors">
                    {skill}
                  </span>
                ))}
                {employee.skills.length > 6 && (
                  <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-xs font-medium">
                    +{employee.skills.length - 6}
                  </span>
                )}
              </div>
            </div>

            {/* Kompakte Stärken und Schwächen in einer Zeile */}
            {(employee.strengths || employee.weaknesses) && (
              <div className="bg-gradient-to-r from-emerald-50 to-amber-50 rounded-lg p-3">
                <div className="flex items-start gap-4">
                  {employee.strengths && (
                    <div className="flex-1">
                      <h5 className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Stärken
                      </h5>
                      <p className="text-xs text-emerald-800 leading-relaxed line-clamp-2">{employee.strengths}</p>
                    </div>
                  )}
                  {employee.weaknesses && (
                    <div className="flex-1">
                      <h5 className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                        Verbesserungsbereiche
                      </h5>
                      <p className="text-xs text-amber-800 leading-relaxed line-clamp-2">{employee.weaknesses}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Kompakte Rollen */}
            {employee.roles && employee.roles.length > 0 && (
              <div className="bg-cyan-50 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <User className="w-3 h-3 text-cyan-600" />
                  Rollen
                  <span className="bg-cyan-100 text-cyan-700 text-xs px-2 py-0.5 rounded-full">
                    {employee.roles.length}
                  </span>
                </h4>
                <div className="flex flex-wrap gap-1">
                  {employee.roles.slice(0, 4).map(role => (
                    <span key={role} className="px-2 py-1 bg-white text-cyan-700 rounded text-xs font-medium border border-cyan-200">
                      {role}
                    </span>
                  ))}
                  {employee.roles.length > 4 && (
                    <span className="px-2 py-1 bg-cyan-100 text-cyan-600 rounded text-xs font-medium">
                      +{employee.roles.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Rechte Spalte */}
          <div className="space-y-4">
            
            {/* Kompakte Aktuelle Projektzuordnungen */}
            {(assignments.length > 0 || assignmentsLoading) && (
              <div className="bg-indigo-50 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Briefcase className="w-3 h-3 text-indigo-600" />
                  {assignmentsLoading ? 'Lade...' : 'Aktuell'}
                  {!assignmentsLoading && assignments.length > 0 && (
                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                      {assignments.length}
                    </span>
                  )}
                </h4>
                {assignmentsLoading ? (
                  <div className="bg-white border border-indigo-200 rounded p-2 text-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mx-auto mb-1"></div>
                    <span className="text-xs text-indigo-600">Lade...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignments.slice(0, 2).map((assignment) => (
                      <div 
                        key={assignment.id} 
                        className="bg-white border border-indigo-200 rounded p-2 hover:bg-indigo-25 transition-all cursor-pointer"
                        onClick={() => {
                          console.log('CLICK DETECTED!', assignment);
                          handleAssignmentClick(assignment);
                        }}
                        title="Klicken zum Bearbeiten"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-medium text-indigo-900 truncate">
                            {assignment.projectName || assignment.projectId}
                          </div>
                          {assignment.plannedAllocationPct && (
                            <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded ml-2">
                              {assignment.plannedAllocationPct}%
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            {assignment.customer && (
                              <span className="truncate">{assignment.customer}</span>
                            )}
                            {assignment.role && (
                              <span className="text-indigo-600">• {assignment.role}</span>
                            )}
                          </div>
                          {assignment.status && (
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${
                                assignment.status === 'active' ? 'bg-green-500' :
                                assignment.status === 'planned' ? 'bg-blue-500' :
                                assignment.status === 'proposed' ? 'bg-orange-500' :
                                assignment.status === 'prospect' ? 'bg-yellow-500' :
                                assignment.status === 'onHold' ? 'bg-amber-500' :
                                assignment.status === 'closed' ? 'bg-gray-500' :
                                'bg-gray-500'
                              }`}></div>
                              <span>{assignment.status}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {assignments.length > 2 && (
                      <div className="text-xs text-indigo-600 text-center py-1">
                        +{assignments.length - 2} weitere
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Kompakte Projektangebote */}
            {employee.projectOffers && employee.projectOffers.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Target className="w-3 h-3 text-blue-600" />
                  Projektangebote
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    {employee.projectOffers.length}
                  </span>
                </h4>
                <div className="space-y-2">
                  {employee.projectOffers.slice(0, 2).map((offer, index) => (
                    <div key={offer.id} className="bg-white border border-blue-200 rounded p-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-blue-900 truncate">{offer.customerName}</div>
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full ml-2">
                          {offer.probability}%
                        </span>
                      </div>
                      {offer.startWeek && offer.endWeek && (
                        <div className="text-xs text-slate-600 mt-1">
                          {offer.startWeek} - {offer.endWeek}
                        </div>
                      )}
                    </div>
                  ))}
                  {employee.projectOffers.length > 2 && (
                    <div className="text-xs text-blue-600 text-center py-1">
                      +{employee.projectOffers.length - 2} weitere
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Kompakter Projekt Kurzlebenslauf */}
            {employee.projectHistory && employee.projectHistory.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Briefcase className="w-3 h-3 text-purple-600" />
                  Projekt-Historie
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                    {employee.projectHistory.length}
                  </span>
                </h4>
                <div className="space-y-2">
                  {employee.projectHistory.slice(0, 2).map((project, index) => (
                    <div key={project.id} className="bg-white border border-purple-200 rounded p-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-purple-900 truncate">{project.projectName}</div>
                        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded ml-2">
                          {project.role}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {project.customer} • {project.duration}
                      </div>
                    </div>
                  ))}
                  {employee.projectHistory.length > 2 && (
                    <div className="text-xs text-purple-600 text-center py-1">
                      +{employee.projectHistory.length - 2} weitere
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Kompakte Legacy Projektzuordnungen */}
            {employee.currentProjectAssignments && employee.currentProjectAssignments.length > 0 && assignments.length === 0 && (
              <div className="bg-green-50 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Briefcase className="w-3 h-3 text-green-600" />
                  Dossier-Projekte
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                    {employee.currentProjectAssignments.length}
                  </span>
                </h4>
                <div className="space-y-2">
                  {employee.currentProjectAssignments.slice(0, 2).map((assignment, index) => (
                    <div key={assignment.id} className="bg-white border border-green-200 rounded p-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-green-900 truncate">{assignment.projectName}</div>
                        {assignment.workload && (
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded ml-2">
                            {assignment.workload}%
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {assignment.customer} • {assignment.role}
                      </div>
                    </div>
                  ))}
                  {employee.currentProjectAssignments.length > 2 && (
                    <div className="text-xs text-green-600 text-center py-1">
                      +{employee.currentProjectAssignments.length - 2} weitere
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Kompakte Kommentare & Kontakt - Expandierbar */}
        <div className="border-t border-slate-200 pt-3">
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="flex items-center justify-between w-full text-left p-2 bg-slate-50 rounded hover:bg-slate-100 transition-colors"
          >
            <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <Mail className="w-3 h-3 text-slate-600" />
              Kontakt & Details
            </h4>
            {isExpanded ? 
              <ChevronUp className="w-3 h-3 text-slate-400" /> : 
              <ChevronDown className="w-3 h-3 text-slate-400" />
            }
          </button>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }} 
                transition={{ duration: 0.2 }}
                className="mt-2 bg-slate-50 rounded p-3 space-y-3"
              >
                {/* Kompakte Kontaktinformationen */}
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                    <Mail className="w-3 h-3 text-blue-500" />
                    <div className="flex-1">
                      <a href={`mailto:${employee.email}`} className="text-xs text-blue-600 hover:text-blue-700 transition-colors font-medium truncate">
                        {employee.email}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                    <Phone className="w-3 h-3 text-green-500" />
                    <div className="flex-1">
                      <a href={`tel:${employee.phone}`} className="text-xs text-green-600 hover:text-green-700 transition-colors font-medium">
                        {employee.phone}
                      </a>
                    </div>
                  </div>
                </div>
                
                {/* Kompakte Kommentare */}
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="text-xs font-medium text-slate-500 mb-1">Kommentare</div>
                  <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                    {employee.comments}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Assignment Editor Modal */}
      {showEditModal && (
        <AssignmentEditorModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingAssignment(null);
          }}
          employeeName={employee.name}
          editingAssignment={editingAssignment}
          onAssignmentCreated={() => {
            // Neu laden nach Bearbeitung
            const loadAssignments = async () => {
              if (!employee.name) return;
              setAssignmentsLoading(true);
              try {
                const result = await getAssignmentsForEmployee(employee.name);
                setAssignments(result || []);
              } catch (error) {
                console.error('Fehler beim Laden der Assignments:', error);
                setAssignments([]);
              } finally {
                setAssignmentsLoading(false);
              }
            };
            loadAssignments();
            setShowEditModal(false);
            setEditingAssignment(null);
          }}
        />
      )}
    </motion.div>;
};