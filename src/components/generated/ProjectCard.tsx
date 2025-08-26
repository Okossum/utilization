import React from 'react';
import { 
  Building, 
  User, 
  Calendar, 
  Euro, 
  Ticket, 
  Pencil, 
  Trash2, 
  Clock, 
  Target,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { ProjectCardProps } from '../../types/projects';
import { getProjectTypeColor, getProbabilityColor, formatCurrency, formatProjectDuration } from '../../utils/projectUtils';

export function ProjectCard({ 
  project, 
  type, 
  onEdit, 
  onDelete, 
  onView,
  compact = false 
}: ProjectCardProps) {

  const getProbabilityIcon = (probability?: number) => {
    if (!probability) return null;
    
    if (probability >= 100) return <CheckCircle className="w-3 h-3" />;
    if (probability >= 75) return <Target className="w-3 h-3" />;
    if (probability >= 50) return <TrendingUp className="w-3 h-3" />;
    return <AlertCircle className="w-3 h-3" />;
  };

  const getProbabilityBadge = () => {
    if (type !== 'planned' || !project.probability) return null;
    
    return (
      <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${getProbabilityColor(project.probability)}`}>
        {getProbabilityIcon(project.probability)}
        <span>{project.probability}%</span>
      </div>
    );
  };

  const getProjectSourceBadge = () => {
    if (!project.projectSource) return null;
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${
        project.projectSource === 'jira' 
          ? 'bg-purple-100 text-purple-800' 
          : 'bg-blue-100 text-blue-800'
      }`}>
        {project.projectSource === 'jira' ? 'JIRA' : 'Regulär'}
      </span>
    );
  };

  const duration = formatProjectDuration(project.startDate, project.endDate, project.duration);

  return (
    <div className={`rounded-lg border p-4 transition-all hover:shadow-md ${getProjectTypeColor(type)} ${
      compact ? 'p-3' : 'p-4'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className={`font-semibold ${compact ? 'text-sm' : 'text-base'}`}>
            {project.projectName}
          </h4>
          <div className="flex items-center space-x-2 mt-1">
            {getProbabilityBadge()}
            {getProjectSourceBadge()}
          </div>
        </div>
        
        {/* Action Buttons - nur in normaler Version, nicht in kompakter */}
        {!compact && (
          <div className="flex space-x-1 ml-2">
            {onEdit && (
              <button
                onClick={() => onEdit(project)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-white rounded transition-colors"
                title="Bearbeiten"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(project.id)}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-white rounded transition-colors"
                title="Löschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Project Details Grid */}
      <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} text-sm`}>
        {/* Customer */}
        <div className="flex items-center space-x-2">
          <Building className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="truncate">{project.customer}</span>
        </div>

        {/* Duration/Dates - Enhanced for historical projects */}
        {(type === 'historical' || !project.projectType) ? (
          project.startDate && project.endDate ? (
            /* Neue Projekte mit Start-/Enddatum */
            <div className="md:col-span-2 space-y-2">
              {/* Date Range */}
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm">
                  <span className="font-medium">{new Date(project.startDate).toLocaleDateString('de-DE')}</span>
                  <span className="text-gray-400 mx-2">bis</span>
                  <span className="font-medium">{new Date(project.endDate).toLocaleDateString('de-DE')}</span>
                </span>
              </div>
              
              {/* Total Duration with emphasis */}
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm">
                  <span className="text-gray-600">Gesamtdauer:</span>
                  <span className="font-semibold text-blue-700 ml-2">{duration}</span>
                </span>
              </div>
            </div>
          ) : (
            /* Alte Projekte nur mit Dauer */
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-sm">
                <span className="text-gray-600">Dauer:</span>
                <span className="font-semibold text-blue-700 ml-2">{duration}</span>
              </span>
            </div>
          )
        ) : (
          /* Fallback for other project types */
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="truncate">{duration}</span>
          </div>
        )}

        {/* Daily Rate */}
        {project.dailyRate && (
          <div className="flex items-center space-x-2">
            <Euro className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span>{formatCurrency(project.dailyRate)}/Tag</span>
          </div>
        )}

        {/* JIRA Ticket */}
        {project.jiraTicketId && (
          <div className="flex items-center space-x-2">
            <Ticket className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="font-mono text-xs">{project.jiraTicketId}</span>
          </div>
        )}

        {/* Internal Contact */}
        {project.internalContact && (
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="truncate">Ansprechpartner</span>
          </div>
        )}

        {/* Customer Contact */}
        {project.customerContact && (
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="truncate">{project.customerContact}</span>
          </div>
        )}
      </div>

      {/* Roles & Skills */}
      {(project.roles?.length > 0 || project.skills?.length > 0) && (
        <div className="mt-3 space-y-2">
          {/* Roles */}
          {project.roles?.length > 0 && (
            <div>
              <div className="text-xs text-gray-600 mb-1">Rollen:</div>
              <div className="flex flex-wrap gap-1">
                {project.roles.map((role, index) => (
                  <span 
                    key={role.id || `role-${index}`} 
                    className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium"
                    title={`${role.categoryName}: ${role.tasks?.join(', ') || ''}`}
                  >
                    {role.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {project.skills?.length > 0 && (
            <div>
              <div className="text-xs text-gray-600 mb-1">Skills:</div>
              <div className="flex flex-wrap gap-1">
                {project.skills.map((skill, index) => (
                  <span 
                    key={skill.id || `skill-${index}`} 
                    className="bg-cyan-100 text-cyan-800 px-2 py-1 rounded text-xs font-medium"
                    title={`${skill.categoryName}: Level ${skill.level}/5`}
                  >
                    {skill.name} ({skill.level}★)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Project Description */}
      {project.description && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-200">
          <div className="text-xs text-gray-600 mb-1 font-medium">Projektbeschreibung:</div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {project.description}
          </p>
        </div>
      )}

      {/* Legacy Activities (nur für historische Projekte) */}
      {type === 'historical' && project.activities?.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-600 mb-1">Tätigkeiten:</div>
          <ul className="text-xs text-gray-700 space-y-1">
            {project.activities.map((activity, index) => (
              <li key={`activity-${project.id}-${index}`} className="flex items-start space-x-1">
                <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>{activity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>
            {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString('de-DE') : 'Unbekannt'}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {project.comment && (
            <span className="truncate max-w-24 mr-2" title={project.comment}>
              {project.comment}
            </span>
          )}
          
          {/* Action Buttons - nur in kompakter Version */}
          {compact && (
            <div className="flex items-center space-x-1">
              {onView && (
                <button
                  onClick={() => onView(project)}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Projekt anzeigen"
                >
                  <User className="w-3 h-3" />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(project)}
                  className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Projekt bearbeiten"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(project.id)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Projekt löschen"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Kompakte Version für Listen
export function CompactProjectCard(props: ProjectCardProps) {
  return <ProjectCard {...props} compact={true} />;
}

// Mini-Version für Übersichten - Kompakte einzeilige Darstellung
export function MiniProjectCard({ project, type, onEdit, onView, onDelete }: ProjectCardProps) {
  // Erste Rolle für Anzeige verwenden
  const primaryRole = project.roles && project.roles.length > 0 ? project.roles[0].name : null;
  
  // Datum formatieren (nur MM/YY)
  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
    } catch {
      return null;
    }
  };
  
  const startDate = formatShortDate(project.startDate);
  const endDate = formatShortDate(project.endDate);
  const dateRange = startDate && endDate ? `${startDate}-${endDate}` : startDate || endDate;
  
  // JIRA-Ticket anzeigen wenn Projektquelle "jira" ist
  const showJiraTicket = project.projectSource === 'jira' && project.jiraTicketId;
  const isJiraProject = project.projectSource === 'jira';
  
  return (
    <div className={`rounded border p-2 ${isJiraProject ? 'bg-yellow-50 border-yellow-200' : getProjectTypeColor(type)}`}>
      <div className="flex items-center justify-between gap-2">
        {/* Hauptinformationen in einer Zeile */}
        <div className="flex-1 min-w-0 flex items-center gap-2 text-sm">
          <span className="font-medium truncate">{project.customer}</span>
          <span className="text-gray-400">•</span>
          <span className="font-medium truncate">{project.projectName}</span>
          {primaryRole && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600 truncate">{primaryRole}</span>
            </>
          )}
          {dateRange && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 text-xs font-mono">{dateRange}</span>
            </>
          )}
          {showJiraTicket && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-blue-600 text-xs font-mono bg-blue-50 px-1.5 py-0.5 rounded">
                {project.jiraTicketId}
              </span>
            </>
          )}
        </div>
        
        {/* Wahrscheinlichkeit */}
        {project.probability && (
          <div className={`px-2 py-0.5 rounded text-xs font-medium ${getProbabilityColor(project.probability)}`}>
            {project.probability}%
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          {onView && (
            <button
              onClick={() => onView(project)}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Projekt anzeigen"
            >
              <User className="w-3 h-3" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(project)}
              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
              title="Projekt bearbeiten"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(project.id)}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Projekt löschen"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
