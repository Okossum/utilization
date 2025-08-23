import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
}

const UtilizationDataContext = createContext<UtilizationDataContextType | undefined>(undefined);

const CACHE_KEY = 'utilization_data_cache';
const CACHE_VERSION = '1.0';
const CACHE_DURATION = 30 * 60 * 1000; // 30 Minuten

interface CacheData {
  data: any;
  timestamp: number;
  version: string;
}

export function UtilizationDataProvider({ children }: { children: ReactNode }) {
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
      console.log('💾 Daten im SessionStorage gespeichert');
    } catch (error) {
      console.warn('⚠️ Fehler beim Speichern im Cache:', error);
    }
  };

  const loadFromCache = (): any | null => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const cacheData: CacheData = JSON.parse(cached);
      
      // Prüfe Cache-Version und Alter
      if (cacheData.version !== CACHE_VERSION) {
        console.log('🔄 Cache-Version veraltet, lösche Cache');
        sessionStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      if (Date.now() - cacheData.timestamp > CACHE_DURATION) {
        console.log('⏰ Cache abgelaufen, lösche Cache');
        sessionStorage.removeItem(CACHE_KEY);
        return null;
      }

      console.log('✅ Daten aus SessionStorage geladen');
      return cacheData.data;
    } catch (error) {
      console.warn('⚠️ Fehler beim Laden aus Cache:', error);
      return null;
    }
  };

  const clearCache = () => {
    sessionStorage.removeItem(CACHE_KEY);
    console.log('🗑️ Cache geleert');
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

      console.log('🚀 Lade Daten aus Firebase...');

      // Lade aus Firebase
      const utilizationSnapshot = await getDocs(collection(db, 'utilizationData'));
      const utilizationData = utilizationSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // Transformiere Daten
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

      // Erstelle PersonMeta
      const personMetaMap = new Map<string, any>();
      utilizationData.forEach((row: any) => {
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

      // Setze Daten
      setDatabaseData(transformedData);
      setPersonMeta(personMetaMap);

      // Speichere im Cache
      saveToCache({
        databaseData: transformedData,
        personMeta: Array.from(personMetaMap.entries())
      });

      console.log('✅ Daten erfolgreich geladen und gecacht');
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der Daten:', error);
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
    console.log('🔄 Erzwinge Neuladen der Daten...');
    clearCache();
    await loadDatabaseData(false);
  };

  const contextValue: UtilizationDataContextType = {
    databaseData,
    personMeta,
    isLoading,
    isInitialized,
    refreshData,
    clearCache
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
