import React from 'react';
import { Calendar, Building, User, TrendingUp, AlertCircle, Euro, Phone, ExternalLink, Activity, Star, Award, MapPin, Edit3 } from 'lucide-react';

interface ProjectRole {
  id: string;
  name: string;
  categoryName: string;
  tasks: string[];
  level?: number;
}

interface ProjectSkill {
  id: string;
  name: string;
  categoryName: string;
  level: number;
}

interface Project {
  id: string;
  customer: string;
  projectName: string;
  startDate: string;
  endDate: string;
  description: string;
  skillsUsed: string[];
  employeeRole: string;
  utilization?: number;
  averageUtilization?: number; // Durchschnittliche Auslastung über konsolidierte Wochen
  probability?: 'Prospect' | 'Offered' | 'Planned' | 'Commissioned' | 'On-Hold' | 'Rejected';
  // Erweiterte Felder aus ProjectCreationModal
  projectType?: 'historical' | 'planned' | 'active';
  projectSource?: 'regular' | 'jira';
  dailyRate?: number;
  plannedUtilization?: number;
  internalContact?: string;
  customerContact?: string;
  jiraTicketId?: string;
  duration?: string;
  activities?: string[];
  roles?: ProjectRole[];
  skills?: ProjectSkill[];
}
interface ProjectDetailProps {
  project: Project;
  type: 'completed' | 'planned' | 'active';
  onEdit?: () => void;
  showEditButton?: boolean;
}
const probabilityColors = {
  'Prospect': 'bg-purple-100 text-purple-700 border-purple-200',
  'Offered': 'bg-blue-100 text-blue-700 border-blue-200',
  'Planned': 'bg-green-100 text-green-700 border-green-200',
  'Commissioned': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'On-Hold': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Rejected': 'bg-red-100 text-red-700 border-red-200'
};

// @component: ProjectDetail
export const ProjectDetail = ({
  project,
  type,
  onEdit,
  showEditButton = false
}: ProjectDetailProps) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Nicht angegeben';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // @return
  return <div className={`p-4 rounded-lg border ${
    type === 'completed' ? 'bg-slate-50 border-slate-200' : 
    type === 'active' ? 'bg-green-50 border-green-200' : 
    'bg-blue-50 border-blue-200'
  }`}>
      {/* Header mit Titel und Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h6 className="font-semibold text-slate-800 mb-1 truncate">
            <span>{project.projectName}</span>
          </h6>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Building className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{project.customer}</span>
            {project.projectSource === 'jira' && (
              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">JIRA</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 ml-2">
          <div className="flex items-center gap-2">
            {type === 'planned' && project.probability && (
              <div className={`px-2 py-1 rounded-full text-xs font-medium border ${probabilityColors[project.probability]}`}>
                <span>{project.probability}</span>
              </div>
            )}
            {showEditButton && onEdit && type === 'planned' && (
              <button
                onClick={onEdit}
                className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                title="Projekt bearbeiten"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
          {project.dailyRate && (
            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              <Euro className="w-3 h-3" />
              <span>{formatCurrency(project.dailyRate)}/Tag</span>
            </div>
          )}
        </div>
      </div>

      {/* Beschreibung */}
      {project.description && (
        <p className="text-sm text-slate-600 mb-3 line-clamp-2">
          <span>{project.description}</span>
        </p>
      )}

      {/* Hauptinformationen in 2-3 Spalten */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-3 text-xs">
        {/* Zeitraum */}
        <div className="space-y-1">
          {project.startDate && (
            <div className="flex items-center gap-1 text-slate-600">
              <Calendar className="w-3 h-3" />
              <span>Start: {formatDate(project.startDate)}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-slate-600">
            <Calendar className="w-3 h-3" />
            <span>Ende: {formatDate(project.endDate)}</span>
          </div>
          {project.duration && (
            <div className="text-slate-500">
              <span>Dauer: {project.duration}</span>
            </div>
          )}
        </div>

        {/* Rolle und Auslastung */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-slate-600">
            <User className="w-3 h-3" />
            <span>{project.employeeRole}</span>
          </div>
          {(project.averageUtilization || project.utilization || project.plannedUtilization) && (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-blue-600" />
              <div className="flex items-center gap-1">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-300" 
                    style={{ width: `${project.averageUtilization || project.utilization || project.plannedUtilization}%` }}
                  />
                </div>
                <span className="text-blue-600 font-medium">
                  {project.averageUtilization || project.utilization || project.plannedUtilization}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Ansprechpartner */}
        <div className="space-y-1">
          {project.internalContact && (
            <div className="flex items-center gap-1 text-slate-600">
              <User className="w-3 h-3" />
              <span className="truncate">Intern: {project.internalContact}</span>
            </div>
          )}
          {project.customerContact && (
            <div className="flex items-center gap-1 text-slate-600">
              <Phone className="w-3 h-3" />
              <span className="truncate">Kunde: {project.customerContact}</span>
            </div>
          )}
          {project.jiraTicketId && (
            <div className="flex items-center gap-1 text-slate-600">
              <ExternalLink className="w-3 h-3" />
              <span>JIRA: {project.jiraTicketId}</span>
            </div>
          )}
        </div>
      </div>

      {/* Aktivitäten (falls vorhanden) */}
      {project.activities && project.activities.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
            <Activity className="w-3 h-3" />
            <span>Aktivitäten:</span>
          </div>
          <div className="text-xs text-slate-600 space-y-0.5">
            {project.activities.slice(0, 3).map((activity, index) => (
              <div key={index} className="flex items-start gap-1">
                <span className="text-slate-400 mt-0.5">•</span>
                <span className="line-clamp-1">{activity}</span>
              </div>
            ))}
            {project.activities.length > 3 && (
              <div className="text-slate-400 italic">
                +{project.activities.length - 3} weitere...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rollen (falls vorhanden) */}
      {project.roles && project.roles.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
            <Award className="w-3 h-3" />
            <span>Rollen:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {project.roles.slice(0, 4).map((role) => (
              <span 
                key={role.id} 
                className="px-2 py-1 bg-purple-100 text-purple-700 border border-purple-200 rounded text-xs"
                title={`${role.name} (${role.categoryName})`}
              >
                {role.name}
                {role.level && <span className="ml-1 text-purple-500">L{role.level}</span>}
              </span>
            ))}
            {project.roles.length > 4 && (
              <span className="px-2 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded text-xs">
                +{project.roles.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Skills */}
      <div className="space-y-2">
        {/* Erweiterte Skills (falls vorhanden) */}
        {project.skills && project.skills.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
              <Star className="w-3 h-3" />
              <span>Technical Skills:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {project.skills.slice(0, 6).map((skill) => (
                <span 
                  key={skill.id} 
                  className="px-2 py-1 bg-cyan-100 text-cyan-700 border border-cyan-200 rounded text-xs"
                  title={`${skill.name} - Level ${skill.level}/5`}
                >
                  {skill.name}
                  <span className="ml-1 text-cyan-500">★{skill.level}</span>
                </span>
              ))}
              {project.skills.length > 6 && (
                <span className="px-2 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded text-xs">
                  +{project.skills.length - 6}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Fallback: Einfache Skills */}
        {(!project.skills || project.skills.length === 0) && project.skillsUsed && project.skillsUsed.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
              <Star className="w-3 h-3" />
              <span>Skills:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {project.skillsUsed.map((skill, index) => (
                <span key={index} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>;
};