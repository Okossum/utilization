import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Clock, ChevronDown, ChevronUp, User, Briefcase } from 'lucide-react';
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
}

// @component: EmployeeCard
export const EmployeeCard = ({
  employee,
  onToggleActive
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
    y: -4,
    scale: 1.02
  }} transition={{
    duration: 0.2
  }} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {employee.profileImage ? <img src={employee.profileImage} alt={`${employee.name} profile`} className="w-full h-full rounded-xl object-cover" /> : <User className="w-7 h-7" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">
                <span>{employee.name}</span>
              </h3>
              <p className="text-slate-600 font-medium">
                <span>{employee.role}</span>
              </p>
            </div>
          </div>
          
          <motion.button whileHover={{
          scale: 1.05
        }} whileTap={{
          scale: 0.95
        }} onClick={() => onToggleActive(employee.id)} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${employee.isActive ? 'bg-blue-600' : 'bg-slate-300'}`}>
            <motion.span animate={{
            x: employee.isActive ? 24 : 4
          }} transition={{
            duration: 0.2
          }} className="inline-block h-6 w-6 transform rounded-full bg-white shadow-lg" />
            <span className={`absolute text-xs font-bold ${employee.isActive ? 'left-1 text-white' : 'right-1 text-slate-600'}`}>
              <span>ACT</span>
            </span>
          </motion.button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 text-sm">{employee.department}</span>
          </div>
          
          {/* LBS (Career Level) */}
          {employee.careerLevel && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 text-sm">
                <span className="font-medium">LBS:</span> {employee.careerLevel}
              </span>
            </div>
          )}

          {/* Competence Center */}
          {employee.competenceCenter && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 text-sm">
                <span className="font-medium">CC:</span> {employee.competenceCenter}
              </span>
            </div>
          )}

          {/* Team */}
          {employee.team && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 text-sm">
                <span className="font-medium">Team:</span> {employee.team}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 text-sm">{employee.experience}</span>
            <div className={`ml-auto px-3 py-1 rounded-full text-xs font-medium border ${getAvailabilityColor(employee.availability)}`}>
              <span>{getAvailabilityText(employee.availability)}</span>
            </div>
          </div>
        </div>

        {/* Stärken und Schwächen */}
        {(employee.strengths || employee.weaknesses) && (
          <div className="mb-4 space-y-3">
            {employee.strengths && (
              <div>
                <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  Stärken
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">{employee.strengths}</p>
              </div>
            )}
            
            {employee.weaknesses && (
              <div>
                <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  Schwächen
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">{employee.weaknesses}</p>
              </div>
            )}
          </div>
        )}

        {/* Projektangebote */}
        {employee.projectOffers && employee.projectOffers.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Angebotene Projekte ({employee.projectOffers.length})
            </h4>
            <div className="space-y-2">
              {employee.projectOffers.slice(0, 3).map((offer, index) => (
                <div key={offer.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-blue-900">{offer.customerName}</span>
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      {offer.probability}% Wahrscheinlichkeit
                    </span>
                  </div>
                  {offer.startWeek && offer.endWeek && (
                    <div className="text-xs text-blue-700">
                      {offer.startWeek} - {offer.endWeek}
                    </div>
                  )}
                </div>
              ))}
              {employee.projectOffers.length > 3 && (
                <div className="text-xs text-blue-600 text-center py-2">
                  +{employee.projectOffers.length - 3} weitere Projekte
                </div>
              )}
            </div>
          </div>
        )}

        {/* Projekt Kurzlebenslauf */}
        {employee.projectHistory && employee.projectHistory.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Projekt Kurzlebenslauf ({employee.projectHistory.length})
            </h4>
            <div className="space-y-2">
              {employee.projectHistory.slice(0, 3).map((project, index) => (
                <div key={project.id} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-purple-900">{project.projectName}</span>
                    <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                      {project.role}
                    </span>
                  </div>
                  <div className="text-xs text-purple-700 mb-1">{project.customer}</div>
                  {project.duration && (
                    <div className="text-xs text-purple-600">{project.duration}</div>
                  )}
                </div>
              ))}
              {employee.projectHistory.length > 3 && (
                <div className="text-xs text-purple-600 text-center py-2">
                  +{employee.projectHistory.length - 3} weitere Projekte
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rollen */}
        {employee.roles && employee.roles.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-cyan-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
              Rollen
            </h4>
            <div className="flex flex-wrap gap-2">
              {employee.roles.slice(0, 4).map(role => (
                <span key={role} className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-lg text-sm font-medium border border-cyan-200">
                  {role}
                </span>
              ))}
              {employee.roles.length > 4 && (
                <span className="px-3 py-1 bg-cyan-50 text-cyan-600 rounded-lg text-sm">
                  +{employee.roles.length - 4} weitere
                </span>
              )}
            </div>
          </div>
        )}

        {/* Aktuelle Projektzuordnungen aus AssignmentsContext */}
        {(assignments.length > 0 || assignmentsLoading) && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-indigo-700 mb-2 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              {assignmentsLoading ? 'Lade Projektzuordnungen...' : `Projektzuordnungen (${assignments.length})`}
            </h4>
            {assignmentsLoading ? (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                <span className="text-xs text-indigo-600">Lade...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.slice(0, 3).map((assignment) => (
                  <div 
                    key={assignment.id} 
                    className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg hover:from-purple-100 hover:to-violet-100 transition-colors cursor-pointer"
                    onClick={() => {
                      console.log('CLICK DETECTED!', assignment);
                      handleAssignmentClick(assignment);
                    }}
                    title="Klicken zum Bearbeiten"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-purple-900">
                        {assignment.projectName || assignment.projectId}
                      </span>
                      {assignment.plannedAllocationPct && (
                        <span className="text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                          {assignment.plannedAllocationPct}% Auslastung
                        </span>
                      )}
                    </div>
                    {assignment.customer && (
                      <div className="text-xs text-purple-700 mb-1">{assignment.customer}</div>
                    )}
                    {/* Projekt-Details in kompakter Form */}
                    <div className="space-y-1 mt-2">
                      {/* Rolle und Status in einer Zeile */}
                      <div className="flex items-center justify-between">
                        {assignment.role && (
                          <span className="text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded">
                            Rolle: {assignment.role}
                          </span>
                        )}
                        {assignment.status && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            assignment.status === 'active' ? 'bg-green-100 text-green-700' :
                            assignment.status === 'planned' ? 'bg-blue-100 text-blue-700' :
                            assignment.status === 'proposed' ? 'bg-orange-100 text-orange-700' :
                            assignment.status === 'prospect' ? 'bg-yellow-100 text-yellow-700' :
                            assignment.status === 'onHold' ? 'bg-amber-100 text-amber-700' :
                            assignment.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                          {assignment.status}
                        </span>
                        )}
                      </div>
                      
                      {/* Wahrscheinlichkeit und Auslastung in einer Zeile */}
                      <div className="flex items-center justify-between text-xs text-purple-700">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span>Wahrscheinlichkeit: {
                            assignment.status === 'prospect' ? '25%' : 
                            assignment.status === 'proposed' ? '50%' : 
                            assignment.status === 'planned' ? '75%' : 
                            assignment.status === 'active' ? '100%' : 
                            assignment.status === 'onHold' ? '50%' : 
                            assignment.status === 'closed' ? '0%' : '—'
                          }</span>
                        </div>
                        {assignment.plannedAllocationPct && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>Auslastung: {assignment.plannedAllocationPct}%</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Kommentar (falls vorhanden) */}
                      {assignment.comment && (
                        <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded border-l-2 border-purple-200">
                          💬 {assignment.comment}
                        </div>
                      )}
                    </div>
                    {/* Zeitraum und Due Date */}
                    <div className="flex items-center justify-between text-xs text-purple-700 mt-1">
                      {(assignment.startDate || assignment.endDate) && (
                        <div>
                          {assignment.startDate || '—'} → {assignment.endDate || '—'}
                        </div>
                      )}
                      {assignment.dueDate && (
                        <div className="flex items-center gap-1">
                          <span className="text-purple-600">📅 Due: {assignment.dueDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {assignments.length > 3 && (
                  <div className="text-xs text-purple-600 text-center py-2">
                    +{assignments.length - 3} weitere Zuordnungen
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Legacy: Aktuelle Projektzuordnungen (falls aus Dossier-Daten) */}
        {employee.currentProjectAssignments && employee.currentProjectAssignments.length > 0 && assignments.length === 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Aktuelle Projektzuordnungen ({employee.currentProjectAssignments.length})
            </h4>
            <div className="space-y-2">
              {employee.currentProjectAssignments.slice(0, 3).map((assignment, index) => (
                <div key={assignment.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-green-900">{assignment.projectName}</span>
                    {assignment.workload && (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        {assignment.workload}% Auslastung
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-green-700 mb-1">{assignment.customer}</div>
                                      {/* Projekt-Details in kompakter Form */}
                    <div className="space-y-1 mt-2">
                      {/* Rolle und Zeitraum in einer Zeile */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          Rolle: {assignment.role}
                        </span>
                        {assignment.startDate && assignment.endDate && (
                          <span className="text-xs text-green-600">
                            {assignment.startDate} - {assignment.endDate}
                          </span>
                        )}
                      </div>
                      

                      
                      {/* Auslastung (falls vorhanden) */}
                      {assignment.workload && (
                        <div className="flex items-center gap-1 text-xs text-green-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Auslastung: {assignment.workload}%</span>
                        </div>
                      )}
                    </div>
                </div>
              ))}
              {employee.currentProjectAssignments.length > 3 && (
                <div className="text-xs text-green-600 text-center py-2">
                  +{employee.currentProjectAssignments.length - 3} weitere Zuordnungen
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fähigkeiten */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
            Fähigkeiten & Kompetenzen
          </h4>
          <div className="flex flex-wrap gap-2">
            {employee.skills.slice(0, 6).map(skill => (
              <span key={skill} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">
                {skill}
              </span>
            ))}
            {employee.skills.length > 6 && (
              <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-sm">
                +{employee.skills.length - 6} weitere
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center justify-between w-full text-left">
            <h4 className="text-sm font-semibold text-slate-700">
              <span>Kommentare & Kontakt</span>
            </h4>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          
          <AnimatePresence>
            {isExpanded && <motion.div initial={{
            opacity: 0,
            height: 0
          }} animate={{
            opacity: 1,
            height: 'auto'
          }} exit={{
            opacity: 0,
            height: 0
          }} transition={{
            duration: 0.3
          }} className="mt-3 space-y-3">
                <p className="text-sm text-slate-600 leading-relaxed">
                  <span>{employee.comments}</span>
                </p>
                
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a href={`mailto:${employee.email}`} className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
                      <span>{employee.email}</span>
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <a href={`tel:${employee.phone}`} className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
                      <span>{employee.phone}</span>
                    </a>
                  </div>
                </div>
              </motion.div>}
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