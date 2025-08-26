import React from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Building, 
  User, 
  Calendar, 
  Euro, 
  Ticket, 
  Clock, 
  Target,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Star,
  Award,
  Briefcase
} from 'lucide-react';
import type { ProjectHistoryItem } from '../../lib/types';
import { getProjectTypeColor, getProbabilityColor, formatCurrency, formatProjectDuration } from '../../utils/projectUtils';

interface ProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectHistoryItem | null;
  type: 'active' | 'planned' | 'historical';
}

export function ProjectDetailModal({ isOpen, onClose, project, type }: ProjectDetailModalProps) {
  if (!project || !isOpen) return null;

  const getProbabilityIcon = (probability?: number) => {
    if (!probability) return null;
    
    if (probability >= 100) return <CheckCircle className="w-4 h-4" />;
    if (probability >= 75) return <Target className="w-4 h-4" />;
    if (probability >= 50) return <TrendingUp className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const getProjectTypeLabel = (type: string) => {
    switch (type) {
      case 'historical': return 'Historisches Projekt';
      case 'planned': return 'Geplantes Projekt';
      case 'active': return 'Aktives Projekt';
      default: return 'Projekt';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Nicht angegeben';
    try {
      return new Date(dateStr).toLocaleDateString('de-DE');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getProjectTypeColor(type)}`}>
                {getProjectTypeLabel(type)}
              </div>
              {project.projectSource === 'jira' && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                  <Ticket className="w-3 h-3" />
                  <span>JIRA</span>
                </div>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {project.projectName}
            </h2>
            <div className="flex items-center space-x-2 text-gray-600">
              <Building className="w-4 h-4" />
              <span className="text-lg">{project.customer}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column - Basic Info */}
            <div className="space-y-4">
              
              {/* Project Description */}
              {project.description && (
                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Projektbeschreibung
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {project.description}
                  </p>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Zeitraum
                </h3>
                <div className="space-y-2">
                  {type === 'historical' && project.duration && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Dauer:</span>
                      <span className="text-sm font-medium">{project.duration}</span>
                    </div>
                  )}
                  {(type === 'planned' || type === 'active') && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Startdatum:</span>
                        <span className="text-sm font-medium">{formatDate(project.startDate)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Enddatum:</span>
                        <span className="text-sm font-medium">{formatDate(project.endDate)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Financial Info */}
              {(project.dailyRate || project.probability) && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <Euro className="w-4 h-4 mr-2" />
                    Finanzielle Details
                  </h3>
                  <div className="space-y-2">
                    {project.dailyRate && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Tagessatz:</span>
                        <span className="text-sm font-medium">{formatCurrency(project.dailyRate)}</span>
                      </div>
                    )}
                    {project.probability && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Wahrscheinlichkeit:</span>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded text-sm font-medium ${getProbabilityColor(project.probability)}`}>
                          {getProbabilityIcon(project.probability)}
                          <span>{project.probability}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {(project.internalContact || project.customerContact) && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Kontaktinformationen
                  </h3>
                  <div className="space-y-2">
                    {project.internalContact && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Interner Ansprechpartner:</span>
                        <span className="text-sm font-medium">{project.internalContact}</span>
                      </div>
                    )}
                    {project.customerContact && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Kunden-Ansprechpartner:</span>
                        <span className="text-sm font-medium">{project.customerContact}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Skills & Roles */}
            <div className="space-y-4">
              
              {/* Project Roles */}
              {project.roles && project.roles.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <Award className="w-4 h-4 mr-2" />
                    Projektrollen
                  </h3>
                  <div className="space-y-2">
                    {project.roles.map((role, index) => (
                      <div key={role.id || `role-${index}`} className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-200">
                        <span className="text-sm font-medium text-purple-900">{role.name}</span>
                        {role.categoryName && (
                          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                            {role.categoryName}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Skills */}
              {project.skills && project.skills.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <Star className="w-4 h-4 mr-2" />
                    Technische Skills
                  </h3>
                  <div className="space-y-2">
                    {project.skills.map((skill, index) => (
                      <div key={skill.id || `skill-${index}`} className="flex items-center justify-between p-2 bg-cyan-50 rounded border border-cyan-200">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-cyan-900">{skill.name}</span>
                          {skill.categoryName && (
                            <div className="text-xs text-cyan-600 mt-1">{skill.categoryName}</div>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < (skill.level || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-xs text-cyan-700 ml-1">({skill.level}/5)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activities (for historical projects) */}
              {type === 'historical' && project.activities && project.activities.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Tätigkeiten
                  </h3>
                  <ul className="space-y-2">
                    {project.activities.map((activity, index) => (
                      <li key={`activity-${index}`} className="flex items-start space-x-2 text-sm text-gray-700">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                        <span>{activity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Project Source */}
              {project.projectSource && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-900 mb-2 flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Projekt-Quelle
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-700">Quelle:</span>
                    <span className="text-sm font-medium text-green-900 capitalize">{project.projectSource}</span>
                  </div>
                </div>
              )}

              {/* JIRA Ticket Info */}
              {project.jiraTicketId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                    <Ticket className="w-4 h-4 mr-2" />
                    JIRA Ticket
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">Ticket ID:</span>
                    <span className="text-sm font-medium text-blue-900 font-mono">{project.jiraTicketId}</span>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Metadaten
                </h3>
                <div className="space-y-2 text-xs text-gray-600">
                  {project.createdAt && (
                    <div className="flex items-center justify-between">
                      <span>Erstellt:</span>
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                  )}
                  {project.updatedAt && (
                    <div className="flex items-center justify-between">
                      <span>Aktualisiert:</span>
                      <span>{formatDate(project.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Schließen
          </button>
        </div>
      </motion.div>
    </div>
  );
}