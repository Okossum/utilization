import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const app = express();

// Initialize Firebase Admin using explicit service account credentials to avoid ADC issues
if (!admin.apps.length) {
  const absoluteServiceAccountPath = '/Users/oliver.koss/Projekte/Ressource Utilization/ressourceutilization-firebase-adminsdk-fbsvc-e8129f7d59.json';
  const svc = JSON.parse(fs.readFileSync(absoluteServiceAccountPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(svc) });
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Helpers for field mapping from Excel rows
function pickField(row, candidates) {
  for (const key of candidates) {
    if (row && Object.prototype.hasOwnProperty.call(row, key)) {
      const v = row[key];
      if (typeof v === 'string' && v.trim()) return String(v);
    }
  }
  return undefined;
}
function parseBuAndBereich(raw) {
  if (!raw || !String(raw).trim()) return { bu: undefined, bereich: undefined };
  const s = String(raw).trim();
  const m = s.match(/^\s*(.+?)\s*\(([^)]+)\)\s*$/);
  if (m) {
    return { bu: m[1].trim(), bereich: m[2].trim() };
  }
  return { bu: s, bereich: undefined };
}

// Optional Auth middleware: validates Firebase ID token if provided
async function authMiddleware(req, _res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring('Bearer '.length) : null;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
  } catch {
    req.user = null;
  }
  next();
}

app.use(authMiddleware);

// Require authenticated user
function requireAuth(req, res, next) {
  if (!req.user?.uid) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }
  return next();
}

// Load user profile (Firestore)
async function loadUserProfile(uid) {
  const snap = await db.collection('users').doc(uid).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

// Require admin
async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.uid) return res.status(401).json({ error: 'Nicht authentifiziert' });
    const profile = await loadUserProfile(req.user.uid);
    const isAdmin = Boolean(req.user?.admin === true || profile?.role === 'admin');
    if (!isAdmin) return res.status(403).json({ error: 'Nicht autorisiert' });
    req.profile = profile;
    return next();
  } catch (e) {
    return res.status(500).json({ error: 'Interner Server-Fehler' });
  }
}

// Apply scope filter (Team > CC > Bereich) unless user canViewAll or admin
function applyScopeFilter(rows, profile, adminClaim) {
  if (!profile) return [];
  const canViewAll = Boolean(profile.canViewAll) || Boolean(adminClaim === true) || profile.role === 'admin';
  if (canViewAll) return rows;
  const scopeTeam = profile.team || '';
  const scopeCc = profile.competenceCenter || '';
  const scopeBereich = profile.bereich || '';
  return rows.filter(r => {
    const meta = r;
    if (scopeTeam) return String(meta.team || '') === String(scopeTeam);
    if (scopeCc) return String(meta.cc || '') === String(scopeCc);
    if (scopeBereich) return String(meta.bereich || '') === String(scopeBereich);
    return true;
  });
}

// Current user profile endpoint
app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    const users = db.collection('users');
    const docRef = users.doc(uid);
    const snap = await docRef.get();
    if (!snap.exists) {
      let authUser = null;
      try {
        authUser = await admin.auth().getUser(uid);
      } catch {}
      const payload = {
        uid,
        email: authUser?.email || '',
        displayName: authUser?.displayName || '',
        role: req.user?.role || 'unknown',
        canViewAll: false,
        lob: null,
        bereich: null,
        competenceCenter: null,
        team: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await docRef.set(payload, { merge: true });
      const created = await docRef.get();
      return res.json({ id: created.id, ...created.data() });
    }
    return res.json({ id: snap.id, ...snap.data() });
  } catch (error) {
    
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Update current user profile
app.put('/api/me', requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    const { canViewAll, lob, bereich, competenceCenter, team, role } = req.body || {};
    const users = db.collection('users');
    const docRef = users.doc(uid);
    const toUpdate = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (typeof canViewAll === 'boolean') toUpdate.canViewAll = canViewAll;
    if (typeof lob !== 'undefined') toUpdate.lob = lob || null;
    if (typeof bereich !== 'undefined') toUpdate.bereich = bereich || null;
    // Backward compatibility: if legacy "businessUnit" is provided and no explicit "bereich", map it to bereich
    if (typeof req.body?.businessUnit !== 'undefined' && typeof bereich === 'undefined') {
      toUpdate.bereich = req.body.businessUnit || null;
    }
    if (typeof competenceCenter !== 'undefined') toUpdate.competenceCenter = competenceCenter || null;
    if (typeof team !== 'undefined') toUpdate.team = team || null;
    // Only allow role change if the token has an admin claim (future extension)
    if (typeof role !== 'undefined' && req.user?.admin === true) toUpdate.role = role;
    await docRef.set(toUpdate, { merge: true });
    const snap = await docRef.get();
    return res.json({ id: snap.id, ...snap.data() });
  } catch (error) {
    
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

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
app.post('/api/auslastung', requireAuth, async (req, res) => {
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

    // Lade bestehende Daten (nur die neuesten pro Person+Team+CC)
    const latestSnap = await db.collection('auslastung').where('isLatest', '==', true).get();
    const existingData = new Map();
    latestSnap.forEach(doc => {
      const data = doc.data();
      // Composite Key: Person + Team + CC für eindeutige Identifikation
      const compositeKey = `${data.person || 'unknown'}__${data.team || 'unknown'}__${data.cc || 'unknown'}`;
      existingData.set(compositeKey, { id: doc.id, data });
    });

    // Neue Versionsnummer ermitteln
    const maxVerSnap = await db.collection('auslastung').orderBy('uploadVersion', 'desc').limit(1).get();
    const newVersion = maxVerSnap.empty ? 1 : ((maxVerSnap.docs[0].data().uploadVersion || 0) + 1);

    const results = [];
    const batch = db.batch();

    // Personen-basiertes Update: Merge KW-Werte (mit Composite Key)
    for (const row of data) {
      if (!row.person) continue;
      
      const newWeekValues = buildWeekValuesMap(row);
      // Composite Key: Person + Team + CC für eindeutige Identifikation
      const compositeKey = `${row.person || 'unknown'}__${row.team || 'unknown'}__${row.cc || 'unknown'}`;
      const existing = existingData.get(compositeKey);
      
      if (existing) {
        // Update bestehende Person: Merge KW-Werte
        const mergedValues = { ...existing.data.values, ...newWeekValues };
        const docRef = db.collection('auslastung').doc(existing.id);
        
        batch.update(docRef, {
          fileName,
          uploadDate: FieldValue.serverTimestamp(),
          uploadVersion: newVersion,
          lob: row.lob ?? existing.data.lob ?? null,
          bereich: row.bereich ?? existing.data.bereich ?? null,
          cc: row.cc ?? existing.data.cc ?? null,
          team: row.team ?? existing.data.team ?? null,
          values: mergedValues,
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        results.push({ 
          action: 'updated', 
          person: row.person,
          team: row.team,
          cc: row.cc,
          compositeKey,
          id: existing.id,
          newWeeks: Object.keys(newWeekValues).length,
          totalWeeks: Object.keys(mergedValues).length
        });
      } else {
        // Neue Person: Erstelle neues Dokument
        const docRef = db.collection('auslastung').doc();
        batch.set(docRef, {
          fileName,
          uploadDate: FieldValue.serverTimestamp(),
          uploadVersion: newVersion,
          person: row.person,
          lob: row.lob ?? null,
          bereich: row.bereich ?? null,
          cc: row.cc ?? null,
          team: row.team ?? null,
          values: newWeekValues,
          isLatest: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        
                results.push({ 
          action: 'created', 
          person: row.person,
          team: row.team,
          cc: row.cc,
          compositeKey,
          id: docRef.id,
          newWeeks: Object.keys(newWeekValues).length 
        });
      }
    }

    // Alle Änderungen in einem Batch commit
    await batch.commit();

    // Statistiken für Response
    const updatedCount = results.filter(r => r.action === 'updated').length;
    const createdCount = results.filter(r => r.action === 'created').length;
    const totalNewWeeks = results.reduce((sum, r) => sum + r.newWeeks, 0);

    res.json({ 
      success: true, 
      historyId: historyRef.id, 
      version: newVersion,
      results,
      message: `${results.length} Personen verarbeitet (${updatedCount} aktualisiert, ${createdCount} neu erstellt, ${totalNewWeeks} KW-Werte hinzugefügt)`
    });

  } catch (error) {
    
    res.status(500).json({ error: 'Interner Server-Fehler', details: error.message });
  }
});

// Einsatzplan-Daten speichern oder aktualisieren (Firestore)
app.post('/api/einsatzplan', requireAuth, async (req, res) => {
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

    // Lade bestehende Daten (nur die neuesten pro Person+Team+CC)
    const latestSnap = await db.collection('einsatzplan').where('isLatest', '==', true).get();
    const existingData = new Map();
    latestSnap.forEach(doc => {
      const data = doc.data();
      // Composite Key: Person + Team + CC für eindeutige Identifikation
      const compositeKey = `${data.person || 'unknown'}__${data.team || 'unknown'}__${data.cc || 'unknown'}`;
      existingData.set(compositeKey, { id: doc.id, data });
    });

    // Neue Versionsnummer ermitteln
    const maxVerSnap = await db.collection('einsatzplan').orderBy('uploadVersion', 'desc').limit(1).get();
    const newVersion = maxVerSnap.empty ? 1 : ((maxVerSnap.docs[0].data().uploadVersion || 0) + 1);

    // Hilfsfunktion zum Aufbau der Wochen-Werte Map
    function buildWeekValuesMap(row) {
      const weekValues = {};
      for (const [key, value] of Object.entries(row)) {
        if (key !== 'person' && key !== 'lbs' && key !== 'vg' && 
            key !== 'lob' && key !== 'cc' && key !== 'team' && key !== 'bereich' &&
            typeof value === 'number' && Number.isFinite(value)) {
          weekValues[key] = value;
        }
      }
      return weekValues;
    }

    const results = [];
    const batch = db.batch();

    // Personen-basiertes Update: Merge KW-Werte (mit Composite Key)
    for (const row of data) {
      if (!row.person) continue;
      
      const newWeekValues = buildWeekValuesMap(row);
      // Composite Key: Person + Team + CC für eindeutige Identifikation
      const compositeKey = `${row.person || 'unknown'}__${row.team || 'unknown'}__${row.cc || 'unknown'}`;
      const existing = existingData.get(compositeKey);
      
      if (existing) {
        // Update bestehende Person: Merge KW-Werte
        const mergedValues = { ...existing.data.values, ...newWeekValues };
        const docRef = db.collection('einsatzplan').doc(existing.id);
        
        batch.update(docRef, {
          fileName,
          uploadDate: FieldValue.serverTimestamp(),
          uploadVersion: newVersion,
          lob: row.lob ?? existing.data.lob ?? null,
          bereich: row.bereich ?? existing.data.bereich ?? null,
          cc: row.cc ?? existing.data.cc ?? null,
          team: row.team ?? existing.data.team ?? null,
          lbs: row.lbs ?? existing.data.lbs ?? null,
          vg: row.vg ?? existing.data.vg ?? null,
          values: mergedValues,
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        results.push({ 
          action: 'updated', 
          person: row.person,
          team: row.team,
          cc: row.cc,
          compositeKey,
          id: existing.id,
          newWeeks: Object.keys(newWeekValues).length,
          totalWeeks: Object.keys(mergedValues).length
        });
      } else {
        // Neue Person: Erstelle neues Dokument
        const docRef = db.collection('einsatzplan').doc();
        batch.set(docRef, {
          fileName,
          uploadDate: FieldValue.serverTimestamp(),
          uploadVersion: newVersion,
          person: row.person,
          lbs: row.lbs ?? null,
          vg: row.vg ?? null,
          cc: row.cc ?? null,
          team: row.team ?? null,
          lob: row.lob ?? null,
          bereich: row.bereich ?? null,
          values: newWeekValues,
          isLatest: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        results.push({ 
          action: 'created', 
          person: row.person,
          team: row.team,
          cc: row.cc,
          compositeKey,
          id: docRef.id,
          newWeeks: Object.keys(newWeekValues).length 
        });
      }
    }

    // Alle Änderungen in einem Batch commit
    await batch.commit();

    // Statistiken für Response
    const updatedCount = results.filter(r => r.action === 'updated').length;
    const createdCount = results.filter(r => r.action === 'created').length;
    const totalNewWeeks = results.reduce((sum, r) => sum + r.newWeeks, 0);

    res.json({ 
      success: true, 
      historyId: historyRef.id, 
      version: newVersion,
      results,
      message: `${results.length} Personen verarbeitet (${updatedCount} aktualisiert, ${createdCount} neu erstellt, ${totalNewWeeks} KW-Werte hinzugefügt)`
    });

  } catch (error) {
    
    res.status(500).json({ error: 'Interner Server-Fehler', details: error.message });
  }
});

// Alle Auslastung-Daten abrufen (nur neueste Version)
app.get('/api/auslastung', requireAuth, async (req, res) => {
  try {
    const snap = await db.collection('auslastung').where('isLatest', '==', true).get();
    let out = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(a.person || '').localeCompare(String(b.person || ''), 'de'));
    const profile = await loadUserProfile(req.user.uid);
    out = applyScopeFilter(out, profile, req.user?.admin);
    res.json(out);
  } catch (error) {
    
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Alle Einsatzplan-Daten abrufen (nur neueste Version)
app.get('/api/einsatzplan', requireAuth, async (req, res) => {
  try {
    const snap = await db.collection('einsatzplan').where('isLatest', '==', true).get();
    let out = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(a.person || '').localeCompare(String(b.person || ''), 'de'));
    const profile = await loadUserProfile(req.user.uid);
    out = applyScopeFilter(out, profile, req.user?.admin);
    res.json(out);
  } catch (error) {
    
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Upload-Historie abrufen
app.get('/api/upload-history', requireAuth, async (req, res) => {
  try {
    const snap = await db.collection('uploadHistory').orderBy('createdAt', 'desc').get();
    const out = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(out);
  } catch (error) {
    
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Normalisierte Auslastungsdaten konsolidieren und speichern
app.post('/api/consolidate', requireAuth, async (req, res) => {
  try {
    const { auslastungData, einsatzplanData } = req.body;
    
    if (!auslastungData || !einsatzplanData) {
      return res.status(400).json({ error: 'Auslastung und Einsatzplan Daten erforderlich' });
    }

    const consolidatedData = [];
    
    // Alle Personen sammeln
    const allPersons = new Set([
      ...auslastungData.map(row => row.person).filter(Boolean),
      ...einsatzplanData.map(row => row.person).filter(Boolean)
    ]);

    // Gruppiere Daten nach Person
    const auslastungByPerson = new Map();
    auslastungData.forEach(row => {
      if (!row.person) return;
      if (!auslastungByPerson.has(row.person)) {
        auslastungByPerson.set(row.person, []);
      }
      auslastungByPerson.get(row.person).push(row);
    });

    const einsatzplanByPerson = new Map();
    einsatzplanData.forEach(row => {
      if (!row.person) return;
      if (!einsatzplanByPerson.has(row.person)) {
        einsatzplanByPerson.set(row.person, []);
      }
      einsatzplanByPerson.get(row.person).push(row);
    });

            // Sammle alle verfügbaren Wochen-Keys aus beiden Datensets
        const allWeekKeys = new Set();
        [...auslastungData, ...einsatzplanData].forEach(row => {
          // DEBUGGING: Zeige die Struktur der Row-Daten
          console.log('🔍 Row-Struktur:', {
            person: row.person,
            keys: Object.keys(row),
            hasValues: !!row.values,
            valuesKeys: row.values ? Object.keys(row.values) : 'keine values'
          });
          
          // Prüfe sowohl direkte Keys als auch values-Objekt
          const keysToCheck = [
            ...Object.keys(row),
            ...(row.values ? Object.keys(row.values) : [])
          ];
          
          keysToCheck.forEach(key => {
            // Prüfe auf Wochen-Format: XX/XX (z.B. "25/01", "25/33")
            if (/^\d{2}\/\d{2}$/.test(key)) {
              allWeekKeys.add(key);
              console.log(`📅 Gefundener Wochen-Key: ${key} in ${row.person || 'unbekannt'}`);
            }
          });
        });
        
        console.log(`📊 Insgesamt gefundene Wochen-Keys: ${Array.from(allWeekKeys).join(', ')}`);

    // Konsolidiere für jede Person und jede Woche
    for (const person of allPersons) {
      const ausRows = auslastungByPerson.get(person) || [];
      const einRows = einsatzplanByPerson.get(person) || [];

      // Sammle Team/CC Kombinationen für diese Person
      const personCombinations = new Set();
      
      ausRows.forEach(row => {
        const combo = `${row.team || 'unknown'}__${row.cc || 'unknown'}`;
        personCombinations.add(combo);
      });
      einRows.forEach(row => {
        const combo = `${row.team || 'unknown'}__${row.cc || 'unknown'}`;
        personCombinations.add(combo);
      });

      if (personCombinations.size === 0) {
        personCombinations.add('unknown__unknown');
      }

      // Verarbeite jede Team/CC Kombination
      for (const combo of personCombinations) {
        const [team, cc] = combo.split('__');
        
        const ausRow = ausRows.find(row => 
          (row.team || 'unknown') === team && (row.cc || 'unknown') === cc
        );
        const einRow = einRows.find(row => 
          (row.team || 'unknown') === team && (row.cc || 'unknown') === cc
        );

        // Verarbeite jede verfügbare Woche
        for (const weekKey of allWeekKeys) {
          // ✅ KORRIGIERT: Korrekte Extraktion der Werte aus den Row-Objekten
          let ausValue = null;
          let einValue = null;
          
          // Prüfe Auslastungswert aus dem "values" Objekt
          if (ausRow && ausRow.values && ausRow.values[weekKey] !== undefined) {
            ausValue = ausRow.values[weekKey];
          } else if (ausRow && ausRow[weekKey] !== undefined) {
            ausValue = ausRow[weekKey];
          }
          
          // Prüfe Einsatzplanwert aus dem "values" Objekt
          if (einRow && einRow.values && einRow.values[weekKey] !== undefined) {
            einValue = einRow.values[weekKey];
          } else if (einRow && einRow[weekKey] !== undefined) {
            einValue = einRow[weekKey];
          }
          
          // Debugging: Log die gefundenen Werte
          if (ausValue !== null || einValue !== null) {
            console.log(`📊 Woche ${weekKey} für ${person}: aus=${ausValue}, ein=${einValue}`);
          }
          
          // Nur hinzufügen wenn mindestens ein Wert vorhanden ist
          if (ausValue !== null || einValue !== null) {
            const finalValue = ausValue !== null ? ausValue : einValue;
            
            // Parse Jahr und Woche aus weekKey (z.B. "25/33")
            const [yearPart, weekPart] = weekKey.split('/');
            const year = 2000 + parseInt(yearPart, 10);
            const weekNumber = parseInt(weekPart, 10);
            
            consolidatedData.push({
              person,
              lob: ausRow?.lob || einRow?.lob,
              bereich: ausRow?.bereich || einRow?.bereich,
              cc: cc !== 'unknown' ? cc : (ausRow?.cc || einRow?.cc),
              team: team !== 'unknown' ? team : (ausRow?.team || einRow?.team),
              lbs: einRow?.lbs,
              week: weekKey,
              year: year,
              weekNumber: weekNumber,
              auslastungValue: ausValue,
              einsatzplanValue: einValue,
              finalValue,
              source: (ausValue !== null && einValue !== null) ? 'both' : 
                     (ausValue !== null ? 'auslastung' : 'einsatzplan'),
              isLatest: true,
              compositeKey: `${person}__${team !== 'unknown' ? team : (ausRow?.team || einRow?.team || 'unknown')}__${cc !== 'unknown' ? cc : (ausRow?.cc || einRow?.cc || 'unknown')}`
            });
          }
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

    // Neue Daten speichern (mit Composite Key)
    const savedCount = [];
    for (const row of consolidatedData) {
      // Verwende Composite Key: Person__Team__CC__Week für eindeutige Identifikation
      // ✅ OPTIMAL: Ersetze '/' nur für Document-ID, behalte Original-Format in Daten  
      const sanitizedWeek = row.week ? String(row.week).replace(/\//g, '|') : 'unknown';
      const docId = `${row.compositeKey}__${sanitizedWeek}`;
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
    
    res.status(500).json({ error: 'Interner Server-Fehler', details: error.message });
  }
});

// Normalisierte Daten abrufen
app.get('/api/utilization-data', requireAuth, async (req, res) => {
  try {
    // Einfach: Lade alle aktuellen utilizationData
    const snap = await db.collection('utilizationData').where('isLatest', '==', true).get();
    const data = snap.docs
      .map(doc => doc.data())
      .sort((a, b) => {
        if (a.person !== b.person) return String(a.person).localeCompare(String(b.person));
        if (a.year !== b.year) return (a.year || 0) - (b.year || 0);
        return (a.weekNumber || 0) - (b.weekNumber || 0);
      });
    
    // Scope-Filter anwenden
    const profile = await loadUserProfile(req.user.uid);
    const filteredData = applyScopeFilter(data, profile, req.user?.admin);
    
    res.json(filteredData);
  } catch (error) {
    console.error('Fehler beim Laden der Nutzungsdaten:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Konsolidierte Daten in Bulk in Firebase speichern
app.post('/api/utilization-data/bulk', requireAuth, async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Ungültige Daten - Array erwartet' });
    }

    console.log(`🔍 Bulk-Speicherung startet: ${data.length} Datensätze`);

    // Bestehende Daten als "nicht mehr aktuell" markieren
    const latestUtilSnap = await db.collection('utilizationData').where('isLatest', '==', true).get();
    if (!latestUtilSnap.empty) {
      const batch = db.batch();
      latestUtilSnap.forEach(doc => batch.update(doc.ref, { isLatest: false }));
      await batch.commit();
      console.log(`🔍 ${latestUtilSnap.size} bestehende Dokumente als nicht aktuell markiert`);
    }

    // Neue Daten speichern (Update oder Insert)
    const batch = db.batch();
    const savedCount = [];
    
    for (const row of data) {
      // Verwende Composite Key falls vorhanden, sonst fallback auf Person__Week
      // ✅ OPTIMAL: Ersetze '/' nur für Document-ID, behalte Original-Format in Daten
      const sanitizedWeek = row.week ? String(row.week).replace(/\//g, '|') : 'unknown';
      const docId = row.compositeKey ? `${row.compositeKey}__${sanitizedWeek}` : `${row.person}__${sanitizedWeek}`;
      const docRef = db.collection('utilizationData').doc(docId);
      
      console.log(`🔍 Speichere Document: ${docId}`);
      
      batch.set(docRef, {
        ...row,
        isLatest: true,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      
      savedCount.push(docId);
    }

    await batch.commit();
    console.log(`✅ Bulk-Speicherung erfolgreich: ${savedCount.length} Datensätze`);

    res.json({
      success: true,
      message: `${savedCount.length} Datensätze in Firebase gespeichert`,
      count: savedCount.length
    });

  } catch (error) {
    console.error('❌ Fehler bei Bulk-Speicherung:', error);
    res.status(500).json({ error: 'Interner Server-Fehler', details: error.message });
  }
});

// Hilfsfunktion zum Extrahieren von Wochenwerten im YY/WW Format
// Hilfsfunktion extractWeekValue entfernt - wird nicht mehr benötigt
// Daten werden jetzt direkt über die Wochen-Keys aus Firebase gelesen

// Employee Dossier speichern oder aktualisieren
app.post('/api/employee-dossier', requireAuth, async (req, res) => {
  try {
    const { employeeId, dossierData } = req.body;
    
    console.log('🔍 POST /api/employee-dossier - Request Body:', { employeeId, dossierData });
    
    if (!employeeId || !dossierData) {
      console.error('❌ Ungültige Daten:', { employeeId, dossierData });
      return res.status(400).json({ error: 'Ungültige Daten', received: { employeeId, dossierData } });
    }

    // Verwende employeeId als Dokument-ID, falls nicht vorhanden
    const docId = String(employeeId);
    const docRef = db.collection('employeeDossiers').doc(docId);
    const snap = await docRef.get();
    
    // Erstelle Payload mit allen verfügbaren Feldern
    const payload = {
      employeeId: docId,
      name: dossierData.displayName || dossierData.name || employeeId,
      email: dossierData.email || '',
      phone: dossierData.phone || '',
      strengths: dossierData.strengths || '',
      weaknesses: dossierData.weaknesses || '',
      comments: dossierData.comments || '',
      utilizationComment: dossierData.utilizationComment || '',
      planningComment: dossierData.planningComment || '',
      travelReadiness: dossierData.travelReadiness || '',
      projectHistory: Array.isArray(dossierData.projectHistory) ? dossierData.projectHistory.map(project => ({
        ...project,
        activities: Array.isArray(project.activities) ? project.activities : []
      })) : [],
      projectOffers: Array.isArray(dossierData.projectOffers) ? dossierData.projectOffers : [],
      jiraTickets: Array.isArray(dossierData.jiraTickets) ? dossierData.jiraTickets : [],
      skills: Array.isArray(dossierData.skills) ? dossierData.skills : [],
      excelData: dossierData.excelData || {},
      // Neue Felder
      careerLevel: dossierData.careerLevel || '',
      manager: dossierData.manager || '',
      team: dossierData.team || '',
      competenceCenter: dossierData.competenceCenter || '',
      lineOfBusiness: dossierData.lineOfBusiness || '',
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: snap.exists ? snap.data().createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
    };
    
    console.log('💾 Speichere Employee Dossier:', { docId, payload });
    
    await docRef.set(payload, { merge: true });
    const updated = await docRef.get();
    
    console.log('✅ Employee Dossier erfolgreich gespeichert:', { docId, exists: snap.exists });
    
    res.json({ 
      success: true, 
      message: snap.exists ? 'Employee Dossier aktualisiert' : 'Employee Dossier erstellt', 
      data: { id: updated.id, ...updated.data() } 
    });
  } catch (error) {
    console.error('❌ Fehler beim Speichern des Employee Dossiers:', error);
    res.status(500).json({ error: 'Interner Server-Fehler', details: error.message });
  }
});

// Employee Dossier abrufen
app.get('/api/employee-dossier/:employeeId', requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const snap = await db.collection('employeeDossiers').doc(String(employeeId)).get();
    if (!snap.exists) {
      const defaultDossier = {
        id: String(employeeId),
        employeeId: String(employeeId),
        name: String(employeeId),
        email: '',
        phone: '',
        strengths: '',
        weaknesses: '',
        comments: '',
        utilizationComment: '',
        planningComment: '',
        travelReadiness: '',
        projectHistory: [],
        projectOffers: [],
        jiraTickets: [],
        skills: [],
        excelData: {},
        careerLevel: '',
        manager: '',
        team: '',
        competenceCenter: '',
        lineOfBusiness: ''
      };
      return res.json(defaultDossier);
    }
    
    res.json({ id: snap.id, ...snap.data() });
  } catch (error) {
    
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Alle Employee Dossiers abrufen
app.get('/api/employee-dossiers', requireAuth, async (req, res) => {
  try {
    const snap = await db.collection('employeeDossiers').get();
    const out = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de'));
    res.json(out);
  } catch (error) {
    
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Employee Skills Endpoints
app.get('/api/employee-skills/:employeeName', requireAuth, async (req, res) => {
  try {
    const { employeeName } = req.params;
    
    const snap = await db.collection('employeeDossiers').doc(String(employeeName)).get();
    if (!snap.exists) {
      return res.json([]);
    }
    
    const data = snap.data();
    res.json(Array.isArray(data.skills) ? data.skills : []);
  } catch (error) {
    console.error('❌ Fehler beim Laden der Employee Skills:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

app.post('/api/employee-skills/:employeeName', requireAuth, async (req, res) => {
  try {
    const { employeeName } = req.params;
    const { skills } = req.body;
    
    if (!Array.isArray(skills)) {
      return res.status(400).json({ error: 'Ungültige Skills-Daten' });
    }
    
    const docRef = db.collection('employeeDossiers').doc(String(employeeName));
    const snap = await docRef.get();
    
    if (!snap.exists) {
      await docRef.set({
        employeeId: String(employeeName),
        name: String(employeeName),
        email: '',
        skills,
        projectHistory: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    } else {
      await docRef.update({
        skills,
        updatedAt: FieldValue.serverTimestamp()
      });
    }
    
    res.json({ success: true, message: 'Skills erfolgreich gespeichert' });
  } catch (error) {
    console.error('❌ Fehler beim Speichern der Employee Skills:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

app.put('/api/employee-skills/:employeeName/:skillId', requireAuth, async (req, res) => {
  try {
    const { employeeName, skillId } = req.params;
    const { level } = req.body;
    
    if (typeof level !== 'number' || level < 0 || level > 5) {
      return res.status(400).json({ error: 'Ungültiges Skill-Level' });
    }
    
    const docRef = db.collection('employeeDossiers').doc(String(employeeName));
    const snap = await docRef.get();
    
    if (!snap.exists) {
      return res.status(404).json({ error: 'Employee Dossier nicht gefunden' });
    }
    
    const data = snap.data();
    const skills = data.skills || [];
    const skillIndex = skills.findIndex(s => s.skillId === skillId);
    
    if (skillIndex === -1) {
      return res.status(404).json({ error: 'Skill nicht gefunden' });
    }
    
    skills[skillIndex].level = level;
    
    await docRef.update({
      skills,
      updatedAt: FieldValue.serverTimestamp()
    });
    
    res.json({ success: true, message: 'Skill-Level erfolgreich aktualisiert' });
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren des Skill-Levels:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

app.delete('/api/employee-skills/:employeeName/:skillId', requireAuth, async (req, res) => {
  try {
    const { employeeName, skillId } = req.params;
    
    const docRef = db.collection('employeeDossiers').doc(String(employeeName));
    const snap = await docRef.get();
    
    if (!snap.exists) {
      return res.status(404).json({ error: 'Employee Dossier nicht gefunden' });
    }
    
    const data = snap.data();
    const skills = data.skills || [];
    const filteredSkills = skills.filter(s => s.skillId !== skillId);
    
    await docRef.update({
      skills: filteredSkills,
      updatedAt: FieldValue.serverTimestamp()
    });
    
    res.json({ success: true, message: 'Skill erfolgreich gelöscht' });
  } catch (error) {
    console.error('❌ Fehler beim Löschen des Skills:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

app.get('/api/employee-skills', requireAuth, async (req, res) => {
  try {
    const snap = await db.collection('employeeDossiers').get();
    const allSkills = [];
    
    snap.docs.forEach(doc => {
      const data = doc.data();
      if (data.skills && Array.isArray(data.skills)) {
        data.skills.forEach(skill => {
          allSkills.push({
            employeeName: data.name || doc.id,
            employeeId: doc.id,
            ...skill
          });
        });
      }
    });
    
    res.json(allSkills);
  } catch (error) {
    console.error('❌ Fehler beim Laden aller Employee Skills:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Admin: Alle User-Profile abrufen
app.get('/api/users', requireAdmin, async (_req, res) => {
  try {
    const snap = await db.collection('users').get();
    const out = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(out);
  } catch (error) {
    
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Admin: User-Profil aktualisieren (inkl. Rolle/Scope/CanViewAll)
app.put('/api/users/:uid', requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { role, canViewAll, lob, bereich, competenceCenter, team } = req.body || {};
    const docRef = db.collection('users').doc(uid);
    const toUpdate = { updatedAt: FieldValue.serverTimestamp() };
    if (typeof role !== 'undefined') toUpdate.role = role || null;
    if (typeof canViewAll !== 'undefined') toUpdate.canViewAll = Boolean(canViewAll);
    if (typeof lob !== 'undefined') toUpdate.lob = lob || null;
    if (typeof bereich !== 'undefined') toUpdate.bereich = bereich || null;
    if (typeof competenceCenter !== 'undefined') toUpdate.competenceCenter = competenceCenter || null;
    if (typeof team !== 'undefined') toUpdate.team = team || null;
    await docRef.set(toUpdate, { merge: true });
    // Optional: Claims setzen
    if (typeof role !== 'undefined') {
      await admin.auth().setCustomUserClaims(uid, { role, admin: role === 'admin' });
    }
    const snap = await docRef.get();
    res.json({ id: snap.id, ...snap.data() });
  } catch (error) {
    
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// ✅ Employee Stammdaten Endpunkte
app.post('/api/employees/bulk', authMiddleware, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Nicht autorisiert' });
  }
  
  try {
    const { employees } = req.body;
    
    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ error: 'Keine Employee-Daten erhalten' });
    }
    
    console.log(`💾 Speichere ${employees.length} Employee-Stammdaten...`);
    
    const batch = db.batch();
    let count = 0;
    
    for (const employee of employees) {
      // Validierung
      if (!employee.person || !employee.lob || !employee.cc || !employee.team) {
        console.warn('Überspringe Employee ohne Pflichtfelder:', employee);
        continue;
      }
      
      // Composite Key als Dokument-ID verwenden
      const docId = employee.compositeKey || `${employee.person}__${employee.team}__${employee.cc}`;
      const docRef = db.collection('employeeStammdaten').doc(docId);
      
      const employeeDoc = {
        ...employee,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp() // Wird nur bei neuen Docs gesetzt
      };
      
      batch.set(docRef, employeeDoc, { merge: false }); // Komplett überschreiben
      count++;
    }
    
    await batch.commit();
    
    console.log(`✅ ${count} Employee-Stammdaten erfolgreich gespeichert`);
    res.json({ 
      success: true, 
      message: `${count} Mitarbeiter erfolgreich gespeichert`,
      count 
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Speichern der Employee-Stammdaten:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

app.get('/api/employees', authMiddleware, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Nicht autorisiert' });
  }
  
  try {
    console.log('🔍 Lade Employee-Stammdaten...');
    
    const snapshot = await db.collection('employeeStammdaten').get();
    const employees = [];
    
    snapshot.forEach(doc => {
      employees.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ ${employees.length} Employee-Stammdaten geladen`);
    res.json(employees);
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Employee-Stammdaten:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`🚀 Backend-Server läuft auf Port ${PORT}`);
  console.log(`📊 API verfügbar unter http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});

// Debug-Endpoint: Collection-Inhalte prüfen
app.get('/api/debug/collections', requireAuth, async (req, res) => {
  try {
    // Auslastung Collection
    const auslastungSnap = await db.collection('auslastung').limit(3).get();
    const auslastungSample = auslastungSnap.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));

    // Einsatzplan Collection  
    const einsatzplanSnap = await db.collection('einsatzplan').limit(3).get();
    const einsatzplanSample = einsatzplanSnap.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));

    // UtilizationData Collection
    const utilizationSnap = await db.collection('utilizationData').limit(3).get();
    const utilizationSample = utilizationSnap.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));

    res.json({
      auslastung: {
        count: auslastungSnap.size,
        sample: auslastungSample
      },
      einsatzplan: {
        count: einsatzplanSnap.size,
        sample: einsatzplanSample
      },
      utilizationData: {
        count: utilizationSnap.size,
        sample: utilizationSample
      }
    });
  } catch (error) {
    console.error('Debug-Fehler:', error);
    res.status(500).json({ error: error.message });
  }
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
