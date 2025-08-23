// file: src/lib/uploaders.ts
import * as XLSX from "xlsx";
import {
  collection, doc, getDocs, query, setDoc, writeBatch
} from "firebase/firestore";
import { db } from "./firebase";
import { logger } from "./logger";
import { triggerConsolidationAfterUpload } from "./consolidation";

/* -------------------- Shared helpers -------------------- */

const A1 = (r0:number, c0:number) => XLSX.utils.encode_cell({ r:r0, c:c0 });
const rangeOf = (ws: XLSX.WorkSheet) => XLSX.utils.decode_range(ws["!ref"]!);

const strip = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const clean  = (v: any) => strip(String(v ?? "").trim()).replace(/\s+/g, " ").toLowerCase();
const normName = (d: string) => clean(d);
const normCc   = (d: string) => clean(d).replace(/[–—−]/g, "-");

async function sid(input: string): Promise<string> {
  const msg = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-1", msg);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

type PersonIndex = { byNameCc: Map<string,string>; byName: Map<string, Set<string>>; };

async function buildPersonIndexFromDB(): Promise<PersonIndex> {
  const snap = await getDocs(query(collection(db, "mitarbeiter")));
  const byNameCc = new Map<string,string>();
  const byName   = new Map<string, Set<string>>();
  snap.forEach(d=>{
    const data = d.data() as any;
    const display = data.person ?? `${data.nachname ?? ""}, ${data.vorname ?? ""}`;
    const nameKey = normName(display);
    const ccKey   = normCc(String(data.cc ?? ""));
    byNameCc.set(`${nameKey}|${ccKey}`, d.id);
    const set = byName.get(nameKey) ?? new Set<string>(); set.add(d.id); byName.set(nameKey, set);
  });
  return { byNameCc, byName };
}

function matchPerson(personDisplay: string, cc: string | undefined, ix: PersonIndex):
  | { status: "matched"; personId: string }
  | { status: "ambiguous" }
  | { status: "unmatched" } {
  const n = normName(personDisplay);
  const c = normCc(String(cc ?? ""));
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

function toBooleanOrUndef(v: any): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  const str = String(v).trim().toLowerCase();
  if (str === "" || str === "0" || str === "false" || str === "nein" || str === "no") return false;
  if (str === "1" || str === "true" || str === "ja" || str === "yes" || str === "x") return true;
  return undefined;
}

function parsePersonName(fullName: string): { nachname: string; vorname: string } {
  const trimmed = fullName.trim();
  
  // Format: "Nachname, Vorname" oder "Nachname,Vorname"
  const commaMatch = trimmed.match(/^([^,]+),\s*(.+)$/);
  if (commaMatch) {
    return {
      nachname: commaMatch[1].trim(),
      vorname: commaMatch[2].trim()
    };
  }
  
  // Format: "Vorname Nachname" (Fallback)
  const spaceMatch = trimmed.match(/^(.+)\s+([^\s]+)$/);
  if (spaceMatch) {
    return {
      nachname: spaceMatch[2].trim(),
      vorname: spaceMatch[1].trim()
    };
  }
  
  // Fallback: Alles als Nachname
  return {
    nachname: trimmed,
    vorname: ""
  };
}

function cellToIsoDate(cell: any, wb: XLSX.WorkBook): string | undefined {
  if (!cell) return undefined;

  // A) echtes Datum (nur bei cellDates:true)
  if (cell.t === "d" && cell.v instanceof Date) {
    const d = cell.v as Date;
    return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
  }

  // B) Seriennummer -> Datum
  if (cell.t === "n" && typeof cell.v === "number") {
    const date1904 = !!(wb.Workbook && wb.Workbook.WBProps && wb.Workbook.WBProps.date1904);
    const o = XLSX.SSF.parse_date_code(cell.v, { date1904 });
    if (o) {
      const iso = new Date(Date.UTC(o.y, o.m - 1, o.d)).toISOString().slice(0, 10);
      return iso;
    }
  }

  // C) Text-Formate
  if (cell.t === "s" && typeof cell.v === "string") {
    const s = cell.v.trim();

    // ISO bereits vorhanden
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // dd.mm.yyyy
    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (m) {
      const dd = +m[1], MM = +m[2], yyyy = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      return new Date(Date.UTC(yyyy, MM - 1, dd)).toISOString().slice(0, 10);
    }
  }

  return undefined;
}

/* =========================================================
   1) MITARBEITER – eigenständig
   - liest "Search Results" (oder 1. Sheet)
   - extrahiert Hyperlink-URL (cell.l.Target)
   - deterministische Doc-ID, merge:true (idempotent)
========================================================= */
export async function uploadMitarbeiter(file: File, sheetName = "Search Results") {
  // logger statement entfernt
  
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: "array", cellDates: true, cellStyles: true });
  const ws = wb.Sheets[sheetName] ?? wb.Sheets[wb.SheetNames[0]];
  const range = rangeOf(ws);

  logger.debug("uploaders.mitarbeiter", "Workbook gelesen", { 
    sheetName, 
    availableSheets: wb.SheetNames,
    range: range 
  });

  // Header-Zeile robust finden (Zeile mit "Vorname" & "E-Mail")
  let headerRow0 = 0;
  for (let r=0; r<=Math.min(20, range.e.r); r++) {
    const a = String(ws[A1(r,0)]?.v ?? "").toLowerCase();
    const c = String(ws[A1(r,2)]?.v ?? "").toLowerCase();
    if (a.includes("vorname") && c.includes("mail")) { headerRow0 = r; break; }
  }
  const dataStart0 = headerRow0 + 1;

  logger.debug("uploaders.mitarbeiter", "Header gefunden", { 
    headerRow0, 
    dataStart0,
    vornameCell: ws[A1(headerRow0,0)]?.v,
    emailCell: ws[A1(headerRow0,2)]?.v
  });

  // Spalten lokalisieren
  const findCol = (re: RegExp) => {
    for (let c=0; c<=range.e.c; c++) {
      const v = String(ws[A1(headerRow0,c)]?.v ?? "");
      if (re.test(v)) return c;
    }
    return -1;
  };
  const COL = {
    VOR: findCol(/vorname/i),
    NACH: findCol(/nachname/i),
    MAIL: findCol(/e-?mail/i),
    FIRMA: findCol(/firma/i),
    LOB: findCol(/business line|lob/i),
    CC: findCol(/competence center|^cc$/i),
    TEAM: findCol(/teamname|^team$/i),
    STANDORT: findCol(/standort|geschäftsstelle/i),
    LBS: findCol(/karrierestufe|lbs/i),
    ERF: findCol(/erfahrung/i),
    VERF_AB: findCol(/verf.*ab/i),
    STAFFBAR: findCol(/verf.*staffing|staffbar/i),
    LINK: findCol(/link/i),
  };

  // logger.debug entfernt

  let written = 0;
  for (let r = dataStart0; r <= range.e.r; r++) {
    const vor = COL.VOR>=0 ? String(ws[A1(r,COL.VOR)]?.v ?? "").trim() : "";
    const nach= COL.NACH>=0 ? String(ws[A1(r,COL.NACH)]?.v ?? "").trim() : "";
    if (!vor && !nach) continue;

    const cc   = COL.CC>=0  ? String(ws[A1(r,COL.CC )]?.v ?? "").trim() : "";
    const mail = COL.MAIL>=0? String(ws[A1(r,COL.MAIL)]?.v ?? "").trim() : "";

    const personDisplay = `${nach}, ${vor}`.trim();
    const id = await sid(`mitarbeiter|${normName(personDisplay)}|${normCc(cc)}`);
    
    // Parse Name in Nachname/Vorname
    const { nachname, vorname } = parsePersonName(personDisplay);
    
    // Debug: Zeige Namens-Aufteilung für erste paar Einträge
    if (written < 3) {
      logger.info("uploaders.mitarbeiter", `Namens-Aufteilung`, {
        original: personDisplay,
        nachname,
        vorname
      });
    }

    // Hyperlink-URL statt Text
    let linkZumProfilUrl = "";
    if (COL.LINK >= 0) {
      const cell: any = (ws as any)[A1(r, COL.LINK)];
      const url = cell?.l?.Target || cell?.l?.target;
      if (url) linkZumProfilUrl = String(url);
    }

    // ✅ Verfügbar ab Feld mit Datumskonvertierung
    let verfuegbarAb: string | undefined;
    if (COL.VERF_AB >= 0) {
      const cell: any = ws[A1(r, COL.VERF_AB)];
      verfuegbarAb = cellToIsoDate(cell, wb);
      

      
      logger.debug("uploaders.mitarbeiter", `Verfügbar ab für ${personDisplay}`, {
        rawValue: cell?.v,
        type: typeof cell?.v,
        cellType: cell?.t,
        finalValue: verfuegbarAb
      });
    }

    const payload: any = {
      person: personDisplay,
      nachname, // ✅ Aufgeteilter Nachname
      vorname, // ✅ Aufgeteilter Vorname
      cc, email: mail,
      firma: COL.FIRMA>=0? String(ws[A1(r,COL.FIRMA)]?.v ?? "").trim() : "",
      lob: COL.LOB>=0? String(ws[A1(r,COL.LOB)]?.v ?? "").trim() : "",
      bereich: "",
      team: COL.TEAM>=0? String(ws[A1(r,COL.TEAM)]?.v ?? "").trim() : "",
      standort: COL.STANDORT>=0? String(ws[A1(r,COL.STANDORT)]?.v ?? "").trim() : "",
      lbs: COL.LBS>=0? String(ws[A1(r,COL.LBS)]?.v ?? "").trim() : "",
      erfahrungSeitJahr: COL.ERF>=0? String(ws[A1(r,COL.ERF)]?.v ?? "").trim() : "",
      verfuegbarAb: verfuegbarAb || "", // ✅ ISO-String oder leerer String
      verfuegbarFuerStaffing: COL.STAFFBAR>=0? String(ws[A1(r,COL.STAFFBAR)]?.v ?? "").trim() : "",
      linkZumProfilUrl,
      normalized: {
        name: normName(personDisplay),
        cc: normCc(cc),
        nameCc: `${normName(personDisplay)}|${normCc(cc)}`
      },
      updatedAt: new Date()
    };

    await setDoc(doc(collection(db, "mitarbeiter"), id), payload, { merge: true });
    written++;
  }

  // logger statement entfernt
  
  // ✅ Konsolidierung nach erfolgreichem Upload triggern
  try {
    await triggerConsolidationAfterUpload('mitarbeiter');
    // logger statement entfernt
  } catch (error) {
    // logger statement entfernt
    // Konsolidierungs-Fehler sollen Upload nicht zum Scheitern bringen
  }
  
  return { written, headerRow0, dataStart0 };
}

/* =========================================================
   2) AUSLASTUNG – eigenständig
   - liest 1. Sheet
   - KW stehen als Header in den Spalten (z. B. "25/34")
   - schreibt in Collection "auslastung", Doc-ID = personId, merge
========================================================= */
export async function uploadAuslastung(file: File, targetCollection = "auslastung") {
  // logger statement entfernt
  
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const range = rangeOf(ws);
  
  logger.debug("uploaders.auslastung", "Workbook gelesen", { 
    sheetName: wb.SheetNames[0], 
    range: range 
  });

  // Erkenne Wochen-Header aus Zeile 3 (0-basiert = Zeile 2)
  const weekColumns: { col: number; week: string }[] = [];
  for (let c = 0; c <= range.e.c; c++) {
    const cell = (ws as any)[A1(2, c)]; // Zeile 3 (0-basiert)
    const value = String(cell?.v ?? "").trim();
    
    // Erkenne "KW 25/01" Format
    const match = value.match(/KW\s*(\d{2})\/(\d{2})/i);
    if (match) {
      const week = `${match[1]}/${match[2]}`;
      weekColumns.push({ col: c, week });
    }
  }
  
  logger.info("uploaders.auslastung", "Wochen-Spalten erkannt", { 
    count: weekColumns.length, 
    weeks: weekColumns.slice(0, 5).map(w => w.week) 
  });

  const ix = await buildPersonIndexFromDB();
  let matched = 0, ambiguous = 0, unmatched = 0, written = 0;

  // Verarbeite Daten ab Zeile 5 (0-basiert = Zeile 4)
  const dataStartRow = 4;
  const chunk = 400;
  
  const personDataList: any[] = [];
  
  for (let r = dataStartRow; r <= range.e.r; r++) {
    const person = String((ws as any)[A1(r, 4)]?.v ?? "").trim() // Spalte E: "Mitarbeiter (ID)"
      .replace(/\([^)]*\)\s*$/, "").trim();
    if (!person) continue;
    
    const cc = String((ws as any)[A1(r, 2)]?.v ?? "").trim(); // Spalte C: "Hierarchie Slicer - CC"
    
    // Parse Name in Nachname/Vorname
    const { nachname, vorname } = parsePersonName(person);

    const res = matchPerson(person, cc, ix);
    if (res.status !== "matched") {
      (res.status === "ambiguous") ? ambiguous++ : unmatched++;
      continue;
    }
    matched++;

    // Sammle Auslastungswerte für alle erkannten Wochen
    const values: Record<string, number> = {};
    for (const { col, week } of weekColumns) {
      const cell = (ws as any)[A1(r, col)];
      const value = cell?.v;
      const num = toNumberOrUndef(value);
      if (num !== undefined) {
        // Intelligente Prozent-Konvertierung:
        // - Werte zwischen 0 und 1 (exklusive) sind Dezimalwerte → *100
        // - Werte zwischen 1 und 2 (inklusive) sind wahrscheinlich auch Dezimalwerte (100% = 1.0) → *100  
        // - Werte > 2 sind bereits Prozentwerte → unverändert
        let percentValue: number;
        if (num > 0 && num <= 2) {
          percentValue = num * 100;
        } else {
          percentValue = num;
        }
        
        values[week] = percentValue;
        
        // Debug: Zeige Konvertierung für erste paar Einträge
        if (written < 3 && num !== percentValue) {
          logger.info("uploaders.auslastung", `🔄 Dezimal→Prozent Konvertierung für ${person}`, {
            week,
            originalValue: num,
            convertedValue: percentValue,
            conversionReason: num <= 2 ? "Dezimalwert erkannt" : "Bereits Prozentwert"
          });
        }
      }
    }

    // Sammle Personendaten für Batch-Verarbeitung
    personDataList.push({
      person,
      nachname, // ✅ Aufgeteilter Nachname
      vorname, // ✅ Aufgeteilter Vorname
      personId: res.personId,
      cc,
      values,
      fileName: file.name,
      updatedAt: new Date(),
      matchStatus: "matched"
    });
  }

  // Batch-Verarbeitung
  for (let i = 0; i < personDataList.length; i += chunk) {
    const batch = writeBatch(db);
    for (let j = 0; j < Math.min(chunk, personDataList.length - i); j++) {
      const personData = personDataList[i + j];
      const ref = doc(collection(db, targetCollection), personData.personId);
      batch.set(ref, personData, { merge: true });
      written++;
    }
    await batch.commit();
  }

  logger.info("uploaders.auslastung", "Upload abgeschlossen", { 
    matched, ambiguous, unmatched, written, weekColumns: weekColumns.length 
  });

  // ✅ Konsolidierung nach erfolgreichem Upload triggern
  try {
    await triggerConsolidationAfterUpload('auslastung');
    // logger statement entfernt
  } catch (error) {
    // logger statement entfernt
    // Konsolidierungs-Fehler sollen Upload nicht zum Scheitern bringen
  }

  return { matched, ambiguous, unmatched, written };
}

/* =========================================================
   3) EINSATZPLAN – eigenständig
   - 3er-Gruppen (Projekt / NKV% / Ort)
   - KW steht in/über der Projekt-Spalte (gemergte Zellen möglich)
   - schreibt Subdocs: mitarbeiter/{personId}/weeks/{JJ-WW}, merge
========================================================= */
type WeeklyTriple = { kw: string; colProjekt: number; colNkv: number; colOrt: number };

function normalizeKwLabel(v: string): string | null {
  // Format 1: "YY/WW" (z.B. "25/34")
  const m1 = String(v).match(/(\d{2})\s*\/\s*(\d{2})/);
  if (m1) return `${m1[1]}/${m1[2]}`;
  
  // Format 2: "KW34(2025)" -> "25/34"
  const m2 = String(v).match(/KW\s*(\d+)\s*\(\s*(\d{4})\s*\)/i);
  if (m2) {
    const week = m2[1].padStart(2, '0');
    const year = m2[2].slice(-2); // Letzten 2 Ziffern
    return `${year}/${week}`;
  }
  
  return null;
}

function getMergedAware(ws: XLSX.WorkSheet, r0: number, c0: number, maxUp=3) {
  for (let up=0; up<=maxUp; up++) {
    const cell = (ws as any)[A1(r0-up, c0)];
    if (cell && cell.v != null && String(cell.v).trim() !== "") return cell.v;
  }
  return undefined;
}

function detectHeaderRowAndStart(ws: XLSX.WorkSheet) {
  const range = rangeOf(ws);
  for (let r0=0; r0<=Math.min(8, range.e.r); r0++) {
    const a = String((ws as any)[A1(r0,0)]?.v ?? "").toLowerCase();
    if (a !== "name") continue;
    // suche "cc"
    let ccCol = -1, firstProjektCol = -1;
    for (let c=0; c<=range.e.c; c++) {
      const v = String((ws as any)[A1(r0,c)]?.v ?? "").toLowerCase();
      if (v === "cc" && ccCol === -1) ccCol = c;
      if (v.includes("projekt") && firstProjektCol === -1) firstProjektCol = c;
    }
    return {
      headerRow0: r0,
      dataStart0: r0+1,
      nameCol0: 0,
      ccCol0: ccCol >= 0 ? ccCol : 3, // Default D
      firstProjektCol0: firstProjektCol >= 0 ? firstProjektCol : 15 // Default P
    };
  }
  // Fallback
  return { headerRow0: 2, dataStart0: 3, nameCol0: 0, ccCol0: 3, firstProjektCol0: 15 };
}

function getWeeklyTriples(ws: XLSX.WorkSheet, headerRow0: number, startCol0: number): WeeklyTriple[] {
  const range = rangeOf(ws);
  const triples: WeeklyTriple[] = [];





  for (let c = startCol0; c <= range.e.c; c += 3) {
    // Suche KW-Header in allen Zeilen 0-4 und allen 3 Spalten des Triplets
    let raw = null;
    let foundInCol = -1;
    let foundInRow = -1;
    
    // Prüfe alle Zeilen 0-4 und alle 3 Spalten des Triplets
    for (let testRow = 0; testRow <= 4 && !raw; testRow++) {
      for (let testCol = c; testCol <= c + 2 && testCol <= range.e.c; testCol++) {
        const testRaw = getMergedAware(ws, testRow, testCol, 0); // Keine Merge-Suche nach oben
        const testKw = normalizeKwLabel(String(testRaw ?? ""));
        if (testKw) {
          raw = testRaw;
          foundInCol = testCol;
          foundInRow = testRow;
          break;
        }
      }
    }
    
    const kw = normalizeKwLabel(String(raw ?? ""));
    

    
    if (!kw) continue;
    triples.push({ kw, colProjekt: c, colNkv: c+1, colOrt: c+2 });
  }

  // Fallback: falls nichts erkannt, scanne alle Spalten und baue 3er-Raster relativ zum ersten KW-Treffer
  if (triples.length === 0) {
    const hits: { c:number; kw:string }[] = [];
    for (let c=0; c<=range.e.c; c++) {
      const raw = getMergedAware(ws, headerRow0, c, 4);
      const kw = normalizeKwLabel(String(raw ?? ""));
      if (kw) hits.push({ c, kw });
    }
    const first = hits.find(h => h.c >= startCol0) ?? hits[0];
    if (first) {
      for (const h of hits) {
        const delta = h.c - first.c;
        if (delta % 3 === 0) triples.push({ kw: h.kw, colProjekt: h.c, colNkv: h.c+1, colOrt: h.c+2 });
      }
    }
  }

  return triples;
}

export async function uploadEinsatzplan(file: File, sheetName = "Einsatzplan", targetCollection = "einsatzplan") {
  // logger statement entfernt
  
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: "array" });
  const ws = wb.Sheets[sheetName] ?? wb.Sheets[wb.SheetNames[0]];
  const range = rangeOf(ws);

  logger.debug("uploaders.einsatzplan", "Workbook gelesen", { 
    sheetName, 
    availableSheets: wb.SheetNames,
    range: range 
  });

  const det = detectHeaderRowAndStart(ws);
  const triples = getWeeklyTriples(ws, det.headerRow0, det.firstProjektCol0);

  const ix = await buildPersonIndexFromDB();

  // Hilfsspalten optional suchen
  const findCol = (label: string) => {
    for (let c=0; c<=range.e.c; c++) {
      const v = String((ws as any)[A1(det.headerRow0, c)]?.v ?? "").toLowerCase();
      if (v === label.toLowerCase()) return c;
    }
    return -1;
  };
  
  // Erweiterte Spaltenerkennung mit Regex-Pattern
  const findColRegex = (pattern: RegExp) => {
    for (let c=0; c<=range.e.c; c++) {
      const v = String((ws as any)[A1(det.headerRow0, c)]?.v ?? "");
      if (pattern.test(v)) return c;
    }
    return -1;
  };
  
  const teamCol0 = findCol("team");
  const lobCol0 = findCol("lob");
  const bereichCol0 = findCol("bereich");
  const vgCol0 = findCol("vg");
  const verfAbCol0 = findColRegex(/verf.*ab/i);
  const staffbarCol0 = findColRegex(/verf.*staffing|staffbar/i);

  let matched=0, ambiguous=0, unmatched=0, written=0;

  // Sammlung personId → values (ähnlich wie Auslastung)
  type PersonData = {
    person: string;
    personId: string;
    cc: string;
    values: Record<string, any[]>; // kw → entries[]
    team?: string;
    lob?: string;
    bereich?: string;
    vg?: string;
    verfuegbarAb?: string; // ISO-Date String
    verfuegbarFuerStaffing?: boolean;
    fileName: string;
    updatedAt: Date;
    matchStatus: string;
  };
  const personDataMap = new Map<string, PersonData>();

  for (let r = det.dataStart0; r <= range.e.r; r++) {
    const person = String((ws as any)[A1(r, det.nameCol0)]?.v ?? "").trim();
    if (!person) continue;
    const cc = String((ws as any)[A1(r, det.ccCol0)]?.v ?? "").trim();
    
    // Parse Name in Nachname/Vorname
    const { nachname, vorname } = parsePersonName(person);

    const res = matchPerson(person, cc, ix);
    if (res.status !== "matched") {
      (res.status === "ambiguous") ? ambiguous++ : unmatched++;
      continue;
    }
    matched++;

    const team = teamCol0>=0 ? String((ws as any)[A1(r, teamCol0)]?.v ?? "").trim() || undefined : undefined;
    const lob  = lobCol0 >=0 ? String((ws as any)[A1(r, lobCol0 )]?.v ?? "").trim() || undefined : undefined;
    const bereich = bereichCol0>=0 ? String((ws as any)[A1(r, bereichCol0)]?.v ?? "").trim() || undefined : undefined;
    const vg = vgCol0>=0 ? String((ws as any)[A1(r, vgCol0)]?.v ?? "").trim() || undefined : undefined;
    
    // ✅ Verfügbar ab Feld mit Datumskonvertierung
    let verfuegbarAb: string | undefined;
    if (verfAbCol0 >= 0) {
      const cell: any = (ws as any)[A1(r, verfAbCol0)];
      verfuegbarAb = cellToIsoDate(cell, wb);
      
      // Debug: Zeige Datumskonvertierung für erste paar Einträge
      if (written < 3) {
        logger.info("uploaders.einsatzplan", `Verfügbar ab für ${person}`, {
          rawValue: cell?.v,
          type: typeof cell?.v,
          cellType: cell?.t,
          finalValue: verfuegbarAb
        });
      }
    }
    
    // ✅ Staffbar Feld mit Boolean-Konvertierung
    let verfuegbarFuerStaffing: boolean | undefined;
    if (staffbarCol0 >= 0) {
      const cell: any = (ws as any)[A1(r, staffbarCol0)];
      verfuegbarFuerStaffing = toBooleanOrUndef(cell?.v);
      
      // Debug: Zeige Boolean-Konvertierung für erste paar Einträge
      if (written < 3) {
        logger.info("uploaders.einsatzplan", `Staffbar für ${person}`, {
          rawValue: cell?.v,
          type: typeof cell?.v,
          finalValue: verfuegbarFuerStaffing
        });
      }
    }

    // Sammle alle Wochen-Daten für diese Person
    const values: Record<string, any[]> = {};
    for (const t of triples) {
      const vProjekt = (ws as any)[A1(r, t.colProjekt)]?.v;
      const vNkv     = (ws as any)[A1(r, t.colNkv)]?.v;
      const vOrt     = (ws as any)[A1(r, t.colOrt)]?.v;

      const projekt = vProjekt!=null && String(vProjekt).trim()!=="" ? String(vProjekt).trim() : undefined;
      const ort     = vOrt    !=null && String(vOrt).trim()    !=="" ? String(vOrt).trim()    : undefined;
      const nkvProzent = toNumberOrUndef(vNkv);
      
      // Konvertiere NKV (Nicht-Auslastung) zu tatsächlicher Auslastung
      const auslastungProzent = nkvProzent !== undefined ? 100 - nkvProzent : undefined;
      
      // Debug: Zeige Konvertierung für erste paar Einträge
      if (written < 3 && nkvProzent !== undefined) {
        logger.info("uploaders.einsatzplan", `NKV-Konvertierung für ${person}`, {
          kw: t.kw,
          nkvProzent,
          auslastungProzent,
          projekt
        });
      }

      if (!projekt && !ort && nkvProzent == null) continue;

      const entry: any = {};
      if (projekt !== undefined) entry.projekt = projekt;
      if (ort !== undefined) entry.ort = ort;
      if (auslastungProzent !== undefined) entry.auslastungProzent = auslastungProzent;
      
      if (!values[t.kw]) values[t.kw] = [];
      values[t.kw].push(entry);
    }

    // Speichere Person mit allen Wochen-Daten
    if (Object.keys(values).length > 0) {
      const personData: any = {
        person,
        nachname, // ✅ Aufgeteilter Nachname
        vorname, // ✅ Aufgeteilter Vorname
        personId: res.personId,
        cc,
        values,
        fileName: file.name,
        updatedAt: new Date(),
        matchStatus: "matched"
      };
      
      // Nur definierte Werte hinzufügen
      if (team) personData.team = team;
      if (lob) personData.lob = lob;
      if (bereich) personData.bereich = bereich;
      if (vg) personData.vg = vg;
      if (verfuegbarAb) personData.verfuegbarAb = verfuegbarAb;
      if (verfuegbarFuerStaffing !== undefined) personData.verfuegbarFuerStaffing = verfuegbarFuerStaffing;
      
      personDataMap.set(res.personId, personData);
    }
  }

  // Committen (Batches) - ähnlich wie Auslastung
  const items = Array.from(personDataMap.values());
  const chunk = 400;
  for (let i=0; i<items.length; i+=chunk) {
    const batch = writeBatch(db);
    for (let j=0; j<Math.min(chunk, items.length - i); j++) {
      const personData = items[i+j];
      const ref = doc(collection(db, targetCollection), personData.personId);
      batch.set(ref, personData, { merge: true });
      written++;
    }
    await batch.commit();
  }

  logger.info("uploaders.einsatzplan", "Upload abgeschlossen", { 
    matched, ambiguous, unmatched, written, triplesCount: triples.length,
    spaltenGefunden: {
      verfuegbarAb: verfAbCol0 >= 0,
      verfuegbarFuerStaffing: staffbarCol0 >= 0
    }
  });
  
  // ✅ Konsolidierung nach erfolgreichem Upload triggern
  try {
    await triggerConsolidationAfterUpload('einsatzplan');
    // logger statement entfernt
  } catch (error) {
    // logger statement entfernt
    // Konsolidierungs-Fehler sollen Upload nicht zum Scheitern bringen
  }
  
  return { matched, ambiguous, unmatched, written, triplesCount: triples.length };
}
