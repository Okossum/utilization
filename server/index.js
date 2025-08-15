import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { PrismaClient } from '../generated/prisma/index.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Auslastung-Daten speichern oder aktualisieren
app.post('/api/auslastung', async (req, res) => {
  try {
    const { fileName, data } = req.body;
    
    if (!fileName || !data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Ungültige Daten' });
    }

    // Upload-Historie speichern
    const history = await prisma.uploadHistory.create({
      data: {
        fileName,
        fileType: 'auslastung',
        status: 'success',
        rowCount: data.length
      }
    });

    // Bestehende Daten als "nicht mehr aktuell" markieren
    await prisma.auslastung.updateMany({
      where: { isLatest: true },
      data: { isLatest: false }
    });

    // Neue Versionsnummer ermitteln
    const maxVersion = await prisma.auslastung.aggregate({
      _max: { uploadVersion: true }
    });
    const newVersion = (maxVersion._max.uploadVersion || 0) + 1;

    const results = [];

    // Alle Auslastung-Daten speichern oder aktualisieren
    for (const row of data) {
      if (!row.person) continue;

      // Prüfe ob Person bereits existiert
      const existingPerson = await prisma.auslastung.findFirst({
        where: { 
          person: row.person,
          isLatest: false
        },
        orderBy: { uploadVersion: 'desc' }
      });

      if (existingPerson) {
        // Aktualisiere bestehende Person
        const updated = await prisma.auslastung.update({
          where: { id: existingPerson.id },
          data: { 
            fileName,
            uploadVersion: newVersion,
            isLatest: true,
            lob: row.lob,
            bereich: row.bereich,
            cc: row.cc,
            team: row.team,
            updatedAt: new Date()
          }
        });

        // Aktualisiere Wochenwerte
        await prisma.weekValue.deleteMany({
          where: { auslastungId: existingPerson.id }
        });

        const weekValues = Object.entries(row)
          .filter(([key, value]) => 
            key !== 'person' && 
            key !== 'lob' && 
            key !== 'bereich' && 
            key !== 'cc' && 
            key !== 'team' &&
            typeof value === 'number'
          )
          .map(([week, value]) => ({
            auslastungId: existingPerson.id,
            week,
            value: value
          }));

        if (weekValues.length > 0) {
          await prisma.weekValue.createMany({
            data: weekValues
          });
        }

        results.push({ action: 'updated', person: row.person, id: updated.id });
      } else {
        // Erstelle neue Person
        const auslastung = await prisma.auslastung.create({
          data: {
            fileName,
            uploadVersion: newVersion,
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
                  value: value
                }))
            }
          }
        });

        results.push({ action: 'created', person: row.person, id: auslastung.id });
      }
    }

    res.json({ 
      success: true, 
      historyId: history.id, 
      version: newVersion,
      results,
      message: `${results.length} Personen verarbeitet`
    });

  } catch (error) {
    console.error('Fehler beim Speichern der Auslastung:', error);
    res.status(500).json({ error: 'Interner Server-Fehler', details: error.message });
  }
});

// Einsatzplan-Daten speichern oder aktualisieren
app.post('/api/einsatzplan', async (req, res) => {
  try {
    const { fileName, data } = req.body;
    
    if (!fileName || !data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Ungültige Daten' });
    }

    // Upload-Historie speichern
    const history = await prisma.uploadHistory.create({
      data: {
        fileName,
        fileType: 'einsatzplan',
        status: 'success',
        rowCount: data.length
      }
    });

    // Bestehende Daten als "nicht mehr aktuell" markieren
    await prisma.einsatzplan.updateMany({
      where: { isLatest: true },
      data: { isLatest: false }
    });

    // Neue Versionsnummer ermitteln
    const maxVersion = await prisma.einsatzplan.aggregate({
      _max: { uploadVersion: true }
    });
    const newVersion = (maxVersion._max.uploadVersion || 0) + 1;

    const results = [];

    // Alle Einsatzplan-Daten speichern oder aktualisieren
    for (const row of data) {
      if (!row.person) continue;

      // Prüfe ob Person bereits existiert
      const existingPerson = await prisma.einsatzplan.findFirst({
        where: { 
          person: row.person,
          isLatest: false
        },
        orderBy: { uploadVersion: 'desc' }
      });

      if (existingPerson) {
        // Aktualisiere bestehende Person
        const updated = await prisma.einsatzplan.update({
          where: { id: existingPerson.id },
          data: { 
            fileName,
            uploadVersion: newVersion,
            isLatest: true,
            lbs: row.lbs,
            updatedAt: new Date()
          }
        });

        // Aktualisiere Wochenwerte
        await prisma.einsatzplanWeekValue.deleteMany({
          where: { einsatzplanId: existingPerson.id }
        });

        const weekValues = Object.entries(row)
          .filter(([key, value]) => 
            key !== 'person' && 
            key !== 'lbs' &&
            typeof value === 'number'
          )
                        .map(([week, value]) => ({
                einsatzplanId: existingPerson.id,
                week,
                value: value
              }));

        if (weekValues.length > 0) {
          await prisma.einsatzplanWeekValue.createMany({
            data: weekValues
          });
        }

        results.push({ action: 'updated', person: row.person, id: updated.id });
      } else {
        // Erstelle neue Person
        const einsatzplan = await prisma.einsatzplan.create({
          data: {
            fileName,
            uploadVersion: newVersion,
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
                  value: value
                }))
            }
          }
        });

        results.push({ action: 'created', person: row.person, id: einsatzplan.id });
      }
    }

    res.json({ 
      success: true, 
      historyId: history.id, 
      version: newVersion,
      results,
      message: `${results.length} Personen verarbeitet`
    });

  } catch (error) {
    console.error('Fehler beim Speichern des Einsatzplans:', error);
    res.status(500).json({ error: 'Interner Server-Fehler', details: error.message });
  }
});

// Alle Auslastung-Daten abrufen (nur neueste Version)
app.get('/api/auslastung', async (req, res) => {
  try {
    const auslastung = await prisma.auslastung.findMany({
      where: { isLatest: true },
      include: {
        weekValues: true
      },
      orderBy: {
        person: 'asc'
      }
    });

    res.json(auslastung);
  } catch (error) {
    console.error('Fehler beim Abrufen der Auslastung:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Alle Einsatzplan-Daten abrufen (nur neueste Version)
app.get('/api/einsatzplan', async (req, res) => {
  try {
    const einsatzplan = await prisma.einsatzplan.findMany({
      where: { isLatest: true },
      include: {
        weekValues: true
      },
      orderBy: {
        person: 'asc'
      }
    });

    res.json(einsatzplan);
  } catch (error) {
    console.error('Fehler beim Abrufen des Einsatzplans:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Upload-Historie abrufen
app.get('/api/upload-history', async (req, res) => {
  try {
    const history = await prisma.uploadHistory.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(history);
  } catch (error) {
    console.error('Fehler beim Abrufen der Upload-Historie:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Normalisierte Auslastungsdaten konsolidieren und speichern
app.post('/api/consolidate', async (req, res) => {
  try {
    const { auslastungData, einsatzplanData, currentYear, forecastStartWeek, lookbackWeeks, forecastWeeks } = req.body;
    
    if (!auslastungData || !einsatzplanData) {
      return res.status(400).json({ error: 'Auslastung und Einsatzplan Daten erforderlich' });
    }

    const consolidatedData = [];
    
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
        const weekKey = `KW ${weekNum}-${currentYear}`;
        const uiLabel = `${currentYear}-KW${weekNum}`;
        
        const ausValue = ausRow ? extractWeekValue(ausRow, weekNum, currentYear) : null;
        const einValue = einRow ? extractWeekValue(einRow, weekNum, currentYear) : null;
        
        const finalValue = ausValue !== undefined ? ausValue : einValue;
        
        if (finalValue !== undefined) {
          consolidatedData.push({
            person,
            lob: ausRow?.lob,
            bereich: ausRow?.bereich,
            cc: ausRow?.cc,
            team: ausRow?.team,
            lbs: einRow?.lbs,
            week: uiLabel,
            year: currentYear,
            weekNumber: weekNum,
            auslastungValue: ausValue,
            einsatzplanValue: einValue,
            finalValue,
            isHistorical: true,
            source: ausValue !== undefined && einValue !== undefined ? 'both' : (ausValue !== undefined ? 'auslastung' : 'einsatzplan'),
            isLatest: true
          });
        }
      }

      // Forecast-Wochen (rechts von aktueller Woche)
      for (let i = 0; i < forecastWeeks; i++) {
        const weekNum = forecastStartWeek + i;
        const weekKey = `KW ${weekNum}-${currentYear}`;
        const uiLabel = `${currentYear}-KW${weekNum}`;
        
        const ausValue = ausRow ? extractWeekValue(ausRow, weekNum, currentYear) : null;
        const einValue = einRow ? extractWeekValue(einRow, weekNum, currentYear) : null;
        
        const finalValue = ausValue !== undefined ? ausValue : einValue;
        
        if (finalValue !== undefined) {
          consolidatedData.push({
            person,
            lob: ausRow?.lob,
            bereich: ausRow?.bereich,
            cc: ausRow?.cc,
            team: ausRow?.team,
            lbs: einRow?.lbs,
            week: uiLabel,
            year: currentYear,
            weekNumber: weekNum,
            auslastungValue: ausValue,
            einsatzplanValue: einValue,
            finalValue,
            isHistorical: false,
            source: ausValue !== undefined && einValue !== undefined ? 'both' : (ausValue !== undefined ? 'auslastung' : 'einsatzplan'),
            isLatest: true
          });
        }
      }
    }

    // Bestehende Daten als "nicht mehr aktuell" markieren
    await prisma.utilizationData.updateMany({
      where: { isLatest: true },
      data: { isLatest: false }
    });

    // Neue Daten speichern
    const savedData = [];
    for (const data of consolidatedData) {
      const saved = await prisma.utilizationData.upsert({
        where: { person_week: { person: data.person, week: data.week } },
        update: { ...data, updatedAt: new Date() },
        create: data
      });
      savedData.push(saved);
    }

    res.json({
      success: true,
      message: `${savedData.length} Datenzeilen konsolidiert und gespeichert`,
      count: savedData.length
    });

  } catch (error) {
    console.error('Fehler beim Konsolidieren der Daten:', error);
    res.status(500).json({ error: 'Interner Server-Fehler', details: error.message });
  }
});

// Normalisierte Daten abrufen
app.get('/api/utilization-data', async (req, res) => {
  try {
    const { isHistorical, person } = req.query;
    
    const where = { isLatest: true };
    if (isHistorical !== undefined) {
      where.isHistorical = isHistorical === 'true';
    }
    if (person) {
      where.person = person;
    }

    const data = await prisma.utilizationData.findMany({
      where,
      orderBy: [
        { person: 'asc' },
        { year: 'asc' },
        { weekNumber: 'asc' }
      ]
    });

    res.json(data);
  } catch (error) {
    console.error('Fehler beim Abrufen der normalisierten Daten:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Hilfsfunktion zum Extrahieren von Wochenwerten
function extractWeekValue(row, weekNum, year) {
  const weekKey = `KW ${weekNum}-${year}`;
  return row[weekKey] !== undefined ? row[weekKey] : null;
}

// Server starten
app.listen(PORT, () => {
  console.log(`🚀 Backend-Server läuft auf Port ${PORT}`);
  console.log(`📊 API verfügbar unter http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Server wird heruntergefahren...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Server wird heruntergefahren...');
  await prisma.$disconnect();
  process.exit(0);
});
