import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Eye, Info, Brain, Building2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../contexts/AuthContext';
import KnowledgeService from '../../services/knowledge';

interface KnowledgeUploadedFile {
  name: string;
  data: any[];
  isValid: boolean;
  error?: string;
  preview?: string[][];
  debug?: string[];
  type: 'mitarbeiter' | 'branchen';
}

interface KnowledgeUploadPanelProps {
  uploadedFiles: {
    mitarbeiter?: KnowledgeUploadedFile;
    branchen?: KnowledgeUploadedFile;
  };
  onFilesChange: (files: {
    mitarbeiter?: KnowledgeUploadedFile;
    branchen?: KnowledgeUploadedFile;
  }) => void;
  onDatabaseRefresh?: () => void;
}

export function KnowledgeUploadPanel({
  uploadedFiles,
  onFilesChange,
  onDatabaseRefresh
}: KnowledgeUploadPanelProps) {
  const { user, token, loading } = useAuth();
  
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
  
  if (!user) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-gray-600">Bitte melde dich an um Knowledge-Dateien hochzuladen.</p>
        </div>
      </div>
    );
  }

  // ✅ NEU: Token Provider für KnowledgeService setzen
  React.useEffect(() => {
    if (user && token) {
      KnowledgeService.setAuthTokenProvider(async () => {
        try {
          console.log('🔑 Token für KnowledgeService in UploadPanel gesetzt:', token.substring(0, 20) + '...');
          return token;
        } catch (error) {
          console.error('❌ Fehler beim Token-Abruf für KnowledgeService in UploadPanel:', error);
          return null;
        }
      });
    }
  }, [user, token]);

  const [dragOver, setDragOver] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const mitarbeiterRef = useRef<HTMLInputElement>(null);
  const branchenRef = useRef<HTMLInputElement>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const infoContainerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (infoContainerRef.current && !infoContainerRef.current.contains(e.target as Node)) {
        setIsInfoOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleFileSelect = async (type: 'mitarbeiter' | 'branchen', file: File) => {
    setIsProcessing(type);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (!isExcel) {
      onFilesChange({
        ...uploadedFiles,
        [type]: {
          name: file.name,
          data: [],
          isValid: false,
          error: 'Nur Excel-Dateien (.xlsx, .xls) sind erlaubt',
          type
        }
      });
      setIsProcessing(null);
      return;
    }

    try {
      let parsed;
      if (type === 'mitarbeiter') {
        parsed = await parseMitarbeiterKnowledgeWorkbook(file);
      } else {
        parsed = await parseBranchenKnowledgeWorkbook(file);
      }

      const uploaded: KnowledgeUploadedFile = {
        name: file.name,
        data: parsed.rows,
        isValid: parsed.isValid,
        error: parsed.error,
        preview: parsed.preview,
        debug: parsed.debug,
        type
      };

      onFilesChange({
        ...uploadedFiles,
        [type]: uploaded
      });

      console.log(`✅ ${type === 'mitarbeiter' ? 'Mitarbeiter' : 'Branchen'}-Knowledge erfolgreich geparst:`, parsed.rows.length, 'Einträge');

      // ✅ NEU: Speichern in der Datenbank wenn Datei gültig ist
      if (parsed.isValid && parsed.rows.length > 0) {
        try {
          if (type === 'mitarbeiter') {
            await KnowledgeService.saveMitarbeiterKnowledge(file.name, parsed.rows);
            console.log(`💾 Mitarbeiter Knowledge in Datenbank gespeichert: ${parsed.rows.length} Einträge`);
          } else {
            await KnowledgeService.saveBranchenKnowHow(file.name, parsed.rows);
            console.log(`💾 Branchen Know-How in Datenbank gespeichert: ${parsed.rows.length} Einträge`);
          }
          
          // Datenbank-Refresh anfordern
          if (onDatabaseRefresh) {
            await onDatabaseRefresh();
            console.log('✅ Datenbank-Refresh nach Knowledge-Upload abgeschlossen');
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
          type
        }
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDrop = (e: React.DragEvent, type: 'mitarbeiter' | 'branchen') => {
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

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  };

  const removeFile = (type: 'mitarbeiter' | 'branchen') => {
    const newFiles = { ...uploadedFiles };
    delete newFiles[type];
    onFilesChange(newFiles);
  };

  const getUploadArea = (type: 'mitarbeiter' | 'branchen') => {
    const file = uploadedFiles[type];
    const isDragOver = dragOver === type;
    const label = type === 'mitarbeiter' ? 'Mitarbeiter Knowledge' : 'Branchen Know-How';
    const icon = type === 'mitarbeiter' ? Brain : Building2;
    const color = type === 'mitarbeiter' ? 'blue' : 'green';

    return (
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? `border-${color}-400 bg-${color}-100`
            : file?.isValid
            ? `border-${color}-300 bg-${color}-100`
            : `border-${color}-200 bg-white hover:border-${color}-300 hover:bg-${color}-50`
        }`}
        onDrop={(e) => handleDrop(e, type)}
        onDragOver={(e) => handleDragOver(e, type)}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={type === 'mitarbeiter' ? mitarbeiterRef : branchenRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(type, e.target.files[0])}
          className="hidden"
        />

        {!file ? (
          <div className="cursor-pointer" onClick={() => (type === 'mitarbeiter' ? mitarbeiterRef.current?.click() : branchenRef.current?.click())}>
            <icon className={`w-12 h-12 text-${color}-400 mx-auto mb-4`} />
            <p className="text-gray-600">
              <span className={`font-medium text-${color}-600`}>Datei auswählen</span> oder hierher ziehen
            </p>
            <p className="text-sm text-gray-500 mt-1">Excel-Datei mit {label}</p>
            <p className="text-xs text-gray-400 mt-2">Format: Spalte A = Kategorien, Spalte B = Knowledge/Know-How</p>
          </div>
        ) : file.isValid ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              <span className="font-medium">{file.name}</span>
            </div>
            <p className="text-sm text-green-700">{file.data.length} Einträge erfolgreich geladen</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowPreview(showPreview === type ? null : type)}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
              >
                <Eye className="w-4 h-4 inline mr-1" />
                Vorschau
              </button>
              <button
                onClick={() => removeFile(type)}
                className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
              >
                <X className="w-4 h-4 inline mr-1" />
                Entfernen
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <span className="font-medium">{file.name}</span>
            </div>
            <p className="text-sm text-red-700">{file.error}</p>
            <button
              onClick={() => removeFile(type)}
              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
            >
              <X className="w-4 h-4 inline mr-1" />
              Entfernen
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Knowledge Upload</h2>
          <p className="text-gray-600">Laden Sie Mitarbeiter Knowledge und Branchen Know-How hoch</p>
        </div>
        <div className="relative" ref={infoContainerRef}>
          <button
            onClick={() => setIsInfoOpen(!isInfoOpen)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Info className="w-5 h-5" />
          </button>
          {isInfoOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10">
              <h3 className="font-medium text-gray-900 mb-2">Upload-Format</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>Mitarbeiter Knowledge:</strong> Excel mit Spalte A = Kategorien, Spalte B = Knowledge</p>
                <p><strong>Branchen Know-How:</strong> Excel mit Spalte A = Kategorien, Spalte B = Know-How</p>
                <p className="text-xs text-gray-500 mt-2">Beide Knowledge-Typen können unabhängig voneinander hochgeladen werden</p>
                <p className="text-xs text-gray-500">Jede Datei wird separat verarbeitet und gespeichert</p>
              </div>
            </div>
          )}
        </div>
      </div>

              <div className="space-y-8">
          {/* Mitarbeiter Knowledge Upload */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              Mitarbeiter Knowledge
            </h3>
            <p className="text-blue-700 mb-4">
              Laden Sie Excel-Dateien mit Mitarbeiter-Knowledge hoch. 
              Jede Datei wird unabhängig verarbeitet und gespeichert.
            </p>
            {getUploadArea('mitarbeiter')}
          </div>

          {/* Branchen Know-How Upload */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-green-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-600" />
              Branchen Know-How
            </h3>
            <p className="text-green-700 mb-4">
              Laden Sie Excel-Dateien mit Branchen-Know-How hoch. 
              Jede Datei wird unabhängig verarbeitet und gespeichert.
            </p>
            {getUploadArea('branchen')}
          </div>
        </div>

      {/* Vorschau */}
      {showPreview && uploadedFiles[showPreview] && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Vorschau: {showPreview === 'mitarbeiter' ? 'Mitarbeiter Knowledge' : 'Branchen Know-How'}
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Kategorie</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">
                    {showPreview === 'mitarbeiter' ? 'Knowledge' : 'Know-How'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {uploadedFiles[showPreview]?.preview?.slice(1, 6).map((row, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-sm text-gray-900">{row[0]}</td>
                    <td className="py-2 px-3 text-sm text-gray-700">{row[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {uploadedFiles[showPreview]?.data && uploadedFiles[showPreview]!.data.length > 5 && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                +{uploadedFiles[showPreview]!.data.length - 5} weitere Einträge
              </p>
            )}
          </div>
        </div>
      )}

      {/* Debug-Informationen */}
      {(uploadedFiles.mitarbeiter?.debug || uploadedFiles.branchen?.debug) && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Debug-Informationen</h3>
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto text-sm font-mono">
            {uploadedFiles.mitarbeiter?.debug && (
              <div className="mb-4">
                <div className="text-blue-400 mb-2">Mitarbeiter Knowledge:</div>
                {uploadedFiles.mitarbeiter.debug.map((line, index) => (
                  <div key={index} className="mb-1">{line}</div>
                ))}
              </div>
            )}
            {uploadedFiles.branchen?.debug && (
              <div>
                <div className="text-green-400 mb-2">Branchen Know-How:</div>
                {uploadedFiles.branchen.debug.map((line, index) => (
                  <div key={index} className="mb-1">{line}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Parser für Mitarbeiter Knowledge: Spalte A = Kategorien, Spalte B = Knowledge
async function parseMitarbeiterKnowledgeWorkbook(file: File): Promise<{ isValid: boolean; error?: string; preview?: string[][]; rows: any[]; debug?: string[]; }> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { isValid: false, error: 'Keine Sheets gefunden', rows: [], debug: ['Keine Sheets gefunden'] };
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true });
  if (!data || data.length === 0) return { isValid: false, error: 'Leeres Sheet', rows: [], debug: ['Leeres Sheet'] };
  
  const debug: string[] = [];
  debug.push(`Sheet "${sheetName}" geladen: ${data.length} Zeilen`);
  
  // Suche nach Header-Zeile (enthält "Kategorie" und "Knowledge")
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    
    const rowText = row.map(c => String(c || '').toLowerCase());
    if (rowText.some(c => c.includes('kategorie')) && rowText.some(c => c.includes('knowledge'))) {
      headerRowIdx = i;
      debug.push(`Header-Zeile gefunden: Zeile ${i + 1}`);
      break;
    }
  }
  
  if (headerRowIdx === -1) {
    return { isValid: false, error: 'Header-Zeile mit "Kategorie" und "Knowledge" nicht gefunden', rows: [], debug };
  }
  
  const headerRow = data[headerRowIdx];
  const colKategorie = 0; // Spalte A
  const colKnowledge = 1; // Spalte B
  
  debug.push(`Spalten: A=Kategorie, B=Knowledge`);
  
  // Daten verarbeiten (ab Zeile nach Header)
  const rowsOut: any[] = [];
  const dataStartIdx = headerRowIdx + 1;
  
  for (let r = dataStartIdx; r < data.length; r++) {
    const row = data[r];
    if (!Array.isArray(row)) continue;
    
    const kategorie = String(row[colKategorie] || '').trim();
    const knowledge = String(row[colKnowledge] || '').trim();
    
    if (!kategorie || !knowledge) continue;
    
    rowsOut.push({
      kategorie,
      knowledge,
      type: 'mitarbeiter'
    });
    
    debug.push(`Zeile ${r + 1}: "${kategorie}" → "${knowledge}"`);
  }
  
  const previewHeader = ['Kategorie', 'Knowledge'];
  const previewBody: string[][] = rowsOut.slice(0, 5).map(r => [r.kategorie, r.knowledge]);
  
  return { 
    isValid: rowsOut.length > 0, 
    error: rowsOut.length === 0 ? 'Keine Knowledge-Einträge gefunden' : undefined, 
    preview: [previewHeader, ...previewBody], 
    rows: rowsOut, 
    debug 
  };
}

// Parser für Branchen Know-How: Spalte A = Kategorien, Spalte B = Know-How
async function parseBranchenKnowledgeWorkbook(file: File): Promise<{ isValid: boolean; error?: string; preview?: string[][]; rows: any[]; debug?: string[]; }> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { isValid: false, error: 'Keine Sheets gefunden', rows: [], debug: ['Keine Sheets gefunden'] };
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true });
  if (!data || data.length === 0) return { isValid: false, error: 'Leeres Sheet', rows: [], debug: ['Leeres Sheet'] };
  
  const debug: string[] = [];
  debug.push(`Sheet "${sheetName}" geladen: ${data.length} Zeilen`);
  
  // Suche nach Header-Zeile (enthält "Kategorie" und "Know-How")
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    
    const rowText = row.map(c => String(c || '').toLowerCase());
    if (rowText.some(c => c.includes('kategorie')) && rowText.some(c => c.includes('know-how') || c.includes('knowhow'))) {
      headerRowIdx = i;
      debug.push(`Header-Zeile gefunden: Zeile ${i + 1}`);
      break;
    }
  }
  
  if (headerRowIdx === -1) {
    return { isValid: false, error: 'Header-Zeile mit "Kategorie" und "Know-How" nicht gefunden', rows: [], debug };
  }
  
  const headerRow = data[headerRowIdx];
  const colKategorie = 0; // Spalte A
  const colKnowHow = 1; // Spalte B
  
  debug.push(`Spalten: A=Kategorie, B=Know-How`);
  
  // Daten verarbeiten (ab Zeile nach Header)
  const rowsOut: any[] = [];
  const dataStartIdx = headerRowIdx + 1;
  
  for (let r = dataStartIdx; r < data.length; r++) {
    const row = data[r];
    if (!Array.isArray(row)) continue;
    
    const kategorie = String(row[colKategorie] || '').trim();
    const knowHow = String(row[colKnowHow] || '').trim();
    
    if (!kategorie || !knowHow) continue;
    
    rowsOut.push({
      kategorie,
      knowHow,
      type: 'branchen'
    });
    
    debug.push(`Zeile ${r + 1}: "${kategorie}" → "${knowHow}"`);
  }
  
  const previewHeader = ['Kategorie', 'Know-How'];
  const previewBody: string[][] = rowsOut.slice(0, 5).map(r => [r.kategorie, r.knowHow]);
  
  return { 
    isValid: rowsOut.length > 0, 
    error: rowsOut.length === 0 ? 'Keine Know-How-Einträge gefunden' : undefined, 
    preview: [previewHeader, ...previewBody], 
    rows: rowsOut, 
    debug 
  };
}
