import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Edit2, Trash2, User, Briefcase, MessageSquare, Plane } from 'lucide-react';
import { ProjectHistoryList } from './ProjectHistoryList';
import { ProjectOffersList } from './ProjectOffersList';
import { JiraTicketsList } from './JiraTicketsList';
import DatabaseService from '../../services/database';
import { EmployeeSkillsEditor } from './EmployeeSkillsEditor';
export interface ProjectHistoryItem {
  id: string;
  projectName: string;
  customer: string;
  role: string;
  duration: string;
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

  // Lade Employee Dossier aus der Datenbank und kombiniere mit Excel-Daten
  useEffect(() => {
    const loadEmployeeData = async () => {
      if (!isOpen || !employee.id) return;
      
      setIsLoading(true);
      try {
        // Lade gespeicherte Dossier-Daten aus der DB
        const savedDossier = await DatabaseService.getEmployeeDossier(employee.id);

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
        
        // Kombiniere DB-Daten mit Excel-Daten
        const combinedData: Employee = {
          ...employee,
          // Excel-Daten haben Vorrang (werden nie überschrieben)
          name: excelData?.name || employee.name,
          manager: excelData?.manager || employee.manager,
          team: excelData?.team || employee.team,
          competenceCenter: excelData?.competenceCenter || employee.competenceCenter,
          lineOfBusiness: excelData?.lineOfBusiness || employee.lineOfBusiness,
          careerLevel: excelData?.careerLevel || employee.careerLevel,
          // DB-Daten für manuelle Eingaben
          email: savedDossier?.email || employee.email || '',
          phone: savedDossier?.phone || employee.phone || '',
          strengths: savedDossier?.strengths || employee.strengths || '',
          weaknesses: savedDossier?.weaknesses || employee.weaknesses || '',
          comments: savedDossier?.comments || employee.comments || '',
          travelReadiness: savedDossier?.travelReadiness || employee.travelReadiness || '',
          projectHistory: normalizedProjectHistory || employee.projectHistory || [],
          projectOffers: savedDossier?.projectOffers || employee.projectOffers || [],
          jiraTickets: savedDossier?.jiraTickets || employee.jiraTickets || [],
          // Speichere Excel-Daten für Referenz
          excelData: excelData
        };
        
        setFormData(combinedData);
      } catch (error) {
        console.error('Fehler beim Laden der Employee-Daten:', error);
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
      // Speichere nur die manuellen Eingaben in der DB (nicht die Excel-Daten)
      const dossierData = {
        id: formData.id,
        name: formData.name,
        // Manuelle Eingaben
        email: formData.email,
        phone: formData.phone,
        strengths: formData.strengths,
        weaknesses: formData.weaknesses,
        comments: formData.comments,
        travelReadiness: formData.travelReadiness,
        projectHistory: formData.projectHistory,
        projectOffers: formData.projectOffers,
        jiraTickets: formData.jiraTickets,
        skills: formData.skills || [],
        // Excel-Daten als Referenz (werden nie überschrieben)
        excelData: formData.excelData
      };

      // Speichere in der Datenbank
      await DatabaseService.saveEmployeeDossier(formData.id, dossierData);
      
      // Rufe onSave auf
      onSave(formData);
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern des Employee Dossiers:', error);
      // Hier könnte man einen Toast/Alert anzeigen
      alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
    }
  };
  const handleCancel = () => {
    setFormData(employee);
    onClose();
  };
  return <AnimatePresence>
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
              <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Career Level</label>
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

              {/* Travel Readiness */}
              <section className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Plane className="w-5 h-5 text-orange-600" />
                  Reisebereitschaft
                </h2>
                <input type="text" value={formData.travelReadiness} onChange={e => handleInputChange('travelReadiness', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="z.B. Ja, bis zu 50% oder Nein" />
              </section>

              {/* Skills */}
              <EmployeeSkillsEditor
                value={formData.skills || []}
                onChange={(skills)=>setFormData(prev=>({ ...prev, skills }))}
              />

              {/* Project Offers */}
              <ProjectOffersList offers={formData.projectOffers} onChange={offers => setFormData(prev => ({
            ...prev,
            projectOffers: offers
          }))} />

              {/* Jira Tickets */}
              <JiraTicketsList tickets={formData.jiraTickets} onChange={tickets => setFormData(prev => ({
            ...prev,
            jiraTickets: tickets
          }))} />
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
    </AnimatePresence>;
}