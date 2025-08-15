import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import admin from 'firebase-admin';

const app = express();

// Initialize Firebase Admin (Application Default Credentials)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Helper to extract week values from a row into a flat map
function buildWeekValuesMap(row) {
  const map = {};
  for (const [key, value] of Object.entries(row)) {
    if (
      key !== 'person' &&
      key !== 'lob' &&
      key !== 'bereich' &&
      key !== 'cc' &&
      key !== 'team' &&
      typeof value === 'number' && Number.isFinite(value)
    ) {
      map[key] = value;
    }
  }
  return map;
}

// Auslastung-Daten speichern oder aktualisieren (Firestore)
app.post('/api/auslastung', async (req, res) => {
  try {
    const { fileName, data } = req.body;
    
    if (!fileName || !data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Ungültige Daten' });
    }

    // Upload-Historie speichern
    const historyRef = await db.collection('uploadHistory').add({
      fileName,
      fileType: 'auslastung',
      status: 'success',
      rowCount: data.length,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Bestehende Daten als "nicht mehr aktuell" markieren
    const latestSnap = await db.collection('auslastung').where('isLatest', '==', true).get();
    if (!latestSnap.empty) {
      const batch = db.batch();
      latestSnap.forEach(doc => batch.update(doc.ref, { isLatest: false }));
      await batch.commit();
    }

    // Neue Versionsnummer ermitteln
    const maxVerSnap = await db.collection('auslastung').orderBy('uploadVersion', 'desc').limit(1).get();
    const newVersion = maxVerSnap.empty ? 1 : ((maxVerSnap.docs[0].data().uploadVersion || 0) + 1);

    const results = [];

    // Alle Auslastung-Daten speichern (neue Versionen als eigene Docs)
    for (const row of data) {
      if (!row.person) continue;
      const docRef = await db.collection('auslastung').add({
        fileName,
        uploadDate: FieldValue.serverTimestamp(),
        uploadVersion: newVersion,
        person: row.person,
        lob: row.lob ?? null,
        bereich: row.bereich ?? null,
        cc: row.cc ?? null,
        team: row.team ?? null,
        values: buildWeekValuesMap(row),
        isLatest: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      results.push({ action: 'created', person: row.person, id: docRef.id });
    }

    res.json({ 
      success: true, 
      historyId: historyRef.id, 
      version: newVersion,
      results,
      message: `${results.length} Personen verarbeitet`
    });

  } catch (error) {
    console.error('Fehler beim Speichern der Auslastung:', error);
    res.status(500).json({ error: 'Interner Server-Fehler', details: error.message });
  }
});

// Einsatzplan-Daten speichern oder aktualisieren (Firestore)
app.post('/api/einsatzplan', async (req, res) => {
  try {
    const { fileName, data } = req.body;
    
    if (!fileName || !data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Ungültige Daten' });
    }

    // Upload-Historie speichern
    const historyRef = await db.collection('uploadHistory').add({
      fileName,
      fileType: 'einsatzplan',
      status: 'success',
      rowCount: data.length,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Bestehende Daten als "nicht mehr aktuell" markieren
    const latestSnap = await db.collection('einsatzplan').where('isLatest', '==', true).get();
    if (!latestSnap.empty) {
      const batch = db.batch();
      latestSnap.forEach(doc => batch.update(doc.ref, { isLatest: false }));
      await batch.commit();
    }

    // Neue Versionsnummer ermitteln
    const maxVerSnap = await db.collection('einsatzplan').orderBy('uploadVersion', 'desc').limit(1).get();
    const newVersion = maxVerSnap.empty ? 1 : ((maxVerSnap.docs[0].data().uploadVersion || 0) + 1);

    const results = [];

    // Alle Einsatzplan-Daten speichern (neue Versionen als eigene Docs)
    for (const row of data) {
      if (!row.person) continue;
      const values = {};
      for (const [key, value] of Object.entries(row)) {
        if (key !== 'person' && key !== 'lbs' && typeof value === 'number' && Number.isFinite(value)) {
          values[key] = value;
        }
      }
      const docRef = await db.collection('einsatzplan').add({
        fileName,
        uploadDate: FieldValue.serverTimestamp(),
        uploadVersion: newVersion,
        person: row.person,
        lbs: row.lbs ?? null,
        vg: row.vg ?? null,
        cc: row.cc ?? null,
        team: row.team ?? null,
        bu: row.bu ?? null,
        values,
        isLatest: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      results.push({ action: 'created', person: row.person, id: docRef.id });
    }

    res.json({ 
      success: true, 
      historyId: historyRef.id, 
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
    const snap = await db.collection('auslastung').where('isLatest', '==', true).get();
    const out = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(a.person || '').localeCompare(String(b.person || ''), 'de'));
    res.json(out);
  } catch (error) {
    console.error('Fehler beim Abrufen der Auslastung:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Alle Einsatzplan-Daten abrufen (nur neueste Version)
app.get('/api/einsatzplan', async (req, res) => {
  try {
    const snap = await db.collection('einsatzplan').where('isLatest', '==', true).get();
    const out = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(a.person || '').localeCompare(String(b.person || ''), 'de'));
    res.json(out);
  } catch (error) {
    console.error('Fehler beim Abrufen des Einsatzplans:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Upload-Historie abrufen
app.get('/api/upload-history', async (req, res) => {
  try {
    const snap = await db.collection('uploadHistory').orderBy('createdAt', 'desc').get();
    const out = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(out);
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
    const latestUtilSnap = await db.collection('utilizationData').where('isLatest', '==', true).get();
    if (!latestUtilSnap.empty) {
      const batch = db.batch();
      latestUtilSnap.forEach(doc => batch.update(doc.ref, { isLatest: false }));
      await batch.commit();
    }

    // Neue Daten speichern
    const savedCount = [];
    for (const row of consolidatedData) {
      const docId = `${row.person}__${row.week}`;
      await db.collection('utilizationData').doc(docId).set({
        ...row,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      savedCount.push(docId);
    }

    res.json({
      success: true,
      message: `${savedCount.length} Datenzeilen konsolidiert und gespeichert`,
      count: savedCount.length
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
    
    let queryRef = db.collection('utilizationData').where('isLatest', '==', true);
    if (typeof isHistorical !== 'undefined') {
      queryRef = queryRef.where('isHistorical', '==', isHistorical === 'true');
    }
    if (person) {
      queryRef = queryRef.where('person', '==', String(person));
    }
    // Firestore cannot order by multiple fields without composite indexes; keep simple
    const snap = await queryRef.get();
    const out = snap.docs
      .map(d => d.data())
      .sort((a, b) => {
        if (a.person !== b.person) return String(a.person).localeCompare(String(b.person));
        if (a.year !== b.year) return (a.year || 0) - (b.year || 0);
        return (a.weekNumber || 0) - (b.weekNumber || 0);
      });
    res.json(out);
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

// Employee Dossier speichern oder aktualisieren
app.post('/api/employee-dossier', async (req, res) => {
  try {
    const { employeeId, dossierData } = req.body;
    
    if (!employeeId || !dossierData) {
      return res.status(400).json({ error: 'Ungültige Daten' });
    }

    const docRef = db.collection('employeeDossiers').doc(String(employeeId));
    const snap = await docRef.get();
    const payload = {
      employeeId,
      name: dossierData.name,
      email: dossierData.email || '',
      phone: dossierData.phone || '',
      strengths: dossierData.strengths || '',
      weaknesses: dossierData.weaknesses || '',
      comments: dossierData.comments || '',
      travelReadiness: dossierData.travelReadiness || '',
      projectHistory: dossierData.projectHistory || [],
      projectOffers: dossierData.projectOffers || [],
      jiraTickets: dossierData.jiraTickets || [],
      skills: dossierData.skills || [],
      excelData: dossierData.excelData || {},
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: snap.exists ? snap.data().createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
    };
    await docRef.set(payload, { merge: true });
    const updated = await docRef.get();
    res.json({ success: true, message: snap.exists ? 'Employee Dossier aktualisiert' : 'Employee Dossier erstellt', data: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error('Fehler beim Speichern des Employee Dossiers:', error);
    res.status(500).json({ error: 'Interner Server-Fehler', details: error.message });
  }
});

// Employee Dossier abrufen
app.get('/api/employee-dossier/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const snap = await db.collection('employeeDossiers').doc(String(employeeId)).get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'Employee Dossier nicht gefunden' });
    }
    
    res.json({ id: snap.id, ...snap.data() });
  } catch (error) {
    console.error('Fehler beim Abrufen des Employee Dossiers:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Alle Employee Dossiers abrufen
app.get('/api/employee-dossiers', async (req, res) => {
  try {
    const snap = await db.collection('employeeDossiers').get();
    const out = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de'));
    res.json(out);
  } catch (error) {
    console.error('Fehler beim Abrufen aller Employee Dossiers:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`🚀 Backend-Server läuft auf Port ${PORT}`);
  console.log(`📊 API verfügbar unter http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Server wird heruntergefahren...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Server wird heruntergefahren...');
  process.exit(0);
});
