"use client";

import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, MapPin, Calendar, Briefcase, Building, Award, BookOpen, Globe, Code, ArrowLeft, Search, Filter, RefreshCw, Database, Clock, Shield } from 'lucide-react';

interface ProfilerData {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  position: string;
  department: string;
  location: string;
  startDate: string;
  skills: Array<{
    name: string;
    level: number;
    category: string;
    experience: string;
  }>;
  projects: Array<{
    name: string;
    customer: string;
    startDate: string;
    endDate: string;
    role: string;
    description: string;
    skills: string[];
    technologies: string[];
    responsibilities: string[];
    industry: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
  languages: Array<{
    name: string;
    level: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  authMethod: string;
  importedAt: any;
  lastUpdated: any;
  source: string;
}

export interface ProfilerDataViewProps {
  onBack: () => void;
}

export function ProfilerDataView({ onBack }: ProfilerDataViewProps) {
  const { token } = useAuth();
  const [profilerData, setProfilerData] = useState<ProfilerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAuthMethod, setFilterAuthMethod] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'importedAt' | 'department'>('importedAt');

  useEffect(() => {
    loadProfilerData();
  }, []);

  const loadProfilerData = async () => {
    try {
      setLoading(true);
      console.log('📊 Lade Profiler-Daten aus Firebase...');
      
      const profilerCollection = collection(db, 'profilerData');
      const snapshot = await getDocs(profilerCollection);
      
      const data: ProfilerData[] = [];
      snapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          employeeId: docData.employeeId || doc.id,
          name: docData.name || 'Unbekannt',
          email: docData.email || '',
          position: docData.position || '',
          department: docData.department || '',
          location: docData.location || '',
          startDate: docData.startDate || '',
          skills: docData.skills || [],
          projects: docData.projects || [],
          certifications: docData.certifications || [],
          languages: docData.languages || [],
          education: docData.education || [],
          authMethod: docData.authMethod || 'unknown',
          importedAt: docData.importedAt,
          lastUpdated: docData.lastUpdated,
          source: docData.source || 'api'
        });
      });

      console.log(`✅ ${data.length} Profiler-Datensätze geladen`);
      setProfilerData(data);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Profiler-Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter und Sortierung
  const filteredAndSortedData = profilerData
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.department.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterAuthMethod === 'all' || item.authMethod === filterAuthMethod;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'department':
          return a.department.localeCompare(b.department);
        case 'importedAt':
          const aDate = a.importedAt?.toDate?.() || new Date(0);
          const bDate = b.importedAt?.toDate?.() || new Date(0);
          return bDate.getTime() - aDate.getTime();
        default:
          return 0;
      }
    });

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unbekannt';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAuthMethodBadge = (method: string) => {
    const badges = {
      'token-auth': { color: 'bg-green-100 text-green-800', icon: Shield, label: 'Token' },
      'cookie-auth': { color: 'bg-blue-100 text-blue-800', icon: Globe, label: 'Cookie' },
      'mock-fallback': { color: 'bg-yellow-100 text-yellow-800', icon: Code, label: 'Mock' },
      'unknown': { color: 'bg-gray-100 text-gray-800', icon: User, label: 'Unbekannt' }
    };
    
    const badge = badges[method] || badges.unknown;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Lade Profiler-Daten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Zurück</span>
              </button>
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Profiler-Daten Verwaltung</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadProfilerData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Aktualisieren
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Nach Name, E-Mail oder Abteilung suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Auth Method Filter */}
            <div className="sm:w-48">
              <select
                value={filterAuthMethod}
                onChange={(e) => setFilterAuthMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Alle Auth-Methoden</option>
                <option value="token-auth">Token-Auth</option>
                <option value="cookie-auth">Cookie-Auth</option>
                <option value="mock-fallback">Mock-Daten</option>
              </select>
            </div>

            {/* Sort */}
            <div className="sm:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="importedAt">Nach Import-Datum</option>
                <option value="name">Nach Name</option>
                <option value="department">Nach Abteilung</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-6 text-sm text-gray-600">
              <span>Gesamt: <strong>{profilerData.length}</strong> Datensätze</span>
              <span>Gefiltert: <strong>{filteredAndSortedData.length}</strong> Datensätze</span>
              <span>Token-Auth: <strong>{profilerData.filter(d => d.authMethod === 'token-auth').length}</strong></span>
              <span>Cookie-Auth: <strong>{profilerData.filter(d => d.authMethod === 'cookie-auth').length}</strong></span>
            </div>
          </div>
        </div>

        {/* Employee Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAndSortedData.map((employee) => (
            <EmployeeProfileCard key={employee.id} employee={employee} formatDate={formatDate} getAuthMethodBadge={getAuthMethodBadge} />
          ))}
        </div>

        {filteredAndSortedData.length === 0 && (
          <div className="text-center py-12">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Daten gefunden</h3>
            <p className="text-gray-600">
              {profilerData.length === 0 
                ? 'Es wurden noch keine Profiler-Daten importiert.'
                : 'Keine Datensätze entsprechen den aktuellen Filterkriterien.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Separate Komponente für Employee Card
function EmployeeProfileCard({ 
  employee, 
  formatDate, 
  getAuthMethodBadge 
}: { 
  employee: ProfilerData;
  formatDate: (timestamp: any) => string;
  getAuthMethodBadge: (method: string) => JSX.Element;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{employee.name}</h3>
            <p className="text-sm text-gray-600">{employee.position}</p>
          </div>
        </div>
        {getAuthMethodBadge(employee.authMethod)}
      </div>

      {/* Basic Info */}
      <div className="space-y-3 mb-4">
        {employee.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{employee.email}</span>
          </div>
        )}
        
        {employee.department && (
          <div className="flex items-center gap-2 text-sm">
            <Building className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{employee.department}</span>
          </div>
        )}
        
        {employee.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{employee.location}</span>
          </div>
        )}
        
        {employee.startDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Start: {employee.startDate}</span>
          </div>
        )}
      </div>

      {/* Data Summary */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-lg font-semibold text-blue-600">{employee.skills.length}</div>
          <div className="text-xs text-blue-600">Skills</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-lg font-semibold text-green-600">{employee.projects.length}</div>
          <div className="text-xs text-green-600">Projekte</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-lg font-semibold text-purple-600">{employee.certifications.length}</div>
          <div className="text-xs text-purple-600">Zertifikate</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-lg font-semibold text-orange-600">{employee.languages.length}</div>
          <div className="text-xs text-orange-600">Sprachen</div>
        </div>
      </div>

      {/* Import Info */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>Importiert: {formatDate(employee.importedAt)}</span>
        </div>
        {employee.lastUpdated && employee.lastUpdated !== employee.importedAt && (
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
            <RefreshCw className="w-3 h-3" />
            <span>Aktualisiert: {formatDate(employee.lastUpdated)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilerDataView;
