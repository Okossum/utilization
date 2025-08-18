import admin from 'firebase-admin';
import fs from 'fs';

const absoluteServiceAccountPath = '/Users/oliver.koss/Projekte/Ressource Utilization/ressourceutilization-firebase-adminsdk-fbsvc-e8129f7d59.json';
const svc = JSON.parse(fs.readFileSync(absoluteServiceAccountPath, 'utf8'));
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(svc) });
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

function parseWeekKeyToYearAndWeek(rawKey) {
  if (!rawKey) return null;
  const key = String(rawKey).trim();
  let m = key.match(/^KW\s*(\d{1,2})\s*-\s*(\d{4})$/i);
  if (m) {
    const week = Number(m[1]);
    const year = Number(m[2]);
    if (week >= 1 && week <= 53) return { year, week };
  }
  m = key.match(/^KW\s*(\d{1,2})\s*\/\s*(\d{2})$/i);
  if (m) {
    const week = Number(m[1]);
    const year = 2000 + Number(m[2]);
    if (week >= 1 && week <= 53) return { year, week };
  }
  m = key.match(/^KW\s*(\d{1,2})\s*\(\s*(\d{4})\s*\)$/i);
  if (m) {
    const week = Number(m[1]);
    const year = Number(m[2]);
    if (week >= 1 && week <= 53) return { year, week };
  }
  m = key.match(/^(\d{4})\s*[-\/]?\s*KW\s*(\d{1,2})$/i);
  if (m) {
    const year = Number(m[1]);
    const week = Number(m[2]);
    if (week >= 1 && week <= 53) return { year, week };
  }
  return null;
}

async function upsert() {
  const ausSnap = await db.collection('auslastung').where('isLatest', '==', true).get();
  const einSnap = await db.collection('einsatzplan').where('isLatest', '==', true).get();
  const ausRows = ausSnap.docs.map(d => d.data());
  const einRows = einSnap.docs.map(d => d.data());
  const personToAus = new Map();
  const personToEin = new Map();
  for (const r of ausRows) personToAus.set(String(r.person), r);
  for (const r of einRows) personToEin.set(String(r.person), r);
  const persons = new Set([...personToAus.keys(), ...personToEin.keys()]);
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  let total = 0;
  let idx = 0;
  let batch = db.batch();
  for (const person of persons) {
    const a = personToAus.get(person) || {};
    const e = personToEin.get(person) || {};
    const aValues = a.values || {};
    const eValues = e.values || {};
    const keys = new Set([...Object.keys(aValues), ...Object.keys(eValues)]);
    const meta = {
      lob: a.lob ?? e.lob ?? null,
      bereich: a.bereich ?? e.bereich ?? null,
      cc: a.cc ?? e.cc ?? null,
      team: a.team ?? e.team ?? null,
      lbs: e.lbs ?? null,
    };
    for (const k of keys) {
      const parsed = parseWeekKeyToYearAndWeek(k);
      if (!parsed) continue;
      const { year, week } = parsed;
      const ausValue = (aValues[k] !== undefined && Number.isFinite(Number(aValues[k]))) ? Number(aValues[k]) : null;
      const einValue = (eValues[k] !== undefined && Number.isFinite(Number(eValues[k]))) ? Number(eValues[k]) : null;
      if (ausValue === null && einValue === null) continue;
      const finalValue = (ausValue !== null) ? ausValue : einValue;
      const source = (ausValue !== null && einValue !== null) ? 'both' : (ausValue !== null ? 'auslastung' : 'einsatzplan');
      const isHistorical = (year < currentYear);
      const weekLabel = `${year}-KW${week}`;
      const ref = db.collection('utilizationData').doc(`${person}__${weekLabel}`);
      batch.set(ref, {
        person,
        year,
        weekNumber: week,
        week: weekLabel,
        auslastungValue: ausValue,
        einsatzplanValue: einValue,
        finalValue,
        isHistorical,
        source,
        isLatest: true,
        ...meta,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      total += 1;
      idx += 1;
      if (idx >= 450) {
        await batch.commit();
        batch = db.batch();
        idx = 0;
      }
    }
  }
  if (idx > 0) {
    await batch.commit();
  }
  
}

  upsert().then(() => process.exit(0)).catch(e => { process.exit(1); });


