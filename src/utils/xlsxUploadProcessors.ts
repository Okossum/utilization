// utils/xlsxUploadProcessors.ts
import * as XLSX from "xlsx";
import { collection, doc, getDocs, query, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";

/** -------------------- Gemeinsame Helfer -------------------- */

const A1 = (r0: number, c0: number) => XLSX.utils.encode_cell({ r: r0, c: c0 });
const rangeOf = (ws: XLSX.WorkSheet) => XLSX.utils.decode_range(ws["!ref"]!);

const stripDiacritics = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const clean = (v: any) => stripDiacritics(String(v ?? "").trim()).replace(/\s+/g, " ").toLowerCase();
const normalizeName = (display: string) => clean(display);
const normalizeCc = (cc: string) => clean(cc).replace(/[–—−]/g, "-");

type PersonIndex = {
  byNameCc: Map<string, string>; // "name|cc" -> personId
  byName: Map<string, Set<string>>; // "name" -> set(personId)
};

async function buildPersonIndexFromDB(): Promise<PersonIndex> {
  const snap = await getDocs(query(collection(db, "mitarbeiter")));
  const byNameCc = new Map<string, string>();
  const byName = new Map<string, Set<string>>();
  snap.forEach(d => {
    const data = d.data() as any;
    const display = data.person ?? `${data.nachname ?? ""}, ${data.vorname ?? ""}`;
    const nameKey = normalizeName(display);
    const ccKey = normalizeCc(String(data.cc ?? ""));
    byNameCc.set(`${nameKey}|${ccKey}`, d.id);
    const set = byName.get(nameKey) ?? new Set<string>();
    set.add(d.id);
    byName.set(nameKey, set);
  });
  return { byNameCc, byName };
}

function matchPerson(personDisplay: string, cc: string | undefined, ix: PersonIndex):
  | { status: "matched"; personId: string }
  | { status: "ambiguous" }
  | { status: "unmatched" } {
  const n = normalizeName(personDisplay);
  const c = normalizeCc(String(cc ?? ""));
  const exact = ix.byNameCc.get(`${n}|${c}`);
  if (exact) return { status: "matched", personId: exact };
  const set = ix.byName.get(n);
  if (!set || set.size === 0) return { status: "unmatched" };
  if (set.size === 1) return { status: "matched", personId: [...set][0] };
  return { status: "ambiguous" };
}

function toNumberOrUndef(v: any): number | undefined {
  if (v === undefined || v === null || String(v).trim() === "") return undefined;
  const num = Number(String(v).replace(",", "."));
  return Number.isNaN(num) ? undefined : num;
}

/** -------------------- AUSLASTUNG-PARSER (JJ/KW in Headern) -------------------- */

function rowsFromFirstSheet(wb: XLSX.WorkBook) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, any>>(ws, { raw: false, defval: "" });
}

function extractWeekMapFromRow(row: Record<string, any>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(row)) {
    const m = String(k).match(/(\d{2})\s*\/\s*(\d{2})/); // "25/34"
    if (!m) continue;
    const key = `${m[1]}/${m[2]}`;
    const n = toNumberOrUndef(v);
    if (n !== undefined) out[key] = n;
  }
  return out;
}

export async function processAuslastungFlat(file: File, targetCollection = "auslastung") {
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: "array" });
  const rows = rowsFromFirstSheet(wb);

  const ix = await buildPersonIndexFromDB();
  const unresolved: any[] = [];
  let matched = 0, ambiguous = 0, unmatched = 0, written = 0;

  // Batch in Chunks
  const chunk = 400;
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = writeBatch(db);
    for (let j = 0; j < Math.min(chunk, rows.length - i); j++) {
      const row = rows[i + j];
      const person = String(row["Mitarbeiter (ID)"] ?? row["person"] ?? row["Name"] ?? "").replace(/\([^)]*\)\s*$/, "").trim();
      const cc = String(row["Hierarchie Slicer - CC"] ?? row["cc"] ?? "").trim();
      if (!person) continue;

      const res = matchPerson(person, cc, ix);
      if (res.status !== "matched" || !res.personId) {
        (res.status === "ambiguous") ? ambiguous++ : unmatched++;
        unresolved.push({ rowIndex: i + j + 2, person, cc, reason: res.status });
        continue;
      }
      matched++;

      const values = extractWeekMapFromRow(row);
      const ref = doc(collection(db, targetCollection), res.personId);
      batch.set(ref, {
        person,
        personId: res.personId,
        cc,
        values,                // { "25/34": 100, ... }
        fileName: file.name,
        updatedAt: new Date(),
        matchStatus: "matched"
      }, { merge: true });
      written++;
    }
    await batch.commit();
  }

  console.debug("✅ processAuslastungFlat", { matched, ambiguous, unmatched, written, unresolvedCount: unresolved.length });
  return { matched, ambiguous, unmatched, written, unresolved };
}

/** -------------------- EINSATZPLAN-PARSER (3er-Gruppen + KW in Zeile 3) -------------------- */

type WeeklyTriple = { kw: string; colProjekt: number; colNkv: number; colOrt: number };
type HeaderDetect = { headerRow0: number; nameCol0: number; ccCol0: number; firstProjektCol0: number; };

function normalizeKwLabel(v: string): string | null {
  const s = String(v).trim();
  // akzeptiere "KW 25/35", "25/35", "KW25/35"
  const m = s.match(/(\d{2})\s*\/\s*(\d{2})/);
  if (!m) return null;
  return `${m[1]}/${m[2]}`;
}

// Holt den tatsächlichen angezeigten Wert einer evtl. gemergten Zelle, indem wir "nach oben" wandern
function getMergedAwareValue(ws: XLSX.WorkSheet, r0: number, c0: number, maxUp = 3): any {
  for (let up = 0; up <= maxUp; up++) {
    const cell = ws[A1(r0 - up, c0)];
    if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== "") {
      return cell.v;
    }
  }
  return undefined;
}

// Header-Zeile dynamisch ermitteln (suche eine Zeile 0..6, in der A == "Name" und irgendwo "CC")
function detectHeader(ws: XLSX.WorkSheet): HeaderDetect | null {
  const range = rangeOf(ws);
  console.debug("🔍 detectHeader: Suche Header in Zeilen 0-6", { maxRow: range.e.r });
  
  for (let r0 = 0; r0 <= Math.min(6, range.e.r); r0++) {
    const a = String(ws[A1(r0, 0)]?.v ?? "").toLowerCase();
    console.debug(`🔍 Zeile ${r0}: Spalte A = "${a}"`);
    
    if (a !== "name") continue;
    console.debug(`✅ Zeile ${r0}: "Name" gefunden in Spalte A`);
    
    // finde irgendwo eine Spalte mit "cc"
    let ccCol0 = -1, firstProjektCol0 = -1;
    for (let c = 0; c <= range.e.c; c++) {
      const v = String(ws[A1(r0, c)]?.v ?? "").toLowerCase();
      if (v === "cc" && ccCol0 === -1) {
        ccCol0 = c;
        console.debug(`✅ Spalte ${c}: "CC" gefunden`);
      }
      if (v.includes("projekt") && firstProjektCol0 === -1) {
        firstProjektCol0 = c;
        console.debug(`✅ Spalte ${c}: "Projekt" gefunden`);
      }
    }
    
    if (ccCol0 !== -1) {
      // falls kein explizites "Projekt" gefunden wurde, gehe konservativ ab P (15)
      if (firstProjektCol0 === -1) firstProjektCol0 = Math.max(15, ccCol0 + 1);
      console.debug(`✅ Header erkannt: Zeile ${r0}, CC: ${ccCol0}, Projekt: ${firstProjektCol0}`);
      return { headerRow0: r0, nameCol0: 0, ccCol0, firstProjektCol0 };
    }
  }
  
  console.warn("❌ detectHeader: Kein Header gefunden");
  return null;
}

function getWeeklyTriplesRobust(ws: XLSX.WorkSheet) {
  const range = rangeOf(ws);
  const det = detectHeader(ws);
  if (!det) {
    console.warn("⚠️ Header nicht erkannt: Erwartet Zeile mit 'Name' in Spalte A und 'CC' rechts davon.");
    return { triples: [] as WeeklyTriple[], meta: null as any };
  }
  const { headerRow0, firstProjektCol0 } = det;
  const startCol0 = firstProjektCol0;        // echte Startspalte (nicht hart auf P)
  const dataStart0 = headerRow0 + 1;

  const triples: WeeklyTriple[] = [];
  // Wir suchen die KW über der Projekt-Spalte: KW kann in Zeile headerRow0 selbst oder darüber sein (gemergt)
  for (let c = startCol0; c <= range.e.c; c += 3) {
    const kwRaw = getMergedAwareValue(ws, headerRow0, c, 3);
    const kw = normalizeKwLabel(String(kwRaw ?? ""));
    if (!kw) continue;
    triples.push({ kw, colProjekt: c, colNkv: c + 1, colOrt: c + 2 });
  }

  // Fallback: Wenn nichts gefunden, probiere 1 Zeile tiefer/höher und scan ab startCol0 bis Ende Spalte für jede Spalte,
  // dann gruppiere nach 3er Offsets relativ zum ersten gefundenen "Projekt".
  if (triples.length === 0) {
    // brute: scanne Spalten 0..range.e.c und suche KWs, dann reguliere auf 3er-Raster
    const kwCols: { c: number; kw: string }[] = [];
    for (let c = 0; c <= range.e.c; c++) {
      const vUp = getMergedAwareValue(ws, headerRow0, c, 4);
      const kw = normalizeKwLabel(String(vUp ?? ""));
      if (kw) kwCols.push({ c, kw });
    }
    // versuche ein 3er-Raster zu bilden: nimm die kleinste c >= startCol0 als "Projekt-Spalte 0"
    const first = kwCols.find(k => k.c >= startCol0);
    if (first) {
      for (const k of kwCols) {
        const delta = k.c - first.c;
        if (delta % 3 === 0) {
          triples.push({ kw: k.kw, colProjekt: k.c, colNkv: k.c + 1, colOrt: k.c + 2 });
        }
      }
    }
  }

  console.debug("🔍 getWeeklyTriplesRobust", {
    headerRow0,
    dataStart0,
    startCol0,
    triplesCount: triples.length,
    sample: triples.slice(0, 5)
  });

  return { triples, meta: { headerRow0, dataStart0, startCol0 } };
}

export async function processEinsatzplanToSubcollections(file: File, sheetName = "Einsatzplan") {
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: "array" });
  const ws = wb.Sheets[sheetName] ?? wb.Sheets[wb.SheetNames[0]];
  const range = rangeOf(ws);

  const { triples, meta } = getWeeklyTriplesRobust(ws);
  if (triples.length === 0) {
    console.warn("⚠️ Keine WeeklyTriples erkannt. Prüfe: Header-Zeile (dynamisch), Startspalte (Projekt), KW-Labels/merges.");
    // Debug-Hilfe: logge ein paar Zellen, die oft kritisch sind
    const probes = [
      { r: 2, c: 15 }, { r: 3, c: 15 }, { r: 2, c: 16 }, { r: 2, c: 18 }
    ].map(p => ({ rc: `${p.r},${p.c}`, v: ws[A1(p.r, p.c)]?.v }));
    console.debug("🔎 KW-Probes", probes);
    return { matched: 0, ambiguous: 0, unmatched: 0, written: 0, unresolved: [], triplesCount: 0 };
  }

  const det = detectHeader(ws)!;
  const { headerRow0, nameCol0, ccCol0 } = det;
  const dataStart0 = headerRow0 + 1;

  const ix = await buildPersonIndexFromDB();

  const unresolved: any[] = [];
  let matched = 0, ambiguous = 0, unmatched = 0, writtenDocs = 0;

  // wir sammeln pro Person+KW die entries[] und committen in Batches
  // Map key: personId|kw
  const upserts = new Map<string, {
    personId: string; kw: string; docId: string;
    payload: { kw: string; entries: Array<{ projekt?: string; ort?: string; nkvProzent?: number }>; team?: string; lob?: string; bereich?: string; sourceFile: string; updatedAt: Date; }
  }>();

  // Hilfsspalten für optionale Felder (suche per Headertext)
  const headerRowIdx = headerRow0;
  const findCol = (label: string) => {
    for (let c = 0; c <= range.e.c; c++) {
      const v = String(ws[A1(headerRowIdx, c)]?.v ?? "").toLowerCase();
      if (v === label.toLowerCase()) return c;
    }
    return -1;
  };
  const teamCol0 = findCol("team");
  const lobCol0 = findCol("lob");
  const bereichCol0 = findCol("bereich");

  for (let r = dataStart0; r <= range.e.r; r++) {
    const person = String(ws[A1(r, nameCol0)]?.v ?? "").trim();
    if (!person) continue;
    const cc = String(ws[A1(r, ccCol0)]?.v ?? "").trim();

    const team = teamCol0 >= 0 ? String(ws[A1(r, teamCol0)]?.v ?? "").trim() || undefined : undefined;
    const lob =  lobCol0  >= 0 ? String(ws[A1(r, lobCol0 )]?.v ?? "").trim() || undefined : undefined;
    const bereich = bereichCol0 >= 0 ? String(ws[A1(r, bereichCol0)]?.v ?? "").trim() || undefined : undefined;

    const res = matchPerson(person, cc, ix);
    if (res.status !== "matched" || !res.personId) {
      (res.status === "ambiguous") ? ambiguous++ : unmatched++;
      unresolved.push({ rowIndex: r + 1, person, cc, reason: res.status });
      continue;
    }
    matched++;

    // pro Zeile alle Weekly-Entries sammeln
    const entriesByKw = new Map<string, Array<{ projekt?: string; ort?: string; nkvProzent?: number }>>();

    for (const t of triples) {
      const vProjekt = ws[A1(r, t.colProjekt)]?.v;
      const vNkv = ws[A1(r, t.colNkv)]?.v;
      const vOrt = ws[A1(r, t.colOrt)]?.v;

      const projekt = vProjekt != null && String(vProjekt).trim() !== "" ? String(vProjekt).trim() : undefined;
      const ort = vOrt != null && String(vOrt).trim() !== "" ? String(vOrt).trim() : undefined;
      const nkvProzent = toNumberOrUndef(vNkv);

      if (!projekt && !ort && nkvProzent == null) continue;

      const arr = entriesByKw.get(t.kw) ?? [];
      arr.push({ projekt, ort, nkvProzent });
      entriesByKw.set(t.kw, arr);
    }

    // pro KW ein Subdoc vorbereiten
    for (const [kw, entries] of entriesByKw) {
      const docId = kw.replace("/", "-"); // "25-34"
      const key = `${res.personId}|${kw}`;

      upserts.set(key, {
        personId: res.personId,
        kw,
        docId,
        payload: {
          kw,
          entries,
          team,
          lob,
          bereich,
          sourceFile: file.name,
          updatedAt: new Date(),
        }
      });
    }
  }

  // Batch-Commit der Subcollection-Dokumente
  const items = Array.from(upserts.values());
  const chunk = 400;
  for (let i = 0; i < items.length; i += chunk) {
    const batch = writeBatch(db);
    const slice = items.slice(i, i + chunk);
    for (const it of slice) {
      const ref = doc(collection(db, "mitarbeiter", it.personId, "weeks"), it.docId);
      batch.set(ref, it.payload, { merge: true }); // idempotent
      writtenDocs++;
    }
    await batch.commit();
  }

  console.debug("✅ processEinsatzplanToSubcollections", {
    matched, ambiguous, unmatched, writtenDocs, unresolvedCount: unresolved.length,
    headerRow0, startCol0: meta?.startCol0, triplesCount: triples.length
  });
  return { matched, ambiguous, unmatched, written: writtenDocs, unresolved, triplesCount: triples.length };
}

/** -------------------- Dispatcher: erkennt Datei-Typ automatisch -------------------- */

export async function processPlanOrLoad(file: File) {
  // Erkennen anhand des Sheet-Namens oder der Headerstruktur
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: "array" });

  // 1) Einsatzplan heuristik: Sheet "Einsatzplan" vorhanden ODER in Zeile 3 ab Spalte P steht "KW xx/yy"
  const wsCandidate = wb.Sheets["Einsatzplan"] ?? wb.Sheets[wb.SheetNames[0]];
  let isEinsatzplan = false;
  try {
    const kwProbe = wsCandidate[A1(2, 15)]?.v; // Zeile 3, Spalte P
    isEinsatzplan = /(\d{2})\s*\/\s*(\d{2})/.test(String(kwProbe ?? ""));
  } catch { /* ignore */ }

  if (isEinsatzplan) {
    console.debug("🔎 erkannt: EINSATZPLAN (3er-Gruppen + KW in Zeile 3)");
    return await processEinsatzplanToSubcollections(file, "Einsatzplan");
  }

  // 2) andernfalls behandeln wir es als AUSLASTUNG (JJ/KW in Headern)
  console.debug("🔎 erkannt: AUSLASTUNG (JJ/KW in Headern)");
  return await processAuslastungFlat(file, "auslastung");
}
