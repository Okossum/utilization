// Prisma Client kann nicht im Browser laufen
// Diese Funktionen werden nur im Backend/Node.js verwendet
// Für den Browser erstellen wir Mock-Funktionen

import {
  UserProfileData,
  UserUpdateData,
  AuslastungSaveRequest,
  EinsatzplanSaveRequest,
  EmployeeDossierData,
  EmployeeDossierSaveRequest,
  ConsolidatedDataSaveRequest,
  GenericDataArray,
  GenericDataObject,
  ApiEndpoint,
  RequestOptions
} from '../types/database';

// API-Basis-URL für Backend-Server
const API_BASE_URL = 'http://localhost:3001/api';

// API-Service für Backend-Kommunikation
let authTokenProvider: (() => Promise<string | null>) | null = null;

export function setAuthTokenProvider(provider: () => Promise<string | null>) {
  authTokenProvider = provider;
}

class ApiService {
  private static async request(endpoint: string, options: RequestInit = {}) {
    try {
      // ✅ SCHRITT 2: Token-Validierung vor API-Aufruf
      if (!authTokenProvider) {
        throw new Error('Token Provider nicht verfügbar - bitte warten Sie auf die Anmeldung');
      }
      
      const token = await authTokenProvider();
      if (!token) {
        throw new Error('Kein gültiger Token verfügbar - bitte melden Sie sich erneut an');
      }
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        // Spezielle Behandlung: 404 bei Dossier/Skills gilt als "nicht vorhanden" und ist kein harter Fehler
        if (response.status === 404 && (endpoint.startsWith('/employee-dossier') || endpoint.startsWith('/employee-skills'))) {
          if (endpoint.startsWith('/employee-skills')) {
            return [] as any;
          }
          return null as any;
        }
        if (response.status === 401) {
          throw new Error('Authentifizierung fehlgeschlagen - bitte melden Sie sich erneut an');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      // ✅ Bessere Error-Behandlung
      throw error;
    }
  }

  static async post(endpoint: string, data: GenericDataObject) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async get(endpoint: string) {
    return this.request(endpoint, {
      method: 'GET',
    });
  }

  static async put(endpoint: string, data?: GenericDataObject) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async delete(endpoint: string) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

// Datenbank-Service für lokale SQLite-Datenbank
export class DatabaseService {
  // ✅ SCHRITT 2: Warten auf Token Provider
  private static async waitForTokenProvider(maxWaitMs: number = 5000): Promise<void> {
    const startTime = Date.now();
    while (!authTokenProvider && (Date.now() - startTime) < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!authTokenProvider) {
      throw new Error('Token Provider nicht verfügbar nach 5 Sekunden Wartezeit');
    }
  }

  // Aktuelles User-Profil abrufen
  static async getMe() {
    try {
      await this.waitForTokenProvider();
      const result = await ApiService.get('/me');
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async updateMe(data: UserUpdateData) {
    try {
      return await ApiService.put('/me', data);
    } catch (error) {

      throw error;
    }
  }

  // Admin: Nutzerliste
  static async getUsers() {
    return ApiService.get('/users');
  }

  // Admin: Nutzer aktualisieren
  static async updateUser(uid: string, data: UserUpdateData) {
    return ApiService.put(`/users/${uid}`, data);
  }
  
  // Auslastung-Daten speichern oder aktualisieren
  static async saveAuslastung(fileName: string, data: GenericDataArray) {
    try {
      const result = await ApiService.post('/auslastung', { fileName, data });
      return result;
    } catch (error) {

      throw error;
    }
  }

  // Einsatzplan-Daten speichern oder aktualisieren
  static async saveEinsatzplan(fileName: string, data: GenericDataArray) {
    try {
      const result = await ApiService.post('/einsatzplan', { fileName, data });
      return result;
    } catch (error) {

      throw error;
    }
  }

  // Mitarbeiter-Daten speichern oder aktualisieren
  static async saveMitarbeiter(fileName: string, data: GenericDataArray) {
    try {
      const result = await ApiService.post('/mitarbeiter', { fileName, data });
      return result;
    } catch (error) {

      throw error;
    }
  }

  // Alle Auslastung-Daten abrufen (nur neueste Version)
  static async getAuslastung() {
    try {
      await this.waitForTokenProvider();
      const result = await ApiService.get('/auslastung');
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Alle Einsatzplan-Daten abrufen (nur neueste Version)
  static async getEinsatzplan() {
    try {
      await this.waitForTokenProvider();
      const result = await ApiService.get('/einsatzplan');
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Upload-Historie abrufen
  static async getUploadHistory() {
    try {
      return await ApiService.get('/upload-history');
    } catch (error) {

      throw error;
    }
  }

  // Employee Dossier speichern oder aktualisieren
  static async saveEmployeeDossier(employeeId: string, dossierData: EmployeeDossierData) {
    try {
      const result = await ApiService.post('/employee-dossier', { employeeId, dossierData });
      return result;
    } catch (error) {

      throw error;
    }
  }

  // Employee Dossier abrufen
  static async getEmployeeDossier(employeeId: string) {
    try {
      const id = encodeURIComponent(employeeId);
      return await ApiService.get(`/employee-dossier/${id}`);
    } catch (error) {

      return null;
    }
  }

  // Alle Employee Dossiers abrufen
  static async getAllEmployeeDossiers() {
    try {
      return await ApiService.get('/employee-dossiers');
    } catch (error) {

      return [];
    }
  }

  // Datenbank schließen (nicht mehr benötigt mit API)
  static async disconnect() {
    // API-basierte Implementierung benötigt keine explizite Verbindungsschließung
  }

  // Normalisierte Auslastungsdaten konsolidieren und speichern
  static async consolidateAndSaveUtilizationData(
    auslastungData: GenericDataArray,
    einsatzplanData: GenericDataArray,
    currentYear: number,
    forecastStartWeek: number,
    lookbackWeeks: number,
    forecastWeeks: number
  ) {
    try {
      const consolidatedData: GenericDataArray = [];
      
      // Alle Personen sammeln
      const allPersons = new Set([
        ...auslastungData.map(row => row.person).filter(Boolean),
        ...einsatzplanData.map(row => row.person).filter(Boolean)
      ]);

      for (const person of allPersons) {
        const ausRow = auslastungData.find(row => row.person === person);
        const einRow = einsatzplanData.find(row => row.person === person);

        // Historische Wochen (links von aktueller Woche)
        for (let i = 0; i < lookbackWeeks; i++) {
          const weekNum = forecastStartWeek - lookbackWeeks + i;
          const yy = String(currentYear).slice(-2);
          const ww = String(weekNum).padStart(2, '0');
          const weekKey = `${yy}/${ww}`;
          const uiLabel = `${yy}/${ww}`;
          
          const ausValue = ausRow ? this.extractWeekValue(ausRow, weekNum, currentYear) : null;
          const einValue = einRow ? this.extractWeekValue(einRow, weekNum, currentYear) : null;
          
          const finalValue = ausValue !== undefined ? ausValue : einValue;
          
          if (finalValue !== undefined) {
            consolidatedData.push({
              person,
              personId: ausRow?.personId || einRow?.personId,
              week: uiLabel,
              year: currentYear,
              weekNumber: weekNum,
              auslastungValue: ausValue,
              einsatzplanValue: einValue,
              finalValue,
              isHistorical: true,
              source: ausValue !== undefined ? 'auslastung' : 'einsatzplan',
              lob: ausRow?.lob,
              bereich: ausRow?.bereich,
              cc: ausRow?.cc,
              team: ausRow?.team,
              lbs: einRow?.lbs,
              compositeKey: `${person}__${ausRow?.team || einRow?.team || 'unknown'}__${ausRow?.cc || einRow?.cc || 'unknown'}`
            });
          }
        }

        // Forecast-Wochen (rechts von aktueller Woche)
        for (let i = 0; i < forecastWeeks; i++) {
          const weekNum = forecastStartWeek + i;
          const yy = String(currentYear).slice(-2);
          const ww = String(weekNum).padStart(2, '0');
          const weekKey = `${yy}/${ww}`;
          const uiLabel = `${yy}/${ww}`;
          
          const ausValue = ausRow ? this.extractWeekValue(ausRow, weekNum, currentYear) : null;
          const einValue = einRow ? this.extractWeekValue(einRow, weekNum, currentYear) : null;
          
          const finalValue = ausValue !== undefined ? ausValue : einValue;
          
          if (finalValue !== undefined) {
            consolidatedData.push({
              person,
              personId: ausRow?.personId || einRow?.personId,
              week: uiLabel,
              year: currentYear,
              weekNumber: weekNum,
              auslastungValue: ausValue,
              einsatzplanValue: einValue,
              finalValue,
              isHistorical: false,
              source: ausValue !== undefined ? 'auslastung' : 'einsatzplan',
              lob: ausRow?.lob,
              bereich: ausRow?.bereich,
              cc: ausRow?.cc,
              team: ausRow?.team,
              lbs: einRow?.lbs,
              compositeKey: `${person}__${ausRow?.team || einRow?.team || 'unknown'}__${ausRow?.cc || einRow?.cc || 'unknown'}`
            });
          }
        }
      }

      // Alle konsolidierten Daten werden über die API gespeichert
      // Die eigentliche Speicherung erfolgt im Backend
      if (consolidatedData.length > 0) {
        await this.saveConsolidatedDataToFirebase(consolidatedData);
      }

      return { success: true, count: consolidatedData.length };
    } catch (error) {

      throw error;
    }
  }

  // Hilfsfunktion: Wochenwert aus Excel-Daten extrahieren im YY/WW Format
  private static extractWeekValue(row: GenericDataObject, weekNum: number, year: number): number | null {
    const yy = String(year).slice(-2);
    const ww = String(weekNum).padStart(2, '0');
    const weekKey = `${yy}/${ww}`;
    // ✅ KORRIGIERT: Zugriff auf row.values[weekKey] statt row[weekKey]
    const value = row.values?.[weekKey];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  // Normalisierte Auslastungsdaten abrufen
  static async getUtilizationData(
    filters?: {
      person?: string;
      week?: string;
      isHistorical?: boolean;
      year?: number;
    }
  ) {
    try {
      await this.waitForTokenProvider();
      const queryParams = new URLSearchParams();
      if (filters?.person) queryParams.append('person', filters.person);
      if (filters?.isHistorical !== undefined) queryParams.append('isHistorical', filters.isHistorical.toString());
      if (filters?.year) queryParams.append('year', filters.year.toString());
      
      const endpoint = `/utilization-data${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const result = await ApiService.get(endpoint);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Konsolidierte Daten in Firebase utilizationData Collection speichern
  static async saveConsolidatedDataToFirebase(consolidatedData: GenericDataArray) {
    try {

      const result = await ApiService.post('/utilization-data/bulk', { data: consolidatedData });
      
      return result;
    } catch (error) {
      
      throw error;
    }
  }

  // Neue Funktion: Konsolidierung mit Daten aus der Datenbank
  static async consolidateFromDatabase() {
    try {
      // Lade beide Datentypen aus der Datenbank
      const auslastungData = await this.getAuslastung();
      const einsatzplanData = await this.getEinsatzplan();
      
      // Zeige Struktur der ersten Datensätze
      if (auslastungData?.length > 0) {
        const firstAuslastung = auslastungData[0];
        const firstAuslastungValues = firstAuslastung.values || {};
        const firstAuslastungWeekKeys = Object.keys(firstAuslastungValues).filter(key => /^\d{2}\/\d{2}$/.test(key));
        
        if (firstAuslastungWeekKeys.length > 0) {
          const sampleWeek = firstAuslastungWeekKeys[0];
          const sampleValue = firstAuslastungValues[sampleWeek];
        }
      }
      if (einsatzplanData?.length > 0) {
        const firstEinsatzplan = einsatzplanData[0];
        const firstEinsatzplanValues = firstEinsatzplan.values || {};
        const firstEinsatzplanWeekKeys = Object.keys(firstEinsatzplanValues).filter(key => /^\d{2}\/\d{2}$/.test(key));
        
        if (firstEinsatzplanWeekKeys.length > 0) {
          const sampleWeek = firstEinsatzplanWeekKeys[0];
          const sampleValue = firstEinsatzplanValues[sampleWeek];
        }
      }

      // Prüfe Datenverfügbarkeit
      const hasAuslastung = auslastungData && auslastungData.length > 0;
      const hasEinsatzplan = einsatzplanData && einsatzplanData.length > 0;

      if (!hasAuslastung && !hasEinsatzplan) {
        throw new Error('Keine Daten in der Datenbank verfügbar');
      }

      // Erstelle Status-Informationen für den Benutzer
      const statusInfo = {
        hasAuslastung,
        hasEinsatzplan,
        message: '',
        canConsolidate: hasAuslastung && hasEinsatzplan
      };

      if (hasAuslastung && !hasEinsatzplan) {
        statusInfo.message = '⚠️ Nur Auslastungsdaten verfügbar - Planungsdaten fehlen';
      } else if (!hasAuslastung && hasEinsatzplan) {
        statusInfo.message = '⚠️ Nur Planungsdaten verfügbar - Auslastungsdaten fehlen';
      } else {
        statusInfo.message = '✅ Vollständige Daten verfügbar - Konsolidierung läuft';
      }

      // Wenn beide Datentypen vorhanden sind, führe vollständige Konsolidierung durch
      if (statusInfo.canConsolidate) {
        const currentYear = new Date().getFullYear();
        const currentWeek = Math.ceil((new Date().getTime() - new Date(currentYear, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        const forecastStartWeek = currentWeek;
        const lookbackWeeks = 8;
        const forecastWeeks = 4;

        const result = await this.consolidateAndSaveUtilizationData(
          auslastungData,
          einsatzplanData,
          currentYear,
          forecastStartWeek,
          lookbackWeeks,
          forecastWeeks
        );

        return { ...statusInfo, result, success: true };
      } else {
        // Teilweise Konsolidierung mit verfügbaren Daten
        const availableData = hasAuslastung ? auslastungData : einsatzplanData;
        const dataType = hasAuslastung ? 'auslastung' : 'einsatzplan';
        
        // Erstelle Platzhalter-Struktur für fehlende Daten
        const partialConsolidated = this.createPartialConsolidation(availableData, dataType);
        
        // Speichere teilweise konsolidierte Daten
        await this.saveConsolidatedDataToFirebase(partialConsolidated);
        
        return { ...statusInfo, result: { count: partialConsolidated.length }, success: true };
      }

    } catch (error) {
      throw error;
    }
  }

  // Hilfsfunktion: Teilweise Konsolidierung mit verfügbaren Daten
  private static createPartialConsolidation(data: GenericDataArray, dataType: 'auslastung' | 'einsatzplan') {
    const consolidated: GenericDataArray = [];
    
    data.forEach(row => {
      // Erstelle Basis-Struktur mit verfügbaren Metadaten
      const baseEntry = {
        person: row.person,
        personId: row.personId,
        lob: row.lob,
        bereich: row.bereich,
        cc: row.cc,
        team: row.team,
        lbs: row.lbs,
        source: dataType,
        isPartial: true, // Markierung für teilweise Daten
        missingDataType: dataType === 'auslastung' ? 'einsatzplan' : 'auslastung'
      };

      // Füge Wochen-Daten hinzu (falls vorhanden) - im YY/WW Format oder values-Objekt
      if (row.values && typeof row.values === 'object') {
        // Neue values-Struktur
        Object.keys(row.values).forEach(key => {
          if (key.match(/^\d{2}\/\d{2}$/)) {
            const value = row.values[key];
            if (typeof value === 'number' && Number.isFinite(value)) {
              consolidated.push({
                ...baseEntry,
                week: key,
                year: new Date().getFullYear(),
                weekNumber: parseInt(key.split('/')[1]),
                auslastungValue: dataType === 'auslastung' ? value : null,
                einsatzplanValue: dataType === 'einsatzplan' ? value : null,
                finalValue: value,
                isHistorical: true,
                compositeKey: `${row.person}__${row.team || 'unknown'}__${row.cc || 'unknown'}`
              });
            }
          }
        });
      } else {
        // Flache Struktur (direkte Eigenschaften)
        Object.keys(row).forEach(key => {
          if (key.match(/^\d{2}\/\d{2}$/)) {
            const value = row[key];
            if (typeof value === 'number' && Number.isFinite(value)) {
              consolidated.push({
                ...baseEntry,
                week: key,
                year: new Date().getFullYear(),
                weekNumber: parseInt(key.split('/')[1]),
                auslastungValue: dataType === 'auslastung' ? value : null,
                einsatzplanValue: dataType === 'einsatzplan' ? value : null,
                finalValue: value,
                isHistorical: true,
                compositeKey: `${row.person}__${row.team || 'unknown'}__${row.cc || 'unknown'}`
              });
            }
          }
        });
      }
    });

    return consolidated;
  }

  // ====================================
  // EMPLOYEE SKILLS APIs
  // ====================================

  /**
   * Employee Skills für spezifischen Employee abrufen
   */
  static async getEmployeeSkills(employeeName: string): Promise<any[]> {
    
    try {
      await this.waitForTokenProvider();
      const id = encodeURIComponent(employeeName);
      const response = await ApiService.get(`/employee-skills/${id}`);
      return response || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Employee Skills speichern/ersetzen
   */
  static async saveEmployeeSkills(employeeName: string, skills: Array<{ skillId: string; skillName: string; level: number }>): Promise<any> {
    
    try {
      await this.waitForTokenProvider();
      const id = encodeURIComponent(employeeName);
      const response = await ApiService.post(`/employee-skills/${id}`, { skills });
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Einzelnes Employee Skill Level aktualisieren
   */
  static async updateEmployeeSkillLevel(employeeName: string, skillId: string, level: number): Promise<any> {
    
    try {
      await this.waitForTokenProvider();
      const id = encodeURIComponent(employeeName);
      const sid = encodeURIComponent(skillId);
      const response = await ApiService.put(`/employee-skills/${id}/${sid}`, { level });
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Employee Skill löschen
   */
  static async deleteEmployeeSkill(employeeName: string, skillId: string): Promise<any> {
    
    try {
      await this.waitForTokenProvider();
      const id = encodeURIComponent(employeeName);
      const sid = encodeURIComponent(skillId);
      const response = await ApiService.delete(`/employee-skills/${id}/${sid}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Alle Employee Skills abrufen (für Admin-Übersicht)
   */
  static async getAllEmployeeSkills(): Promise<any[]> {
    
    try {
      await this.waitForTokenProvider();
      const response = await ApiService.get('/employee-skills');
      return response || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Employee Stammdaten speichern
   */
  static async saveEmployeeStammdaten(employeeData: any[]): Promise<{ success: boolean; message: string; count: number }> {
    
    try {
      await this.waitForTokenProvider();
      const response = await ApiService.post('/employees/bulk', { employees: employeeData });
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Employee Stammdaten laden
   */
  static async getEmployeeStammdaten(): Promise<any[]> {
    
    try {
      await this.waitForTokenProvider();
      const response = await ApiService.get('/employees');
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default DatabaseService;
