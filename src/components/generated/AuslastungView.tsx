import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Database, Download, RefreshCw, Search, Calendar, User, Building, Users, Target, TrendingUp } from 'lucide-react';
import DatabaseService from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';

interface AuslastungData {
  person: string;
  lob: string;
  bereich: string;
  cc: string;
  team: string;
  lbs: string;
  values: Record<string, number>;
}

export function AuslastungView() {
  const { user, loading } = useAuth();
  const [auslastungData, setAuslastungData] = useState<AuslastungData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCC, setFilterCC] = useState<string[]>([]);
  const [filterLBS, setFilterLBS] = useState<string[]>([]);
  const [filterTeam, setFilterTeam] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'person' | 'cc' | 'team' | 'lbs'>('person');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Lade Daten aus der Auslastung-Collection
  const loadAuslastungData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await DatabaseService.getAuslastung();
      if (data) {
        setAuslastungData(data);
        // console.log entfernt
      }
    } catch (error) {
      // console.error entfernt
    } finally {
      setIsLoading(false);
    }
  };

  // Lade Daten beim ersten Render
  useEffect(() => {
    if (!loading && user) {
      loadAuslastungData();
    }
  }, [loading, user]);

  // Verfügbare Wochen aus den Daten extrahieren
  const availableWeeks = useMemo(() => {
    const weeks = new Set<string>();
    auslastungData.forEach(item => {
      if (item.values) {
        Object.keys(item.values).forEach(week => {
          weeks.add(week);
        });
      }
    });
    return Array.from(weeks).sort();
  }, [auslastungData]);

  // Filter-Optionen
  const ccOptions = useMemo(() => {
    const ccs = new Set<string>();
    auslastungData.forEach(item => {
      if (item.cc) ccs.add(item.cc);
    });
    return Array.from(ccs).sort();
  }, [auslastungData]);

  const lbsOptions = useMemo(() => {
    const lbss = new Set<string>();
    auslastungData.forEach(item => {
      if (item.lbs) lbss.add(item.lbs);
    });
    return Array.from(lbss).sort();
  }, [auslastungData]);

  const teamOptions = useMemo(() => {
    const teams = new Set<string>();
    auslastungData.forEach(item => {
      if (item.team) teams.add(item.team);
    });
    return Array.from(teams).sort();
  }, [auslastungData]);

  // Gefilterte und sortierte Daten
  const filteredAndSortedData = useMemo(() => {
    let filtered = auslastungData.filter(item => {
      // Suchfilter
      if (searchTerm && !item.person.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // CC Filter
      if (filterCC.length > 0 && !filterCC.includes(item.cc)) {
        return false;
      }
      
      // LBS Filter
      if (filterLBS.length > 0 && !filterLBS.includes(item.lbs)) {
        return false;
      }
      
      // Team Filter
      if (filterTeam.length > 0 && !filterTeam.includes(item.team)) {
        return false;
      }
      
      return true;
    });

    // Sortierung
    filtered.sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';
      
      if (sortDirection === 'desc') {
        [aValue, bValue] = [bValue, aValue];
      }
      
      return String(aValue).localeCompare(String(bValue), 'de');
    });

    return filtered;
  }, [auslastungData, searchTerm, filterCC, filterLBS, filterTeam, sortBy, sortDirection]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredAndSortedData.length === 0) return;
    
    const headers = ['Person', 'LoB', 'Bereich', 'CC', 'Team', 'LBS', ...availableWeeks];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedData.map(item => [
        `"${item.person}"`,
        `"${item.lob || ''}"`,
        `"${item.bereich || ''}"`,
        `"${item.cc || ''}"`,
        `"${item.team || ''}"`,
        `"${item.lbs || ''}"`,
        ...availableWeeks.map(week => item.values?.[week] || '')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `auslastung-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sortierung ändern
  const handleSort = (field: 'person' | 'cc' | 'team' | 'lbs') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Bitte anmelden</h2>
          <p className="text-gray-600">Zugriff nur für angemeldete Benutzer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Auslastung Übersicht
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Alle Daten aus der Auslastung-Collection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAuslastungData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filteredAndSortedData.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              CSV Export
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full p-4 space-y-6">
        {/* Status Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Datenbank Status
                </h3>
                <p className="text-sm text-gray-600">
                  {isLoading ? 'Lade Daten...' : `${auslastungData.length} Einträge geladen`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{auslastungData.length}</div>
              <div className="text-xs text-gray-500">Einträge</div>
            </div>
          </div>
        </div>

        {/* Filter und Suche */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter & Suche</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Suchfeld */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Person suchen</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Namen eingeben..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* CC Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Competence Center</label>
              <select
                multiple
                value={filterCC}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFilterCC(selected);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle CC</option>
                {ccOptions.map(cc => (
                  <option key={cc} value={cc}>{cc}</option>
                ))}
              </select>
            </div>

            {/* LBS Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">LBS</label>
              <select
                multiple
                value={filterLBS}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFilterLBS(selected);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle LBS</option>
                {lbsOptions.map(lbs => (
                  <option key={lbs} value={lbs}>{lbs}</option>
                ))}
              </select>
            </div>

            {/* Team Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team</label>
              <select
                multiple
                value={filterTeam}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFilterTeam(selected);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle Teams</option>
                {teamOptions.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter zurücksetzen */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterCC([]);
                setFilterLBS([]);
                setFilterTeam([]);
              }}
              className="text-sm text-gray-600 hover:text-gray-800 hover:underline"
            >
              Alle Filter zurücksetzen
            </button>
          </div>
        </div>

        {/* Daten Tabelle */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Auslastung Daten ({filteredAndSortedData.length} von {auslastungData.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {/* Sortierbare Spalten */}
                  <th 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('person')}
                  >
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Person
                      {sortBy === 'person' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Building className="w-4 h-4" />
                      LoB
                    </div>
                  </th>
                  
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bereich
                  </th>
                  
                  <th 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('cc')}
                  >
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      CC
                      {sortBy === 'cc' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  
                  <th 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('team')}
                  >
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Team
                      {sortBy === 'team' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  
                  <th 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('lbs')}
                  >
                    LBS
                    {sortBy === 'lbs' && (
                      <span className="text-blue-600">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  
                  {/* Wochen-Spalten */}
                  {availableWeeks.map(week => (
                    <th key={week} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-16">
                      <div className="flex flex-col items-center">
                        <Calendar className="w-3 h-3 mb-1" />
                        {week}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedData.map((item, index) => (
                  <motion.tr
                    key={`${item.person}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-3 py-4 text-sm font-medium text-gray-900">
                      {item.person}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-700">
                      {item.lob || '—'}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-700">
                      {item.bereich || '—'}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-700">
                      {item.cc || '—'}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-700">
                      {item.team || '—'}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-700">
                      {item.lbs || '—'}
                    </td>
                    
                    {/* Wochen-Werte */}
                    {availableWeeks.map(week => {
                      const value = item.values?.[week];
                      let bgColor = 'bg-gray-100';
                      let textColor = 'text-gray-700';
                      
                      if (value !== undefined && value !== null) {
                        if (value > 90) {
                          bgColor = 'bg-green-100';
                          textColor = 'text-green-800';
                        } else if (value > 80) {
                          bgColor = 'bg-yellow-100';
                          textColor = 'text-yellow-800';
                        } else if (value > 0) {
                          bgColor = 'bg-red-100';
                          textColor = 'text-red-800';
                        }
                      }
                      
                      return (
                        <td key={week} className="px-2 py-4 text-center text-sm">
                          {value !== undefined && value !== null ? (
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
                              {value}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Keine Daten */}
          {filteredAndSortedData.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {auslastungData.length === 0 ? 'Keine Daten verfügbar' : 'Keine Daten gefunden'}
              </h3>
              <p className="text-gray-600">
                {auslastungData.length === 0 
                  ? 'Lade Daten aus der Auslastung-Collection oder prüfe die Verbindung zur Datenbank.'
                  : 'Versuche andere Filter-Einstellungen oder lösche die Suche.'
                }
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
