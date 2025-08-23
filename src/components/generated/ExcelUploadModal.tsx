import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload } from 'lucide-react';
import { ModernUploadPanel } from './ModernUploadPanel';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExcelUploadModal({ isOpen, onClose }: ExcelUploadModalProps) {
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
            className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Upload className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Excel Upload</h1>
                  <p className="text-sm text-gray-600">Lade Excel-Dateien für Mitarbeiter, Einsatzplan und Auslastung hoch</p>
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
              <ModernUploadPanel 
                onUploadComplete={(result) => {
                  // console.log entfernt
                  // Optional: Auto-close modal on successful upload
                  // if (result.status === 'success') {
                  //   setTimeout(() => onClose(), 2000);
                  // }
                }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
