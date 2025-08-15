import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Download, FileSpreadsheet, AlertCircle, Users, TrendingUp, Star, Info, Minus, Plus, Calendar, Baby, Heart, Thermometer, UserX, GraduationCap, Car, ChefHat, Database, Target, User } from 'lucide-react';
import { DataUploadSection } from './DataUploadSection';
import { MultiSelectFilter } from './MultiSelectFilter';
import { PersonFilterBar } from './PersonFilterBar';
import DatabaseService from '../../services/database';
import { KpiCardsGrid } from './KpiCardsGrid';
import { UtilizationChartSection } from './UtilizationChartSection';
import { UtilizationTrendChart } from './UtilizationTrendChart';
import { PlannedEngagementEditor, PlannedEngagement } from './PlannedEngagementEditor';
import { StatusLabelSelector } from './StatusLabelSelector';
import { TravelReadinessSelector } from './TravelReadinessSelector';
import { EmployeeDossierModal, Employee } from './EmployeeDossierModal';
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
export function UtilizationReportView() {
  const [uploadedFiles, setUploadedFiles] = useState<{
    auslastung?: UploadedFile;
    einsatzplan?: UploadedFile;
  }>({});
  const [databaseData, setDatabaseData] = useState<{
    auslastung?: any[];
    einsatzplan?: any[];
    utilizationData?: any[];
  }>({});
  const [dataSource, setDataSource] = useState<'upload' | 'database'>('database');
  const [selectedPersons, setSelectedPersons] = useState<string[]>([]);

  // Function to switch data source
  const switchToUpload = () => {
    setDataSource('upload');
    setDatabaseData({});
  };

  const switchToDatabase = () => {
    setDataSource('database');
    setUploadedFiles({});
  };

  // Employee Dossier Modal öffnen
  const openEmployeeDossier = (person: string) => {
    // Hole Excel-Daten für diese Person
    let excelData: {
      name: string;
      manager: string;
      team: string;
      competenceCenter: string;
      lineOfBusiness: string;
      careerLevel: string;
    } | undefined = undefined;
    
    if (dataSource === 'database') {
      const einsatzplanData = databaseData.einsatzplan?.find(item => item.person === person);
      if (einsatzplanData) {
        excelData = {
          name: person,
          manager: String(einsatzplanData.vg || ''),
          team: String(einsatzplanData.team || ''),
          competenceCenter: String(einsatzplanData.cc || ''),
          lineOfBusiness: String(einsatzplanData.bu || ''),
          careerLevel: String(einsatzplanData.lbs || '')
        };
      }
    } else {
      const einsatzplanData = uploadedFiles.einsatzplan?.data?.find((item: any) => item.person === person);
      if (einsatzplanData) {
        excelData = {
          name: person,
          manager: String(einsatzplanData.vg || ''),
          team: String(einsatzplanData.team || ''),
          competenceCenter: String(einsatzplanData.cc || ''),
          lineOfBusiness: String(einsatzplanData.bu || ''),
          careerLevel: String(einsatzplanData.lbs || '')
        };
      }
    }

    const employee: Employee = {
      id: person, // Verwende den Personennamen als ID
      name: person,
      careerLevel: excelData?.careerLevel || '',
      manager: excelData?.manager || '',
      team: excelData?.team || '',
      competenceCenter: excelData?.competenceCenter || '',
      lineOfBusiness: excelData?.lineOfBusiness || '',
      email: '',
      phone: '',
      projectHistory: [],
      strengths: '',
      weaknesses: '',
      comments: '',
      travelReadiness: String(personTravelReadiness[person] || ''),
      projectOffers: [],
      jiraTickets: [],
      excelData: excelData
    };

    setSelectedEmployee(employee);
    setIsEmployeeDossierOpen(true);
  };
  const [filterCC, setFilterCC] = useState<string[]>([]);
  const [filterLBS, setFilterLBS] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [showActionItems, setShowActionItems] = useState<boolean>(false);
  const [actionItems, setActionItems] = useState<Record<string, boolean>>({});
  const [personSearchTerm, setPersonSearchTerm] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showWorkingStudents, setShowWorkingStudents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('utilization_show_working_students') || 'true'); } catch { return true; }
  });
  
  // Employee Dossier Modal
  const [isEmployeeDossierOpen, setIsEmployeeDossierOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const currentWeek = getISOWeek(new Date());
  const currentIsoYear = getISOWeekYear(new Date());
  const [forecastStartWeek, setForecastStartWeek] = useState(currentWeek);
  const [lookbackWeeks, setLookbackWeeks] = useState(8);
  const [forecastWeeks, setForecastWeeks] = useState(8);
  const importJsonInputRef = useRef<HTMLInputElement>(null);
  const STORAGE_KEY = 'utilization_uploaded_files_v1';
  const STORAGE_PEOPLE_KEY = 'utilization_planned_people_v1';
  const STORAGE_CUSTOMERS_KEY = 'utilization_customers_v1';

  // Load data from database on mount
  useEffect(() => {
    const loadDatabaseData = async () => {
      try {
        // Prüfe ob Datenbank-Daten vorhanden sind
        const auslastung = await DatabaseService.getAuslastung();
        const einsatzplan = await DatabaseService.getEinsatzplan();
        const utilizationData = await DatabaseService.getUtilizationData();
        
        if (auslastung.length > 0 || einsatzplan.length > 0 || utilizationData.length > 0) {
          setDatabaseData({
            auslastung: auslastung.length > 0 ? auslastung : undefined,
            einsatzplan: einsatzplan.length > 0 ? einsatzplan : undefined,
            utilizationData: utilizationData.length > 0 ? utilizationData : undefined
          });
          setDataSource('database');
        }
      } catch (error) {
        console.log('Keine Datenbank-Daten verfügbar, verwende Upload-Daten');
      }
    };

    loadDatabaseData();
  }, []);

  // Restore from localStorage on mount (fallback)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.auslastung || parsed.einsatzplan)) {
          setUploadedFiles(parsed);
          setDataSource('upload');
        }
      }
    } catch {}
  }, []);

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
        
        // Speichere bereinigte Daten
        if (hasChanges) {
          localStorage.setItem('utilization_person_status_v1', JSON.stringify(cleaned));
          setPersonStatus(cleaned);
        }
      }
    } catch {}
  }, []);

  // Autosave to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadedFiles));
    } catch {}
  }, [uploadedFiles]);

  // Save working students toggle state
  useEffect(() => {
    try {
      localStorage.setItem('utilization_show_working_students', JSON.stringify(showWorkingStudents));
    } catch {}
  }, [showWorkingStudents]);

  // Planned engagements and customers (persisted independently of uploads)
  const [plannedByPerson, setPlannedByPerson] = useState<Record<string, PlannedEngagement>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_PEOPLE_KEY) || '{}'); } catch { return {}; }
  });
  const [customers, setCustomers] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_CUSTOMERS_KEY) || '[]'); } catch { return []; }
  });
  const [personStatus, setPersonStatus] = useState<Record<string, string | undefined>>(() => {
    try { return JSON.parse(localStorage.getItem('utilization_person_status_v1') || '{}'); } catch { return {}; }
  });
  const [personTravelReadiness, setPersonTravelReadiness] = useState<Record<string, number | undefined>>(() => {
    try { return JSON.parse(localStorage.getItem('utilization_person_travel_readiness_v1') || '{}'); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem(STORAGE_PEOPLE_KEY, JSON.stringify(plannedByPerson)); } catch {} }, [plannedByPerson]);
  useEffect(() => { try { localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(customers)); } catch {} }, [customers]);
  useEffect(() => { try { localStorage.setItem('utilization_person_status_v1', JSON.stringify(personStatus)); } catch {} }, [personStatus]);
  useEffect(() => { try { localStorage.setItem('utilization_person_travel_readiness_v1', JSON.stringify(personTravelReadiness)); } catch {} }, [personTravelReadiness]);

  // Entferne automatische Basiswoche-Ausrichtung – Guardrail: keine Automatik
  // (vorherige useEffect-Anpassungen bleiben entfernt)

  // Helper functions to get status icon and color
  const getWeekValue = (row: any, weekNum: number, year: number): number | undefined => {
    const values = row?.values as Record<string, unknown> | undefined;
    if (!values) return undefined;
    const asNumber = (raw: unknown): number | undefined => {
      const num = Number(raw);
      return Number.isFinite(num) ? (num as number) : undefined;
    };

    // 1) Exact: "KW n-YYYY"
    const key1 = `KW ${weekNum}-${year}`;
    if (key1 in values) return asNumber(values[key1]);

    // 2) Exact without year: "KW n"
    const key2 = `KW ${weekNum}`;
    if (key2 in values) return asNumber(values[key2]);

    // 3) Any variant starting with "KW n-" (different year) e.g., "KW n-2024"
    const altYearKey = Object.keys(values).find(k => k.trim().toLowerCase().startsWith(`kw ${weekNum}-`));
    if (altYearKey) return asNumber(values[altYearKey]);

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
  const isWeekInPlannedProject = (person: string, weekNumber: number) => {
    const engagement = plannedByPerson[person];
    if (!engagement?.planned || !engagement.startKw || !engagement.endKw) return false;
    
    const startKw = parseInt(engagement.startKw.split('KW')[1]);
    const endKw = parseInt(engagement.endKw.split('KW')[1]);
    
    return weekNumber >= startKw && weekNumber <= endKw;
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
  // Build consolidated data from uploaded files or database (Auslastung = Rückblick, Einsatzplan = Vorblick)
  const consolidatedData: UtilizationData[] | null = useMemo(() => {
    let aus: any[] | null = null;
    let ein: any[] | null = null;

    if (dataSource === 'database') {
      // Verwende Datenbank-Daten
      aus = databaseData.auslastung || null;
      ein = databaseData.einsatzplan || null;
    } else {
      // Verwende Upload-Daten
      aus = uploadedFiles.auslastung?.isValid ? (uploadedFiles.auslastung?.data as any[]) : null;
      ein = uploadedFiles.einsatzplan?.isValid ? (uploadedFiles.einsatzplan?.data as any[]) : null;
    }

    if (!aus && !ein) return null;
    const normalizePersonKey = (s: string) => {
      // Nur Klammern und Leerzeichen entfernen, KEINE Buchstaben ändern
      // Das verhindert, dass "Leisen, Wei" zu "Leisen, Wie" wird
      const cleaned = s.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
      
      // Spezielle Behandlung für bekannte Namensabweichungen
      if (cleaned === 'Leisen, Wie') return 'Leisen, Wei';
      if (cleaned === 'Leisen, Wei') return 'Leisen, Wei';
      
      return cleaned;
    };
    // Left side includes current week; right side starts after current week
    const leftStart = forecastStartWeek - lookbackWeeks + 1;
    const leftWeeksArr = Array.from({ length: lookbackWeeks }, (_, i) => leftStart + i);
    const rightWeeksArr = Array.from({ length: forecastWeeks }, (_, i) => forecastStartWeek + 1 + i);
    const currentYear = currentIsoYear;

    const ausMap = new Map<string, any>();
    const einMap = new Map<string, any>();
    aus?.forEach(r => ausMap.set(normalizePersonKey(r.person), r));
    ein?.forEach(r => einMap.set(normalizePersonKey(r.person), r));
    const allNames = Array.from(new Set([...(aus ? aus.map(r => normalizePersonKey(r.person)) : []), ...(ein ? ein.map(r => normalizePersonKey(r.person)) : [])]))
      .sort((a, b) => a.split(',')[0].localeCompare(b.split(',')[0], 'de'));

    const out: UtilizationData[] = [];
    for (const personKey of allNames) {
      const personOriginal = personKey; // already normalized for display we keep original label
      // Left (historical, includes current week)
      for (let i = 0; i < leftWeeksArr.length; i++) {
        const weekNum = leftWeeksArr[i];
        const fileKey = `KW ${weekNum}-${currentYear}`;
        const uiLabel = `${currentYear}-KW${weekNum}`;
        const aRow = ausMap.get(personKey);
        const eRow = einMap.get(personKey);
        let val: number | null = null;
        const fromAus = getWeekValue(aRow, weekNum, currentYear);
        const fromEin = getWeekValue(eRow, weekNum, currentYear);
        if (fromAus !== undefined) val = fromAus;
        else if (fromEin !== undefined) val = fromEin;
        out.push({ person: personOriginal, week: uiLabel, utilization: Number.isFinite(val as number) ? Math.round((val as number) * 10) / 10 : null, isHistorical: true });
      }
      // Right (forecast, strictly after current week)
      for (let i = 0; i < rightWeeksArr.length; i++) {
        const weekNum = rightWeeksArr[i];
        const fileKey = `KW ${weekNum}-${currentYear}`;
        const uiLabel = `${currentYear}-KW${weekNum}`;
        const aRow = ausMap.get(personKey);
        const eRow = einMap.get(personKey);
        let val: number | null = null;
        const fromAus = getWeekValue(aRow, weekNum, currentYear);
        const fromEin = getWeekValue(eRow, weekNum, currentYear);
        if (fromAus !== undefined) val = fromAus;
        else if (fromEin !== undefined) val = fromEin;
        out.push({ person: personOriginal, week: uiLabel, utilization: Number.isFinite(val as number) ? Math.round((val as number) * 10) / 10 : null, isHistorical: false });
      }
    }
    return out;
  }, [uploadedFiles, forecastStartWeek, lookbackWeeks, forecastWeeks]);

  const dataForUI: UtilizationData[] = consolidatedData ?? mockData;

  // Automatische ACT-Checkbox Aktivierung basierend auf niedriger Auslastung
  useEffect(() => {
    if (!dataForUI || dataForUI.length === 0) return;

    const autoSetActionItems = () => {
      const newActionItems: Record<string, boolean> = {};
      
      // Alle Personen sammeln
      const allPersons = Array.from(new Set(dataForUI.map(item => item.person)));
      
      allPersons.forEach(person => {
        // Letzte 4 Wochen aus der Auslastung prüfen
        const last4Weeks = Array.from({ length: 4 }, (_, i) => {
          const weekNumber = forecastStartWeek - 4 + i;
          const weekData = dataForUI.find(item => 
            item.person === person && 
            item.week === `${currentIsoYear}-KW${weekNumber}` &&
            item.isHistorical
          );
          return weekData?.utilization || 0;
        });

        // Nächste 8 Wochen aus dem Einsatzplan prüfen
        const next8Weeks = Array.from({ length: 8 }, (_, i) => {
          const weekNumber = forecastStartWeek + i;
          const weekData = dataForUI.find(item => 
            item.person === person && 
            item.week === `${currentIsoYear}-KW${weekNumber}` &&
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

      // Nur setzen wenn sich etwas geändert hat
      if (Object.keys(newActionItems).length > 0) {
        setActionItems(prev => ({ ...prev, ...newActionItems }));
      }
    };

    autoSetActionItems();
  }, [dataForUI, forecastStartWeek, currentIsoYear]);

  // Build person → meta mapping from uploaded data or database (prefer Auslastung, fallback Einsatzplan)
  const personMeta = useMemo(() => {
    const meta = new Map<string, { cc?: string; lbs?: string }>();
    
    let aus: any[] | undefined;
    let ein: any[] | undefined;

    if (dataSource === 'database') {
      aus = databaseData.auslastung;
      ein = databaseData.einsatzplan;
    } else {
      aus = uploadedFiles.auslastung?.data as any[] | undefined;
      ein = uploadedFiles.einsatzplan?.data as any[] | undefined;
    }

    const fill = (rows?: any[]) => {
      rows?.forEach(r => {
        if (!r?.person) return;
        meta.set(r.person, {
          cc: r.cc ?? meta.get(r.person)?.cc,
          lbs: r.lbs ?? meta.get(r.person)?.lbs
        });
      });
    };
    fill(aus);
    fill(ein);
    return meta;
  }, [uploadedFiles, databaseData, dataSource]);



  // Options for dropdowns
  const ccOptions = useMemo(() => {
    const s = new Set<string>();
    personMeta.forEach(m => { if (m.cc) s.add(String(m.cc)); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'de'));
  }, [personMeta]);
  const lbsOptions = useMemo(() => {
    const s = new Set<string>();
    personMeta.forEach(m => { if (m.lbs) s.add(String(m.lbs)); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'de'));
  }, [personMeta]);
  
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
    if (filterStatus.length > 0) base = base.filter(d => {
      const personStatusValue = personStatus[d.person];
      if (!personStatusValue) return false;
      
      // Prüfe ob der Status im Filter enthalten ist (sowohl ID als auch Label)
      return filterStatus.some(filterStatusItem => {
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
    });
    
    // Action Items Filter
    if (showActionItems) {
      base = base.filter(d => actionItems[d.person] === true);
    }
    
    if (selectedPersons.length > 0) {
      base = base.filter(item => selectedPersons.includes(item.person));
    }
    return base;
  }, [dataForUI, selectedPersons, filterCC, filterLBS, filterStatus, personMeta, personStatus, showWorkingStudents, showActionItems, actionItems, personSearchTerm]);
  const visiblePersons = useMemo(() => {
    return Array.from(new Set(filteredData.map(item => item.person)));
  }, [filteredData]);
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
  const hasData = uploadedFiles.auslastung?.isValid || uploadedFiles.einsatzplan?.isValid || dataForUI.length > 0;
  const handleExportCSV = () => {
    console.log('Exporting CSV...');
  };
  const handleExportExcel = () => {
    console.log('Exporting Excel...');
  };
  const handleSaveLocal = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadedFiles));
    } catch {}
  };
  const handleLoadLocal = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setUploadedFiles(parsed || {});
      }
    } catch {}
  };
  const handleResetLocal = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setUploadedFiles({});
  };
  const handleExportJSON = () => {
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: 1,
      data: uploadedFiles
    });
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utilization-data-${currentIsoYear}-KW${forecastStartWeek}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const handleImportJSONClick = () => {
    importJsonInputRef.current?.click();
  };
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const parsed = JSON.parse(text);
        const files = parsed?.data || parsed; // accept plain structure as well
        if (files && (files.auslastung || files.einsatzplan)) {
          setUploadedFiles(files);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
        }
      } catch {}
    };
    reader.readAsText(f);
    // reset input value so same file can be chosen again later
    e.currentTarget.value = '';
  };
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
      </div>;
  }
  return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Auslastung & Vorblick {currentIsoYear}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Rückblick {lookbackWeeks} W · Vorblick {forecastWeeks} W · ISO-KW
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button onClick={handleExportExcel} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button onClick={handleSaveLocal} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Speichern
            </button>
            <button onClick={handleLoadLocal} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Laden
            </button>
            <button onClick={handleResetLocal} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Zurücksetzen
            </button>
            <button onClick={handleExportJSON} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Export JSON
            </button>
            <button onClick={handleImportJSONClick} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Import JSON
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <input ref={importJsonInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportJSON} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full p-4 space-y-6">
        {/* Data Source Status and Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Datenquelle
              </h3>
              <p className="text-sm text-gray-600">
                {dataSource === 'database' 
                  ? 'Daten aus der lokalen Datenbank geladen' 
                  : 'Daten aus Excel-Uploads (Updates)'
                }
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {dataSource === 'database' ? (
                <button
                  onClick={switchToUpload}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Daten aktualisieren
                </button>
              ) : (
                <button
                  onClick={switchToDatabase}
                  disabled={!databaseData.auslastung && !databaseData.einsatzplan}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Database className="w-4 h-4" />
                  Datenbank-Daten verwenden
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Upload Section (extracted component) */}
        <DataUploadSection uploadedFiles={uploadedFiles} onFilesChange={setUploadedFiles} />

        {/* Auslastung Preview ausgeblendet (weiterhin über Upload einsehbar) */}

        {/* KPI Cards */}
        <KpiCardsGrid kpiData={kpiData} />

        {/* Chart Section (new standalone component) */}
        <UtilizationTrendChart data={filteredData as any} forecastStartWeek={forecastStartWeek} lookbackWeeks={lookbackWeeks} forecastWeeks={forecastWeeks} isoYear={currentIsoYear} />

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Detailansicht nach Person
            </h3>
            
            {/* Alle Filter in einer Reihe - Personen, CC, LBS, Status und Action */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
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
              
              <MultiSelectFilter label="CC" options={ccOptions} selected={filterCC} onChange={setFilterCC} placeholder="Alle CC" />
              <MultiSelectFilter label="LBS" options={lbsOptions} selected={filterLBS} onChange={setFilterLBS} placeholder="Alle LBS" />
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
                  {/* Durchschnitt der ältesten 4 Wochen */}
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-12">
                    Ø KW{(forecastStartWeek - lookbackWeeks + 1)}-{(forecastStartWeek - lookbackWeeks + 4)}
                  </th>
                  {/* 4 Einzelwochen bis zur aktuellen KW */}
                  {Array.from({ length: 4 }, (_, i) => {
                    const weekNumber = (forecastStartWeek - lookbackWeeks + 5) + i;
                    return (
                      <th key={`left-single-${i}`} className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-12">
                        {`${currentIsoYear}-KW${weekNumber}`}
                      </th>
                    );
                  })}
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 min-w-16">
                    Act
                  </th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 min-w-16">
                    VG
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 min-w-20">
                    Mitarbeitende
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 min-w-20">LBS</th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 min-w-20">
                    <div className="flex items-center justify-center">
                      <Car className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 min-w-20">Status</th>
                  {Array.from({ length: forecastWeeks }, (_, i) => {
                    const weekNumber = (forecastStartWeek + 1) + i; // starts after current week
                    return (
                      <th key={`right-${i}`} className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-12">
                        {`${currentIsoYear}-KW${weekNumber}`}
                      </th>
                    );
                  })}
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 min-w-20">Kunde</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 min-w-20">%</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 min-w-20">Start KW</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 min-w-20">Planung</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 min-w-20">Ticket</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visiblePersons.map(person => {
                  const personData = filteredData.filter(item => item.person === person);
                  return (
                    <tr key={person} className="hover:bg-gray-50">
                      {/* Durchschnitt der ältesten 4 Wochen */}
                      <td className="px-1 py-2 text-center text-xs bg-gray-100">
                        {(() => {
                          const oldestWeeks = Array.from({ length: 4 }, (_, i) => {
                            const weekNumber = (forecastStartWeek - lookbackWeeks + 1) + i;
                            const weekData = personData.find(item => item.week === `${currentIsoYear}-KW${weekNumber}`);
                            return weekData?.utilization;
                          }).filter(util => util !== null && util !== undefined);
                          
                          if (oldestWeeks.length === 0) return '—';
                          
                          const average = Math.round(oldestWeeks.reduce((sum, util) => sum + util!, 0) / oldestWeeks.length);
                          let bgColor = 'bg-gray-100';
                          if (average > 90) bgColor = 'bg-green-100';
                          else if (average > 80) bgColor = 'bg-yellow-100';
                          else bgColor = 'bg-red-100';
                          
                          return (
                            <span className={`inline-block px-2 py-1 rounded ${bgColor}`}>
                              <span className="flex items-center justify-center gap-1">
                                {average}%
                                {average > 100 && <Star className="w-3 h-3 text-yellow-500" />}
                              </span>
                            </span>
                          );
                        })()}
                      </td>
                      {/* 4 Einzelwochen bis zur aktuellen KW */}
                      {Array.from({ length: 4 }, (_, i) => {
                        const weekNumber = (forecastStartWeek - lookbackWeeks + 5) + i;
                        const weekData = personData.find(item => item.week === `${currentIsoYear}-KW${weekNumber}`);
                        const utilization = weekData?.utilization;
                        let bgColor = 'bg-gray-100';
                        if (utilization !== null && utilization !== undefined) {
                          if (utilization > 90) bgColor = 'bg-green-100';
                          else if (utilization > 80) bgColor = 'bg-yellow-100';
                          else bgColor = 'bg-red-100';
                        }
                        return (
                          <td key={`l-single-${i}`} className={`px-1 py-2 text-center text-xs ${bgColor}`}>
                            {utilization !== null && utilization !== undefined ? (
                              <span className="flex items-center justify-center gap-1">
                                {utilization}%
                                {utilization > 100 && <Star className="w-3 h-3 text-yellow-500" />}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        );
                      })}
                                            {/* Act-Spalte mit Checkbox */}
                      <td className={`px-2 py-1 text-sm ${
                        actionItems[person] 
                          ? (plannedByPerson[person]?.planned ? 'bg-yellow-100' : 'bg-blue-100')
                          : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={actionItems[person] || false}
                            onChange={(e) => setActionItems(prev => ({ ...prev, [person]: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                      </td>
                      
                      {/* VG-Avatar-Spalte */}
                      <td className={`px-2 py-1 text-sm ${
                        actionItems[person] 
                          ? (plannedByPerson[person]?.planned ? 'bg-yellow-100' : 'bg-blue-100')
                          : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center justify-center">
                          {(() => {
                            // Hole VG-Information aus dem Einsatzplan
                            let vgName = '';
                            
                            if (dataSource === 'database') {
                              const einsatzplanData = databaseData.einsatzplan?.find(item => item.person === person);
                              vgName = einsatzplanData?.vg || '';
                            } else {
                              const einsatzplanData = uploadedFiles.einsatzplan?.data?.find((item: any) => item.person === person);
                              vgName = einsatzplanData?.vg || '';
                            }
                            
                            if (vgName && vgName.trim()) {
                              // Extrahiere Initialen (erste Buchstaben von Vor- und Nachname)
                              const initials = vgName
                                .split(' ')
                                .map(word => word.charAt(0).toUpperCase())
                                .join('')
                                .slice(0, 2); // Maximal 2 Initialen
                              
                              return (
                                <div 
                                  className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-medium flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors"
                                  title={vgName}
                                >
                                  {initials}
                                </div>
                              );
                            }
                            
                            return (
                              <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-500 text-xs font-medium flex items-center justify-center">
                                —
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      
                      <td className={`px-2 py-1 whitespace-nowrap text-sm font-medium text-gray-900 ${
                        actionItems[person] 
                          ? (plannedByPerson[person]?.planned ? 'bg-yellow-100' : 'bg-blue-100')
                          : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-2 w-full">
                          {personStatus[person] && (
                            <span className={getStatusColor(personStatus[person])}>
                              {getStatusIcon(personStatus[person])}
                            </span>
                          )}
                          {/* Student-Icon basierend auf LBS "Working Student" */}
                          {personMeta.get(person)?.lbs?.toLowerCase().includes('working student') && (
                            <span className="text-green-600" title="Working Student">
                              <GraduationCap className="w-4 h-4" />
                            </span>
                          )}
                          {/* Chef-Icon für Führungskräfte basierend auf LBS */}
                          {(personMeta.get(person)?.lbs?.toLowerCase().includes('competence center lead - senior manager') || 
                            personMeta.get(person)?.lbs?.toLowerCase().includes('team lead - manager')) && (
                            <span className="text-blue-600" title="Führungskraft">
                              <ChefHat className="w-4 h-4" />
                            </span>
                          )}

                          <div className="flex items-center gap-2">
                            <span>{person}</span>
                            {plannedByPerson[person]?.planned ? <span title="Geplanter Einsatz" className="inline-block w-2 h-2 rounded-full bg-amber-500" /> : null}
                          </div>
                          <button
                            onClick={() => openEmployeeDossier(person)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors ml-auto"
                            title="Mitarbeiter-Dossier öffnen"
                          >
                            <User className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className={`px-2 py-2 text-sm ${
                        actionItems[person] 
                          ? (plannedByPerson[person]?.planned ? 'bg-yellow-100' : 'bg-blue-100')
                          : 'bg-gray-50'
                      }`}>
                        {personMeta.get(person)?.lbs ? (
                          <span className="text-xs text-gray-700">{personMeta.get(person)?.lbs}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className={`px-2 py-2 text-sm ${
                        actionItems[person] 
                          ? (plannedByPerson[person]?.planned ? 'bg-yellow-100' : 'bg-blue-100')
                          : 'bg-gray-50'
                      }`}>
                        <TravelReadinessSelector
                          person={person}
                          value={personTravelReadiness[person]}
                          onChange={(readiness) => setPersonTravelReadiness(prev => ({ ...prev, [person]: readiness }))}
                        />
                      </td>
                      <td className={`px-2 py-2 text-sm ${
                        actionItems[person] 
                          ? (plannedByPerson[person]?.planned ? 'bg-yellow-100' : 'bg-blue-100')
                          : 'bg-gray-50'
                      }`}>
                        <StatusLabelSelector
                          person={person}
                          value={personStatus[person]}
                          onChange={(status) => setPersonStatus(prev => ({ ...prev, [person]: status }))}
                        />
                      </td>
                      {Array.from({ length: forecastWeeks }, (_, i) => {
                        const weekNumber = (forecastStartWeek + 1) + i;
                        const weekData = personData.find(item => item.week === `${currentIsoYear}-KW${weekNumber}`);
                        const utilization = weekData?.utilization;
                        let bgColor = 'bg-gray-100';
                        if (utilization !== null && utilization !== undefined) {
                          if (utilization > 90) bgColor = 'bg-green-100';
                          else if (utilization > 80) bgColor = 'bg-yellow-100';
                          else bgColor = 'bg-red-100';
                        }
                        return (
                          <td key={`r-${i}`} className={`px-1 py-2 text-center text-xs ${bgColor}`}>
                            <div className="flex flex-col items-center gap-1">
                              {utilization !== null && utilization !== undefined ? (
                                <span className="flex items-center justify-center gap-1">
                                  {utilization}%
                                  {utilization > 100 && <Star className="w-3 h-3 text-yellow-500" />}
                                </span>
                              ) : (
                                '—'
                              )}
                              {isWeekInPlannedProject(person, weekNumber) && (
                                <span 
                                  title="Geplantes Projekt in dieser Woche" 
                                  className="text-blue-600"
                                >
                                  <Target className="w-4 h-4" />
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-sm bg-gray-50">
                        {plannedByPerson[person]?.planned && plannedByPerson[person]?.customer ? (
                          <span className="text-xs text-gray-700">{plannedByPerson[person].customer}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-sm bg-gray-50">
                        {plannedByPerson[person]?.planned && plannedByPerson[person]?.probability ? (
                          <span className="text-xs text-gray-700">{plannedByPerson[person].probability}%</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-sm bg-gray-50">
                        {plannedByPerson[person]?.planned && plannedByPerson[person]?.startKw ? (
                          <span className="text-xs text-gray-700">{plannedByPerson[person].startKw}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-sm bg-gray-50">
                        <PlannedEngagementEditor
                          person={person}
                          value={plannedByPerson[person]}
                          customers={customers}
                          availableKws={Array.from({ length: forecastWeeks }, (_, i) => {
                            const w = forecastStartWeek + 1 + i; // Nur zukünftige Wochen (ab aktueller KW + 1)
                            return `${currentIsoYear}-KW${w}`;
                          })}
                          onChange={(next) => setPlannedByPerson(prev => ({ ...prev, [person]: next }))}
                          onAddCustomer={(name) => setCustomers(prev => [...new Set([...prev, name.trim()])])}
                        />
                      </td>
                      <td className="px-2 py-2 text-sm bg-gray-50">
                        <input
                          type="text"
                          placeholder="Jira-Ticket (z.B. PROJ-123)"
                          value={plannedByPerson[person]?.ticketId || ''}
                          onChange={(e) => {
                            const ticketId = e.target.value.trim();
                            setPlannedByPerson(prev => ({
                              ...prev,
                              [person]: {
                                ...prev[person],
                                ticketId: ticketId || undefined
                              }
                            }));
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {plannedByPerson[person]?.ticketId && (
                          <div className="mt-1">
                            <a 
                              href={`https://jira.company.com/browse/${plannedByPerson[person].ticketId}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 underline truncate block"
                              title={`Jira-Ticket: ${plannedByPerson[person].ticketId}`}
                            >
                              {plannedByPerson[person].ticketId}
                            </a>
                          </div>
                        )}
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
          // Kunden-Funktionalität weitergeben
          customers={customers}
          onAddCustomer={(name) => setCustomers(prev => [...new Set([...prev, name.trim()])])}
        />
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setIsSettingsOpen(false)}>
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
                        2025-KW{30 + i}
                      </option>)}
                  </select>
                </div>

                {/* Summary */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    Zeitraum-Übersicht
                  </h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>• Rückblick: KW{forecastStartWeek - lookbackWeeks} - KW{forecastStartWeek - 1} ({lookbackWeeks} Wochen)</p>
                    <p>• Vorblick: KW{forecastStartWeek} - KW{forecastStartWeek + forecastWeeks - 1} ({forecastWeeks} Wochen)</p>
                    <p>• Gesamt: {lookbackWeeks + forecastWeeks} Wochen</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Fehlende Werte werden in Aggregationen ignoriert.
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                  Übernehmen
                </button>
              </div>
            </motion.div>
          </motion.div>}
      </AnimatePresence>
    </div>;
}