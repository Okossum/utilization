import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  Users,
  Database
} from 'lucide-react';
import { EmployeeExcelParser, PersonRow, EmployeeParseResult } from '../../services/employeeParser';
import DatabaseService from '../../services/database';

interface EmployeeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmployeeUploadModal: React.FC<EmployeeUploadModalProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parseResult, setParseResult] = useState<EmployeeParseResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
        setParseResult(null);
        setUploadComplete(false);
      } else {
        alert('Bitte wählen Sie eine Excel-Datei (.xlsx oder .xls) aus.');
        event.target.value = '';
      }
    }
  };

  const handleParseFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const parser = new EmployeeExcelParser();
      const result = await parser.parseEmployeeExcel(selectedFile, 1);
      setParseResult(result);
      
      if (result.success) {
        console.log('✅ Parsing erfolgreich:', result);
      } else {
        console.error('❌ Parsing-Fehler:', result.errors);
      }
    } catch (error) {
      console.error('Fehler beim Parsen:', error);
      setParseResult({
        success: false,
        data: [],
        errors: [`Unbekannter Fehler: ${error}`],
        warnings: [],
        stats: { totalRows: 0, validRows: 0, invalidRows: 0, headerRowIndex: -1 }
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!parseResult?.success || parseResult.data.length === 0) return;

    setIsSaving(true);
    try {
      console.log('💾 Speichere Employee-Daten:', parseResult.data);
      
      const result = await DatabaseService.saveEmployeeStammdaten(parseResult.data);
      
      if (result.success) {
        setUploadComplete(true);
        console.log(`✅ ${result.count} Mitarbeiter erfolgreich gespeichert: ${result.message}`);
      } else {
        throw new Error(result.message || 'Unbekannter Fehler beim Speichern');
      }
      
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert(`Fehler beim Speichern: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setParseResult(null);
    setUploadComplete(false);
    setIsUploading(false);
    setIsSaving(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Mitarbeiter-Stammdaten Upload
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              
              {/* Upload Success */}
              {uploadComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <h3 className="font-medium text-green-900">Upload erfolgreich!</h3>
                      <p className="text-sm text-green-700">
                        {parseResult?.data.length} Mitarbeiter wurden erfolgreich in der Datenbank gespeichert.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* File Upload */}
              {!uploadComplete && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      1. Excel-Datei auswählen
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Wählen Sie eine Excel-Datei mit dem Sheet "Search Results" und Mitarbeiter-Stammdaten aus.
                    </p>
                    
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <FileSpreadsheet className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="employee-file-input"
                      />
                      <label
                        htmlFor="employee-file-input"
                        className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Datei auswählen
                      </label>
                      <p className="text-sm text-gray-500 mt-1">
                        .xlsx oder .xls Dateien
                      </p>
                    </div>

                    {selectedFile && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">
                            {selectedFile.name}
                          </span>
                          <span className="text-xs text-blue-600">
                            ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Parse Button */}
                  {selectedFile && !parseResult && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        2. Datei analysieren
                      </h3>
                      <button
                        onClick={handleParseFile}
                        disabled={isUploading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isUploading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Analysiere...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Datei analysieren
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Parse Results */}
              {parseResult && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Analyse-Ergebnisse
                  </h3>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {parseResult.stats.totalRows}
                      </div>
                      <div className="text-sm text-blue-700">Gesamt-Zeilen</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {parseResult.stats.validRows}
                      </div>
                      <div className="text-sm text-green-700">Gültige Zeilen</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {parseResult.stats.invalidRows}
                      </div>
                      <div className="text-sm text-red-700">Fehlerhafte Zeilen</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {parseResult.data.length}
                      </div>
                      <div className="text-sm text-purple-700">Finale Personen</div>
                    </div>
                  </div>

                  {/* Errors */}
                  {parseResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-red-900 mb-2">
                            Fehler ({parseResult.errors.length})
                          </h4>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {parseResult.errors.map((error, index) => (
                              <p key={index} className="text-sm text-red-700">
                                {error}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {parseResult.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-yellow-900 mb-2">
                            Warnungen ({parseResult.warnings.length})
                          </h4>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {parseResult.warnings.slice(0, 5).map((warning, index) => (
                              <p key={index} className="text-sm text-yellow-700">
                                {warning}
                              </p>
                            ))}
                            {parseResult.warnings.length > 5 && (
                              <p className="text-sm text-yellow-700 italic">
                                ... und {parseResult.warnings.length - 5} weitere
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sample Data Preview */}
                  {parseResult.success && parseResult.data.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">
                        Vorschau (erste 3 Personen)
                      </h4>
                      <div className="space-y-2">
                        {parseResult.data.slice(0, 3).map((person, index) => (
                          <div key={index} className="bg-white p-3 rounded border text-sm">
                            <div className="font-medium text-gray-900">{person.person}</div>
                            <div className="text-gray-600">
                              {person.lob} • {person.cc} • {person.team}
                            </div>
                            {person.lbs && (
                              <div className="text-gray-500">{person.lbs}</div>
                            )}
                            {person.profileLink && (
                              <div className="text-blue-600 text-xs mt-1">
                                🔗 <a href={person.profileLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  Profil-Link
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Save to Database */}
                  {parseResult.success && parseResult.data.length > 0 && !uploadComplete && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        3. In Datenbank speichern
                      </h3>
                      <button
                        onClick={handleSaveToDatabase}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Speichere...
                          </>
                        ) : (
                          <>
                            <Database className="w-4 h-4" />
                            {parseResult.data.length} Mitarbeiter speichern
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {uploadComplete ? 'Schließen' : 'Abbrechen'}
              </button>
              {uploadComplete && (
                <button
                  onClick={resetModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Neuen Upload starten
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
