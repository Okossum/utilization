import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

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

// ==========================================
// LOGGING & MONITORING SYSTEM
// ==========================================

// Logger-Funktionen für strukturierte Logs
const logger = {
  info: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ℹ️  INFO: ${message}`, data);
  },
  success: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✅ SUCCESS: ${message}`, data);
  },
  warning: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] ⚠️  WARNING: ${message}`, data);
  },
  error: (message, error = {}) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ ERROR: ${message}`, {
      message: error.message,
      stack: error.stack,
      ...error
    });
  },
  process: (operation, status, data = {}) => {
    const timestamp = new Date().toISOString();
    const emoji = status === 'start' ? '🚀' : status === 'complete' ? '✅' : status === 'error' ? '❌' : '⏳';
    console.log(`[${timestamp}] ${emoji} PROCESS [${operation}]: ${status.toUpperCase()}`, data);
  }
};

// Request-Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  logger.info(`${req.method} ${req.path}`, { 
    ip: req.ip, 
    userAgent: req.get('User-Agent')?.substring(0, 50) 
  });
  
  // Response-Zeit loggen
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const emoji = status < 400 ? '✅' : status < 500 ? '⚠️' : '❌';
    logger.info(`${emoji} ${req.method} ${req.path} - ${status} (${duration}ms)`);
  });
  
  next();
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Entfernt rekursiv undefined-Werte aus Objekten/Arrays (Firestore-kompatibel)
function removeUndefinedDeep(value, depth = 0) {
  // Verhindere Stack Overflow bei sehr tiefen Objekten
  if (depth > 10) {
    logger.warning('removeUndefinedDeep: Maximum depth reached', { depth });
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
    logger.warning('removeInvalidNumbersDeep: Maximum depth reached', { depth });
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
      // Akzeptiere alle Werte außer null, undefined und leeren Strings
      if (v !== null && v !== undefined) {
        const stringValue = String(v).trim();
        if (stringValue) {
          logger.info(`pickField found value for ${key}`, { value: stringValue, originalType: typeof v });
          return stringValue;
        }
      }
    }
  }
  logger.warning(`pickField: No value found for candidates`, { candidates, availableKeys: Object.keys(row || {}) });
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
    console.log('🔍 Verifying token, length:', token.length);
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    console.log('✅ Token verified for user:', decoded.uid);
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
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
          id: row.personId && row.personId.trim() ? row.personId.trim() : (existing.data.id || existing.data.personId || null),
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
          id: row.personId && row.personId.trim() ? row.personId.trim() : null,
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

    // DEBUG: Zeige erste Row um Feldnamen zu analysieren
    if (data.length > 0) {
      console.log('🔍 DEBUG - Erste Row Analyse:', {
        allKeys: Object.keys(data[0]),
        sampleRow: data[0]
      });
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
            key !== 'Geschäftsstelle' && key !== 'geschäftsstelle' && key !== 'location' && key !== 'standort' && key !== 'ort' &&
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
          id: row.personId && row.personId.trim() ? row.personId.trim() : (existing.data.id || existing.data.personId || null),
          lob: row.lob ?? existing.data.lob ?? null,
          bereich: row.bereich ?? existing.data.bereich ?? null,
          cc: row.cc ?? existing.data.cc ?? null,
          team: row.team ?? existing.data.team ?? null,
          lbs: row.lbs ?? existing.data.lbs ?? null,
          vg: pickField(row, ['VG', 'vg']) ?? existing.data.vg ?? null,
          location: (() => {
            const locationValue = pickField(row, ['location', 'Geschäftsstelle', 'geschäftsstelle', 'standort', 'ort']) ?? existing.data.location ?? null;
            logger.info('🔍 Location Update Debug', { 
              person: row.person, 
              locationValue, 
              existingLocation: existing.data.location,
              rowKeys: Object.keys(row),
              geschaeftsstelleValue: row['Geschäftsstelle'],
              geschaeftsstelleType: typeof row['Geschäftsstelle']
            });
            return locationValue;
          })(),
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
          id: row.personId && row.personId.trim() ? row.personId.trim() : null,
          lbs: row.lbs ?? null,
          vg: pickField(row, ['VG', 'vg']) ?? null,
          cc: row.cc ?? null,
          team: row.team ?? null,
          lob: row.lob ?? null,
          bereich: row.bereich ?? null,
          location: (() => {
            const locationValue = pickField(row, ['location', 'Geschäftsstelle', 'geschäftsstelle', 'standort', 'ort']) ?? null;
            logger.info('🔍 Location Create Debug', { 
              person: row.person, 
              locationValue,
              rowKeys: Object.keys(row),
              geschaeftsstelleValue: row['Geschäftsstelle'],
              geschaeftsstelleType: typeof row['Geschäftsstelle']
            });
            return locationValue;
          })(),
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

    // ✅ Lade auch Mitarbeiter-Daten für vollständige Konsolidierung
    const mitarbeiterSnap = await db.collection('mitarbeiter').where('isLatest', '==', true).get();
    const mitarbeiterData = [];
    mitarbeiterSnap.forEach(doc => {
      const data = doc.data();
      mitarbeiterData.push({
        ...data,
        id: doc.id
      });
    });

    console.log(`📊 Geladene Daten: ${auslastungData.length} Auslastung, ${einsatzplanData.length} Einsatzplan, ${mitarbeiterData.length} Mitarbeiter`);

    const consolidatedData = [];
    
    // ✅ Alle Personen aus allen drei Datenquellen sammeln
    const allPersons = new Set([
      ...auslastungData.map(row => row.person).filter(Boolean),
      ...einsatzplanData.map(row => row.person).filter(Boolean),
      ...mitarbeiterData.map(row => row.person).filter(Boolean)
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

    // ✅ Gruppiere auch Mitarbeiter-Daten nach Person
    const mitarbeiterByPerson = new Map();
    mitarbeiterData.forEach(row => {
      if (!row.person) return;
      if (!mitarbeiterByPerson.has(row.person)) {
        mitarbeiterByPerson.set(row.person, []);
      }
      mitarbeiterByPerson.get(row.person).push(row);
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

    // ✅ Konsolidiere für jede Person und jede Woche (mit Mitarbeiter-Daten)
    for (const person of allPersons) {
      const ausRows = auslastungByPerson.get(person) || [];
      const einRows = einsatzplanByPerson.get(person) || [];
      const mitRows = mitarbeiterByPerson.get(person) || [];

      // ✅ NEUE LOGIK: Sammle CC Kombinationen für diese Person (ohne Team)
      const personCombinations = new Set();
      
      ausRows.forEach(row => {
        const cc = row.cc || 'unknown';
        personCombinations.add(cc);
      });
      einRows.forEach(row => {
        const cc = row.cc || 'unknown';
        personCombinations.add(cc);
      });
      mitRows.forEach(row => {
        const cc = row.cc || 'unknown';
        personCombinations.add(cc);
      });

      if (personCombinations.size === 0) {
        personCombinations.add('unknown');
      }

      // Verarbeite jede CC Kombination (ohne Team-Matching)
      for (const cc of personCombinations) {
        
        const ausRow = ausRows.find(row => 
          (row.cc || 'unknown') === cc
        );
        const einRow = einRows.find(row => 
          (row.cc || 'unknown') === cc
        );
        const mitRow = mitRows.find(row => 
          (row.cc || 'unknown') === cc
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
          
          // Nur hinzufügen wenn mindestens ein Auslastungs- oder Einsatzplan-Wert vorhanden ist
          if (ausValue !== null || einValue !== null) {
            const finalValue = ausValue !== null ? ausValue : einValue;
            
            // Parse Jahr und Woche aus weekKey (z.B. "25/33")
            const [yearPart, weekPart] = weekKey.split('/');
            const year = 2000 + parseInt(yearPart, 10);
            const weekNumber = parseInt(weekPart, 10);
            
            consolidatedData.push({
              person,
              personId: ausRow?.personId || einRow?.personId || mitRow?.id,
              // ✅ Mitarbeiter-Daten haben Priorität für Stammdaten
              lob: mitRow?.lob || ausRow?.lob || einRow?.lob,
              bereich: mitRow?.bereich || ausRow?.bereich || einRow?.bereich,
              cc: cc !== 'unknown' ? cc : (mitRow?.cc || ausRow?.cc || einRow?.cc),
              team: mitRow?.team || ausRow?.team || einRow?.team, // ✅ Team wird gespeichert aber nicht für Matching verwendet
              lbs: mitRow?.lbs || einRow?.lbs,
              location: mitRow?.location || ausRow?.location || einRow?.location,
              // ✅ Weitere Mitarbeiter-Stammdaten
              nachname: mitRow?.nachname,
              vorname: mitRow?.vorname,
              email: mitRow?.email,
              careerLevel: mitRow?.careerLevel,
              skills: mitRow?.skills,
              week: weekKey,
              year: year,
              weekNumber: weekNumber,
              auslastungValue: ausValue,
              einsatzplanValue: einValue,
              finalValue,
              source: (ausValue !== null && einValue !== null) ? 'both' : 
                     (ausValue !== null ? 'auslastung' : 'einsatzplan'),
              isLatest: true,
              compositeKey: `${person}__${cc !== 'unknown' ? cc : (mitRow?.cc || ausRow?.cc || einRow?.cc || 'unknown')}` // ✅ Nur Person + CC
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
      // ✅ Verwende Composite Key: Person__CC__Week für eindeutige Identifikation (ohne Team)
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

// POST /api/profiler/preview - Vorschau der Profiler-Daten ohne Speicherung
app.post('/api/profiler/preview', requireAuth, async (req, res) => {
  try {
    const { profileUrl, employeeId, authToken } = req.body;

    console.log('🔍 Profiler-Preview Request:', {
      employeeId,
      profileUrl,
      hasAuthToken: !!authToken,
      tokenLength: authToken ? authToken.length : 0
    });

    // Validierung
    if (!profileUrl || !employeeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'profileUrl und employeeId sind erforderlich' 
      });
    }

    if (!authToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'authToken ist erforderlich' 
      });
    }

    // Profil-ID extrahieren für bessere Fehlerbehandlung
    const profileId = extractProfileIdFromUrl(profileUrl);
    if (!profileId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Ungültige Profiler-URL - keine Profil-ID gefunden' 
      });
    }

    console.log(`🎯 Verarbeite Preview für Profil-ID: ${profileId}`);

    // Profiler-Daten abrufen (OHNE Speicherung)
    let profileData = null;
    try {
      profileData = await fetchProfilerDataWithToken(profileUrl, authToken);
      console.log(`✅ API-Daten erfolgreich abgerufen für ${employeeId}:`, {
        hasData: !!profileData,
        dataKeys: profileData ? Object.keys(profileData) : []
      });
    } catch (apiError) {
      console.error(`❌ API-Fehler für ${employeeId}:`, {
        message: apiError.message,
        profileUrl,
        profileId
      });
      throw new Error(`Profiler-API-Fehler: ${apiError.message}`);
    }

    // Prüfe ob Daten vorhanden sind
    if (!profileData) {
      throw new Error('Keine Daten von Profiler-API erhalten');
    }
    
    // WICHTIG: Transformiere die RAW-Daten für das Frontend!
    let transformedData = null;
    try {
      transformedData = transformProfilerData(profileData, profileId);
      console.log(`✅ Daten erfolgreich transformiert für ${employeeId}`);
    } catch (transformError) {
      console.error(`❌ Transformations-Fehler für ${employeeId}:`, {
        message: transformError.message,
        profileId,
        hasRawData: !!profileData
      });
      throw new Error(`Daten-Transformations-Fehler: ${transformError.message}`);
    }
    
    console.log(`✅ Preview-Daten erfolgreich abgerufen für ${employeeId}`);
    
    res.json({
      success: true,
      message: 'Preview-Daten erfolgreich abgerufen',
      previewData: transformedData, // TRANSFORMIERTE Daten für Preview!
      employeeId: employeeId
    });

  } catch (error) {
    console.error('❌ Fehler beim Profiler-Preview:', {
      message: error.message,
      stack: error.stack,
      employeeId: req.body?.employeeId,
      profileUrl: req.body?.profileUrl
    });
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Interner Server-Fehler' 
    });
  }
});

// Profiler Import Route
app.post('/api/profiler/import', requireAuth, async (req, res) => {
  try {
    const { profileUrl, employeeId, authToken } = req.body;

    if (!profileUrl || !employeeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'profileUrl und employeeId sind erforderlich' 
      });
    }

    if (!authToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'authToken ist erforderlich' 
      });
    }

    // Extrahiere Profil-ID aus URL
    const profileIdMatch = profileUrl.match(/\/profile\/(\d+)/);
    if (!profileIdMatch) {
      return res.status(400).json({ 
        success: false, 
        error: 'Ungültige Profiler-URL' 
      });
    }

    const profileId = profileIdMatch[1];
    console.log('🔍 Profiler-Import für Profil-ID:', profileId);

    // API-Call mit Token-Auth
    let profilerData = null;
    
    try {
      console.log('🎫 Verwende Token-Auth für Profiler-Import');
      profilerData = await fetchProfilerDataWithToken(profileUrl, authToken);
    } catch (error) {
      console.error('❌ Token-Auth fehlgeschlagen:', error);
      // Kein Fallback zu Basic-Auth mehr
    }

    // Fallback zu Mock-Daten falls API-Call fehlschlägt
    if (!profilerData) {
      console.log('⚠️ API-Call fehlgeschlagen, verwende Mock-Daten als Fallback');
      profilerData = {
        id: profileId,
        name: 'Max Mustermann (Mock)',
        email: 'max.mustermann@adesso.de',
        position: 'Senior Consultant',
        department: 'BU AT II (BAYERN)',
        location: 'München',
        startDate: '2020-01-15',
        authMethod: 'mock-fallback',
        skills: [
          { name: 'Java', level: 4, category: 'Programming' },
          { name: 'Spring Boot', level: 4, category: 'Framework' },
          { name: 'React', level: 3, category: 'Frontend' }
        ],
        projects: [
          {
            name: 'BMW Digitalisierung (Mock)',
            customer: 'BMW AG',
            startDate: '2023-01-01',
            endDate: '2023-12-31',
            role: 'Senior Developer',
            skills: ['Java', 'Spring Boot', 'React']
          }
        ]
      };
    }

    // Aktualisiere utilizationData mit importierten Daten
    const utilizationDataRef = admin.firestore().collection('utilizationData').doc(employeeId);
    const utilizationDoc = await utilizationDataRef.get();

    if (!utilizationDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Mitarbeiter nicht gefunden' 
      });
    }

    const currentData = utilizationDoc.data();
    const updatedData = {
      ...currentData,
      // Aktualisiere Grunddaten falls vorhanden
      ...(profilerData.email && { email: profilerData.email }),
      ...(profilerData.position && { position: profilerData.position }),
      ...(profilerData.department && { bereich: profilerData.department }),
      ...(profilerData.location && { standort: profilerData.location }),
      
      // Füge Profiler-Projekte zu projectReferences hinzu
      projectReferences: [
        ...(currentData.projectReferences || []),
        ...profilerData.projects.map(project => ({
          id: `profiler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          projectName: project.name,
          customer: project.customer,
          startDate: project.startDate,
          endDate: project.endDate,
          projectType: 'historical',
          projectSource: 'profiler',
          roles: project.role ? [{
            name: project.role,
            categoryName: 'Profiler Import'
          }] : [],
          skills: project.skills.map(skill => ({
            name: skill,
            categoryName: 'Technical'
          })),
          importedAt: new Date().toISOString(),
          importedFrom: profileUrl
        }))
      ],
      
      // Meta-Daten für Import
      lastProfilerImport: {
        timestamp: new Date().toISOString(),
        profileUrl,
        profileId,
        authMethod: profilerData.authMethod || 'unknown',
        importedFields: ['email', 'position', 'department', 'location', 'projects', 'skills']
      }
    };

    await utilizationDataRef.update(updatedData);

    console.log('✅ Profiler-Import erfolgreich für:', employeeId);

    res.json({
      success: true,
      message: `Profiler-Daten erfolgreich importiert (${profilerData.authMethod})`,
      importedFields: ['email', 'position', 'department', 'location', 'projects', 'skills'],
      importedData: {
        projectsCount: profilerData.projects.length,
        skillsCount: profilerData.skills.length,
        authMethod: profilerData.authMethod
      }
    });

  } catch (error) {
    console.error('❌ Fehler beim Profiler-Import:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Interner Server-Fehler beim Profiler-Import' 
    });
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
    
    // DEBUG: Prüfe die gesamte Collection
    const totalSnapshot = await db.collection('mitarbeiter').get();
    console.log(`📊 TOTAL documents in mitarbeiter collection: ${totalSnapshot.size}`);
    
    // DEBUG: Prüfe wie viele isLatest haben
    const latestSnapshot = await db.collection('mitarbeiter').where('isLatest', '==', true).get();
    console.log(`📊 Documents with isLatest=true: ${latestSnapshot.size}`);
    
    // DEBUG: Prüfe Sample-Dokumente
    const sampleSnapshot = await db.collection('mitarbeiter').limit(5).get();
    console.log(`📄 Sample documents (first 5):`);
    sampleSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: person="${data.person}", isLatest=${data.isLatest}, cc="${data.cc}", team="${data.team}"`);
    });
    
    let snapshot;
    if (latestSnapshot.size === 0) {
      console.log('⚠️  No documents with isLatest=true found, loading ALL documents');
      snapshot = await db.collection('mitarbeiter').get();
    } else {
      console.log('✅ Using documents with isLatest=true');
      snapshot = latestSnapshot;
    }
    
    console.log(`📊 Final documents to process: ${snapshot.size}`);
    
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
    logger.error('Error loading employees', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// ==========================================
// HEALTH CHECK & MONITORING ENDPOINTS
// ==========================================

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    logger.process('health-check', 'start');
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      services: {}
    };

    // Firebase-Verbindung testen
    try {
      await db.collection('health-check').limit(1).get();
      healthStatus.services.firebase = 'connected';
      logger.success('Firebase connection test passed');
    } catch (error) {
      healthStatus.services.firebase = 'error';
      healthStatus.status = 'degraded';
      logger.error('Firebase connection test failed', error);
    }

    logger.process('health-check', 'complete', { status: healthStatus.status });
    res.json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// System Status Endpoint
app.get('/api/system/status', (req, res) => {
  logger.info('System status requested');
  
  const status = {
    server: {
      status: 'running',
      port: PORT,
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(status);
});

// Server starten
app.listen(PORT, () => {
  logger.success(`🚀 Server gestartet auf Port ${PORT}`);
  logger.info(`📊 Health Check verfügbar unter: http://localhost:${PORT}/api/health`);
  logger.info(`🔧 System Status verfügbar unter: http://localhost:${PORT}/api/system/status`);
  logger.info(`💾 Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
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

// ===== PLANNED PROJECTS API =====

// GET /api/planned-projects - Alle geplanten Projekte für Einsatzplan-Visualisierung abrufen
app.get('/api/planned-projects', requireAuth, async (req, res) => {
  try {
    console.log('🔍 Loading planned projects from new projects Collection architecture...');
    
    // SCHRITT 1: Lade alle Mitarbeiter mit Projekt-Referenzen
    const utilizationSnap = await db.collection('utilizationData')
      .where('isLatest', '==', true)
      .get();
    
    // SCHRITT 2: Sammle alle Projekt-IDs und Mitarbeiter-Referenzen
    const projectIds = new Set();
    const employeeProjectMap = new Map(); // employeeId -> {employeeName, projectReferences}
    
    utilizationSnap.docs.forEach(doc => {
      const data = doc.data();
      
      // NEU: Prüfe auf projectReferences statt plannedProjects
      if (data.projectReferences && Array.isArray(data.projectReferences)) {
        data.projectReferences.forEach(ref => {
          projectIds.add(ref.projectId);
        });
        
        employeeProjectMap.set(data.id, {
          employeeName: data.person,
          projectReferences: data.projectReferences
        });
      }
      
      // FALLBACK: Unterstütze alte plannedProjects während Migration
      if (data.plannedProjects && Array.isArray(data.plannedProjects)) {
        data.plannedProjects.forEach(project => {
          if (project.id) {
            projectIds.add(project.id);
          }
        });
        
        // Konvertiere alte plannedProjects zu projectReferences Format
        if (!employeeProjectMap.has(data.id)) {
          const legacyReferences = data.plannedProjects.map(project => ({
            projectId: project.id,
            plannedUtilization: project.plannedUtilization || project.plannedAllocationPct || 100,
            assignedWeeks: project.assignedWeeks || [],
            role: project.role,
            assignedAt: project.createdAt || new Date(),
            updatedAt: new Date()
          }));
          
          employeeProjectMap.set(data.id, {
            employeeName: data.person,
            projectReferences: legacyReferences
          });
        }
      }
    });
    
    console.log(`📊 Found ${projectIds.size} unique project IDs from ${employeeProjectMap.size} employees`);
    
    // SCHRITT 3: Lade alle referenzierten Projekte aus projects Collection
    const projectsMap = new Map();
    
    if (projectIds.size > 0) {
      // Firestore 'in' Query Limit: 10 IDs pro Query
      const projectIdChunks = Array.from(projectIds).reduce((chunks, id, index) => {
        const chunkIndex = Math.floor(index / 10);
        if (!chunks[chunkIndex]) chunks[chunkIndex] = [];
        chunks[chunkIndex].push(id);
        return chunks;
      }, []);
      
      for (const chunk of projectIdChunks) {
        try {
          const projectsSnap = await db.collection('projects')
            .where(FieldValue.documentId(), 'in', chunk)
            .get();
          
          projectsSnap.docs.forEach(doc => {
            projectsMap.set(doc.id, { id: doc.id, ...doc.data() });
          });
        } catch (error) {
          console.warn(`⚠️ Could not load projects chunk:`, chunk, error.message);
          // Fallback: Lade Projekte einzeln
          for (const projectId of chunk) {
            try {
              const projectDoc = await db.collection('projects').doc(projectId).get();
              if (projectDoc.exists) {
                projectsMap.set(projectId, { id: projectId, ...projectDoc.data() });
              }
            } catch (singleError) {
              console.warn(`⚠️ Could not load project ${projectId}:`, singleError.message);
            }
          }
        }
      }
    }
    
    console.log(`📋 Loaded ${projectsMap.size} projects from projects Collection`);
    
    // SCHRITT 4: Kombiniere Projekt-Daten mit Mitarbeiter-Referenzen
    const plannedProjects = [];
    
    for (const [employeeId, employeeData] of employeeProjectMap) {
      for (const reference of employeeData.projectReferences) {
        const project = projectsMap.get(reference.projectId);
        
        if (project && project.projectType === 'planned') {
          plannedProjects.push({
            employeeId: employeeId,
            employeeName: employeeData.employeeName,
            projectId: project.id,
            projectName: project.projectName,
            customer: project.customer,
            startDate: project.startDate,
            endDate: project.endDate,
            plannedUtilization: reference.plannedUtilization,
            probability: project.probability || 75,
            role: reference.role,
            createdAt: project.createdAt,
            assignedWeeks: reference.assignedWeeks || []
          });
        }
      }
    }
    
    console.log(`✅ Found ${plannedProjects.length} planned projects from ${projectsMap.size} total projects`);
    res.json(plannedProjects);
    
  } catch (error) {
    console.error('❌ Error loading planned projects:', error);
    res.status(500).json({ error: 'Fehler beim Laden der geplanten Projekte' });
  }
});

// ==========================================
// PROJECTS API ENDPOINTS
// ==========================================

// GET /api/projects/:id - Einzelnes Projekt laden
app.get('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const projectDoc = await db.collection('projects').doc(id).get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ error: 'Projekt nicht gefunden' });
    }
    
    res.json({ id: projectDoc.id, ...projectDoc.data() });
  } catch (error) {
    console.error('Error loading project:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Projekts' });
  }
});

// PUT /api/projects/:id - Projekt aktualisieren
app.put('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Validierung
    if (!updates.projectName || !updates.customer) {
      return res.status(400).json({ error: 'Projektname und Kunde sind erforderlich' });
    }
    
    // Update mit Metadaten
    const updateData = {
      ...updates,
      updatedAt: new Date(),
      updatedBy: req.user.email || 'unknown'
    };
    
    await db.collection('projects').doc(id).update(updateData);
    
    console.log(`✅ Projekt aktualisiert: ${id}`);
    res.json({ success: true, id });
    
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Projekts' });
  }
});

// POST /api/projects - Neues Projekt erstellen
app.post('/api/projects', requireAuth, async (req, res) => {
  try {
    const projectData = req.body;
    
    // Validierung
    if (!projectData.projectName || !projectData.customer) {
      return res.status(400).json({ error: 'Projektname und Kunde sind erforderlich' });
    }
    
    // Verwende vorgegebene ID oder generiere neue
    const projectId = projectData.id || `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Prüfe ob Projekt bereits existiert
    const existingProject = await db.collection('projects').doc(projectId).get();
    if (existingProject.exists) {
      return res.status(409).json({ error: 'Projekt mit dieser ID existiert bereits' });
    }
    
    const newProject = {
      id: projectId,
      projectName: projectData.projectName,
      customer: projectData.customer,
      projectType: projectData.projectType || 'planned',
      probability: projectData.probability || 'Prospect',
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      description: projectData.description,
      comment: projectData.comment,
      plannedAllocationPct: projectData.plannedAllocationPct || 100,
      
      // Skills & Rollen
      roles: projectData.roles || [],
      skills: projectData.skills || [],
      
      // Metadaten
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user.email || 'unknown'
    };
    
    await db.collection('projects').doc(projectId).set(newProject);
    
    console.log(`✅ Neues Projekt erstellt: ${projectId}`);
    res.json({ success: true, id: projectId, project: newProject });
    
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Projekts' });
  }
});

// GET /api/projects - Alle Projekte laden (mit optionalen Filtern)
app.get('/api/projects', requireAuth, async (req, res) => {
  try {
    const { projectType, customer, employeeId } = req.query;
    
    let query = db.collection('projects');
    
    // Filter anwenden
    if (projectType) {
      query = query.where('projectType', '==', projectType);
    }
    
    if (customer) {
      query = query.where('customer', '==', customer);
    }
    
    const projectsSnap = await query.get();
    const projects = projectsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Wenn employeeId Filter gesetzt, lade nur Projekte für diesen Mitarbeiter
    if (employeeId) {
      const employeeDoc = await db.collection('utilizationData').doc(employeeId).get();
      if (employeeDoc.exists) {
        const employeeData = employeeDoc.data();
        const employeeProjectIds = employeeData.projectReferences?.map(ref => ref.projectId) || [];
        const filteredProjects = projects.filter(project => employeeProjectIds.includes(project.id));
        return res.json(filteredProjects);
      }
    }
    
    res.json(projects);
    
  } catch (error) {
    console.error('Error loading projects:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Projekte' });
  }
});

// DELETE /api/projects/:id - Projekt löschen
app.delete('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prüfe ob Projekt noch referenziert wird
    const utilizationSnap = await db.collection('utilizationData')
      .where('projectReferences', 'array-contains', { projectId: id })
      .get();
    
    if (!utilizationSnap.empty) {
      return res.status(400).json({ 
        error: 'Projekt kann nicht gelöscht werden - es wird noch von Mitarbeitern referenziert',
        referencedBy: utilizationSnap.docs.map(doc => doc.data().person)
      });
    }
    
    await db.collection('projects').doc(id).delete();
    
    console.log(`✅ Projekt gelöscht: ${id}`);
    res.json({ success: true, id });
    
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Projekts' });
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

// ===== PROFILER BULK IMPORT API =====

// Global state für Bulk-Import Status
let bulkImportStatus = {
  isRunning: false,
  total: 0,
  completed: 0,
  currentEmployee: null,
  employeeResults: {},
  startedAt: null,
  completedAt: null
};

// POST /api/profiler/bulk-import - Startet Bulk-Import aller Mitarbeiter
app.post('/api/profiler/bulk-import', requireAuth, async (req, res) => {
  try {
    const { profilerCookies, employees, authToken } = req.body;

    console.log('🔍 Bulk-Import Request erhalten:', {
      hasAuthToken: !!authToken,
      authTokenLength: authToken?.length || 0,
      hasCookies: !!profilerCookies,
      cookiesLength: profilerCookies?.length || 0,
      employeesCount: employees?.length || 0,
      employeesIsArray: Array.isArray(employees),
      requestBodyKeys: Object.keys(req.body)
    });

    // Validiere Authentifizierung
    if (!authToken && !profilerCookies) {
      console.log('❌ Authentifizierung fehlgeschlagen: Weder authToken noch profilerCookies vorhanden');
      return res.status(400).json({ error: 'Authentifizierung erforderlich: Entweder authToken oder profilerCookies' });
    }

    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      console.log('❌ Mitarbeiter-Validierung fehlgeschlagen:', { employees, isArray: Array.isArray(employees), length: employees?.length });
      return res.status(400).json({ error: 'Mitarbeiter-Liste ist erforderlich' });
    }

    // Prüfe ob bereits ein Import läuft
    if (bulkImportStatus.isRunning) {
      return res.status(409).json({ error: 'Ein Bulk-Import läuft bereits' });
    }

    // Initialisiere Import-Status
    bulkImportStatus = {
      isRunning: true,
      total: employees.length,
      completed: 0,
      currentEmployee: null,
      employeeResults: {},
      startedAt: new Date().toISOString(),
      completedAt: null
    };

    console.log(`🚀 Profiler Bulk-Import gestartet für ${employees.length} Mitarbeiter`);

    // Starte Bulk-Import im Hintergrund
    processBulkImport(employees, { profilerCookies, authToken });

    res.json({
      success: true,
      message: 'Bulk-Import gestartet',
      total: employees.length
    });

  } catch (error) {
    console.error('❌ Fehler beim Starten des Bulk-Imports:', error);
    bulkImportStatus.isRunning = false;
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// GET /api/profiler/import-status - Gibt aktuellen Import-Status zurück
app.get('/api/profiler/import-status', requireAuth, async (req, res) => {
  try {
    res.json(bulkImportStatus);
  } catch (error) {
    console.error('❌ Fehler beim Abrufen des Import-Status:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Bulk-Import Verarbeitung
async function processBulkImport(employees, authConfig) {
  console.log(`📊 Starte Verarbeitung von ${employees.length} Mitarbeitern`);
  const { profilerCookies, authToken } = authConfig;

  for (let i = 0; i < employees.length; i++) {
    const employee = employees[i];
    const { employeeId, profilerUrl } = employee;

    try {
      // Update current employee
      bulkImportStatus.currentEmployee = employeeId;
      console.log(`🔄 Verarbeite Mitarbeiter ${i + 1}/${employees.length}: ${employeeId}`);

      // Extrahiere Profil-ID aus URL
      const profileId = extractProfileIdFromUrl(profilerUrl);
      if (!profileId) {
        throw new Error('Ungültige Profiler-URL');
      }

      // Profiler-API-Aufruf mit der verfügbaren Authentifizierung
      let profileData;
      try {
        if (authToken) {
          console.log(`🎫 Verwende Token-Auth für ${employeeId}`);
          profileData = await fetchProfilerDataWithToken(profilerUrl, authToken);
        } else if (profilerCookies) {
          console.log(`🍪 Verwende Cookie-Auth für ${employeeId}`);
          profileData = await fetchProfilerData(profilerUrl, profilerCookies);
        } else {
          throw new Error('Keine gültige Authentifizierung verfügbar');
        }
        
        console.log(`✅ Profiler-Daten erfolgreich abgerufen für ${employeeId}:`, {
          hasData: !!profileData,
          authMethod: profileData?.authMethod,
          skillsCount: profileData?.skills?.length || 0
        });
        
      } catch (authError) {
        console.error(`❌ Authentifizierungs-Fehler für ${employeeId}:`, authError.message);
        
        // WICHTIG: Fallback zu Mock-Daten nur in Development
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 Verwende Mock-Daten als Fallback für ${employeeId} (Development Mode)`);
          const profileId = extractProfileIdFromUrl(profilerUrl);
          profileData = getMockProfilerData(profileId || employeeId);
          profileData.authMethod = 'mock-fallback';
        } else {
          // In Production: Fehler weiterwerfen
          throw authError;
        }
      }
      
      // Speichere Profiler-Daten in separater Collection
      await saveProfilerData(employeeId, profileData);

      // Markiere als erfolgreich
      bulkImportStatus.employeeResults[employeeId] = {
        status: 'success',
        completedAt: new Date().toISOString(),
        profileId: profileId
      };

      console.log(`✅ Mitarbeiter ${employeeId} erfolgreich importiert`);

    } catch (error) {
      console.error(`❌ Fehler beim Import von ${employeeId}:`, error);
      
      // Markiere als fehlgeschlagen
      bulkImportStatus.employeeResults[employeeId] = {
        status: 'error',
        error: error.message,
        completedAt: new Date().toISOString()
      };
    }

    // Update completed count
    bulkImportStatus.completed = i + 1;
    
    // Kurze Pause zwischen Importen
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Import abgeschlossen
  bulkImportStatus.isRunning = false;
  bulkImportStatus.currentEmployee = null;
  bulkImportStatus.completedAt = new Date().toISOString();

  console.log(`🎉 Bulk-Import abgeschlossen: ${bulkImportStatus.completed}/${bulkImportStatus.total} Mitarbeiter`);
}

// Hilfsfunktion: Profil-ID aus URL extrahieren
function extractProfileIdFromUrl(profileUrl) {
  try {
    const match = profileUrl.match(/\/profile\/(\d+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Fehler beim Extrahieren der Profil-ID:', error);
    return null;
  }
}

// Hilfsfunktion: Profiler-URL zu API-URL transformieren
function transformToApiUrl(profileUrl) {
  try {
    // Extrahiere die Profil-ID aus der normalen URL
    const profileId = extractProfileIdFromUrl(profileUrl);
    if (!profileId) {
      throw new Error('Keine gültige Profil-ID in URL gefunden');
    }
    
    // Erstelle die API-URL
    const apiUrl = `https://profiler.adesso-group.com/api/profiles/${profileId}/full-profile`;
    console.log(`🔄 URL-Transformation: ${profileUrl} -> ${apiUrl}`);
    
    return apiUrl;
  } catch (error) {
    console.error('Fehler bei URL-Transformation:', error);
    return null;
  }
}

// Basic-Auth Funktion entfernt - nur noch Token-Auth und Cookie-Auth unterstützt

// Hilfsfunktion: Profiler-Daten mit Token-Auth abrufen
async function fetchProfilerDataWithToken(profileUrl, authToken) {
  try {
    // Extrahiere profileId aus der URL für Logging und Transformation
    const profileId = extractProfileIdFromUrl(profileUrl);
    if (!profileId) {
      throw new Error(`Keine gültige Profil-ID in URL gefunden: ${profileUrl}`);
    }
    
    // Transformiere die URL zur API-URL
    const apiUrl = transformToApiUrl(profileUrl);
    if (!apiUrl) {
      throw new Error('URL-Transformation fehlgeschlagen');
    }
    
    console.log(`🎫 Rufe Profiler-Daten mit Token-Auth ab: ${apiUrl} (ID: ${profileId})`);
    
    // Token bereinigen - entferne Zeilenumbrüche und Leerzeichen
    const cleanToken = authToken.trim().replace(/[\r\n\t]/g, '');
    
    console.log(`🧹 Token bereinigt: Länge ${cleanToken.length}, erste 20 Zeichen: ${cleanToken.substring(0, 20)}...`);
    
    let response;
    try {
      response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 15000 // 15 Sekunden Timeout
      });
    } catch (fetchError) {
      console.error(`❌ Netzwerk-Fehler beim API-Aufruf für ID ${profileId}:`, {
        message: fetchError.message,
        apiUrl,
        tokenLength: cleanToken.length
      });
      throw new Error(`Netzwerk-Fehler: ${fetchError.message}`);
    }

    console.log(`📡 API-Response für ID ${profileId}:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      }
    });

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorBody = await response.text();
        errorDetails = errorBody.substring(0, 200); // Erste 200 Zeichen der Fehlermeldung
      } catch (e) {
        errorDetails = 'Fehler beim Lesen der Antwort';
      }
      
      throw new Error(`Profiler API Error (Token-Auth): ${response.status} ${response.statusText} - ${errorDetails}`);
    }

    let rawData;
    try {
      rawData = await response.json();
    } catch (jsonError) {
      console.error(`❌ JSON-Parse-Fehler für ID ${profileId}:`, jsonError.message);
      throw new Error(`Ungültige JSON-Antwort von Profiler-API: ${jsonError.message}`);
    }

    console.log(`✅ Profiler-Daten erfolgreich mit Token-Auth erhalten für ID ${profileId}:`, {
      dataKeys: Object.keys(rawData),
      hasPersonalData: !!rawData.personalData,
      hasSkills: !!rawData.skills,
      hasUser: !!rawData.user,
      dataSize: JSON.stringify(rawData).length
    });

    // VOLLSTÄNDIGE DATENSTRUKTUR-ANALYSE
    console.log(`🔬 VOLLSTÄNDIGE DATENSTRUKTUR-ANALYSE für ID ${profileId}:`);
    console.log(`📋 user-Objekt:`, rawData.user ? {
      keys: Object.keys(rawData.user),
      email: rawData.user.email,
      emailAddress: rawData.user.emailAddress,
      name: rawData.user.name,
      displayName: rawData.user.displayName,
      firstName: rawData.user.firstName,
      lastName: rawData.user.lastName,
      sample: JSON.stringify(rawData.user).substring(0, 200) + '...'
    } : 'NICHT VORHANDEN');
    
    // DETAILLIERTE EMPLOYEE-OBJEKT ANALYSE
    console.log(`👤 employee-Objekt:`, rawData.user?.employee ? {
      keys: Object.keys(rawData.user.employee),
      id: rawData.user.employee.id,
      globalExternalId: rawData.user.employee.globalExternalId,
      email: rawData.user.employee.email,
      emailAddress: rawData.user.employee.emailAddress,
      firstName: rawData.user.employee.firstName,
      lastName: rawData.user.employee.lastName,
      displayName: rawData.user.employee.displayName,
      fullSample: JSON.stringify(rawData.user.employee).substring(0, 500) + '...'
    } : 'NICHT VORHANDEN');
    
    console.log(`📚 projects-Array:`, rawData.projects ? {
      length: rawData.projects.length,
      firstProject: rawData.projects[0] ? Object.keys(rawData.projects[0]) : 'LEER',
      sample: rawData.projects[0] ? JSON.stringify(rawData.projects[0]).substring(0, 200) + '...' : 'KEINE DATEN'
    } : 'NICHT VORHANDEN');
    
    console.log(`🎓 education-Array:`, rawData.education ? {
      length: rawData.education.length,
      firstEducation: rawData.education[0] ? Object.keys(rawData.education[0]) : 'LEER'
    } : 'NICHT VORHANDEN');
    
    console.log(`🏆 certifications-Array:`, rawData.certifications ? {
      length: rawData.certifications.length,
      firstCert: rawData.certifications[0] ? Object.keys(rawData.certifications[0]) : 'LEER'
    } : 'NICHT VORHANDEN');
    
    console.log(`🌍 languageRatings-Array:`, rawData.languageRatings ? {
      length: rawData.languageRatings.length,
      firstLang: rawData.languageRatings[0] ? Object.keys(rawData.languageRatings[0]) : 'LEER'
    } : 'NICHT VORHANDEN');

    // Transformiere die Profiler-Daten in unser Format
    const transformedData = transformProfilerData(rawData, profileId);
    transformedData.authMethod = 'token-auth';
    
    console.log(`🔄 Transformierte Daten für ID ${profileId}:`, {
      employeeId: transformedData.employeeId,
      name: transformedData.name,
      email: transformedData.email,
      hasSkills: transformedData.skills?.length > 0,
      skillsCount: transformedData.skills?.length || 0,
      hasPersonalData: !!transformedData.personalData,
      hasProjects: transformedData.projects?.length > 0,
      projectsCount: transformedData.projects?.length || 0,
      hasCertifications: transformedData.certifications?.length > 0,
      certificationsCount: transformedData.certifications?.length || 0,
      languagesStatus: 'KOMPLETT ENTFERNT auf User-Wunsch'
    });
    
    return transformedData;

  } catch (error) {
    console.error(`❌ Fehler beim Abrufen der Profiler-Daten mit Token-Auth für URL ${profileUrl}:`, error);
    throw error; // Fehler weiterwerfen für Fallback-Handling
  }
}

// Hilfsfunktion: Profiler-Daten abrufen (Echter API-Call mit Cookie-Auth - Legacy)
async function fetchProfilerData(profileUrl, profilerCookies) {
  try {
    // Transformiere die URL zur API-URL
    const apiUrl = transformToApiUrl(profileUrl);
    if (!apiUrl) {
      throw new Error('URL-Transformation fehlgeschlagen');
    }
    
    console.log(`🍪 Rufe Profiler-Daten mit Cookie-Auth ab: ${apiUrl}`);
    
    // Echter API-Call an Profiler mit Cookie-Authentifizierung
    const response = await fetch(apiUrl, {
      headers: {
        'Cookie': profilerCookies,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 10000 // 10 Sekunden Timeout
    });

    if (!response.ok) {
      throw new Error(`Profiler API Error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();
    console.log(`📊 Profiler-Daten erhalten für ${profileId}:`, Object.keys(rawData));

    // Transformiere die Profiler-Daten in unser Format
    const transformedData = transformProfilerData(rawData, profileId);
    
    return transformedData;

  } catch (error) {
    console.error(`❌ Fehler beim Abrufen der Profiler-Daten für ${profileId}:`, error);
    
    // Fallback zu Mock-Daten bei Fehlern (für Entwicklung)
    console.log(`🔄 Verwende Mock-Daten als Fallback für ${profileId}`);
    return getMockProfilerData(profileId);
  }
}

// Hilfsfunktion: Profiler-Daten transformieren
function transformProfilerData(rawData, profileId) {
  // Validiere Input-Daten
  if (!rawData || typeof rawData !== 'object') {
    console.error(`❌ Ungültige rawData für Profil-ID ${profileId}:`, {
      rawData: rawData,
      type: typeof rawData,
      isNull: rawData === null,
      isUndefined: rawData === undefined
    });
    throw new Error(`Ungültige Profiler-Daten erhalten (${typeof rawData})`);
  }

  if (!profileId) {
    throw new Error('Profil-ID ist erforderlich für Daten-Transformation');
  }

  console.log(`🔄 Transformiere Profiler-Daten für ID ${profileId}:`, {
    dataKeys: Object.keys(rawData),
    hasUser: !!rawData.user,
    hasPersonalData: !!rawData.personalData
  });

  // Extrahiere E-Mail aus verschiedenen möglichen Quellen
  const extractEmail = (data) => {
    const email = data.user?.employee?.personalData?.email ||  // ← HIER IST DIE E-MAIL!
                  data.user?.employee?.email || 
                  data.user?.employee?.emailAddress || 
                  data.user?.email || 
                  data.user?.emailAddress || 
                  data.personalData?.email ||
                  data.contact?.email ||
                  data.email;
    
    // Debug-Logging für E-Mail-Extraktion
    console.log(`📧 E-Mail-Extraktion für ID ${profileId}:`, {
      personalDataEmail: data.user?.employee?.personalData?.email,  // ← NEUE PRIORITÄT!
      userEmployeeEmail: data.user?.employee?.email,
      userEmployeeEmailAddress: data.user?.employee?.emailAddress,
      userEmail: data.user?.email,
      userEmailAddress: data.user?.emailAddress,
      directPersonalDataEmail: data.personalData?.email,
      contactEmail: data.contact?.email,
      directEmail: data.email,
      extractedEmail: email,
      fallbackUsed: !email
    });
    
    return email || `mitarbeiter${profileId}@adesso.de`; // Fallback nur wenn wirklich nichts gefunden
  };

  // Extrahiere Name aus verschiedenen Quellen
  const extractName = (data) => {
    // Priorität: personalData hat die echten Namen!
    const personalDataName = data.user?.employee?.personalData ? 
      `${data.user.employee.personalData.firstName || ''} ${data.user.employee.personalData.lastName || ''}`.trim() : '';
    
    const employeeName = data.user?.employee ? 
      `${data.user.employee.firstName || ''} ${data.user.employee.lastName || ''}`.trim() : '';
    
    return personalDataName ||
           employeeName ||
           data.user?.employee?.displayName ||
           data.user?.employee?.fullName ||
           data.user?.displayName ||
           data.user?.fullName ||
           data.user?.name ||
           data.personalData?.name ||
           data.name ||
           `${data.user?.firstName || ''} ${data.user?.lastName || ''}`.trim() ||
           `Mitarbeiter ${profileId}`;
  };

  return {
    id: profileId,
    name: extractName(rawData),
    email: extractEmail(rawData),
    position: extractSafeString(rawData.user?.employee?.position || rawData.user?.position || rawData.position || rawData.jobTitle) || 'Consultant',
    department: extractSafeString(rawData.user?.employee?.department || rawData.user?.department || rawData.department || rawData.businessUnit) || 'Unknown',
    location: extractSafeString(rawData.user?.employee?.location || rawData.user?.location || rawData.location || rawData.office) || 'Unknown',
    startDate: extractSafeString(rawData.user?.employee?.startDate || rawData.user?.startDate || rawData.startDate || rawData.joinDate) || null,
    
    // Skills aus verschiedenen Quellen extrahieren
    skills: extractSkills(rawData),
    
    // WICHTIG: Projektdaten extrahieren (die gelben SAP-Einträge!)
    projects: extractProjects(rawData),
    
    // Weitere Daten - TRANSFORMIERT um Sprach-Objekte zu vermeiden
    certifications: extractCertifications(rawData),
    // languages: [], // KOMPLETT ENTFERNT auf User-Wunsch - keine Sprachen mehr importieren
    education: extractEducation(rawData),
    
    // Metadaten
    // rawData: rawData, // ENTFERNT - verursacht React-Render-Fehler mit Sprach-Objekten
    importedAt: new Date().toISOString(),
    source: 'profiler-api'
  };
}

// Hilfsfunktion: Projekte aus Profiler-Daten extrahieren
function extractProjects(rawData) {
  const projects = [];
  
  // Verschiedene mögliche Quellen für Projektdaten prüfen
  const projectSources = [
    rawData.projects,
    rawData.projectExperience,
    rawData.assignments,
    rawData.workExperience
  ];

  for (const source of projectSources) {
    if (Array.isArray(source)) {
      for (const project of source) {
        projects.push({
          name: extractSafeString(project.name || project.title || project.projectName) || 'Unbekanntes Projekt',
          customer: extractSafeString(project.customer || project.client || project.company) || 'Unbekannter Kunde',
          startDate: extractSafeString(project.startDate || project.from) || null,
          endDate: extractSafeString(project.endDate || project.to) || null,
          role: extractSafeString(project.role || project.position || project.jobTitle) || 'Consultant',
          description: extractSafeString(project.description || project.summary) || '',
          
          // Technologien und Skills (die SAP-Einträge!) - SICHER TRANSFORMIERT
          skills: Array.isArray(project.skills) ? project.skills.map(skill => extractSafeString(skill)) : [],
          technologies: Array.isArray(project.technologies) ? project.technologies.map(tech => extractSafeString(tech)) : 
                       Array.isArray(project.tools) ? project.tools.map(tech => extractSafeString(tech)) :
                       Array.isArray(project.techStack) ? project.techStack.map(tech => extractSafeString(tech)) : [],
          
          // Weitere Details - SICHER TRANSFORMIERT mit Array-Validierung
          responsibilities: Array.isArray(project.responsibilities) ? project.responsibilities.map(resp => extractSafeString(resp)) : 
                           Array.isArray(project.tasks) ? project.tasks.map(task => extractSafeString(task)) : [],
          achievements: Array.isArray(project.achievements) ? project.achievements.map(ach => extractSafeString(ach)) : [],
          industry: extractSafeString(project.industry || project.sector) || '',
          projectSize: project.projectSize || project.teamSize || null,
          
          // Metadaten
          source: 'profiler'
          // originalData: project // ENTFERNT - könnte Sprach-Objekte enthalten
        });
      }
    }
  }

  return projects;
}

// Hilfsfunktion: Skills extrahieren
function extractSkills(rawData) {
  const skills = [];
  
  // Verschiedene Quellen für Skills
  const skillSources = [
    rawData.skills,
    rawData.technicalSkills,
    rawData.competencies,
    rawData.expertise
  ];

  for (const source of skillSources) {
    if (Array.isArray(source)) {
      for (const skill of source) {
        skills.push({
          name: skill.name || skill.title || skill,
          level: skill.level || skill.rating || skill.proficiency || 0,
          category: skill.category || skill.type || 'General',
          experience: skill.experience || skill.years || null,
          lastUsed: skill.lastUsed || null
        });
      }
    }
  }

  return skills;
}

// Hilfsfunktion: Zertifikate sicher extrahieren (ohne Sprach-Objekte)
function extractCertifications(rawData) {
  const certifications = [];
  
  if (Array.isArray(rawData.certifications)) {
    for (const cert of rawData.certifications) {
      // Transformiere Zertifikat zu sicherem Format
      const safeCert = {
        name: extractSafeString(cert.name) || 'Zertifikat',
        issuer: extractSafeString(cert.issuer) || cert.issueDate || '',
        date: cert.issueDate || cert.date || '',
        validUntil: cert.expirationDate || cert.validUntil || '',
        url: cert.url || ''
      };
      
      certifications.push(safeCert);
    }
  }
  
  return certifications;
}

// Hilfsfunktion: Bildung sicher extrahieren (ohne Sprach-Objekte)
function extractEducation(rawData) {
  const education = [];
  
  if (Array.isArray(rawData.education)) {
    for (const edu of rawData.education) {
      // Transformiere Bildung zu sicherem Format
      const safeEdu = {
        degree: extractSafeString(edu.degree) || extractSafeString(edu.title) || 'Abschluss',
        institution: extractSafeString(edu.institution) || extractSafeString(edu.school) || '',
        year: edu.year || edu.graduationYear || '',
        field: extractSafeString(edu.field) || extractSafeString(edu.major) || ''
      };
      
      education.push(safeEdu);
    }
  }
  
  return education;
}

// Hilfsfunktion: Sichere String-Extraktion (verhindert Sprach-Objekte)
function extractSafeString(value) {
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'object' && value !== null) {
    // Wenn es ein Sprach-Objekt ist, bevorzuge deutsche Übersetzung
    if (value.de) return value.de;
    if (value.en) return value.en;
    
    // Sonst ersten verfügbaren Wert nehmen
    const firstValue = Object.values(value)[0];
    if (typeof firstValue === 'string') {
      return firstValue;
    }
  }
  
  return null;
}

// Fallback Mock-Daten (für Entwicklung/Testing)
function getMockProfilerData(profileId) {
  // Generiere individuelle Mock-Daten basierend auf profileId
  const positions = ['Senior Consultant', 'Consultant', 'Principal Consultant', 'Manager', 'Senior Manager'];
  const departments = ['BU AT II (BAYERN)', 'BU AT I (BERLIN)', 'BU FINANCE', 'BU INSURANCE', 'BU AUTOMOTIVE'];
  const locations = ['München', 'Berlin', 'Hamburg', 'Frankfurt', 'Köln'];
  
  const hash = profileId.toString().split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return {
    id: profileId,
    name: `Mock Mitarbeiter ${profileId}`,
    email: `mock.mitarbeiter${profileId}@adesso.de`,
    position: positions[Math.abs(hash) % positions.length],
    department: departments[Math.abs(hash) % departments.length],
    location: locations[Math.abs(hash) % locations.length],
    startDate: '2020-01-15',
    skills: [
      { name: 'Java', level: 4, category: 'Programming', experience: '5+ Jahre' },
      { name: 'Spring Boot', level: 4, category: 'Framework', experience: '3+ Jahre' },
      { name: 'React', level: 3, category: 'Frontend', experience: '2+ Jahre' },
      { name: 'SAP', level: 3, category: 'ERP', experience: '4+ Jahre' }
    ],
    projects: [
      {
        name: 'SAP S/4HANA Migration',
        customer: 'Automotive AG',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        role: 'Senior SAP Consultant',
        description: 'Migration von SAP ECC zu S/4HANA',
        skills: ['SAP ABAP', 'SAP HANA', 'SAP Fiori'],
        technologies: ['SAP S/4HANA', 'SAP ABAP', 'SAP HANA DB', 'SAP Fiori'],
        responsibilities: ['ABAP-Entwicklung', 'Datenmodellierung', 'Performance-Optimierung'],
        industry: 'Automotive',
        source: 'mock'
      },
      {
        name: 'Digitalisierungsprojekt',
        customer: 'Finanz GmbH',
        startDate: '2022-06-01',
        endDate: '2022-12-31',
        role: 'Full-Stack Developer',
        description: 'Entwicklung einer modernen Web-Anwendung',
        skills: ['Java', 'Spring Boot', 'React', 'PostgreSQL'],
        technologies: ['Java 17', 'Spring Boot 3', 'React 18', 'Docker'],
        responsibilities: ['Backend-Entwicklung', 'API-Design', 'Code Reviews'],
        industry: 'Financial Services',
        source: 'mock'
      }
    ],
    certifications: ['Oracle Certified Professional Java SE', 'SAP Certified Development Associate'],
    languages: ['Deutsch (Muttersprache)', 'Englisch (Fließend)'],
    education: ['M.Sc. Informatik - TU München'],
    importedAt: new Date().toISOString(),
    source: 'mock'
  };
}

// Hilfsfunktion: Profiler-Daten in separater Collection speichern
async function saveProfilerData(employeeId, profileData) {
  try {
    console.log(`💾 Starte Speicherung für ${employeeId}:`, {
      hasProfileData: !!profileData,
      profileDataKeys: profileData ? Object.keys(profileData) : [],
      hasSkills: profileData?.skills?.length > 0,
      skillsCount: profileData?.skills?.length || 0,
      hasPersonalData: !!profileData?.personalData,
      authMethod: profileData?.authMethod
    });

    const profilerDataRef = admin.firestore().collection('profilerData').doc(employeeId);
    
    const dataToSave = {
      ...profileData,
      employeeId: employeeId,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };

    console.log(`🔍 Daten die gespeichert werden für ${employeeId}:`, {
      documentId: employeeId,
      collection: 'profilerData',
      dataSize: JSON.stringify(dataToSave).length,
      mainKeys: Object.keys(dataToSave),
      skillsIncluded: dataToSave.skills?.length || 0
    });
    
    await profilerDataRef.set(dataToSave);

    console.log(`✅ Profiler-Daten für ${employeeId} erfolgreich in profilerData Collection gespeichert`);
    
    // Verifikation: Prüfe ob die Daten wirklich gespeichert wurden
    const savedDoc = await profilerDataRef.get();
    if (savedDoc.exists) {
      const savedData = savedDoc.data();
      console.log(`🔍 Verifikation - Gespeicherte Daten für ${employeeId}:`, {
        documentExists: true,
        savedDataKeys: Object.keys(savedData),
        savedSkillsCount: savedData.skills?.length || 0,
        importedAt: savedData.importedAt?.toDate?.() || savedData.importedAt
      });
    } else {
      console.error(`❌ Verifikation fehlgeschlagen - Dokument ${employeeId} wurde nicht gespeichert!`);
    }
    
  } catch (error) {
    console.error(`❌ Fehler beim Speichern der Profiler-Daten für ${employeeId}:`, error);
    throw error;
  }
}

process.on('SIGTERM', async () => {
  // console.log entfernt
  process.exit(0);
});
