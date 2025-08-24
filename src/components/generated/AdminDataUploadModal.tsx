import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Database, X, Upload } from 'lucide-react';

// import { UploadPanel } from './UploadPanel'; // DISABLED

interface UploadedFile {
  name: string;
  data: any[];
  isValid: boolean;
  error?: string;
  preview?: string[][];
  debug?: string[];
}

interface AdminDataUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatabaseRefresh?: () => void;
}

export function AdminDataUploadModal({ isOpen, onClose, onDatabaseRefresh }: AdminDataUploadModalProps) {
  // DISABLED: uploadedFiles State
  // const [uploadedFiles, setUploadedFiles] = useState<{
  //   auslastung?: UploadedFile;
  //   einsatzplan?: UploadedFile;
  // }>({});

  // DISABLED: handleFilesChange
  // const handleFilesChange = (files: {
  //   auslastung?: UploadedFile;
  //   einsatzplan?: UploadedFile;
  // }) => {
  //   setUploadedFiles(files);
  // };

  const handleDatabaseRefreshAndClose = async () => {
    // Erst Database refresh, dann Modal schließen
    if (onDatabaseRefresh) {
      await onDatabaseRefresh();
    }
    
    // DISABLED: Upload-Dateien zurücksetzen
    // setUploadedFiles({});
    
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Database className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Daten-Upload Administration</h1>
                  <p className="text-sm text-gray-600">Excel-Dateien hochladen und utilization-Data Collection aktualisieren</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-white/50 rounded-lg transition-colors" 
                aria-label="Schließen"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-medium text-gray-900">Excel-Dateien hochladen</h2>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-yellow-800">
                    <strong>Hinweis:</strong> Das Hochladen neuer Dateien aktualisiert die utilization-Data Collection 
                    in Firebase und überschreibt bestehende Daten. Die Änderungen sind sofort für alle Benutzer sichtbar.
                  </p>
                </div>
              </div>

                          {/* DISABLED: UploadPanel
            <UploadPanel
              uploadedFiles={{}}
              onFilesChange={() => {}}
              onDatabaseRefresh={onDatabaseRefresh}
            />
            */}
            {/* 🚀 PHASE 2: Konsolidierungs-Admin-Panel wurde entfernt */}
            <div className="p-6 text-center text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Konsolidierungs-Panel wurde entfernt</p>
              <p className="text-sm">Verwenden Sie die anderen Admin-Tools</p>
            </div>

              {/* DISABLED: Upload-Status-Buttons
              {(false) && (
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleDatabaseRefreshAndClose}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Daten aktualisieren & Schließen
                  </button>
                </div>
              )}
              */}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
