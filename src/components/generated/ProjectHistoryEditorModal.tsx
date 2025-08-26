import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, Plus, Trash2, User, Code, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

import RoleSelectionModal from './RoleSelectionModal';
import TechnicalSkillSelectionModal from './TechnicalSkillSelectionModal';
import { ProjectRoleSelectionModal } from './ProjectRoleSelectionModal';
import { ProjectSkillSelectionModal } from './ProjectSkillSelectionModal';

// ProjectHistoryItem type definition moved here since EmployeeDossierModal is removed
interface ProjectHistoryItem {
  id: string;
  customer: string;
  projectName: string;
  startDate: string;
  endDate: string;
  description: string;
  skillsUsed: string[];
  // Erweiterte Properties für vollständige Kompatibilität
  activities?: string[];
  role?: string;
  duration?: string;
  status?: string;
  comment?: string;
  plannedAllocationPct?: number;
  roles?: any[];
  skills?: any[];
}

interface ProjectHistoryEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectHistoryItem | null;
  onSave: (project: ProjectHistoryItem) => void;
  onDelete?: (projectId: string) => void;
  employeeId: string;
  employeeName: string;
}

export function ProjectHistoryEditorModal({ 
  isOpen, 
  onClose, 
  project, 
  onSave, 
  onDelete,
  employeeId,
  employeeName 
}: ProjectHistoryEditorModalProps) {
  const { token } = useAuth();
  
  // Form state - vereinfacht
  const [customerName, setCustomerName] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [allocation, setAllocation] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<'closed' | 'active'>('closed');
  const [description, setDescription] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  
  // Sub-Modal States
  const [isRoleModalOpen, setRoleModalOpen] = useState(false);
  const [isSkillModalOpen, setSkillModalOpen] = useState(false);
  
  // Auto-Save State
  const [isProjectSaved, setIsProjectSaved] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  
  // Ausgewählte Rollen und Skills
  const [selectedRoles, setSelectedRoles] = useState<Array<{id: string, name: string, tasks: string[]}>>([]);
  const [selectedSkills, setSelectedSkills] = useState<Array<{id: string, name: string, level: number}>>([]);
  


  // Initialize form when project changes - OHNE selectedRoles/Skills Reset
  useEffect(() => {
    console.log('🔄 ProjectHistoryEditorModal: Initialisiere Formular für Projekt:', project?.id || 'NEU');
    
    if (project) {
      // Edit mode - direkte Werte setzen
      console.log('📝 Edit Mode: Lade Projekt-Daten');
      setCustomerName(project.customer || '');
      setProjectName(project.projectName || '');
      setDuration(project.duration || '');
      setStartDate(project.startDate || '');
      setEndDate(project.endDate || '');
      setAllocation(project.plannedAllocationPct || undefined);
      setStatus(project.status || 'closed');
      setDescription(project.description || '');
      setComment(project.comment || '');
      
      // Rollen und Skills aus dem Projekt laden (falls vorhanden)
      setSelectedRoles(project.roles || []);
      setSelectedSkills(project.skills || []);
      setIsProjectSaved(true); // Bestehendes Projekt ist bereits gespeichert
      setCurrentProjectId(project.id);
      console.log('✅ Edit Mode: Projekt-Rollen geladen:', project.roles?.length || 0);
    } else {
      // Create mode - leere Werte
      console.log('🆕 Create Mode: Neue Projekt-Erstellung');
      setCustomerName('');
      setProjectName('');
      setDuration('');
      setStartDate('');
      setEndDate('');
      setAllocation(undefined);
      setStatus('closed');
      setDescription('');
      setComment('');
      
      // WICHTIG: Rollen und Skills NICHT hier zurücksetzen!
      // Sie werden durch loadExistingRolesAndSkills() oder handleRoleAssigned() gesetzt
      // setSelectedRoles([]); // ❌ ENTFERNT - Das war das Problem!
      // setSelectedSkills([]); // ❌ ENTFERNT - Das war das Problem!
      setIsProjectSaved(false); // Neues Projekt noch nicht gespeichert
      setCurrentProjectId('');
      console.log('✅ Create Mode: Formular zurückgesetzt (Rollen/Skills bleiben erhalten)');
    }
  }, [project, isOpen]);

  // Reset bei neuem Projekt (keine automatische Vorauswahl)
  useEffect(() => {
    if (isOpen && !project) {
      console.log('🔄 Modal geöffnet für NEUES Projekt - Reset zu leer (manuelle Auswahl)');
      
      // Beim ersten Öffnen für ein neues Projekt: Reset zu leer
      setSelectedRoles([]);
      setSelectedSkills([]);
    }
  }, [isOpen, project]);

  // Auto-Save Funktion - NUR LOKALE SPEICHERUNG (schließt Modal NICHT)
  const autoSaveProject = async () => {
    if (!customerName.trim() || !projectName.trim()) return;
    if (isProjectSaved) return; // Bereits gespeichert
    
    console.log('💾 Auto-Save: Speichere Basis-Projekt lokal (Modal bleibt offen)...');
    
    const projectId = project?.id || Date.now().toString();
    
    // WICHTIG: Nur lokale Speicherung - KEIN onSave() Aufruf!
    // onSave() würde das Modal schließen
    setIsProjectSaved(true);
    setCurrentProjectId(projectId);
    
    console.log('✅ Auto-Save: Projekt lokal gespeichert (Modal bleibt offen):', projectId);
    console.log('📝 Kunde:', customerName.trim());
    console.log('📝 Projekt:', projectName.trim());
  };

  // Event Handler für Auto-Save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      autoSaveProject();
    }
  };

  const handleBlur = () => {
    autoSaveProject();
  };

  // Projekt-spezifische Rollen/Skills Management
  // Keine globale DB-Speicherung - nur lokale Auswahl für das Projekt

  const removeRole = (roleId: string) => {
    setSelectedRoles(prev => prev.filter(role => role.id !== roleId));
  };

  const removeSkill = (skillId: string) => {
    setSelectedSkills(prev => prev.filter(skill => skill.id !== skillId));
  };

  // Entfernt: loadExistingRolesAndSkills - nicht mehr benötigt für projekt-spezifische Auswahl

  const canSave = !!customerName.trim() && !!projectName.trim();

  const handleFinalSave = async () => {
    // Stelle sicher, dass das Basis-Projekt gespeichert ist
    await autoSaveProject();
    
    // Finaler Save mit allen aktuellen Daten (inkl. Rollen/Skills)
    const finalProject: ProjectHistoryItem = {
      id: currentProjectId || project?.id || Date.now().toString(),
      projectName: projectName.trim(),
      customer: customerName.trim(),
      role: selectedRoles.length > 0 ? selectedRoles[0].name : '', // Erste Rolle als Haupt-Rolle
      duration: duration.trim(),
      activities: selectedRoles.flatMap(role => role.tasks), // Tasks aus allen Rollen
      status: status,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      plannedAllocationPct: allocation,
      description: description.trim() || undefined,
      comment: comment.trim() || undefined,
      roles: selectedRoles, // Neue Felder für Rollen und Skills
      skills: selectedSkills,
    };
    
    onSave(finalProject);
    onClose();
  };

  const handleDelete = () => {
    if (project && onDelete) {
      onDelete(project.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
          onClick={onClose} 
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <History className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {project ? 'Projekt bearbeiten' : 'Neues historisches Projekt'}
                </h1>
                <p className="text-sm text-orange-600">Projektvergangenheit verwalten</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {project && onDelete && (
                <button 
                  onClick={handleDelete}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Projekt löschen"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </header>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            
            {/* Kunde - Einfaches Textfeld */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kunde
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  placeholder="z.B. BMW, Mercedes, Siemens..."
                />
                {isProjectSaved && customerName.trim() && (
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 text-xs">✓ Gespeichert</span>
                )}
              </div>
            </div>

            {/* Projekt - Einfaches Textfeld */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Projekt
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  placeholder="z.B. E-Commerce Platform, Mobile App..."
                />
                {isProjectSaved && projectName.trim() && (
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 text-xs">✓ Gespeichert</span>
                )}
              </div>
            </div>

            {/* Projektbeschreibung */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Projektbeschreibung (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm resize-none"
                placeholder="Kurze Beschreibung des Projekts, Ziele, verwendete Technologien oder Besonderheiten..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Beschreiben Sie kurz die Projektziele, verwendete Technologien oder Besonderheiten
              </p>
            </div>

            {/* Rollen-Auswahl */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rollen im Projekt</label>
              <div className="space-y-3">
                {selectedRoles.length === 0 ? (
                  <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                    <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Noch keine Rollen ausgewählt</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedRoles.map((role, index) => (
                      <div key={role.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-900">{role.name}</span>
                          <span className="text-xs text-blue-600">({role.tasks.length} Tasks)</span>
                        </div>
                        <button
                          onClick={() => removeRole(role.id)}
                          className="p-1 text-red-500 hover:bg-red-100 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={async () => {
                    await autoSaveProject();
                    setRoleModalOpen(true);
                  }}
                  disabled={!customerName.trim() || !projectName.trim()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Rolle auswählen
                  {isProjectSaved && <span className="text-xs text-green-600">✓</span>}
                </button>
              </div>
            </div>

            {/* Skills-Auswahl */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Benötigte Technical Skills</label>
              <div className="space-y-3">
                {selectedSkills.length === 0 ? (
                  <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                    <Code className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Noch keine Skills ausgewählt</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedSkills.map((skill, index) => (
                      <div key={skill.id} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4 text-purple-600" />
                          <span className="font-medium text-purple-900">{skill.name}</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} className={`text-xs ${star <= skill.level ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => removeSkill(skill.id)}
                          className="p-1 text-red-500 hover:bg-red-100 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={async () => {
                    await autoSaveProject();
                    setSkillModalOpen(true);
                  }}
                  disabled={!customerName.trim() || !projectName.trim()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Skills auswählen
                  {isProjectSaved && <span className="text-xs text-green-600">✓</span>}
                </button>
              </div>
            </div>

            {/* Dauer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dauer</label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                placeholder="z.B. 6 Monate, 2024-2025"
              />
            </div>

            {/* Zeitraum und Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Startdatum</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enddatum</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Auslastung (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={allocation || ''}
                  onChange={(e) => setAllocation(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  placeholder="z.B. 80"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'closed' | 'active')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              >
                <option value="closed">Abgeschlossen</option>
                <option value="active">Aktiv (Historisch relevant)</option>
              </select>
            </div>



            {/* Kommentar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kommentar</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm resize-none"
                placeholder="Zusätzliche Informationen zum Projekt..."
              />
            </div>
          </div>

          {/* Footer */}
          <footer className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button 
              onClick={handleFinalSave} 
              disabled={!canSave}
              className="px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {project ? 'Aktualisieren' : (isProjectSaved ? 'Fertigstellen' : 'Hinzufügen')}
            </button>
          </footer>
        </motion.div>

        {/* Projekt-spezifische Modals (KEINE globale DB-Speicherung) */}
        <ProjectRoleSelectionModal
          isOpen={isRoleModalOpen}
          onClose={() => setRoleModalOpen(false)}
          onRoleSelected={(role) => {
            console.log('🎯 Projekt-Rolle ausgewählt:', JSON.stringify(role, null, 2));
            setSelectedRoles(prev => [...prev, role]);
            setRoleModalOpen(false);
          }}
        />

        <ProjectSkillSelectionModal
          isOpen={isSkillModalOpen}
          onClose={() => setSkillModalOpen(false)}
          onSkillSelected={(skill) => {
            console.log('🛠️ Projekt-Skill ausgewählt:', JSON.stringify(skill, null, 2));
            setSelectedSkills(prev => [...prev, skill]);
            setSkillModalOpen(false);
          }}
        />
      </div>
    </AnimatePresence>
  );
}

export default ProjectHistoryEditorModal;
