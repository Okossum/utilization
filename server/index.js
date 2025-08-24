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

// Entfernt rekursiv undefined-Werte aus Objekten/Arrays (Firestore-kompatibel)
function removeUndefinedDeep(value, depth = 0) {
  // Verhindere Stack Overflow bei sehr tiefen Objekten
  if (depth > 10) {
    // console.warn entfernt
    return value;
  }
  
  if (Array.isArray(value)) {
    return value
      .map(v => removeUndefinedDeep(v, depth + 1))
      .filter(v => v !== undefined);
  }
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach((k) => {
      const v = removeUndefinedDeep(value[k], depth + 1);
      if (v !== undefined) out[k] = v;
    });
    return out;
  }
  return value === undefined ? undefined : value;
}

// Entfernt rekursiv ungültige Zahlen (NaN/Infinity) aus Objekten/Arrays
function removeInvalidNumbersDeep(value, depth = 0) {
  // Verhindere Stack Overflow bei sehr tiefen Objekten
  if (depth > 10) {
    // console.warn entfernt
    return value;
  }
  
  if (Array.isArray(value)) {
    return value
      .map(v => removeInvalidNumbersDeep(v, depth + 1))
      .filter(v => v !== undefined);
  }
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach((k) => {
      const v = removeInvalidNumbersDeep(value[k], depth + 1);
      if (v !== undefined) out[k] = v;
    });
    return out;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

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
    // console.log entfernt
    req.user = null;
    return next();
  }
  
  try {
    // console.log entfernt
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    // console.log entfernt
  } catch (error) {
    // console.log entfernt
    req.user = null;
  }
  next();
}

app.use(authMiddleware);

// Require authenticated user
function requireAuth(req, res, next) {
  if (!req.user?.uid) {
    // console.log entfernt
    return res.status(401).json({ error: 'Authentifizierung fehlgeschlagen - bitte melden Sie sich erneut an' });
  }
  // console.log entfernt
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
      key !== 'personId' &&
      key !== 'lbs' &&
      key !== 'vg' &&
      key !== 'VG' &&
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

// ===== KNOWLEDGE API ENDPOINTS =====

// Mitarbeiter Knowledge speichern
app.post('/api/knowledge/mitarbeiter', requireAuth, async (req, res) => {
  try {
    const { fileName, data } = req.body;
    
    if (!fileName || !data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Ungültige Daten' });
    }

    // console.log entfernt

    // Upload-Historie speichern (unabhängig von Branchen Know-How)
    const historyRef = await db.collection('knowledgeUploadHistory').add({
      fileName,
      fileType: 'mitarbeiter',
      status: 'success',
      rowCount: data.length,
      uploadTimestamp: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    // Lade bestehende Daten
    const existingSnap = await db.collection('mitarbeiterKnowledge').get();
    const existingData = new Map();
    existingSnap.forEach(doc => {
      const data = doc.data();
      const key = `${data.kategorie || 'unknown'}__${data.knowledge || 'unknown'}`;
      existingData.set(key, { id: doc.id, data });
    });

    const results = [];
    const batch = db.batch();

    for (const row of data) {
      if (!row.kategorie || !row.knowledge) continue;
      
      const key = `${row.kategorie}__${row.knowledge}`;
      const existing = existingData.get(key);
      
      if (existing) {
        // Update bestehenden Eintrag
        const docRef = db.collection('mitarbeiterKnowledge').doc(existing.id);
        batch.update(docRef, {
          fileName,
          uploadDate: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        results.push({ 
          action: 'updated', 
          kategorie: row.kategorie,
          knowledge: row.knowledge,
          id: existing.id
        });
      } else {
        // Neuer Eintrag
        const docRef = db.collection('mitarbeiterKnowledge').doc();
        batch.set(docRef, {
          fileName,
          uploadDate: FieldValue.serverTimestamp(),
          kategorie: row.kategorie,
          knowledge: row.knowledge,
          type: 'mitarbeiter',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        results.push({ 
          action: 'created', 
          kategorie: row.kategorie,
          knowledge: row.knowledge,
          id: docRef.id
        });
      }
    }

    await batch.commit();

    // console.log entfernt

    res.json({
      success: true,
      message: 'Mitarbeiter Knowledge erfolgreich gespeichert',
      results,
      historyId: historyRef.id
    });

  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Branchen Know-How speichern
app.post('/api/knowledge/branchen', requireAuth, async (req, res) => {
  try {
    const { fileName, data } = req.body;
    
    if (!fileName || !data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Ungültige Daten' });
    }

    // console.log entfernt

    // Upload-Historie speichern (unabhängig von Mitarbeiter Knowledge)
    const historyRef = await db.collection('knowledgeUploadHistory').add({
      fileName,
      fileType: 'branchen',
      status: 'success',
      rowCount: data.length,
      uploadTimestamp: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    // Lade bestehende Daten
    const existingSnap = await db.collection('branchenKnowHow').get();
    const existingData = new Map();
    existingSnap.forEach(doc => {
      const data = doc.data();
      const key = `${data.kategorie || 'unknown'}__${data.knowHow || 'unknown'}`;
      existingData.set(key, { id: doc.id, data });
    });

    const results = [];
    const batch = db.batch();

    for (const row of data) {
      if (!row.kategorie || !row.knowHow) continue;
      
      const key = `${row.kategorie}__${row.knowHow}`;
      const existing = existingData.get(key);
      
      if (existing) {
        // Update bestehenden Eintrag
        const docRef = db.collection('branchenKnowHow').doc(existing.id);
        batch.update(docRef, {
          fileName,
          uploadDate: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        results.push({ 
          action: 'updated', 
          kategorie: row.kategorie,
          knowHow: row.knowHow,
          id: existing.id
        });
      } else {
        // Neuer Eintrag
        const docRef = db.collection('branchenKnowHow').doc();
        batch.set(docRef, {
          fileName,
          uploadDate: FieldValue.serverTimestamp(),
          kategorie: row.kategorie,
          knowHow: row.knowHow,
          type: 'branchen',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        results.push({ 
          action: 'created', 
          kategorie: row.kategorie,
          knowHow: row.knowHow,
          id: docRef.id
        });
      }
    }

    await batch.commit();

    // console.log entfernt

    res.json({
      success: true,
      message: 'Branchen Know-How erfolgreich gespeichert',
      results,
      historyId: historyRef.id
    });

  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Alle Mitarbeiter Knowledge abrufen
app.get('/api/knowledge/mitarbeiter', requireAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('mitarbeiterKnowledge').get();
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(data);
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Alle Branchen Know-How abrufen
app.get('/api/knowledge/branchen', requireAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('branchenKnowHow').get();
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(data);
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Alle Knowledge-Daten abrufen (beide Typen)
app.get('/api/knowledge', requireAuth, async (req, res) => {
  try {
    const [mitarbeiterSnap, branchenSnap] = await Promise.all([
      db.collection('mitarbeiterKnowledge').get(),
      db.collection('branchenKnowHow').get()
    ]);
    
    const mitarbeiter = mitarbeiterSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const branchen = branchenSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      mitarbeiter,
      branchen
    });
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// ===== AUSLASTUNG API ENDPOINTS =====

// Auslastung-Daten speichern oder aktualisieren (Firestore)
app.post('/api/auslastung', requireAuth, async (req, res) => {
  // console.log entfernt
  // console.log entfernt
  
  try {
    // 🔍 DEBUG: Zeige alle empfangenen Daten
    // console.log entfernt
    // console.log entfernt
    // console.log entfernt
    
    const { data, fileName } = req.body;
    
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
      
      // Debug: Zeige personId-Informationen
      // console.log entfernt
      
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
          personId: row.personId && row.personId.trim() ? row.personId.trim() : (existing.data.personId || null),
          lob: row.lob ?? existing.data.lob ?? null,
          bereich: row.bereich ?? existing.data.bereich ?? null,
          cc: row.cc ?? existing.data.cc ?? null,
          team: row.team ?? existing.data.team ?? null,
          lbs: row.lbs ?? existing.data.lbs ?? null,
          vg: pickField(row, ['VG', 'vg']) ?? existing.data.vg ?? null,
          values: mergedValues,
          updatedBy: req.user.uid,
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
          personId: row.personId && row.personId.trim() ? row.personId.trim() : null,
          lob: row.lob ?? null,
          team: row.team ?? null,
          cc: row.cc ?? null,
          bereich: row.bereich ?? null,
          lbs: row.lbs ?? null,
          vg: pickField(row, ['VG', 'vg']) ?? null,
          values: newWeekValues,
          isLatest: true,
          createdBy: req.user.uid,
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

    // console.log entfernt
    // console.log entfernt
    
    res.json({ 
      success: true, 
      historyId: historyRef.id, 
      version: newVersion,
      results,
      message: `${results.length} Personen verarbeitet (${updatedCount} aktualisiert, ${createdCount} neu erstellt, ${totalNewWeeks} KW-Werte hinzugefügt)`
    });

  } catch (error) {
    // console.error entfernt
    // console.log entfernt
    
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
        if (key !== 'person' && key !== 'personId' && key !== 'lbs' && key !== 'vg' && key !== 'VG' && 
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
      
      // Debug: Zeige personId-Informationen
      // console.log entfernt
      
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
          personId: row.personId && row.personId.trim() ? row.personId.trim() : (existing.data.personId || null),
          lob: row.lob ?? existing.data.lob ?? null,
          bereich: row.bereich ?? existing.data.bereich ?? null,
          cc: row.cc ?? existing.data.cc ?? null,
          team: row.team ?? existing.data.team ?? null,
          lbs: row.lbs ?? existing.data.lbs ?? null,
          vg: pickField(row, ['VG', 'vg']) ?? existing.data.vg ?? null,
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
          personId: row.personId && row.personId.trim() ? row.personId.trim() : null,
          lbs: row.lbs ?? null,
          vg: pickField(row, ['VG', 'vg']) ?? null,
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
    // ✅ TEMP DEBUG: Scope-Filter temporär deaktiviert
    // console.log entfernt
    // out = applyScopeFilter(out, profile, req.user?.admin);
    // console.log entfernt
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
    // ✅ TEMP DEBUG: Scope-Filter temporär deaktiviert
    // console.log entfernt
    // out = applyScopeFilter(out, profile, req.user?.admin);
    // console.log entfernt
    res.json(out);
  } catch (error) {
    
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Mitarbeiter-Daten speichern oder aktualisieren (Firestore)
app.post('/api/mitarbeiter', requireAuth, async (req, res) => {
  // console.log entfernt
  // console.log entfernt
  
  try {
    const { fileName, data } = req.body;
    
    if (!fileName || !data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Ungültige Daten' });
    }

    // Upload-Historie speichern
    const historyRef = await db.collection('uploadHistory').add({
      fileName,
      fileType: 'mitarbeiter',
      status: 'success',
      rowCount: data.length,
      createdAt: FieldValue.serverTimestamp(),
      uploadedBy: req.user.uid,
    });

    // Lade bestehende Mitarbeiter-Daten (nur die neuesten pro Name)
    const latestSnap = await db.collection('mitarbeiter').where('isLatest', '==', true).get();
    const existingData = new Map();
    latestSnap.forEach(doc => {
      const data = doc.data();
      const nameKey = data.name?.toLowerCase().trim() || 'unknown';
      existingData.set(nameKey, { id: doc.id, data });
    });

    // Neue Versionsnummer ermitteln
    const maxVerSnap = await db.collection('mitarbeiter').orderBy('uploadVersion', 'desc').limit(1).get();
    const newVersion = maxVerSnap.empty ? 1 : ((maxVerSnap.docs[0].data().uploadVersion || 0) + 1);

    const results = [];
    const batch = db.batch();

    // Mitarbeiter-basiertes Update
    for (const row of data) {
      if (!row.name) continue;
      
      const nameKey = row.name.toLowerCase().trim();
      const existing = existingData.get(nameKey);
      
      if (existing) {
        // Update bestehenden Mitarbeiter
        const docRef = db.collection('mitarbeiter').doc(existing.id);
        
        batch.update(docRef, {
          fileName,
          uploadDate: FieldValue.serverTimestamp(),
          uploadVersion: newVersion,
          name: row.name,
          email: row.email ?? existing.data.email ?? null,
          phone: row.phone ?? existing.data.phone ?? null,
          position: row.position ?? existing.data.position ?? null,
          department: row.department ?? existing.data.department ?? null,
          team: row.team ?? existing.data.team ?? null,
          skills: row.skills ?? existing.data.skills ?? null,
          experience: row.experience ?? existing.data.experience ?? null,
          updatedBy: req.user.uid,
          updatedAt: FieldValue.serverTimestamp(),
          isLatest: true, // ✅ Wichtig: isLatest Flag setzen
        });
        
        results.push({ 
          action: 'updated', 
          name: row.name,
          id: existing.id
        });
      } else {
        // Neuen Mitarbeiter erstellen
        const docRef = db.collection('mitarbeiter').doc();
        batch.set(docRef, {
          fileName,
          uploadDate: FieldValue.serverTimestamp(),
          uploadVersion: newVersion,
          name: row.name,
          email: row.email ?? null,
          phone: row.phone ?? null,
          position: row.position ?? null,
          department: row.department ?? null,
          team: row.team ?? null,
          skills: row.skills ?? null,
          experience: row.experience ?? null,
          isLatest: true, // ✅ Wichtig: isLatest Flag setzen
          createdBy: req.user.uid,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        results.push({ 
          action: 'created', 
          name: row.name,
          id: docRef.id
        });
      }
    }

    // Alle Änderungen in einem Batch commit
    await batch.commit();

    // Statistiken für Response
    const updatedCount = results.filter(r => r.action === 'updated').length;
    const createdCount = results.filter(r => r.action === 'created').length;

    // console.log entfernt
    // console.log entfernt
    
    res.json({ 
      success: true, 
      historyId: historyRef.id, 
      version: newVersion,
      results,
      message: `${results.length} Mitarbeiter verarbeitet (${updatedCount} aktualisiert, ${createdCount} neu erstellt)`
    });

  } catch (error) {
    // console.error entfernt
    // console.log entfernt
    
    res.status(500).json({ error: 'Interner Server-Fehler', details: error.message });
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
          
          // Prüfe sowohl direkte Keys als auch values-objekt
          const keysToCheck = [
            ...Object.keys(row),
            ...(row.values ? Object.keys(row.values) : [])
          ];
          
          keysToCheck.forEach(key => {
            // Prüfe auf Wochen-Format: XX/XX (z.B. "25/01", "25/33")
            if (/^\d{2}\/\d{2}$/.test(key)) {
              allWeekKeys.add(key);
              // console.log entfernt
            }
          });
        });
        
        // console.log entfernt

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
            // console.log entfernt
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
              personId: ausRow?.personId || einRow?.personId,
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
    // console.error entfernt
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

    // console.log entfernt

    // Bestehende Daten als "nicht mehr aktuell" markieren
    const latestUtilSnap = await db.collection('utilizationData').where('isLatest', '==', true).get();
    if (!latestUtilSnap.empty) {
      const batch = db.batch();
      latestUtilSnap.forEach(doc => batch.update(doc.ref, { isLatest: false }));
      await batch.commit();
      // console.log entfernt
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
      
      // console.log entfernt
      
      batch.set(docRef, {
        ...row,
        isLatest: true,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      
      savedCount.push(docId);
    }

    await batch.commit();
    // console.log entfernt

    res.json({
      success: true,
      message: `${savedCount.length} Datensätze in Firebase gespeichert`,
      count: savedCount.length
    });

  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler', details: error.message });
  }
});

// Hilfsfunktion zum Extrahieren von Wochenwerten im YY/WW Format
// Hilfsfunktion extractWeekValue entfernt - wird nicht mehr benötigt
// Daten werden jetzt direkt über die Wochen-Keys aus Firebase gelesen

// Employee Dossier speichern oder aktualisieren
app.post('/api/employee-dossier', requireAuth, async (req, res) => {
  try {
    // console.log entfernt
    // console.log entfernt
    
    const { employeeId, dossierData } = req.body;
    
    console.log('🔍 DEBUG Backend: Received employeeId:', employeeId);
    console.log('🔍 DEBUG Backend: Received dossierData.projectHistory:', dossierData?.projectHistory);
    
    if (!employeeId || !dossierData) {
      console.error('❌ Backend: Invalid data received');
      return res.status(400).json({ error: 'Ungültige Daten', received: { employeeId, dossierData } });
    }

    // Verwende employeeId als Dokument-ID, falls nicht vorhanden
    const docId = String(employeeId);
    const docRef = db.collection('employeeDossiers').doc(docId);
    const snap = await docRef.get();
    
    // Erstelle Payload mit allen verfügbaren Feldern (mit Normalisierung)
    const normalizedProjectHistory = Array.isArray(dossierData.projectHistory)
      ? dossierData.projectHistory.map((project) => ({
          // Basis-Felder (Legacy-Kompatibilität)
          id: String(project.id || Date.now().toString()),
          projectName: String(project.projectName || project.project || ''),
          customer: String(project.customer || ''),
          description: String(project.description || ''),        // ✨ NEU: Projektbeschreibung
          role: String(project.role || ''),
          duration: String(project.duration || ''),
          activities: Array.isArray(project.activities) ? project.activities.filter(a => typeof a === 'string') : [],
          
          // ✅ NEUE FELDER für erweiterte Projekt-Typen
          projectType: project.projectType || 'historical', // historical, planned, active
          projectSource: project.projectSource || 'regular', // regular, jira
          
          // Datum-Felder
          startDate: project.startDate || null,
          endDate: project.endDate || null,
          
          // Geplante Projekte Felder
          probability: project.probability || null,
          dailyRate: project.dailyRate || null,
          internalContact: project.internalContact || null,
          customerContact: project.customerContact || null,
          jiraTicketId: project.jiraTicketId || null,
          
          // Rollen und Skills (Projekt-spezifisch)
          roles: Array.isArray(project.roles) ? project.roles.map(role => ({
            roleId: String(role.roleId || ''),
            roleName: String(role.roleName || ''),
            tasks: Array.isArray(role.tasks) ? role.tasks.map(task => ({
              taskId: String(task.taskId || ''),
              taskName: String(task.taskName || '')
            })) : []
          })) : [],
          
          skills: Array.isArray(project.skills) ? project.skills.map(skill => ({
            skillId: String(skill.skillId || ''),
            skillName: String(skill.skillName || ''),
            categoryId: String(skill.categoryId || ''),
            categoryName: String(skill.categoryName || ''),
            level: Math.max(1, Math.min(5, Number(skill.level) || 1))
          })) : [],
          
          // Metadaten
          createdAt: project.createdAt || null,
          updatedAt: project.updatedAt || null
        }))
      : [];

    console.log('🔍 DEBUG Backend: Normalized projectHistory:', normalizedProjectHistory);

    // Skills werden über den separaten Skills-Endpoint verwaltet
    // Hier nur als Backup, falls sie direkt übergeben werden
    const normalizedSkills = Array.isArray(dossierData.skills)
      ? dossierData.skills.map((skill) => ({
          skillId: String(skill.skillId || skill.id || ''),
          name: String(skill.name || skill.skillName || ''),
          level: Math.max(0, Math.min(5, Number(skill.level) || 0))
        })).filter(skill => skill.skillId && skill.name)
      : null; // ⚠️ FIX: null statt [] um zu signalisieren, dass Skills nicht verwaltet werden sollen

    const sanitizedExcelData = (dossierData.excelData && typeof dossierData.excelData === 'object')
      ? removeUndefinedDeep(dossierData.excelData)
      : {};

    let payload = {
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
      projectHistory: normalizedProjectHistory,
      simpleProjects: Array.isArray(dossierData.simpleProjects) ? dossierData.simpleProjects : [],
      projectOffers: Array.isArray(dossierData.projectOffers) ? dossierData.projectOffers : [],
      jiraTickets: Array.isArray(dossierData.jiraTickets) ? dossierData.jiraTickets : [],
      // ⚠️ FIX: Skills nur setzen wenn explizit übergeben, sonst bestehende Skills beibehalten
      ...(normalizedSkills !== null && { skills: normalizedSkills }),
      excelData: sanitizedExcelData,
      // Neue Felder
      careerLevel: dossierData.careerLevel || '',
      manager: dossierData.manager || '',
      team: dossierData.team || '',
      competenceCenter: dossierData.competenceCenter || '',
      lineOfBusiness: dossierData.lineOfBusiness || '',
      // ACT-Status
      isActive: dossierData.isActive !== undefined ? dossierData.isActive : true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: snap.exists ? snap.data().createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
    };

    // Letzte Absicherung: undefined und ungültige Zahlen entfernen
    try {
      payload = removeUndefinedDeep(removeInvalidNumbersDeep(payload));
      // console.log entfernt
    } catch (sanitizeError) {
      // console.error entfernt
      // Verwende den ursprünglichen Payload ohne Sanitisierung
      payload = {
        employeeId: docId,
        name: dossierData.displayName || dossierData.name || employeeId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: snap.exists ? snap.data().createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      };
    }
    
    // console.log entfernt
    
    await docRef.set(payload, { merge: true });
    const updated = await docRef.get();
    
    console.log('🔍 DEBUG Backend: Saved to database, projectHistory:', updated.data()?.projectHistory);
    
    res.json({ 
      success: true, 
      message: snap.exists ? 'Employee Dossier aktualisiert' : 'Employee Dossier erstellt', 
      data: { id: updated.id, ...updated.data() } 
    });
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler', details: error.message });
  }
});

// 🔍 DEBUG: Alle Employee Dossiers auflisten (OHNE AUTH für Debugging)
app.get('/api/debug/employee-dossiers', async (req, res) => {
  try {
    const snap = await db.collection('employeeDossiers').get();
    const allDossiers = snap.docs.map(doc => ({
      id: doc.id,
      hasProjectHistory: !!doc.data().projectHistory,
      projectHistoryLength: doc.data().projectHistory?.length || 0,
      projectHistory: doc.data().projectHistory || [],
      name: doc.data().name,
      employeeId: doc.data().employeeId
    }));
    
    console.log('🔍 DEBUG: All employee dossiers in Firestore:', allDossiers);
    res.json(allDossiers);
  } catch (error) {
    console.error('❌ Error fetching all dossiers:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Dossiers' });
  }
});

// Employee Dossier abrufen
app.get('/api/employee-dossier/:employeeId', requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const snap = await db.collection('employeeDossiers').doc(String(employeeId)).get();
    console.log('🔍 DEBUG Backend GET: Looking for employeeId:', employeeId);
    console.log('🔍 DEBUG Backend GET: Document exists:', snap.exists);
    
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
        simpleProjects: [],
        projectOffers: [],
        jiraTickets: [],
        skills: [],
        excelData: {},
        careerLevel: '',
        manager: '',
        team: '',
        competenceCenter: '',
        lineOfBusiness: '',
        isActive: true // Standard: aktiv
      };
      return res.json(defaultDossier);
    }
    
    const data = { id: snap.id, ...snap.data() };
    console.log('🔍 DEBUG Backend GET: Returning data with projectHistory:', data.projectHistory);
    res.json(data);
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
    // console.log entfernt
    // console.log entfernt
    
    const snap = await db.collection('employeeDossiers').doc(String(employeeName)).get();
    if (!snap.exists) {
      // console.log entfernt
      return res.json([]);
    }
    
    const data = snap.data();
    // console.log entfernt
    const skills = Array.isArray(data.skills) ? data.skills : [];
    // console.log entfernt
    res.json(skills);
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler', details: error.message });
  }
});

app.post('/api/employee-skills/:employeeName', requireAuth, async (req, res) => {
  try {
    const { employeeName } = req.params;
    const { skills } = req.body;
    
    // console.log entfernt
    
    if (!Array.isArray(skills)) {
      // console.error entfernt
      return res.status(400).json({ error: 'Ungültige Skills-Daten - Array erwartet' });
    }
    
    // Validiere Skills-Struktur
    const validatedSkills = skills.map(skill => ({
      skillId: String(skill.skillId || skill.id || ''),
      skillName: String(skill.name || skill.skillName || ''), // ✅ FIX: skillName statt name für Konsistenz
      level: Math.max(0, Math.min(5, Number(skill.level) || 0))
    })).filter(skill => skill.skillId && skill.skillName);
    
    // console.log entfernt
    
    const docRef = db.collection('employeeDossiers').doc(String(employeeName));
    const snap = await docRef.get();
    
    if (!snap.exists) {
      // Erstelle neues Dossier
      await docRef.set({
        employeeId: String(employeeName),
        name: String(employeeName),
        skills: validatedSkills,
        projectHistory: [],
        simpleProjects: [],
        projectOffers: [],
        jiraTickets: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      // console.log entfernt
    } else {
      // Aktualisiere bestehendes Dossier
      await docRef.update({
        skills: validatedSkills,
        updatedAt: FieldValue.serverTimestamp()
      });
      // console.log entfernt
    }
    
    res.json({ 
      success: true, 
      message: 'Skills erfolgreich gespeichert',
      skills: validatedSkills,
      count: validatedSkills.length
    });
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler', details: error.message });
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
    // console.error entfernt
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
    // console.error entfernt
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
    // console.error entfernt
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
  // console.log entfernt
  // console.log entfernt
  
  if (!req.user) {
    // console.log entfernt
    return res.status(401).json({ error: 'Nicht autorisiert' });
  }
  
  try {
    const { employees } = req.body;
    
    if (!Array.isArray(employees) || employees.length === 0) {
      // console.log entfernt
      return res.status(400).json({ error: 'Keine Employee-Daten erhalten' });
    }
    
    // console.log entfernt
    
    const batch = db.batch();
    let count = 0;
    
    for (const employee of employees) {
      // Validierung
      if (!employee.person || !employee.lob || !employee.cc || !employee.team) {
        // console.warn entfernt
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
    
    // console.log entfernt
    // console.log entfernt
    res.json({ 
      success: true, 
      message: `${count} Mitarbeiter erfolgreich gespeichert`,
      count 
    });
    
  } catch (error) {
    // console.error entfernt
    // console.log entfernt
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

app.get('/api/employees', authMiddleware, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Nicht autorisiert' });
  }
  
  try {
    console.log('🔍 Loading employees from mitarbeiter collection...');
    
    // Erst prüfen, was überhaupt in der Collection ist
    const allSnapshot = await db.collection('mitarbeiter').limit(5).get();
    console.log(`📊 Total documents in mitarbeiter collection: ${allSnapshot.size}`);
    
    if (allSnapshot.size > 0) {
      allSnapshot.forEach(doc => {
        console.log(`📄 Sample doc ${doc.id}:`, doc.data());
      });
    }
    
    // Lade nur die neuesten Mitarbeiter-Versionen
    const snapshot = await db.collection('mitarbeiter').where('isLatest', '==', true).get();
    console.log(`📊 Latest documents loaded: ${snapshot.size}`);
    
    const employees = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      employees.push({
        id: doc.id,
        personId: data.personId || doc.id,
        name: data.name || data.person || data.displayName,
        displayName: data.displayName || data.name || data.person,
        email: data.email || data.mail || data.e_mail,
        location: data.location || data.standort || data.ort || data.office,
        startDate: data.startDate || data.eintrittsdatum || data.start_date,
        lbs: data.lbs || data.careerLevel || data.career_level,
        department: data.department || data.abteilung || data.lob,
        team: data.team,
        status: data.status || 'active',
        ...data // Include all original fields
      });
    });
    
    console.log(`✅ Loaded ${employees.length} employees from mitarbeiter collection`);
    res.json(employees);
    
  } catch (error) {
    console.error('❌ Error loading employees:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Server starten
app.listen(PORT, () => {
  // console.log entfernt
  // console.log entfernt
  // console.log entfernt
});

// Skills API Endpoint - Alle verfügbaren Skills laden
app.get('/api/skills', requireAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('skills').get();
    const skills = [];
    
    snapshot.forEach(doc => {
      skills.push({
        id: doc.id,
        name: doc.data().name
      });
    });
    
    // console.log entfernt
    res.json(skills);
    
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Erstelle Test-Skills (einmalig)
app.post('/api/skills/init', requireAuth, async (req, res) => {
  try {
    // console.log entfernt
    
    const testSkills = [
      { name: 'JavaScript' },
      { name: 'TypeScript' },
      { name: 'React' },
      { name: 'Node.js' },
      { name: 'Python' },
      { name: 'Java' },
      { name: 'C#' },
      { name: 'SQL' },
      { name: 'MongoDB' },
      { name: 'Docker' },
      { name: 'Kubernetes' },
      { name: 'AWS' },
      { name: 'Azure' },
      { name: 'Git' },
      { name: 'Agile/Scrum' },
      { name: 'Project Management' },
      { name: 'UI/UX Design' },
      { name: 'DevOps' },
      { name: 'Machine Learning' },
      { name: 'Data Analysis' }
    ];
    
    let created = 0;
    let skipped = 0;
    
    for (const skill of testSkills) {
      // Prüfe ob Skill bereits existiert
      const existing = await db.collection('skills').where('name', '==', skill.name).get();
      
      if (existing.empty) {
        await db.collection('skills').add(skill);
        created++;
        // console.log entfernt
      } else {
        skipped++;
        // console.log entfernt
      }
    }
    
    // console.log entfernt
    res.json({ 
      message: `Skills erfolgreich initialisiert: ${created} erstellt, ${skipped} übersprungen`,
      created,
      skipped 
    });
    
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Fehler beim Initialisieren der Skills' });
  }
});

// Employee Skills API Endpoints
app.post('/api/employee-skills', requireAuth, async (req, res) => {
  try {
    const { employeeId, skillId, skillName, level } = req.body;
    
    if (!employeeId || !skillId || !skillName || !level) {
      return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
    }
    
    // Lade das employeeDossier
    const dossierRef = db.collection('employeeDossiers').doc(employeeId);
    const dossierDoc = await dossierRef.get();
    
    let dossierData = {};
    if (dossierDoc.exists) {
      dossierData = dossierDoc.data();
    }
    
    // Initialisiere skills Array falls es nicht existiert
    if (!dossierData.skills || !Array.isArray(dossierData.skills)) {
      dossierData.skills = [];
    }
    
    // Prüfe ob Skill bereits zugewiesen ist
    const existingSkillIndex = dossierData.skills.findIndex(skill => skill.skillId === skillId);
    
    if (existingSkillIndex !== -1) {
      return res.status(400).json({ error: 'Skill ist bereits diesem Mitarbeiter zugewiesen' });
    }
    
    // Erstelle neuen Skill-Eintrag
    const skillData = {
      id: `${employeeId}_${skillId}_${Date.now()}`, // Eindeutige ID
      employeeId,
      skillId,
      skillName,
      level: parseInt(level),
      timestamp: new Date().toISOString()
    };
    
    // Füge den Skill zum Array hinzu
    dossierData.skills.push(skillData);
    
    // Speichere das aktualisierte Dossier
    await dossierRef.set(dossierData, { merge: true });
    
    // console.log entfernt
    // console.log entfernt
    // console.log entfernt
    
    res.json({
      success: true,
      id: skillData.id,
      message: 'Skill erfolgreich zugewiesen'
    });
    
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

app.get('/api/employee-skills/:employeeId', requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    // console.log entfernt
    
    // Lade das employeeDossier
    const dossierDoc = await db.collection('employeeDossiers').doc(employeeId).get();
    
    if (!dossierDoc.exists) {
      // console.log entfernt
      return res.json([]);
    }
    
    const dossierData = dossierDoc.data();
    const skills = Array.isArray(dossierData.skills) ? dossierData.skills : [];
    
    // console.log entfernt
    res.json(skills);
    
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

app.put('/api/employee-skills/:employeeId/:skillId', requireAuth, async (req, res) => {
  try {
    const { employeeId, skillId } = req.params;
    const { level } = req.body;
    
    if (!level || level < 1 || level > 5) {
      return res.status(400).json({ error: 'Level muss zwischen 1 und 5 liegen' });
    }
    
    // Lade das employeeDossier
    const dossierRef = db.collection('employeeDossiers').doc(employeeId);
    const dossierDoc = await dossierRef.get();
    
    if (!dossierDoc.exists) {
      return res.status(404).json({ error: 'Mitarbeiter-Dossier nicht gefunden' });
    }
    
    const dossierData = dossierDoc.data();
    const skills = dossierData.skills || [];
    
    // Finde den Skill im Array
    const skillIndex = skills.findIndex(skill => skill.skillId === skillId);
    
    if (skillIndex === -1) {
      return res.status(404).json({ error: 'Skill-Zuweisung nicht gefunden' });
    }
    
    // Aktualisiere das Level
    skills[skillIndex].level = parseInt(level);
    skills[skillIndex].timestamp = new Date().toISOString();
    
    // Speichere die Änderungen
    await dossierRef.update({ skills: skills });
    
    // console.log entfernt
    
    res.json({
      success: true,
      message: 'Skill-Level erfolgreich aktualisiert'
    });
    
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

app.delete('/api/employee-skills/:employeeId/:skillId', requireAuth, async (req, res) => {
  try {
    const { employeeId, skillId } = req.params;
    
    // Lade das employeeDossier
    const dossierRef = db.collection('employeeDossiers').doc(employeeId);
    const dossierDoc = await dossierRef.get();
    
    if (!dossierDoc.exists) {
      return res.status(404).json({ error: 'Mitarbeiter-Dossier nicht gefunden' });
    }
    
    const dossierData = dossierDoc.data();
    const skills = dossierData.skills || [];
    
    // Finde den Skill im Array
    const skillIndex = skills.findIndex(skill => skill.skillId === skillId);
    
    if (skillIndex === -1) {
      return res.status(404).json({ error: 'Skill-Zuweisung nicht gefunden' });
    }
    
    // Entferne den Skill aus dem Array
    skills.splice(skillIndex, 1);
    
    // Speichere die Änderungen
    await dossierRef.update({ skills: skills });
    
    // console.log entfernt
    
    res.json({
      success: true,
      message: 'Skill erfolgreich entfernt'
    });
    
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// ==========================================
// ROLES MANAGEMENT API ENDPOINTS
// ==========================================

// GET /api/roles - Alle Rollen laden
app.get('/api/roles', requireAuth, async (req, res) => {
  try {
    // console.log entfernt
    
    const rolesSnap = await db.collection('roles')
      .where('isActive', '==', true)
      .get();
    
    const roles = rolesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sortiere Rollen nach Name (im Code, da Firebase Index benötigt)
    roles.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    // console.log entfernt
    res.json(roles);
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Fehler beim Laden der Rollen' });
  }
});

// POST /api/roles - Neue Rolle erstellen
app.post('/api/roles', requireAuth, async (req, res) => {
  try {
    const { name, description, category } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Rollenname ist erforderlich' });
    }
    
    // console.log entfernt
    
    // Prüfe ob Rolle bereits existiert
    const existingRoleSnap = await db.collection('roles')
      .where('name', '==', name.trim())
      .where('isActive', '==', true)
      .get();
    
    if (!existingRoleSnap.empty) {
      return res.status(400).json({ error: 'Eine Rolle mit diesem Namen existiert bereits' });
    }
    
    const roleData = {
      name: name.trim(),
      description: description?.trim() || '',
      category: category?.trim() || '',
      createdAt: new Date(),
      isActive: true
    };
    
    const docRef = await db.collection('roles').add(roleData);
    
    // console.log entfernt
    
    res.json({
      success: true,
      id: docRef.id,
      role: { id: docRef.id, ...roleData }
    });
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Fehler beim Erstellen der Rolle' });
  }
});

// PUT /api/roles/:id - Rolle bearbeiten
app.put('/api/roles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Rollenname ist erforderlich' });
    }
    
    // console.log entfernt
    
    // Prüfe ob Rolle existiert
    const roleDoc = await db.collection('roles').doc(id).get();
    if (!roleDoc.exists) {
      return res.status(404).json({ error: 'Rolle nicht gefunden' });
    }
    
    // Prüfe ob anderer Name bereits existiert
    const existingRoleSnap = await db.collection('roles')
      .where('name', '==', name.trim())
      .where('isActive', '==', true)
      .get();
    
    const hasConflict = existingRoleSnap.docs.some(doc => doc.id !== id);
    if (hasConflict) {
      return res.status(400).json({ error: 'Eine andere Rolle mit diesem Namen existiert bereits' });
    }
    
    const updateData = {
      name: name.trim(),
      description: description?.trim() || '',
      category: category?.trim() || '',
      updatedAt: new Date()
    };
    
    await db.collection('roles').doc(id).update(updateData);
    
    // console.log entfernt
    
    res.json({
      success: true,
      role: { id, ...roleDoc.data(), ...updateData }
    });
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Fehler beim Bearbeiten der Rolle' });
  }
});

// DELETE /api/roles/:id - Rolle löschen (soft delete)
app.delete('/api/roles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // console.log entfernt
    
    // Prüfe ob Rolle existiert
    const roleDoc = await db.collection('roles').doc(id).get();
    if (!roleDoc.exists) {
      return res.status(404).json({ error: 'Rolle nicht gefunden' });
    }
    
    const roleName = roleDoc.data().name;
    
    // Soft Delete - markiere als inaktiv
    await db.collection('roles').doc(id).update({
      isActive: false,
      deletedAt: new Date()
    });
    
    // console.log entfernt
    
    res.json({
      success: true,
      message: `Rolle "${roleName}" wurde gelöscht`
    });
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Fehler beim Löschen der Rolle' });
  }
});

// ==========================================
// TECHNICAL SKILLS MANAGEMENT API ENDPOINTS
// ==========================================

// GET /api/technical-skills - Alle Technical Skills laden
app.get('/api/technical-skills', requireAuth, async (req, res) => {
  try {
    // console.log entfernt
    
    const skillsSnap = await db.collection('technicalSkills')
      .where('isActive', '==', true)
      .get();
    
    const skills = skillsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // console.log entfernt
    
    res.json(skills);
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Fehler beim Laden der Technical Skills' });
  }
});

// POST /api/technical-skills - Neuen Technical Skill erstellen
app.post('/api/technical-skills', requireAuth, async (req, res) => {
  try {
    const { name, description, category, categoryId } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Skill-Name ist erforderlich' });
    }
    
    // console.log entfernt
    
    // Prüfe ob Skill bereits existiert
    const existingSkillSnap = await db.collection('technicalSkills')
      .where('name', '==', name.trim())
      .where('isActive', '==', true)
      .get();
    
    if (!existingSkillSnap.empty) {
      return res.status(400).json({ error: 'Ein Skill mit diesem Namen existiert bereits' });
    }
    
    // Erstelle neuen Skill
    const newSkill = {
      name: name.trim(),
      description: description?.trim() || '',
      category: category?.trim() || '', // Legacy field - keep for backward compatibility
      categoryId: categoryId?.trim() || null, // New field for category reference
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('technicalSkills').add(newSkill);
    
    // console.log entfernt
    
    res.json({
      success: true,
      skill: { id: docRef.id, ...newSkill }
    });
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Fehler beim Erstellen des Technical Skills' });
  }
});

// PUT /api/technical-skills/:id - Technical Skill bearbeiten
app.put('/api/technical-skills/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, categoryId } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Skill-Name ist erforderlich' });
    }
    
    // console.log entfernt
    
    // Prüfe ob Skill existiert
    const skillDoc = await db.collection('technicalSkills').doc(id).get();
    if (!skillDoc.exists) {
      return res.status(404).json({ error: 'Technical Skill nicht gefunden' });
    }
    
    // Prüfe ob anderer Name bereits existiert
    const existingSkillSnap = await db.collection('technicalSkills')
      .where('name', '==', name.trim())
      .where('isActive', '==', true)
      .get();
    
    const conflictingSkills = existingSkillSnap.docs.filter(doc => doc.id !== id);
    if (conflictingSkills.length > 0) {
      return res.status(400).json({ error: 'Ein Skill mit diesem Namen existiert bereits' });
    }
    
    // Update Skill
    const updatedSkill = {
      name: name.trim(),
      description: description?.trim() || '',
      category: category?.trim() || '', // Legacy field - keep for backward compatibility
      categoryId: categoryId?.trim() || null, // New field for category reference
      updatedAt: new Date()
    };
    
    await db.collection('technicalSkills').doc(id).update(updatedSkill);
    
    // console.log entfernt
    
    res.json({
      success: true,
      skill: { id, ...skillDoc.data(), ...updatedSkill }
    });
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Fehler beim Bearbeiten des Technical Skills' });
  }
});

// DELETE /api/technical-skills/:id - Technical Skill löschen (soft delete)
app.delete('/api/technical-skills/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // console.log entfernt
    
    // Prüfe ob Skill existiert
    const skillDoc = await db.collection('technicalSkills').doc(id).get();
    if (!skillDoc.exists) {
      return res.status(404).json({ error: 'Technical Skill nicht gefunden' });
    }
    
    const skillName = skillDoc.data().name;
    
    // Soft Delete - markiere als inaktiv
    await db.collection('technicalSkills').doc(id).update({
      isActive: false,
      deletedAt: new Date()
    });
    
    // console.log entfernt
    
    res.json({
      success: true,
      message: `Technical Skill "${skillName}" wurde gelöscht`
    });
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Fehler beim Löschen des Technical Skills' });
  }
});

// ==========================================
// TECHNICAL SKILL CATEGORIES API ENDPOINTS
// ==========================================

// GET /api/technical-skill-categories - Alle Kategorien laden
app.get('/api/technical-skill-categories', requireAuth, async (req, res) => {
  try {
    const categoriesSnap = await db.collection('technicalSkillCategories')
      .where('isActive', '==', true)
      .get();
    
    const categories = categoriesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sortiere Kategorien nach Name (im Code, da Firebase Index benötigt)
    categories.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    res.json(categories);
  } catch (error) {
    console.error('Error loading technical skill categories:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Kategorien', details: error.message });
  }
});

// POST /api/technical-skill-categories - Neue Kategorie erstellen
app.post('/api/technical-skill-categories', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Kategorie-Name ist erforderlich' });
    }
    
    // Prüfen ob Kategorie bereits existiert
    const existingSnap = await db.collection('technicalSkillCategories')
      .where('name', '==', name.trim())
      .where('isActive', '==', true)
      .get();
    
    if (!existingSnap.empty) {
      return res.status(409).json({ error: 'Eine Kategorie mit diesem Namen existiert bereits' });
    }
    
    const categoryData = {
      name: name.trim(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('technicalSkillCategories').add(categoryData);
    
    res.json({
      success: true,
      category: {
        id: docRef.id,
        ...categoryData
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Erstellen der Kategorie' });
  }
});

// PUT /api/technical-skill-categories/:id - Kategorie bearbeiten
app.put('/api/technical-skill-categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Kategorie-Name ist erforderlich' });
    }
    
    // Prüfen ob Kategorie existiert
    const categoryDoc = await db.collection('technicalSkillCategories').doc(id).get();
    if (!categoryDoc.exists) {
      return res.status(404).json({ error: 'Kategorie nicht gefunden' });
    }
    
    // Prüfen ob Name bereits von anderer Kategorie verwendet wird
    const existingSnap = await db.collection('technicalSkillCategories')
      .where('name', '==', name.trim())
      .where('isActive', '==', true)
      .get();
    
    const duplicateExists = existingSnap.docs.some(doc => doc.id !== id);
    if (duplicateExists) {
      return res.status(409).json({ error: 'Eine andere Kategorie mit diesem Namen existiert bereits' });
    }
    
    const updateData = {
      name: name.trim(),
      updatedAt: new Date()
    };
    
    await db.collection('technicalSkillCategories').doc(id).update(updateData);
    
    res.json({
      success: true,
      message: 'Kategorie wurde erfolgreich aktualisiert'
    });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Bearbeiten der Kategorie' });
  }
});

// DELETE /api/technical-skill-categories/:id - Kategorie löschen (soft delete)
app.delete('/api/technical-skill-categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prüfen ob Kategorie existiert
    const categoryDoc = await db.collection('technicalSkillCategories').doc(id).get();
    if (!categoryDoc.exists) {
      return res.status(404).json({ error: 'Kategorie nicht gefunden' });
    }
    
    const categoryData = categoryDoc.data();
    const categoryName = categoryData.name;
    
    // Prüfen ob Skills diese Kategorie verwenden
    const skillsSnap = await db.collection('technicalSkills')
      .where('categoryId', '==', id)
      .where('isActive', '==', true)
      .get();
    
    if (!skillsSnap.empty) {
      return res.status(409).json({ 
        error: `Kategorie "${categoryName}" kann nicht gelöscht werden, da sie von ${skillsSnap.size} Skills verwendet wird` 
      });
    }
    
    // Soft delete
    await db.collection('technicalSkillCategories').doc(id).update({
      isActive: false,
      deletedAt: new Date()
    });
    
    res.json({
      success: true,
      message: `Kategorie "${categoryName}" wurde gelöscht`
    });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen der Kategorie' });
  }
});

// ==========================================
// TECHNICAL SKILLS BULK IMPORT API ENDPOINTS
// ==========================================

// POST /api/technical-skills/bulk-import - Excel-Import für Skills und Kategorien
app.post('/api/technical-skills/bulk-import', requireAuth, async (req, res) => {
  try {
    const { data } = req.body; // Array von { category: string, skill: string }
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Keine gültigen Daten zum Import gefunden' });
    }
    
    const results = {
      categoriesCreated: 0,
      skillsCreated: 0,
      skillsIgnored: 0,
      errors: []
    };
    
    // Batch für bessere Performance
    const batch = db.batch();
    const processedCategories = new Map(); // name -> id
    const processedSkills = new Set(); // categoryId:skillName
    
    // Bestehende Kategorien laden
    const existingCategoriesSnap = await db.collection('technicalSkillCategories')
      .where('isActive', '==', true)
      .get();
    
    existingCategoriesSnap.forEach(doc => {
      processedCategories.set(doc.data().name, doc.id);
    });
    
    // Bestehende Skills laden
    const existingSkillsSnap = await db.collection('technicalSkills')
      .where('isActive', '==', true)
      .get();
    
    existingSkillsSnap.forEach(doc => {
      const skillData = doc.data();
      if (skillData.categoryId) {
        processedSkills.add(`${skillData.categoryId}:${skillData.name}`);
      }
    });
    
    for (const item of data) {
      try {
        const categoryName = item.category?.trim();
        const skillName = item.skill?.trim();
        
        // Validierung
        if (!categoryName || !skillName) {
          results.errors.push(`Ungültige Daten: Kategorie="${categoryName}", Skill="${skillName}"`);
          continue;
        }
        
        // Kategorie erstellen oder ID holen
        let categoryId = processedCategories.get(categoryName);
        if (!categoryId) {
          // Neue Kategorie erstellen
          const categoryRef = db.collection('technicalSkillCategories').doc();
          categoryId = categoryRef.id;
          
          batch.set(categoryRef, {
            name: categoryName,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          processedCategories.set(categoryName, categoryId);
          results.categoriesCreated++;
        }
        
        // Skill erstellen (nur wenn nicht bereits in dieser Kategorie vorhanden)
        const skillKey = `${categoryId}:${skillName}`;
        if (processedSkills.has(skillKey)) {
          results.skillsIgnored++;
          continue;
        }
        
        // Neuen Skill erstellen
        const skillRef = db.collection('technicalSkills').doc();
        batch.set(skillRef, {
          name: skillName,
          categoryId: categoryId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        processedSkills.add(skillKey);
        results.skillsCreated++;
        
      } catch (itemError) {
        results.errors.push(`Fehler bei Item: ${JSON.stringify(item)} - ${itemError.message}`);
      }
    }
    
    // Batch ausführen
    await batch.commit();
    
    res.json({
      success: true,
      results: results
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Bulk-Import der Technical Skills' });
  }
});

// ==========================================
// SOFT SKILLS API ENDPOINTS
// ==========================================

// GET /api/soft-skills - Alle Soft Skills laden
app.get('/api/soft-skills', requireAuth, async (req, res) => {
  try {
    const skillsSnap = await db.collection('softSkills')
      .where('isActive', '==', true)
      .get();
    
    const skills = skillsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(skills);
  } catch (error) {
    console.error('Error loading soft skills:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Soft Skills' });
  }
});

// POST /api/soft-skills - Neuen Soft Skill erstellen
app.post('/api/soft-skills', requireAuth, async (req, res) => {
  try {
    const { name, description, category, categoryId } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Skill-Name ist erforderlich' });
    }
    
    if (!categoryId) {
      return res.status(400).json({ error: 'Kategorie ist erforderlich' });
    }
    
    // Prüfe ob Skill bereits existiert
    const existingSkillSnap = await db.collection('softSkills')
      .where('name', '==', name.trim())
      .where('isActive', '==', true)
      .get();
    
    if (!existingSkillSnap.empty) {
      return res.status(409).json({ error: 'Ein Soft Skill mit diesem Namen existiert bereits' });
    }
    
    const newSkill = {
      name: name.trim(),
      description: description?.trim() || '',
      category: category || '',
      categoryId: categoryId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('softSkills').add(newSkill);
    
    res.json({
      success: true,
      skill: {
        id: docRef.id,
        ...newSkill
      }
    });
  } catch (error) {
    console.error('Error creating soft skill:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Soft Skills' });
  }
});

// PUT /api/soft-skills/:id - Soft Skill bearbeiten
app.put('/api/soft-skills/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, categoryId } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Skill-Name ist erforderlich' });
    }
    
    if (!categoryId) {
      return res.status(400).json({ error: 'Kategorie ist erforderlich' });
    }
    
    // Prüfe ob Skill existiert
    const skillDoc = await db.collection('softSkills').doc(id).get();
    if (!skillDoc.exists) {
      return res.status(404).json({ error: 'Soft Skill nicht gefunden' });
    }
    
    // Prüfe ob anderer Name bereits existiert
    const existingSkillSnap = await db.collection('softSkills')
      .where('name', '==', name.trim())
      .where('isActive', '==', true)
      .get();
    
    const conflictingSkills = existingSkillSnap.docs.filter(doc => doc.id !== id);
    if (conflictingSkills.length > 0) {
      return res.status(409).json({ error: 'Ein Soft Skill mit diesem Namen existiert bereits' });
    }
    
    const updatedSkill = {
      name: name.trim(),
      description: description?.trim() || '',
      category: category || '',
      categoryId: categoryId,
      updatedAt: new Date()
    };
    
    await db.collection('softSkills').doc(id).update(updatedSkill);
    
    res.json({
      success: true,
      message: 'Soft Skill wurde erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating soft skill:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Soft Skills' });
  }
});

// DELETE /api/soft-skills/:id - Soft Skill löschen (soft delete)
app.delete('/api/soft-skills/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prüfe ob Skill existiert
    const skillDoc = await db.collection('softSkills').doc(id).get();
    if (!skillDoc.exists) {
      return res.status(404).json({ error: 'Soft Skill nicht gefunden' });
    }
    
    const skillName = skillDoc.data().name;
    
    // Soft Delete - markiere als inaktiv
    await db.collection('softSkills').doc(id).update({
      isActive: false,
      deletedAt: new Date()
    });
    
    res.json({
      success: true,
      message: `Soft Skill "${skillName}" wurde erfolgreich gelöscht`
    });
  } catch (error) {
    console.error('Error deleting soft skill:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Soft Skills' });
  }
});

// ==========================================
// SOFT SKILL CATEGORIES API ENDPOINTS
// ==========================================

// GET /api/soft-skill-categories - Alle Kategorien laden
app.get('/api/soft-skill-categories', requireAuth, async (req, res) => {
  try {
    const categoriesSnap = await db.collection('softSkillCategories')
      .where('isActive', '==', true)
      .get();
    
    const categories = categoriesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(categories);
  } catch (error) {
    console.error('Error loading soft skill categories:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Kategorien' });
  }
});

// POST /api/soft-skill-categories - Neue Kategorie erstellen
app.post('/api/soft-skill-categories', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Kategorie-Name ist erforderlich' });
    }
    
    // Prüfen ob Kategorie bereits existiert
    const existingSnap = await db.collection('softSkillCategories')
      .where('name', '==', name.trim())
      .where('isActive', '==', true)
      .get();
    
    if (!existingSnap.empty) {
      return res.status(409).json({ error: 'Eine Kategorie mit diesem Namen existiert bereits' });
    }
    
    const categoryData = {
      name: name.trim(),
      isActive: true,
      createdAt: new Date()
    };
    
    const docRef = await db.collection('softSkillCategories').add(categoryData);
    
    res.json({
      success: true,
      category: {
        id: docRef.id,
        ...categoryData
      }
    });
  } catch (error) {
    console.error('Error creating soft skill category:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der Kategorie' });
  }
});

// PUT /api/soft-skill-categories/:id - Kategorie bearbeiten
app.put('/api/soft-skill-categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Kategorie-Name ist erforderlich' });
    }
    
    // Prüfen ob Kategorie existiert
    const categoryDoc = await db.collection('softSkillCategories').doc(id).get();
    if (!categoryDoc.exists) {
      return res.status(404).json({ error: 'Kategorie nicht gefunden' });
    }
    
    // Prüfen ob Name bereits von anderer Kategorie verwendet wird
    const existingSnap = await db.collection('softSkillCategories')
      .where('name', '==', name.trim())
      .where('isActive', '==', true)
      .get();
    
    const duplicateExists = existingSnap.docs.some(doc => doc.id !== id);
    if (duplicateExists) {
      return res.status(409).json({ error: 'Eine Kategorie mit diesem Namen existiert bereits' });
    }
    
    const updateData = {
      name: name.trim(),
      updatedAt: new Date()
    };
    
    await db.collection('softSkillCategories').doc(id).update(updateData);
    
    res.json({
      success: true,
      message: 'Kategorie wurde erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating soft skill category:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Kategorie' });
  }
});

// DELETE /api/soft-skill-categories/:id - Kategorie löschen (soft delete)
app.delete('/api/soft-skill-categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prüfen ob Kategorie existiert
    const categoryDoc = await db.collection('softSkillCategories').doc(id).get();
    if (!categoryDoc.exists) {
      return res.status(404).json({ error: 'Kategorie nicht gefunden' });
    }
    
    const categoryData = categoryDoc.data();
    const categoryName = categoryData.name;
    
    // Prüfen ob Skills diese Kategorie verwenden
    const skillsSnap = await db.collection('softSkills')
      .where('categoryId', '==', id)
      .where('isActive', '==', true)
      .get();
    
    if (!skillsSnap.empty) {
      return res.status(400).json({ 
        error: `Kategorie "${categoryName}" kann nicht gelöscht werden, da sie von ${skillsSnap.size} Soft Skills verwendet wird` 
      });
    }
    
    // Soft delete
    await db.collection('softSkillCategories').doc(id).update({
      isActive: false,
      deletedAt: new Date()
    });
    
    res.json({
      success: true,
      message: `Kategorie "${categoryName}" wurde erfolgreich gelöscht`
    });
  } catch (error) {
    console.error('Error deleting soft skill category:', error);
    res.status(500).json({ error: 'Fehler beim Löschen der Kategorie' });
  }
});

// ==========================================
// SOFT SKILLS BULK IMPORT API ENDPOINT
// ==========================================

// POST /api/soft-skills/bulk-import - Excel-Import für Skills und Kategorien
app.post('/api/soft-skills/bulk-import', requireAuth, async (req, res) => {
  try {
    const { skills } = req.body; // Array von { category: string, skill: string }
    
    if (!Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ error: 'Keine gültigen Daten zum Import gefunden' });
    }
    
    let categoriesCreated = 0;
    let skillsCreated = 0;
    let skillsIgnored = 0;
    const errors = [];
    
    // Maps für bereits verarbeitete Kategorien und Skills
    const processedCategories = new Map(); // name -> id
    const processedSkills = new Set(); // name
    
    // Bestehende Kategorien laden
    const existingCategoriesSnap = await db.collection('softSkillCategories')
      .where('isActive', '==', true)
      .get();
    
    existingCategoriesSnap.forEach(doc => {
      processedCategories.set(doc.data().name, doc.id);
    });
    
    // Bestehende Skills laden
    const existingSkillsSnap = await db.collection('softSkills')
      .where('isActive', '==', true)
      .get();
    
    existingSkillsSnap.forEach(doc => {
      const skillData = doc.data();
      processedSkills.add(skillData.name);
    });
    
    // Batch für alle Operationen
    const batch = db.batch();
    
    // Skills verarbeiten
    for (const item of skills) {
      try {
        const categoryName = item.category?.trim();
        const skillName = item.skill?.trim();
        
        if (!categoryName || !skillName) {
          errors.push(`Übersprungen: Kategorie oder Skill fehlt`);
          continue;
        }
        
        // Kategorie verarbeiten
        let categoryId = processedCategories.get(categoryName);
        if (!categoryId) {
          // Neue Kategorie erstellen
          const categoryRef = db.collection('softSkillCategories').doc();
          categoryId = categoryRef.id;
          
          batch.set(categoryRef, {
            name: categoryName,
            isActive: true,
            createdAt: new Date()
          });
          
          processedCategories.set(categoryName, categoryId);
          categoriesCreated++;
        }
        
        // Skill verarbeiten
        if (processedSkills.has(skillName)) {
          skillsIgnored++;
          continue;
        }
        
        // Neuen Skill erstellen
        const skillRef = db.collection('softSkills').doc();
        batch.set(skillRef, {
          name: skillName,
          categoryId: categoryId,
          category: categoryName, // Legacy field
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        processedSkills.add(skillName);
        skillsCreated++;
        
      } catch (error) {
        errors.push(`Fehler bei Skill "${item.skill}": ${error.message}`);
      }
    }
    
    // Batch ausführen
    if (categoriesCreated > 0 || skillsCreated > 0) {
      await batch.commit();
    }
    
    res.json({
      categoriesCreated,
      skillsCreated,
      skillsIgnored,
      errors
    });
    
  } catch (error) {
    console.error('Error in soft skills bulk import:', error);
    res.status(500).json({ error: 'Fehler beim Bulk-Import der Soft Skills' });
  }
});

// ==========================================
// EMPLOYEE SOFT SKILLS API ENDPOINTS
// ==========================================

// GET /api/employees/:employeeId/soft-skills - Zugewiesene Soft Skills eines Mitarbeiters laden
app.get('/api/employees/:employeeId/soft-skills', requireAuth, async (req, res) => {
  try {
    const { employeeId: rawEmployeeId } = req.params;
    const employeeId = decodeURIComponent(rawEmployeeId);
    
    // Lade das employeeDossier
    const dossierRef = db.collection('employeeDossiers').doc(employeeId);
    const dossierDoc = await dossierRef.get();
    
    if (!dossierDoc.exists) {
      return res.json([]); // Kein Dossier = keine Skills
    }
    
    const dossierData = dossierDoc.data();
    const assignedSoftSkills = dossierData.assignedSoftSkills || [];
    
    res.json(assignedSoftSkills);
  } catch (error) {
    console.error('Error loading employee soft skills:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Soft Skills' });
  }
});

// POST /api/employees/:employeeId/soft-skills - Soft Skills einem Mitarbeiter zuweisen
app.post('/api/employees/:employeeId/soft-skills', requireAuth, async (req, res) => {
  try {
    const { employeeId: rawEmployeeId } = req.params;
    const employeeId = decodeURIComponent(rawEmployeeId);
    const { assignments } = req.body; // Array von { skillId, level }
    
    console.log('🎯 Soft Skills Assignment Request:', { employeeId, assignments });
    
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: 'Keine gültigen Skill-Zuweisungen gefunden' });
    }
    
    // Validiere alle Assignments
    for (const assignment of assignments) {
      if (!assignment.skillId || !assignment.level || assignment.level < 1 || assignment.level > 5) {
        return res.status(400).json({ error: 'Ungültige Skill-Zuweisung: skillId und level (1-5) sind erforderlich' });
      }
    }
    
    // Lade alle Skills um Namen zu bekommen
    const skillIds = assignments.map(a => a.skillId);
    console.log('🔍 Loading skills for IDs:', skillIds);
    
    const skillsSnap = await db.collection('softSkills')
      .where(admin.firestore.FieldPath.documentId(), 'in', skillIds)
      .get();
    
    console.log('📊 Found skills:', skillsSnap.size);
    
    const skillsMap = new Map();
    skillsSnap.forEach(doc => {
      console.log('📋 Skill found:', doc.id, doc.data().name);
      skillsMap.set(doc.id, doc.data());
    });
    
    // Erstelle Assignment-Objekte
    const assignedSoftSkills = assignments.map(assignment => {
      const skillData = skillsMap.get(assignment.skillId);
      if (!skillData) {
        console.error('❌ Skill not found:', assignment.skillId, 'Available skills:', Array.from(skillsMap.keys()));
        throw new Error(`Soft Skill mit ID ${assignment.skillId} nicht gefunden`);
      }
      
      console.log('✅ Creating assignment for skill:', skillData.name);
      return {
        id: `${employeeId}_${assignment.skillId}_${Date.now()}`,
        skillId: assignment.skillId,
        skillName: skillData.name,
        level: assignment.level,
        assignedAt: new Date(),
        lastUpdated: new Date()
      };
    });
    
    // Lade oder erstelle employeeDossier
    const dossierRef = db.collection('employeeDossiers').doc(employeeId);
    const dossierDoc = await dossierRef.get();
    
    if (dossierDoc.exists) {
      // Aktualisiere bestehendes Dossier
      const existingData = dossierDoc.data();
      const existingAssignedSoftSkills = existingData.assignedSoftSkills || [];
      
      // Entferne alte Zuweisungen für die gleichen Skills
      const filteredExisting = existingAssignedSoftSkills.filter(existing => 
        !skillIds.includes(existing.skillId)
      );
      
      // Füge neue Zuweisungen hinzu
      const updatedAssignedSoftSkills = [...filteredExisting, ...assignedSoftSkills];
      
      await dossierRef.update({
        assignedSoftSkills: updatedAssignedSoftSkills,
        updatedAt: new Date()
      });
    } else {
      // Erstelle neues Dossier
      await dossierRef.set({
        id: employeeId,
        assignedSoftSkills: assignedSoftSkills,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    res.json({
      success: true,
      message: `${assignedSoftSkills.length} Soft Skills erfolgreich zugewiesen`,
      assignedSkills: assignedSoftSkills
    });
  } catch (error) {
    console.error('Error assigning soft skills:', error);
    res.status(500).json({ error: 'Fehler beim Zuweisen der Soft Skills' });
  }
});

// ==========================================
// ROLES API ENDPOINTS
// ==========================================

// GET /api/roles - Alle Rollen laden
app.get('/api/roles', requireAuth, async (req, res) => {
  try {
    const rolesSnap = await db.collection('roles')
      .where('isActive', '==', true)
      .orderBy('name')
      .get();
    
    const roles = [];
    rolesSnap.forEach(doc => {
      roles.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Rollen' });
  }
});

// POST /api/roles - Neue Rolle erstellen
app.post('/api/roles', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Rollen-Name ist erforderlich' });
    }
    
    // Prüfen ob Rolle bereits existiert
    const existingSnap = await db.collection('roles')
      .where('name', '==', name.trim())
      .where('isActive', '==', true)
      .get();
    
    if (!existingSnap.empty) {
      return res.status(409).json({ error: 'Eine Rolle mit diesem Namen existiert bereits' });
    }
    
    const roleData = {
      name: name.trim(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('roles').add(roleData);
    
    res.json({
      success: true,
      role: {
        id: docRef.id,
        ...roleData
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Erstellen der Rolle' });
  }
});

// PUT /api/roles/:id - Rolle bearbeiten
app.put('/api/roles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Rollen-Name ist erforderlich' });
    }
    
    // Prüfen ob Rolle existiert
    const roleDoc = await db.collection('roles').doc(id).get();
    if (!roleDoc.exists) {
      return res.status(404).json({ error: 'Rolle nicht gefunden' });
    }
    
    // Prüfen ob Name bereits von anderer Rolle verwendet wird
    const existingSnap = await db.collection('roles')
      .where('name', '==', name.trim())
      .where('isActive', '==', true)
      .get();
    
    const duplicateExists = existingSnap.docs.some(doc => doc.id !== id);
    if (duplicateExists) {
      return res.status(409).json({ error: 'Eine andere Rolle mit diesem Namen existiert bereits' });
    }
    
    const updateData = {
      name: name.trim(),
      updatedAt: new Date()
    };
    
    await db.collection('roles').doc(id).update(updateData);
    
    res.json({
      success: true,
      message: 'Rolle wurde erfolgreich aktualisiert'
    });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Bearbeiten der Rolle' });
  }
});

// DELETE /api/roles/:id - Rolle löschen (soft delete)
app.delete('/api/roles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prüfen ob Rolle existiert
    const roleDoc = await db.collection('roles').doc(id).get();
    if (!roleDoc.exists) {
      return res.status(404).json({ error: 'Rolle nicht gefunden' });
    }
    
    const roleData = roleDoc.data();
    const roleName = roleData.name;
    
    // Prüfen ob Tasks diese Rolle verwenden
    const tasksSnap = await db.collection('roleTasks')
      .where('roleId', '==', id)
      .where('isActive', '==', true)
      .get();
    
    if (!tasksSnap.empty) {
      return res.status(409).json({ 
        error: `Rolle "${roleName}" kann nicht gelöscht werden, da sie von ${tasksSnap.size} Tätigkeiten verwendet wird` 
      });
    }
    
    // Soft delete
    await db.collection('roles').doc(id).update({
      isActive: false,
      deletedAt: new Date()
    });
    
    res.json({
      success: true,
      message: `Rolle "${roleName}" wurde gelöscht`
    });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen der Rolle' });
  }
});



// ==========================================
// ROLES BULK IMPORT API ENDPOINTS
// ==========================================

// POST /api/roles/bulk-import - Excel-Import für Rollen und Tätigkeiten
app.post('/api/roles/bulk-import', requireAuth, async (req, res) => {
  try {
    const { data } = req.body; // Array von { category: string, role: string, task: string, description: string, outputs: string }
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Keine gültigen Daten zum Import gefunden' });
    }
    
    const results = {
      categoriesCreated: 0,
      rolesCreated: 0,
      tasksCreated: 0,
      tasksIgnored: 0,
      errors: []
    };
    
    // Batch für bessere Performance
    const batch = db.batch();
    const processedCategories = new Map(); // name -> id
    const processedRoles = new Map(); // categoryId:roleName -> id
    const processedTasks = new Set(); // roleId:taskName
    
    // Bestehende Kategorien laden
    const existingCategoriesSnap = await db.collection('roleCategories')
      .where('isActive', '==', true)
      .get();
    
    existingCategoriesSnap.forEach(doc => {
      processedCategories.set(doc.data().name, doc.id);
    });
    
    // Bestehende Rollen laden
    const existingRolesSnap = await db.collection('roles')
      .where('isActive', '==', true)
      .get();
    
    existingRolesSnap.forEach(doc => {
      const roleData = doc.data();
      if (roleData.categoryId) {
        processedRoles.set(`${roleData.categoryId}:${roleData.name}`, doc.id);
      }
    });
    
    // Bestehende Tasks laden
    const existingTasksSnap = await db.collection('roleTasks')
      .where('isActive', '==', true)
      .get();
    
    existingTasksSnap.forEach(doc => {
      const taskData = doc.data();
      if (taskData.roleId) {
        processedTasks.add(`${taskData.roleId}:${taskData.task}`);
      }
    });
    
    for (const item of data) {
      try {
        const categoryName = item.category?.trim();
        const roleName = item.role?.trim();
        const taskName = item.task?.trim();
        const description = item.description?.trim() || '';
        const outputs = item.outputs?.trim() || '';
        
        // Validierung
        if (!categoryName || !roleName || !taskName) {
          results.errors.push(`Ungültige Daten: Kategorie="${categoryName}", Rolle="${roleName}", Tätigkeit="${taskName}"`);
          continue;
        }
        
        // Kategorie erstellen oder ID holen
        let categoryId = processedCategories.get(categoryName);
        if (!categoryId) {
          // Neue Kategorie erstellen
          const categoryRef = db.collection('roleCategories').doc();
          categoryId = categoryRef.id;
          
          batch.set(categoryRef, {
            name: categoryName,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          processedCategories.set(categoryName, categoryId);
          results.categoriesCreated++;
        }
        
        // Rolle erstellen oder ID holen
        const roleKey = `${categoryId}:${roleName}`;
        let roleId = processedRoles.get(roleKey);
        if (!roleId) {
          // Neue Rolle erstellen
          const roleRef = db.collection('roles').doc();
          roleId = roleRef.id;
          
          batch.set(roleRef, {
            name: roleName,
            categoryId: categoryId,
            categoryName: categoryName, // Legacy field
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          processedRoles.set(roleKey, roleId);
          results.rolesCreated++;
        }
        
        // Task erstellen (nur wenn nicht bereits in dieser Rolle vorhanden)
        const taskKey = `${roleId}:${taskName}`;
        if (processedTasks.has(taskKey)) {
          results.tasksIgnored++;
          continue;
        }
        
        // Neue Tätigkeit erstellen
        const taskRef = db.collection('roleTasks').doc();
        batch.set(taskRef, {
          task: taskName,
          description: description,
          outputs: outputs,
          roleId: roleId,
          roleName: roleName, // Legacy field
          categoryId: categoryId,
          categoryName: categoryName, // Legacy field
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        processedTasks.add(taskKey);
        results.tasksCreated++;
        
      } catch (itemError) {
        results.errors.push(`Fehler bei Item: ${JSON.stringify(item)} - ${itemError.message}`);
      }
    }
    
    // Batch ausführen
    await batch.commit();
    
    res.json({
      success: true,
      results: results
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Bulk-Import der Rollen und Tätigkeiten' });
  }
});

// ==========================================
// EMPLOYEE ROLE ASSIGNMENT API ENDPOINTS
// ==========================================

// GET /api/employee-roles/:employeeId - Zugewiesene Rollen eines Mitarbeiters laden
app.get('/api/employee-roles/:employeeId', requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    // console.log entfernt
    
    // Lade das employeeDossier
    const dossierDoc = await db.collection('employeeDossiers').doc(employeeId).get();
    
    if (!dossierDoc.exists) {
      // console.log entfernt
      return res.json([]);
    }
    
    const dossierData = dossierDoc.data();
    const assignedRoles = Array.isArray(dossierData.assignedRoles) ? dossierData.assignedRoles : [];
    
    // console.log entfernt
    res.json(assignedRoles);
    
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// POST /api/employee-roles/:employeeId - Rolle einem Mitarbeiter zuweisen
app.post('/api/employee-roles/:employeeId', requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { roleId, level, categoryId, selectedTasks } = req.body;
    
    if (!roleId || !level || level < 1 || level > 5) {
      return res.status(400).json({ error: 'roleId und level (1-5) sind erforderlich' });
    }
    
    // console.log entfernt
    
    // Lade die Rolle, um den Namen zu bekommen
    const roleDoc = await db.collection('roles').doc(roleId).get();
    if (!roleDoc.exists) {
      return res.status(404).json({ error: 'Rolle nicht gefunden' });
    }
    
    const roleData = roleDoc.data();
    const roleName = roleData.name;
    
    // Lade das employeeDossier
    const dossierRef = db.collection('employeeDossiers').doc(employeeId);
    const dossierDoc = await dossierRef.get();
    
    let dossierData;
    if (dossierDoc.exists) {
      dossierData = dossierDoc.data();
    } else {
      // Erstelle neues Dossier falls es nicht existiert
      dossierData = {
        employeeId: employeeId,
        id: employeeId,
        assignedRoles: []
      };
    }
    
    // Initialisiere assignedRoles Array falls es nicht existiert
    if (!Array.isArray(dossierData.assignedRoles)) {
      dossierData.assignedRoles = [];
    }
    
    // Prüfe ob Rolle bereits zugewiesen ist
    const existingRole = dossierData.assignedRoles.find(role => role.roleId === roleId);
    if (existingRole) {
      return res.status(400).json({ error: 'Diese Rolle ist dem Mitarbeiter bereits zugewiesen' });
    }
    
    // Erstelle neue Rollen-Zuweisung
    const roleAssignment = {
      id: `${employeeId}_${roleId}_${Date.now()}`, // Eindeutige ID
      roleId: roleId,
      roleName: roleName, // Denormalisiert für Performance
      level: parseInt(level),
      categoryId: categoryId || null, // Kategorie-ID (optional)
      selectedTasks: selectedTasks || [], // Ausgewählte Task-IDs (optional)
      assignedAt: new Date(),
      lastUpdated: new Date()
    };
    
    // Füge die Rolle zum Array hinzu
    dossierData.assignedRoles.push(roleAssignment);
    
    // Speichere das aktualisierte Dossier
    await dossierRef.set(dossierData, { merge: true });
    
    // console.log entfernt
    
    res.json({
      success: true,
      id: roleAssignment.id,
      assignment: roleAssignment,
      message: 'Rolle erfolgreich zugewiesen'
    });
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// PUT /api/employee-roles/:employeeId/:assignmentId - Rollen-Level ändern
app.put('/api/employee-roles/:employeeId/:assignmentId', requireAuth, async (req, res) => {
  try {
    const { employeeId, assignmentId } = req.params;
    const { level } = req.body;
    
    if (!level || level < 1 || level > 5) {
      return res.status(400).json({ error: 'level (1-5) ist erforderlich' });
    }
    
    // console.log entfernt
    
    // Lade das employeeDossier
    const dossierRef = db.collection('employeeDossiers').doc(employeeId);
    const dossierDoc = await dossierRef.get();
    
    if (!dossierDoc.exists) {
      return res.status(404).json({ error: 'Mitarbeiter-Dossier nicht gefunden' });
    }
    
    const dossierData = dossierDoc.data();
    if (!Array.isArray(dossierData.assignedRoles)) {
      return res.status(404).json({ error: 'Keine Rollen-Zuweisungen gefunden' });
    }
    
    // Finde die entsprechende Rollen-Zuweisung
    const assignmentIndex = dossierData.assignedRoles.findIndex(role => role.id === assignmentId);
    if (assignmentIndex === -1) {
      return res.status(404).json({ error: 'Rollen-Zuweisung nicht gefunden' });
    }
    
    // Aktualisiere das Level
    dossierData.assignedRoles[assignmentIndex].level = parseInt(level);
    dossierData.assignedRoles[assignmentIndex].lastUpdated = new Date();
    
    // Speichere das aktualisierte Dossier
    await dossierRef.set(dossierData, { merge: true });
    
    const updatedAssignment = dossierData.assignedRoles[assignmentIndex];
    // console.log entfernt
    
    res.json({
      success: true,
      assignment: updatedAssignment,
      message: 'Rollen-Level erfolgreich geändert'
    });
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// DELETE /api/employee-roles/:employeeId/:assignmentId - Rollen-Zuweisung entfernen
app.delete('/api/employee-roles/:employeeId/:assignmentId', requireAuth, async (req, res) => {
  try {
    const { employeeId, assignmentId } = req.params;
    
    // console.log entfernt
    
    // Lade das employeeDossier
    const dossierRef = db.collection('employeeDossiers').doc(employeeId);
    const dossierDoc = await dossierRef.get();
    
    if (!dossierDoc.exists) {
      return res.status(404).json({ error: 'Mitarbeiter-Dossier nicht gefunden' });
    }
    
    const dossierData = dossierDoc.data();
    if (!Array.isArray(dossierData.assignedRoles)) {
      return res.status(404).json({ error: 'Keine Rollen-Zuweisungen gefunden' });
    }
    
    // Finde die entsprechende Rollen-Zuweisung
    const assignmentIndex = dossierData.assignedRoles.findIndex(role => role.id === assignmentId);
    if (assignmentIndex === -1) {
      return res.status(404).json({ error: 'Rollen-Zuweisung nicht gefunden' });
    }
    
    const removedAssignment = dossierData.assignedRoles[assignmentIndex];
    
    // Entferne die Rollen-Zuweisung
    dossierData.assignedRoles.splice(assignmentIndex, 1);
    
    // Speichere das aktualisierte Dossier
    await dossierRef.set(dossierData, { merge: true });
    
    // console.log entfernt
    
    res.json({
      success: true,
      message: `Rollen-Zuweisung "${removedAssignment.roleName}" wurde entfernt`
    });
  } catch (error) {
    // console.error entfernt
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Debug-Endpoint entfernt

// ==========================================
// EMPLOYEE TECHNICAL SKILLS ASSIGNMENT API ENDPOINTS
// ==========================================

// GET /api/employee-technical-skills/:employeeId - Zugewiesene Technical Skills eines Mitarbeiters laden
app.get('/api/employee-technical-skills/:employeeId', requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    // Lade das employeeDossier
    const dossierRef = db.collection('employeeDossiers').doc(employeeId);
    const dossierDoc = await dossierRef.get();
    
    if (!dossierDoc.exists) {
      return res.json([]); // Leeres Array wenn kein Dossier existiert
    }
    
    const dossierData = dossierDoc.data();
    const assignedSkills = dossierData.assignedTechnicalSkills || [];
    
    res.json(assignedSkills);
  } catch (error) {
    console.error('Error fetching employee technical skills:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// POST /api/employee-technical-skills/:employeeId - Technical Skill einem Mitarbeiter zuweisen
app.post('/api/employee-technical-skills/:employeeId', requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { skillId, level, categoryId } = req.body;
    
    if (!skillId || !level || level < 1 || level > 5) {
      return res.status(400).json({ error: 'skillId und level (1-5) sind erforderlich' });
    }
    
    // Lade den Skill um den Namen zu bekommen
    const skillDoc = await db.collection('technicalSkills').doc(skillId).get();
    if (!skillDoc.exists) {
      return res.status(404).json({ error: 'Technical Skill nicht gefunden' });
    }
    
    const skillData = skillDoc.data();
    const skillName = skillData.name;
    
    // Lade oder erstelle das employeeDossier
    const dossierRef = db.collection('employeeDossiers').doc(employeeId);
    const dossierDoc = await dossierRef.get();
    
    let dossierData = {};
    if (dossierDoc.exists) {
      dossierData = dossierDoc.data();
    }
    
    // Initialisiere assignedTechnicalSkills Array falls nicht vorhanden
    if (!dossierData.assignedTechnicalSkills) {
      dossierData.assignedTechnicalSkills = [];
    }
    
    // Prüfe ob Skill bereits zugewiesen ist
    const existingSkillIndex = dossierData.assignedTechnicalSkills.findIndex(
      skill => skill.skillId === skillId
    );
    
    if (existingSkillIndex !== -1) {
      return res.status(400).json({ error: 'Technical Skill ist bereits zugewiesen' });
    }
    
    // Neue Skill-Zuweisung erstellen
    const skillAssignment = {
      id: `${employeeId}_${skillId}_${Date.now()}`,
      skillId: skillId,
      skillName: skillName,
      level: parseInt(level),
      categoryId: categoryId || null,
      assignedAt: new Date(),
      lastUpdated: new Date()
    };
    
    dossierData.assignedTechnicalSkills.push(skillAssignment);
    await dossierRef.set(dossierData, { merge: true });
    
    res.json({ success: true, message: 'Technical Skill erfolgreich zugewiesen' });
  } catch (error) {
    console.error('Error assigning technical skill to employee:', error);
    res.status(500).json({ error: 'Fehler beim Zuweisen des Technical Skills' });
  }
});

// PUT /api/employee-technical-skills/:employeeId/:assignmentId - Technical Skill Level ändern
app.put('/api/employee-technical-skills/:employeeId/:assignmentId', requireAuth, async (req, res) => {
  try {
    const { employeeId, assignmentId } = req.params;
    const { level } = req.body;
    
    if (!level || level < 1 || level > 5) {
      return res.status(400).json({ error: 'Level muss zwischen 1 und 5 liegen' });
    }
    
    // Lade das employeeDossier
    const dossierRef = db.collection('employeeDossiers').doc(employeeId);
    const dossierDoc = await dossierRef.get();
    
    if (!dossierDoc.exists) {
      return res.status(404).json({ error: 'Mitarbeiter-Dossier nicht gefunden' });
    }
    
    const dossierData = dossierDoc.data();
    const assignedSkills = dossierData.assignedTechnicalSkills || [];
    
    // Finde die Skill-Zuweisung
    const skillIndex = assignedSkills.findIndex(skill => skill.id === assignmentId);
    if (skillIndex === -1) {
      return res.status(404).json({ error: 'Technical Skill Zuweisung nicht gefunden' });
    }
    
    // Aktualisiere das Level
    assignedSkills[skillIndex].level = parseInt(level);
    assignedSkills[skillIndex].lastUpdated = new Date();
    
    // Speichere die Änderungen
    await dossierRef.update({
      assignedTechnicalSkills: assignedSkills
    });
    
    res.json({ success: true, message: 'Technical Skill Level erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Error updating technical skill level:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// DELETE /api/employee-technical-skills/:employeeId/:assignmentId - Technical Skill Zuweisung entfernen
app.delete('/api/employee-technical-skills/:employeeId/:assignmentId', requireAuth, async (req, res) => {
  try {
    const { employeeId, assignmentId } = req.params;
    
    // Lade das employeeDossier
    const dossierRef = db.collection('employeeDossiers').doc(employeeId);
    const dossierDoc = await dossierRef.get();
    
    if (!dossierDoc.exists) {
      return res.status(404).json({ error: 'Mitarbeiter-Dossier nicht gefunden' });
    }
    
    const dossierData = dossierDoc.data();
    const assignedSkills = dossierData.assignedTechnicalSkills || [];
    
    // Finde und entferne die Skill-Zuweisung
    const skillIndex = assignedSkills.findIndex(skill => skill.id === assignmentId);
    if (skillIndex === -1) {
      return res.status(404).json({ error: 'Technical Skill Zuweisung nicht gefunden' });
    }
    
    const removedSkill = assignedSkills[skillIndex];
    assignedSkills.splice(skillIndex, 1);
    
    // Speichere die Änderungen
    await dossierRef.update({
      assignedTechnicalSkills: assignedSkills
    });
    
    res.json({ 
      success: true, 
      message: `Technical Skill "${removedSkill.skillName}" erfolgreich entfernt` 
    });
  } catch (error) {
    console.error('Error removing technical skill assignment:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Graceful Shutdown
process.on('SIGINT', async () => {
  // console.log entfernt
  process.exit(0);
});

// ===== ROLE CATEGORIES API =====

// GET /api/role-categories - Alle Kategorien abrufen
app.get('/api/role-categories', requireAuth, async (req, res) => {
  try {
    // Erst prüfen ob Collection existiert, indem wir alle Dokumente laden
    const categoriesSnap = await db.collection('roleCategories').get();
    
    const categories = [];
    categoriesSnap.forEach(doc => {
      const data = doc.data();
      // Nur aktive Kategorien zurückgeben
      if (data.isActive === true) {
        categories.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    // Sortiere im Code statt in der Query
    categories.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching role categories:', error);
    // Wenn Collection nicht existiert, leeres Array zurückgeben
    if (error.code === 5 || error.message.includes('not found')) {
      res.json([]);
    } else {
      res.status(500).json({ error: 'Fehler beim Laden der Kategorien' });
    }
  }
});

// POST /api/role-categories - Neue Kategorie erstellen
app.post('/api/role-categories', requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name ist erforderlich' });
    }
    
    // Prüfen ob Name bereits existiert
    const existingSnap = await db.collection('roleCategories')
      .where('name', '==', name.trim())
      .where('isActive', '==', true)
      .get();
    
    if (!existingSnap.empty) {
      return res.status(400).json({ error: 'Eine Kategorie mit diesem Namen existiert bereits' });
    }
    
    const categoryData = {
      name: name.trim(),
      description: description?.trim() || '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('roleCategories').add(categoryData);
    
    res.json({
      success: true,
      category: {
        id: docRef.id,
        ...categoryData
      }
    });
  } catch (error) {
    console.error('Error creating role category:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der Kategorie' });
  }
});

// PUT /api/role-categories/:id - Kategorie bearbeiten
app.put('/api/role-categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name ist erforderlich' });
    }
    
    // Prüfen ob Name bereits existiert (außer bei der aktuellen Kategorie)
    const existingSnap = await db.collection('roleCategories')
      .where('name', '==', name.trim())
      .where('isActive', '==', true)
      .get();
    
    const existingDoc = existingSnap.docs.find(doc => doc.id !== id);
    if (existingDoc) {
      return res.status(400).json({ error: 'Eine Kategorie mit diesem Namen existiert bereits' });
    }
    
    const updateData = {
      name: name.trim(),
      description: description?.trim() || '',
      updatedAt: new Date()
    };
    
    await db.collection('roleCategories').doc(id).update(updateData);
    
    const updatedDoc = await db.collection('roleCategories').doc(id).get();
    
    res.json({
      success: true,
      category: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error('Error updating role category:', error);
    res.status(500).json({ error: 'Fehler beim Bearbeiten der Kategorie' });
  }
});

// DELETE /api/role-categories/:id - Kategorie löschen
app.delete('/api/role-categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.collection('roleCategories').doc(id).update({
      isActive: false,
      updatedAt: new Date()
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting role category:', error);
    res.status(500).json({ error: 'Fehler beim Löschen der Kategorie' });
  }
});

// POST /api/role-categories/:id/reassign - Kategorie-Inhalte neu zuordnen und löschen
app.post('/api/role-categories/:id/reassign', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { newCategoryId } = req.body;
    
    if (!newCategoryId) {
      return res.status(400).json({ error: 'Neue Kategorie-ID ist erforderlich' });
    }
    
    const batch = db.batch();
    
    // Alle Rollen der Kategorie neu zuordnen
    const rolesSnap = await db.collection('roles')
      .where('categoryId', '==', id)
      .where('isActive', '==', true)
      .get();
    
    rolesSnap.forEach(doc => {
      batch.update(doc.ref, {
        categoryId: newCategoryId,
        updatedAt: new Date()
      });
    });
    
    // Alle Tasks der Kategorie neu zuordnen
    const tasksSnap = await db.collection('roleTasks')
      .where('categoryId', '==', id)
      .where('isActive', '==', true)
      .get();
    
    tasksSnap.forEach(doc => {
      batch.update(doc.ref, {
        categoryId: newCategoryId,
        updatedAt: new Date()
      });
    });
    
    // Kategorie löschen
    const categoryRef = db.collection('roleCategories').doc(id);
    batch.update(categoryRef, {
      isActive: false,
      updatedAt: new Date()
    });
    
    await batch.commit();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error reassigning role category:', error);
    res.status(500).json({ error: 'Fehler bei der Neuzuordnung' });
  }
});

// GET /api/role-tasks - Alle Tasks abrufen (optional gefiltert nach roleId)
app.get('/api/role-tasks', requireAuth, async (req, res) => {
  try {
    const { roleId } = req.query;
    
    let tasksSnap;
    if (roleId) {
      // Nur Tasks für spezifische Rolle laden
      tasksSnap = await db.collection('roleTasks')
        .where('roleId', '==', roleId)
        .where('isActive', '==', true)
        .get();
    } else {
      // Alle Tasks laden
      tasksSnap = await db.collection('roleTasks').get();
    }
    
    const tasks = [];
    tasksSnap.forEach(doc => {
      const data = doc.data();
      // Nur aktive Tasks zurückgeben (wenn nicht schon gefiltert)
      if (!roleId && data.isActive !== true) {
        return; // Skip inaktive Tasks wenn alle Tasks geladen werden
      }
      
      tasks.push({
        id: doc.id,
        ...data
      });
    });
    
    // Sortiere im Code statt in der Query
    tasks.sort((a, b) => (a.task || '').localeCompare(b.task || ''));
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching role tasks:', error);
    // Wenn Collection nicht existiert, leeres Array zurückgeben
    if (error.code === 5 || error.message.includes('not found')) {
      res.json([]);
    } else {
      res.status(500).json({ error: 'Fehler beim Laden der Aufgaben' });
    }
  }
});

// POST /api/role-tasks - Neue Task erstellen
app.post('/api/role-tasks', requireAuth, async (req, res) => {
  try {
    const { task, description, outputs, roleId, categoryId } = req.body;
    
    if (!task?.trim() || !roleId || !categoryId) {
      return res.status(400).json({ error: 'Aufgabe, Rolle und Kategorie sind erforderlich' });
    }
    
    const taskData = {
      task: task.trim(),
      description: description?.trim() || '',
      outputs: outputs?.trim() || '',
      roleId,
      categoryId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('roleTasks').add(taskData);
    
    res.json({
      success: true,
      task: {
        id: docRef.id,
        ...taskData
      }
    });
  } catch (error) {
    console.error('Error creating role task:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der Aufgabe' });
  }
});

// PUT /api/role-tasks/:id - Task bearbeiten
app.put('/api/role-tasks/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { task, description, outputs } = req.body;
    
    if (!task?.trim()) {
      return res.status(400).json({ error: 'Aufgabe ist erforderlich' });
    }
    
    const updateData = {
      task: task.trim(),
      description: description?.trim() || '',
      outputs: outputs?.trim() || '',
      updatedAt: new Date()
    };
    
    await db.collection('roleTasks').doc(id).update(updateData);
    
    const updatedDoc = await db.collection('roleTasks').doc(id).get();
    
    res.json({
      success: true,
      task: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error('Error updating role task:', error);
    res.status(500).json({ error: 'Fehler beim Bearbeiten der Aufgabe' });
  }
});

// DELETE /api/role-tasks/:id - Task löschen
app.delete('/api/role-tasks/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.collection('roleTasks').doc(id).update({
      isActive: false,
      updatedAt: new Date()
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting role task:', error);
    res.status(500).json({ error: 'Fehler beim Löschen der Aufgabe' });
  }
});

process.on('SIGTERM', async () => {
  // console.log entfernt
  process.exit(0);
});
