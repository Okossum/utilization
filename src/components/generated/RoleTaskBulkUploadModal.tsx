import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';

interface ImportData {
  role: string;
  task: string;
  description: string;
  outputs: string;
}

interface ImportResults {
  rolesCreated: number;
  tasksCreated: number;
  tasksIgnored: number;
  errors: string[];
}

interface RoleTaskBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const RoleTaskBulkUploadModal: React.FC<RoleTaskBulkUploadModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const { token } = useAuth();
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportData[]>([]);
  const [validData, setValidData] = useState<ImportData[]>([]);
  const [invalidRows, setInvalidRows] = useState<string[]>([]);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setStep('upload');
      setFile(null);
      setParsedData([]);
      setValidData([]);
      setInvalidRows([]);
      setImportResults(null);
      setError(null);
      setIsDragOver(false);
    }
  }, [isOpen]);

  // File upload handler
  const handleFileUpload = (uploadedFile: File) => {
    setFile(uploadedFile);
    setError(null);

    // Validate file type
    if (!uploadedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Bitte wählen Sie eine Excel-Datei (.xlsx, .xls) oder CSV-Datei aus.');
      return;
    }

    parseFile(uploadedFile);
  };

  // File input change handler
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;
    
    handleFileUpload(uploadedFile);
    // Reset input
    event.target.value = '';
  };

  // Drag and drop handlers
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
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Parse Excel/CSV file
  const parseFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Parse data and validate
        const parsed: ImportData[] = [];
        const invalid: string[] = [];

        jsonData.forEach((row: any, index: number) => {
          // Skip header row and empty rows
          if (index === 0 || !row || row.length === 0) return;

          const role = row[0]?.toString()?.trim();
          const task = row[1]?.toString()?.trim();
          const description = row[2]?.toString()?.trim() || '';
          const outputs = row[3]?.toString()?.trim() || '';

          if (!role || !task) {
            invalid.push(`Zeile ${index + 1}: Rolle="${role || 'leer'}", Tätigkeit="${task || 'leer'}"`);
            return;
          }

          parsed.push({ role, task, description, outputs });
        });

        // Remove duplicates within same role
        const uniqueData: ImportData[] = [];
        const seen = new Set<string>();

        parsed.forEach(item => {
          const key = `${item.role}:${item.task}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueData.push(item);
          }
        });

        setParsedData(parsed);
        setValidData(uniqueData);
        setInvalidRows(invalid);
        setStep('preview');

      } catch (error) {
        setError('Fehler beim Lesen der Datei. Bitte überprüfen Sie das Dateiformat.');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Execute import
  const executeImport = async () => {
    if (validData.length === 0) return;

    setStep('importing');
    setError(null);

    try {
      const response = await fetch('/api/roles/bulk-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          data: validData.map(item => ({ 
            role: item.role, 
            task: item.task,
            description: item.description,
            outputs: item.outputs
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Import');
      }

      const results = await response.json();
      setImportResults(results.results);
      setStep('results');
      
      // Notify parent component
      onImportComplete();

    } catch (error: any) {
      setError(error.message);
      setStep('preview');
    }
  };

  // Close modal
  const handleClose = () => {
    onClose();
  };

  // Group data by role for preview
  const groupedData = validData.reduce((acc, item) => {
    if (!acc[item.role]) {
      acc[item.role] = [];
    }
    acc[item.role].push({
      task: item.task,
      description: item.description,
      outputs: item.outputs
    });
    return acc;
  }, {} as Record<string, Array<{task: string, description: string, outputs: string}>>);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Rollen & Tätigkeiten Import
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Excel-Import für Rollen, Tätigkeiten, Beschreibungen und Outcomes
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-600">{error}</div>
                </div>
              )}

              {/* Step 1: Upload */}
              {step === 'upload' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <FileSpreadsheet className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Excel-Datei hochladen
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Laden Sie eine Excel-Datei mit Rollen und Tätigkeiten hoch
                    </p>
                  </div>

                  {/* File Format Info */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-medium text-purple-900 mb-2">Dateiformat:</h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• <strong>Spalte A:</strong> Rolle (z.B. "Projektmanager")</li>
                      <li>• <strong>Spalte B:</strong> Tätigkeit (z.B. "Projektinitialisierung")</li>
                      <li>• <strong>Spalte C:</strong> Beschreibung (z.B. "Business Case, Ziele...")</li>
                      <li>• <strong>Spalte D:</strong> Artefakte/Outputs (z.B. "Project Charter...")</li>
                      <li>• Erste Zeile wird als Header ignoriert</li>
                      <li>• Leere Zeilen werden ignoriert</li>
                      <li>• Duplikate innerhalb einer Rolle werden ignoriert</li>
                    </ul>
                  </div>

                  {/* File Upload */}
                  <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                      isDragOver 
                        ? 'border-purple-400 bg-purple-50' 
                        : 'border-gray-300 hover:border-purple-400'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileInputChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <Upload className="w-12 h-12 text-gray-400 mb-4 mx-auto" />
                    <span className="block text-lg font-medium text-gray-900 mb-2">
                      Datei auswählen oder hierher ziehen
                    </span>
                    <span className="block text-sm text-gray-500">
                      Excel (.xlsx, .xls) oder CSV-Dateien
                    </span>
                  </div>
                </div>
              )}

              {/* Step 2: Preview */}
              {step === 'preview' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      Import-Vorschau
                    </h3>
                    <div className="text-sm text-gray-600">
                      {validData.length} gültige Einträge, {invalidRows.length} ignoriert
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">{Object.keys(groupedData).length}</div>
                      <div className="text-sm text-purple-800">Rollen</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{validData.length}</div>
                      <div className="text-sm text-blue-800">Tätigkeiten</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-600">{invalidRows.length}</div>
                      <div className="text-sm text-gray-800">Ignoriert</div>
                    </div>
                  </div>

                  {/* Invalid Rows */}
                  {invalidRows.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-900 mb-2">Ignorierte Zeilen:</h4>
                      <div className="text-sm text-yellow-800 space-y-1 max-h-32 overflow-y-auto">
                        {invalidRows.map((row, index) => (
                          <div key={index}>• {row}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview Data */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                    <div className="space-y-4 p-4">
                      {Object.entries(groupedData).map(([role, tasks]) => (
                        <div key={role} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-purple-50 px-4 py-3 border-b border-gray-200">
                            <h4 className="font-medium text-purple-900">{role}</h4>
                            <p className="text-sm text-purple-700">{tasks.length} Tätigkeiten</p>
                          </div>
                          <div className="divide-y divide-gray-200">
                            {tasks.map((task, index) => (
                              <div key={index} className="p-4 hover:bg-gray-50">
                                <div className="font-medium text-gray-900 mb-2">{task.task}</div>
                                {task.description && (
                                  <div className="text-sm text-gray-600 mb-2">
                                    <strong>Beschreibung:</strong> {task.description}
                                  </div>
                                )}
                                {task.outputs && (
                                  <div className="text-sm text-gray-600">
                                    <strong>Outputs:</strong> {task.outputs}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Importing */}
              {step === 'importing' && (
                <div className="text-center py-12">
                  <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Import läuft...
                  </h3>
                  <p className="text-gray-600">
                    Bitte warten Sie, während die Rollen und Tätigkeiten importiert werden.
                  </p>
                </div>
              )}

              {/* Step 4: Results */}
              {step === 'results' && importResults && (
                <div className="space-y-6">
                  <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Import erfolgreich abgeschlossen
                    </h3>
                  </div>

                  {/* Results Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">{importResults.rolesCreated}</div>
                      <div className="text-sm text-purple-800">Neue Rollen</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{importResults.tasksCreated}</div>
                      <div className="text-sm text-blue-800">Neue Tätigkeiten</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-600">{importResults.tasksIgnored}</div>
                      <div className="text-sm text-gray-800">Ignoriert (Duplikate)</div>
                    </div>
                  </div>

                  {/* Errors */}
                  {importResults.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-900 mb-2">Fehler beim Import:</h4>
                      <div className="text-sm text-red-800 space-y-1 max-h-32 overflow-y-auto">
                        {importResults.errors.map((error, index) => (
                          <div key={index}>• {error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
              {step === 'upload' && (
                <button
                  onClick={handleClose}
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
              )}

              {step === 'preview' && (
                <>
                  <button
                    onClick={() => setStep('upload')}
                    className="px-6 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Zurück
                  </button>
                  <button
                    onClick={executeImport}
                    disabled={validData.length === 0}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Import starten ({validData.length} Einträge)
                  </button>
                </>
              )}

              {step === 'results' && (
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Fertig
                </button>
              )}
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RoleTaskBulkUploadModal;
