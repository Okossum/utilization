import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Eye, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import DatabaseService from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
interface UploadedFile {
  name: string;
  data: any[];
  isValid: boolean;
  error?: string;
  preview?: string[][];
  debug?: string[];
}
interface UploadPanelProps {
  uploadedFiles: {
    auslastung?: UploadedFile;
    einsatzplan?: UploadedFile;
  };
  onFilesChange: (files: {
    auslastung?: UploadedFile;
    einsatzplan?: UploadedFile;
  }) => void;
  onDatabaseRefresh?: () => void;
}
export function UploadPanel({
  uploadedFiles,
  onFilesChange,
  onDatabaseRefresh
}: UploadPanelProps) {
  // ✅ FIX: Race-Condition verhindern - Upload nur wenn User vollständig authentifiziert
  const { user, loading } = useAuth();
  
  // Zeige Loading-Zustand an wenn Authentifizierung noch läuft
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Authentifizierung läuft...</span>
        </div>
      </div>
    );
  }
  
  // Upload nur für angemeldete User
  if (!user) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-gray-600">Bitte melde dich an um Dateien hochzuladen.</p>
        </div>
      </div>
    );
  }
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const auslastungRef = useRef<HTMLInputElement>(null);
  const einsatzplanRef = useRef<HTMLInputElement>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const infoContainerRef = useRef<HTMLDivElement>(null);
  
  // State für Konsolidierungs-Status
  const [consolidationStatus, setConsolidationStatus] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    details: string;
  } | null>(null);
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (infoContainerRef.current && !infoContainerRef.current.contains(e.target as Node)) {
        setIsInfoOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const handleFileSelect = async (type: 'auslastung' | 'einsatzplan', file: File) => {
    setIsProcessing(type);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (!isExcel) {
      onFilesChange({
        ...uploadedFiles,
        [type]: {
          name: file.name,
          data: [],
          isValid: false,
          error: 'Nur Excel-Dateien (.xlsx, .xls) sind erlaubt'
        }
      });
      setIsProcessing(null);
      return;
    }

    try {
      let parsed;
      if (type === 'auslastung') {
        parsed = await parseAuslastungWorkbook(file);
        const uploaded: UploadedFile = {
          name: file.name,
          data: parsed.rows,
          isValid: parsed.isValid,
          error: parsed.error,
          preview: parsed.preview,
          debug: parsed.debug,
        };
        onFilesChange({
          ...uploadedFiles,
          auslastung: uploaded
        });
      } else {
        parsed = await parseEinsatzplanWorkbook(file);
        const uploaded: UploadedFile = {
          name: file.name,
          data: parsed.rows,
          isValid: parsed.isValid,
          error: parsed.error,
          preview: parsed.preview,
          debug: parsed.debug,
        };
        onFilesChange({
          ...uploadedFiles,
          einsatzplan: uploaded
        });
      }

      // Aktualisiere den State mit den neuen Dateien
      const newFiles = {
        ...uploadedFiles,
        [type]: {
          name: file.name,
          data: parsed.rows,
          isValid: parsed.isValid,
          error: parsed.error,
          preview: parsed.preview,
          debug: parsed.debug,
        }
      };

      // Wenn die Datei gültig ist, speichere sie in der Datenbank
      if (parsed.isValid) {
        try {
          // Speichere die aktuelle Datei in der Datenbank
          if (type === 'auslastung') {
            await DatabaseService.saveAuslastung(file.name, parsed.rows);
          } else {
            await DatabaseService.saveEinsatzplan(file.name, parsed.rows);
          }
          
          // Prüfe nach dem Speichern, ob beide Dateien in der Datenbank vorhanden sind
          // und starte dann die Konsolidierung
          const updatedFiles = {
            ...uploadedFiles,
            [type]: {
              name: file.name,
              data: parsed.rows,
              isValid: parsed.isValid,
              error: parsed.error,
              preview: parsed.preview,
              debug: parsed.debug,
            }
          };
          
          // Starte Konsolidierung mit Daten aus der Datenbank (robuste Lösung)
          try {
            console.log('🔍 Starte Konsolidierung mit Daten aus der Datenbank...');
            
            const consolidationResult = await DatabaseService.consolidateFromDatabase();
            
            console.log('✅ Konsolidierung abgeschlossen:', consolidationResult);
            
            // Zeige Status-Nachricht an den Benutzer
            if (consolidationResult.message) {
              console.log('📊 Status:', consolidationResult.message);
              
              // Benutzerbenachrichtigung anzeigen
              if (consolidationResult.canConsolidate) {
                // Erfolgreiche Konsolidierung
                setConsolidationStatus({
                  type: 'success',
                  message: consolidationResult.message,
                  details: `Konsolidierung erfolgreich: ${consolidationResult.result?.count || 0} Datensätze verarbeitet`
                });
              } else {
                // Teilweise Konsolidierung
                setConsolidationStatus({
                  type: 'warning',
                  message: consolidationResult.message,
                  details: 'Laden Sie die fehlende Datei hoch, um vollständige Daten zu erhalten'
                });
              }
            }

            // ✅ KRITISCHER FIX: Aktualisiere Datenbank-Ansicht NACH erfolgreicher Konsolidierung
            console.log('🔄 Lade Datenbank neu nach Konsolidierung...');
            if (onDatabaseRefresh) {
              await onDatabaseRefresh();
              console.log('✅ Datenbank-Refresh abgeschlossen');
            }

          } catch (dbError) {
            console.error('❌ Fehler bei der Konsolidierung:', dbError);
            
            // Auch bei Fehlern versuchen, die Datenbank zu aktualisieren
            if (onDatabaseRefresh) {
              console.log('🔄 Lade Datenbank trotz Konsolidierungs-Fehler...');
              await onDatabaseRefresh();
            }
          }
          
        } catch (dbError) {
          console.error('❌ Fehler beim Speichern in der Datenbank:', dbError);
          // Trotz DB-Fehler die Datei als gültig markieren
        }
      }
    } catch (e: any) {
      onFilesChange({
        ...uploadedFiles,
        [type]: {
          name: file.name,
          data: [],
          isValid: false,
          error: `Fehler beim Verarbeiten: ${e?.message || e}`,
          debug: [String(e?.stack || e)],
        }
      });
    } finally {
      setIsProcessing(null);
    }
  };
  const handleDrop = (e: React.DragEvent, type: 'auslastung' | 'einsatzplan') => {
    e.preventDefault();
    setDragOver(null);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(type, files[0]);
    }
  };
  const handleDragOver = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    setDragOver(type);
  };
  const handleDragLeave = () => {
    setDragOver(null);
  };
  const removeFile = (type: 'auslastung' | 'einsatzplan') => {
    const newFiles = {
      ...uploadedFiles
    };
    delete newFiles[type];
    onFilesChange(newFiles);
    setShowPreview(null);
  };
  const retryUpload = (type: 'auslastung' | 'einsatzplan') => {
    const inputRef = type === 'auslastung' ? auslastungRef : einsatzplanRef;
    inputRef.current?.click();
  };

  // ---- Excel Parsing Helpers ----
  const toKwKey = (week: number, year4?: number): string => {
    const yy = year4 ? String(year4).slice(-2) : String(new Date().getFullYear()).slice(-2);
    const nn = String(week).padStart(2, '0');
    return `${yy}/${nn}`;
  };
  const extractWeekYear = (cell: string): { week: number; year: number } | null => {
    const text = String(cell || '').trim();
    // Variants: "KW33(2025)", "KW 33 (2025)"
    let m = text.match(/KW\s*(\d{1,2})\s*\(\s*(\d{4})\s*\)/i);
    if (m) {
      const week = parseInt(m[1], 10);
      const year = parseInt(m[2], 10);
      if (Number.isFinite(week) && week >= 1 && week <= 53) return { week, year };
    }
    // Variants: "KW33/2025", "KW 33-2025"
    m = text.match(/KW\s*(\d{1,2})\s*[\/-]\s*(\d{4})/i);
    if (m) {
      const week = parseInt(m[1], 10);
      const year = parseInt(m[2], 10);
      if (Number.isFinite(week) && week >= 1 && week <= 53) return { week, year };
    }
    // Variant: "KW YY/WW" (year/week format)
    m = text.match(/KW\s*(\d{1,2})\s*\/\s*(\d{2})/i);
    if (m) {
      const yy = parseInt(m[1], 10);    // ✅ KORRIGIERT: Erste Zahl ist Jahr
      const week = parseInt(m[2], 10);  // ✅ KORRIGIERT: Zweite Zahl ist Woche
      const year = 2000 + yy;
      if (Number.isFinite(week) && week >= 1 && week <= 53) return { week, year };
    }
    return null;
  };
  const normalizePersonKey = (s: string) => {
    // Nur Klammern und Leerzeichen entfernen, KEINE Buchstaben ändern
    // Das verhindert, dass "Leisen, Wei" zu "Leisen, Wie" wird
    const cleaned = s.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
    return cleaned;
  };
  const isSummaryRow = (s: string) => {
    const p = s.trim().toLowerCase();
    return p === 'total' || p === 'summe' || /^total\b/.test(p) || /^summe\b/.test(p) || p.includes('total') || p.includes('summe');
  };
  const parsePercent = (cell: unknown): number | null => {
    if (cell === undefined || cell === null || cell === '') return null;
    if (typeof cell === 'number') {
      const v = cell <= 1.5 ? cell * 100 : cell;
      return Math.round(v * 10) / 10;
    }
    const s = String(cell).trim().replace(',', '.');
    if (s.endsWith('%')) {
      const p = parseFloat(s);
      return isNaN(p) ? null : Math.round(p * 10) / 10;
    }
    const f = parseFloat(s);
    if (isNaN(f)) return null;
    const v = f <= 1.5 ? f * 100 : f;
    return Math.round(v * 10) / 10;
  };

  // Parser Auslastung: Personen-Spalte = Spalte E (Index 4), Header in Zeile 4; KW-Header wie "KW33(2025)"; Subheader enthält u. a. "NKV (%)"
  async function parseAuslastungWorkbook(file: File): Promise<{ isValid: boolean; error?: string; preview?: string[][]; rows: any[]; debug?: string[]; }> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { isValid: false, error: 'Keine Sheets gefunden', rows: [], debug: ['Keine Sheets gefunden'] };
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true });
    if (!data || data.length === 0) return { isValid: false, error: 'Leeres Sheet', rows: [], debug: ['Leeres Sheet'] };
    const debug: string[] = [];

    // KW-Header: Zeile finden, die mehrere "KWxx(YYYY)" enthält
    let kwHeaderRowIdx = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      const count = row.reduce((acc, c) => acc + (extractWeekYear(String(c || '')) ? 1 : 0), 0);
      debug.push(`Zeile ${i + 1}: gefundene KW-Header = ${count}`);
      if (count >= 3) { kwHeaderRowIdx = i; break; }
    }
    if (kwHeaderRowIdx === -1 || kwHeaderRowIdx + 1 >= data.length) return { isValid: false, error: 'KW-Header nicht gefunden', rows: [], debug: [...debug, 'KW-Header nicht gefunden'] };
    debug.push(`KW-Header-Zeile: ${kwHeaderRowIdx + 1}, Subheader: ${kwHeaderRowIdx + 2}, Personen-Header: ${kwHeaderRowIdx + 3}`);

    // Subheader ist nächste Zeile (mit Proj | NKV (%) | Ort)
    const kwRow = data[kwHeaderRowIdx] as any[];
    const subHeaderIdx = kwHeaderRowIdx + 1;
    const subRow = data[subHeaderIdx] as any[];

    // FESTE POSITION: Header-Zeile ist Zeile 4 (Index 3), Daten starten ab Zeile 9 (Index 8)
    const headerIdx = 3; // Zeile 4 (0-basiert) - Header-Definitionen
    const dataStartIdx = 8; // Zeile 9 (0-basiert) - Erste Datenzeile
    
    if (headerIdx >= data.length) return { isValid: false, error: 'Header-Zeile 4 nicht verfügbar', rows: [], debug: [...debug, 'Header-Zeile 4 nicht verfügbar'] };
    
    const headerRow = data[headerIdx] as any[];
    
    // Spalten-Mapping basierend auf festen Positionen
    const colLoB = 0;        // Spalte A: Hierarchie Slicer-LoB
    const colBereich = 1;    // Spalte B: Hierarchie Slicer-Bereich  
    const colCC = 2;         // Spalte C: Hierarchie Slicer-CC
    const colTeam = 3;       // Spalte D: Hierarchie Slicer-Team
    const nameCol = 4;       // Spalte E: Mitarbeiter (ID)
    
    // Überprüfen ob Spalte E den erwarteten Header hat
    const expectedHeader = String(headerRow[nameCol] || '').trim().toLowerCase();
    if (!expectedHeader.includes('mitarbeiter') && !expectedHeader.includes('id')) {
      debug.push(`⚠️ Warnung: Spalte E (Index 4) enthält "${headerRow[nameCol]}" statt erwartetem "Mitarbeiter (ID)"`);
    }
    
    debug.push(`Struktur: Header-Zeile ${headerIdx + 1}, Daten ab Zeile ${dataStartIdx + 1}`);
    debug.push(`Spalten: A=LoB, B=Bereich, C=CC, D=Team, E=Person`);
    debug.push(`Header-Inhalt Spalte E: "${headerRow[nameCol]}"`);

    // KW → Auslastungs-Spalte ermitteln und Ziel-Key in YY/WW normieren
    const weeks: { key: string; nkvCol: number }[] = [];
    for (let j = 0; j < kwRow.length; j++) {
      const wy = extractWeekYear(String(kwRow[j] || ''));
      if (!wy) continue;
      const w = wy.week; const y = wy.year;
      let nkvCol = -1;
      
      // Erweiterte Suche nach Auslastungs-Spalten
      for (let off = 0; off <= 3; off++) {
        const lbl = String(subRow[j + off] || '').toLowerCase();
        debug.push(`${toKwKey(w, y)}: Subheader[${j + off}] = "${lbl}"`);
        if (/nkv|auslastung|ausl\.|kapazität|utilization|operativ/.test(lbl)) { 
          nkvCol = j + off; 
          debug.push(`✓ Auslastungs-Spalte gefunden: ${j + off} mit Label "${lbl}"`);
          break; 
        }
      }
      
      // Fallback: Wenn keine NKV-Spalte, nehmen wir die Woche trotzdem
      if (nkvCol === -1) {
        debug.push(`⚠️ Keine NKV-Spalte für ${toKwKey(w, y)} gefunden, verwende Spalte ${j}`);
        nkvCol = j;
      }
      
      weeks.push({ key: toKwKey(w, y), nkvCol });
    }
    debug.push(`Erkannte KWs (Auslastung): ${weeks.map(w => w.key).slice(0, 8).join(', ')}${weeks.length > 8 ? '…' : ''}`);
    debug.push(`Subheader-Inhalt: ${subRow.slice(0, 20).map(c => String(c || '').trim()).join(' | ')}`);
    if (weeks.length === 0) return { isValid: false, error: 'Keine passenden KW/Spalten gefunden', rows: [], debug };

    // Datenzeilen (ab Zeile 9)
    const rowsOut: any[] = [];
    debug.push(`Starte Datenverarbeitung ab Zeile ${dataStartIdx + 1} (${data.length - dataStartIdx} Zeilen verfügbar)`);
    
    for (let r = dataStartIdx; r < data.length; r++) {
      const row = data[r]; if (!Array.isArray(row)) continue;
      
      // Prüfe Team-Spalte (D) auf "Total" - diese Zeilen ignorieren
      const teamCell = row[colTeam];
      if (teamCell && String(teamCell).trim().toLowerCase() === 'total') {
        debug.push(`Zeile ${r + 1}: Überspringe Total-Zeile (Team="${teamCell}")`);
        continue;
      }
      
      const nameCell = row[nameCol]; if (!nameCell) continue;
      const personRaw = String(nameCell).trim();
      if (isSummaryRow(personRaw)) {
        debug.push(`Zeile ${r + 1}: Überspringe Zusammenfassungszeile "${personRaw}"`);
        continue;
      }
      
      const person = personRaw; // Anzeige
      const personKey = normalizePersonKey(personRaw);
      debug.push(`Verarbeite Zeile ${r + 1}: "${personRaw}" → Key: "${personKey}" (normalisiert)`);

      const values: Record<string, number> = {};
      for (const w of weeks) {
        const rawValue = row[w.nkvCol];
        const parsed = parsePercent(rawValue);
        debug.push(`  ${w.key}: Spalte ${w.nkvCol} = "${rawValue}" → geparst: ${parsed}`);
        
        if (parsed === null) continue;
        // Prüfe ob es sich um NKV oder bereits um KV/Auslastung handelt
        const headerLbl = String(subRow[w.nkvCol] || '').toLowerCase();
        const isNkv = /nkv/.test(headerLbl);
        const isAuslastung = /auslastung|ausl\.|operativ|utilization/.test(headerLbl);
        
        let kv = parsed;
        if (isNkv) {
          // NKV → KV Umrechnung (100 - NKV = KV)
          kv = Math.max(0, Math.min(100, Math.round((100 - parsed) * 10) / 10));
        } else if (isAuslastung) {
          // Bereits Auslastung/KV - direkt verwenden
          kv = Math.max(0, Math.min(100, Math.round(parsed * 10) / 10));
        }
        
        values[w.key] = kv;
        debug.push(`    → Finaler Wert: ${kv}% (${isNkv ? 'NKV→KV' : isAuslastung ? 'Auslastung' : 'Unbekannt'})`);
      }
      
      if (Object.keys(values).length > 0) {
        // Flache Struktur für Backend-Kompatibilität: Wochen-Werte direkt als Eigenschaften
        const flatRow = { 
          person: personKey, 
          personDisplay: person,
          lob: row[colLoB] ? String(row[colLoB]).trim() : undefined,
          bereich: row[colBereich] ? String(row[colBereich]).trim() : undefined,
          cc: row[colCC] ? String(row[colCC]).trim() : undefined,
          team: row[colTeam] ? String(row[colTeam]).trim() : undefined,
          ...values  // Wochen-Werte direkt als Eigenschaften
        };
        rowsOut.push(flatRow);
        debug.push(`  ✓ Zeile verarbeitet: LoB="${flatRow.lob}", Bereich="${flatRow.bereich}", CC="${flatRow.cc}", Team="${flatRow.team}", ${Object.keys(values).length} Wochen-Werte`);
      } else {
        debug.push(`  ⚠️ Zeile übersprungen - keine gültigen Werte`);
      }
    }

    const previewHeader = ['Person', 'LoB', 'Bereich', 'CC', 'Team', ...weeks.map(w => w.key).slice(0, 5)];
    const previewBody: string[][] = rowsOut.slice(0, 5).map(r => [
      r.person,
      r.lob || '',
      r.bereich || '',
      r.cc || '',
      r.team || '',
      ...weeks.slice(0, 5).map(w => (r[w.key] === undefined ? '' : `${r[w.key]}%`))
    ]);
    debug.push(`Beispiel Person: ${rowsOut[0]?.personDisplay || '-'} → LoB: "${rowsOut[0]?.lob}", Bereich: "${rowsOut[0]?.bereich}", CC: "${rowsOut[0]?.cc}", Team: "${rowsOut[0]?.team}"`);

    return { isValid: rowsOut.length > 0, error: rowsOut.length === 0 ? 'Keine Personenzeilen erkannt' : undefined, preview: [previewHeader, ...previewBody], rows: rowsOut, debug };
  }

  // Parser Einsatzplan: Feste Struktur - Zeile 2: KW-Triplets, Zeile 3: Proj|NKV(%)|Ort, Zeile 4+: Daten
  async function parseEinsatzplanWorkbook(file: File): Promise<{ isValid: boolean; error?: string; preview?: string[][]; rows: any[]; debug?: string[]; }> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { isValid: false, error: 'Keine Sheets gefunden', rows: [], debug: ['Keine Sheets gefunden'] };
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true });
    if (!data || data.length < 4) return { isValid: false, error: 'Zu wenige Zeilen (mindestens 4 benötigt)', rows: [], debug: ['Zu wenige Zeilen'] };
    const debug: string[] = [];

    // Feste Zeilen-Struktur entsprechend der Spezifikation
    const kwHeaderRowIdx = 1;      // Zeile 2 (0-basiert): KW-Triplets
    const subHeaderIdx = 2;        // Zeile 3 (0-basiert): Proj|NKV(%)|Ort Header
    const dataStartIdx = 3;        // Zeile 4 (0-basiert): Daten-Start

    debug.push(`Feste Struktur: KW-Header=Zeile ${kwHeaderRowIdx + 1}, Subheader=Zeile ${subHeaderIdx + 1}, Daten ab Zeile ${dataStartIdx + 1}`);

    if (data.length <= dataStartIdx) {
      return { isValid: false, error: 'Keine Datenzeilen gefunden', rows: [], debug: [...debug, 'Keine Datenzeilen gefunden'] };
    }

    const kwRow = data[kwHeaderRowIdx] as any[];
    const subRow = data[subHeaderIdx] as any[];
    const headerRow = data[subHeaderIdx] as any[]; // Zeile 3 enthält auch die Personen-Metadaten

    // Personen-Metadaten Spalten finden
    const lowered = headerRow.map(c => String(c || '').trim().toLowerCase());
    const colLoB = lowered.indexOf('lob');
    const colBereich = lowered.indexOf('bereich');
    const colCC = lowered.indexOf('compentence center (cc)') !== -1 ? lowered.indexOf('compentence center (cc)') : 
                  (lowered.indexOf('competence center') !== -1 ? lowered.indexOf('competence center') : lowered.indexOf('cc'));
    const colTeam = lowered.indexOf('team');
    const colLBS = lowered.indexOf('lbs');
    const colVG = lowered.indexOf('vg');
    const colPerson = lowered.indexOf('name');
    
    if (colPerson === -1) return { isValid: false, error: 'Spalte "Name" nicht gefunden', rows: [], debug: [...debug, 'Spalte "Name" nicht gefunden'] };
    debug.push(`Personen-Spalten: Name=${colPerson}, LoB=${colLoB}, Team=${colTeam}, CC=${colCC}, LBS=${colLBS}, VG=${colVG}`);

    // KW-Triplets verarbeiten: Jede KW spannt 3 Spalten (Proj|NKV(%)|Ort)
    const weeks: { key: string; nkvCol: number }[] = [];
    for (let j = 0; j < kwRow.length; j++) {
      const kwCell = String(kwRow[j] || '').trim();
      const wy = extractWeekYear(kwCell);
      if (!wy) continue;

      // Prüfe Triplet-Struktur: KW in Spalte j, NKV(%) in Spalte j+1, Ort in Spalte j+2
      const projCol = j;           // Spalte 0 des Triplets
      const nkvCol = j + 1;        // Spalte 1 des Triplets (sollte NKV% enthalten)
      const ortCol = j + 2;        // Spalte 2 des Triplets

      // Validiere NKV-Spalte
      const nkvLabel = String(subRow[nkvCol] || '').toLowerCase();
      debug.push(`KW ${kwCell}: Triplet [${projCol}|${nkvCol}|${ortCol}] = ["${subRow[projCol] || ''}" | "${subRow[nkvCol] || ''}" | "${subRow[ortCol] || ''}"]`);
      
      if (/nkv.*%|nkv/.test(nkvLabel)) {
        weeks.push({ key: toKwKey(wy.week, wy.year), nkvCol });
        debug.push(`✓ KW${wy.week}(${wy.year}) → NKV-Spalte ${nkvCol} ("${nkvLabel}")`);
        j += 2; // Springe über das komplette Triplet (3 Spalten)
      } else {
        debug.push(`⚠️ KW ${kwCell}: Keine gültige NKV-Spalte in Position ${nkvCol} ("${nkvLabel}")`);
      }
    }

    if (weeks.length === 0) {
      return { isValid: false, error: 'Keine gültigen KW-Triplets gefunden', rows: [], debug: [...debug, 'Keine KW-Triplets mit NKV-Spalten gefunden'] };
    }

    debug.push(`Erkannte Wochen: ${weeks.map(w => w.key).join(', ')}`);

    // Daten verarbeiten (ab Zeile 4)
    const rowsOut: any[] = [];
    for (let r = dataStartIdx; r < data.length; r++) {
      const row = data[r]; 
      if (!Array.isArray(row)) continue;
      
      const personCell = row[colPerson]; 
      if (!personCell) continue;
      
      const personRaw = String(personCell).trim();
      if (isSummaryRow(personRaw)) continue;
      
      const personDisplay = personRaw;
      const personKey = normalizePersonKey(personDisplay);

      // NKV-Werte aus den entsprechenden Spalten lesen und zu Auslastung umrechnen
      const values: Record<string, number> = {};
      for (const w of weeks) {
        const nkvRaw = row[w.nkvCol];
        if (nkvRaw === undefined || nkvRaw === null || nkvRaw === '') continue;
        
        const parsedNkv = parsePercent(nkvRaw);
        if (parsedNkv === null) continue;
        
        // NKV → Auslastung: Auslastung = 100 - NKV
        const auslastung = Math.max(0, Math.min(100, Math.round((100 - parsedNkv) * 10) / 10));
        values[w.key] = auslastung;
        
        debug.push(`Person "${personDisplay}" KW ${w.key}: NKV=${parsedNkv}% → Auslastung=${auslastung}%`);
      }

      // Nur Personen mit mindestens einem gültigen Wert hinzufügen
      if (Object.keys(values).length === 0) continue;

      // Flache Struktur für Backend-Kompatibilität
      const flatRow = {
        person: personKey,
        personDisplay,
        lob: colLoB !== -1 && row[colLoB] ? String(row[colLoB]).trim() : undefined,
        bereich: colBereich !== -1 && row[colBereich] ? String(row[colBereich]).trim() : undefined,
        cc: colCC !== -1 && row[colCC] ? String(row[colCC]).trim() : undefined,
        team: colTeam !== -1 && row[colTeam] ? String(row[colTeam]).trim() : undefined,
        lbs: colLBS !== -1 && row[colLBS] ? String(row[colLBS]).trim() : undefined,
        vg: colVG !== -1 && row[colVG] ? String(row[colVG]).trim() : undefined,
        ...values  // Wochen-Werte direkt als Eigenschaften im YY/WW Format
      };
      rowsOut.push(flatRow);
    }

    // Preview erstellen
    const previewHeader = ['Name', 'LBS', 'VG', 'LoB', 'Team', 'CC', ...weeks.map(w => w.key).slice(0, 5)];
    const previewBody: string[][] = rowsOut.slice(0, 5).map(r => [
      r.personDisplay || '',
      r.lbs || '',
      r.vg || '',
      r.lob || '',
      r.team || '',
      r.cc || '',
      ...weeks.slice(0, 5).map(w => (r[w.key] === undefined ? '' : `${r[w.key]}%`))
    ]);

    debug.push(`Verarbeitete Personen: ${rowsOut.length}`);
    debug.push(`Beispiel: ${rowsOut[0]?.personDisplay || 'Keine'} → Wochen: ${Object.keys(rowsOut[0] || {}).filter(k => k.match(/^\d{2}\/\d{2}$/)).slice(0, 3).join(', ')}`);

    return { 
      isValid: rowsOut.length > 0, 
      error: rowsOut.length === 0 ? 'Keine gültigen Personenzeilen erkannt' : undefined, 
      preview: [previewHeader, ...previewBody], 
      rows: rowsOut, 
      debug 
    };
  }
  const UploadSlot = ({
    type,
    title,
    description
  }: {
    type: 'auslastung' | 'einsatzplan';
    title: string;
    description: string;
  }) => {
    const file = uploadedFiles[type];
    const inputRef = type === 'auslastung' ? auslastungRef : einsatzplanRef;
    const isDraggedOver = dragOver === type;
    const isCurrentlyProcessing = isProcessing === type;
    return <div className={`relative border-2 border-dashed rounded-xl p-6 transition-all ${isDraggedOver ? 'border-blue-400 bg-blue-50' : file?.isValid ? 'border-green-300 bg-green-50' : file?.error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}`} onDrop={e => handleDrop(e, type)} onDragOver={e => handleDragOver(e, type)} onDragLeave={handleDragLeave}>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(type, file);
      }} />

        {isCurrentlyProcessing ? <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <motion.div animate={{
            rotate: 360
          }} transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}>
                <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              </motion.div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Verarbeitung...</h3>
            <p className="text-sm text-gray-600">Datei wird validiert und verarbeitet</p>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <motion.div className="bg-blue-600 h-2 rounded-full" initial={{
            width: "0%"
          }} animate={{
            width: "100%"
          }} transition={{
            duration: 1.5,
            ease: "easeInOut"
          }} />
            </div>
          </div> : file ? <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${file.isValid ? 'bg-green-100' : 'bg-red-100'}`}>
                  {file.isValid ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-600">{title}</p>
                  {file.error && <p className="text-sm text-red-600 mt-1">{file.error}</p>}
                  {file.isValid && <p className="text-sm text-green-600 mt-1">
                      Datei erfolgreich validiert
                    </p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {file.isValid && file.preview && <button onClick={() => setShowPreview(showPreview === type ? null : type)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors" title="Vorschau anzeigen">
                    <Eye className="w-4 h-4" />
                  </button>}
                <button onClick={() => removeFile(type)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors" title="Datei entfernen">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {file.error && <button onClick={() => retryUpload(type)} className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                Erneut versuchen
              </button>}

            {/* Preview Section */}
            {file.isValid && file.preview && showPreview === type && <motion.div initial={{
          opacity: 0,
          height: 0
        }} animate={{
          opacity: 1,
          height: 'auto'
        }} exit={{
          opacity: 0,
          height: 0
        }} className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Vorschau (erste 5 Zeilen)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        {file.preview[0].map((header, index) => <th key={index} className="px-2 py-1 text-left font-medium text-gray-700">
                            {header}
                          </th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {file.preview.slice(1).map((row, rowIndex) => <tr key={rowIndex} className="border-t border-gray-100">
                          {row.map((cell, cellIndex) => <td key={cellIndex} className="px-2 py-1 text-gray-600">
                              {cell}
                            </td>)}
                        </tr>)}
                    </tbody>
                  </table>
                </div>
              </motion.div>}

            {file.debug && file.debug.length > 0 && (
              <details className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-2">
                <summary className="cursor-pointer select-none text-gray-800">Debug</summary>
                <pre className="whitespace-pre-wrap break-words">{file.debug.join('\n')}</pre>
              </details>
            )}
          </div> : <div className="text-center cursor-pointer" onClick={() => inputRef.current?.click()}>
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-600 mb-4">{description}</p>
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">
                Datei auswählen oder hierher ziehen
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Unterstützte Formate: .xlsx, .xls
            </p>
          </div>}
      </div>;
  };
  const hasValidFiles = uploadedFiles.auslastung?.isValid || uploadedFiles.einsatzplan?.isValid;
  const hasErrors = uploadedFiles.auslastung?.error || uploadedFiles.einsatzplan?.error;
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-6 relative">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Daten hochladen
          </h2>
          <div className="relative" ref={infoContainerRef}>
            <button
              type="button"
              onClick={() => setIsInfoOpen(v => !v)}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Dateianforderungen anzeigen"
            >
              <Info className="w-4 h-4" />
            </button>
            {isInfoOpen && (
              <div className="absolute left-0 top-full mt-2 w-96 max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-40">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Dateianforderungen</h4>
                <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                  <li>Excel-Dateien (.xlsx oder .xls)</li>
                  <li>Wochen: z. B. "KW 25/01", "KW33(2025)", "KW 33-2025" → gespeichert als "25/01"</li>
                  <li>Personen: Auslastung → "Mitarbeiter (ID)", Einsatzplan → "Name"</li>
                </ul>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Lade beide Excel-Dateien hoch, um den vollständigen Report zu generieren.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UploadSlot type="auslastung" title="Auslastung.xlsx" description="Historische Auslastungsdaten der letzten 8 Wochen" />
        <UploadSlot type="einsatzplan" title="Einsatzplan.xlsx" description="Geplante Einsätze für die nächsten 4 Wochen" />
      </div>

      {/* Status Messages */}
      {hasValidFiles && <motion.div initial={{
      opacity: 0,
      height: 0
    }} animate={{
      opacity: 1,
      height: 'auto'
    }} className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900">
                Dateien erfolgreich verarbeitet
              </p>
              <p className="text-sm text-green-700 mt-1">
                Die Daten wurden validiert und stehen für die Analyse zur Verfügung.
              </p>
            </div>
          </div>
        </motion.div>}

      {/* Konsolidierungs-Status */}
      {consolidationStatus && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`mt-6 p-4 rounded-lg border ${
            consolidationStatus.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : consolidationStatus.type === 'warning'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {consolidationStatus.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />}
            {consolidationStatus.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />}
            {consolidationStatus.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />}
            <div>
              <p className={`text-sm font-medium ${
                consolidationStatus.type === 'success' 
                  ? 'text-green-900' 
                  : consolidationStatus.type === 'warning'
                  ? 'text-yellow-900'
                  : 'text-red-900'
              }`}>
                {consolidationStatus.message}
              </p>
              <p className={`text-sm mt-1 ${
                consolidationStatus.type === 'success' 
                  ? 'text-green-700' 
                  : consolidationStatus.type === 'warning'
                  ? 'text-yellow-700'
                  : 'text-red-700'
              }`}>
                {consolidationStatus.details}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {hasErrors && !hasValidFiles && <motion.div initial={{
      opacity: 0,
      height: 0
    }} animate={{
      opacity: 1,
      height: 'auto'
    }} className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">
                Fehler beim Verarbeiten der Dateien
              </p>
              <p className="text-sm text-red-700 mt-1">
                Bitte überprüfe die Dateiformate und Inhalte. Stelle sicher, dass die Excel-Dateien die erforderlichen Sheets und Spalten enthalten.
              </p>
            </div>
          </div>
        </motion.div>}

      {/* Requirements Info ersetzt durch Info-Icon Tooltip am Titel */}
    </motion.div>;
}