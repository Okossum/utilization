"use client";

import React, { useState } from 'react';
import { BarChart3, Calendar, Users, Building2, Clock, Target, Plus, Search, Filter, Grid3X3, List, TrendingUp, AlertTriangle, CheckCircle, XCircle, Pause, Eye, Edit, MoreHorizontal, Download, Settings, User, DollarSign, Activity, Briefcase, Star, ChevronDown, ChevronRight } from 'lucide-react';
interface Project {
  id: string;
  name: string;
  description: string;
  client: string;
  clientIndustry: string;
  status: 'active' | 'planned' | 'completed' | 'overdue' | 'on-hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  startDate: string;
  endDate: string;
  budget: number;
  actualCost: number;
  teamMembers: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }[];
  projectManager: string;
  tags: string[];
  riskLevel: 'low' | 'medium' | 'high';
}
interface FilterState {
  status: string;
  priority: string;
  client: string;
  projectManager: string;
  searchTerm: string;
}
interface ProjectManagementDashboardProps {
  onProjectClick?: (projectId: string) => void;
  onBackToOverview?: () => void;
}
const mockProjects: Project[] = [{
  id: 'proj-1',
  name: 'E-Commerce Platform Redesign',
  description: 'Vollständige Neugestaltung der E-Commerce-Plattform mit Fokus auf Performance und Benutzererfahrung',
  client: 'TechCorp GmbH',
  clientIndustry: 'Technologie',
  status: 'active',
  priority: 'high',
  progress: 75,
  startDate: '2024-01-15',
  endDate: '2024-06-30',
  budget: 150000,
  actualCost: 112500,
  teamMembers: [{
    id: '1',
    name: 'Max Mustermann',
    role: 'Lead Developer'
  }, {
    id: '2',
    name: 'Anna Schmidt',
    role: 'UX Designer'
  }, {
    id: '3',
    name: 'Tom Weber',
    role: 'Backend Developer'
  }],
  projectManager: 'Sarah Mueller',
  tags: ['React', 'TypeScript', 'E-Commerce'],
  riskLevel: 'low'
}, {
  id: 'proj-2',
  name: 'Mobile Banking App',
  description: 'Entwicklung einer sicheren und benutzerfreundlichen Mobile Banking Anwendung',
  client: 'FinanceFirst Bank',
  clientIndustry: 'Finanzdienstleistungen',
  status: 'completed',
  priority: 'critical',
  progress: 100,
  startDate: '2023-09-01',
  endDate: '2023-12-20',
  budget: 200000,
  actualCost: 185000,
  teamMembers: [{
    id: '4',
    name: 'Lisa Hoffmann',
    role: 'Mobile Developer'
  }, {
    id: '5',
    name: 'Michael Johnson',
    role: 'Security Expert'
  }, {
    id: '1',
    name: 'Max Mustermann',
    role: 'Frontend Lead'
  }],
  projectManager: 'Dr. Thomas Weber',
  tags: ['React Native', 'Security', 'Banking'],
  riskLevel: 'low'
}, {
  id: 'proj-3',
  name: 'Analytics Dashboard Tool',
  description: 'Entwicklung eines fortschrittlichen Analytics Dashboards für Echtzeit-Datenvisualisierung',
  client: 'DataInsights AG',
  clientIndustry: 'Datenanalyse',
  status: 'active',
  priority: 'medium',
  progress: 45,
  startDate: '2024-02-01',
  endDate: '2024-08-15',
  budget: 120000,
  actualCost: 54000,
  teamMembers: [{
    id: '6',
    name: 'Maria Schneider',
    role: 'Data Scientist'
  }, {
    id: '2',
    name: 'Anna Schmidt',
    role: 'Frontend Developer'
  }],
  projectManager: 'Max Müller',
  tags: ['D3.js', 'Analytics', 'Real-time'],
  riskLevel: 'medium'
}, {
  id: 'proj-4',
  name: 'Healthcare Portal UX',
  description: 'Neugestaltung eines Patientenportals mit Fokus auf Benutzerfreundlichkeit und Barrierefreiheit',
  client: 'MedTech Solutions',
  clientIndustry: 'Gesundheitswesen',
  status: 'planned',
  priority: 'high',
  progress: 15,
  startDate: '2024-07-01',
  endDate: '2024-12-31',
  budget: 180000,
  actualCost: 27000,
  teamMembers: [{
    id: '7',
    name: 'Dr. Lisa Hoffmann',
    role: 'UX Lead'
  }, {
    id: '8',
    name: 'Peter Klein',
    role: 'Accessibility Expert'
  }],
  projectManager: 'Anna Schmidt',
  tags: ['Healthcare', 'UX', 'Accessibility'],
  riskLevel: 'high'
}, {
  id: 'proj-5',
  name: 'AI-Powered CRM System',
  description: 'Entwicklung eines KI-gestützten CRM-Systems für automatisierte Kundenbetreuung',
  client: 'SalesForce Pro',
  clientIndustry: 'Software',
  status: 'overdue',
  priority: 'critical',
  progress: 60,
  startDate: '2023-11-01',
  endDate: '2024-03-31',
  budget: 250000,
  actualCost: 220000,
  teamMembers: [{
    id: '9',
    name: 'Alexander Berg',
    role: 'AI Engineer'
  }, {
    id: '10',
    name: 'Sophie Wagner',
    role: 'Backend Developer'
  }, {
    id: '1',
    name: 'Max Mustermann',
    role: 'Technical Lead'
  }],
  projectManager: 'Dr. Sarah Mueller',
  tags: ['AI', 'CRM', 'Machine Learning'],
  riskLevel: 'high'
}, {
  id: 'proj-6',
  name: 'Sustainability Tracking Platform',
  description: 'Plattform zur Verfolgung und Berichterstattung von Nachhaltigkeitsmetriken für Unternehmen',
  client: 'GreenEnergy Corp',
  clientIndustry: 'Nachhaltigkeit',
  status: 'on-hold',
  priority: 'medium',
  progress: 30,
  startDate: '2024-03-15',
  endDate: '2024-09-30',
  budget: 140000,
  actualCost: 42000,
  teamMembers: [{
    id: '11',
    name: 'Emma Fischer',
    role: 'Environmental Data Analyst'
  }, {
    id: '12',
    name: 'Jonas Müller',
    role: 'Full Stack Developer'
  }],
  projectManager: 'Thomas Weber',
  tags: ['Sustainability', 'IoT', 'Reporting'],
  riskLevel: 'medium'
}];
const statusOptions = [{
  value: '',
  label: 'Alle Status'
}, {
  value: 'active',
  label: 'Aktiv'
}, {
  value: 'planned',
  label: 'Geplant'
}, {
  value: 'completed',
  label: 'Abgeschlossen'
}, {
  value: 'overdue',
  label: 'Überfällig'
}, {
  value: 'on-hold',
  label: 'Pausiert'
}];
const priorityOptions = [{
  value: '',
  label: 'Alle Prioritäten'
}, {
  value: 'low',
  label: 'Niedrig'
}, {
  value: 'medium',
  label: 'Mittel'
}, {
  value: 'high',
  label: 'Hoch'
}, {
  value: 'critical',
  label: 'Kritisch'
}];
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'planned':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'overdue':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'on-hold':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return 'Aktiv';
    case 'planned':
      return 'Geplant';
    case 'completed':
      return 'Abgeschlossen';
    case 'overdue':
      return 'Überfällig';
    case 'on-hold':
      return 'Pausiert';
    default:
      return status;
  }
};
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'low':
      return 'bg-gray-100 text-gray-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'critical':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case 'low':
      return 'Niedrig';
    case 'medium':
      return 'Mittel';
    case 'high':
      return 'Hoch';
    case 'critical':
      return 'Kritisch';
    default:
      return priority;
  }
};
const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'low':
      return 'text-green-600';
    case 'medium':
      return 'text-yellow-600';
    case 'high':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
export default function ProjectManagementDashboard({
  onProjectClick,
  onBackToOverview
}: ProjectManagementDashboardProps) {
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    priority: '',
    client: '',
    projectManager: '',
    searchTerm: ''
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  const filteredProjects = mockProjects.filter(project => {
    return (filters.status === '' || project.status === filters.status) && (filters.priority === '' || project.priority === filters.priority) && (filters.client === '' || project.client.toLowerCase().includes(filters.client.toLowerCase())) && (filters.projectManager === '' || project.projectManager.toLowerCase().includes(filters.projectManager.toLowerCase())) && (filters.searchTerm === '' || project.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) || project.description.toLowerCase().includes(filters.searchTerm.toLowerCase()) || project.client.toLowerCase().includes(filters.searchTerm.toLowerCase()));
  });
  const projectStats = {
    total: mockProjects.length,
    active: mockProjects.filter(p => p.status === 'active').length,
    completed: mockProjects.filter(p => p.status === 'completed').length,
    overdue: mockProjects.filter(p => p.status === 'overdue').length,
    totalBudget: mockProjects.reduce((sum, p) => sum + p.budget, 0),
    totalActualCost: mockProjects.reduce((sum, p) => sum + p.actualCost, 0)
  };
  const clearAllFilters = () => {
    setFilters({
      status: '',
      priority: '',
      client: '',
      projectManager: '',
      searchTerm: ''
    });
  };
  const hasActiveFilters = Object.values(filters).some(value => value !== '');
  return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-sm">PM</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  <span>Projekt Management</span>
                </h1>
                <p className="text-sm text-gray-600">
                  <span>Zentrale Projektverwaltung und -übersicht</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button onClick={onBackToOverview} className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
              <span>← Zurück zur Übersicht</span>
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Neues Projekt</span>
            </button>
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="px-6 py-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{projectStats.total}</div>
                  <div className="text-sm text-gray-600">Projekte gesamt</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{projectStats.active}</div>
                  <div className="text-sm text-gray-600">Aktive Projekte</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{projectStats.completed}</div>
                  <div className="text-sm text-gray-600">Abgeschlossen</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{projectStats.overdue}</div>
                  <div className="text-sm text-gray-600">Überfällig</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{formatCurrency(projectStats.totalBudget)}</div>
                  <div className="text-sm text-gray-600">Budget gesamt</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{formatCurrency(projectStats.totalActualCost)}</div>
                  <div className="text-sm text-gray-600">Kosten aktuell</div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex items-center space-x-2 text-gray-700">
                <Filter className="w-5 h-5" />
                <span className="font-medium">Filter & Suche</span>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="text" placeholder="Projekte suchen..." value={filters.searchTerm} onChange={e => handleFilterChange('searchTerm', e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>

                <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white">
                  {statusOptions.map(option => <option key={option.value} value={option.value}>
                      {option.label}
                    </option>)}
                </select>

                <select value={filters.priority} onChange={e => handleFilterChange('priority', e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white">
                  {priorityOptions.map(option => <option key={option.value} value={option.value}>
                      {option.label}
                    </option>)}
                </select>

                <input type="text" placeholder="Kunde..." value={filters.client} onChange={e => handleFilterChange('client', e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />

                <input type="text" placeholder="Projektmanager..." value={filters.projectManager} onChange={e => handleFilterChange('projectManager', e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>

              <div className="flex items-center space-x-3">
                {hasActiveFilters && <button onClick={clearAllFilters} className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                    <span>Zurücksetzen</span>
                  </button>}

                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Projects Grid/List */}
          <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}`}>
            {filteredProjects.map(project => <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onProjectClick?.(project.id)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        <span>{project.name}</span>
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                        <span>{getStatusLabel(project.status)}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <Building2 className="w-4 h-4" />
                        <span>{project.client}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{project.projectManager}</span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      <span>{project.description}</span>
                    </p>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Fortschritt</span>
                        <span className="font-medium text-gray-900">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{
                      width: `${project.progress}%`
                    }} />
                      </div>
                    </div>

                    {/* Team Members */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex -space-x-2">
                          {project.teamMembers.slice(0, 3).map((member, index) => <div key={member.id} className="w-8 h-8 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-gray-700" title={member.name}>
                              <span>{member.name.split(' ').map(n => n[0]).join('')}</span>
                            </div>)}
                          {project.teamMembers.length > 3 && <div className="w-8 h-8 bg-gray-100 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-gray-500">
                              <span>+{project.teamMembers.length - 3}</span>
                            </div>}
                        </div>
                        <span className="text-sm text-gray-500">
                          <span>{project.teamMembers.length} Mitglieder</span>
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${getPriorityColor(project.priority)}`}>
                          <span>{getPriorityLabel(project.priority)}</span>
                        </span>
                        <div className={`w-2 h-2 rounded-full ${getRiskColor(project.riskLevel)}`} title={`Risiko: ${project.riskLevel}`} />
                      </div>
                    </div>

                    {/* Budget & Timeline */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Budget</div>
                          <div className="font-medium text-gray-900">{formatCurrency(project.budget)}</div>
                          <div className="text-xs text-gray-500">Kosten: {formatCurrency(project.actualCost)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Zeitraum</div>
                          <div className="font-medium text-gray-900">{formatDate(project.startDate)}</div>
                          <div className="text-xs text-gray-500">bis {formatDate(project.endDate)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {project.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1">
                        {project.tags.slice(0, 3).map(tag => <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
                            {tag}
                          </span>)}
                        {project.tags.length > 3 && <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-md text-xs">
                            +{project.tags.length - 3}
                          </span>}
                      </div>}
                  </div>
                </div>
              </div>)}
          </div>

          {filteredProjects.length === 0 && <div className="text-center py-12">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                <span>Keine Projekte gefunden</span>
              </h3>
              <p className="text-gray-600">
                <span>Versuchen Sie, Ihre Suchkriterien anzupassen oder neue Projekte zu erstellen.</span>
              </p>
            </div>}
        </div>
      </div>
    </div>;
}