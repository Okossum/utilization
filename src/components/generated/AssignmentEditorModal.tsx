import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Building2, Plus } from 'lucide-react';
import { useCustomers } from '../../contexts/CustomerContext';
import { useAssignments } from '../../contexts/AssignmentsContext';

interface AssignmentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  onAssignmentCreated?: () => void;
}

export function AssignmentEditorModal({ isOpen, onClose, employeeName, onAssignmentCreated }: AssignmentEditorModalProps) {
  const { customers, projects, addCustomer, addProject } = useCustomers();
  const { linkEmployeeToProject, getAssignmentsForEmployee, assignmentsByEmployee } = useAssignments();

  // Reset state when employeeName changes or modal opens
  useEffect(() => {
    if (employeeName && isOpen) {
      setSelectedCustomer('');
      setSelectedProjectId('');
      setStartDate('');
      setEndDate('');
      setOfferedSkill('');
      setAllocation(100);
      setStatus('planned');
      setProbability(50);
      setComment('');
      
      // Load existing assignments for this employee
      getAssignmentsForEmployee(employeeName);
    }
  }, [employeeName, isOpen, getAssignmentsForEmployee]);

  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [offeredSkill, setOfferedSkill] = useState<string>('');
  const [allocation, setAllocation] = useState<number>(100);
  const [status, setStatus] = useState<'prospect'|'planned'|'active'|'onHold'|'closed'>('planned');
  const [probability, setProbability] = useState<number>(50);
  const [comment, setComment] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const projectsForCustomer = useMemo(() => {
    return projects.filter(p => !selectedCustomer || p.customer === selectedCustomer);
  }, [projects, selectedCustomer]);

  if (!isOpen) return null;

  const handleCreateCustomer = async () => {
    const name = newCustomerName.trim();
    if (!name) return;
    await addCustomer(name);
    setSelectedCustomer(name);
    setNewCustomerName('');
    setCreatingCustomer(false);
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    const customer = selectedCustomer.trim();
    if (!name || !customer) return;
    await addProject(name, customer);
    // Wähle das neu erstellte Projekt anhand von Name+Customer
    const created = projects.find(p => p.name === name && p.customer === customer);
    if (created) setSelectedProjectId(created.id);
    setNewProjectName('');
    setCreatingProject(false);
  };

  const canSave = !!employeeName && !!selectedProjectId;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await linkEmployeeToProject(employeeName, selectedProjectId, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        offeredSkill: offeredSkill || undefined,
        plannedAllocationPct: Number.isFinite(allocation) ? allocation : undefined,
        status,
        probability: (status === 'planned' || status === 'onHold') ? probability : undefined,
        comment: comment || undefined,
      });
      
      // Rufe Callback auf, um die AssignmentsList zu aktualisieren
      if (onAssignmentCreated) {
        onAssignmentCreated();
      }
      
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
          />
          <motion.div 
            className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2 text-gray-900 font-medium">
                <Link2 className="w-4 h-4 text-blue-600" />
                Projektzuordnung für {employeeName}
              </div>
              <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500"/>
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Customer Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kunde</label>
                <div className="flex items-center gap-2">
                  <select
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={selectedCustomer}
                    onChange={(e) => { setSelectedCustomer(e.target.value); setSelectedProjectId(''); }}
                  >
                    <option value="">— bitte wählen —</option>
                    {customers.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setCreatingCustomer(v => !v)}
                    className="inline-flex items-center gap-1 px-2 py-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                  >
                    <Plus className="w-3 h-3" /> Kunde
                  </button>
                </div>
                {creatingCustomer && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Neuer Kunde..."
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateCustomer()}
                    />
                    <button
                      onClick={handleCreateCustomer}
                      className="px-3 py-2 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                      Anlegen
                    </button>
                  </div>
                )}
              </div>

              {/* Project Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Projekt</label>
                <div className="flex items-center gap-2">
                  <select
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    disabled={!selectedCustomer}
                  >
                    <option value="">— bitte wählen —</option>
                    {projectsForCustomer.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setCreatingProject(v => !v)}
                    className="inline-flex items-center gap-1 px-2 py-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50"
                    disabled={!selectedCustomer}
                  >
                    <Plus className="w-3 h-3" /> Projekt
                  </button>
                </div>
                {creatingProject && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Neues Projekt..."
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                    />
                    <button
                      onClick={handleCreateProject}
                      className="px-3 py-2 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                      Anlegen
                    </button>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                  <input type="date" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enddatum</label>
                  <input type="date" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Angebotener Skill</label>
                  <input type="text" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" value={offeredSkill} onChange={(e) => setOfferedSkill(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Geplante Auslastung (%)</label>
                  <input type="number" min={0} max={100} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" value={allocation} onChange={(e) => setAllocation(parseInt(e.target.value || '0'))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                    <option value="prospect">Prospect</option>
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="onHold">On Hold</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                {(status === 'planned' || status === 'onHold') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Wahrscheinlichkeit</label>
                    <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" value={probability} onChange={(e) => setProbability(parseInt(e.target.value))}>
                      <option value={25}>25%</option>
                      <option value={50}>50%</option>
                      <option value={75}>75%</option>
                    </select>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kommentar</label>
                  <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
              <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Abbrechen</button>
              <button onClick={onSave} disabled={!canSave || saving} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Speichern…' : 'Zuordnen'}
              </button>
            </div>

            {/* Bestehende Zuordnungen anzeigen */}
            <div className="border-t border-gray-200">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900">
                  Bestehende Zuordnungen für {employeeName}
                  <span className="ml-2 text-sm text-gray-500">
                    ({assignmentsByEmployee[employeeName]?.length || 0} gefunden)
                  </span>
                </h3>
              </div>
              <div className="p-4 max-h-[40vh] overflow-y-auto">
                {(() => {
                  const existingAssignments = assignmentsByEmployee[employeeName] || [];
                  if (existingAssignments.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        Keine bestehenden Zuordnungen vorhanden.
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-3">
                      {existingAssignments.map(assignment => (
                        <div key={assignment.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {assignment.customer || 'Unbekannter Kunde'}
                                {assignment.projectName && (
                                  <span className="ml-2 text-sm font-normal text-gray-600">
                                    · {assignment.projectName}
                                  </span>
                                )}
                                {!assignment.projectName && assignment.projectId && (
                                  <span className="ml-2 text-sm font-normal text-gray-600">
                                    · {assignment.projectId}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                Status: {assignment.status} | 
                                {assignment.plannedAllocationPct && ` ${assignment.plannedAllocationPct}% |`}
                                {assignment.startDate && ` ${assignment.startDate} → ${assignment.endDate || '—'}`}
                              </div>
                              {assignment.comment && (
                                <div className="text-sm text-gray-500 mt-1">{assignment.comment}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

  );
}

export default AssignmentEditorModal;


