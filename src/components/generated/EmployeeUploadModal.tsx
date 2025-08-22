import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  X,
  Users,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { logger } from '../../lib/logger';

interface EmployeeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UploadedFile {
  name: string;
  data: any[];
  isValid: boolean;
  error?: string;
  preview?: string[][];
}

interface MitarbeiterExcelRow {
  vorname: string;
  nachname: string;
  person: string; // Format: "Nachname, Vorname"
  email: string;
  firma: string;
  lob: string; // Business Line → Lob
  cc: string; // Competence Center → CC
  team: string; // Teamname → Team
  standort: string;
  lbs: string; // Karrierestufe → LBS
  erfahrungSeitJahr: string;
  verfuegbarAb: string | undefined; // ✅ Geändert: ISO-String "YYYY-MM-DD" oder undefined
  verfuegbarFuerStaffing: string;
  linkZumProfil: string;
}

export const EmployeeUploadModal: React.FC<EmployeeUploadModalProps> = ({
  isOpen,
  onClose
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ NEUE FUNKTION: Excel-Zelle -> ISO-YYYY-MM-DD
  function cellToIsoDate(cell: any, wb: XLSX.WorkBook): string | undefined {
    if (!cell) return undefined;

    // A) Wenn cellDates:true und Zelle wirklich als Datum vorliegt
    if (cell.t === "d" && cell.v instanceof Date) {
      const d = cell.v as Date;
      // Datum OHNE Zeitzone persistieren:
      return d.toISOString().slice(0, 10);  // "YYYY-MM-DD"
    }

    // B) Wenn Excel-Datum als Zahl kam (Seriennummer)
    if (cell.t === "n" && typeof cell.v === "number") {
      const date1904 = !!(wb.Workbook && wb.Workbook.WBProps && wb.Workbook.WBProps.date1904);
      const o = XLSX.SSF.parse_date_code(cell.v, { date1904 });
      if (o) {
        const y = o.y, m = o.m, d = o.d;
        // ISO ohne TZ:
        const iso = new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
        return iso; // z.B. "2026-01-01" für 46023
      }
    }

    // C) Fallback: Text wie "01.01.2026" o.ä. parsen
    if (cell.t === "s" && typeof cell.v === "string") {
      const s = cell.v.trim();
      // dd.mm.yyyy
      const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
      if (m) {
        const dd = +m[1], MM = +m[2], yyyy = m[3].length === 2 ? 2000 + +m[3] : +m[3];
        return new Date(Date.UTC(yyyy, MM - 1, dd)).toISOString().slice(0, 10);
      }
      // ISO bereits vorhanden
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    }

    return undefined;
  }

  // ✅ NEUE FUNKTION: Parser für die Excel-Struktur (Header in Zeile 9)
  async function parseMitarbeiterExcelWorkbook(file: File): Promise<{ name: string; isValid: boolean; error?: string; preview?: string[][]; data: MitarbeiterExcelRow[] }> {
    try {
      logger.info("mitarbeiter.upload", `Starte Upload für Datei: ${file.name}`);
      const arrayBuffer = await file.arrayBuffer();
      logger.debug("mitarbeiter.upload", `ArrayBuffer erstellt, Größe: ${arrayBuffer.byteLength}`);
      
      // ✅ WICHTIG: cellDates:true für korrekte Datum-Erkennung!
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellDates: true, // ✅ Aktiviert für korrekte Datum-Erkennung
        cellStyles: true, // ✅ Aktiviert für Zellentyp-Erkennung
        bookVBA: false,
        bookSheets: false,
        cellNF: false,
        cellHTML: false,
        sheetStubs: false,
        bookDeps: false,
        bookFiles: false,
        bookProps: false
      });
      logger.debug("mitarbeiter.upload", `Workbook gelesen, Sheets: ${workbook.SheetNames.join(', ')}`);

      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return { name: file.name, isValid: false, error: 'Keine Sheets gefunden', data: [] };
      }

      const worksheet = workbook.Sheets[sheetName];
      // ✅ Hyperlinks direkt aus dem Worksheet extrahieren
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }); // ✅ raw: false für automatische Excel-Konvertierung
      
      // ✅ Debug: Zeige Hyperlinks aus dem Worksheet
      logger.debug("mitarbeiter.upload", "Worksheet Hyperlinks", worksheet['!links'] || 'Keine Hyperlinks gefunden');
      if (worksheet['!links']) {
        Object.entries(worksheet['!links']).forEach(([cell, link]) => {
          logger.debug("mitarbeiter.upload", `Hyperlink in Zelle ${cell}`, link);
        });
      }

      // ✅ Header ist in Zeile 9 (Index 8), Daten ab Zeile 10 (Index 9)
      if (jsonData.length < 10) {
        return { name: file.name, isValid: false, error: 'Zu wenige Zeilen (mindestens 10 benötigt)', data: [] };
      }

      const headers = jsonData[8] as string[]; // Zeile 9 (Index 8)
      const dataRows = jsonData.slice(9) as string[][]; // Ab Zeile 10 (Index 9)

      // ✅ Spalten-Index finden
      const vornameIndex = headers.findIndex(h => h === 'Vorname');
      const nachnameIndex = headers.findIndex(h => h === 'Nachname');
      const emailIndex = headers.findIndex(h => h === 'E-Mail');
      const firmaIndex = headers.findIndex(h => h === 'Firma');
      const businessLineIndex = headers.findIndex(h => h === 'Business Line');
      const competenceCenterIndex = headers.findIndex(h => h === 'Competence Center');
      const teamnameIndex = headers.findIndex(h => h === 'Teamname');
      const standortIndex = headers.findIndex(h => h === 'Standort');
      const karrierestufeIndex = headers.findIndex(h => h === 'Karrierestufe');
      const erfahrungSeitJahrIndex = headers.findIndex(h => h === 'Erfahrung seit Jahr');
      const verfuegbarAbIndex = headers.findIndex(h => h === 'Verfügbar ab');
      const verfuegbarFuerStaffingIndex = headers.findIndex(h => h === 'Verfügbar für Staffing');
      const linkZumProfilIndex = headers.findIndex(h => h === 'Link zum Profil');

      logger.debug("mitarbeiter.upload", "Spalten-Indizes gefunden", {
        vorname: vornameIndex,
        nachname: nachnameIndex,
        verfuegbarAb: verfuegbarAbIndex,
        verfuegbarFuerStaffing: verfuegbarFuerStaffingIndex,
        headers: headers
      });


      if (vornameIndex === -1 || nachnameIndex === -1) {
        return { name: file.name, isValid: false, error: 'Spalten "Vorname" oder "Nachname" nicht gefunden', data: [] };
      }

      // ✅ Daten parsen
      const rowsOut: MitarbeiterExcelRow[] = [];
      const previewBody: string[][] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || row.length === 0) continue;

        const vorname = row[vornameIndex] || '';
        const nachname = row[nachnameIndex] || '';

        // ✅ Leere Zeilen oder Summen-Zeilen überspringen
        if (!vorname && !nachname) continue;
        if (vorname.toLowerCase().includes('summe') || nachname.toLowerCase().includes('summe')) continue;

        // ✅ person Feld im Format "Nachname, Vorname" erstellen
        const person = nachname && vorname ? `${nachname}, ${vorname}` : `${nachname}${vorname}`;

        // ✅ Hyperlink aus Excel-Zelle extrahieren (falls vorhanden)
        let linkZumProfil = '';
        if (linkZumProfilIndex !== -1) {
          // ✅ Berechne die Excel-Zell-Adresse (z.B. M10 für Spalte 12, Zeile 10)
          const currentRowIndex = i + 10; // Ab Zeile 10 (Index 9 + 1)
          let colLetter = '';
          
          // ✅ Konvertiere Spalten-Index zu Excel-Buchstaben (A, B, C, ..., Z, AA, AB, ...)
          let colIndex = linkZumProfilIndex;
          while (colIndex >= 0) {
            colLetter = String.fromCharCode(65 + (colIndex % 26)) + colLetter;
            colIndex = Math.floor(colIndex / 26) - 1;
          }
          
          const cellAddress = `${colLetter}${currentRowIndex}`;
          
          // ✅ Prüfe ob es einen Hyperlink für diese Zelle gibt
          if (worksheet['!links'] && worksheet['!links'][cellAddress]) {
            linkZumProfil = worksheet['!links'][cellAddress];
            logger.info(`🔗 Hyperlink aus Worksheet gefunden für ${cellAddress}: ${linkZumProfil}`);
          } else {
            // ✅ Fallback: Verwende den Zelleninhalt
            const cellValue = row[linkZumProfilIndex];
            if (cellValue && typeof cellValue === 'string' && cellValue.startsWith('http')) {
              linkZumProfil = cellValue;
              logger.info(`🔗 Direkte URL gefunden: ${linkZumProfil}`);
            } else if (cellValue) {
              linkZumProfil = cellValue;
              logger.warn(`⚠️ Fallback - Zelleninhalt: ${linkZumProfil} (Zelle: ${cellAddress})`);
            }
          }
        }

        const mitarbeiterRow: MitarbeiterExcelRow = {
          vorname,
          nachname,
          person,
          email: row[emailIndex] || '',
          firma: row[firmaIndex] || '',
          lob: row[businessLineIndex] || '', // Business Line → Lob
          cc: row[competenceCenterIndex] || '', // Competence Center → CC
          team: row[teamnameIndex] || '', // Teamname → Team
          standort: row[standortIndex] || '',
          lbs: row[karrierestufeIndex] || '', // Karrierestufe → LBS
          erfahrungSeitJahr: row[erfahrungSeitJahrIndex] || '',
          verfuegbarAb: verfuegbarAbIndex !== -1 ? cellToIsoDate(worksheet[XLSX.utils.encode_cell({ r: i + 9, c: verfuegbarAbIndex })], workbook) : undefined, // ✅ Korrekte Zellenreferenz
          verfuegbarFuerStaffing: row[verfuegbarFuerStaffingIndex] || '',
          linkZumProfil: linkZumProfil // ✅ Jetzt wird die echte URL aus dem Hyperlink extrahiert
        };

        // ✅ Debug: Zeige was für "verfügbar ab" gelesen und geparst wurde
        logger.debug("mitarbeiter.row", `Mitarbeiter ${mitarbeiterRow.person} verarbeitet`, {
          verfuegbarAbIndex,
          verfuegbarAb: mitarbeiterRow.verfuegbarAb
        });

        rowsOut.push(mitarbeiterRow);

        // ✅ Vorschau für die ersten 5 Zeilen
        if (previewBody.length < 5) {
          previewBody.push([
            mitarbeiterRow.person,
            mitarbeiterRow.email,
            mitarbeiterRow.firma,
            mitarbeiterRow.lob,
            mitarbeiterRow.cc,
            mitarbeiterRow.verfuegbarAb || '' // ✅ Verfügbar ab hinzugefügt
          ]);
        }
      }

      // ✅ Vorschau-Header
      const previewHeader = ['Person', 'E-Mail', 'Firma', 'Lob', 'CC', 'Verfügbar ab'];

      return { 
        name: file.name,
        isValid: rowsOut.length > 0, 
        error: rowsOut.length === 0 ? 'Keine Mitarbeiterzeilen erkannt' : undefined, 
        preview: [previewHeader, ...previewBody], 
        data: rowsOut 
      };
    } catch (error) {
      logger.error('Fehler beim Parsen der Excel-Datei:', error);
      return { 
        name: file.name,
        isValid: false, 
        error: `Fehler beim Parsen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 
        data: [] 
      };
    }
  }

  // ✅ NEUE FUNKTION: Upsert-Logik für Firebase (Update oder Insert)
  async function upsertToFirebase(data: MitarbeiterExcelRow[]) {
    try {
      setIsUploading(true);
      setError(null);

      // ✅ Collection: mitarbeiterExcel
      const mitarbeiterCollection = collection(db, 'mitarbeiterExcel');
      
      let insertCount = 0;
      let updateCount = 0;
      let errorCount = 0;

      for (const row of data) {
        try {
          // ✅ Suche nach bestehenden Mitarbeitern über Name + CC + LBS
          const existingQuery = query(
            mitarbeiterCollection,
            where('person', '==', row.person),
            where('cc', '==', row.cc),
            where('lbs', '==', row.lbs)
          );
          
          const existingDocs = await getDocs(existingQuery);
          
          // ✅ Daten für Firebase vorbereiten - verfuegbarAb als Timestamp konvertieren
          const firebaseData = {
            ...row,
            verfuegbarAb: row.verfuegbarAb ? Timestamp.fromDate(new Date(row.verfuegbarAb)) : undefined,
            updatedAt: new Date(),
            uploadVersion: existingDocs.empty ? 1 : (existingDocs.docs[0].data().uploadVersion || 0) + 1
          };
          
          if (!existingDocs.empty) {
            // ✅ Mitarbeiter existiert bereits → UPDATE
            const existingDoc = existingDocs.docs[0];
            await updateDoc(doc(db, 'mitarbeiterExcel', existingDoc.id), firebaseData);
            updateCount++;
            logger.info(`✅ Mitarbeiter aktualisiert: ${row.person} (${row.cc}, ${row.lbs})`);
          } else {
            // ✅ Neuer Mitarbeiter → INSERT
            await addDoc(mitarbeiterCollection, {
              ...firebaseData,
              createdAt: new Date()
            });
            insertCount++;
            logger.info(`➕ Neuer Mitarbeiter hinzugefügt: ${row.person} (${row.cc}, ${row.lbs})`);
          }
        } catch (err) {
          logger.error('Fehler beim Upsert von Mitarbeiter:', row.person, err);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        setUploadComplete(true);
        setUploadedFile({ ...uploadedFile!, data: data, isValid: true });
        logger.info(`✅ Upsert erfolgreich: ${insertCount} neu, ${updateCount} aktualisiert`);
      } else {
        setError(`${insertCount} neu, ${updateCount} aktualisiert, ${errorCount} Fehler`);
      }
    } catch (error) {
      logger.error('Fehler beim Upsert in Firebase:', error);
      setError(`Fehler beim Upsert: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsUploading(false);
    }
  }

  const handleFileSelect = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Bitte wählen Sie eine Excel-Datei (.xlsx oder .xls)');
      return;
    }

    try {
      setError(null);
      const result = await parseMitarbeiterExcelWorkbook(file);
      setUploadedFile(result);

      if (result.isValid && result.data.length > 0) {
        // ✅ Automatisch in Firebase upserten
        await upsertToFirebase(result.data);
      }
    } catch (error) {
      logger.error('Fehler beim Verarbeiten der Datei:', error);
      setError(`Fehler beim Verarbeiten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClose = () => {
    setUploadedFile(null);
    setUploadComplete(false);
    setError(null);
    setIsUploading(false);
    onClose();
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Mitarbeiter Excel-Upload (Upsert)</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-blue-100 mt-2">
            Laden Sie eine Excel-Datei hoch (Header in Zeile 9, Daten ab Zeile 10) - Bestehende Mitarbeiter werden aktualisiert
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!uploadedFile ? (
            /* Upload Area */
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Excel-Datei hier ablegen oder klicken
              </h3>
              <p className="text-gray-500 mb-4">
                Unterstützt .xlsx und .xls Dateien
              </p>
              <button
                onClick={triggerFileInput}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Datei auswählen
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            /* Results */
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                {uploadedFile.isValid ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                )}
                <div>
                  <h3 className="font-medium">
                    {uploadedFile.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {uploadedFile.isValid 
                      ? `${uploadedFile.data.length} Mitarbeiter gefunden`
                      : uploadedFile.error
                    }
                  </p>
                </div>
              </div>

              {uploadedFile.isValid && uploadedFile.preview && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Vorschau (erste 5 Mitarbeiter):</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {uploadedFile.preview[0].map((header, index) => (
                            <th key={index} className="text-left py-2 px-3 font-medium text-gray-700">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {uploadedFile.preview.slice(1).map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b border-gray-100">
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="py-2 px-3 text-gray-600">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {uploadComplete && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-800 font-medium">
                      Upsert erfolgreich! Mitarbeiter wurden in die Collection 'mitarbeiterExcel' gespeichert/aktualisiert.
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-red-800">{error}</span>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleClose}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Schließen
                </button>
                {uploadedFile && !uploadComplete && (
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Neue Datei hochladen
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Führe Upsert in Firebase durch...</p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
