import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Eye } from 'lucide-react';
interface UploadedFile {
  name: string;
  data: any[];
  isValid: boolean;
  error?: string;
  preview?: string[][];
  mpid?: string;
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
  mpid?: string;
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
    return <div className={`relative border-2 border-dashed rounded-xl p-6 transition-all ${isDraggedOver ? 'border-blue-400 bg-blue-50' : file?.isValid ? 'border-green-300 bg-green-50' : file?.error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}`} onDrop={e => handleDrop(e, type)} onDragOver={e => handleDragOver(e, type)} onDragLeave={handleDragLeave} data-magicpath-id="0" data-magicpath-path="UploadPanel.tsx">
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(type, file);
      }} data-magicpath-id="1" data-magicpath-path="UploadPanel.tsx" />

        {isCurrentlyProcessing ? <div className="text-center" data-magicpath-id="2" data-magicpath-path="UploadPanel.tsx">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4" data-magicpath-id="3" data-magicpath-path="UploadPanel.tsx">
              <motion.div animate={{
            rotate: 360
          }} transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }} data-magicpath-id="4" data-magicpath-path="UploadPanel.tsx">
                <FileSpreadsheet className="w-6 h-6 text-blue-600" data-magicpath-id="5" data-magicpath-path="UploadPanel.tsx" />
              </motion.div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2" data-magicpath-id="6" data-magicpath-path="UploadPanel.tsx">Verarbeitung...</h3>
            <p className="text-sm text-gray-600" data-magicpath-id="7" data-magicpath-path="UploadPanel.tsx">Datei wird validiert und verarbeitet</p>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2" data-magicpath-id="8" data-magicpath-path="UploadPanel.tsx">
              <motion.div className="bg-blue-600 h-2 rounded-full" initial={{
            width: "0%"
          }} animate={{
            width: "100%"
          }} transition={{
            duration: 1.5,
            ease: "easeInOut"
          }} data-magicpath-id="9" data-magicpath-path="UploadPanel.tsx" />
            </div>
          </div> : file ? <div className="space-y-4" data-magicpath-id="10" data-magicpath-path="UploadPanel.tsx">
            <div className="flex items-start justify-between" data-magicpath-id="11" data-magicpath-path="UploadPanel.tsx">
              <div className="flex items-start gap-3" data-magicpath-id="12" data-magicpath-path="UploadPanel.tsx">
                <div className={`p-2 rounded-lg ${file.isValid ? 'bg-green-100' : 'bg-red-100'}`} data-magicpath-id="13" data-magicpath-path="UploadPanel.tsx">
                  {file.isValid ? <CheckCircle className="w-5 h-5 text-green-600" data-magicpath-id="14" data-magicpath-path="UploadPanel.tsx" /> : <AlertCircle className="w-5 h-5 text-red-600" data-magicpath-id="15" data-magicpath-path="UploadPanel.tsx" />}
                </div>
                <div className="flex-1" data-magicpath-id="16" data-magicpath-path="UploadPanel.tsx">
                  <p className="font-medium text-gray-900" data-magicpath-id="17" data-magicpath-path="UploadPanel.tsx">{file.name}</p>
                  <p className="text-sm text-gray-600" data-magicpath-id="18" data-magicpath-path="UploadPanel.tsx">{title}</p>
                  {file.error && <p className="text-sm text-red-600 mt-1" data-magicpath-id="19" data-magicpath-path="UploadPanel.tsx">{file.error}</p>}
                  {file.isValid && <p className="text-sm text-green-600 mt-1" data-magicpath-id="20" data-magicpath-path="UploadPanel.tsx">
                      Datei erfolgreich validiert
                    </p>}
                </div>
              </div>
              <div className="flex items-center gap-2" data-magicpath-id="21" data-magicpath-path="UploadPanel.tsx">
                {file.isValid && file.preview && <button onClick={() => setShowPreview(showPreview === type ? null : type)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors" title="Vorschau anzeigen" data-magicpath-id="22" data-magicpath-path="UploadPanel.tsx">
                    <Eye className="w-4 h-4" data-magicpath-id="23" data-magicpath-path="UploadPanel.tsx" />
                  </button>}
                <button onClick={() => removeFile(type)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors" title="Datei entfernen" data-magicpath-id="24" data-magicpath-path="UploadPanel.tsx">
                  <X className="w-4 h-4" data-magicpath-id="25" data-magicpath-path="UploadPanel.tsx" />
                </button>
              </div>
            </div>

            {file.error && <button onClick={() => retryUpload(type)} className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors" data-magicpath-id="26" data-magicpath-path="UploadPanel.tsx">
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
        }} className="border-t border-gray-200 pt-4" data-magicpath-id="27" data-magicpath-path="UploadPanel.tsx">
                <h4 className="text-sm font-medium text-gray-900 mb-3" data-magicpath-id="28" data-magicpath-path="UploadPanel.tsx">
                  Vorschau (erste 5 Zeilen)
                </h4>
                <div className="overflow-x-auto" data-magicpath-id="29" data-magicpath-path="UploadPanel.tsx">
                  <table className="w-full text-xs" data-magicpath-id="30" data-magicpath-path="UploadPanel.tsx">
                    <thead data-magicpath-id="31" data-magicpath-path="UploadPanel.tsx">
                      <tr className="bg-gray-100" data-magicpath-id="32" data-magicpath-path="UploadPanel.tsx">
                        {file.preview[0].map((header, index) => <th key={index} className="px-2 py-1 text-left font-medium text-gray-700" data-magicpath-id="33" data-magicpath-path="UploadPanel.tsx">
                            {header}
                          </th>)}
                      </tr>
                    </thead>
                    <tbody data-magicpath-id="34" data-magicpath-path="UploadPanel.tsx">
                      {file.preview.slice(1).map((row, rowIndex) => <tr key={rowIndex} className="border-t border-gray-100" data-magicpath-uuid={(row as any)["mpid"] ?? "unsafe"} data-magicpath-id="35" data-magicpath-path="UploadPanel.tsx">
                          {row.map((cell, cellIndex) => <td key={cellIndex} className="px-2 py-1 text-gray-600" data-magicpath-uuid={(row as any)["mpid"] ?? "unsafe"} data-magicpath-id="36" data-magicpath-path="UploadPanel.tsx">
                              {cell}
                            </td>)}
                        </tr>)}
                    </tbody>
                  </table>
                </div>
              </motion.div>}
          </div> : <div className="text-center cursor-pointer" onClick={() => inputRef.current?.click()} data-magicpath-id="37" data-magicpath-path="UploadPanel.tsx">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4" data-magicpath-id="38" data-magicpath-path="UploadPanel.tsx">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" data-magicpath-id="39" data-magicpath-path="UploadPanel.tsx" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2" data-magicpath-id="40" data-magicpath-path="UploadPanel.tsx">{title}</h3>
            <p className="text-sm text-gray-600 mb-4" data-magicpath-id="41" data-magicpath-path="UploadPanel.tsx">{description}</p>
            <div className="flex items-center justify-center gap-2 text-blue-600" data-magicpath-id="42" data-magicpath-path="UploadPanel.tsx">
              <Upload className="w-4 h-4" data-magicpath-id="43" data-magicpath-path="UploadPanel.tsx" />
              <span className="text-sm font-medium" data-magicpath-id="44" data-magicpath-path="UploadPanel.tsx">
                Datei auswählen oder hierher ziehen
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2" data-magicpath-id="45" data-magicpath-path="UploadPanel.tsx">
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
  }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" data-magicpath-id="46" data-magicpath-path="UploadPanel.tsx">
      <div className="mb-6" data-magicpath-id="47" data-magicpath-path="UploadPanel.tsx">
        <h2 className="text-lg font-semibold text-gray-900 mb-2" data-magicpath-id="48" data-magicpath-path="UploadPanel.tsx">
          Daten hochladen
        </h2>
        <p className="text-sm text-gray-600" data-magicpath-id="49" data-magicpath-path="UploadPanel.tsx">
          Lade beide Excel-Dateien hoch, um den vollständigen Report zu generieren.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-magicpath-id="50" data-magicpath-path="UploadPanel.tsx">
        <UploadSlot type="auslastung" title="Auslastung.xlsx" description="Historische Auslastungsdaten der letzten 8 Wochen" data-magicpath-id="51" data-magicpath-path="UploadPanel.tsx" />
        <UploadSlot type="einsatzplan" title="Einsatzplan.xlsx" description="Geplante Einsätze für die nächsten 4 Wochen" data-magicpath-id="52" data-magicpath-path="UploadPanel.tsx" />
      </div>

      {/* Status Messages */}
      {hasValidFiles && <motion.div initial={{
      opacity: 0,
      height: 0
    }} animate={{
      opacity: 1,
      height: 'auto'
    }} className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200" data-magicpath-id="53" data-magicpath-path="UploadPanel.tsx">
          <div className="flex items-start gap-3" data-magicpath-id="54" data-magicpath-path="UploadPanel.tsx">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" data-magicpath-id="55" data-magicpath-path="UploadPanel.tsx" />
            <div data-magicpath-id="56" data-magicpath-path="UploadPanel.tsx">
              <p className="text-sm font-medium text-green-900" data-magicpath-id="57" data-magicpath-path="UploadPanel.tsx">
                Dateien erfolgreich verarbeitet
              </p>
              <p className="text-sm text-green-700 mt-1" data-magicpath-id="58" data-magicpath-path="UploadPanel.tsx">
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
    }} className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200" data-magicpath-id="59" data-magicpath-path="UploadPanel.tsx">
          <div className="flex items-start gap-3" data-magicpath-id="60" data-magicpath-path="UploadPanel.tsx">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" data-magicpath-id="61" data-magicpath-path="UploadPanel.tsx" />
            <div data-magicpath-id="62" data-magicpath-path="UploadPanel.tsx">
              <p className="text-sm font-medium text-red-900" data-magicpath-id="63" data-magicpath-path="UploadPanel.tsx">
                Fehler beim Verarbeiten der Dateien
              </p>
              <p className="text-sm text-red-700 mt-1" data-magicpath-id="64" data-magicpath-path="UploadPanel.tsx">
                Bitte überprüfe die Dateiformate und Inhalte. Stelle sicher, dass die Excel-Dateien die erforderlichen Sheets und Spalten enthalten.
              </p>
            </div>
          </div>
        </motion.div>}

      {/* Requirements Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200" data-magicpath-id="65" data-magicpath-path="UploadPanel.tsx">
        <h4 className="text-sm font-medium text-blue-900 mb-2" data-magicpath-id="66" data-magicpath-path="UploadPanel.tsx">
          Dateianforderungen
        </h4>
        <ul className="text-sm text-blue-700 space-y-1" data-magicpath-id="67" data-magicpath-path="UploadPanel.tsx">
          <li data-magicpath-id="68" data-magicpath-path="UploadPanel.tsx">• Excel-Dateien (.xlsx oder .xls)</li>
          <li data-magicpath-id="69" data-magicpath-path="UploadPanel.tsx">• Sheet "Export" mit Personennamen in Spalte A</li>
          <li data-magicpath-id="70" data-magicpath-path="UploadPanel.tsx">• Wochenspalten im Format "2025-KWxx"</li>
          <li data-magicpath-id="71" data-magicpath-path="UploadPanel.tsx">• Auslastungswerte als Prozent oder Dezimalzahl</li>
        </ul>
      </div>
    </motion.div>;
}