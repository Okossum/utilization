import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import DatabaseService from '../../services/database';
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
}
export function UploadPanel({
  uploadedFiles,
  onFilesChange
}: UploadPanelProps) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const auslastungRef = useRef<HTMLInputElement>(null);
  const einsatzplanRef = useRef<HTMLInputElement>(null);
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

      // Wenn beide Dateien vorhanden sind, konsolidiere die Daten automatisch
      if (parsed.isValid) {

        // Speichere die aktuelle Datei in der Datenbank
        try {
          if (type === 'auslastung') {
            await DatabaseService.saveAuslastung(file.name, parsed.rows);
            console.log('✅ Auslastung-Daten erfolgreich in Datenbank gespeichert');
          } else {
            await DatabaseService.saveEinsatzplan(file.name, parsed.rows);
            console.log('✅ Einsatzplan-Daten erfolgreich in Datenbank gespeichert');
          }
        } catch (dbError) {
          console.error('❌ Fehler beim Speichern in Datenbank:', dbError);
          // Trotz DB-Fehler die Datei als gültig markieren
        }

        // Prüfe ob beide Dateien gültig sind
        if (newFiles.auslastung?.isValid && newFiles.einsatzplan?.isValid) {
          try {
            // Aktuelle Woche und Konfiguration (kann später aus Props kommen)
            const currentYear = new Date().getFullYear();
            const currentWeek = Math.ceil((new Date().getTime() - new Date(currentYear, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
            const forecastStartWeek = currentWeek;
            const lookbackWeeks = 8;  // Historische Daten der letzten 8 Wochen
            const forecastWeeks = 4;   // Forecast für die nächsten 4 Wochen

            // Konsolidiere und speichere die Daten in der Datenbank
            const result = await DatabaseService.consolidateAndSaveUtilizationData(
              newFiles.auslastung.data,
              newFiles.einsatzplan.data,
              currentYear,
              forecastStartWeek,
              lookbackWeeks,
              forecastWeeks
            );

            console.log('✅ Daten erfolgreich konsolidiert und gespeichert:', result);
          } catch (dbError) {
            console.error('❌ Fehler beim Konsolidieren der Daten:', dbError);
            // Fehler nicht an den User weitergeben, da der Upload selbst erfolgreich war
          }
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
    const nn = String(week);
    return `KW ${nn}/${yy}`;
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
    // Variant: "KW 33/25" (two-digit year)
    m = text.match(/KW\s*(\d{1,2})\s*\/\s*(\d{2})/i);
    if (m) {
      const week = parseInt(m[1], 10);
      const yy = parseInt(m[2], 10);
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

    // FESTE POSITION: Header-Zeile ist Zeile 4 (Index 3), Personen-Spalte ist Spalte E (Index 4)
    const headerIdx = 3; // Zeile 4 (0-basiert)
    if (headerIdx >= data.length) return { isValid: false, error: 'Header-Zeile 4 nicht verfügbar', rows: [], debug: [...debug, 'Header-Zeile 4 nicht verfügbar'] };
    
    const headerRow = data[headerIdx] as any[];
    const nameCol = 4; // Spalte E (0-basiert)
    
    // Überprüfen ob Spalte E den erwarteten Header hat
    const expectedHeader = String(headerRow[nameCol] || '').trim().toLowerCase();
    if (!expectedHeader.includes('mitarbeiter') && !expectedHeader.includes('id')) {
      debug.push(`⚠️ Warnung: Spalte E (Index 4) enthält "${headerRow[nameCol]}" statt erwartetem "Mitarbeiter (ID)"`);
    }
    
    debug.push(`Feste Position: Header-Zeile ${headerIdx + 1}, Personen-Spalte ${nameCol + 1} (${String.fromCharCode(65 + nameCol)})`);
    debug.push(`Header-Inhalt Spalte E: "${headerRow[nameCol]}"`);

    // KW → NKV-Spalte ermitteln und Ziel-Key in "KW NN/YY" normieren
    const weeks: { key: string; nkvCol: number }[] = [];
    for (let j = 0; j < kwRow.length; j++) {
      const wy = extractWeekYear(String(kwRow[j] || ''));
      if (!wy) continue;
      const w = wy.week; const y = wy.year;
      let nkvCol = -1;
      
      // Erweiterte Suche nach NKV-Spalten
      for (let off = 0; off <= 3; off++) {
        const lbl = String(subRow[j + off] || '').toLowerCase();
        debug.push(`KW ${w}/${y}: Subheader[${j + off}] = "${lbl}"`);
        if (/nkv|auslastung|kapazität|utilization/.test(lbl)) { 
          nkvCol = j + off; 
          debug.push(`✓ NKV-Spalte gefunden: ${j + off} mit Label "${lbl}"`);
          break; 
        }
      }
      
      // Fallback: Wenn keine NKV-Spalte, nehmen wir die KW trotzdem
      if (nkvCol === -1) {
        debug.push(`⚠️ Keine NKV-Spalte für KW ${w}/${y} gefunden, verwende Spalte ${j}`);
        nkvCol = j;
      }
      
      weeks.push({ key: toKwKey(w, y), nkvCol });
    }
    debug.push(`Erkannte KWs (Auslastung): ${weeks.map(w => w.key).slice(0, 8).join(', ')}${weeks.length > 8 ? '…' : ''}`);
    debug.push(`Subheader-Inhalt: ${subRow.slice(0, 20).map(c => String(c || '').trim()).join(' | ')}`);
    if (weeks.length === 0) return { isValid: false, error: 'Keine passenden KW/Spalten gefunden', rows: [], debug };

    // Datenzeilen
    const rowsOut: any[] = [];
    debug.push(`Starte Datenverarbeitung ab Zeile ${headerIdx + 2} (${data.length - headerIdx - 1} Zeilen verfügbar)`);
    
    for (let r = headerIdx + 1; r < data.length; r++) {
      const row = data[r]; if (!Array.isArray(row)) continue;
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
        debug.push(`  KW ${w.key}: Spalte ${w.nkvCol} = "${rawValue}" → geparst: ${parsed}`);
        
        if (parsed === null) continue;
        // Falls Subheader Auslastung ist, parsed ist bereits KV; falls NKV, bereits Warnung eingetragen → 100-parsed
        const headerLbl = String(subRow[w.nkvCol] || '').toLowerCase();
        const isNkv = /nkv/.test(headerLbl);
        const kv = isNkv ? Math.max(0, Math.min(100, Math.round((100 - parsed) * 10) / 10)) : parsed;
        values[w.key] = kv;
        debug.push(`    → Finaler Wert: ${kv}% (${isNkv ? 'NKV' : 'KV'})`);
      }
      
      if (Object.keys(values).length > 0) {
        rowsOut.push({ person: personKey, personDisplay: person, values });
        debug.push(`  ✓ Zeile verarbeitet mit ${Object.keys(values).length} KW-Werten`);
      } else {
        debug.push(`  ⚠️ Zeile übersprungen - keine gültigen Werte`);
      }
    }

    const previewHeader = ['Person', ...weeks.map(w => w.key)];
    const previewBody: string[][] = rowsOut.slice(0, 5).map(r => [
      r.person, // Verwende den normalisierten Key statt personDisplay
      ...weeks.map(w => (r.values[w.key] === undefined ? '' : `${r.values[w.key]}%`))
    ]);
    debug.push(`Beispiel Person: ${rowsOut[0]?.personDisplay || '-'} → Keys: ${Object.keys(rowsOut[0]?.values || {}).slice(0, 5).join(', ')}`);

    return { isValid: rowsOut.length > 0, error: rowsOut.length === 0 ? 'Keine Personenzeilen erkannt' : undefined, preview: [previewHeader, ...previewBody], rows: rowsOut, debug };
  }

  // Parser Einsatzplan: Personen-Spalte = "Name", KW-Blöcke mit Kopf "KWxx(YYYY)" und Subheader "NKV (%)"
  async function parseEinsatzplanWorkbook(file: File): Promise<{ isValid: boolean; error?: string; preview?: string[][]; rows: any[]; debug?: string[]; }> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { isValid: false, error: 'Keine Sheets gefunden', rows: [], debug: ['Keine Sheets gefunden'] };
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true });
    if (!data || data.length === 0) return { isValid: false, error: 'Leeres Sheet', rows: [], debug: ['Leeres Sheet'] };
    const debug: string[] = [];

    // KW-Header-Zeile suchen (erste 10 Zeilen), akzeptiere alle Formate aus extractWeekYear
    let kwHeaderRowIdx = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i]; if (!Array.isArray(row)) continue;
      const kwCount = row.reduce((acc, c) => acc + (extractWeekYear(String(c || '')) ? 1 : 0), 0);
      debug.push(`Zeile ${i + 1}: gefundene KW-Header = ${kwCount}`);
      if (kwCount >= 3) { kwHeaderRowIdx = i; break; }
    }
    if (kwHeaderRowIdx === -1 || kwHeaderRowIdx + 1 >= data.length) return { isValid: false, error: 'KW-Header nicht gefunden', rows: [], debug: [...debug, 'KW-Header nicht gefunden'] };
    debug.push(`KW-Header-Zeile: ${kwHeaderRowIdx + 1}, Subheader: ${kwHeaderRowIdx + 2}, Personen-Header: ${kwHeaderRowIdx + 3}`);

    const kwRow = data[kwHeaderRowIdx] as any[];
    const subHeaderIdx = kwHeaderRowIdx + 1;
    const subRow = data[subHeaderIdx] as any[];

    // Header-Zeile mit Personen-Spalte "Name" finden (innerhalb der ersten 10 Zeilen um den Subheader)
    let headerIdx = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i]; if (!Array.isArray(row)) continue;
      const lowered = row.map(c => String(c || '').trim().toLowerCase());
      if (lowered.includes('name')) { headerIdx = i; break; }
    }
    if (headerIdx === -1) return { isValid: false, error: 'Header mit "Name" nicht gefunden', rows: [], debug: [...debug, 'Header mit "Name" nicht gefunden'] };
    debug.push(`KW-Header-Zeile: ${kwHeaderRowIdx + 1}, Subheader: ${subHeaderIdx + 1}, Personen-Header: ${headerIdx + 1}`);

    const headerRow = data[headerIdx] as any[];
    const lowered = headerRow.map(c => String(c || '').trim().toLowerCase());
    const colBusinessUnit = lowered.indexOf('business unit');
    const colCC = lowered.indexOf('compentence center (cc)') !== -1 ? lowered.indexOf('compentence center (cc)') : (lowered.indexOf('competence center') !== -1 ? lowered.indexOf('competence center') : lowered.indexOf('cc'));
    const colTeam = lowered.indexOf('team');
    const colLBS = lowered.indexOf('lbs');
    const colVG = lowered.indexOf('vg');
    const colPerson = lowered.indexOf('name');
    if (colPerson === -1) return { isValid: false, error: 'Spalte "Name" nicht gefunden', rows: [], debug: [...debug, 'Spalte "Name" nicht gefunden'] };

    // KWs anhand KW-Header + Subheader NKV ermitteln
    const weeks: { key: string; nkvCol: number }[] = [];
    for (let j = 0; j < kwRow.length; j++) {
      const wy = extractWeekYear(String(kwRow[j] || ''));
      if (!wy) continue;
      let nkvCol = -1;
      
      // Erweiterte Suche nach NKV-Spalten
      for (let off = 0; off <= 3; off++) {
        const lbl = String(subRow[j + off] || '').toLowerCase();
        debug.push(`KW ${wy.week}/${wy.year}: Subheader[${j + off}] = "${lbl}"`);
        if (/nkv|auslastung|kapazität|utilization/.test(lbl)) { 
          nkvCol = j + off; 
          debug.push(`✓ NKV-Spalte gefunden: ${j + off} mit Label "${lbl}"`);
          break; 
        }
      }
      
      // Fallback: Wenn keine NKV-Spalte, nehmen wir die KW trotzdem
      if (nkvCol === -1) {
        debug.push(`⚠️ Keine NKV-Spalte für KW ${wy.week}/${wy.year} gefunden, verwende Spalte ${j}`);
        nkvCol = j;
      }
      
      weeks.push({ key: toKwKey(wy.week, wy.year), nkvCol });
    }
    debug.push(`Erkannte KWs (Plan): ${weeks.map(w => w.key).slice(0, 8).join(', ')}${weeks.length > 8 ? '…' : ''}`);
    debug.push(`Subheader-Inhalt: ${subRow.slice(0, 20).map(c => String(c || '').trim()).join(' | ')}`);
    if (weeks.length === 0) return { isValid: false, error: 'Keine NKV-Spalten für KWs gefunden', rows: [], debug };

    const rowsOut: any[] = [];
    const startRow = Math.max(headerIdx, subHeaderIdx) + 1;
    for (let r = startRow; r < data.length; r++) {
      const row = data[r]; if (!Array.isArray(row)) continue;
      const personCell = row[colPerson]; if (!personCell) continue;
      const personRaw = String(personCell).trim();
      if (isSummaryRow(personRaw)) continue;
      const personDisplay = personRaw;
      const personKey = normalizePersonKey(personDisplay);

      const values: Record<string, number> = {};
      for (const w of weeks) {
        const parsedNkv = parsePercent(row[w.nkvCol]);
        if (parsedNkv === null) continue;
        const kv = Math.max(0, Math.min(100, Math.round((100 - parsedNkv) * 10) / 10));
        values[w.key] = kv;
      }
      rowsOut.push({ person: personKey, personDisplay, cc: colCC !== -1 ? row[colCC] : undefined, team: colTeam !== -1 ? row[colTeam] : undefined, bu: colBusinessUnit !== -1 ? row[colBusinessUnit] : undefined, lbs: colLBS !== -1 ? row[colLBS] : undefined, vg: colVG !== -1 ? row[colVG] : undefined, values });
    }

    const previewHeader = ['Name', 'LBS', 'VG', ...weeks.map(k => k.key)];
    const previewBody: string[][] = rowsOut.slice(0, 5).map(r => [
      r.personDisplay,
      r.lbs || '',
      r.vg || '',
      ...weeks.map(k => (r.values[k.key] === undefined ? '' : `${r.values[k.key]}%`))
    ]);
    debug.push(`Beispiel Person: ${rowsOut[0]?.personDisplay || '-'} → Keys: ${Object.keys(rowsOut[0]?.values || {}).slice(0, 5).join(', ')}`);

    return { isValid: rowsOut.length > 0, error: rowsOut.length === 0 ? 'Keine Personenzeilen erkannt' : undefined, preview: [previewHeader, ...previewBody], rows: rowsOut, debug };
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
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Daten hochladen
        </h2>
        <p className="text-sm text-gray-600">
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

      {/* Requirements Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Dateianforderungen
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Excel-Dateien (.xlsx oder .xls)</li>
          <li>• KWs: z. B. "KW 25/01", "KW33(2025)", "KW 33-2025"</li>
          <li>• Personen: Auslastung → "Mitarbeiter (ID)", Einsatzplan → "Name"</li>
        </ul>
      </div>
    </motion.div>;
}