## Cursor Prompt: Fix für Excel-Datum "Verfügbar ab" im Mitarbeiter-Upload

### Kontext / Ist-Zustand
- Datei: **Mitarbeiter (Team1).xlsx** (Sheet: „Search Results“; Headerzeile dynamisch).
- Feld **"Verfügbar ab"** wird beim Upload in Firestore als **Zahl** gespeichert (z. B. `46023`) anstatt als Datum.
- Ursache: Excel speichert Daten intern als **Seriennummer**. Unser Parser liest aktuell `cell.v` ohne Datums-Konvertierung (`cellDates=false` oder fehlende Umrechnung), dadurch landet die Seriennummer als String/Number in der DB.
- Folge: Bei Re-Upload überschreibt das Upsert („merge“) jede manuell korrigierte Datumsversion wieder mit der **Seriennummer**.

### Ziel / Soll-Verhalten
- **"verfuegbarAb"** soll **immer** als Datum persistiert werden:
  - bevorzugt als **ISO-String `YYYY-MM-DD`** (keine Uhrzeit/Zeitzone),
  - alternativ als **Firestore Timestamp** (UTC), wenn gewünscht.
- Der Upload bleibt **idempotent**; nur die Date-Konvertierung wird korrigiert.
- Keine Änderungen an Auslastung/Einsatzplan-Uploadern.

### Anforderungen & Randfälle
- Excel-Zellen können als:
  1) **echtes Datum** kommen (`cell.t === 'd'`, `cell.v` ist `Date`, wenn `cellDates:true`),
  2) **Seriennummer** (`cell.t === 'n'`, Zahl),
  3) **Text** (`cell.t === 's'`, z. B. `01.09.2025` oder `2025-09-01`).
- Excel-Basis **1900/1904** berücksichtigen (Workbook-Prop `WBProps.date1904`).
- Locale-Formate wie `dd.mm.yyyy` korrekt parsen.
- Nie Uhrzeit speichern, nur Datum (Tag-genau), um TZ-Drift zu vermeiden.

### Umsetzung (gezielt für Mitarbeiter-Uploader)
**Datei:** `src/lib/uploaders.ts` (oder wo `uploadMitarbeiter(...)` implementiert ist)

1) **Workbook mit `cellDates:true` lesen:**
```ts
const wb = XLSX.read(ab, { type: "array", cellDates: true, cellStyles: true });

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

// Annahme: COL.VERF_AB ist die Spalte "Verfügbar ab"
let verfuegbarAb: string | undefined;
if (COL.VERF_AB >= 0) {
  const cell: any = (ws as any)[XLSX.utils.encode_cell({ r, c: COL.VERF_AB })];
  verfuegbarAb = cellToIsoDate(cell, wb); // "YYYY-MM-DD" oder undefined
}

// Im Payload:
const payload = {
  // ...
  verfuegbarAb, // Als ISO-String
  // Falls Timestamp gewünscht:
  // verfuegbarAbTs: verfuegbarAb ? Timestamp.fromDate(new Date(verfuegbarAb)) : undefined,
  // ...
};
Debugging (verbindlich, damit wir es sehen):

Wichtige Logs bitte auf console.info (nicht nur debug), damit sie in Chrome ohne „Verbose“ sichtbar sind.

console.info("Mitarbeiter-Upload/Date", {
  rawType: cell?.t, rawValue: cell?.v, parsed: verfuegbarAb
});

Akzeptanzkriterien (Definition of Done)

Beim Upload einer Mitarbeiter-XLSX:

Kein numerischer Wert (z. B. 46023) landet mehr im Feld verfuegbarAb.

verfuegbarAb ist ein ISO-String YYYY-MM-DD (oder Timestamp, falls konfiguriert).

Re-Upload überschreibt eine manuell gesetzte Seriennummer künftig mit dem korrekten Datum.

Logs zeigen pro Datumszelle mindestens rawType, rawValue, parsed (einmalig in DEV).

Nicht-Ziele

Keine Änderungen an den Uploadern Auslastung und Einsatzplan.

Keine Änderung am Matching-/ID-Gen-Flow.