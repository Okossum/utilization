import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, Plus, Trash2 } from 'lucide-react';
import { useProjectHistory } from '../../contexts/ProjectHistoryContext';
import { useRoles } from '../../contexts/RoleContext';

import { ProjectHistoryItem } from './EmployeeDossierModal';

interface ProjectHistoryEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectHistoryItem | null;
  onSave: (project: ProjectHistoryItem) => void;
  onDelete?: (projectId: string) => void;
}

export function ProjectHistoryEditorModal({ 
  isOpen, 
  onClose, 
  project, 
  onSave,
  onDelete 
}: ProjectHistoryEditorModalProps) {
  const { 
    historicalCustomers, 
    addHistoricalCustomer, 
    historicalProjects, 
    addHistoricalProject,
    getHistoricalProjectsForCustomer 
  } = useProjectHistory();
  const { getActiveRoles } = useRoles();
  
  // Form state - für historische Daten
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [offeredSkill, setOfferedSkill] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [allocation, setAllocation] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<'closed' | 'active'>('closed');
  const [comment, setComment] = useState<string>('');
  const [activities, setActivities] = useState<string[]>([]);
  
  const projectsForCustomer = useMemo(() => {
    return selectedCustomerId ? getHistoricalProjectsForCustomer(selectedCustomerId) : [];
  }, [selectedCustomerId, getHistoricalProjectsForCustomer]);

  // Initialize form when project changes - für historische Daten
  useEffect(() => {
    if (project) {
      // Edit mode - find historical customer/project by name
      const historicalCustomer = historicalCustomers.find(c => c.name === project.customer);
      const historicalProject = historicalProjects.find(p => p.name === project.projectName && p.customerName === project.customer);
      
      setSelectedCustomerId(historicalCustomer?.id || '');
      setSelectedProjectId(historicalProject?.id || '');
      setOfferedSkill(project.role || '');
      setDuration(project.duration || '');
      setStartDate(project.startDate || '');
      setEndDate(project.endDate || '');
      setAllocation(project.plannedAllocationPct || undefined);
      setStatus(project.status || 'closed');
      setComment(project.comment || '');
      setActivities(project.activities || []);
    } else {
      // Create mode - reset to defaults
      setSelectedCustomerId('');
      setSelectedProjectId('');
      setOfferedSkill('');
      setDuration('');
      setStartDate('');
      setEndDate('');
      setAllocation(undefined);
      setStatus('closed');
      setComment('');
      setActivities([]);
    }
  }, [project, isOpen, historicalCustomers, historicalProjects]);

  // Historische Customer/Project creation handlers - komplett getrennt
  const handleCreateCustomer = async () => {
    const name = newCustomerName.trim();
    if (!name) return;
    const newCustomer = await addHistoricalCustomer(name);
    setSelectedCustomerId(newCustomer.id);
    setNewCustomerName('');
    setCreatingCustomer(false);
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    if (!name || !selectedCustomerId) return;
    
    const selectedCustomer = historicalCustomers.find(c => c.id === selectedCustomerId);
    if (!selectedCustomer) return;
    
    const newProject = await addHistoricalProject(name, selectedCustomerId, selectedCustomer.name);
    setSelectedProjectId(newProject.id);
    setNewProjectName('');
    setCreatingProject(false);
  };

  // Activity management
  const handleActivityChange = (index: number, value: string) => {
    const newActivities = [...activities];
    newActivities[index] = value;
    setActivities(newActivities);
  };

  const addActivity = () => {
    setActivities(prev => [...prev, '']);
  };

  const removeActivity = (index: number) => {
    const newActivities = activities.filter((_, i) => i !== index);
    setActivities(newActivities);
  };

  const canSave = !!selectedCustomerId && !!selectedProjectId;

  const handleSave = () => {
    if (!canSave) return;
    
    const selectedCustomer = historicalCustomers.find(c => c.id === selectedCustomerId);
    const selectedProject = historicalProjects.find(p => p.id === selectedProjectId);
    
    if (!selectedCustomer || !selectedProject) return;
    
    const savedProject: ProjectHistoryItem = {
      id: project?.id || Date.now().toString(),
      projectName: selectedProject.name,
      customer: selectedCustomer.name,
      role: offeredSkill.trim(),
      duration: duration.trim(),
      activities: activities.filter(a => a.trim() !== ''),
      status: status,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      plannedAllocationPct: allocation,
      comment: comment.trim() || undefined,
    };
    
    onSave(savedProject);
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
            
            {/* Historischer Customer Picker - komplett getrennt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Historischer Kunde <span className="text-xs text-gray-500">(Lebenslauf)</span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  value={selectedCustomerId}
                  onChange={(e) => { setSelectedCustomerId(e.target.value); setSelectedProjectId(''); }}
                >
                  <option value="">— bitte wählen —</option>
                  {historicalCustomers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setCreatingCustomer(v => !v)}
                  className="inline-flex items-center gap-1 px-2 py-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100"
                >
                  <Plus className="w-3 h-3" /> Historisch
                </button>
              </div>
              {creatingCustomer && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    placeholder="Historischer Kunde (z.B. ex-Arbeitgeber)..."
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCustomer()}
                  />
                  <button
                    onClick={handleCreateCustomer}
                    className="px-3 py-2 text-xs text-white bg-orange-600 rounded hover:bg-orange-700"
                  >
                    Anlegen
                  </button>
                </div>
              )}
            </div>

            {/* Historisches Project Picker - komplett getrennt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Historisches Projekt <span className="text-xs text-gray-500">(Lebenslauf)</span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={!selectedCustomerId}
                >
                  <option value="">— bitte wählen —</option>
                  {projectsForCustomer.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setCreatingProject(v => !v)}
                  className="inline-flex items-center gap-1 px-2 py-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 disabled:opacity-50"
                  disabled={!selectedCustomerId}
                >
                  <Plus className="w-3 h-3" /> Historisch
                </button>
              </div>
              {creatingProject && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    placeholder="Historisches Projekt..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                  <button
                    onClick={handleCreateProject}
                    className="px-3 py-2 text-xs text-white bg-orange-600 rounded hover:bg-orange-700"
                  >
                    Anlegen
                  </button>
                </div>
              )}
            </div>

            {/* Rolle und Dauer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rolle</label>
                <select 
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm" 
                  value={offeredSkill} 
                  onChange={(e) => setOfferedSkill(e.target.value)}
                >
                  <option value="">— bitte wählen —</option>
                  {getActiveRoles().map(role => (
                    <option key={role.id} value={role.name}>{role.name}</option>
                  ))}
                </select>
              </div>
              
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

            {/* Tätigkeiten */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tätigkeiten im Projekt</label>
              <div className="space-y-3">
                {activities.map((activity, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={activity}
                      onChange={(e) => handleActivityChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      placeholder="z.B. Frontend-Entwicklung, Team-Leadership"
                    />
                    <button
                      type="button"
                      onClick={() => removeActivity(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addActivity}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors border border-orange-200"
                >
                  <Plus className="w-4 h-4" />
                  Tätigkeit hinzufügen
                </button>
              </div>
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
              onClick={handleSave} 
              disabled={!canSave}
              className="px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {project ? 'Aktualisieren' : 'Hinzufügen'}
            </button>
          </footer>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default ProjectHistoryEditorModal;
