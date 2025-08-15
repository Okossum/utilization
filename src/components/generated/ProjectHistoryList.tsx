import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, History, Save, X } from 'lucide-react';
import { ProjectHistoryItem } from './EmployeeDossierModal';
import { CustomerManager } from './CustomerManager';
import { useCustomers } from '../../contexts/CustomerContext';
interface ProjectHistoryListProps {
  projects: ProjectHistoryItem[];
  onChange: (projects: ProjectHistoryItem[]) => void;
}
export function ProjectHistoryList({
  projects,
  onChange
}: ProjectHistoryListProps) {
  const { customers, addCustomer } = useCustomers();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<ProjectHistoryItem, 'id'>>({
    projectName: '',
    customer: '',
    role: '',
    duration: ''
  });
  const handleAdd = () => {
    const newProject: ProjectHistoryItem = {
      id: Date.now().toString(),
      projectName: 'Neues Projekt',
      customer: '',
      role: '',
      duration: ''
    };
    onChange([...projects, newProject]);
    setEditingId(newProject.id);
    setEditForm({
      projectName: newProject.projectName,
      customer: newProject.customer,
      role: newProject.role,
      duration: newProject.duration
    });
  };
  const handleEdit = (project: ProjectHistoryItem) => {
    setEditingId(project.id);
    setEditForm({
      projectName: project.projectName,
      customer: project.customer,
      role: project.role,
      duration: project.duration
    });
  };
  const handleSave = () => {
    if (editingId) {
      const updatedProjects = projects.map(project => project.id === editingId ? {
        ...project,
        ...editForm
      } : project);
      onChange(updatedProjects);
      setEditingId(null);
    }
  };
  const handleCancel = () => {
    setEditingId(null);
    setEditForm({
      projectName: '',
      customer: '',
      role: '',
      duration: ''
    });
  };
  const handleDelete = (id: string) => {
    onChange(projects.filter(project => project.id !== id));
    if (editingId === id) {
      setEditingId(null);
    }
  };
  return <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          Projekt-Kurzlebenslauf
        </h2>
        <button onClick={handleAdd} className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
          <Plus className="w-4 h-4" />
          Projekt hinzufügen
        </button>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {projects.map(project => <motion.div key={project.id} initial={{
          opacity: 0,
          y: -10
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          y: -10
        }} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              {editingId === project.id ? <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Projektname</label>
                      <input type="text" value={editForm.projectName} onChange={e => setEditForm(prev => ({
                  ...prev,
                  projectName: e.target.value
                }))} className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Kunde</label>
                      <CustomerManager
                        customers={customers}
                        onAddCustomer={addCustomer}
                        value={editForm.customer}
                        onChange={(customer) => setEditForm(prev => ({
                          ...prev,
                          customer
                        }))}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Rolle</label>
                      <input type="text" value={editForm.role} onChange={e => setEditForm(prev => ({
                  ...prev,
                  role: e.target.value
                }))} className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Dauer</label>
                      <input type="text" value={editForm.duration} onChange={e => setEditForm(prev => ({
                  ...prev,
                  duration: e.target.value
                }))} className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="z.B. 6 Monate" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleSave} className="flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors">
                      <Save className="w-3 h-3" />
                      Speichern
                    </button>
                    <button onClick={handleCancel} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors">
                      <X className="w-3 h-3" />
                      Abbrechen
                    </button>
                  </div>
                </div> :                 <div className="flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{project.projectName}</p>
                      <p className="text-xs text-gray-500">Projekt</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{project.customer || '—'}</p>
                      <p className="text-xs text-gray-500">Kunde</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{project.role}</p>
                      <p className="text-xs text-gray-500">Rolle</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{project.duration}</p>
                      <p className="text-xs text-gray-500">Dauer</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button onClick={() => handleEdit(project)} className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(project.id)} className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>}
            </motion.div>)}
        </AnimatePresence>

        {projects.length === 0 && <div className="text-center py-8 text-gray-500">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Noch keine Projekte hinzugefügt</p>
          </div>}
      </div>
    </section>;
}