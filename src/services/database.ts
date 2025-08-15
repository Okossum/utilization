// Prisma Client kann nicht im Browser laufen
// Diese Funktionen werden nur im Backend/Node.js verwendet
// Für den Browser erstellen wir Mock-Funktionen

// Mock-Prisma Client für Browser-Umgebung
const mockPrisma = {
  uploadHistory: {
    create: async (data: any) => ({ id: 'mock-id', ...data.data }),
    findMany: async (options?: any) => []
  },
  auslastung: {
    create: async (data: any) => ({ id: 'mock-id', ...data.data }),
    findMany: async (options?: any) => []
  },
  einsatzplan: {
    create: async (data: any) => ({ id: 'mock-id', ...data.data }),
    findMany: async (options?: any) => []
  },
  utilizationData: {
    upsert: async (data: any) => ({ id: 'mock-id', ...data.create }),
    findMany: async (options?: any) => []
  },
  $disconnect: async () => {}
};

// Verwende Mock-Prisma im Browser
const prisma = mockPrisma;

// Datenbank-Service für lokale SQLite-Datenbank
export class DatabaseService {
  
  // Auslastung-Daten speichern
  static async saveAuslastung(fileName: string, data: any[]) {
    try {
      // Upload-Historie speichern
      const history = await prisma.uploadHistory.create({
        data: {
          fileName,
          fileType: 'auslastung',
          status: 'success',
          rowCount: data.length
        }
      });

      // Alle Auslastung-Daten speichern
      for (const row of data) {
        if (!row.person) continue;

        const auslastung = await prisma.auslastung.create({
          data: {
            fileName,
            person: row.person,
            lob: row.lob,
            bereich: row.bereich,
            cc: row.cc,
            team: row.team,
            weekValues: {
              create: Object.entries(row)
                .filter(([key, value]) => 
                  key !== 'person' && 
                  key !== 'lob' && 
                  key !== 'bereich' && 
                  key !== 'cc' && 
                  key !== 'team' &&
                  typeof value === 'number'
                )
                .map(([week, value]) => ({
                  week,
                  value: value as number
                }))
            }
          }
        });
      }

      return { success: true, historyId: history.id };
    } catch (error) {
      console.error('Fehler beim Speichern der Auslastung:', error);
      throw error;
    }
  }

  // Einsatzplan-Daten speichern
  static async saveEinsatzplan(fileName: string, data: any[]) {
    try {
      // Upload-Historie speichern
      const history = await prisma.uploadHistory.create({
        data: {
          fileName,
          fileType: 'einsatzplan',
          status: 'success',
          rowCount: data.length
        }
      });

      // Alle Einsatzplan-Daten speichern
      for (const row of data) {
        if (!row.person) continue;

        const einsatzplan = await prisma.einsatzplan.create({
          data: {
            fileName,
            person: row.person,
            lbs: row.lbs,
            weekValues: {
              create: Object.entries(row)
                .filter(([key, value]) => 
                  key !== 'person' && 
                  key !== 'lbs' &&
                  typeof value === 'number'
                )
                .map(([week, value]) => ({
                  week,
                  value: value as number
                }))
            }
          }
        });
      }

      return { success: true, historyId: history.id };
    } catch (error) {
      console.error('Fehler beim Speichern des Einsatzplans:', error);
      throw error;
    }
    }

  // Alle Auslastung-Daten abrufen
  static async getAuslastung() {
    try {
      return await prisma.auslastung.findMany({
        include: {
          weekValues: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Auslastung:', error);
      throw error;
    }
  }

  // Alle Einsatzplan-Daten abrufen
  static async getEinsatzplan() {
    try {
      return await prisma.einsatzplan.findMany({
        include: {
          weekValues: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Fehler beim Abrufen des Einsatzplans:', error);
      throw error;
    }
  }

  // Upload-Historie abrufen
  static async getUploadHistory() {
    try {
      return await prisma.uploadHistory.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Upload-Historie:', error);
      throw error;
    }
  }

  // Datenbank schließen
  static async disconnect() {
    await prisma.$disconnect();
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

      // Alle konsolidierten Daten in die Datenbank speichern
      for (const data of consolidatedData) {
        await prisma.utilizationData.upsert({
          where: {
            person_week: {
              person: data.person,
              week: data.week
            }
          },
          update: data,
          create: data
        });
      }

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
      const where: any = {};
      
      if (filters?.person) where.person = filters.person;
      if (filters?.week) where.week = filters.week;
      if (filters?.isHistorical !== undefined) where.isHistorical = filters.isHistorical;
      if (filters?.year) where.year = filters.year;

      return await prisma.utilizationData.findMany({
        where,
        orderBy: [
          { person: 'asc' },
          { year: 'asc' },
          { weekNumber: 'asc' }
        ]
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der normalisierten Daten:', error);
      throw error;
    }
  }
}

export default DatabaseService;
