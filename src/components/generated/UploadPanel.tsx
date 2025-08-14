import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Eye } from 'lucide-react';
interface UploadedFile {
  name: string;
  data: any[];
  isValid: boolean;
  error?: string;
  preview?: string[][];
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

    // Simulate file processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock validation and processing
    const isValidFile = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const hasCorrectSheets = Math.random() > 0.2; // 80% chance of valid sheets

    const mockPreview = [['Name', 'KW29', 'KW30', 'KW31', 'KW32'], ['Max Mustermann', '85%', '92%', '78%', '95%'], ['Anna Schmidt', '90%', '88%', '102%', '87%'], ['Peter Weber', '75%', '80%', '85%', '90%'], ['Lisa Müller', '95%', '98%', '92%', '89%']];
    const mockFile: UploadedFile = {
      name: file.name,
      data: [],
      isValid: isValidFile && hasCorrectSheets,
      error: !isValidFile ? 'Nur Excel-Dateien (.xlsx, .xls) sind erlaubt' : !hasCorrectSheets ? 'Sheet "Export" nicht gefunden oder fehlende Spalten' : undefined,
      preview: isValidFile && hasCorrectSheets ? mockPreview : undefined
    };
    onFilesChange({
      ...uploadedFiles,
      [type]: mockFile
    });
    setIsProcessing(null);
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
          <li>• Sheet "Export" mit Personennamen in Spalte A</li>
          <li>• Wochenspalten im Format "2025-KWxx"</li>
          <li>• Auslastungswerte als Prozent oder Dezimalzahl</li>
        </ul>
      </div>
    </motion.div>;
}