// Prisma Client kann nicht im Browser laufen
// Diese Funktionen werden nur im Backend/Node.js verwendet
// Für den Browser erstellen wir Mock-Funktionen

// API-Basis-URL für Backend-Server
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-domain.com/api' 
  : 'http://localhost:3001/api';

// API-Service für Backend-Kommunikation
let authTokenProvider: (() => Promise<string | null>) | null = null;

export function setAuthTokenProvider(provider: () => Promise<string | null>) {
  authTokenProvider = provider;
}

class ApiService {
  private static async request(endpoint: string, options: RequestInit = {}) {
    try {
      const token = authTokenProvider ? await authTokenProvider() : null;
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  static async post(endpoint: string, data: any) {
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

  static async put(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Datenbank-Service für lokale SQLite-Datenbank
export class DatabaseService {
  // Aktuelles User-Profil abrufen
  static async getMe() {
    try {
      return await ApiService.get('/me');
    } catch (error) {
      console.error('Fehler beim Abrufen des User-Profils:', error);
      throw error;
    }
  }

  static async updateMe(data: any) {
    try {
      return await ApiService.put('/me', data);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des User-Profils:', error);
      throw error;
    }
  }

  // Admin: Nutzerliste
  static async getUsers() {
    return ApiService.get('/users');
  }

  // Admin: Nutzer aktualisieren
  static async updateUser(uid: string, data: any) {
    return ApiService.put(`/users/${uid}`, data);
  }
  
  // Auslastung-Daten speichern oder aktualisieren
  static async saveAuslastung(fileName: string, data: any[]) {
    try {
      const result = await ApiService.post('/auslastung', { fileName, data });
      return result;
    } catch (error) {
      console.error('Fehler beim Speichern der Auslastung:', error);
      throw error;
    }
  }

  // Einsatzplan-Daten speichern oder aktualisieren
  static async saveEinsatzplan(fileName: string, data: any[]) {
    try {
      const result = await ApiService.post('/einsatzplan', { fileName, data });
      return result;
    } catch (error) {
      console.error('Fehler beim Speichern des Einsatzplans:', error);
      throw error;
    }
  }

  // Alle Auslastung-Daten abrufen (nur neueste Version)
  static async getAuslastung() {
    try {
      return await ApiService.get('/auslastung');
    } catch (error) {
      console.error('Fehler beim Abrufen der Auslastung:', error);
      throw error;
    }
  }

  // Alle Einsatzplan-Daten abrufen (nur neueste Version)
  static async getEinsatzplan() {
    try {
      return await ApiService.get('/einsatzplan');
    } catch (error) {
      console.error('Fehler beim Abrufen des Einsatzplans:', error);
      throw error;
    }
  }

  // Upload-Historie abrufen
  static async getUploadHistory() {
    try {
      return await ApiService.get('/upload-history');
    } catch (error) {
      console.error('Fehler beim Abrufen der Upload-Historie:', error);
      throw error;
    }
  }

  // Employee Dossier speichern oder aktualisieren
  static async saveEmployeeDossier(employeeId: string, dossierData: any) {
    try {
      const result = await ApiService.post('/employee-dossier', { employeeId, dossierData });
      return result;
    } catch (error) {
      console.error('Fehler beim Speichern des Employee Dossiers:', error);
      throw error;
    }
  }

  // Employee Dossier abrufen
  static async getEmployeeDossier(employeeId: string) {
    try {
      return await ApiService.get(`/employee-dossier/${employeeId}`);
    } catch (error) {
      console.error('Fehler beim Abrufen des Employee Dossiers:', error);
      return null;
    }
  }

  // Alle Employee Dossiers abrufen
  static async getAllEmployeeDossiers() {
    try {
      return await ApiService.get('/employee-dossiers');
    } catch (error) {
      console.error('Fehler beim Abrufen aller Employee Dossiers:', error);
      return [];
    }
  }

  // Datenbank schließen (nicht mehr benötigt mit API)
  static async disconnect() {
    // API-basierte Implementierung benötigt keine explizite Verbindungsschließung
  }

  // Normalisierte Auslastungsdaten konsolidieren und speichern
  static async consolidateAndSaveUtilizationData(
    auslastungData: any[],
    einsatzplanData: any[],
    currentYear: number,
    forecastStartWeek: number,
    lookbackWeeks: number,
    forecastWeeks: number
  ) {
    try {
      const consolidatedData: any[] = [];
      
      // Alle Personen sammeln
      const allPersons = new Set([
        ...auslastungData.map(row => row.person).filter(Boolean),
        ...einsatzplanData.map(row => row.person).filter(Boolean)
      ]);

      for (const person of allPersons) {
        const ausRow = auslastungData.find(row => row.person === person);
        const einRow = einsatzplanData.find(row => row.person === row.person);

        // Historische Wochen (links von aktueller Woche)
        for (let i = 0; i < lookbackWeeks; i++) {
          const weekNum = forecastStartWeek - lookbackWeeks + i;
          const weekKey = `KW ${weekNum}-${currentYear}`;
          const uiLabel = `${currentYear}-KW${weekNum}`;
          
          const ausValue = ausRow ? this.extractWeekValue(ausRow, weekNum, currentYear) : null;
          const einValue = einRow ? this.extractWeekValue(einRow, weekNum, currentYear) : null;
          
          const finalValue = ausValue !== undefined ? ausValue : einValue;
          
          if (finalValue !== undefined) {
            consolidatedData.push({
              person,
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
              lbs: einRow?.lbs
            });
          }
        }

        // Forecast-Wochen (rechts von aktueller Woche)
        for (let i = 0; i < forecastWeeks; i++) {
          const weekNum = forecastStartWeek + i;
          const weekKey = `KW ${weekNum}-${currentYear}`;
          const uiLabel = `${currentYear}-KW${weekNum}`;
          
          const ausValue = ausRow ? this.extractWeekValue(ausRow, weekNum, currentYear) : null;
          const einValue = einRow ? this.extractWeekValue(einRow, weekNum, currentYear) : null;
          
          const finalValue = ausValue !== undefined ? ausValue : einValue;
          
          if (finalValue !== undefined) {
            consolidatedData.push({
              person,
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
              lbs: einRow?.lbs
            });
          }
        }
      }

      // Alle konsolidierten Daten werden über die API gespeichert
      // Die eigentliche Speicherung erfolgt im Backend

      return { success: true, count: consolidatedData.length };
    } catch (error) {
      console.error('Fehler beim Konsolidieren der Daten:', error);
      throw error;
    }
  }

  // Hilfsfunktion: Wochenwert aus Excel-Daten extrahieren
  private static extractWeekValue(row: any, weekNum: number, year: number): number | null {
    const weekKey = `KW ${weekNum}-${year}`;
    const value = row[weekKey];
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
      const queryParams = new URLSearchParams();
      if (filters?.person) queryParams.append('person', filters.person);
      if (filters?.isHistorical !== undefined) queryParams.append('isHistorical', filters.isHistorical.toString());
      if (filters?.year) queryParams.append('year', filters.year.toString());
      
      const endpoint = `/utilization-data${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      return await ApiService.get(endpoint);
    } catch (error) {
      console.error('Fehler beim Abrufen der normalisierten Daten:', error);
      throw error;
    }
  }

  // Konsolidierte Daten in Firebase utilizationData Collection speichern
  static async saveConsolidatedDataToFirebase(consolidatedData: any[]) {
    try {
      console.log('Speichere konsolidierte Daten in Firebase:', consolidatedData.length, 'Datensätze');
      const result = await ApiService.post('/utilization-data/bulk', { data: consolidatedData });
      console.log('Daten erfolgreich in Firebase gespeichert:', result);
      return result;
    } catch (error) {
      console.error('Fehler beim Speichern der konsolidierten Daten in Firebase:', error);
      throw error;
    }
  }
}

export default DatabaseService;
