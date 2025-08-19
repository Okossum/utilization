import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Briefcase } from 'lucide-react';

export interface SimpleProject {
  id: string;
  customer: string;
  role: string;
  activities: string;
  duration: string;
}

interface SimpleProjectListProps {
  projects: SimpleProject[];
  onChange: (projects: SimpleProject[]) => void;
}

export function SimpleProjectList({ projects, onChange }: SimpleProjectListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<SimpleProject, 'id'>>({
    customer: '',
    role: '',
    activities: '',
    duration: ''
  });

  const handleAdd = () => {
    if (formData.customer && formData.role && formData.activities && formData.duration) {
      const newProject: SimpleProject = {
        id: Date.now().toString(),
        ...formData
      };
      onChange([...projects, newProject]);
      setFormData({ customer: '', role: '', activities: '', duration: '' });
      setIsAdding(false);
    }
  };

  const handleEdit = (project: SimpleProject) => {
    setEditingId(project.id);
    setFormData({
      customer: project.customer,
      role: project.role,
      activities: project.activities,
      duration: project.duration
    });
  };

  const handleSaveEdit = () => {
    if (editingId && formData.customer && formData.role && formData.activities && formData.duration) {
      const updatedProjects = projects.map(p => 
        p.id === editingId 
          ? { ...p, ...formData }
          : p
      );
      onChange(updatedProjects);
      setEditingId(null);
      setFormData({ customer: '', role: '', activities: '', duration: '' });
    }
  };

  const handleDelete = (id: string) => {
    onChange(projects.filter(p => p.id !== id));
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ customer: '', role: '', activities: '', duration: '' });
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-green-600" />
        Projekte
      </h2>
      
      {/* Projektliste */}
      <div className="space-y-3">
        {(projects || []).map(project => (
          <div key={project.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-gray-900">{project.customer}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(project)}
                  className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-700">
              <div><span className="font-medium">Rolle:</span> {project.role}</div>
              <div><span className="font-medium">Dauer:</span> {project.duration}</div>
              <div className="md:col-span-3"><span className="font-medium">Tätigkeiten:</span> {project.activities}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Neues Projekt hinzufügen */}
      {isAdding && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-3">Neues Projekt hinzufügen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Kunde"
              value={formData.customer}
              onChange={e => setFormData(prev => ({ ...prev, customer: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Rolle im Projekt"
              value={formData.role}
              onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Dauer im Projekt"
              value={formData.duration}
              onChange={e => setFormData(prev => ({ ...prev, duration: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Tätigkeiten im Projekt"
              value={formData.activities}
              onChange={e => setFormData(prev => ({ ...prev, activities: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 md:col-span-2"
              rows={2}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAdd}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Hinzufügen
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Projekt bearbeiten */}
      {editingId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-900 mb-3">Projekt bearbeiten</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Kunde"
              value={formData.customer}
              onChange={e => setFormData(prev => ({ ...prev, customer: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Rolle im Projekt"
              value={formData.role}
              onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Dauer im Projekt"
              value={formData.duration}
              onChange={e => setFormData(prev => ({ ...prev, duration: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Tätigkeiten im Projekt"
              value={formData.activities}
              onChange={e => setFormData(prev => ({ ...prev, activities: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 md:col-span-2"
              rows={2}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
            >
              Speichern
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Button zum Hinzufügen */}
      {!isAdding && !editingId && (
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Projekt hinzufügen
        </button>
      )}
    </section>
  );
}
