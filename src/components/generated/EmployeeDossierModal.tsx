import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Edit2, Trash2, User, Briefcase, MessageSquare, ArrowRight } from 'lucide-react';
import { ProjectHistoryList } from './ProjectHistoryList';

import { PlanningModal } from './PlanningModal';
import { AssignmentsList } from './AssignmentsList';
import { AssignmentEditorModal } from './AssignmentEditorModal';
import DatabaseService from '../../services/database';
import { EmployeeSkillAssignment } from './EmployeeSkillAssignment';
import EmployeeRoleAssignment from './EmployeeRoleAssignment';
import { UtilizationComment } from './UtilizationComment';
import { PlanningCommentModal } from './PlanningCommentModal';

import { useAssignments } from '../../contexts/AssignmentsContext';

export interface ProjectHistoryItem {
  id: string;
  projectName: string;
  customer: string;
  role: string;           // Hauptrolle (aus zentralem Skill-Management)
  duration: string;
  activities: string[];   // Individuelle Tätigkeiten im Projekt
}
export interface ProjectOffer {
  id: string;
  customerName: string;
  startWeek: string;
  endWeek: string;
  probability: number;
}
export interface JiraTicket {
  id: string;
  ticketId: string;
  probability: number;
  contactPerson: string;
  title?: string;
  link?: string;
  customer?: string;
  project?: string;
}
export interface Employee {
  id: string;
  name: string;
  careerLevel: string;
  manager: string;
  team: string;
  competenceCenter: string;
  lineOfBusiness: string;
  email: string;
  phone: string;
  projectHistory: ProjectHistoryItem[];

  strengths: string;
  weaknesses: string;
  comments: string;
  utilizationComment?: string;
  travelReadiness: string;
  projectOffers: ProjectOffer[];
  jiraTickets: JiraTicket[];
  skills?: { skillId: string; name: string; level: number }[];
  // Excel-Daten (werden nie überschrieben)
  excelData?: {
    name: string;
    manager: string;
    team: string;
    competenceCenter: string;
    lineOfBusiness: string;
    careerLevel: string;
  };
}
interface EmployeeDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  onSave: (employee: Employee) => void;
  // Excel-Daten für automatische Befüllung
  excelData?: {
    name: string;
    manager: string;
    team: string;
    competenceCenter: string;
    lineOfBusiness: string;
    careerLevel: string;
  };
  // Kunden-Funktionalität (optional, da jetzt über Context)
  customers?: string[];
  onAddCustomer?: (name: string) => void;
}
export function EmployeeDossierModal({
  isOpen,
  onClose,
  employee,
  onSave,
  excelData,
  customers,
  onAddCustomer
}: EmployeeDossierModalProps) {
  const [formData, setFormData] = useState<Employee>(employee);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlanningOpen, setPlanningOpen] = useState(false);
  const [isPlanningCommentOpen, setPlanningCommentOpen] = useState(false);
  const [planningComment, setPlanningComment] = useState<string>('');
  const [isAssignmentEditorOpen, setAssignmentEditorOpen] = useState(false);
  const { getAssignmentsForEmployee } = useAssignments();

  // Lade Employee Dossier aus der Datenbank und kombiniere mit Excel-Daten
  useEffect(() => {
    const loadEmployeeData = async () => {
      if (!isOpen || !employee.name) return;
      
      setIsLoading(true);
      try {
        // Lade gespeicherte Dossier-Daten aus der DB
        const savedDossier = await DatabaseService.getEmployeeDossier(employee.name);
        
        // Lade Skills über DatabaseService
        let firebaseSkills: any[] = [];
        try {
          firebaseSkills = await DatabaseService.getEmployeeSkills(employee.name);
        } catch (skillError) {
          console.warn('Fehler beim Laden der Skills, verwende leeres Array:', skillError);
          firebaseSkills = [];
        }

        // Normalisierung: stelle sicher, dass projectHistory Items immer projectName befüllt haben
        const normalizedProjectHistory = Array.isArray(savedDossier?.projectHistory)
          ? savedDossier.projectHistory.map((p: any) => ({
              id: String(p.id ?? Date.now().toString()),
              projectName: String(p.projectName ?? p.project ?? ''),
              customer: String(p.customer ?? ''),
              role: String(p.role ?? ''),
              duration: String(p.duration ?? ''),
            }))
          : undefined;
        
        // Normalisierung: stelle sicher, dass simpleProjects korrekt geladen werden
        const normalizedSimpleProjects = Array.isArray(savedDossier?.simpleProjects)
          ? savedDossier.simpleProjects.map((p: any) => ({
              id: String(p.id ?? Date.now().toString()),
              customer: String(p.customer ?? ''),
              role: String(p.role ?? ''),
              activities: String(p.activities ?? ''),
              duration: String(p.duration ?? ''),
            }))
          : undefined;
        
        // Kombiniere DB-Daten mit Excel-Daten
        const combinedData: Employee = {
          ...employee,
          // Excel-Daten haben Vorrang (werden nie überschrieben)
          name: excelData?.name || employee.name,
          // DB-Daten haben Vorrang vor Excel-Daten für bearbeitbare Felder
          manager: savedDossier?.manager || excelData?.manager || employee.manager,
          team: savedDossier?.team || excelData?.team || employee.team,
          competenceCenter: savedDossier?.competenceCenter || excelData?.competenceCenter || employee.competenceCenter,
          lineOfBusiness: savedDossier?.lineOfBusiness || excelData?.lineOfBusiness || employee.lineOfBusiness,
          careerLevel: savedDossier?.careerLevel || excelData?.careerLevel || employee.careerLevel,
          // DB-Daten für manuelle Eingaben
          email: savedDossier?.email || employee.email || '',
          phone: savedDossier?.phone || employee.phone || '',
          strengths: savedDossier?.strengths || employee.strengths || '',
          weaknesses: savedDossier?.weaknesses || employee.weaknesses || '',
          comments: savedDossier?.comments || employee.comments || '',
          utilizationComment: savedDossier?.utilizationComment || employee.utilizationComment || '',
          travelReadiness: savedDossier?.travelReadiness || employee.travelReadiness || '',
          projectHistory: normalizedProjectHistory || employee.projectHistory || [],

          projectOffers: savedDossier?.projectOffers || employee.projectOffers || [],
          jiraTickets: savedDossier?.jiraTickets || employee.jiraTickets || [],
          // Skills aus Firebase haben Vorrang, dann lokale DB, dann employee
          skills: firebaseSkills.length > 0 
            ? firebaseSkills.map(fs => ({ skillId: fs.skillId, name: fs.skillName, level: fs.level }))
            : Array.isArray(savedDossier?.skills) ? savedDossier?.skills : (employee.skills || []),
          // Speichere Excel-Daten für Referenz
          excelData: excelData
        };
        
        setFormData(combinedData);
        setPlanningComment(String(savedDossier?.planningComment || ''));
      } catch (error) {

        // Fallback: Verwende nur Excel-Daten
        if (excelData) {
          setFormData(prev => ({
            ...prev,
            name: excelData.name || prev.name,
            manager: excelData.manager || prev.manager,
            team: excelData.team || prev.team,
            competenceCenter: excelData.competenceCenter || prev.competenceCenter,
            lineOfBusiness: excelData.lineOfBusiness || prev.lineOfBusiness,
            careerLevel: excelData.careerLevel || prev.careerLevel,
            excelData: excelData
          }));
          setPlanningComment('');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployeeData();
  }, [isOpen, employee.id, excelData]);
  const handleInputChange = (field: keyof Employee, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSave = async () => {
    try {
      // Speichere Skills über DatabaseService (API)
      if (formData.skills && formData.skills.length > 0) {
        try {
          await DatabaseService.saveEmployeeSkills(formData.name, formData.skills.map(skill => ({
            skillId: skill.skillId,
            skillName: skill.name,
            level: skill.level
          })));
        } catch (skillError) {
          console.warn('Fehler beim Speichern der Skills, fahre mit Dossier fort:', skillError);
          // Fahre mit dem Speichern des Dossiers fort, auch wenn Skills fehlschlagen
        }
      } else {
        // Keine Skills vorhanden - das ist in Ordnung
      }

      // Speichere alle bearbeitbaren Felder in der DB
      // Konvertiere zu kompatiblem Format für DatabaseService
      const dossierData = {
        uid: formData.name,
        displayName: formData.name,
        email: formData.email || '',
        // Legacy-Felder für API-Kompatibilität
        skills: formData.skills?.map(s => s.name) || [],
        experience: 0,
        // Alle anderen Daten als dynamische Felder
        phone: formData.phone,
        strengths: formData.strengths,
        weaknesses: formData.weaknesses,
        comments: formData.comments,
        utilizationComment: formData.utilizationComment,
        travelReadiness: formData.travelReadiness,
        projectHistory: formData.projectHistory,

        projectOffers: formData.projectOffers,
        jiraTickets: formData.jiraTickets,
        // Excel-Daten als Referenz (werden nie überschrieben)
        excelData: formData.excelData,
        // Neue Felder: Alle bearbeitbaren Metadaten
        careerLevel: formData.careerLevel,
        manager: formData.manager,
        team: formData.team,
        competenceCenter: formData.competenceCenter,
        lineOfBusiness: formData.lineOfBusiness
      };

      // Clientseitige Sanitisierung: entferne undefined aus excelData und projectHistory
      const sanitize = (v: any): any => {
        if (Array.isArray(v)) return v.map(sanitize).filter(x => x !== undefined);
        if (v && typeof v === 'object') {
          const out: any = {};
          Object.keys(v).forEach(k => {
            const sv = sanitize((v as any)[k]);
            if (sv !== undefined) out[k] = sv;
          });
          return out;
        }
        return v === undefined ? undefined : v;
      };
      const safeDossierData = sanitize(dossierData);

      // Speichere in der Datenbank
      await DatabaseService.saveEmployeeDossier(formData.name, safeDossierData);
      
      // Rufe onSave auf
      onSave(formData);
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern der Employee Skills:', error);
      // Hier könnte man einen Toast/Alert anzeigen
      alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
    }
  };
  const handleCancel = () => {
    setFormData(employee);
    onClose();
  };
  return (
    <>
      <AnimatePresence>
        {isOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }} className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
            
            <motion.div initial={{
          opacity: 0,
          scale: 0.95,
          y: 20
        }} animate={{
          opacity: 1,
          scale: 1,
          y: 0
        }} exit={{
          opacity: 0,
          scale: 0.95,
          y: 20
        }} className="relative w-full max-w-7xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Mitarbeiter-Dossier: {formData.name}
                  </h1>
                  {isLoading && (
                    <p className="text-sm text-blue-600">Lade Daten...</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPlanningOpen(true)} className="px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                  Planung (Angebote & Jira)
                </button>
                <button onClick={() => setPlanningCommentOpen(true)} className="px-3 py-2 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  Einsatzplan-Kommentar
                </button>
                <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Basic Information */}
              <section className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Basisinformationen
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LBS</label>
                    <input type="text" value={formData.careerLevel} onChange={e => handleInputChange('careerLevel', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                    <input type="text" value={formData.manager} onChange={e => handleInputChange('manager', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                    <input type="text" value={formData.team} onChange={e => handleInputChange('team', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Competence Center</label>
                    <input type="text" value={formData.competenceCenter} onChange={e => handleInputChange('competenceCenter', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Line of Business</label>
                    <input type="text" value={formData.lineOfBusiness} onChange={e => handleInputChange('lineOfBusiness', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                    <input type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                    <input type="tel" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
              </section>

              {/* Project History */}
              <ProjectHistoryList 
                projects={formData.projectHistory} 
                onChange={projects => setFormData(prev => ({
                  ...prev,
                  projectHistory: projects
                }))}
              />

              {/* Strengths & Weaknesses */}
              <section className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-green-600" />
                  Stärken & Schwächen
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stärken</label>
                    <textarea value={formData.strengths} onChange={e => handleInputChange('strengths', e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Schwächen</label>
                    <textarea value={formData.weaknesses} onChange={e => handleInputChange('weaknesses', e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                  </div>
                </div>
              </section>

              {/* Comments */}
              <section className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  Kommentare
                </h2>
                <textarea value={formData.comments} onChange={e => handleInputChange('comments', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Allgemeine Kommentare zum Mitarbeiter..." />
              </section>

              {/* Utilization & Planning Comments side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Utilization Comment Component */}
                <UtilizationComment
                  personId={formData.name}
                  initialValue={formData.utilizationComment}
                  onLocalChange={(v)=> setFormData(prev => ({ ...prev, utilizationComment: v }))}
                  className="h-full"
                />

                {/* Planning Comment (inline card with edit via modal) */}
                <section className="space-y-3">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <ArrowRight className="w-5 h-5 text-blue-600" />
                    Einsatzplan
                    <button
                      type="button"
                      className="ml-2 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded px-2 py-1"
                      onClick={() => setPlanningCommentOpen(true)}
                      title="Bearbeiten"
                    >
                      Bearbeiten
                    </button>
                  </h2>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded min-h-24">
                    {planningComment?.trim() ? (
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{planningComment}</p>
                    ) : (
                      <p className="text-sm text-gray-500">Kein Einsatzplan-Kommentar vorhanden.</p>
                    )}
                  </div>
                </section>
              </div>

              {/* Skills */}
              <EmployeeSkillAssignment
                employeeId={formData.id}
                employeeName={formData.name}
                onSkillsChange={(skills) => {
                  // Konvertiere zu kompatiblem Format für das bestehende Interface
                  const convertedSkills = skills.map(s => ({
                    skillId: s.skillId,
                    name: s.skillName,
                    level: s.level
                  }));
                  setFormData(prev => ({ ...prev, skills: convertedSkills }));
                }}
              />

              {/* Rollen */}
              <EmployeeRoleAssignment
                employeeId={formData.id}
                employeeName={formData.name}
              />

              {/* Assignments */}
              <AssignmentsList employeeName={formData.name} />
              <div>
                <button
                  onClick={() => setAssignmentEditorOpen(true)}
                  className="mt-2 inline-flex items-center gap-2 px-3 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Projekt zuordnen
                </button>
              </div>




            </div>

            {/* Footer */}
            <footer className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
              <button onClick={handleCancel} className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Abbrechen
              </button>
              <button onClick={handleSave} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Speichern
              </button>
            </footer>
            </motion.div>
          </div>}
      </AnimatePresence>
      <PlanningModal
        isOpen={isPlanningOpen}
        onClose={async () => {
          setPlanningOpen(false);
          try {
            const updated = await DatabaseService.getEmployeeDossier(formData.name);
            if (updated) {
              setFormData(prev => ({
                ...prev,
                // Übernehme aktualisierte Listen (weitere Felder bleiben unberührt)
                projectOffers: Array.isArray(updated.projectOffers) ? updated.projectOffers : prev.projectOffers,
                jiraTickets: Array.isArray(updated.jiraTickets) ? updated.jiraTickets : prev.jiraTickets,
                skills: Array.isArray(updated.skills) ? updated.skills : prev.skills
              }));
            }
          } catch (e) {
    
          }
        }}
        personId={formData.name}
      />
      <PlanningCommentModal
        isOpen={isPlanningCommentOpen}
        onClose={async () => {
          setPlanningCommentOpen(false);
          try {
            const updated = await DatabaseService.getEmployeeDossier(formData.name);
            setPlanningComment(String(updated?.planningComment || ''));
          } catch {}
        }}
        personId={formData.name}
      />
      <AssignmentEditorModal
        isOpen={isAssignmentEditorOpen}
        onClose={async () => {
          setAssignmentEditorOpen(false);
          // Lade die Assignments neu, nachdem eine Zuordnung erstellt wurde
          try {
            await getAssignmentsForEmployee(formData.name, true);
          } catch (e) {
            console.warn('Fehler beim Neuladen der Assignments:', e);
          }
        }}
        employeeName={formData.name}
        onAssignmentCreated={() => {
          console.log('✅ Assignment erstellt, aktualisiere Liste...');
          // Force refresh der Assignments für diesen Mitarbeiter
          getAssignmentsForEmployee(formData.name, true);
        }}
      />
    </>
  );
}