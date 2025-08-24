"use client";

import React, { useState } from 'react';
import { Calendar, User, Building2, Clock, Target, FileText, Edit, Trash2, Plus, X, Save, AlertCircle, Users } from 'lucide-react';
interface PlannedProject {
  id: string;
  customerName: string;
  projectName: string;
  roleInProject: string;
  probability: 'prospect' | 'offered' | 'planned' | 'commissioned' | 'on-hold' | 'closed';
  timeframe: {
    start: string;
    end: string;
  };
  projectDescription: string;
  contactPerson: string;
  createdBy: string;
  createdAt: string;
}
interface PlannedProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
}
const mockPlannedProjects: Record<string, PlannedProject[]> = {
  '1': [{
    id: 'planned-1',
    customerName: 'InnovateTech Solutions',
    projectName: 'AI-Powered Analytics Dashboard',
    roleInProject: 'Senior Frontend Developer',
    probability: 'planned',
    timeframe: {
      start: '2024-06-01',
      end: '2024-09-30'
    },
    projectDescription: 'Entwicklung eines fortschrittlichen Analytics Dashboards mit KI-gestützten Insights für Geschäftsdaten. Das System soll Echtzeit-Visualisierungen und prädiktive Analysen bieten.',
    contactPerson: 'Dr. Sarah Mueller (s.mueller@innovatetech.de)',
    createdBy: 'Max Mustermann',
    createdAt: '2024-03-15'
  }, {
    id: 'planned-2',
    customerName: 'GreenEnergy Corp',
    projectName: 'Sustainability Tracking Platform',
    roleInProject: 'Technical Lead',
    probability: 'offered',
    timeframe: {
      start: '2024-07-15',
      end: '2024-12-20'
    },
    projectDescription: 'Plattform zur Verfolgung und Berichterstattung von Nachhaltigkeitsmetriken für Unternehmen. Integration mit IoT-Sensoren und automatisierte Berichtsgenerierung.',
    contactPerson: 'Thomas Weber (t.weber@greenenergy.com)',
    createdBy: 'Anna Schmidt',
    createdAt: '2024-03-20'
  }, {
    id: 'planned-3',
    customerName: 'HealthTech Innovations',
    projectName: 'Patient Management System',
    roleInProject: 'Full Stack Developer',
    probability: 'prospect',
    timeframe: {
      start: '2024-08-01',
      end: '2024-11-30'
    },
    projectDescription: 'Umfassendes Patientenverwaltungssystem für Kliniken mit Terminplanung, Patientenakten und Abrechnungsintegration.',
    contactPerson: 'Dr. Lisa Hoffmann (l.hoffmann@healthtech.de)',
    createdBy: 'Michael Johnson',
    createdAt: '2024-03-25'
  }]
};
const getProbabilityColor = (probability: string) => {
  switch (probability) {
    case 'prospect':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'offered':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'planned':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'commissioned':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'on-hold':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'closed':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};
const getProbabilityLabel = (probability: string) => {
  switch (probability) {
    case 'prospect':
      return 'Prospect (25%)';
    case 'offered':
      return 'Angeboten (50%)';
    case 'planned':
      return 'Geplant (75%)';
    case 'commissioned':
      return 'Beauftragt (100%)';
    case 'on-hold':
      return 'On-hold (50%)';
    case 'closed':
      return 'Closed (0%)';
    default:
      return probability;
  }
};
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
const calculateDuration = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;
  if (months > 0) {
    return `${months} Monat${months > 1 ? 'e' : ''}${days > 0 ? ` ${days} Tag${days > 1 ? 'e' : ''}` : ''}`;
  }
  return `${days} Tag${days > 1 ? 'e' : ''}`;
};
export default function PlannedProjectsModal({
  isOpen,
  onClose,
  employeeId = '1'
}: PlannedProjectsModalProps) {
  const [projects, setProjects] = useState<PlannedProject[]>(mockPlannedProjects[employeeId] || []);
  const [editingProject, setEditingProject] = useState<PlannedProject | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<PlannedProject>>({});
  if (!isOpen) return null;
  const handleCreate = () => {
    setIsCreating(true);
    setEditingProject(null);
    setFormData({
      customerName: '',
      projectName: '',
      roleInProject: '',
      probability: 'prospect',
      timeframe: {
        start: '',
        end: ''
      },
      projectDescription: '',
      contactPerson: '',
      createdBy: 'Current User',
      createdAt: new Date().toISOString().split('T')[0]
    });
  };
  const handleEdit = (project: PlannedProject) => {
    setEditingProject(project);
    setIsCreating(false);
    setFormData(project);
  };
  const handleDelete = (projectId: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie dieses geplante Projekt löschen möchten?')) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
    }
  };
  const handleSave = () => {
    if (!formData.customerName || !formData.projectName || !formData.roleInProject) {
      alert('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }
    if (isCreating) {
      const newProject: PlannedProject = {
        ...(formData as PlannedProject),
        id: `planned-${Date.now()}`,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setProjects(prev => [...prev, newProject]);
    } else if (editingProject) {
      setProjects(prev => prev.map(p => p.id === editingProject.id ? {
        ...(formData as PlannedProject)
      } : p));
    }
    setIsCreating(false);
    setEditingProject(null);
    setFormData({});
  };
  const handleCancel = () => {
    setIsCreating(false);
    setEditingProject(null);
    setFormData({});
  };
  const isFormMode = isCreating || editingProject !== null;
  return <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  <span>Geplante Projekte</span>
                </h2>
                <p className="text-sm text-gray-600">
                  <span>Übersicht zukünftiger Projektmöglichkeiten</span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!isFormMode && <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Neues Projekt</span>
                </button>}
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isFormMode ? (/* Form Mode */
        <div className="p-6">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  <span>{isCreating ? 'Neues geplantes Projekt erstellen' : 'Geplantes Projekt bearbeiten'}</span>
                </h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span>Kundenname *</span>
                      </label>
                      <input type="text" value={formData.customerName || ''} onChange={e => setFormData(prev => ({
                    ...prev,
                    customerName: e.target.value
                  }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Name des Kunden" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span>Projektname *</span>
                      </label>
                      <input type="text" value={formData.projectName || ''} onChange={e => setFormData(prev => ({
                    ...prev,
                    projectName: e.target.value
                  }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Name des Projekts" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span>Rolle im Projekt *</span>
                      </label>
                      <input type="text" value={formData.roleInProject || ''} onChange={e => setFormData(prev => ({
                    ...prev,
                    roleInProject: e.target.value
                  }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ihre Rolle im Projekt" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span>Wahrscheinlichkeit</span>
                      </label>
                      <select value={formData.probability || 'prospect'} onChange={e => setFormData(prev => ({
                    ...prev,
                    probability: e.target.value as PlannedProject['probability']
                  }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="prospect">Prospect (25%)</option>
                        <option value="offered">Angeboten (50%)</option>
                        <option value="planned">Geplant (75%)</option>
                        <option value="commissioned">Beauftragt (100%)</option>
                        <option value="on-hold">On-hold (50%)</option>
                        <option value="closed">Closed (0%)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span>Projektstart</span>
                      </label>
                      <input type="date" value={formData.timeframe?.start || ''} onChange={e => setFormData(prev => ({
                    ...prev,
                    timeframe: {
                      ...prev.timeframe,
                      start: e.target.value,
                      end: prev.timeframe?.end || ''
                    }
                  }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span>Projektende</span>
                      </label>
                      <input type="date" value={formData.timeframe?.end || ''} onChange={e => setFormData(prev => ({
                    ...prev,
                    timeframe: {
                      ...prev.timeframe,
                      start: prev.timeframe?.start || '',
                      end: e.target.value
                    }
                  }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span>Ansprechpartner</span>
                    </label>
                    <input type="text" value={formData.contactPerson || ''} onChange={e => setFormData(prev => ({
                  ...prev,
                  contactPerson: e.target.value
                }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Name und Kontaktdaten des Ansprechpartners" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span>Projektbeschreibung</span>
                    </label>
                    <textarea value={formData.projectDescription || ''} onChange={e => setFormData(prev => ({
                  ...prev,
                  projectDescription: e.target.value
                }))} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Detaillierte Beschreibung des Projekts" />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                  <button onClick={handleCancel} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    <span>Abbrechen</span>
                  </button>
                  <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Speichern</span>
                  </button>
                </div>
              </div>
            </div>) : (/* List Mode */
        <div className="p-6">
              {projects.length === 0 ? <div className="text-center py-12">
                  <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    <span>Keine geplanten Projekte</span>
                  </h3>
                  <p className="text-gray-500 mb-6">
                    <span>Erstellen Sie Ihr erstes geplantes Projekt, um zukünftige Möglichkeiten zu verfolgen.</span>
                  </p>
                  <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto">
                    <Plus className="w-4 h-4" />
                    <span>Erstes Projekt erstellen</span>
                  </button>
                </div> : <div className="space-y-4">
                  {projects.map(project => <div key={project.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              <span>{project.projectName}</span>
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getProbabilityColor(project.probability)}`}>
                              <span>{getProbabilityLabel(project.probability)}</span>
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <span>{project.customerName}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span>{project.roleInProject}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>
                                {project.timeframe.start && project.timeframe.end ? `${formatDate(project.timeframe.start)} - ${formatDate(project.timeframe.end)}` : 'Zeitraum nicht definiert'}
                              </span>
                            </div>
                            {project.contactPerson && <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span>{project.contactPerson}</span>
                              </div>}
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span>Erstellt von {project.createdBy}</span>
                            </div>
                            {project.timeframe.start && project.timeframe.end && <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span>{calculateDuration(project.timeframe.start, project.timeframe.end)}</span>
                              </div>}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <button onClick={() => handleEdit(project)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Bearbeiten">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(project.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Löschen">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {project.projectDescription && <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-start space-x-2">
                            <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-600 leading-relaxed">
                              <span>{project.projectDescription}</span>
                            </p>
                          </div>
                        </div>}
                    </div>)}
                </div>}
            </div>)}
        </div>
      </div>
    </div>;
}