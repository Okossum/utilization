import React from 'react';
import { Edit, Trash2, User } from 'lucide-react';
import type { ProjectHistoryItem } from '../../lib/types';

interface ProjectTableProps {
  projects: ProjectHistoryItem[];
  type: 'active' | 'planned' | 'historical';
  onEdit?: (project: ProjectHistoryItem) => void;
  onDelete?: (projectId: string) => void;
  onView?: (project: ProjectHistoryItem) => void;
  compact?: boolean;
}

export function ProjectTable({ projects, type, onEdit, onDelete, onView, compact = false }: ProjectTableProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p className="text-xs">Keine Projekte vorhanden</p>
      </div>
    );
  }

  // Spalten basierend auf Projekttyp definieren
  const getColumns = () => {
    const baseColumns = [
      { key: 'project', label: 'Projekt', width: 'w-1/3' },
      { key: 'customer', label: 'Kunde', width: 'w-1/5' },
    ];

    if (type === 'historical') {
      return [
        ...baseColumns,
        { key: 'duration', label: 'Zeitraum', width: 'w-1/5' },
        { key: 'roles', label: 'Rollen', width: 'w-1/5' },
        { key: 'skills', label: 'Skills', width: 'w-1/5' },
        { key: 'actions', label: '', width: 'w-16' }
      ];
    }

    if (type === 'planned') {
      return [
        ...baseColumns,
        { key: 'timeframe', label: 'Zeitraum', width: 'w-1/6' },
        { key: 'probability', label: 'Wahrscheinlichkeit', width: 'w-1/8' },
        { key: 'dailyRate', label: 'Tagessatz', width: 'w-1/8' },
        { key: 'contact', label: 'Kontakt', width: 'w-1/6' },
        { key: 'actions', label: '', width: 'w-16' }
      ];
    }

    // active projects
    return [
      ...baseColumns,
      { key: 'timeframe', label: 'Zeitraum', width: 'w-1/5' },
      { key: 'dailyRate', label: 'Tagessatz', width: 'w-1/6' },
      { key: 'contact', label: 'Kontakt', width: 'w-1/5' },
      { key: 'actions', label: '', width: 'w-12' }
    ];
  };

  const columns = getColumns();

  const formatTimeframe = (project: ProjectHistoryItem) => {
    if (project.startDate && project.endDate) {
      const start = new Date(project.startDate).toLocaleDateString('de-DE', { 
        month: 'short', 
        year: '2-digit' 
      });
      const end = new Date(project.endDate).toLocaleDateString('de-DE', { 
        month: 'short', 
        year: '2-digit' 
      });
      return `${start} - ${end}`;
    }
    return project.duration || '-';
  };

  const formatProbability = (probability?: number) => {
    if (!probability) return '-';
    
    const getColor = (prob: number) => {
      if (prob >= 80) return 'text-green-700 bg-green-100';
      if (prob >= 50) return 'text-yellow-700 bg-yellow-100';
      return 'text-red-700 bg-red-100';
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getColor(probability)}`}>
        {probability}%
      </span>
    );
  };

  const formatDailyRate = (rate?: number) => {
    if (!rate) return '-';
    return `${rate.toLocaleString('de-DE')}€`;
  };

  const formatContact = (project: ProjectHistoryItem) => {
    if (project.customerContact) {
      return (
        <div className="text-xs">
          <span className="truncate">{project.customerContact}</span>
        </div>
      );
    }
    return '-';
  };

  const formatRoles = (project: ProjectHistoryItem) => {
    if (!project.roles || project.roles.length === 0) return '-';
    
    return (
      <div className="flex flex-wrap gap-1">
        {project.roles.slice(0, 2).map((role, index) => (
          <span 
            key={index}
            className="inline-flex px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded"
          >
            {role.roleName || role.name || 'Rolle'}
          </span>
        ))}
        {project.roles.length > 2 && (
          <span className="text-xs text-gray-500">
            +{project.roles.length - 2}
          </span>
        )}
      </div>
    );
  };

  const formatSkills = (project: ProjectHistoryItem) => {
    if (!project.skills || project.skills.length === 0) return '-';
    
    return (
      <div className="flex flex-wrap gap-1">
        {project.skills.slice(0, 2).map((skill, index) => (
          <span 
            key={index}
            className="inline-flex px-2 py-1 text-xs font-medium bg-cyan-100 text-cyan-800 rounded"
          >
            {skill.skillName || skill.name || 'Skill'}
          </span>
        ))}
        {project.skills.length > 2 && (
          <span className="text-xs text-gray-500">
            +{project.skills.length - 2}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        {/* Header */}
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.width}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="bg-white divide-y divide-gray-200">
          {projects.map((project) => (
            <tr key={project.id} className="hover:bg-gray-50 transition-colors">
              {/* Projekt */}
              <td className="px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {project.projectName}
                  </div>
                  {project.description && (
                    <div className="text-xs text-gray-500 truncate mt-1">
                      {project.description}
                    </div>
                  )}
                </div>
              </td>

              {/* Kunde */}
              <td className="px-3 py-2">
                <span className="text-sm text-gray-900 truncate">{project.customer}</span>
              </td>

              {/* Zeitraum/Dauer */}
              <td className="px-3 py-2">
                <span className="text-sm text-gray-900">{formatTimeframe(project)}</span>
              </td>

              {/* Typ-spezifische Spalten */}
              {type === 'planned' && (
                <>
                  {/* Wahrscheinlichkeit */}
                  <td className="px-3 py-2">
                    {formatProbability(project.probability)}
                  </td>
                  {/* Tagessatz */}
                  <td className="px-3 py-2">
                    <span className="text-sm text-gray-900">{formatDailyRate(project.dailyRate)}</span>
                  </td>
                  {/* Kontakt */}
                  <td className="px-3 py-2">
                    {formatContact(project)}
                  </td>
                </>
              )}

              {type === 'active' && (
                <>
                  {/* Tagessatz */}
                  <td className="px-3 py-2">
                    <span className="text-sm text-gray-900">{formatDailyRate(project.dailyRate)}</span>
                  </td>
                  {/* Kontakt */}
                  <td className="px-3 py-2">
                    {formatContact(project)}
                  </td>
                </>
              )}

              {type === 'historical' && (
                <>
                  {/* Rollen */}
                  <td className="px-3 py-2">
                    {formatRoles(project)}
                  </td>
                  {/* Skills */}
                  <td className="px-3 py-2">
                    {formatSkills(project)}
                  </td>
                </>
              )}

              {/* Actions */}
              <td className="px-3 py-2">
                <div className="flex items-center gap-1">
                  {onView && (
                    <button
                      onClick={() => onView(project)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Projekt anzeigen"
                    >
                      <User className="w-3 h-3" />
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(project)}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      title="Bearbeiten"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(project.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
