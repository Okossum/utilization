import { GenericDataArray, GenericDataObject } from '../types/database';

// Knowledge-Datenbank-Service für Mitarbeiter Knowledge und Branchen Know-How
class KnowledgeService {
  private static API_BASE_URL = 'http://localhost:3001/api';

  private static authTokenProvider: (() => Promise<string | null>) | null = null;

  static setAuthTokenProvider(provider: () => Promise<string | null>) {
    this.authTokenProvider = provider;
  }

  private static async request(endpoint: string, options: RequestInit = {}) {
    try {
      if (!this.authTokenProvider) {
        throw new Error('Token Provider nicht verfügbar - bitte warten Sie auf die Anmeldung');
      }
      
      const token = await this.authTokenProvider();
      if (!token) {
        throw new Error('Kein gültiger Token verfügbar - bitte melden Sie sich erneut an');
      }
      
      const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentifizierung fehlgeschlagen - bitte melden Sie sich erneut an');
        }
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  }

  private static async post(endpoint: string, data: GenericDataObject) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  private static async get(endpoint: string) {
    return this.request(endpoint, {
      method: 'GET',
    });
  }

  private static async put(endpoint: string, data?: GenericDataObject) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  private static async delete(endpoint: string) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // ===== MITARBEITER KNOWLEDGE =====

  // Mitarbeiter Knowledge speichern
  static async saveMitarbeiterKnowledge(fileName: string, data: GenericDataArray) {
    try {
      const result = await this.post('/knowledge/mitarbeiter', { fileName, data });
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Alle Mitarbeiter Knowledge abrufen
  static async getMitarbeiterKnowledge() {
    try {
      const result = await this.get('/knowledge/mitarbeiter');
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Mitarbeiter Knowledge nach Kategorie filtern
  static async getMitarbeiterKnowledgeByCategory(category: string) {
    try {
      const result = await this.get(`/knowledge/mitarbeiter/category/${encodeURIComponent(category)}`);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Mitarbeiter Knowledge aktualisieren
  static async updateMitarbeiterKnowledge(id: string, data: GenericDataObject) {
    try {
      const result = await this.put(`/knowledge/mitarbeiter/${id}`, data);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Mitarbeiter Knowledge löschen
  static async deleteMitarbeiterKnowledge(id: string) {
    try {
      const result = await this.delete(`/knowledge/mitarbeiter/${id}`);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // ===== BRANCHEN KNOW-HOW =====

  // Branchen Know-How speichern
  static async saveBranchenKnowHow(fileName: string, data: GenericDataArray) {
    try {
      const result = await this.post('/knowledge/branchen', { fileName, data });
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Alle Branchen Know-How abrufen
  static async getBranchenKnowHow() {
    try {
      const result = await this.get('/knowledge/branchen');
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Branchen Know-How nach Kategorie filtern
  static async getBranchenKnowHowByCategory(category: string) {
    try {
      const result = await this.get(`/knowledge/branchen/category/${encodeURIComponent(category)}`);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Branchen Know-How aktualisieren
  static async updateBranchenKnowHow(id: string, data: GenericDataObject) {
    try {
      const result = await this.put(`/knowledge/branchen/${id}`, data);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Branchen Know-How löschen
  static async deleteBranchenKnowHow(id: string) {
    try {
      const result = await this.delete(`/knowledge/branchen/${id}`);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // ===== ALLGEMEINE KNOWLEDGE-FUNKTIONEN =====

  // Alle Knowledge-Daten abrufen (beide Typen)
  static async getAllKnowledge() {
    try {
      const [mitarbeiter, branchen] = await Promise.all([
        this.getMitarbeiterKnowledge(),
        this.getBranchenKnowHow()
      ]);
      
      const result = {
        mitarbeiter: mitarbeiter || [],
        branchen: branchen || []
      };
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Knowledge nach Suchbegriff durchsuchen
  static async searchKnowledge(query: string, type?: 'mitarbeiter' | 'branchen') {
    try {
      const endpoint = type 
        ? `/knowledge/${type}/search?q=${encodeURIComponent(query)}`
        : `/knowledge/search?q=${encodeURIComponent(query)}`;
      
      const result = await this.get(endpoint);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Knowledge-Statistiken abrufen
  static async getKnowledgeStats() {
    try {
      const result = await this.get('/knowledge/stats');
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Knowledge-Export (CSV/JSON)
  static async exportKnowledge(format: 'csv' | 'json', type?: 'mitarbeiter' | 'branchen') {
    try {
      const endpoint = type 
        ? `/knowledge/${type}/export?format=${format}`
        : `/knowledge/export?format=${format}`;
      
      const result = await this.get(endpoint);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

export default KnowledgeService;
