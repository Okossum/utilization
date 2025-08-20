import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Download, FileSpreadsheet, AlertCircle, Users, TrendingUp, Star, Info, Minus, Plus, Calendar, Baby, Heart, Thermometer, UserX, GraduationCap, ChefHat, Database, Target, User, Ticket, Columns, ArrowLeft, MessageSquare, X, ArrowRight, Building2, Link2, Banknote, Dog, Coffee, BarChart3, FileText, ChevronDown, LogOut } from 'lucide-react';
import { AdminDataUploadModal } from './AdminDataUploadModal';
import { EinsatzplanView } from './EinsatzplanView';
import { AuslastungView } from './AuslastungView';
import { useAuth } from '../../contexts/AuthContext';
import { MultiSelectFilter } from './MultiSelectFilter';
import { PersonFilterBar } from './PersonFilterBar';
import DatabaseService from '../../services/database';
import { KpiCardsGrid } from './KpiCardsGrid';
// import { UtilizationChartSection } from './UtilizationChartSection'; // Ausgeblendet
import { UtilizationTrendChart } from './UtilizationTrendChart';
// Removed inline planning editor; Planning via modal remains
import { StatusLabelSelector } from './StatusLabelSelector';
import { EmployeeDossierModal, Employee } from './EmployeeDossierModal';
import { PlanningModal } from './PlanningModal';
import { PlanningCommentModal } from './PlanningCommentModal';
import { UtilizationComment } from './UtilizationComment';
import { SalesOpportunities } from './SalesOpportunities';
import { useAssignments } from '../../contexts/AssignmentsContext';
import { AssignmentEditorModal } from './AssignmentEditorModal';
import ScopeFilterDropdown from './ScopeFilterDropdown';
import { auslastungserklaerungService, personAuslastungserklaerungService, personActionItemService } from '../../lib/firebase-services';
interface UtilizationData {
  person: string;
  week: string;
  utilization: number | null;
  isHistorical: boolean;
}
interface UploadedFile {
  name: string;
  data: any[];
  isValid: boolean;
  error?: string;
}

interface UtilizationReportViewProps {
  actionItems: Record<string, { actionItem: boolean; source: 'manual' | 'rule' | 'default'; updatedBy?: string }>;
  setActionItems: (actionItems: Record<string, { actionItem: boolean; source: 'manual' | 'rule' | 'default'; updatedBy?: string }>) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  isAuslastungViewOpen: boolean;
  setIsAuslastungViewOpen: (open: boolean) => void;
  isEinsatzplanViewOpen: boolean;
  setIsEinsatzplanViewOpen: (open: boolean) => void;
  isColumnsMenuOpen: boolean;
  setIsColumnsMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

export function UtilizationReportView({ 
  actionItems,
  setActionItems,
  isSettingsModalOpen, 
  setIsSettingsModalOpen,
  isAuslastungViewOpen, 
  setIsAuslastungViewOpen,
  isEinsatzplanViewOpen, 
  setIsEinsatzplanViewOpen,
  isColumnsMenuOpen, 
  setIsColumnsMenuOpen 
}: UtilizationReportViewProps) {
  const { user, loading, profile, updateProfile } = useAuth();
  const [showAllData, setShowAllData] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('utilization_show_all_data') || 'false'); } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('utilization_show_all_data', JSON.stringify(showAllData)); } catch {}
  }, [showAllData]);
  const [uploadedFiles, setUploadedFiles] = useState<{
    auslastung?: UploadedFile;
    einsatzplan?: UploadedFile;
  }>({});
  // ✅ VEREINFACHT: Direkte Collections statt Konsolidierung
  const [databaseData, setDatabaseData] = useState<{
    auslastung?: any[];
    einsatzplan?: any[];
  }>({});
  const [dataSource, setDataSource] = useState<'upload' | 'database'>('upload');
  const [selectedPersons, setSelectedPersons] = useState<string[]>([]);
  const [planningForPerson, setPlanningForPerson] = useState<string | null>(null);
  const [planningForWeek, setPlanningForWeek] = useState<{ year: number; week: number } | null>(null);
  const [dossiersByPerson, setDossiersByPerson] = useState<Record<string, { projectOffers?: any[]; jiraTickets?: any[]; utilizationComment?: string; planningComment?: string }>>({});
  const [utilizationCommentForPerson, setUtilizationCommentForPerson] = useState<string | null>(null);
  const [planningCommentForPerson, setPlanningCommentForPerson] = useState<string | null>(null);
  const [isAdminUploadModalOpen, setIsAdminUploadModalOpen] = useState(false);

  const [isAssignmentEditorOpen, setIsAssignmentEditorOpen] = useState(false);
  const [assignmentEditorPerson, setAssignmentEditorPerson] = useState<string | null>(null);

  // Assignments: Zugriff (Preload-Effekt wird weiter unten nach visiblePersons platziert)
  const { getAssignmentsForEmployee, assignmentsByEmployee } = useAssignments();

  // ✅ VEREINFACHT: Nur noch eine Datenquelle - Database (Firebase)
  // Upload-Funktionalität ist jetzt nur noch über Admin-Modal verfügbar

  // Load data from database function
  // ✅ VEREINFACHT: Lade direkt Auslastung und Einsatzplan Collections
  const loadDatabaseData = async () => {
    try {
      console.log('🔍 loadDatabaseData() - Lade Auslastung und Einsatzplan...');

      // Paralleles Laden beider Collections
      const [auslastungData, einsatzplanData] = await Promise.all([
        DatabaseService.getAuslastung(),
        DatabaseService.getEinsatzplan()
      ]);
      
      console.log('🔍 Collections geladen:', {
        auslastung: auslastungData?.length || 0,
        einsatzplan: einsatzplanData?.length || 0
      });

      // Setze beide Collections direkt
      setDatabaseData({ 
        auslastung: auslastungData || [],
        einsatzplan: einsatzplanData || []
      });
      setDataSource('database');
      
      // ✅ KORRIGIERT: Lade Status und Action Items NUR beim initialen Laden der Daten
      await loadPersonStatuses();
      await loadActionItems();
      
      console.log('✅ Database-Daten erfolgreich geladen');
      
    } catch (error) {
      console.error('❌ Fehler in loadDatabaseData:', error);
      setDatabaseData({});
      setDataSource('upload');
    }
  };

  // Load data from database after user is authenticated
  useEffect(() => {
    // Nur laden wenn User eingeloggt ist und nicht mehr im Loading-Status
    if (!loading && user) {
      console.log('🚀 User authentifiziert - lade Daten aus Firebase utilization-Data Collection');
      loadDatabaseData();
    } else if (!loading && !user) {
      console.log('⚠️ User nicht eingeloggt - keine Daten geladen');
    }
  }, [loading, user]);

  // ✅ SCHRITT 5: localStorage-Fallback entfernt - Datenbank-Daten werden erfolgreich geladen
  // Kein localStorage-Fallback mehr nötig, da die Datenbank-Daten funktionieren

  // Clean up old "student" status from database
  useEffect(() => {
    try {
      const raw = localStorage.getItem('utilization_person_status_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        let hasChanges = false;
        const cleaned = { ...parsed };
        
        // Entferne alle "student" Status
        Object.keys(cleaned).forEach(person => {
          if (cleaned[person] === 'student') {
            delete cleaned[person];
            hasChanges = true;
          }
        });
        
        // Speichere bereinigte Daten (nur für Upload-Modus)
        if (hasChanges && dataSource === 'upload') {
          localStorage.setItem('utilization_person_status_v1', JSON.stringify(cleaned));
          // Verwende protectedSetPersonStatus für Upload-Daten
          Object.entries(cleaned).forEach(([person, status]) => {
            if (typeof status === 'string') {
              protectedSetPersonStatus(person, status, 'default');
            }
          });
        }
      }
    } catch {}
  }, []);



  // Save working students toggle state - wird nach der Definition von showWorkingStudents definiert

  // Removed planned engagements and customers state; planning handled via modal & dossier
  // Status-Struktur mit Prioritäts-System (aus Datenbank)
  const [personStatus, setPersonStatus] = useState<Record<string, { status: string; source: 'manual' | 'rule' | 'default' }>>({});
  
  // ✅ KORRIGIERT: Lade Status und Action Items aus der Datenbank beim initialen Laden
  const loadPersonStatuses = async () => {
    try {
      const { personStatusService } = await import('../../lib/firebase-services');
      const statuses = await personStatusService.getAll();
      const statusMap: Record<string, { status: string; source: 'manual' | 'rule' | 'default' }> = {};
      
      statuses.forEach(status => {
        // WICHTIG: Manuelle Status werden NIE überschrieben
        if (status.source === 'manual') {
          statusMap[status.person] = {
            status: status.status,
            source: 'manual'
          };
        } else {
          // Regel-basierte Status nur setzen, wenn kein manueller Status existiert
          if (!statusMap[status.person] || statusMap[status.person].source !== 'manual') {
            statusMap[status.person] = {
              status: status.status,
              source: status.source || 'default'
            };
          }
        }
      });
      
      // Verwende protectedSetPersonStatus für alle geladenen Status
      Object.entries(statusMap).forEach(([person, statusData]) => {
        protectedSetPersonStatus(person, statusData.status, statusData.source);
      });
    } catch (error) {
      console.warn('Fehler beim Laden der Person-Status:', error);
    }
  };
  
  // ✅ KORRIGIERT: Lade Action Items aus der Datenbank
  const loadActionItems = async () => {
    try {
      const { personActionItemService } = await import('../../lib/firebase-services');
      const actionItemsData = await personActionItemService.getAll();
      const actionItemsMap: Record<string, { actionItem: boolean; source: 'manual' | 'rule' | 'default'; updatedBy?: string }> = {};
      
      actionItemsData.forEach(item => {
        // WICHTIG: Manuelle Action Items werden NIE überschrieben
        if (item.source === 'manual') {
          actionItemsMap[item.person] = {
            actionItem: item.actionItem,
            source: 'manual',
            updatedBy: item.updatedBy
          };
        } else {
          // Regel-basierte Action Items nur setzen, wenn kein manueller Status existiert
          if (!actionItemsMap[item.person] || actionItemsMap[item.person].source !== 'manual') {
            actionItemsMap[item.person] = {
              actionItem: item.actionItem,
              source: item.source || 'default',
              updatedBy: item.updatedBy
            };
          }
        }
      });
      
              // ✅ KORRIGIERT: Aktualisiere globalen State
        setActionItems(actionItemsMap);
    } catch (error) {
      console.warn('Fehler beim Laden der Action Items:', error);
    }
  };


  
  // SCHUTZ: Verhindere, dass manuelle Status überschrieben werden
  const protectedSetPersonStatus = (person: string, status: string, source: 'manual' | 'rule' | 'default') => {
    setPersonStatus(prev => {
      const current = prev[person];
      
      // Wenn es bereits einen manuellen Status gibt, darf dieser NIE überschrieben werden
      if (current && current.source === 'manual' && source !== 'manual') {
        console.log(`🚫 SCHUTZ: Manueller Status für ${person} wird nicht überschrieben`);
        return prev; // Keine Änderung
      }
      
      // Ansonsten Status setzen
      return {
        ...prev,
        [person]: { status, source }
      };
    });
  };
  const [personTravelReadiness, setPersonTravelReadiness] = useState<Record<string, number | undefined>>(() => {
    try { return JSON.parse(localStorage.getItem('utilization_person_travel_readiness_v1') || '{}'); } catch { return {}; }
  });
  // Removed persistence effects for planned engagements and customers

  
  // Helper-Funktion für Status-Zugriff mit Prioritäts-System
  const getPersonStatus = (person: string): string | undefined => {
    const statusData = personStatus[person];
    if (!statusData) return undefined;
    
    // Manuelle Einstellungen haben höchste Priorität
    return statusData.status;
  };
  
  // Helper-Funktion für Status-Quelle
  const getPersonStatusSource = (person: string): 'manual' | 'rule' | 'default' => {
    const statusData = personStatus[person];
    return statusData?.source || 'default';
  };
  useEffect(() => { try { localStorage.setItem('utilization_person_travel_readiness_v1', JSON.stringify(personTravelReadiness)); } catch {} }, [personTravelReadiness]);

  // Fehlende Variablen hinzufügen
  const [filterCC, setFilterCC] = useState<string[]>([]);
  const [filterLBS, setFilterLBS] = useState<string[]>([]);
  const [filterLBSExclude, setFilterLBSExclude] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [showActionItems, setShowActionItems] = useState<boolean>(false);
  const [personSearchTerm, setPersonSearchTerm] = useState<string>('');
  
  // ✅ KORRIGIERT: Verwende globalen actionItems State aus App.tsx

  // ✅ NEU: Auslastungserklärung als zusätzliche Spalte (aus Datenbank)
  const [auslastungserklaerungen, setAuslastungserklaerungen] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [personAuslastungserklaerungen, setPersonAuslastungserklaerungen] = useState<Record<string, string>>({});

  // ✅ NEU: Funktionen für Auslastungserklärung (mit Datenbank)
  const addAuslastungserklaerung = async (newName: string) => {
    try {
      await auslastungserklaerungService.save({ name: newName.trim() });
      await loadAuslastungserklaerungen();
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Auslastungserklärung:', error);
    }
  };

  const savePersonAuslastungserklaerung = async (person: string, auslastungserklaerung: string) => {
    try {
      await personAuslastungserklaerungService.update(person, auslastungserklaerung);
      setPersonAuslastungserklaerungen(prev => ({ ...prev, [person]: auslastungserklaerung }));
    } catch (error) {
      console.error('Fehler beim Speichern der Person-Auslastungserklärung:', error);
    }
  };

  // ✅ NEU: Auslastungserklärungen aus Datenbank laden
  const loadAuslastungserklaerungen = async () => {
    try {
      const data = await auslastungserklaerungService.getActive();
      setAuslastungserklaerungen(data);
    } catch (error) {
      console.error('Fehler beim Laden der Auslastungserklärungen:', error);
    }
  };

  // ✅ NEU: Person-Auslastungserklärungen aus Datenbank laden
  const loadPersonAuslastungserklaerungen = async () => {
    try {
      const data = await personAuslastungserklaerungService.getAll();
      const personMap: Record<string, string> = {};
      data.forEach(item => {
        personMap[item.person] = item.auslastungserklaerung;
      });
      setPersonAuslastungserklaerungen(personMap);
    } catch (error) {
      console.error('Fehler beim Laden der Person-Auslastungserklärungen:', error);
    }
  };

  // ✅ NEU: Auslastungserklärungen beim Laden der Daten laden
  useEffect(() => {
    loadAuslastungserklaerungen();
    loadPersonAuslastungserklaerungen();
  }, []);
  


  const [showWorkingStudents, setShowWorkingStudents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('utilization_show_working_students') || 'true'); } catch { return true; }
  });

  // Save working students toggle state
  useEffect(() => {
    try {
      localStorage.setItem('utilization_show_working_students', JSON.stringify(showWorkingStudents));
    } catch {}
  }, [showWorkingStudents]);
  


  // Sichtbare Spalten konfigurieren (persistiert)
  const VISIBLE_COLUMNS_KEY = 'utilization_visible_columns_v1';
  type VisibleColumns = {
    avg4: boolean;
    historyWeeks: boolean;
    act: boolean;
    vg: boolean;
    person: boolean; // Guardrail: bleibt immer true
    lbs: boolean;
    status: boolean;
    planningComment: boolean;
    forecastWeeks: boolean;
    customer: boolean;
    probability: boolean;
    startKw: boolean;
    planning: boolean;
    ticket: boolean;
  };
  const defaultVisibleColumns: VisibleColumns = {
    avg4: true,
    historyWeeks: true,
    act: true,
    vg: true,
    person: true,
    lbs: true,
    status: true,
    planningComment: true,
    forecastWeeks: true,
    customer: true,
    probability: true,
    startKw: true,
    planning: true,
    ticket: true
  };
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(() => {
    try {
      const raw = localStorage.getItem(VISIBLE_COLUMNS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return { ...defaultVisibleColumns, ...(parsed || {}) } as VisibleColumns;
    } catch {
      return { ...defaultVisibleColumns } as VisibleColumns;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(VISIBLE_COLUMNS_KEY, JSON.stringify(visibleColumns)); } catch {}
  }, [visibleColumns]);

  const columnsMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(e.target as Node)) {
        setIsColumnsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  
  // Employee Dossier Modal
  const [isEmployeeDossierOpen, setIsEmployeeDossierOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isSalesOpportunitiesOpen, setIsSalesOpportunitiesOpen] = useState(false);
  const [salesOpportunitiesPerson, setSalesOpportunitiesPerson] = useState<string | null>(null);
  const currentWeek = getISOWeek(new Date());
  const currentIsoYear = getISOWeekYear(new Date());
  const [forecastStartWeek, setForecastStartWeek] = useState(currentWeek);
  const [lookbackWeeks, setLookbackWeeks] = useState(8);
  const [forecastWeeks, setForecastWeeks] = useState(8);

  // Removed planned engagements & customers local storage keys

  // Entferne automatische Basiswoche-Ausrichtung – Guardrail: keine Automatik
  // (vorherige useEffect-Anpassungen bleiben entfernt)

  // Helper functions to get status icon and color
  const getWeekValue = (row: any, weekNum: number, year: number): number | undefined => {
    if (!row) return undefined;
    
    const asNumber = (raw: unknown): number | undefined => {
      const num = Number(raw);
      return Number.isFinite(num) ? (num as number) : undefined;
    };

    // ✅ NEUE STRUKTUR: UtilizationData aus Datenbank (konsolidierte Daten)
    // Diese Struktur wird verwendet, wenn utilizationData direkt transformiert wurde
    if (typeof row === 'object' && row.week && (row.finalValue !== undefined || row.utilization !== undefined)) {
      // Das ist bereits ein transformierter UtilizationData-Eintrag
      // Die Woche wird in der transformation direkt als "utilization" gesetzt
      return asNumber(row.utilization);
    }

    // ✅ ALTE STRUKTUR: Upload-Daten oder ursprüngliche Datenbankdaten (flache Struktur)
    // Support both structures: values object and flat properties
    const values = row?.values as Record<string, unknown> | undefined || row as Record<string, unknown>;
    if (!values) return undefined;

    // 1) YY/WW format e.g., "25/33" - PRIMÄRES FORMAT vom Parser
    const yy = String(year).slice(-2);
    const ww = String(weekNum).padStart(2, '0');
    const yyWwKey = `${yy}/${ww}`;
    if (yyWwKey in values) return asNumber(values[yyWwKey]);

    // 2) Exact: "KW n-YYYY"
    const key1 = `KW ${weekNum}-${year}`;
    if (key1 in values) return asNumber(values[key1]);

    // 3) Exact without year: "KW n"
    const key2 = `KW ${weekNum}`;
    if (key2 in values) return asNumber(values[key2]);

    // 4) Variant: "YYYY-KWn" or "YYYY-KW n"
    const regexYFirst = new RegExp(`^\\d{4}[-\\/]?kw\\s*${weekNum}$`, 'i');
    const yFirstKey = Object.keys(values).find(k => regexYFirst.test(k.trim()));
    if (yFirstKey) return asNumber(values[yFirstKey]);

    // 5) Generic fallback: any key that contains "KW" and the week number as a whole token
    const regexGeneric = new RegExp(`(^|[^\\d])${weekNum}([^\\d]|$)`, '');
    const genericKey = Object.keys(values).find(k => /kw/i.test(k) && regexGeneric.test(k));
    if (genericKey) return asNumber(values[genericKey]);

    return undefined;
  };

  const getStatusIcon = (statusId: string | undefined) => {
    if (!statusId) return null;
    
    const statusIcons: Record<string, React.ReactNode> = {
      'vacation': <Calendar className="w-4 h-4" />,
      'parental-leave': <Baby className="w-4 h-4" />,
      'maternity-leave': <Heart className="w-4 h-4" />,
      'sick-leave': <Thermometer className="w-4 h-4" />,
      'termination': <UserX className="w-4 h-4" />,
      'student': <GraduationCap className="w-4 h-4" />,
    };
    
    return statusIcons[statusId] || null;
  };

  const getStatusColor = (statusId: string | undefined) => {
    if (!statusId) return 'text-gray-400';
    
    const statusColors: Record<string, string> = {
      'vacation': 'text-blue-600',
      'parental-leave': 'text-purple-600',
      'maternity-leave': 'text-pink-600',
      'sick-leave': 'text-red-600',
      'termination': 'text-gray-600',
      'student': 'text-green-600',
    };
    
    return statusColors[statusId] || 'text-gray-400';
  };

  // Helper function to check if a week is in a planned project
  // Removed isWeekInPlannedProject (inline planning removed)
  const isWeekInPlannedProject = (_person: string, _weekNumber: number) => false;

  // Employee Dossier Modal öffnen
  const openEmployeeDossier = async (person: string) => {
    // Hole Excel-Daten für diese Person
    let excelData: {
      name: string;
      manager: string;
      team: string;
      competenceCenter: string;
      lineOfBusiness: string;
      careerLevel: string;
    } | undefined = undefined;
    
    // Priorität: Datenbank hat immer erste Priorität
    let einsatzplanData: any = null;
    
    if (dataSource === 'database' && databaseData.einsatzplan) {
      einsatzplanData = databaseData.einsatzplan.find((item: any) => item.person === person);
    }
    
    if (einsatzplanData) {
      // Einsatzplan-Daten aus der Datenbank haben höchste Priorität
      excelData = {
        name: person,
        manager: String(einsatzplanData.vg || ''),
        team: String(einsatzplanData.team || ''),
        competenceCenter: String(einsatzplanData.cc || ''),
        lineOfBusiness: String(einsatzplanData.bereich || ''),
        careerLevel: String(einsatzplanData.lbs || '')
      };
    } else if (dataSource === 'database' && databaseData.auslastung) {
      // Fallback: Auslastung Collection wenn kein Einsatzplan verfügbar
      const personData = databaseData.auslastung.find(item => item.person === person);
      if (personData) {
        excelData = {
          name: person,
          manager: '', // VG nicht in UtilizationData verfügbar
          team: String(personData.team || ''),
          competenceCenter: String(personData.cc || ''),
          lineOfBusiness: String(personData.bereich || ''),
          careerLevel: String(personData.lbs || '')
        };
      }
    } else {
      // Kein Eintrag in der Datenbank gefunden
      excelData = {
        name: person,
        manager: 'Eintrag fehlt',
        team: 'Eintrag fehlt',
        competenceCenter: 'Eintrag fehlt',
        lineOfBusiness: 'Eintrag fehlt',
        careerLevel: 'Eintrag fehlt'
      };
    }

    // Prefetch vermeiden: Modal lädt Dossier selbst anhand der Employee-ID
    if (!dossiersByPerson[person]) {
      setDossiersByPerson(prev => ({
        ...prev,
        [person]: {
          projectOffers: [],
          jiraTickets: [],
          utilizationComment: '',
          planningComment: ''
        }
      }));
    }

    const employeeId = String(personMeta.get(person)?.id || person);
    const employee: Employee = {
      id: employeeId,
      name: person,
      careerLevel: excelData?.careerLevel || '',
      manager: excelData?.manager || '',
      team: excelData?.team || '',
      competenceCenter: excelData?.competenceCenter || '',
      lineOfBusiness: excelData?.lineOfBusiness || '',
      email: '',
      phone: '',
      projectHistory: [],
              // simpleProjects: [], // Entfernt da nicht in Employee Interface definiert
      strengths: '',
      weaknesses: '',
      comments: '',
      travelReadiness: String(personTravelReadiness[person] || ''),
      projectOffers: dossiersByPerson[person]?.projectOffers || [],
      jiraTickets: dossiersByPerson[person]?.jiraTickets || [],
      excelData: excelData
    };

    setSelectedEmployee(employee);
    setIsEmployeeDossierOpen(true);
  };

  // Mock data for demonstration
  const mockData: UtilizationData[] = useMemo(() => {
    const persons = ['Max Mustermann', 'Anna Schmidt', 'Peter Weber', 'Lisa Müller', 'Tom Fischer'];
    const totalWeeks = lookbackWeeks + forecastWeeks;
    const startWeek = forecastStartWeek - lookbackWeeks;
    const weeks = Array.from({
      length: totalWeeks
    }, (_, i) => `${currentIsoYear}-KW${startWeek + i}`);
    return persons.flatMap(person => weeks.map((week, weekIndex) => ({
      person,
      week,
      utilization: Math.random() > 0.1 ? Math.round(Math.random() * 40 + 70) : null,
      isHistorical: weekIndex < lookbackWeeks
    })));
  }, [lookbackWeeks, forecastWeeks, forecastStartWeek, currentIsoYear]);
  // ✅ VEREINFACHT: Nur noch UtilizationData verarbeiten
  const consolidatedData: UtilizationData[] | null = useMemo(() => {
    if (dataSource === 'database' && databaseData.auslastung) {
      console.log('🔍 UtilizationData für UI transformieren:', {
        count: databaseData.auslastung.length,
        sample: databaseData.auslastung[0]
      });

      // ✅ Konvertiere Backend YY/WW Format zu Frontend YYYY-KWnn Format
      const transformed = databaseData.auslastung.map((item: any) => {
        // Backend: "25/33" → Frontend: "2025-KW33"
        let uiWeek = item.week;
        if (item.week && item.week.match(/^\d{2}\/\d{2}$/)) {
          const [yy, ww] = item.week.split('/');
          const fullYear = `20${yy}`;
          uiWeek = `${fullYear}-KW${parseInt(ww, 10)}`;
        }
        
        return {
          person: item.person,
          week: uiWeek,
          utilization: item.finalValue !== undefined ? item.finalValue : 
                      item.utilization !== undefined ? item.utilization :
                      item.auslastungValue !== undefined ? item.auslastungValue :
                      item.einsatzplanValue,
          isHistorical: item.isHistorical
        };
      }).filter((item: any) => item.utilization !== null && item.utilization !== undefined);

      console.log('✅ UtilizationData transformiert:', {
        inputCount: databaseData.auslastung.length,
        outputCount: transformed.length,
        sample: transformed[0]
      });

      return transformed;
    }

    // Upload-Modus: Verarbeite Upload-Dateien (Original-Logik beibehalten für Upload)
    if (dataSource === 'upload') {
      const aus = uploadedFiles.auslastung?.data as any[] | null;
      const ein = uploadedFiles.einsatzplan?.data as any[] | null;
      
      if (!aus && !ein) return null;

      const normalizePersonKey = (s: string) => {
        const cleaned = s.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
        if (cleaned === 'Leisen, Wie') return 'Leisen, Wei';
        if (cleaned === 'Leisen, Wei') return 'Leisen, Wei';
        return cleaned;
      };

      const leftStart = forecastStartWeek - lookbackWeeks + 1;
      const leftWeeksArr = Array.from({ length: lookbackWeeks }, (_, i) => leftStart + i);
      const rightWeeksArr = Array.from({ length: forecastWeeks }, (_, i) => forecastStartWeek + 1 + i);
      const currentYear = currentIsoYear;

      const ausMap = new Map<string, any>();
      const einMap = new Map<string, any>();
      aus?.forEach(r => ausMap.set(normalizePersonKey(r.person), r));
      ein?.forEach(r => einMap.set(normalizePersonKey(r.person), r));
      
      const allNames = Array.from(new Set([
        ...(aus || []).map(r => normalizePersonKey(r.person)),
        ...(ein || []).map(r => normalizePersonKey(r.person))
      ])).sort((a, b) => a.split(',')[0].localeCompare(b.split(',')[0], 'de'));

      const out: UtilizationData[] = [];
      for (const personKey of allNames) {
        // Historical weeks
        for (const weekNum of leftWeeksArr) {
          const uiLabel = `${currentYear}-KW${weekNum}`;
          const aRow = ausMap.get(personKey);
          const eRow = einMap.get(personKey);
          let val: number | null = null;
          const fromAus = getWeekValue(aRow, weekNum, currentYear);
          const fromEin = getWeekValue(eRow, weekNum, currentYear);
          if (fromAus !== undefined) val = fromAus;
          else if (fromEin !== undefined) val = fromEin;
          if (val !== null) {
            out.push({ 
              person: personKey, 
              week: uiLabel, 
              utilization: Math.round(val * 10) / 10, 
              isHistorical: true 
            });
          }
        }
        // Forecast weeks
        for (const weekNum of rightWeeksArr) {
          const uiLabel = `${currentYear}-KW${weekNum}`;
          const aRow = ausMap.get(personKey);
          const eRow = einMap.get(personKey);
          let val: number | null = null;
          const fromAus = getWeekValue(aRow, weekNum, currentYear);
          const fromEin = getWeekValue(eRow, weekNum, currentYear);
          if (fromAus !== undefined) val = fromAus;
          else if (fromEin !== undefined) val = fromEin;
          if (val !== null) {
            out.push({ 
              person: personKey, 
              week: uiLabel, 
              utilization: Math.round(val * 10) / 10, 
              isHistorical: false 
            });
          }
        }
      }
      return out;
    }

    // ✅ ROBUSTER FALLBACK: Wenn weder DB noch Upload-Daten da sind
    console.log('⚠️ Keine Daten verfügbar - weder Database noch Upload');
    return [];
  }, [uploadedFiles, databaseData, dataSource, forecastStartWeek, lookbackWeeks, forecastWeeks, currentIsoYear]);

  // ✅ VEREINFACHT: Erstelle View-Daten direkt aus Auslastung und Einsatzplan
  const dataForUI: UtilizationData[] = useMemo(() => {
    if (dataSource === 'database' && databaseData.auslastung && databaseData.einsatzplan) {
      console.log('🔍 Erstelle UI-Daten aus Auslastung + Einsatzplan Collections');
      
      const combinedData: UtilizationData[] = [];
      
      // ✅ VEREINFACHT: Verwende YY/WW Format direkt (wie Charts erwarten)
      // Verarbeite Auslastung-Daten (historisch)
      databaseData.auslastung.forEach(row => {
        if (row.values) {
          Object.entries(row.values).forEach(([weekKey, value]) => {
            if (typeof value === 'number' && weekKey.match(/^\d{2}\/\d{2}$/)) {
              combinedData.push({
                person: row.person || 'Unknown',
                week: weekKey, // ✅ Direkt YY/WW Format verwenden  
                utilization: value,
                isHistorical: true
              });
            }
          });
        }
      });
      
      // Verarbeite Einsatzplan-Daten (forecast)
      databaseData.einsatzplan.forEach(row => {
        if (row.values) {
          Object.entries(row.values).forEach(([weekKey, value]) => {
            if (typeof value === 'number' && weekKey.match(/^\d{2}\/\d{2}$/)) {
              combinedData.push({
                person: row.person || 'Unknown',
                week: weekKey, // ✅ Direkt YY/WW Format verwenden
                utilization: value,
                isHistorical: false
              });
            }
          });
        }
      });
      
      // ✅ Ermittle verfügbare Wochen aus echten Daten
      const allWeeks = [...new Set(combinedData.map(item => item.week))].sort();
      
      console.log('✅ UI-Daten erstellt:', {
        auslastungRows: databaseData.auslastung.length,
        einsatzplanRows: databaseData.einsatzplan.length,
        totalDataPoints: combinedData.length,
        availableWeeks: allWeeks,
        sampleData: combinedData.slice(0, 3)
      });
      
      return combinedData;
    }
    
    // Fallback auf Upload-Daten
    if (dataSource === 'upload' && consolidatedData && consolidatedData.length > 0) {
      return consolidatedData;
    }
    
    // Letzter Fallback: Mock-Daten
    console.log('⚠️ Verwende Mock-Daten als Fallback');
    return mockData;
  }, [dataSource, databaseData, consolidatedData]);
  
  // Debug-Log für dataForUI
  useEffect(() => {
    console.log('🔍 dataForUI aktualisiert:', {
      dataSource,
      consolidatedDataCount: consolidatedData?.length || 0,
      mockDataCount: mockData.length,
      finalCount: dataForUI.length,
      sample: dataForUI[0]
    });
  }, [dataForUI, dataSource, consolidatedData]);

  // Automatische ACT-Checkbox Aktivierung basierend auf niedriger Auslastung
  useEffect(() => {
    if (!dataForUI || dataForUI.length === 0) return;

    const autoSetActionItems = () => {
      const newActionItems: Record<string, boolean> = {};
      
      // Alle Personen sammeln
      const allPersons = Array.from(new Set(dataForUI.map(item => item.person)));
      
      allPersons.forEach(person => {
        // Letzte 4 Wochen aus der Auslastung prüfen (YY/WW Format)
        const last4Weeks = Array.from({ length: 4 }, (_, i) => {
          const weekNumber = forecastStartWeek - 4 + i;
          const yy = String(currentIsoYear).slice(-2);
          const weekKey = `${yy}/${String(weekNumber).padStart(2, '0')}`; // "25/33"
          const weekData = dataForUI.find(item => 
            item.person === person && 
            item.week === weekKey &&
            item.isHistorical
          );
          return weekData?.utilization || 0;
        });

        // Nächste 8 Wochen aus dem Einsatzplan prüfen (YY/WW Format)
        const next8Weeks = Array.from({ length: 8 }, (_, i) => {
          const weekNumber = forecastStartWeek + i;
          const yy = String(currentIsoYear).slice(-2);
          const weekKey = `${yy}/${String(weekNumber).padStart(2, '0')}`; // "25/33"
          const weekData = dataForUI.find(item => 
            item.person === person && 
            item.week === weekKey &&
            !item.isHistorical
          );
          return weekData?.utilization || 0;
        });

        // Durchschnitt der letzten 4 Wochen
        const avgLast4Weeks = last4Weeks.reduce((sum, val) => sum + val, 0) / last4Weeks.length;
        
        // Durchschnitt der nächsten 8 Wochen
        const avgNext8Weeks = next8Weeks.reduce((sum, val) => sum + val, 0) / next8Weeks.length;

        // Automatisch ACT-Checkbox aktivieren wenn Durchschnitt der nächsten 8 Wochen <= 25%
        if (avgNext8Weeks <= 25) {
          newActionItems[person] = true;
        }
      });

      // ✅ KORRIGIERT: Logik für regelbasierte Werte
      if (Object.keys(newActionItems).length > 0) {
        const updatedActionItems: Record<string, { actionItem: boolean; source: 'manual' | 'rule' | 'default'; updatedBy?: string }> = { ...actionItems };
        
        Object.entries(newActionItems).forEach(([person, actionItem]) => {
          const current = actionItems[person];
          
          // ✅ NEUE LOGIK: Manuelle Werte NIEMALS überschreiben
          if (current?.source === 'manual') {
            // Manuelle Werte bleiben unverändert
            console.log(`🔒 Manueller Wert für ${person} bleibt erhalten:`, current.actionItem);
          } else {
            // Regel-basierte oder Default-Werte können überschrieben werden
            const shouldUpdate = !current || current.actionItem !== actionItem;
            
            if (shouldUpdate) {
              console.log(`🔄 Aktualisiere ${person} von ${current?.actionItem} auf ${actionItem} (source: rule)`);
              updatedActionItems[person] = { actionItem, source: 'rule', updatedBy: undefined };
            }
          }
        });
        
        // ✅ Aktualisiere globalen State
        setActionItems(updatedActionItems);
      }
    };

    // ✅ NEU: autoSetActionItems() aufrufen wenn sich Daten ändern (ohne actionItems dependency)
    if (dataSource === 'database') {
      autoSetActionItems();
    }
  }, [dataForUI, forecastStartWeek, currentIsoYear, dataSource]);



  // ✅ NEU: Persistiere regelbasierte Werte in der Datenbank
  useEffect(() => {
    if (dataSource === 'database' && Object.keys(actionItems).length > 0) {
      // Speichere alle regelbasierten Werte in der Datenbank
      Object.entries(actionItems).forEach(async ([person, item]) => {
        if (item.source === 'rule') {
          try {
            await personActionItemService.update(person, item.actionItem, 'rule');
            console.log(`💾 Regelbasierter Wert für ${person} in DB gespeichert:`, item.actionItem);
          } catch (error) {
            console.error(`❌ Fehler beim Speichern des regelbasierten Werts für ${person}:`, error);
          }
        }
      });
    }
  }, [actionItems, dataSource]);







  // ✅ NEU: PersonMeta primär aus Einsatzplan Collection für alle Mitarbeiter-Informationen
  const personMeta = useMemo(() => {
    const meta = new Map<string, { lob?: string; bereich?: string; cc?: string; team?: string; lbs?: string; careerLevel?: string }>();
    
    // ✅ NEU: Extrahiere Metadaten primär aus Einsatzplan Collection (Master-Daten)
    if (dataSource === 'database' && databaseData.einsatzplan) {
      const personMetaMap = new Map<string, any>();
      
      // Sammle Metadaten aus Einsatzplan Collection (nehme ersten Eintrag pro Person)
      databaseData.einsatzplan.forEach((row: any) => {
        if (row.person && !personMetaMap.has(row.person)) {
          personMetaMap.set(row.person, {
            lob: row.lob,
            bereich: row.bereich,
            cc: row.cc,
            team: row.team,
            lbs: row.lbs,
            careerLevel: row.careerLevel,
            manager: row.vg
          });
        }
      });
      
      // Ergänze fehlende Personen aus Auslastung Collection (nur als Fallback)
      if (databaseData.auslastung) {
        databaseData.auslastung.forEach((row: any) => {
          if (row.person && !personMetaMap.has(row.person)) {
            personMetaMap.set(row.person, {
              lob: row.lob,
              bereich: row.bereich,
              cc: row.cc,
              team: row.team,
              lbs: row.lbs,
              careerLevel: row.careerLevel
            });
          }
        });
      }
      
      return personMetaMap;
    }

    // Upload-Modus: Verarbeite Upload-Dateien mit Original-Logik
    if (dataSource === 'upload') {
      const aus = uploadedFiles.auslastung?.data as any[] | null;
      const ein = uploadedFiles.einsatzplan?.data as any[] | null;

      const getField = (row: any, candidates: string[]): string | undefined => {
        for (const key of candidates) {
          const v = row?.[key];
          if (typeof v === 'string' && v.trim()) return String(v);
        }
        return undefined;
      };
      
      const parseBereich = (raw?: string): { bereich?: string } => {
        if (!raw || !raw.trim()) return {};
        const match = raw.match(/^\s*.+?\s*\(([^)]+)\)\s*$/);
        if (match) return { bereich: match[1].trim() };
        return { bereich: raw.trim() };
      };
      
      const fill = (rows?: any[]) => {
        rows?.forEach(r => {
          if (!r?.person) return;
          const current = meta.get(r.person) || {} as any;
          const lob = getField(r, ['LoB','lob','LOB','lineOfBusiness','LineOfBusiness','Line of Business']);
          const bereichRaw = getField(r, ['Bereich','bereich']);
          const bereichValue = parseBereich(bereichRaw || '').bereich || bereichRaw;
          const cc = getField(r, ['CC','cc','competenceCenter','CompetenceCenter','Competence Center','CC ']);
          const team = getField(r, ['Team','team','T ']);
          const lbs = getField(r, ['lbs','LBS']);
          meta.set(r.person, {
            lob: lob ?? current.lob,
            cc: cc ?? current.cc,
            lbs: lbs ?? current.lbs,
            team: team ?? current.team,
          });
          if (bereichValue) (meta.get(r.person) as any).bereich = bereichValue;
        });
      };
      
      fill(aus || undefined);
      fill(ein || undefined);
    }

    return meta;
  }, [uploadedFiles, databaseData, dataSource]);

  // ✅ NEU: FK-Regel nach Auslastungs-Regel anwenden
  useEffect(() => {
    if (!personMeta || personMeta.size === 0 || dataSource !== 'database') return;

    const applyFKRule = () => {
      const updatedActionItems = { ...actionItems };
      let hasChanges = false;

      // Prüfe alle Personen mit regelbasierten Toggles
      Object.entries(actionItems).forEach(([person, item]) => {
        if (item.source === 'rule') {
          const manager = personMeta.get(person)?.manager;
          // Falls kein Manager (FK="X"), Toggle entfernen
          if (!manager) {
            updatedActionItems[person] = { actionItem: false, source: 'rule', updatedBy: undefined };
            hasChanges = true;
            console.log(`🔒 FK-Regel: Toggle für ${person} entfernt (keine Führungskraft)`);
          }
        }
      });

      if (hasChanges) {
        setActionItems(updatedActionItems);
      }
    };

    applyFKRule();
  }, [personMeta, actionItems, dataSource]);



  // Options for dropdowns
  const ccOptions = useMemo(() => {
    const s = new Set<string>();
    personMeta.forEach(m => { if (m.cc) s.add(String(m.cc)); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'de'));
  }, [personMeta]);
  const lobOptions = useMemo(() => {
    const s = new Set<string>();
    personMeta.forEach(m => { if (m.lob) s.add(String(m.lob)); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'de'));
  }, [personMeta]);
  const bereichOptions = useMemo(() => {
    const s = new Set<string>();
    personMeta.forEach(m => { const b = (m as any).bereich; if (b && String(b).trim()) s.add(String(b)); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'de'));
  }, [personMeta]);
  const teamOptions = useMemo(() => {
    const s = new Set<string>();
    personMeta.forEach(m => { if (m.team) s.add(String(m.team)); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'de'));
  }, [personMeta]);
  const lbsOptions = useMemo(() => {
    const s = new Set<string>();
    
    // Sammle LBS aus personMeta (aktuell sichtbare Personen)
    personMeta.forEach(m => { if (m.lbs) s.add(String(m.lbs)); });
    
    // Sammle LBS aus der gesamten Datenbank (alle verfügbaren Werte)
    if (dataSource === 'database') {
      // Aus Einsatzplan Collection
      databaseData.einsatzplan?.forEach((row: any) => {
        if (row.lbs && String(row.lbs).trim()) {
          s.add(String(row.lbs).trim());
        }
      });
      
      // Aus Auslastung Collection
      databaseData.auslastung?.forEach((row: any) => {
        if (row.lbs && String(row.lbs).trim()) {
          s.add(String(row.lbs).trim());
        }
      });
    }
    
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'de'));
  }, [personMeta, dataSource, databaseData]);
  
  const statusOptions = useMemo(() => {
    // Verwende nur die deutschen Bezeichnungen wie im StatusLabelSelector
    const STATUS_OPTIONS = [
      { id: 'vacation', label: 'Urlaub' },
      { id: 'parental-leave', label: 'Elternzeit' },
      { id: 'maternity-leave', label: 'Mutterschutz' },
      { id: 'sick-leave', label: 'Krankheit' },
      { id: 'long-absence', label: 'Lange Abwesent' },
      { id: 'termination', label: 'Kündigung' },
    ];
    
    // Verwende nur die deutschen Labels, nicht die IDs
    return STATUS_OPTIONS.map(status => status.label).sort((a, b) => a.localeCompare(b, 'de'));
  }, []);

  // Auswahlzustände (persistiert)
  const [selectedLoB, setSelectedLoB] = useState<string>('');
  const [selectedBereich, setSelectedBereich] = useState<string>('');
  const [selectedCC, setSelectedCC] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  // Initialwerte aus Profil laden
  useEffect(() => {
    if (!profile) return;
    setSelectedLoB(String(profile.lob || ''));
    setSelectedBereich(String((profile as any).bereich || ''));
    setSelectedCC(String(profile.competenceCenter || ''));
    setSelectedTeam(String(profile.team || ''));
  }, [profile?.lob, (profile as any)?.bereich, profile?.competenceCenter, profile?.team]);
  // Defaults: wenn nur eine Option vorhanden und nichts gewählt, automatisch setzen
  useEffect(() => { if (!selectedLoB && lobOptions.length === 1) setSelectedLoB(lobOptions[0]); }, [lobOptions]);
  useEffect(() => { if (!selectedBereich && bereichOptions.length === 1) setSelectedBereich(bereichOptions[0]); }, [bereichOptions]);
  useEffect(() => { if (!selectedCC && ccOptions.length === 1) setSelectedCC(ccOptions[0]); }, [ccOptions]);
  useEffect(() => { if (!selectedTeam && teamOptions.length === 1) setSelectedTeam(teamOptions[0]); }, [teamOptions]);
  // Korrigiere Auswahl, falls nicht mehr vorhanden
  useEffect(() => { if (selectedLoB && !lobOptions.includes(selectedLoB)) setSelectedLoB(''); }, [lobOptions]);
  useEffect(() => { if (selectedBereich && !bereichOptions.includes(selectedBereich)) setSelectedBereich(''); }, [bereichOptions]);
  useEffect(() => { if (selectedCC && !ccOptions.includes(selectedCC)) setSelectedCC(''); }, [ccOptions]);
  useEffect(() => { if (selectedTeam && !teamOptions.includes(selectedTeam)) setSelectedTeam(''); }, [teamOptions]);

  const filteredData = useMemo(() => {
    let base = dataForUI;
    
    // Working Students Filter
    if (!showWorkingStudents) {
      base = base.filter(d => {
        const lbs = personMeta.get(d.person)?.lbs;
        return lbs !== 'Working Student' && lbs !== 'Working student' && lbs !== 'working student';
      });
    }
    
    // Personensuche Filter (wenn Suchbegriff eingegeben wurde)
    if (personSearchTerm.trim()) {
      base = base.filter(d => 
        d.person.toLowerCase().includes(personSearchTerm.toLowerCase())
      );
    }
    
    if (filterCC.length > 0) base = base.filter(d => filterCC.includes(String(personMeta.get(d.person)?.cc || '')));
    if (filterLBS.length > 0) base = base.filter(d => filterLBS.includes(String(personMeta.get(d.person)?.lbs || '')));
    if (filterLBSExclude.length > 0) base = base.filter(d => !filterLBSExclude.includes(String(personMeta.get(d.person)?.lbs || '')));
    if (filterStatus.length > 0) base = base.filter(d => {
      const personStatusValue = getPersonStatus(d.person);
      if (!personStatusValue) return true; // Personen ohne Status werden angezeigt
      
      // Prüfe ob der Status im Filter enthalten ist (sowohl ID als auch Label)
      const statusMatches = filterStatus.some(filterStatusItem => {
        // Direkte Übereinstimmung
        if (filterStatusItem === personStatusValue) return true;
        
        // Mapping von ID zu Label
        const statusMapping: Record<string, string> = {
          'vacation': 'Urlaub',
          'parental-leave': 'Elternzeit',
          'maternity-leave': 'Mutterschutz',
          'sick-leave': 'Krankheit',
          'long-absence': 'Lange Abwesent',
          'termination': 'Kündigung'
        };
        
        return filterStatusItem === statusMapping[personStatusValue] || 
               personStatusValue === statusMapping[filterStatusItem];
      });
      
      // EXCLUDE Filter: Zeige nur Personen, deren Status NICHT im Filter enthalten ist
      return !statusMatches;
    });
    
    // Action Items Filter
    if (showActionItems) {
      base = base.filter(d => {
        const actionItem = actionItems[d.person];
        return actionItem && actionItem.actionItem === true;
      });
    }
    
    if (selectedPersons.length > 0) {
      base = base.filter(item => selectedPersons.includes(item.person));
    }

    // Filter nach LoB/Bereich/CC/Team aus Header-Auswahl
    // Header-Auswahl-Filter nur anwenden, wenn nicht "Alle Daten" aktiv ist
    if (!showAllData) {
      if (selectedLoB) {
        base = base.filter(d => (personMeta.get(d.person) as any)?.lob === selectedLoB);
      }
      if (selectedBereich) {
        base = base.filter(d => (personMeta.get(d.person) as any)?.bereich === selectedBereich);
      }
      if (selectedCC) {
        base = base.filter(d => (personMeta.get(d.person) as any)?.cc === selectedCC);
      }
      if (selectedTeam) {
        base = base.filter(d => (personMeta.get(d.person) as any)?.team === selectedTeam);
      }
    }

    // Scope-Filter: wenn nicht "Alle Daten" und Profil vorhanden, nach BU/CC/Team filtern (Team > CC > BU)
    if (!showAllData && profile) {
      const scopeTeam = profile.team || '';
      const scopeCc = profile.competenceCenter || '';
      const scopeBereich = (profile as any).bereich || '';
      base = base.filter(d => {
        const meta = personMeta.get(d.person) || {} as any;
        if (scopeTeam) return String(meta.team || '') === String(scopeTeam);
        if (scopeCc) return String(meta.cc || '') === String(scopeCc);
        if (scopeBereich) return String(meta.bereich || '') === String(scopeBereich);
        return true;
      });
    }
    return base;
  }, [dataForUI, selectedPersons, filterCC, filterLBS, filterLBSExclude, filterStatus, personMeta, personStatus, showWorkingStudents, showActionItems, actionItems, personSearchTerm, showAllData, profile, selectedLoB, selectedBereich, selectedCC, selectedTeam]);
  
  // ✅ Ermittle verfügbare Wochen für Header - 8 Wochen ab der Woche nach der aktuellen KW
  const availableWeeksFromData = useMemo(() => {
    // Berechne die aktuelle Kalenderwoche
    const today = new Date();
    const currentWeek = getISOWeek(today);
    const currentYear = getISOWeekYear(today);
    
    // Generiere die nächsten 8 Wochen ab der Woche nach der aktuellen KW
    const forecastWeeks = Array.from({ length: 8 }, (_, i) => {
      const weekNumber = currentWeek + 1 + i;
      const year = weekNumber > 52 ? currentYear + 1 : currentYear;
      const adjustedWeek = weekNumber > 52 ? weekNumber - 52 : weekNumber;
      const yy = String(year).slice(-2);
      return `${yy}/${String(adjustedWeek).padStart(2, '0')}`;
    });
    
    console.log('🔍 Forecast Wochen (8 Wochen ab der Woche nach der aktuellen KW):', forecastWeeks);
    return forecastWeeks;
  }, []);
  
  const visiblePersons = useMemo(() => {
    // ✅ ALLE Personen aus Collections berücksichtigen, nicht nur die mit Wochen-Daten
    const allPersonsFromDB = new Set<string>();
    
    if (dataSource === 'database') {
      // Sammle alle Personen aus Auslastung
      databaseData.auslastung?.forEach(row => {
        if (row.person) allPersonsFromDB.add(row.person);
      });
      
      // Sammle alle Personen aus Einsatzplan
      databaseData.einsatzplan?.forEach(row => {
        if (row.person) allPersonsFromDB.add(row.person);
      });
    }
    
    // Personen aus filteredData (haben Wochen-Daten)
    const personsWithData = new Set(filteredData.map(item => item.person));
    
    // Kombiniere alle Personen
    const allPersons = Array.from(new Set([...allPersonsFromDB, ...personsWithData]));
    
    // Wende die gleichen Filter wie in filteredData an
    return allPersons.filter(person => {
      // Working Students Filter
      if (!showWorkingStudents) {
        const lbs = personMeta.get(person)?.lbs;
        if (lbs === 'Working Student' || lbs === 'Working student' || lbs === 'working student') {
          return false;
        }
      }
      
      // Personensuche Filter
      if (personSearchTerm.trim()) {
        if (!person.toLowerCase().includes(personSearchTerm.toLowerCase())) {
          return false;
        }
      }
      
      // CC Filter
      if (filterCC.length > 0) {
        const cc = String(personMeta.get(person)?.cc || '');
        if (!filterCC.includes(cc)) return false;
      }
      
      // LBS Filter (INCLUDE)
      if (filterLBS.length > 0) {
        const lbs = String(personMeta.get(person)?.lbs || '');
        if (!filterLBS.includes(lbs)) return false;
      }
      
      // LBS Filter (EXCLUDE)
      if (filterLBSExclude.length > 0) {
        const lbs = String(personMeta.get(person)?.lbs || '');
        if (filterLBSExclude.includes(lbs)) return false;
      }
      
      // Status Filter (EXCLUDE)
      if (filterStatus.length > 0) {
        const personStatusValue = getPersonStatus(person);
        if (personStatusValue) {
          const statusMatches = filterStatus.some(filterStatusItem => {
            if (filterStatusItem === personStatusValue) return true;
            const statusMapping: Record<string, string> = {
              'vacation': 'Urlaub',
              'parental-leave': 'Elternzeit',
              'maternity-leave': 'Mutterschutz',
              'sick-leave': 'Krankheit',
              'long-absence': 'Lange Abwesent',
              'termination': 'Kündigung'
            };
            return filterStatusItem === statusMapping[personStatusValue] || 
                   personStatusValue === statusMapping[filterStatusItem];
          });
          if (statusMatches) return false; // EXCLUDE Filter
        }
      }
      
      // Action Items Filter
      if (showActionItems) {
        if (!actionItems[person]) return false;
      }
      
      // Selected Persons Filter
      if (selectedPersons.length > 0) {
        if (!selectedPersons.includes(person)) return false;
      }
      
      // Header-Auswahl-Filter (nur wenn nicht "Alle Daten")
      if (!showAllData) {
        const meta = personMeta.get(person);
        if (selectedLoB && (meta as any)?.lob !== selectedLoB) return false;
        if (selectedBereich && (meta as any)?.bereich !== selectedBereich) return false;
        if (selectedCC && (meta as any)?.cc !== selectedCC) return false;
        if (selectedTeam && (meta as any)?.team !== selectedTeam) return false;
      }
      
      // Scope-Filter (nur wenn nicht "Alle Daten" und Profil vorhanden)
      if (!showAllData && profile) {
        const scopeTeam = profile.team || '';
        const scopeCc = profile.competenceCenter || '';
        const scopeBereich = (profile as any).bereich || '';
        const meta = personMeta.get(person) || {} as any;
        
        if (scopeTeam && String(meta.team || '') !== String(scopeTeam)) return false;
        if (!scopeTeam && scopeCc && String(meta.cc || '') !== String(scopeCc)) return false;
        if (!scopeTeam && !scopeCc && scopeBereich && String(meta.bereich || '') !== String(scopeBereich)) return false;
      }
      
      return true;
    });
  }, [filteredData, dataSource, databaseData, personMeta, showWorkingStudents, personSearchTerm, filterCC, filterLBS, filterLBSExclude, filterStatus, personStatus, showActionItems, actionItems, selectedPersons, showAllData, selectedLoB, selectedBereich, selectedCC, selectedTeam, profile]);

  // Assignments: Vorladen für sichtbare Personen
  useEffect(() => {
    try {
      visiblePersons.forEach(p => {
        getAssignmentsForEmployee(p).catch(() => {});
      });
    } catch {}
  }, [visiblePersons, getAssignmentsForEmployee]);
  
  // Dossiers werden nur bei Bedarf geladen (beim Öffnen des Modals)
  // Kein automatisches Laden beim Start mehr

  // Helper: Dossier für Person aktualisieren (nach Modal-Speichern)
  const refreshPersonDossier = async (person: string | null) => {
    if (!person) return;
    try {
      const dossier = await DatabaseService.getEmployeeDossier(person);
      setDossiersByPerson(prev => ({
        ...prev,
        [person]: {
          projectOffers: dossier?.projectOffers || prev[person]?.projectOffers || [],
          jiraTickets: dossier?.jiraTickets || prev[person]?.jiraTickets || [],
          utilizationComment: String(dossier?.utilizationComment || ''),
          planningComment: String(dossier?.planningComment || ''),
        }
      }));
    } catch {}
  };
  const allPersons = useMemo(() => {
    return Array.from(new Set(dataForUI.map(item => item.person)));
  }, [dataForUI]);
  const kpiData = useMemo(() => {
    const historicalData = filteredData.filter(item => item.isHistorical && item.utilization !== null);
    const forecastData = filteredData.filter(item => !item.isHistorical && item.utilization !== null);
    const avgHistorical = historicalData.length > 0 ? historicalData.reduce((sum, item) => sum + item.utilization!, 0) / historicalData.length : 0;
    const avgForecast = forecastData.length > 0 ? forecastData.reduce((sum, item) => sum + item.utilization!, 0) / forecastData.length : 0;
    const overUtilized = filteredData.filter(item => item.utilization && item.utilization > 100).length;
    const missingValues = filteredData.filter(item => item.utilization === null).length;
    return {
      avgHistorical: Math.round(avgHistorical),
      avgForecast: Math.round(avgForecast),
      overUtilized,
      missingValues,
      lookbackWeeks,
      forecastWeeks
    };
  }, [filteredData, lookbackWeeks, forecastWeeks]);
  // ✅ VEREINFACHT: hasData hängt nur noch von verfügbaren Daten ab, nicht von Upload-Status
  const hasData = dataForUI.length > 0;


  // ✅ ENTFERNT: handleFilesChange ist nicht mehr nötig
  // Upload-Funktionalität läuft jetzt über AdminDataUploadModal

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">Lade...</div>
  }
  if (!user) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Bitte anmelden</h2>
        <p className="text-gray-600">Zugriff nur für angemeldete Benutzer.</p>
      </div>
    </div>
  }
  if (!hasData) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <FileSpreadsheet className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Lade Auslastung & Einsatzplan hoch
          </h2>
          <p className="text-gray-600">um den Report zu sehen</p>
        </motion.div>
      </div>
  }
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Main Content */}
      <main className="w-full p-4 space-y-6">
        {/* Data Source Status and Controls (ausgeblendet) */}
        {false && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Datenquelle
              </h3>
              <p className="text-sm text-gray-600">
                {dataSource === 'database' 
                  ? databaseData.auslastung 
                    ? 'Konsolidierte Daten aus der Datenbank geladen' 
                    : 'Keine Daten in der Datenbank verfügbar'
                  : 'Daten aus Excel-Uploads'
                }
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {dataSource === 'database' ? (
                <button
                  onClick={() => setIsAdminUploadModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Database className="w-4 h-4" />
                  Daten aktualisieren
                </button>
              ) : (
                <button
                  onClick={async () => {
                    console.log('🔍 DEBUG: Lade Daten direkt aus der Datenbank...');
                    try {
                      const utilData = await DatabaseService.getUtilizationData();
                      console.log('🔍 Direkte Datenbank-Abfrage Ergebnis:', {
                        count: utilData?.length || 0,
                        sample: utilData?.[0],
                        first5: utilData?.slice(0, 5)
                      });
                      
                      const ausData = await DatabaseService.getAuslastung();
                      const einData = await DatabaseService.getEinsatzplan();
                      console.log('🔍 Ursprüngliche Daten:', {
                        auslastung: ausData?.length || 0,
                        einsatzplan: einData?.length || 0
                      });
                    } catch (error) {
                      console.error('❌ Debug-Fehler:', error);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Database className="w-4 h-4" />
                  Datenbank-Daten verwenden
                </button>
              )}
            </div>
          </div>
        </div>
        )}

        {/* ✅ ADMIN: Upload-Funktionalität in separates Modal verschoben */}
        {!hasData && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-blue-900">Keine Daten verfügbar</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Lade Excel-Dateien hoch, um Auslastungsdaten zu analysieren.
                </p>
              </div>
              <button
                onClick={() => setIsAdminUploadModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                Daten hochladen
              </button>
            </div>
          </div>
        )}



        {/* Auslastung Preview ausgeblendet (weiterhin über Upload einsehbar) */}

        {/* KPI Cards - ausgeblendet */}
        {/* <KpiCardsGrid kpiData={kpiData} /> */}

        {/* Chart Section (new standalone component) - ausgeblendet */}
        {/* <UtilizationTrendChart data={filteredData as any} forecastStartWeek={forecastStartWeek} lookbackWeeks={lookbackWeeks} forecastWeeks={forecastWeeks} isoYear={currentIsoYear} /> */}

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Detailansicht nach Person
            </h3>
            
            {/* Alle Filter in einer Reihe - Personen, Bereich, CC, LBS, Status und Action */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              {/* Personen-Filter mit Suchfunktion */}
              <div className="w-full">
                <label className="block text-xs font-medium text-gray-600 mb-1">Personen</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nach Personen suchen..."
                    value={personSearchTerm}
                    onChange={(e) => setPersonSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  {/* Suchfunktionen */}
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <button 
                      onClick={() => setPersonSearchTerm('')} 
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Suche löschen
                    </button>
                    <span className="text-gray-300">|</span>
                    <button 
                      onClick={() => setPersonSearchTerm('')} 
                      className="text-gray-600 hover:text-gray-700 hover:underline"
                    >
                      Alle anzeigen
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Bereich-Filter oberhalb von CC und LBS */}
              <MultiSelectFilter label="Bereich" options={bereichOptions} selected={[selectedBereich].filter(Boolean)} onChange={(values) => setSelectedBereich(values[0] || '')} placeholder="Alle Bereiche" />
              
              <MultiSelectFilter label="CC" options={ccOptions} selected={filterCC} onChange={setFilterCC} placeholder="Alle CC" />
              <MultiSelectFilter label="LBS" options={lbsOptions} selected={filterLBS} onChange={setFilterLBS} placeholder="Alle LBS" />
              <MultiSelectFilter label="LBS (Ausblenden)" options={lbsOptions} selected={filterLBSExclude} onChange={setFilterLBSExclude} placeholder="Alle LBS" />
              <MultiSelectFilter label="Status" options={statusOptions} selected={filterStatus} onChange={setFilterStatus} placeholder="Alle Status" />
              
              {/* Act Filter - Checkbox für jede Person */}
              <div className="w-full">
                <label className="block text-xs font-medium text-gray-600 mb-1">Act</label>
                <div className="flex items-center justify-center">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showActionItems}
                      onChange={(e) => setShowActionItems(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Act Items</span>
                  </label>
                </div>
              </div>
              
              {/* Working Students Toggle als separater Filter */}
              <div className="flex items-center justify-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWorkingStudents}
                    onChange={(e) => setShowWorkingStudents(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Working Students</span>
                </label>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {/* 8 Wochen aus dem View (letzte 8 Wochen vor aktueller KW) */}
                  {Array.from({ length: 8 }, (_, i) => {
                    const weekNumber = getISOWeek(new Date()) - 8 + i;
                    const year = weekNumber <= 0 ? getISOWeekYear(new Date()) - 1 : getISOWeekYear(new Date());
                    const adjustedWeek = weekNumber <= 0 ? weekNumber + 52 : weekNumber;
                    const yy = String(year).slice(-2);
                    const weekKey = `${yy}/${String(adjustedWeek).padStart(2, '0')}`;
                    
                    return (
                      <th key={`view-week-${i}`} className="px-0.5 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-8">
                        {weekKey}
                      </th>
                    );
                  })}

                  {/* Utilization Comments Spalte */}
                  <th className="px-0.5 py-1 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100" style={{width: 'auto', whiteSpace: 'nowrap'}}>
                    <div className="flex items-center justify-center gap-1">
                      <ArrowLeft className="w-3 h-3" />
                      <MessageSquare className="w-3 h-3" />
                    </div>
                  </th>

                  {/* Auslastungserklärung Spalte */}
                  <th className="px-0.5 py-1 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100" style={{width: 'auto', whiteSpace: 'nowrap'}}>
                    Auslastungserklärung
                  </th>

                  {/* Act-Spalte */}
                  <th className="px-0.5 py-1 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100" style={{width: 'auto', whiteSpace: 'nowrap'}}>
                    Act
                  </th>

                  {/* FK-Spalte für Führungskraft */}
                  <th className="px-0.5 py-1 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100" style={{width: 'auto', whiteSpace: 'nowrap'}}>
                    FK
                  </th>
                  {/* Info-Spalte für Career Level Icons */}
                  <th className="px-0.5 py-1 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100" style={{width: 'auto', whiteSpace: 'nowrap'}}>
                    Info
                  </th>
                  {/* Name-Spalte zwischen Auslastung und Einsatzplan */}
                  <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100" style={{width: 'auto', whiteSpace: 'nowrap'}}>
                    Name
                  </th>
                  {/* LBS-Spalte */}
                  <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100" style={{width: 'auto', whiteSpace: 'nowrap'}}>
                    LBS
                  </th>
                  {/* Details-Spalte für Mitarbeiter-Dossier */}
                  <th className="px-0.5 py-1 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100" style={{width: 'auto', whiteSpace: 'nowrap'}}>
                    Details
                  </th>
                  {/* Status-Spalte */}
                  <th className="px-0.5 py-1 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100" style={{width: 'auto', whiteSpace: 'nowrap'}}>
                    Status
                  </th>

                  {/* Planning Comments Spalte */}
                  <th className="px-0.5 py-1 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100" style={{width: 'auto', whiteSpace: 'nowrap'}}>
                    <div className="flex items-center justify-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </th>

                  {/* Forecast-Wochen aus dem Einsatzplan (startet bei der Woche nach der aktuellen) */}
                  {visibleColumns.forecastWeeks && availableWeeksFromData.slice(0, forecastWeeks).map((week, i) => (
                    <th key={`forecast-${i}`} className="px-0.5 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-8">
                      {week}
                    </th>
                  ))}

                  {/* Opport.-Spalte */}
                  <th className="px-0.5 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-8">
                    Opport.
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visiblePersons.map(person => {
                  const isTerminated = getPersonStatus(person) === 'termination' || getPersonStatus(person) === 'Kündigung';
                  const personData = filteredData.filter(item => item.person === person);
                  
                  // ✅ NEU: Bestimme Zeilenfarbe basierend auf FK-Information
                  const manager = personMeta.get(person)?.manager;
                  const hasNoManager = !manager;
                  const rowBgColor = hasNoManager ? 'bg-yellow-100' : 
                    (actionItems[person]?.actionItem ? 'bg-blue-100' : '');
                  
                  // ✅ DEBUG: Zeige verfügbare Wochen für erste Person
                  if (person === visiblePersons[0]) {
                    const availableWeeks = personData.map(item => item.week).slice(0, 10);
                    console.log(`🔍 DEBUG Person "${person}" - Verfügbare Wochen:`, availableWeeks);
                    console.log(`🔍 DEBUG Header wird diese Wochen zeigen:`, availableWeeksFromData.slice(0, 10));
                    console.log(`🔍 DEBUG Aktuelle Woche: ${getISOWeek(new Date())}, Einsatzplan startet bei: ${getISOWeek(new Date()) + 1}`);
                  }
                  return (
                    <tr key={person} className={`hover:bg-gray-50 ${rowBgColor}`}>
                      {/* 8 Wochen Auslastung (endet bei aktueller Woche) */}
                      {Array.from({ length: 8 }, (_, i) => {
                        const weekNumber = getISOWeek(new Date()) - 7 + i;
                        const year = weekNumber <= 0 ? getISOWeekYear(new Date()) - 1 : getISOWeekYear(new Date());
                        const adjustedWeek = weekNumber <= 0 ? weekNumber + 52 : weekNumber;
                        const yy = String(year).slice(-2);
                        const weekKey = `${yy}/${String(adjustedWeek).padStart(2, '0')}`;
                        
                        // Finde den Wert aus dem View für diese Person und Woche
                        const weekData = personData.find(item => item.week === weekKey);
                        const weekValue = weekData?.utilization;
                        
                        // Farbkodierung basierend auf dem Wert
                        let bgColor = 'bg-gray-100';
                        let textColor = 'text-gray-500';
                        
                        if (weekValue !== null && weekValue !== undefined) {
                          if (weekValue > 90) {
                            bgColor = 'bg-green-100';
                            textColor = 'text-green-700';
                          } else if (weekValue > 75) {
                            bgColor = 'bg-yellow-100';
                            textColor = 'text-yellow-700';
                          } else {
                            // Alle Werte ≤ 75% (inkl. 0%) sind kritisch und werden rot markiert
                            bgColor = 'bg-red-100';
                            textColor = 'text-red-700';
                          }
                        }
                        
                        return (
                          <td key={`view-week-${i}`} className={`px-0.5 py-1 text-center text-xs ${
                            hasNoManager ? 'bg-yellow-100' : bgColor
                          } ${isTerminated ? 'line-through opacity-60' : ''}`}>
                            {weekValue !== null && weekValue !== undefined ? (
                              <span className={`font-medium ${textColor}`}>
                                {Math.round(weekValue * 10) / 10}%
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Utilization Comments Spalte */}
                      <td className={`px-0.5 py-0.5 text-sm ${
                        hasNoManager 
                          ? 'bg-yellow-100'
                          : (actionItems[person]?.actionItem ? 'bg-blue-100' : 'bg-gray-50')
                      }`} style={{padding: '2px 2px'}}>
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => setUtilizationCommentForPerson(person)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-300 transition-colors"
                            title="Utilization Comment öffnen"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* Auslastungserklärung Spalte */}
                      <td className={`px-0.5 py-0.5 text-sm ${
                        hasNoManager 
                          ? 'bg-yellow-100'
                          : (actionItems[person]?.actionItem ? 'bg-blue-100' : 'bg-gray-50')
                      }`} style={{padding: '2px 2px'}}>
                        <div className="flex items-center justify-center">
                          <div className="relative group">
                            <select
                              value={personAuslastungserklaerungen[person] || ''}
                              onChange={(e) => {
                                const selectedStatus = e.target.value;
                                if (selectedStatus) {
                                  savePersonAuslastungserklaerung(person, selectedStatus);
                                }
                              }}
                              className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">-</option>
                              {auslastungserklaerungen.map(status => (
                                <option key={status.id} value={status.name}>
                                  {status.name}
                                </option>
                              ))}
                              <option value="__ADD_NEW__">+ Neuer Status</option>
                            </select>
                            {/* Inline-Edit für neue Status */}
                            {personAuslastungserklaerungen[person] === '__ADD_NEW__' && (
                              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg p-2 z-20 min-w-32">
                                <input
                                  type="text"
                                  placeholder="Neuer Status..."
                                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 mb-2"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const newStatus = e.currentTarget.value.trim();
                                      if (newStatus) {
                                        addAuslastungserklaerung(newStatus);
                                        savePersonAuslastungserklaerung(person, newStatus);
                                      }
                                    }
                                  }}
                                  autoFocus
                                />
                                <div className="text-xs text-gray-500">
                                  Enter drücken zum Speichern
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Act-Spalte */}
                      <td className={`px-0.5 py-0.5 text-sm ${
                        hasNoManager 
                          ? 'bg-yellow-100'
                          : (actionItems[person]?.actionItem ? 'bg-blue-100' : 'bg-gray-50')
                      }`} style={{padding: '2px 2px'}}>
                        <div className="flex items-center justify-center">
                          <div className="relative group">
                            <input
                              type="checkbox"
                              checked={actionItems[person]?.actionItem || false}
                              onChange={async (e) => {
                                const checked = e.target.checked;
                                try {
                                  const { personActionItemService } = await import('../../lib/firebase-services');
                                  // Speichere den aktuellen Benutzernamen
                                  const currentUser = profile?.displayName || user?.email || 'Unbekannt';
                                  await personActionItemService.update(person, checked, 'manual', currentUser);
                                  
                                  // ✅ KORRIGIERT: Aktualisiere globalen State mit updatedBy Information
                                  const updatedActionItems = { ...actionItems };
                                  updatedActionItems[person] = { 
                                    actionItem: checked, 
                                    source: 'manual',
                                    updatedBy: currentUser
                                  };
                                  setActionItems(updatedActionItems);
                                } catch (error) {
                                  console.error('Fehler beim Speichern des Action Items:', error);
                                }
                              }}
                              className={`rounded border-2 focus:ring-2 focus:ring-offset-2 transition-all ${
                                actionItems[person]?.source === 'manual' 
                                  ? 'border-orange-400 focus:ring-orange-500' // Manueller Status: Orange Rahmen
                                  : 'border-gray-300 focus:ring-blue-500'    // Automatischer Status: Normal
                              }`}
                            />
                            {/* Tooltip für manuelle Änderungen */}
                            {actionItems[person]?.source === 'manual' && actionItems[person]?.updatedBy && (
                              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-10">
                                Status manuell geändert von: {actionItems[person]?.updatedBy}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* FK-Spalte für Führungskraft */}
                      <td className={`px-0.5 py-0.5 text-sm ${
                        hasNoManager 
                          ? 'bg-yellow-100'
                          : (actionItems[person]?.actionItem ? 'bg-blue-100' : 'bg-gray-50')
                      }`} style={{padding: '2px 2px'}}>
                        <div className="flex items-center justify-center">
                          {(() => {
                            const manager = personMeta.get(person)?.manager;
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
                        </div>
                      </td>
                      {/* Info-Spalte für Career Level Icons */}
                      <td className={`px-0.5 py-0.5 text-sm ${
                        hasNoManager 
                          ? 'bg-yellow-100'
                          : (actionItems[person]?.actionItem ? 'bg-blue-100' : 'bg-gray-50')
                      }`} style={{padding: '2px 2px'}}>
                        <div className="flex items-center justify-center">
                          {(() => {
                            const lbs = personMeta.get(person)?.lbs;
                            if (!lbs) return null;
                            
                            // Chef-Icon für Führungskräfte
                            if (lbs.includes('Team Lead - Manager') || 
                                lbs.includes('Competence Center Lead - Senior Manager') ||
                                lbs.includes('Business Line Lead - Senior Director') ||
                                lbs.includes('Business Unit Lead - Senior Director')) {
                              return (
                                <div className="w-5 h-5 text-yellow-600" title={lbs}>
                                  <ChefHat className="w-5 h-5" />
                                </div>
                              );
                            }
                            
                            // Sales-Icon für Sales Assistant
                            if (lbs.includes('Sales Assistant')) {
                              return (
                                <div className="w-5 h-5 text-blue-600" title={lbs}>
                                  <Banknote className="w-5 h-5" />
                                </div>
                              );
                            }
                            
                            // Hund-Icon für Trainee
                            if (lbs.includes('Trainee')) {
                              return (
                                <div className="w-5 h-5 text-green-600" title={lbs}>
                                  <Dog className="w-5 h-5" />
                                </div>
                              );
                            }
                            
                            // Kaffee-Icon für Intern
                            if (lbs.includes('Intern')) {
                              return (
                                <div className="w-5 h-5 text-orange-600" title={lbs}>
                                  <Coffee className="w-5 h-5" />
                                </div>
                              );
                            }
                            
                            // Graduation-Cap Icon für Working Student
                            if (lbs.includes('Working Student')) {
                              return (
                                <div className="w-5 h-5 text-purple-600" title={lbs}>
                                  <GraduationCap className="w-5 h-5" />
                                </div>
                              );
                            }
                            
                            return null;
                          })()}
                        </div>
                      </td>
                      {/* Name-Spalte zwischen Auslastung und Einsatzplan */}
                      <td className={`px-0.5 py-0.5 text-sm ${
                        hasNoManager 
                          ? 'bg-yellow-100'
                          : (actionItems[person]?.actionItem ? 'bg-blue-100' : 'bg-gray-50')
                      } ${isTerminated ? 'line-through opacity-60' : ''}`} style={{padding: '2px 2px'}}>
                        <span className="font-medium text-gray-900">{person}</span>
                      </td>
                      {/* LBS-Spalte */}
                      <td className={`px-0.5 py-0.5 text-sm ${
                        hasNoManager 
                          ? 'bg-yellow-100'
                          : (actionItems[person]?.actionItem ? 'bg-blue-100' : 'bg-gray-50')
                      } ${isTerminated ? 'line-through opacity-60' : ''}`} style={{padding: '2px 2px'}}>
                        {personMeta.get(person)?.lbs ? (
                          <span className="text-xs text-gray-700">{personMeta.get(person)?.lbs}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      {/* Details-Spalte für Mitarbeiter-Dossier */}
                      <td className={`px-0.5 py-0.5 text-sm ${
                        hasNoManager 
                          ? 'bg-yellow-100'
                          : (actionItems[person]?.actionItem ? 'bg-blue-100' : 'bg-gray-50')
                      }`} style={{padding: '2px 2px'}}>
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => openEmployeeDossier(person)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-300 transition-colors"
                            title="Mitarbeiter-Dossier öffnen"
                          >
                            <User className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      {/* Status-Spalte */}
                      <td className={`px-0.5 py-0.5 text-sm ${
                        hasNoManager 
                          ? 'bg-yellow-100'
                          : (actionItems[person]?.actionItem ? 'bg-blue-100' : 'bg-gray-50')
                      }`} style={{padding: '2px 2px'}}>
                        <div className="flex items-center justify-center">
                          <StatusLabelSelector
                            person={person}
                            value={getPersonStatus(person)}
                            isManual={getPersonStatusSource(person) === 'manual'}
                            onChange={async (status) => {
                              try {
                                const { personStatusService } = await import('../../lib/firebase-services');
                                await personStatusService.update(person, status || '', 'manual');
                                
                                // Aktualisiere lokalen State mit Schutz
                                protectedSetPersonStatus(person, status || '', 'manual');
                              } catch (error) {
                                console.error('Fehler beim Speichern des Status:', error);
                              }
                            }}
                          />
                        </div>
                      </td>

                      {/* Planning Comments Spalte */}
                      <td className={`px-0.5 py-0.5 text-sm ${
                        hasNoManager 
                          ? 'bg-yellow-100'
                          : (actionItems[person]?.actionItem ? 'bg-blue-100' : 'bg-gray-50')
                      }`} style={{padding: '2px 2px'}}>
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => setPlanningCommentForPerson(person)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-300 transition-colors"
                            title="Planning Comment öffnen"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {visibleColumns.forecastWeeks && availableWeeksFromData.slice(0, forecastWeeks).map((week, i) => {
                        const weekData = personData.find(item => item.week === week);
                        const utilization = weekData?.utilization;
                        // Extrahiere Wochennummer aus dem week-String (z.B. "25/35" -> 35)
                        const weekNumber = parseInt(week.match(/\/(\d+)/)?.[1] || '0', 10);
                        
                        let bgColor = 'bg-gray-100';
                        if (utilization !== null && utilization !== undefined) {
                          if (utilization > 90) bgColor = 'bg-green-100';
                          else if (utilization > 75) bgColor = 'bg-yellow-100';
                          else bgColor = 'bg-red-100'; // Alle Werte ≤ 75% (inkl. 0%) sind kritisch
                        }
                        return (
                          <td key={`r-${i}`} className={`px-0.5 py-0.5 text-center text-xs ${
                            hasNoManager ? 'bg-yellow-100' : bgColor
                          }`}>
                            <div className={`flex flex-col items-center gap-1 ${isTerminated ? 'line-through opacity-60' : ''}`}>
                              {utilization !== null && utilization !== undefined ? (
                                <span className={`flex items-center justify-center gap-1 ${isTerminated ? 'line-through opacity-60' : ''}`}>
                                  {utilization}%
                                  {utilization > 100 && <Star className="w-3 h-3 text-yellow-500" />}
                                </span>
                              ) : (
                                <span className={`${isTerminated ? 'line-through opacity-60' : ''}`}>—</span>
                              )}
                              {(() => {
                                const dossier = dossiersByPerson[person] || { projectOffers: [], jiraTickets: [] };
                                // Hilfsfunktion für Wochenüberlappung
                                const overlapsWeek = (start?: string, end?: string) => {
                                  if (!start || !end) return false;
                                  const y = currentIsoYear;
                                  const ws = new Date(Date.UTC(y, 0, 4));
                                  const day = (ws.getUTCDay() + 6) % 7;
                                  ws.setUTCDate(ws.getUTCDate() - day + (weekNumber - 1) * 7);
                                  const we = new Date(ws); we.setUTCDate(ws.getUTCDate() + 6);
                                  const s = new Date(start); const e = new Date(end);
                                  return s <= we && e >= ws;
                                };
                                const overlappingOffers = (dossier.projectOffers || []).filter((o: any) => {
                                  if (o.startWeek && o.endWeek) {
                                                        // Parse YY/WW format for start and end weeks
                    const swMatch = String(o.startWeek).match(/(\d{2})\/(\d{2})/);
                    const ewMatch = String(o.endWeek).match(/(\d{2})\/(\d{2})/);
                    const sw = swMatch ? parseInt(swMatch[2], 10) : 0;
                    const ew = ewMatch ? parseInt(ewMatch[2], 10) : 0;
                                    return weekNumber >= sw && weekNumber <= ew;
                                  }
                                  if (o.startDate && o.endDate) return overlapsWeek(o.startDate, o.endDate);
                                  return false;
                                });
                                const overlappingJira = (dossier.jiraTickets || []).filter((j: any) => {
                                  if (j.startDate && j.endDate) return overlapsWeek(j.startDate, j.endDate);
                                  if (j.startWeek && j.endWeek) {
                                                        // Parse YY/WW format for start and end weeks
                    const swMatch = String(j.startWeek).match(/(\d{2})\/(\d{2})/);
                    const ewMatch = String(j.endWeek).match(/(\d{2})\/(\d{2})/);
                    const sw = swMatch ? parseInt(swMatch[2], 10) : 0;
                    const ew = ewMatch ? parseInt(ewMatch[2], 10) : 0;
                                    return weekNumber >= sw && weekNumber <= ew;
                                  }
                                  return false;
                                });
                                const offerCount = overlappingOffers.length;
                                const jiraCount = overlappingJira.length;
                                if (offerCount === 0 && jiraCount === 0) return null;
                                const offerTooltip = overlappingOffers
                                  .map((o: any) => o.title || o.customerName || '')
                                  .filter((t: string) => !!t && t.trim().length > 0)
                                  .join('\n') || 'Projektangebote';
                                const jiraTooltip = overlappingJira
                                  .map((j: any) => j.title || j.ticketId || '')
                                  .filter((t: string) => !!t && t.trim().length > 0)
                                  .join('\n') || 'Jira-Tickets';
                                return (
                                  <div className="flex items-center gap-1">
                                    {offerCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => { setPlanningForPerson(person); setPlanningForWeek({ year: currentIsoYear, week: weekNumber }); }}
                                        className="relative text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded p-0.5"
                                        title={offerTooltip}
                                      >
                                        <Target className="w-4 h-4" />
                                        {offerCount > 1 && (
                                          <span className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 text-[10px] leading-none bg-emerald-600 text-white rounded-full min-w-[14px] h-[14px] px-[4px] flex items-center justify-center">
                                            {offerCount}
                                          </span>
                                        )}
                                      </button>
                                    )}
                                    {jiraCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => { setPlanningForPerson(person); setPlanningForWeek({ year: currentIsoYear, week: weekNumber }); }}
                                        className="relative text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded p-0.5"
                                        title={jiraTooltip}
                                      >
                                        <Ticket className="w-4 h-4" />
                                        {jiraCount > 1 && (
                                          <span className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 text-[10px] leading-none bg-sky-600 text-white rounded-full min-w-[14px] h-[14px] px-[4px] flex items-center justify-center">
                                            {jiraCount}
                                          </span>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                        );
                      })}

                      {/* Opportunities Spalte */}
                      <td className={`px-0.5 py-0.5 text-center text-xs ${
                        hasNoManager ? 'bg-yellow-100' : 'bg-gray-100'
                      }`}>
                        <div className="flex items-center justify-center gap-1">

                          <div className="relative group">
                            <button
                              onClick={() => { setAssignmentEditorPerson(person); setIsAssignmentEditorOpen(true); }}
                              className="relative p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded border border-indigo-300 transition-colors"
                              title="Projekt zuordnen"
                            >
                              <Link2 className="w-4 h-4" />
                              {(() => {
                                const list = assignmentsByEmployee[person] || [];
                                const count = list.length;
                                return count > 0 ? (
                                  <span className="absolute -top-1 -right-1 text-[10px] leading-none bg-indigo-600 text-white rounded-full min-w-[14px] h-[14px] px-[4px] flex items-center justify-center">
                                    {count}
                                  </span>
                                ) : null;
                              })()}
                            </button>
                            {(() => {
                              const list = assignmentsByEmployee[person] || [];
                              if (list.length === 0) return null;
                              const tooltip = list.map(a => `${a.projectName || a.projectId}${a.customer ? ` · ${a.customer}` : ''}`).join('\n');
                              return (
                                <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[10px] rounded px-2 py-1 whitespace-pre">
                                  {tooltip}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                      
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Employee Dossier Modal */}
      {selectedEmployee && (
        <EmployeeDossierModal
          isOpen={isEmployeeDossierOpen}
          onClose={() => {
            setIsEmployeeDossierOpen(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          onSave={(updatedEmployee) => {
            // Aktualisiere den lokalen State
            // Konvertiere travelReadiness von String zu Number falls nötig
            const travelReadinessNumber = typeof updatedEmployee.travelReadiness === 'string' 
              ? parseInt(updatedEmployee.travelReadiness) || 0 
              : updatedEmployee.travelReadiness;
            
            setPersonTravelReadiness(prev => ({
              ...prev,
              [updatedEmployee.name]: travelReadinessNumber
            }));
          }}
          excelData={selectedEmployee.excelData}
          // Kunden-Funktionalität entfernt
        />
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setIsSettingsModalOpen(false)}>
            <motion.div initial={{
          scale: 0.95,
          opacity: 0
        }} animate={{
          scale: 1,
          opacity: 1
        }} exit={{
          scale: 0.95,
          opacity: 0
        }} className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Zeitraum-Einstellungen
              </h2>
              
              <div className="space-y-6">
                {/* Lookback Weeks */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Rückblick-Wochen
                  </label>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setLookbackWeeks(Math.max(1, lookbackWeeks - 1))} disabled={lookbackWeeks <= 1} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-center">
                      <div className="text-2xl font-bold text-gray-900">{lookbackWeeks}</div>
                      <div className="text-xs text-gray-500">Wochen</div>
                    </div>
                    <button onClick={() => setLookbackWeeks(Math.min(12, lookbackWeeks + 1))} disabled={lookbackWeeks >= 12} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    1 - 12 Wochen (aktuell: {lookbackWeeks})
                  </div>
                </div>

                {/* Forecast Weeks */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Vorblick-Wochen
                  </label>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setForecastWeeks(Math.max(1, forecastWeeks - 1))} disabled={forecastWeeks <= 1} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-center">
                      <div className="text-2xl font-bold text-gray-900">{forecastWeeks}</div>
                      <div className="text-xs text-gray-500">Wochen</div>
                    </div>
                    <button onClick={() => setForecastWeeks(Math.min(12, forecastWeeks + 1))} disabled={forecastWeeks >= 12} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    1 - 12 Wochen (aktuell: {forecastWeeks})
                  </div>
                </div>

                {/* Forecast Start Week */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Basiswoche Vorblick
                  </label>
                  <select value={forecastStartWeek} onChange={e => setForecastStartWeek(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    {Array.from({
                  length: 20
                }, (_, i) => <option key={i} value={30 + i}>
                        {String(new Date().getFullYear()).slice(-2)}/{String(30 + i).padStart(2, '0')}
                      </option>)}
                  </select>
                </div>

                {/* Summary */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    Zeitraum-Übersicht
                  </h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>• Rückblick: {String(new Date().getFullYear()).slice(-2)}/{String(forecastStartWeek - lookbackWeeks).padStart(2, '0')} - {String(new Date().getFullYear()).slice(-2)}/{String(forecastStartWeek - 1).padStart(2, '0')} ({lookbackWeeks} Wochen)</p>
                    <p>• Vorblick: {String(new Date().getFullYear()).slice(-2)}/{String(forecastStartWeek).padStart(2, '0')} - {String(new Date().getFullYear()).slice(-2)}/{String(forecastStartWeek + forecastWeeks - 1).padStart(2, '0')} ({forecastWeeks} Wochen)</p>
                    <p>• Gesamt: {lookbackWeeks + forecastWeeks} Wochen</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Fehlende Werte werden in Aggregationen ignoriert.
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setIsSettingsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                  Übernehmen
                </button>
              </div>
            </motion.div>
          </motion.div>}
      </AnimatePresence>

      {/* Planning Modal (Projektangebote & Jira) */}
      <PlanningModal isOpen={!!planningForPerson} onClose={async () => { setPlanningForPerson(null); setPlanningForWeek(null); await refreshPersonDossier(planningForPerson); }} personId={planningForPerson || ''} filterByWeek={planningForWeek || undefined} />

      {/* Utilization Comment Modal (match EmployeeDossierModal look & feel) */}
      <AnimatePresence>
        {utilizationCommentForPerson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setUtilizationCommentForPerson(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <ArrowLeft className="w-4 h-4 text-blue-600" />
                  Auslastungskommentar
                </div>
                <button onClick={() => setUtilizationCommentForPerson(null)} className="p-2 rounded hover:bg-gray-100">
                  <X className="w-4 h-4 text-gray-500"/>
                </button>
              </div>
              <div className="p-4 space-y-3">
                <UtilizationComment personId={utilizationCommentForPerson} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Planning Comment Modal */}
      <PlanningCommentModal
        isOpen={!!planningCommentForPerson}
        onClose={async () => { await refreshPersonDossier(planningCommentForPerson); setPlanningCommentForPerson(null); }}
        personId={planningCommentForPerson || ''}
      />

      {/* Admin Data Upload Modal */}
      <AdminDataUploadModal
        isOpen={isAdminUploadModalOpen}
        onClose={() => setIsAdminUploadModalOpen(false)}
        onDatabaseRefresh={loadDatabaseData}
      />

      {/* AuslastungView Modal */}
      {isAuslastungViewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsAuslastungViewOpen(false)} />
          <div className="relative w-full max-w-7xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
                            <div className="absolute top-4 right-4">
              <button
                onClick={() => setIsAuslastungViewOpen(false)}
                className="p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <AuslastungView />
          </div>
        </div>
      )}

      {/* EinsatzplanView Modal */}
      {isEinsatzplanViewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEinsatzplanViewOpen(false)} />
          <div className="relative w-full max-w-7xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
                          <div className="absolute top-4 right-4">
                <button
                  onClick={() => setIsEinsatzplanViewOpen(false)}
                  className="p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            <EinsatzplanView />
          </div>
        </div>
      )}

      {/* Sales Opportunities Modal */}
      <SalesOpportunities
        isOpen={isSalesOpportunitiesOpen}
        onClose={() => {
          setIsSalesOpportunitiesOpen(false);
          setSalesOpportunitiesPerson(null);
        }}
        personId={salesOpportunitiesPerson || ''}
        personName={salesOpportunitiesPerson || ''}
      />

      {/* Assignment Editor Modal */}
      <AssignmentEditorModal
        isOpen={isAssignmentEditorOpen}
        onClose={() => { setIsAssignmentEditorOpen(false); setAssignmentEditorPerson(null); }}
        employeeName={assignmentEditorPerson || ''}
      />

      {/* Scope Settings Modal entfernt: Es gibt nur noch EIN Dropdown für alle Filter */}
    </div>
  );
}