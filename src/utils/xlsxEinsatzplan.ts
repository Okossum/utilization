import * as XLSX from "xlsx";

export type WeeklyTriple = {
  kw: string;                 // "25/34"
  colProjekt: number;         // 0-based index
  colNkv: number;             // 0-based index
  colOrt: number;             // 0-based index
};

export function getWorksheet(wb: XLSX.WorkBook, sheetName?: string) {
  const name = sheetName ?? wb.SheetNames[0];
  return wb.Sheets[name];
}

// Excel "A1" helpers
const A1 = (r0: number, c0: number) => XLSX.utils.encode_cell({ r: r0, c: c0 });

export function getWeeklyTriples(ws: XLSX.WorkSheet): WeeklyTriple[] {
  const headerRowIdx = 2;   // Zeile 3 (0-based)
  const startColIdx  = 15;  // Spalte P (0-based)
  const range = XLSX.utils.decode_range(ws["!ref"]!);
  const maxCol = range.e.c;

  const triples: { kw: string; colProjekt: number; colNkv: number; colOrt: number }[] = [];

  for (let c = startColIdx; c <= maxCol; c += 3) {
    const cellRef = A1(headerRowIdx, c);     // Wert aus Zeile 3, Projekt-Spalte
    const v = ws[cellRef]?.v ? String(ws[cellRef].v) : "";
    const m = v.match(/KW(\d{2})\((\d{4})\)/); // „KW34(2025)" erkennen
    if (!m) continue;
    const kw = `${m[2].slice(-2)}/${m[1]}`; // "25/34"
    triples.push({ kw, colProjekt: c, colNkv: c + 1, colOrt: c + 2 });
  }

  console.debug("🔍 getWeeklyTriples", { triplesCount: triples.length, sample: triples.slice(0,3) });
  return triples;
}

export type KwEntry = { projekt?: string; ort?: string; nkvProzent?: number };

export function extractKwEntriesForRow(
  ws: XLSX.WorkSheet,
  row0: number,                // 0-based Zeilenindex der Datenzeile (Zeile 4 → 3)
  triples: WeeklyTriple
): KwEntry | null {
  const { colProjekt, colNkv, colOrt } = triples;
  const vProjekt = ws[A1(row0, colProjekt)]?.v;
  const vNkv     = ws[A1(row0, colNkv)]?.v;
  const vOrt     = ws[A1(row0, colOrt)]?.v;

  const projekt = vProjekt != null && String(vProjekt).trim() !== "" ? String(vProjekt).trim() : undefined;
  const ort     = vOrt     != null && String(vOrt).trim()     !== "" ? String(vOrt).trim()     : undefined;

  let nkvProzent: number | undefined;
  if (vNkv != null && String(vNkv).trim() !== "") {
    const num = Number(String(vNkv).replace(",", "."));
    if (!Number.isNaN(num)) nkvProzent = num;
  }

  if (!projekt && !ort && nkvProzent == null) return null;
  return { projekt, ort, nkvProzent };
}
