// file: src/components/ExcelUpload.tsx
import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { uploadMitarbeiter, uploadAuslastung, uploadEinsatzplan } from "../lib/uploaders";

/** ============ Utilities: Normalisierung & Hash ============ */

const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const clean = (v: any) =>
  stripDiacritics(String(v ?? "").trim())
    .replace(/\s+/g, " ")
    .toLowerCase();

const normalizeNameDisplay = (display: string) => clean(display);
const normalizeCc = (cc: string) => clean(cc).replace(/[–—−]/g, "-");

const parsePersonDisplay = (raw: string) => {
  // "Nachname, Vorname (12345)" -> { display:"Nachname, Vorname", externalId? }
  const m = String(raw).match(
    /^\s*([^,(]+)\s*,\s*([^()]+?)(?:\s*\(([^)]+)\))?\s*$/
  );
  if (!m) return { display: String(raw).trim() };
  const [, last, first, externalId] = m;
  return {
    display: `${last.trim()}, ${first.trim()}`,
    externalId,
  };
};

// Stabile Doc-ID: SHA-1 (falls crypto.subtle nicht verfügbar, fallback auf einfacher Hash)
async function sid(input: string): Promise<string> {
  try {
    const msg = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest("SHA-1", msg);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    // Fallback (nicht kryptografisch, aber stabil)
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
}

/** ============ Excel-Reader Helpers ============ */

async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const data = await file.arrayBuffer();
  return XLSX.read(data, { type: "array" });
}

function rowsFromFirstSheet(
  wb: XLSX.WorkBook
): { rows: Array<Record<string, any>>; headers: string[] } {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { raw: false, defval: "" }) as Array<Record<string, any>>;
  const headers = headerRow(wb);
  return { rows, headers };
}

function headerRow(wb: XLSX.WorkBook): string[] {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
  // Laut Dokumentation steht der Header in Zeile 3 (Index 2)
  return (rows[2] ?? []).map((x) => String(x));
}

function hyperlinkResolver(
  wb: XLSX.WorkBook,
  linkHeaderGuess = "Link"
): (rowIdx: number) => string | undefined {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const hdr = headerRow(wb);
  const colIdx = hdr.findIndex(
    (h) => clean(h) === clean(linkHeaderGuess)
  );
  return (rowIdx: number) => {
    if (colIdx < 0) return undefined;
    // +1 wegen Headerzeile
    const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx });
    const cell: any = ws[cellRef];
    return cell?.l?.Target;
  };
}

/** ============ Person-Index & Matching ============ */

type PersonIndex = {
  byNameCc: Map<string, string>; // name|cc -> personId
  byName: Map<string, Set<string>>; // name -> set(personId)
};

async function buildPersonIndexFromDB(): Promise<PersonIndex> {
  const snap = await getDocs(query(collection(db, "mitarbeiter")));
  const byNameCc = new Map<string, string>();
  const byName = new Map<string, Set<string>>();
  snap.forEach((d) => {
    const data = d.data() as any;
    const personDisplay =
      data.person ?? `${data.nachname ?? ""}, ${data.vorname ?? ""}`;
    const nameKey = normalizeNameDisplay(personDisplay);
    const ccKey = normalizeCc(String(data.cc ?? ""));
    byNameCc.set(`${nameKey}|${ccKey}`, d.id);
    const set = byName.get(nameKey) ?? new Set<string>();
    set.add(d.id);
    byName.set(nameKey, set);
  });
  return { byNameCc, byName };
}

function matchPerson(
  personDisplay: string,
  cc: string | undefined,
  ix: PersonIndex
):
  | { status: "matched"; personId: string }
  | { status: "ambiguous" }
  | { status: "unmatched" } {
  const n = normalizeNameDisplay(personDisplay);
  const c = normalizeCc(String(cc ?? ""));
  const exact = ix.byNameCc.get(`${n}|${c}`);
  if (exact) return { status: "matched", personId: exact };
  const set = ix.byName.get(n);
  if (!set || set.size === 0) return { status: "unmatched" };
  if (set.size === 1) return { status: "matched", personId: [...set][0] };
  return { status: "ambiguous" };
}

/** ============ Domain Parser ============ */

function parseMitarbeiterRow(
  row: Record<string, any>,
  link?: string
) {
  const raw = String(
    row.person ?? row.Person ?? row.name ?? row.Name ?? ""
  ).trim();
  const { display, externalId } = parsePersonDisplay(raw);
  const cc = row.cc ?? row.CC ?? row.competenceCenter ?? "";
  return {
    person: display,
    nachname: display.split(",")[0]?.trim() ?? "",
    vorname: display.split(",")[1]?.trim() ?? "",
    cc,
    externalId: externalId ?? "",
    email: row.email ?? row.Email ?? "",
    team: row.team ?? "",
    lob: row.lob ?? row.LOB ?? "",
    bereich: row.bereich ?? row.Bereich ?? "",
    linkZumProfilUrl: link ?? "",
  };
}



/** ============ Batch Helper ============ */

async function commitInBatches<T>(
  items: T[],
  write: (batch: ReturnType<typeof writeBatch>, item: T, idx: number) => void,
  chunkSize = 450
) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const batch = writeBatch(db);
    const slice = items.slice(i, i + chunkSize);
    slice.forEach((it, j) => write(batch, it, i + j));
    await batch.commit();
  }
}

/** ============ Component ============ */

type UnresolvedRow = {
  collection: "einsatzplan" | "auslastung";
  person: string;
  cc: string;
  reason: "ambiguous" | "unmatched";
  rowIndex: number;
};

export default function ExcelUpload() {
  const [fileMitarbeiter, setFileMitarbeiter] = useState<File | null>(null);
  const [fileEinsatzplan, setFileEinsatzplan] = useState<File | null>(null);
  const [fileAuslastung, setFileAuslastung] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<
    string,
    { rows: number; matched: number; ambiguous: number; unmatched: number }
  > | null>(null);
  const [unresolved, setUnresolved] = useState<UnresolvedRow[]>([]);
  const [messages, setMessages] = useState<string[]>([]);

  const canStart = useMemo(
    () => !!fileMitarbeiter || !!fileEinsatzplan || !!fileAuslastung,
    [fileMitarbeiter, fileEinsatzplan, fileAuslastung]
  );

  async function upsertMitarbeiter(wb: XLSX.WorkBook) {
    // Verwende die neue uploadMitarbeiter Funktion
    if (!fileMitarbeiter) return;
    
    try {
      const result = await uploadMitarbeiter(fileMitarbeiter);
      
      setMessages((m) => [
        ...m,
        `Mitarbeiter erfolgreich hochgeladen: ${result.written} Zeilen verarbeitet.`,
      ]);
      
      return result;
    } catch (error) {
      console.error("Fehler beim Mitarbeiter-Upload:", error);
      setMessages((m) => [...m, `Fehler beim Mitarbeiter-Upload: ${error}`]);
      throw error;
    }
  }

  async function processPlanOrLoad(
    wb: XLSX.WorkBook,
    collName: "einsatzplan" | "auslastung"
  ) {
    // Verwende die neuen Upload-Funktionen
    const file = collName === "einsatzplan" ? fileEinsatzplan : fileAuslastung;
    if (!file) return;

    try {
      let result;
      if (collName === "einsatzplan") {
        result = await uploadEinsatzplan(file, "Einsatzplan");
      } else {
        result = await uploadAuslastung(file, "auslastung");
      }

      // Stats setzen
      setStats((s) => ({
        ...(s ?? {}),
        [collName]: {
          rows: result.matched + result.ambiguous + result.unmatched,
          matched: result.matched,
          ambiguous: result.ambiguous,
          unmatched: result.unmatched,
        },
      }));

      // Unresolved setzen (falls vorhanden)
      if (result.unresolved) {
        const unresolvedLocal = result.unresolved.map(u => ({
          collection: collName,
          person: u.person,
          cc: u.cc,
          reason: u.reason,
          rowIndex: u.rowIndex
        }));
        setUnresolved((u) => [...u, ...unresolvedLocal]);
      }

      // Messages setzen
      setMessages((m) => [
        ...m,
        `${collName}: ${result.matched} matched, ${result.ambiguous} ambiguous, ${result.unmatched} unmatched.`,
      ]);

    } catch (error) {
      console.error(`Fehler beim Verarbeiten von ${collName}:`, error);
      setMessages((m) => [...m, `Fehler bei ${collName}: ${error}`]);
    }
  }

  async function handleProcess() {
    if (!canStart) return;
    setLoading(true);
    setStats(null);
    setUnresolved([]);
    setMessages([]);

    try {
      // 1) Mitarbeiter zuerst (Quelle der Wahrheit für personId)
      if (fileMitarbeiter) {
        const wb = await readWorkbook(fileMitarbeiter);
        await upsertMitarbeiter(wb);
      }

      // 2) Einsatzplan
      if (fileEinsatzplan) {
        const wb = await readWorkbook(fileEinsatzplan);
        await processPlanOrLoad(wb, "einsatzplan");
      }

      // 3) Auslastung
      if (fileAuslastung) {
        const wb = await readWorkbook(fileAuslastung);
        await processPlanOrLoad(wb, "auslastung");
      }

      if (!fileEinsatzplan && !fileAuslastung) {
        // Nur Mitarbeiter hochgeladen → Stats leer freundlich füllen
        setStats((s) => ({ ...(s ?? {}), info: { rows: 0, matched: 0, ambiguous: 0, unmatched: 0 } }));
      }
    } catch (err: any) {
      setMessages((m) => [...m, `Fehler: ${err?.message ?? String(err)}`]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function downloadUnresolvedCSV() {
    if (unresolved.length === 0) return;
    const header = ["collection", "rowIndex", "person", "cc", "reason"];
    const rows = unresolved.map((u) =>
      [u.collection, u.rowIndex, u.person, u.cc, u.reason].map((v) =>
        `"${String(v).replace(/"/g, '""')}"`
      ).join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "unresolved.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Excel Upload</h2>
        <p className="text-sm text-gray-600">
          Lade optional eine oder mehrere Dateien hoch. Beim erneuten Upload
          werden bestehende Dokumente <b>gemergt/aktualisiert</b> (idempotent).
          Matching: <code>(Nachname, Vorname) + CC</code>, Fallback nur Name
          (wenn eindeutig).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="p-4 border rounded-xl">
          <label className="block text-sm font-medium mb-2">
            Mitarbeiter (.xlsx)
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) =>
              setFileMitarbeiter(e.target.files?.[0] ?? null)
            }
          />
          {fileMitarbeiter && (
            <p className="mt-2 text-xs text-gray-500 truncate">
              {fileMitarbeiter.name}
            </p>
          )}
        </div>

        <div className="p-4 border rounded-xl">
          <label className="block text-sm font-medium mb-2">
            Einsatzplan (.xlsx)
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) =>
              setFileEinsatzplan(e.target.files?.[0] ?? null)
            }
          />
          {fileEinsatzplan && (
            <p className="mt-2 text-xs text-gray-500 truncate">
              {fileEinsatzplan.name}
            </p>
          )}
        </div>

        <div className="p-4 border rounded-xl">
          <label className="block text-sm font-medium mb-2">
            Auslastung (.xlsx)
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) =>
              setFileAuslastung(e.target.files?.[0] ?? null)
            }
          />
          {fileAuslastung && (
            <p className="mt-2 text-xs text-gray-500 truncate">
              {fileAuslastung.name}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleProcess}
          disabled={!canStart || loading}
          className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
        >
          {loading ? "Lade hoch..." : "Vorschau & Upload starten"}
        </button>

        <button
          onClick={downloadUnresolvedCSV}
          disabled={unresolved.length === 0}
          className="px-4 py-2 rounded-lg border disabled:opacity-50"
        >
          Unresolved als CSV
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="p-4 border rounded-xl">
              <div className="font-medium mb-2">{k}</div>
              <ul className="text-sm space-y-1">
                <li>Zeilen: {v.rows}</li>
                <li className="text-green-700">Matched: {v.matched}</li>
                <li className="text-yellow-700">Ambiguous: {v.ambiguous}</li>
                <li className="text-red-700">Unmatched: {v.unmatched}</li>
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Unresolved Table */}
      {unresolved.length > 0 && (
        <div className="p-4 border rounded-xl">
          <div className="font-medium mb-2">
            Unresolved ({unresolved.length})
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left">
                <tr>
                  <th className="p-2">Collection</th>
                  <th className="p-2">Row</th>
                  <th className="p-2">Person</th>
                  <th className="p-2">CC</th>
                  <th className="p-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {unresolved.map((u, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{u.collection}</td>
                    <td className="p-2">{u.rowIndex}</td>
                    <td className="p-2">{u.person}</td>
                    <td className="p-2">{u.cc}</td>
                    <td className="p-2">{u.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Messages / Logs */}
      {messages.length > 0 && (
        <div className="p-4 border rounded-xl text-sm space-y-1">
          {messages.map((m, i) => (
            <div key={i}>• {m}</div>
          ))}
        </div>
      )}
    </div>
  );
}
