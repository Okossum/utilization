"use client";

import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Grid3X3, List, User, Mail, MapPin, Calendar, Building2, Star, ChevronDown, Eye, Plus, Download, Settings, Activity, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { DatabaseService } from '../../services/database';

interface Employee {
  id: string;
  personId?: string;
  name: string;
  displayName?: string;
  email?: string;
  mail?: string;
  e_mail?: string;
  location?: string;
  standort?: string;
  ort?: string;
  office?: string;
  startDate?: string;
  eintrittsdatum?: string;
  start_date?: string;
  lbs?: string;
  careerLevel?: string;
  career_level?: string;
  department?: string;
  abteilung?: string;
  team?: string;
  status?: 'active' | 'inactive' | 'onboarding';
}

interface FilterState {
  lbs: string;
  location: string;
  department: string;
  searchTerm: string;
}

interface EmployeeOverviewDashboardProps {
  onEmployeeClick?: (employeeId: string) => void;
  onBackToOverview?: () => void;
}

const lbsOptions = [
  { value: '', label: 'Alle Laufbahnstufen' },
  { value: 'Analyst', label: 'Analyst' },
  { value: 'Senior Analyst', label: 'Senior Analyst' },
  { value: 'Consultant', label: 'Consultant' },
  { value: 'Senior Consultant', label: 'Senior Consultant' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Senior Manager', label: 'Senior Manager' },
  { value: 'Principal', label: 'Principal' },
  { value: 'Partner', label: 'Partner' }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'inactive':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'onboarding':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return 'Aktiv';
    case 'inactive':
      return 'Inaktiv';
    case 'onboarding':
      return 'Onboarding';
    default:
      return 'Unbekannt';
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'Nicht verfügbar';
  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

const normalizeEmployee = (emp: any): Employee => {
  console.log('🔧 Normalizing employee:', emp);
  
  const normalized = {
    id: emp.personId || emp.id || emp.person || emp.name || `emp-${Math.random()}`,
    personId: emp.personId || emp.id,
    name: emp.person || emp.name || emp.displayName || 'Unbekannt',
    displayName: emp.displayName || emp.person || emp.name,
    email: emp.email || emp.mail || emp.e_mail || '',
    location: emp.location || emp.standort || emp.ort || emp.office || '',
    startDate: emp.startDate || emp.eintrittsdatum || emp.start_date || '',
    lbs: emp.lbs || emp.careerLevel || emp.career_level || '',
    department: emp.department || emp.abteilung || emp.lob || '',
    team: emp.team || '',
    status: emp.status || 'active'
  };
  
  console.log('✅ Normalized result:', normalized);
  return normalized;
};

export default function EmployeeOverviewDashboard({
  onEmployeeClick,
  onBackToOverview
}: EmployeeOverviewDashboardProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    lbs: '',
    location: '',
    department: '',
    searchTerm: ''
  });
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load employees from mitarbeiter collection
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoading(true);
        console.log('🔄 Loading employees from mitarbeiter collection...');
        
        const employeeData = await DatabaseService.getEmployeeStammdaten();
        console.log('📋 Raw employee data:', employeeData);
        
        if (Array.isArray(employeeData)) {
          const normalizedEmployees = employeeData.map(normalizeEmployee);
          console.log('✅ Normalized employees:', normalizedEmployees);
          setEmployees(normalizedEmployees);
        } else {
          console.error('❌ Employee data is not an array:', employeeData);
          setError('Mitarbeiterdaten konnten nicht geladen werden');
        }
      } catch (err) {
        console.error('❌ Error loading employees:', err);
        setError('Fehler beim Laden der Mitarbeiterdaten');
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, []);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const filteredEmployees = employees.filter(employee => {
    return (
      (filters.lbs === '' || employee.lbs?.toLowerCase().includes(filters.lbs.toLowerCase())) &&
      (filters.location === '' || employee.location?.toLowerCase().includes(filters.location.toLowerCase())) &&
      (filters.department === '' || employee.department?.toLowerCase().includes(filters.department.toLowerCase())) &&
      (filters.searchTerm === '' || 
        employee.name?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        employee.displayName?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        employee.lbs?.toLowerCase().includes(filters.searchTerm.toLowerCase())
      )
    );
  });

  const employeeStats = {
    total: employees.length,
    active: employees.filter(e => e.status === 'active').length,
    onboarding: employees.filter(e => e.status === 'onboarding').length,
    locations: [...new Set(employees.map(e => e.location).filter(Boolean))].length,
    lbsLevels: [...new Set(employees.map(e => e.lbs).filter(Boolean))].length
  };

  const clearAllFilters = () => {
    setFilters({
      lbs: '',
      location: '',
      department: '',
      searchTerm: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Mitarbeiterdaten werden geladen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Fehler beim Laden</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Mitarbeiter Übersicht
                </h1>
                <p className="text-sm text-gray-600">
                  Zentrale Mitarbeiterverwaltung aus Stammdaten
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={onBackToOverview} 
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Zurück zur Übersicht
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Neuer Mitarbeiter</span>
            </button>
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="px-6 py-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{employeeStats.total}</div>
                  <div className="text-sm text-gray-600">Mitarbeiter gesamt</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{employeeStats.active}</div>
                  <div className="text-sm text-gray-600">Aktive Mitarbeiter</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{employeeStats.onboarding}</div>
                  <div className="text-sm text-gray-600">Onboarding</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{employeeStats.locations}</div>
                  <div className="text-sm text-gray-600">Standorte</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{employeeStats.lbsLevels}</div>
                  <div className="text-sm text-gray-600">LBS Stufen</div>
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

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Mitarbeiter suchen..." 
                    value={filters.searchTerm} 
                    onChange={e => handleFilterChange('searchTerm', e.target.value)} 
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  />
                </div>

                <select 
                  value={filters.lbs} 
                  onChange={e => handleFilterChange('lbs', e.target.value)} 
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  {lbsOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <input 
                  type="text" 
                  placeholder="Standort..." 
                  value={filters.location} 
                  onChange={e => handleFilterChange('location', e.target.value)} 
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                />

                <input 
                  type="text" 
                  placeholder="Abteilung..." 
                  value={filters.department} 
                  onChange={e => handleFilterChange('department', e.target.value)} 
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                />
              </div>

              <div className="flex items-center space-x-3">
                {hasActiveFilters && (
                  <button 
                    onClick={clearAllFilters} 
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Zurücksetzen
                  </button>
                )}

                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button 
                    onClick={() => setViewMode('grid')} 
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')} 
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Employees Grid/List */}
          <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}`}>
            {filteredEmployees.map(employee => (
              <div 
                key={employee.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" 
                onClick={() => onEmployeeClick?.(employee.personId || employee.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {employee.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(employee.status || 'active')}`}>
                        {getStatusLabel(employee.status || 'active')}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      {employee.lbs && (
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4" />
                          <span>{employee.lbs}</span>
                        </div>
                      )}
                      
                      {employee.email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="w-4 h-4" />
                          <span>{employee.email}</span>
                        </div>
                      )}
                      
                      {employee.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{employee.location}</span>
                        </div>
                      )}
                      
                      {employee.startDate && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Seit {formatDate(employee.startDate)}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        ID: {employee.personId || employee.id}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEmployeeClick?.(employee.personId || employee.id);
                        }}
                        className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Details</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Keine Mitarbeiter gefunden
              </h3>
              <p className="text-gray-600">
                Versuchen Sie, Ihre Suchkriterien anzupassen oder laden Sie die Seite neu.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
