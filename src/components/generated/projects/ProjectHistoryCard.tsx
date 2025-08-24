"use client";

import React, { useState } from 'react';
import { Calendar, User, Building2, Clock, ChevronDown, ChevronRight, Briefcase, Target, FileText, ExternalLink, AlignLeft, Edit, Trash2, Plus } from 'lucide-react';
import PlannedProjectsModal from './PlannedProjectsModal';
import ProjectCreationModal, { ProjectData } from './ProjectCreationModal';
interface ProjectHistoryItem {
  id: string;
  projectName: string;
  client: string;
  clientIndustry: string;
  timeframe: {
    start: string;
    end: string;
  };
  role: string;
  activities: string[];
  status: 'completed' | 'ongoing' | 'paused';
  teamSize: number;
  technologies?: string[];
  description: string;
}
interface ProjectHistoryCardProps {
  employeeId?: string;
  className?: string;
}
const mockProjectHistory: Record<string, ProjectHistoryItem[]> = {
  '1': [{
    id: 'proj-1',
    projectName: 'E-Commerce Platform Redesign',
    client: 'TechCorp GmbH',
    clientIndustry: 'Technologie',
    timeframe: {
      start: '2024-01-15',
      end: '2024-03-30'
    },
    role: 'Lead Frontend Developer',
    activities: ['Architektur der React-Anwendung entworfen', 'Component Library entwickelt', 'Performance-Optimierungen implementiert', 'Code Reviews durchgeführt', 'Junior Entwickler mentoriert'],
    status: 'completed',
    teamSize: 6,
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js'],
    description: 'Vollständige Neugestaltung der E-Commerce-Plattform mit Fokus auf Performance und Benutzererfahrung.'
  }, {
    id: 'proj-2',
    projectName: 'Mobile Banking App',
    client: 'FinanceFirst Bank',
    clientIndustry: 'Finanzdienstleistungen',
    timeframe: {
      start: '2023-09-01',
      end: '2023-12-20'
    },
    role: 'Senior Frontend Developer',
    activities: ['Mobile-First UI Komponenten entwickelt', 'Sicherheitsfeatures implementiert', 'API Integration durchgeführt', 'Accessibility Standards umgesetzt', 'Cross-Platform Testing koordiniert'],
    status: 'completed',
    teamSize: 8,
    technologies: ['React Native', 'TypeScript', 'Redux', 'Jest'],
    description: 'Entwicklung einer sicheren und benutzerfreundlichen Mobile Banking Anwendung.'
  }, {
    id: 'proj-3',
    projectName: 'Dashboard Analytics Tool',
    client: 'DataInsights AG',
    clientIndustry: 'Datenanalyse',
    timeframe: {
      start: '2024-02-01',
      end: '2024-05-15'
    },
    role: 'Technical Lead',
    activities: ['Datenvisualisierung Konzepte entwickelt', 'Real-time Updates implementiert', 'Team Koordination übernommen', 'Client Präsentationen gehalten', 'Technische Dokumentation erstellt'],
    status: 'ongoing',
    teamSize: 4,
    technologies: ['React', 'D3.js', 'WebSocket', 'Node.js'],
    description: 'Entwicklung eines fortschrittlichen Analytics Dashboards für Echtzeit-Datenvisualisierung.'
  }],
  '2': [{
    id: 'proj-4',
    projectName: 'Brand Identity System',
    client: 'StartupHub Berlin',
    clientIndustry: 'Startup Inkubator',
    timeframe: {
      start: '2024-01-10',
      end: '2024-02-28'
    },
    role: 'Lead UX Designer',
    activities: ['Brand Guidelines entwickelt', 'Design System erstellt', 'User Research durchgeführt', 'Prototyping und Testing', 'Stakeholder Workshops geleitet'],
    status: 'completed',
    teamSize: 3,
    technologies: ['Figma', 'Adobe Creative Suite', 'Principle'],
    description: 'Entwicklung einer kohärenten Brand Identity und Design Systems für ein Startup-Ökosystem.'
  }, {
    id: 'proj-5',
    projectName: 'Healthcare Portal UX',
    client: 'MedTech Solutions',
    clientIndustry: 'Gesundheitswesen',
    timeframe: {
      start: '2023-11-01',
      end: '2024-01-31'
    },
    role: 'Senior UX Designer',
    activities: ['User Journey Mapping', 'Wireframing und Prototyping', 'Usability Testing koordiniert', 'Accessibility Compliance sichergestellt', 'Design Handoff an Entwicklung'],
    status: 'completed',
    teamSize: 5,
    technologies: ['Figma', 'Miro', 'UserTesting', 'Axure'],
    description: 'Neugestaltung eines Patientenportals mit Fokus auf Benutzerfreundlichkeit und Barrierefreiheit.'
  }]
};
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'ongoing':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'paused':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'completed':
      return 'Abgeschlossen';
    case 'ongoing':
      return 'Laufend';
    case 'paused':
      return 'Pausiert';
    default:
      return status;
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
export default function ProjectHistoryCard({
  employeeId = '1',
  className = ''
}: ProjectHistoryCardProps) {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [selectedProject, setSelectedProject] = useState<ProjectHistoryItem | null>(null);
  const [showPlannedProjects, setShowPlannedProjects] = useState(false);
  const [showProjectCreation, setShowProjectCreation] = useState(false);
  const projects = mockProjectHistory[employeeId] || [];
  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };
  const openProjectModal = (project: ProjectHistoryItem) => {
    setSelectedProject(project);
  };
  const closeProjectModal = () => {
    setSelectedProject(null);
  };
  const handleCreateProject = (projectData: ProjectData) => {
    // Here you would typically save the project data to your backend
    console.log('New project created:', projectData);
    // For now, we'll just log it - in a real app this would be saved to the database
  };
  return <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`} style={{
    display: "block",
    paddingTop: "8px",
    paddingLeft: "14px",
    paddingRight: "14px",
    width: "450px",
    maxWidth: "450px",
    paddingBottom: "14px",
    height: "auto",
    minHeight: "min-content"
  }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center" style={{
          display: "none"
        }}>
            <Briefcase className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              <span>Projekt Historie</span>
            </h2>
            <p className="text-sm text-gray-600">
              <span style={{
              display: "none"
            }}>Übersicht vergangener und aktueller Projekte</span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setShowPlannedProjects(true)} className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center space-x-1" title="Geplante Projekte anzeigen">
            <Target className="w-3 h-3" />
            <span>Geplante Projekte</span>
          </button>
          <button onClick={() => setShowProjectCreation(true)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Projekt hinzufügen">
            <Plus className="w-4 h-4" />
          </button>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">
              <span style={{
              display: "none"
            }}>{projects.length}</span>
            </div>
            <div className="text-xs text-gray-500">
              <span style={{
              display: "none"
            }}>Projekte gesamt</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto">
        {projects.length === 0 ? <div className="text-center py-8">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              <span>Keine Projekthistorie verfügbar</span>
            </p>
          </div> : projects.map(project => <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow group" style={{
        paddingTop: "1px",
        paddingBottom: "1px",
        width: "420px",
        maxWidth: "420px"
      }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      <span>{project.projectName}</span>
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`} style={{
                paddingRight: "8px"
              }}>
                      <span style={{
                  textAlign: "right",
                  justifyContent: "flex-end"
                }}>{getStatusLabel(project.status)}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center space-x-1">
                      <Building2 className="w-4 h-4" />
                      <span style={{
                  width: "120px",
                  maxWidth: "120px"
                }}>{project.client}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span style={{
                  width: "200px",
                  maxWidth: "200px"
                }}>{project.role}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span style={{
                  width: "200px",
                  maxWidth: "200px"
                }}>{formatDate(project.timeframe.start)} - {formatDate(project.timeframe.end)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span style={{
                  width: "65px",
                  maxWidth: "65px"
                }}>2 Monate</span>
                    </div>
                  </div>
                  
                  {/* Project Description Preview */}
                  <div className="mt-2">
                    <div className="flex items-start space-x-1">
                      <AlignLeft className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600 leading-relaxed overflow-hidden" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                        <span>{project.description}</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button onClick={() => openProjectModal(project)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Details anzeigen">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleProject(project.id)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    {expandedProjects[project.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {expandedProjects[project.id] && <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      <span>Projektbeschreibung</span>
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      <span>{project.description}</span>
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      <span>Tätigkeiten im Projekt</span>
                    </h4>
                    <ul className="space-y-1">
                      {project.activities.map((activity, index) => <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                          <Target className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                          <span>{activity}</span>
                        </li>)}
                    </ul>
                  </div>
                  
                  {project.technologies && project.technologies.length > 0 && <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        <span>Verwendete Technologien</span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {project.technologies.map((tech, index) => <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                            {tech}
                          </span>)}
                      </div>
                    </div>}
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Branche: {project.clientIndustry}</span>
                      <span>Team: {project.teamSize} Personen</span>
                    </div>
                  </div>
                </div>}
            </div>)}
      </div>

      {/* Project Detail Modal */}
      {selectedProject && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    <span>{selectedProject.projectName}</span>
                  </h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Building2 className="w-4 h-4" />
                      <span>{selectedProject.client}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedProject.status)}`}>
                      <span>{getStatusLabel(selectedProject.status)}</span>
                    </span>
                  </div>
                </div>
                <button onClick={closeProjectModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <span className="sr-only">Schließen</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    <span>Kunde</span>
                  </h3>
                  <p className="text-sm text-gray-900">
                    <span>{selectedProject.client}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    <span>{selectedProject.clientIndustry}</span>
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    <span>Rolle</span>
                  </h3>
                  <p className="text-sm text-gray-900">
                    <span>{selectedProject.role}</span>
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    <span>Zeitraum</span>
                  </h3>
                  <p className="text-sm text-gray-900">
                    <span>{formatDate(selectedProject.timeframe.start)} - {formatDate(selectedProject.timeframe.end)}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    <span>{calculateDuration(selectedProject.timeframe.start, selectedProject.timeframe.end)}</span>
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    <span>Team</span>
                  </h3>
                  <p className="text-sm text-gray-900">
                    <span>{selectedProject.teamSize} Personen</span>
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  <span>Projektbeschreibung</span>
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  <span>{selectedProject.description}</span>
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  <span>Tätigkeiten im Projekt</span>
                </h3>
                <ul className="space-y-2">
                  {selectedProject.activities.map((activity, index) => <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                      <Target className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span>{activity}</span>
                    </li>)}
                </ul>
              </div>
              
              {selectedProject.technologies && selectedProject.technologies.length > 0 && <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    <span>Verwendete Technologien</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.technologies.map((tech, index) => <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm font-medium">
                        {tech}
                      </span>)}
                  </div>
                </div>}
            </div>
          </div>
        </div>}

      {/* Planned Projects Modal */}
      <PlannedProjectsModal isOpen={showPlannedProjects} onClose={() => setShowPlannedProjects(false)} employeeId={employeeId} />
      
      {/* Project Creation Modal */}
      <ProjectCreationModal isOpen={showProjectCreation} onClose={() => setShowProjectCreation(false)} onSave={handleCreateProject} mode="history" title="Projekt zur Historie hinzufügen" />
    </div>;
}