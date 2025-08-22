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
    console.warn('⚠️ removeUndefinedDeep: Maximale Tiefe erreicht, stoppe Rekursion');
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
    console.warn('⚠️ removeInvalidNumbersDeep: Maximale Tiefe erreicht, stoppe Rekursion');
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
    console.log('🔒 authMiddleware: Kein Token im Header gefunden');
    req.user = null;
    return next();
  }
  
  try {
    console.log('🔍 authMiddleware: Verifiziere Token...');
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    console.log('✅ authMiddleware: Token erfolgreich verifiziert für User:', decoded.uid);
  } catch (error) {
    console.log('❌ authMiddleware: Token-Verifikation fehlgeschlagen:', error.message);
    req.user = null;
  }
  next();
}

app.use(authMiddleware);

// Require authenticated user
function requireAuth(req, res, next) {
  if (!req.user?.uid) {
    console.log('🔒 requireAuth: Kein User gefunden, req.user:', req.user);
    return res.status(401).json({ error: 'Authentifizierung fehlgeschlagen - bitte melden Sie sich erneut an' });
  }
  console.log('✅ requireAuth: User authentifiziert:', req.user.uid);
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

    console.log(`🔍 Speichere Mitarbeiter Knowledge: ${data.length} Einträge`);

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

    console.log(`✅ Mitarbeiter Knowledge erfolgreich gespeichert: ${results.length} Einträge verarbeitet`);

    res.json({
      success: true,
      message: 'Mitarbeiter Knowledge erfolgreich gespeichert',
      results,
      historyId: historyRef.id
    });

  } catch (error) {
    console.error('❌ Fehler beim Speichern der Mitarbeiter Knowledge:', error);
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

    console.log(`🔍 Speichere Branchen Know-How: ${data.length} Einträge`);

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

    console.log(`✅ Branchen Know-How erfolgreich gespeichert: ${results.length} Einträge verarbeitet`);

    res.json({
      success: true,
      message: 'Branchen Know-How erfolgreich gespeichert',
      results,
      historyId: historyRef.id
    });

  } catch (error) {
    console.error('❌ Fehler beim Speichern des Branchen Know-How:', error);
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
    console.error('❌ Fehler beim Laden der Mitarbeiter Knowledge:', error);
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
    console.error('❌ Fehler beim Laden des Branchen Know-How:', error);
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
    console.error('❌ Fehler beim Laden aller Knowledge-Daten:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// ===== AUSLASTUNG API ENDPOINTS =====

// Auslastung-Daten speichern oder aktualisieren (Firestore)
app.post('/api/auslastung', requireAuth, async (req, res) => {
  console.log('🚀 === AUSLASTUNG UPLOAD START ===');
  console.log('📨 Request Body erhalten:', JSON.stringify(req.body, null, 2));
  
  try {
    // 🔍 DEBUG: Zeige alle empfangenen Daten
    console.log('🔍 DEBUG - Empfangene Daten:', JSON.stringify(req.body, null, 2));
    console.log('🔍 DEBUG - Erste Zeile:', req.body[0]);
    console.log('🔍 DEBUG - Erste Zeile Keys:', Object.keys(req.body[0] || {}));
    
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
      console.log(`🔍 AUSLASTUNG - Verarbeite Person: ${row.person}, personId: ${row.personId}, Typ: ${typeof row.personId}`);
      
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

    console.log(`✅ ${results.length} Personen verarbeitet (${updatedCount} aktualisiert, ${createdCount} neu erstellt, ${totalNewWeeks} KW-Werte hinzugefügt)`);
    console.log('🎯 === AUSLASTUNG UPLOAD ERFOLGREICH ===');
    
    res.json({ 
      success: true, 
      historyId: historyRef.id, 
      version: newVersion,
      results,
      message: `${results.length} Personen verarbeitet (${updatedCount} aktualisiert, ${createdCount} neu erstellt, ${totalNewWeeks} KW-Werte hinzugefügt)`
    });

  } catch (error) {
    console.error('❌ Fehler beim Auslastung-Upload:', error);
    console.log('💥 === AUSLASTUNG UPLOAD FEHLGESCHLAGEN ===');
    
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
      console.log(`🔍 EINSATZPLAN - Verarbeite Person: ${row.person}, personId: ${row.personId}, Typ: ${typeof row.personId}`);
      
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
    console.log('🔍 DEBUG: Rohe Auslastung-Daten vor Filter:', out.length);
    // out = applyScopeFilter(out, profile, req.user?.admin);
    console.log('🔍 DEBUG: Auslastung-Daten nach Filter (deaktiviert):', out.length);
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
    console.log('🔍 DEBUG: Rohe Einsatzplan-Daten vor Filter:', out.length);
    // out = applyScopeFilter(out, profile, req.user?.admin);
    console.log('🔍 DEBUG: Einsatzplan-Daten nach Filter (deaktiviert):', out.length);
    res.json(out);
  } catch (error) {
    
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Mitarbeiter-Daten speichern oder aktualisieren (Firestore)
app.post('/api/mitarbeiter', requireAuth, async (req, res) => {
  console.log('🚀 === MITARBEITER UPLOAD START ===');
  console.log('📨 Request Body erhalten:', JSON.stringify(req.body, null, 2));
  
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
          isLatest: true,
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

    console.log(`✅ ${results.length} Mitarbeiter verarbeitet (${updatedCount} aktualisiert, ${createdCount} neu erstellt)`);
    console.log('🎯 === MITARBEITER UPLOAD ERFOLGREICH ===');
    
    res.json({ 
      success: true, 
      historyId: historyRef.id, 
      version: newVersion,
      results,
      message: `${results.length} Mitarbeiter verarbeitet (${updatedCount} aktualisiert, ${createdCount} neu erstellt)`
    });

  } catch (error) {
    console.error('❌ Fehler beim Mitarbeiter-Upload:', error);
    console.log('💥 === MITARBEITER UPLOAD FEHLGESCHLAGEN ===');
    
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
    console.log('🔍 POST /api/employee-dossier - Request Headers:', req.headers);
    console.log('🔍 POST /api/employee-dossier - Request Body:', JSON.stringify(req.body, null, 2));
    
    const { employeeId, dossierData } = req.body;
    
    console.log('🔍 POST /api/employee-dossier - Extrahierte Daten:', { employeeId, dossierData });
    
    if (!employeeId || !dossierData) {
      console.error('❌ Ungültige Daten:', { employeeId, dossierData });
      return res.status(400).json({ error: 'Ungültige Daten', received: { employeeId, dossierData } });
    }

    // Verwende employeeId als Dokument-ID, falls nicht vorhanden
    const docId = String(employeeId);
    const docRef = db.collection('employeeDossiers').doc(docId);
    const snap = await docRef.get();
    
    // Erstelle Payload mit allen verfügbaren Feldern (mit Normalisierung)
    const normalizedProjectHistory = Array.isArray(dossierData.projectHistory)
      ? dossierData.projectHistory.map((project) => ({
          id: String(project.id || Date.now().toString()),
          projectName: String(project.projectName || project.project || ''),
          customer: String(project.customer || ''),
          role: String(project.role || ''),
          duration: String(project.duration || ''),
          activities: Array.isArray(project.activities) ? project.activities.filter(a => typeof a === 'string') : []
        }))
      : [];

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
      console.log('✅ Payload nach Sanitisierung:', JSON.stringify(payload, null, 2));
    } catch (sanitizeError) {
      console.error('❌ Fehler bei der Payload-Sanitisierung:', sanitizeError);
      // Verwende den ursprünglichen Payload ohne Sanitisierung
      payload = {
        employeeId: docId,
        name: dossierData.displayName || dossierData.name || employeeId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: snap.exists ? snap.data().createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      };
    }
    
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
    console.log(`🔍 GET /api/employee-skills/${employeeName} - Lade Skills`);
    console.log(`🔍 DEBUG: Suche nach Dokument-ID: "${employeeName}"`);
    
    const snap = await db.collection('employeeDossiers').doc(String(employeeName)).get();
    if (!snap.exists) {
      console.log(`📝 Employee ${employeeName} nicht gefunden, gebe leeres Array zurück`);
      return res.json([]);
    }
    
    const data = snap.data();
    console.log(`🔍 DEBUG: Dokument gefunden, data.skills:`, data.skills);
    const skills = Array.isArray(data.skills) ? data.skills : [];
    console.log(`✅ Skills für ${employeeName} geladen:`, skills.length, 'Skills');
    res.json(skills);
  } catch (error) {
    console.error('❌ Fehler beim Laden der Employee Skills:', error);
    res.status(500).json({ error: 'Interner Server-Fehler', details: error.message });
  }
});

app.post('/api/employee-skills/:employeeName', requireAuth, async (req, res) => {
  try {
    const { employeeName } = req.params;
    const { skills } = req.body;
    
    console.log(`💾 POST /api/employee-skills/${employeeName} - Speichere Skills:`, skills);
    
    if (!Array.isArray(skills)) {
      console.error('❌ Ungültige Skills-Daten:', skills);
      return res.status(400).json({ error: 'Ungültige Skills-Daten - Array erwartet' });
    }
    
    // Validiere Skills-Struktur
    const validatedSkills = skills.map(skill => ({
      skillId: String(skill.skillId || skill.id || ''),
      skillName: String(skill.name || skill.skillName || ''), // ✅ FIX: skillName statt name für Konsistenz
      level: Math.max(0, Math.min(5, Number(skill.level) || 0))
    })).filter(skill => skill.skillId && skill.skillName);
    
    console.log(`✅ Validierte Skills:`, validatedSkills);
    
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
      console.log(`✅ Neues Dossier für ${employeeName} mit Skills erstellt`);
    } else {
      // Aktualisiere bestehendes Dossier
      await docRef.update({
        skills: validatedSkills,
        updatedAt: FieldValue.serverTimestamp()
      });
      console.log(`✅ Skills für ${employeeName} aktualisiert`);
    }
    
    res.json({ 
      success: true, 
      message: 'Skills erfolgreich gespeichert',
      skills: validatedSkills,
      count: validatedSkills.length
    });
  } catch (error) {
    console.error('❌ Fehler beim Speichern der Employee Skills:', error);
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
  console.log('🚀 === EMPLOYEE UPLOAD START ===');
  console.log('📨 Request Body erhalten:', JSON.stringify(req.body, null, 2));
  
  if (!req.user) {
    console.log('❌ Keine Autorisierung');
    return res.status(401).json({ error: 'Nicht autorisiert' });
  }
  
  try {
    const { employees } = req.body;
    
    if (!Array.isArray(employees) || employees.length === 0) {
      console.log('❌ Keine Employee-Daten im Request Body');
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
    console.log('🎯 === EMPLOYEE UPLOAD ERFOLGREICH ===');
    res.json({ 
      success: true, 
      message: `${count} Mitarbeiter erfolgreich gespeichert`,
      count 
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Speichern der Employee-Stammdaten:', error);
    console.log('💥 === EMPLOYEE UPLOAD FEHLGESCHLAGEN ===');
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
    
    console.log(`✅ ${skills.length} verfügbare Skills geladen`);
    res.json(skills);
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Skills:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// Erstelle Test-Skills (einmalig)
app.post('/api/skills/init', requireAuth, async (req, res) => {
  try {
    console.log('🔧 Initialisiere Test-Skills...');
    
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
        console.log(`✅ Skill erstellt: ${skill.name}`);
      } else {
        skipped++;
        console.log(`⏭️ Skill existiert bereits: ${skill.name}`);
      }
    }
    
    console.log(`🎉 Skills initialisiert: ${created} erstellt, ${skipped} übersprungen`);
    res.json({ 
      message: `Skills erfolgreich initialisiert: ${created} erstellt, ${skipped} übersprungen`,
      created,
      skipped 
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Initialisieren der Skills:', error);
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
    
    console.log(`✅ Skill ${skillName} (Level ${level}) erfolgreich Mitarbeiter ${employeeId} zugewiesen`);
    console.log(`🔍 DEBUG: Gespeichert in Dokument-ID: "${employeeId}"`);
    console.log(`🔍 DEBUG: Skills Array Länge nach Speichern: ${dossierData.skills.length}`);
    
    res.json({
      success: true,
      id: skillData.id,
      message: 'Skill erfolgreich zugewiesen'
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Zuweisen des Skills:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

app.get('/api/employee-skills/:employeeId', requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    console.log(`🔍 GET /api/employee-skills/${employeeId} - Lade Skills aus employeeDossiers`);
    
    // Lade das employeeDossier
    const dossierDoc = await db.collection('employeeDossiers').doc(employeeId).get();
    
    if (!dossierDoc.exists) {
      console.log(`📝 Employee ${employeeId} nicht gefunden, gebe leeres Array zurück`);
      return res.json([]);
    }
    
    const dossierData = dossierDoc.data();
    const skills = Array.isArray(dossierData.skills) ? dossierData.skills : [];
    
    console.log(`✅ ${skills.length} Skills für Mitarbeiter ${employeeId} geladen`);
    res.json(skills);
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Skills:', error);
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
    
    console.log(`✅ Skill-Level für Mitarbeiter ${employeeId}, Skill ${skillId} auf ${level} aktualisiert`);
    
    res.json({
      success: true,
      message: 'Skill-Level erfolgreich aktualisiert'
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren des Skill-Levels:', error);
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
    
    console.log(`✅ Skill ${skillId} erfolgreich von Mitarbeiter ${employeeId} entfernt`);
    
    res.json({
      success: true,
      message: 'Skill erfolgreich entfernt'
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Entfernen des Skills:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// ==========================================
// ROLES MANAGEMENT API ENDPOINTS
// ==========================================

// GET /api/roles - Alle Rollen laden
app.get('/api/roles', requireAuth, async (req, res) => {
  try {
    console.log('🔍 GET /api/roles - Lade alle Rollen');
    
    const rolesSnap = await db.collection('roles')
      .where('isActive', '==', true)
      .get();
    
    const roles = rolesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sortiere Rollen nach Name (im Code, da Firebase Index benötigt)
    roles.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    console.log(`✅ ${roles.length} aktive Rollen geladen`);
    res.json(roles);
  } catch (error) {
    console.error('❌ Fehler beim Laden der Rollen:', error);
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
    
    console.log(`🔍 POST /api/roles - Erstelle neue Rolle: ${name}`);
    
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
    
    console.log(`✅ Rolle "${name}" erfolgreich erstellt mit ID: ${docRef.id}`);
    
    res.json({
      success: true,
      id: docRef.id,
      role: { id: docRef.id, ...roleData }
    });
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Rolle:', error);
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
    
    console.log(`🔍 PUT /api/roles/${id} - Bearbeite Rolle: ${name}`);
    
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
    
    console.log(`✅ Rolle "${name}" erfolgreich aktualisiert`);
    
    res.json({
      success: true,
      role: { id, ...roleDoc.data(), ...updateData }
    });
  } catch (error) {
    console.error('❌ Fehler beim Bearbeiten der Rolle:', error);
    res.status(500).json({ error: 'Fehler beim Bearbeiten der Rolle' });
  }
});

// DELETE /api/roles/:id - Rolle löschen (soft delete)
app.delete('/api/roles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 DELETE /api/roles/${id} - Lösche Rolle`);
    
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
    
    console.log(`✅ Rolle "${roleName}" erfolgreich als inaktiv markiert`);
    
    res.json({
      success: true,
      message: `Rolle "${roleName}" wurde gelöscht`
    });
  } catch (error) {
    console.error('❌ Fehler beim Löschen der Rolle:', error);
    res.status(500).json({ error: 'Fehler beim Löschen der Rolle' });
  }
});

// ==========================================
// TECHNICAL SKILLS MANAGEMENT API ENDPOINTS
// ==========================================

// GET /api/technical-skills - Alle Technical Skills laden
app.get('/api/technical-skills', requireAuth, async (req, res) => {
  try {
    console.log('🔍 GET /api/technical-skills - Lade alle Technical Skills');
    
    const skillsSnap = await db.collection('technicalSkills')
      .where('isActive', '==', true)
      .get();
    
    const skills = skillsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ ${skills.length} Technical Skills geladen`);
    
    res.json(skills);
  } catch (error) {
    console.error('❌ Fehler beim Laden der Technical Skills:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Technical Skills' });
  }
});

// POST /api/technical-skills - Neuen Technical Skill erstellen
app.post('/api/technical-skills', requireAuth, async (req, res) => {
  try {
    const { name, description, category } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Skill-Name ist erforderlich' });
    }
    
    console.log(`🔍 POST /api/technical-skills - Erstelle neuen Skill: ${name}`);
    
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
      category: category?.trim() || '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('technicalSkills').add(newSkill);
    
    console.log(`✅ Technical Skill "${name}" erfolgreich erstellt mit ID: ${docRef.id}`);
    
    res.json({
      success: true,
      skill: { id: docRef.id, ...newSkill }
    });
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Technical Skills:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Technical Skills' });
  }
});

// PUT /api/technical-skills/:id - Technical Skill bearbeiten
app.put('/api/technical-skills/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Skill-Name ist erforderlich' });
    }
    
    console.log(`🔍 PUT /api/technical-skills/${id} - Bearbeite Skill: ${name}`);
    
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
      category: category?.trim() || '',
      updatedAt: new Date()
    };
    
    await db.collection('technicalSkills').doc(id).update(updatedSkill);
    
    console.log(`✅ Technical Skill "${name}" erfolgreich aktualisiert`);
    
    res.json({
      success: true,
      skill: { id, ...skillDoc.data(), ...updatedSkill }
    });
  } catch (error) {
    console.error('❌ Fehler beim Bearbeiten des Technical Skills:', error);
    res.status(500).json({ error: 'Fehler beim Bearbeiten des Technical Skills' });
  }
});

// DELETE /api/technical-skills/:id - Technical Skill löschen (soft delete)
app.delete('/api/technical-skills/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 DELETE /api/technical-skills/${id} - Lösche Skill`);
    
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
    
    console.log(`✅ Technical Skill "${skillName}" erfolgreich als inaktiv markiert`);
    
    res.json({
      success: true,
      message: `Technical Skill "${skillName}" wurde gelöscht`
    });
  } catch (error) {
    console.error('❌ Fehler beim Löschen des Technical Skills:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Technical Skills' });
  }
});

// ==========================================
// EMPLOYEE ROLE ASSIGNMENT API ENDPOINTS
// ==========================================

// GET /api/employee-roles/:employeeId - Zugewiesene Rollen eines Mitarbeiters laden
app.get('/api/employee-roles/:employeeId', requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    console.log(`🔍 GET /api/employee-roles/${employeeId} - Lade zugewiesene Rollen`);
    
    // Lade das employeeDossier
    const dossierDoc = await db.collection('employeeDossiers').doc(employeeId).get();
    
    if (!dossierDoc.exists) {
      console.log(`📝 Employee ${employeeId} nicht gefunden, gebe leeres Array zurück`);
      return res.json([]);
    }
    
    const dossierData = dossierDoc.data();
    const assignedRoles = Array.isArray(dossierData.assignedRoles) ? dossierData.assignedRoles : [];
    
    console.log(`✅ ${assignedRoles.length} zugewiesene Rollen für Mitarbeiter ${employeeId} geladen`);
    res.json(assignedRoles);
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der zugewiesenen Rollen:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// POST /api/employee-roles/:employeeId - Rolle einem Mitarbeiter zuweisen
app.post('/api/employee-roles/:employeeId', requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { roleId, level } = req.body;
    
    if (!roleId || !level || level < 1 || level > 5) {
      return res.status(400).json({ error: 'roleId und level (1-5) sind erforderlich' });
    }
    
    console.log(`🔍 POST /api/employee-roles/${employeeId} - Weise Rolle ${roleId} zu (Level ${level})`);
    
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
      assignedAt: new Date(),
      lastUpdated: new Date()
    };
    
    // Füge die Rolle zum Array hinzu
    dossierData.assignedRoles.push(roleAssignment);
    
    // Speichere das aktualisierte Dossier
    await dossierRef.set(dossierData, { merge: true });
    
    console.log(`✅ Rolle ${roleName} (Level ${level}) erfolgreich Mitarbeiter ${employeeId} zugewiesen`);
    
    res.json({
      success: true,
      id: roleAssignment.id,
      assignment: roleAssignment,
      message: 'Rolle erfolgreich zugewiesen'
    });
  } catch (error) {
    console.error('❌ Fehler beim Zuweisen der Rolle:', error);
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
    
    console.log(`🔍 PUT /api/employee-roles/${employeeId}/${assignmentId} - Ändere Level auf ${level}`);
    
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
    console.log(`✅ Rollen-Level für ${updatedAssignment.roleName} erfolgreich auf ${level} geändert`);
    
    res.json({
      success: true,
      assignment: updatedAssignment,
      message: 'Rollen-Level erfolgreich geändert'
    });
  } catch (error) {
    console.error('❌ Fehler beim Ändern des Rollen-Levels:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
});

// DELETE /api/employee-roles/:employeeId/:assignmentId - Rollen-Zuweisung entfernen
app.delete('/api/employee-roles/:employeeId/:assignmentId', requireAuth, async (req, res) => {
  try {
    const { employeeId, assignmentId } = req.params;
    
    console.log(`🔍 DELETE /api/employee-roles/${employeeId}/${assignmentId} - Entferne Rollen-Zuweisung`);
    
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
    
    console.log(`✅ Rollen-Zuweisung ${removedAssignment.roleName} erfolgreich entfernt`);
    
    res.json({
      success: true,
      message: `Rollen-Zuweisung "${removedAssignment.roleName}" wurde entfernt`
    });
  } catch (error) {
    console.error('❌ Fehler beim Entfernen der Rollen-Zuweisung:', error);
    res.status(500).json({ error: 'Interner Server-Fehler' });
  }
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
