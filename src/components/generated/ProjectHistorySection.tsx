import React, { useState } from 'react';
import { Trash2, Pencil, History, Building, User, Target, Calendar, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { ProjectHistoryItem } from './EmployeeDossierModal';

interface ProjectHistorySectionProps {
  employeeName: string;
  projectHistory: ProjectHistoryItem[];
  onChange: (projects: ProjectHistoryItem[]) => void;
  onEdit?: (project: ProjectHistoryItem) => void;
  className?: string;
}

export function ProjectHistorySection({ 
  employeeName, 
  projectHistory, 
  onChange, 
  onEdit,
  className = '' 
}: ProjectHistorySectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  
  // Neues Projekt hinzufügen
  const handleAddProject = () => {
    const newProject: ProjectHistoryItem = {
      id: Date.now().toString(),
      projectName: 'Neues Projekt',
      customer: '',
      role: '',
      duration: '',
      activities: [],
      status: 'closed', // Standard-Status für historische Projekte
      startDate: '',
      endDate: '',
      plannedAllocationPct: undefined,
      comment: ''
    };
    
    onChange([...projectHistory, newProject]);
    
    // Optional: Direkt ins Edit-Modal springen
    if (onEdit) {
      onEdit(newProject);
    }
  };

  // Projekt löschen
  const handleDeleteProject = (projectId: string) => {
    const updatedHistory = projectHistory.filter(p => p.id !== projectId);
    onChange(updatedHistory);
  };

  // ProjectCard Component - identisch zu AssignmentsList aber angepasst für Historie
  const ProjectCard = ({ project }: { project: ProjectHistoryItem }) => {
    // Für Historie: Standard-Wahrscheinlichkeit
    const getProbabilityFromStatus = (status: string) => {
      switch (status) {
        case 'closed': return 100; // Abgeschlossen = 100% erreicht
        case 'active': return 90; // Noch aktiv aber historisch relevant
        default: return 100;
      }
    };

    const probability = getProbabilityFromStatus(project.status);

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4 hover:from-orange-100 hover:to-amber-100 transition-colors"
      >
        {/* Header mit Aktionen */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-orange-900 truncate">
              {project.projectName}
            </h4>
            {project.customer && (
              <div className="flex items-center gap-1 mt-1">
                <Building className="w-3 h-3 text-orange-500" />
                <span className="text-sm text-orange-700">{project.customer}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 ml-3 shrink-0">
            {onEdit && (
              <button 
                onClick={() => onEdit(project)} 
                className="p-1 text-gray-400 hover:text-orange-600 rounded transition-colors" 
                title="Bearbeiten"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleDeleteProject(project.id)}
              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
              title="Löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Projekt-Details in kompakter Form */}
        <div className="space-y-2">
          {/* Rolle und Auslastung in einer Zeile */}
          <div className="flex items-center justify-between">
            {project.role && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-700">
                  <span className="font-medium">Rolle:</span> {project.role}
                </span>
              </div>
            )}
            {typeof project.plannedAllocationPct === 'number' && (
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-700">
                  <span className="font-medium">Auslastung:</span> {project.plannedAllocationPct}%
                </span>
              </div>
            )}
          </div>

          {/* Dauer und Zeitraum in einer Zeile */}
          <div className="flex items-center justify-between">
            {project.duration && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-700">
                  <span className="font-medium">Dauer:</span> {project.duration}
                </span>
              </div>
            )}
            {(project.startDate || project.endDate) && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-700">
                  <span className="font-medium">Zeitraum:</span> {project.startDate || '—'} → {project.endDate || '—'}
                </span>
              </div>
            )}
          </div>

          {/* Tätigkeiten anzeigen */}
          {project.activities && project.activities.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-medium text-orange-700 mb-2">Tätigkeiten:</div>
              <div className="flex flex-wrap gap-1">
                {project.activities.slice(0, 3).map((activity, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full border border-orange-200"
                  >
                    {activity}
                  </span>
                ))}
                {project.activities.length > 3 && (
                  <span className="inline-block px-2 py-1 text-xs bg-orange-50 text-orange-600 rounded-full border border-orange-200">
                    +{project.activities.length - 3} weitere
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Kommentar (falls vorhanden) */}
          {project.comment && (
            <div className="text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded border-l-2 border-orange-200">
              💬 {project.comment}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            project.status === 'closed' ? 'bg-gray-100 text-gray-800' :
            project.status === 'active' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {project.status === 'closed' ? 'Abgeschlossen' : 
             project.status === 'active' ? 'Aktiv (Historisch)' : 
             project.status}
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <section className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-orange-600" />
            Projektvergangenheit
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {projectHistory.length} abgeschlossene(s) Projekt(e) aus der Vergangenheit
          </p>
        </div>
        
        {/* Add Button */}
        <button
          onClick={handleAddProject}
          className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors border border-orange-200"
          title="Historisches Projekt hinzufügen"
        >
          <Plus className="w-4 h-4" />
          Projekt hinzufügen
        </button>
      </div>

      {/* Projekt-Karten */}
      <AnimatePresence>
        {projectHistory.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-gray-500"
          >
            <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Noch keine historischen Projekte erfasst.</p>
            <p className="text-sm">Verwenden Sie den Button oben, um vergangene Projekte hinzuzufügen.</p>
          </motion.div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projectHistory.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default ProjectHistorySection;
