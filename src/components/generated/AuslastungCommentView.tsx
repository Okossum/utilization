import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { MessageSquare, ArrowRight, User, Building, Target, Users, RefreshCw, Calendar, Baby, Heart, Thermometer, UserX, GraduationCap, ChefHat, Banknote, Dog, Coffee } from 'lucide-react';
import DatabaseService from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
import { UtilizationComment } from './UtilizationComment';
import { PlanningComment } from './PlanningComment';

interface AuslastungCommentViewProps {
  // Props für zukünftige Erweiterungen
}

export function AuslastungCommentView({}: AuslastungCommentViewProps) {
  const { user, loading } = useAuth();
  const [auslastungData, setAuslastungData] = useState<any[]>([]);
  const [einsatzplanData, setEinsatzplanData] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<Record<string, boolean>>({});
  const [personStatus, setPersonStatus] = useState<Record<string, string | undefined>>({});
  const [personTravelReadiness, setPersonTravelReadiness] = useState<Record<string, number | undefined>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [dossiersByPerson, setDossiersByPerson] = useState<Record<string, { projectOffers?: any[]; jiraTickets?: any[]; utilizationComment?: string; planningComment?: string }>>({});

  // Lade alle benötigten Daten
  const loadAuslastungData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Lade Auslastung und Einsatzplan parallel
      const [auslastungData, einsatzplanData] = await Promise.all([
        DatabaseService.getAuslastung(),
        DatabaseService.getEinsatzplan()
      ]);
      
      if (auslastungData) {
        setAuslastungData(auslastungData);
        // console.log entfernt
      }
      
      if (einsatzplanData) {
        setEinsatzplanData(einsatzplanData);
        // console.log entfernt
      }
      
    } catch (error) {
      // console.error entfernt
    } finally {
      setIsLoading(false);
    }
  };



  // Lade Action Items und Status aus localStorage
  useEffect(() => {
    try {
      const savedActionItems = JSON.parse(localStorage.getItem('utilization_action_items') || '{}');
      setActionItems(savedActionItems);
      
      const savedPersonStatus = JSON.parse(localStorage.getItem('utilization_person_status_v1') || '{}');
      setPersonStatus(savedPersonStatus);
      
      const savedPersonTravelReadiness = JSON.parse(localStorage.getItem('utilization_person_travel_readiness_v1') || '{}');
      setPersonTravelReadiness(savedPersonTravelReadiness);
      
    } catch (error) {
      // console.error entfernt
    }
  }, []);

  // Lade Daten beim ersten Render
  useEffect(() => {
    if (!loading && user) {
      loadAuslastungData();
    }
  }, [loading, user]);

  // Filtere Daten: nur Mitarbeiter mit ACT = true
  const filteredAuslastungData = useMemo(() => {
    return auslastungData.filter(item => actionItems[item.person] === true);
  }, [auslastungData, actionItems]);

  // PersonMeta: Extrahiere Metadaten aus Auslastung und Einsatzplan
  const personMeta = useMemo(() => {
    const meta = new Map<string, { lob?: string; bereich?: string; cc?: string; team?: string; lbs?: string; manager?: string }>();
    
    // Sammle Metadaten aus Einsatzplan Collection (Master-Daten)
    if (einsatzplanData) {
      einsatzplanData.forEach((row: any) => {
        if (row.person && !meta.has(row.person)) {
          meta.set(row.person, {
            lob: row.lob,
            bereich: row.bereich,
            cc: row.cc,
            team: row.team,
            lbs: row.lbs,
            manager: row.vg
          });
        }
      });
    }
    
    // Ergänze fehlende Personen aus Auslastung Collection
    if (auslastungData) {
      auslastungData.forEach((row: any) => {
        if (row.person && !meta.has(row.person)) {
          meta.set(row.person, {
            lob: row.lob,
            bereich: row.bereich,
            cc: row.cc,
            team: row.team,
            lbs: row.lbs
          });
        }
      });
    }
    
    return meta;
  }, [auslastungData, einsatzplanData]);

  // Verfügbare Wochen aus den Daten extrahieren (8 Wochen, endet bei aktueller Woche)
  const availableWeeks = useMemo(() => {
    const weeks = new Set<string>();
    auslastungData.forEach(item => {
      if (item.values) {
        Object.keys(item.values).forEach(week => {
          weeks.add(week);
        });
      }
    });
    
    // Sortiere Wochen und nehme die letzten 8
    const sortedWeeks = Array.from(weeks).sort((a, b) => {
      const pa = a.match(/^(\d{2})\/(\d{2})$/);
      const pb = b.match(/^(\d{2})\/(\d{2})$/);
      if (!pa || !pb) return a.localeCompare(b);
      const ya = parseInt(`20${pa[1]}`, 10);
      const wa = parseInt(pa[2], 10);
      const yb = parseInt(`20${pb[1]}`, 10);
      const wb = parseInt(pb[2], 10);
      if (ya !== yb) return ya - yb;
      return wa - wb;
    });
    
    return sortedWeeks.slice(-8);
  }, [auslastungData]);







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
              Auslastung mit Kommentaren
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Direkte Bearbeitung von Auslastung und Kommentaren
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full p-4">
        {/* Status Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Datenbank Status
                </h3>
                <p className="text-sm text-gray-600">
                  {isLoading ? 'Lade Daten...' : `${filteredAuslastungData.length} von ${auslastungData.length} Einträgen (nur ACT = true)`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{filteredAuslastungData.length}</div>
              <div className="text-xs text-gray-500">ACT = true</div>
            </div>
          </div>
        </div>

        {/* Daten Tabelle */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {/* Auslastung-Wochen */}
                  {availableWeeks.map(week => (
                    <th key={week} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-16">
                      <div className="flex flex-col items-center">
                        <span className="font-medium">{week}</span>
                        <span className="text-xs text-gray-400">KW</span>
                      </div>
                    </th>
                  ))}
                  
                  {/* Kommentar-Spalten */}
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-48">
                    <div className="flex items-center justify-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>Auslastung</span>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-48">
                    <div className="flex items-center justify-center gap-1">
                      <ArrowRight className="w-4 h-4" />
                      <span>Planung</span>
                    </div>
                  </th>
                  
                  {/* Mitarbeiter-Informationen */}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-32">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>Name</span>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-24">
                    <span>Bereich</span>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-24">
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      <span>CC</span>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-24">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>Team</span>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-24">
                    <span>LBS</span>
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-24">
                    <span>FK</span>
                  </th>
                </tr>
              </thead>
              
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAuslastungData.map((item, index) => (
                  <motion.tr
                    key={`${item.person}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50"
                  >
                    {/* Auslastung-Wochen */}
                    {availableWeeks.map(week => {
                      const value = item.values?.[week];
                      let bgColor = 'bg-gray-100';
                      let textColor = 'text-gray-500';
                      
                      if (value !== null && value !== undefined) {
                        if (value > 90) {
                          bgColor = 'bg-green-100';
                          textColor = 'text-green-700';
                        } else if (value > 75) {
                          bgColor = 'bg-yellow-100';
                          textColor = 'text-yellow-700';
                        } else {
                          // Alle Werte ≤ 75% (inkl. 0%) sind kritisch und werden rot markiert
                          bgColor = 'bg-red-100';
                          textColor = 'text-red-700';
                        }
                      }
                      
                      return (
                        <td key={week} className={`px-2 py-4 text-center text-sm ${bgColor}`}>
                          {value !== undefined && value !== null ? (
                            <span className={`font-medium ${textColor}`}>
                              {value}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      );
                    })}
                    
                    {/* Kommentar-Spalten - Verwende die gleichen Komponenten wie im Hauptview */}
                    <td className="px-3 py-4">
                      <UtilizationComment 
                        personId={item.person}
                        className="w-full"
                      />
                    </td>
                    <td className="px-3 py-4">
                      <PlanningComment 
                        personId={item.person}
                        className="w-full"
                      />
                    </td>
                    
                    {/* Mitarbeiter-Informationen */}
                    <td className="px-3 py-4 text-sm font-medium text-gray-900">
                      {item.person}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-700">
                      {personMeta.get(item.person)?.bereich || '—'}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-700">
                      {personMeta.get(item.person)?.cc || '—'}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-700">
                      {personMeta.get(item.person)?.team || '—'}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-700">
                      {personMeta.get(item.person)?.lbs || '—'}
                    </td>
                    <td className="px-3 py-4 text-center">
                      {(() => {
                        const manager = personMeta.get(item.person)?.manager;
                        if (!manager) {
                          return (
                            <div className="relative group">
                              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs text-gray-600 font-medium">
                                X
                              </div>
                              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap">
                                Keine Führungskraft
                              </div>
                            </div>
                          );
                        }
                        const initials = manager.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                        return (
                          <div className="relative group">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                              {initials}
                            </div>
                            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap">
                              {manager}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Keine Daten */}
          {filteredAuslastungData.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {auslastungData.length === 0 ? 'Keine Auslastungsdaten verfügbar' : 'Keine Mitarbeiter mit ACT = true gefunden'}
              </h3>
              <p className="text-gray-600">
                {auslastungData.length === 0 
                  ? 'Lade Daten aus der Auslastung-Collection oder prüfe die Verbindung zur Datenbank.'
                  : 'Markiere Mitarbeiter in der Hauptansicht als Action Items (ACT = true), um sie hier anzuzeigen.'
                }
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AuslastungCommentView;
