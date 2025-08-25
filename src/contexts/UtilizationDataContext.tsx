import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { personActionItemService, auslastungserklaerungService, personAuslastungserklaerungService } from '../lib/firebase-services';

interface OptimisticUpdateResult {
  success: boolean;
  error?: string;
  reverted?: boolean;
}

interface UtilizationDataContextType {
  databaseData: {
    auslastung?: any[];
    einsatzplan?: any[];
    utilizationData?: any[];
  };
  personMeta: Map<string, any>;
  isLoading: boolean;
  isInitialized: boolean;
  refreshData: () => Promise<void>;
  clearCache: () => void;
  
  // Optimistic Update Functions
  updateActionItemOptimistic: (
    person: string, 
    actionItem: boolean, 
    source: 'manual' | 'rule', 
    updatedBy?: string
  ) => Promise<OptimisticUpdateResult>;
  
  updateAuslastungserklaerungOptimistic: (
    person: string, 
    auslastungserklaerung: string
  ) => Promise<OptimisticUpdateResult>;
  
  createAuslastungserklaerungOptimistic: (
    name: string
  ) => Promise<OptimisticUpdateResult>;
}

const UtilizationDataContext = createContext<UtilizationDataContextType | undefined>(undefined);

const CACHE_KEY = 'utilization_data_cache';
const CACHE_VERSION = '1.1'; // Version erhöht um alten Cache zu invalidieren
const CACHE_DURATION = 30 * 60 * 1000; // 30 Minuten
const APP_START_KEY = 'app_start_timestamp';

interface CacheData {
  data: any;
  timestamp: number;
  version: string;
}

export function UtilizationDataProvider({ children }: { children: ReactNode }) {
  console.log('🔧 UtilizationDataProvider wird gerendert');
  
  const [databaseData, setDatabaseData] = useState<{
    auslastung?: any[];
    einsatzplan?: any[];
    utilizationData?: any[];
  }>({});
  
  const [personMeta, setPersonMeta] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Cache-Funktionen
  const saveToCache = (data: any) => {
    try {
      const cacheData: CacheData = {
        data,
        timestamp: Date.now(),
        version: CACHE_VERSION
      };
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      // console.log entfernt
    } catch (error) {
      // console.warn entfernt
    }
  };

  const loadFromCache = (): any | null => {
    try {
      // Prüfe ob App neu gestartet wurde
      const currentAppStart = sessionStorage.getItem(APP_START_KEY);
      const currentTime = Date.now();
      
      if (!currentAppStart) {
        // Erste App-Ladung - setze Timestamp und lösche alten Cache
        sessionStorage.setItem(APP_START_KEY, currentTime.toString());
        sessionStorage.removeItem(CACHE_KEY);
        console.log('🔄 App-Neustart erkannt - Cache geleert');
        return null;
      }
      
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const cacheData: CacheData = JSON.parse(cached);
      
      // Prüfe Cache-Version und Alter
      if (cacheData.version !== CACHE_VERSION) {
        console.log('🔄 Cache-Version veraltet - Cache geleert');
        sessionStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      if (currentTime - cacheData.timestamp > CACHE_DURATION) {
        console.log('🔄 Cache abgelaufen - Cache geleert');
        sessionStorage.removeItem(CACHE_KEY);
        return null;
      }

      console.log('📦 Cache-Daten geladen');
      return cacheData.data;
    } catch (error) {
      console.warn('⚠️ Cache-Fehler:', error);
      return null;
    }
  };

  const clearCache = () => {
    sessionStorage.removeItem(CACHE_KEY);
    // console.log entfernt
  };

  // Daten aus Firebase laden
  const loadDatabaseData = async (useCache = true): Promise<void> => {
    try {
      setIsLoading(true);

      // Versuche zuerst aus Cache zu laden
      if (useCache) {
        const cachedData = loadFromCache();
        if (cachedData) {
          setDatabaseData(cachedData.databaseData);
          setPersonMeta(new Map(cachedData.personMeta));
          setIsLoading(false);
          setIsInitialized(true);
          return;
        }
      }

      console.log('🔄 Lade frische Daten aus Firebase...');

      // Lade aus Firebase
      const utilizationSnapshot = await getDocs(collection(db, 'utilizationData'));
      const utilizationData = utilizationSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      console.log(`📊 Loaded ${utilizationData.length} records from utilizationData collection`);

      // Transformiere Daten - ZURÜCK ZUR FUNKTIONIERENDEN VERSION
      const transformedData = {
        utilizationData: utilizationData,
        auslastung: utilizationData.map(record => ({
          id: record.id,
          person: record.person,
          personId: record.id,
          lob: record.lob,
          bereich: record.bereich,
          cc: record.cc,
          team: record.team,
          lbs: record.lbs,
          vg: record.vg,
          values: record.auslastung || {}
        })),
        einsatzplan: utilizationData.map(record => ({
          id: record.id,
          person: record.person,
          personId: record.id,
          lob: record.lob,
          bereich: record.bereich,
          cc: record.cc,
          team: record.team,
          vg: record.vg,
          values: Object.entries(record.einsatzplan || {}).reduce((acc, [week, entries]) => {
            if (Array.isArray(entries) && entries.length > 0) {
              const totalUtilization = entries.reduce((sum, entry) => sum + (entry.auslastungProzent || 0), 0);
              acc[week] = totalUtilization;
            }
            return acc;
          }, {} as Record<string, number>)
        }))
      };

      // Erstelle PersonMeta aus den RAW utilizationData (nicht transformiert)
      const personMetaMap = new Map<string, any>();
      utilizationData.forEach((row: any) => {
        if (row.person) {
          console.log('🔍 DEBUG: Creating personMeta for', row.person, {
            id: row.id,
            standort: row.standort,
            email: row.email,
            allKeys: Object.keys(row)
          });
          
          const personData = {
            id: row.id,  // ✅ ID hinzugefügt für korrekte Identifikation in EmployeeDetailView
            lob: row.lob,
            bereich: row.bereich,
            cc: row.cc,
            team: row.team,
            lbs: row.lbs,
            careerLevel: row.careerLevel,
            manager: row.vg,
            standort: row.standort, // ✅ Standort aus utilizationData hinzufügen
            email: row.email,       // ✅ E-Mail aus utilizationData hinzufügen
            startDate: row.verfuegbarAb, // ✅ Start-Datum aus utilizationData hinzufügen
            utilizationComment: row.utilizationComment || '', // ✅ Auslastungskommentar aus utilizationData
            planningComment: row.planningComment || '', // ✅ Einsatzplan-Kommentar aus utilizationData
            person: row.person // ✅ Person Name für Formatierung
          };
          
          // ✅ NEU: Sowohl Namen- als auch ID-basierte Keys setzen
          if (!personMetaMap.has(row.person)) {
            personMetaMap.set(row.person, personData);  // Name als Key (für bestehende Funktionalität)
          }
          if (!personMetaMap.has(row.id)) {
            personMetaMap.set(row.id, personData);      // ID als Key (für EmployeeDetailView)
          }
        }
      });

      // Setze Daten
      setDatabaseData(transformedData);
      setPersonMeta(personMetaMap);

      // Speichere im Cache
      saveToCache({
        databaseData: transformedData,
        personMeta: Array.from(personMetaMap.entries())
      });

      // console.log entfernt
      
    } catch (error) {
      // console.error entfernt
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  // Initialer Datenload
  useEffect(() => {
    loadDatabaseData();
  }, []);

  const refreshData = async () => {
    // console.log entfernt
    clearCache();
    await loadDatabaseData(false);
  };

  // Optimistic Update für Action Items
  const updateActionItemOptimistic = async (
    person: string, 
    actionItem: boolean, 
    source: 'manual' | 'rule', 
    updatedBy?: string
  ): Promise<OptimisticUpdateResult> => {
    // console.log entfernt
    
    try {
      // 1. Sofortiges UI-Update (optimistic)
      // Hier würden wir normalerweise lokalen State aktualisieren
      // Da Action Items nicht im Cache sind, überspringen wir das
      
      // 2. Firebase-Update im Hintergrund
      await personActionItemService.update(person, actionItem, source, updatedBy);
      
      // console.log entfernt
      return { success: true };
      
    } catch (error) {
      // console.error entfernt
      
      // 3. Bei Fehler: Revert (hier nicht nötig, da kein lokaler State)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        reverted: false
      };
    }
  };

  // Optimistic Update für Auslastungserklaerungen
  const updateAuslastungserklaerungOptimistic = async (
    person: string, 
    auslastungserklaerung: string
  ): Promise<OptimisticUpdateResult> => {
    // console.log entfernt
    
    try {
      // 1. Sofortiges UI-Update (optimistic)
      // Hier würden wir normalerweise lokalen State aktualisieren
      
      // 2. Firebase-Update im Hintergrund
      await personAuslastungserklaerungService.update(person, auslastungserklaerung);
      
      // console.log entfernt
      return { success: true };
      
    } catch (error) {
      // console.error entfernt
      
      // 3. Bei Fehler: Revert
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        reverted: false
      };
    }
  };

  // Optimistic Update für neue Auslastungserklaerungen
  const createAuslastungserklaerungOptimistic = async (
    name: string
  ): Promise<OptimisticUpdateResult> => {
    // console.log entfernt
    
    try {
      // 1. Sofortiges UI-Update (optimistic)
      // Hier würden wir normalerweise lokalen State aktualisieren
      
      // 2. Firebase-Update im Hintergrund
      await auslastungserklaerungService.save({ name: name.trim() });
      
      // console.log entfernt
      return { success: true };
      
    } catch (error) {
      // console.error entfernt
      
      // 3. Bei Fehler: Revert
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        reverted: false
      };
    }
  };

  const contextValue: UtilizationDataContextType = {
    databaseData,
    personMeta,
    isLoading,
    isInitialized,
    refreshData,
    clearCache,
    updateActionItemOptimistic,
    updateAuslastungserklaerungOptimistic,
    createAuslastungserklaerungOptimistic
  };

  return (
    <UtilizationDataContext.Provider value={contextValue}>
      {children}
    </UtilizationDataContext.Provider>
  );
}

export function useUtilizationData() {
  const context = useContext(UtilizationDataContext);
  if (context === undefined) {
    throw new Error('useUtilizationData must be used within a UtilizationDataProvider');
  }
  return context;
}
