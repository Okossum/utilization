import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Users, BarChart3, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { uploadMitarbeiter, uploadAuslastung, uploadEinsatzplan } from '../../lib/uploaders';

type UploadType = 'mitarbeiter' | 'auslastung' | 'einsatzplan';

interface UploadResult {
  type: UploadType;
  fileName: string;
  status: 'success' | 'error';
  message: string;
  stats?: {
    matched?: number;
    ambiguous?: number;
    unmatched?: number;
    written?: number;
    triplesCount?: number;
    weekColumns?: number;
  };
}

interface ModernUploadPanelProps {
  onUploadComplete?: (result: UploadResult) => void;
}

const uploadConfigs = {
  mitarbeiter: {
    title: 'Mitarbeiter',
    description: 'Excel-Datei mit Mitarbeiterdaten (Search Results Sheet)',
    icon: Users,
    color: 'blue',
    acceptedFormats: '.xlsx, .xls'
  },
  auslastung: {
    title: 'Auslastung',
    description: 'Excel-Datei mit Auslastungsdaten (Export Sheet)',
    icon: BarChart3,
    color: 'green',
    acceptedFormats: '.xlsx, .xls'
  },
  einsatzplan: {
    title: 'Einsatzplan',
    description: 'Excel-Datei mit Einsatzplandaten (Einsatzplan Sheet)',
    icon: Calendar,
    color: 'purple',
    acceptedFormats: '.xlsx, .xls'
  }
};

export function ModernUploadPanel({ onUploadComplete }: ModernUploadPanelProps) {
  const { user, loading } = useAuth();
  const [dragOver, setDragOver] = useState<UploadType | null>(null);
  const [uploading, setUploading] = useState<UploadType | null>(null);
  const [results, setResults] = useState<UploadResult[]>([]);
  
  const fileInputRefs = {
    mitarbeiter: useRef<HTMLInputElement>(null),
    auslastung: useRef<HTMLInputElement>(null),
    einsatzplan: useRef<HTMLInputElement>(null)
  };

  const handleFileUpload = useCallback(async (file: File, type: UploadType) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      const result: UploadResult = {
        type,
        fileName: file.name,
        status: 'error',
        message: 'Nur Excel-Dateien (.xlsx, .xls) sind erlaubt'
      };
      setResults(prev => [result, ...prev]);
      onUploadComplete?.(result);
      return;
    }

    setUploading(type);
    
    try {
      let uploadResult;
      
      switch (type) {
        case 'mitarbeiter':
          uploadResult = await uploadMitarbeiter(file);
          break;
        case 'auslastung':
          uploadResult = await uploadAuslastung(file);
          break;
        case 'einsatzplan':
          uploadResult = await uploadEinsatzplan(file);
          break;
        default:
          throw new Error(`Unbekannter Upload-Typ: ${type}`);
      }

      const result: UploadResult = {
        type,
        fileName: file.name,
        status: 'success',
        message: `Upload erfolgreich abgeschlossen`,
        stats: uploadResult
      };
      
      setResults(prev => [result, ...prev]);
      onUploadComplete?.(result);
      
    } catch (error: any) {
      const result: UploadResult = {
        type,
        fileName: file.name,
        status: 'error',
        message: error?.message || 'Unbekannter Fehler beim Upload'
      };
      
      setResults(prev => [result, ...prev]);
      onUploadComplete?.(result);
    } finally {
      setUploading(null);
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent, type: UploadType) => {
    e.preventDefault();
    setDragOver(null);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0], type);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: UploadType) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0], type);
    }
    // Reset input
    e.target.value = '';
  }, [handleFileUpload]);

  const clearResults = () => setResults([]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Authentifizierung läuft...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Bitte melde dich an um Dateien hochzuladen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(Object.entries(uploadConfigs) as [UploadType, typeof uploadConfigs[UploadType]][]).map(([type, config]) => {
          const IconComponent = config.icon;
          const isUploading = uploading === type;
          const isDragOver = dragOver === type;
          
          return (
            <motion.div
              key={type}
              className={`
                relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                transition-all duration-200 hover:shadow-lg
                ${isDragOver 
                  ? `border-${config.color}-400 bg-${config.color}-50` 
                  : `border-gray-300 hover:border-${config.color}-400`
                }
                ${isUploading ? 'opacity-50 pointer-events-none' : ''}
              `}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(type);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, type)}
              onClick={() => fileInputRefs[type].current?.click()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Hidden File Input */}
              <input
                ref={fileInputRefs[type]}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileSelect(e, type)}
                className="hidden"
              />

              {/* Upload Icon */}
              <div className={`mx-auto w-12 h-12 mb-4 flex items-center justify-center rounded-full bg-${config.color}-100`}>
                {isUploading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                ) : (
                  <IconComponent className={`w-6 h-6 text-${config.color}-600`} />
                )}
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {config.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {config.description}
              </p>

              {/* Upload Instructions */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Upload className="w-4 h-4" />
                  <span>Datei hierher ziehen oder klicken</span>
                </div>
                <p className="text-xs text-gray-400">
                  Unterstützt: {config.acceptedFormats}
                </p>
              </div>

              {/* Upload Status */}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-xl">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Upload läuft...</p>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Results Section */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Upload-Ergebnisse</h3>
              <button
                onClick={clearResults}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Löschen
              </button>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {results.map((result, index) => (
                <motion.div
                  key={`${result.type}-${result.fileName}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {result.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileSpreadsheet className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {result.fileName}
                        </span>
                        <span className={`
                          text-xs px-2 py-1 rounded-full font-medium
                          ${uploadConfigs[result.type].color === 'blue' ? 'bg-blue-100 text-blue-800' :
                            uploadConfigs[result.type].color === 'green' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'}
                        `}>
                          {uploadConfigs[result.type].title}
                        </span>
                      </div>
                      
                      <p className={`text-sm ${result.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                        {result.message}
                      </p>

                      {/* Stats */}
                      {result.stats && (
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">
                          {result.stats.matched !== undefined && (
                            <span>✓ {result.stats.matched} gematcht</span>
                          )}
                          {result.stats.written !== undefined && (
                            <span>📝 {result.stats.written} geschrieben</span>
                          )}
                          {result.stats.weekColumns !== undefined && (
                            <span>📅 {result.stats.weekColumns} Wochen</span>
                          )}
                          {result.stats.triplesCount !== undefined && (
                            <span>🔗 {result.stats.triplesCount} Triplets</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
