"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, MapPin, Calendar, Briefcase, Building, Award, BookOpen, Globe, Code, ArrowLeft, Search, Filter, RefreshCw, Database, Clock, Shield, X, ChevronDown, ChevronUp, Star, Target, Users, FileText, Layers, Zap, Settings, Eye } from 'lucide-react';

interface ProfilerData {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  position: string;
  careerLevel?: string;
  competenceCenter?: string;
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
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    loadProfilerData();
  }, []);

  const loadProfilerData = async () => {
    try {
      setLoading(true);
      console.log('📊 Lade Profiler-Daten aus Firebase...');
      
      const profilerCollection = collection(db, 'profilerData');
      const snapshot = await getDocs(profilerCollection);
      
      console.log(`🔍 Firebase Snapshot Größe: ${snapshot.size} Dokumente`);
      console.log(`🔍 Firebase Snapshot leer: ${snapshot.empty}`);
      
      const data: ProfilerData[] = [];
      let processedCount = 0;
      
      snapshot.forEach((doc) => {
        processedCount++;
        const docData = doc.data();
        
        // Debug: Zeige alle 50 Dokumente einen Log
        if (processedCount % 50 === 0) {
          console.log(`📊 Verarbeitet: ${processedCount} von ${snapshot.size} Dokumenten`);
        }
        
        data.push({
          id: doc.id,
          employeeId: docData.employeeId || doc.id,
          name: docData.name || 'Unbekannt',
          email: docData.email || '',
          position: docData.position || '',
          careerLevel: docData.user?.employee?.employmentInformation?.careerLevel || '',
          competenceCenter: docData.user?.employee?.employmentInformation?.competenceCenter || '',
          department: docData.department || '',
          location: docData.location || '',
          startDate: docData.startDate || '',
          skills: docData.skills || [],
          projects: docData.projects || [],
          certifications: docData.certifications || [],
          languages: docData.languageRatings || [],
          education: docData.education || [],
          authMethod: docData.authMethod || 'unknown',
          importedAt: docData.importedAt,
          lastUpdated: docData.lastUpdated,
          source: docData.source || 'api'
        });
      });

      console.log(`✅ ${data.length} Profiler-Datensätze aus ${snapshot.size} Firebase-Dokumenten geladen`);
      console.log(`🔍 Erste 3 Datensätze:`, data.slice(0, 3).map(d => ({ id: d.id, name: d.name, authMethod: d.authMethod })));
      
      setProfilerData(data);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Profiler-Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeClick = async (employee: ProfilerData) => {
    try {
      console.log('🔍 Lade vollständige Profiler-Daten für:', employee.name);
      
      // Lade die vollständigen Rohdaten aus der Datenbank
      const profilerCollection = collection(db, 'profilerData');
      const snapshot = await getDocs(profilerCollection);
      
      let fullEmployeeData = null;
      snapshot.forEach((doc) => {
        if (doc.id === employee.id) {
          fullEmployeeData = {
            id: doc.id,
            ...doc.data()
          };
        }
      });

      if (fullEmployeeData) {
        console.log('✅ Vollständige Daten geladen:', fullEmployeeData);
        setSelectedEmployee(fullEmployeeData);
        setIsDetailModalOpen(true);
      } else {
        console.error('❌ Keine vollständigen Daten gefunden für:', employee.id);
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der vollständigen Daten:', error);
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
            <EmployeeProfileCard 
              key={employee.id} 
              employee={employee} 
              formatDate={formatDate} 
              getAuthMethodBadge={getAuthMethodBadge}
              onClick={() => handleEmployeeClick(employee)}
            />
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

      {/* Detail Modal */}
      {isDetailModalOpen && selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedEmployee(null);
          }}
          formatDate={formatDate}
          getAuthMethodBadge={getAuthMethodBadge}
        />
      )}
    </div>
  );
}

// Separate Komponente für Employee Card
function EmployeeProfileCard({ 
  employee, 
  formatDate, 
  getAuthMethodBadge,
  onClick 
}: { 
  employee: ProfilerData;
  formatDate: (timestamp: any) => string;
  getAuthMethodBadge: (method: string) => JSX.Element;
  onClick: () => void;
}) {
  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{employee.name}</h3>
            {employee.careerLevel && (
              <p className="text-sm text-gray-500">{employee.careerLevel}</p>
            )}
            {employee.position && (
              <p className="text-sm text-gray-600">{employee.position}</p>
            )}
          </div>
        </div>
        {getAuthMethodBadge(employee.authMethod)}
      </div>

      {/* Basic Info */}
      <div className="space-y-3 mb-4">
        {employee.competenceCenter && (
          <div className="flex items-center gap-2 text-sm">
            <Building className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{employee.competenceCenter}</span>
          </div>
        )}
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

// Detail Modal Komponente für vollständige Datenansicht
function EmployeeDetailModal({ 
  employee, 
  isOpen, 
  onClose, 
  formatDate, 
  getAuthMethodBadge 
}: {
  employee: any;
  isOpen: boolean;
  onClose: () => void;
  formatDate: (timestamp: any) => string;
  getAuthMethodBadge: (method: string) => JSX.Element;
}) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basicData: true,
    skills: false,
    projects: false,
    certifications: false,
    languages: false,
    education: false,
    userData: false,
    employeeData: false,
    rawData: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderValue = (value: any, key?: string): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">Nicht verfügbar</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Ja' : 'Nein'}
        </span>
      );
    }
    
    if (typeof value === 'object' && value !== null) {
      // 🆕 SPEZIELLE BEHANDLUNG: Mehrsprachige Objekte - nur deutsche Version anzeigen
      if (value.de || value.en || value.tr || value.hu) {
        const germanText = value.de || value.en || value.tr || value.hu || 'Nicht verfügbar';
        return <span className="text-gray-900">{String(germanText)}</span>;
      }
      
      // 🆕 SPEZIELLE BEHANDLUNG: Translation-Objekte - nur deutsche Version anzeigen
      if (value.translation && typeof value.translation === 'object') {
        const germanText = value.translation.de || value.translation.en || value.translation.tr || value.translation.hu || 'Nicht verfügbar';
        return <span className="text-gray-900">{String(germanText)}</span>;
      }
      
      // 🆕 SPEZIELLE BEHANDLUNG: Name-Objekte in Skills - nur deutsche Version anzeigen
      if (value.name && typeof value.name === 'object' && (value.name.de || value.name.en || value.name.tr || value.name.hu)) {
        const germanText = value.name.de || value.name.en || value.name.tr || value.name.hu || 'Nicht verfügbar';
        return <span className="text-gray-900">{String(germanText)}</span>;
      }
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return <span className="text-gray-400 italic">Keine Einträge</span>;
        }
        return (
          <div className="space-y-2">
            {value.map((item, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                {typeof item === 'object' ? (
                  <div className="space-y-1">
                    {Object.entries(item).map(([subKey, subValue]) => {
                      // 🆕 SPEZIELLE BEHANDLUNG: Skill-Name nur auf Deutsch anzeigen
                      if (subKey === 'name' && typeof subValue === 'object' && subValue !== null && 
                          (subValue.de || subValue.en || subValue.tr || subValue.hu)) {
                        const germanText = subValue.de || subValue.en || subValue.tr || subValue.hu || 'Nicht verfügbar';
                        return (
                          <div key={subKey} className="flex justify-between items-start">
                            <span className="text-sm font-medium text-gray-600 capitalize">Name:</span>
                            <span className="text-sm text-gray-900 ml-2 flex-1 text-right font-medium">
                              {germanText}
                            </span>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={subKey} className="flex justify-between items-start">
                          <span className="text-sm font-medium text-gray-600 capitalize">
                            {subKey.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className="text-sm text-gray-900 ml-2 flex-1 text-right">
                            {renderValue(subValue)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-sm text-gray-900">{String(item)}</span>
                )}
              </div>
            ))}
          </div>
        );
      } else {
        // Timestamp-Objekte
        if (value.toDate && typeof value.toDate === 'function') {
          return <span className="text-gray-900">{formatDate(value)}</span>;
        }
        
        // Normale Objekte
        return (
          <div className="bg-gray-50 p-3 rounded-lg space-y-1">
            {Object.entries(value).map(([subKey, subValue]) => (
              <div key={subKey} className="flex justify-between items-start">
                <span className="text-sm font-medium text-gray-600 capitalize">
                  {subKey.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-sm text-gray-900 ml-2 flex-1 text-right">
                  {renderValue(subValue)}
                </span>
              </div>
            ))}
          </div>
        );
      }
    }
    
    if (typeof value === 'string' && value.length > 100) {
      return (
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{value}</p>
        </div>
      );
    }
    
    return <span className="text-gray-900">{String(value)}</span>;
  };

  const renderSection = (title: string, icon: React.ElementType, sectionKey: string, data: any) => {
    const Icon = icon;
    const isExpanded = expandedSections[sectionKey];
    
    return (
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {Icon && <Icon className="w-5 h-5 text-blue-600" />}
            <h3 className="font-medium text-gray-900">{title}</h3>
            {Array.isArray(data) && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {data.length}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="mt-3">
              {renderValue(data)}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
        >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{employee.name || 'Unbekannt'}</h2>
              <p className="text-gray-600">{employee.position || employee.email || 'Keine Position'}</p>
              <div className="flex items-center gap-2 mt-1">
                {getAuthMethodBadge(employee.authMethod || 'unknown')}
                <span className="text-xs text-gray-500">
                  ID: {employee.employeeId || employee.id}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-4">
            {/* Basic Data */}
            {renderSection('Grunddaten', User, 'basicData', {
              'Name': employee.name || employee.user?.employee?.personalData?.firstName + ' ' + employee.user?.employee?.personalData?.lastName,
              'Email': employee.email || employee.user?.employee?.personalData?.email,
              'Employee Id': employee.employeeId || employee.user?.employee?.id,
              'Global External Id': employee.globalExternalId || employee.user?.employee?.globalExternalId,
              'Position': employee.position || employee.user?.employee?.employmentInformation?.careerStage,
              'Department': employee.department || employee.user?.employee?.employmentInformation?.competenceCenter,
              'Location': employee.location || employee.user?.employee?.employmentInformation?.location,
              'Start Date': employee.startDate || employee.user?.employee?.employmentInformation?.dateOfEntry,
              'Company': employee.company || employee.user?.employee?.employmentInformation?.company,
              'Line Of Business': employee.lineOfBusiness || employee.user?.employee?.employmentInformation?.lineOfBusiness,
              'Competence Center': employee.competenceCenter || employee.user?.employee?.employmentInformation?.competenceCenter,
              'Team Name': employee.teamName || employee.user?.employee?.employmentInformation?.teamName,
              'Career Stage': employee.careerStage || employee.user?.employee?.employmentInformation?.careerStage,
              'Career Level': employee.careerLevel || employee.user?.employee?.employmentInformation?.careerLevel,
              'Career Role': employee.careerRole || employee.user?.employee?.employmentInformation?.careerRole,
              'Supervisor': employee.supervisor || employee.user?.employee?.employmentInformation?.supervisor,
              'Job Category': employee.jobCategory || employee.user?.employee?.employmentInformation?.jobCategory,
              'Active': employee.active ?? employee.user?.employee?.employmentInformation?.active,
              'External': employee.external ?? employee.user?.employee?.external,
              'Visible': employee.visible ?? employee.user?.employee?.visible
            })}

            {/* Skills */}
            {employee.skills && renderSection('Skills & Kompetenzen', Star, 'skills', employee.skills)}

            {/* Projects */}
            {employee.projects && renderSection('Projekte', Briefcase, 'projects', employee.projects)}

            {/* Certifications */}
            {employee.certifications && renderSection('Zertifizierungen', Award, 'certifications', employee.certifications)}

            {/* Languages */}
            {employee.languages && renderSection('Sprachen', Globe, 'languages', employee.languages)}

            {/* Education */}
            {employee.education && renderSection('Ausbildung', BookOpen, 'education', employee.education)}

            {/* Import & System Data */}
            {renderSection('Import & System-Daten', Database, 'systemData', {
              source: employee.source,
              authMethod: employee.authMethod,
              importedAt: employee.importedAt,
              lastUpdated: employee.lastUpdated,
              profileId: employee.profileId,
              hasSkills: employee.hasSkills,
              skillsCount: employee.skillsCount,
              hasProjects: employee.hasProjects,
              projectsCount: employee.projectsCount,
              hasCertifications: employee.hasCertifications,
              certificationsCount: employee.certificationsCount,
              hasPersonalData: employee.hasPersonalData,
              skillsSource: employee.skillsSource,
              skillsMethod: employee.skillsMethod
            })}

            {/* User Object */}
            {employee.user && renderSection('User-Daten (Struktur)', User, 'userData', employee.user)}
            
            {/* Employee Object */}
            {employee.user?.employee && renderSection('Employee-Daten (Struktur)', null, 'employeeData', employee.user.employee)}
            
            {/* Raw Data Section */}
            {renderSection('Vollständige Rohdaten (JSON)', Settings, 'rawData', employee)}
          </div>
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ProfilerDataView;
