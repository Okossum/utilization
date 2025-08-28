import React, { useState, useEffect } from 'react';
import { X, Download, CheckCircle, AlertCircle, ExternalLink, User, Briefcase, Award, BookOpen, Key, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { profilerService, ProfilerImportResult, ProfilerProfile } from '../../services/profilerService';
import { ProfilerTokenManager } from './ProfilerTokenManager';
import { useProfilerToken } from '../../hooks/useProfilerToken';

interface ProfilerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  profileUrl?: string;
  onImportComplete: (importedData: any) => void;
  preloadedData?: any;
}

export function ProfilerImportModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  profileUrl,
  onImportComplete,
  preloadedData
}: ProfilerImportModalProps) {
  const [importUrl, setImportUrl] = useState(profileUrl || '');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ProfilerImportResult | null>(null);
  const [previewData, setPreviewData] = useState<ProfilerProfile | null>(null);
  const [isTokenManagerOpen, setIsTokenManagerOpen] = useState(false);

  // Token-Management Hook
  const { 
    currentToken, 
    isTokenValid, 
    timeRemaining: tokenTimeRemaining, 
    saveToken,
    loadToken 
  } = useProfilerToken();

  const handleTokenSaved = (token: string) => {
    saveToken(token);
    loadToken(); // Reload to update state
  };

  // Preloaded Data verarbeiten
  useEffect(() => {
    if (preloadedData && isOpen) {
      console.log('📥 Preloaded Data empfangen:', preloadedData);
      setImportResult(preloadedData);
      if (preloadedData.success && preloadedData.profile) {
        setPreviewData(preloadedData.profile);
      }
    }
  }, [preloadedData, isOpen]);

  const handleImport = async () => {
    if (!importUrl.trim()) return;

    // Validiere Token-Authentifizierung
    if (!isTokenValid) {
      setImportResult({
        success: false,
        error: 'Bitte geben Sie einen gültigen Token ein',
        importedFields: []
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setPreviewData(null);

    try {
      // Verwende Token-Auth
      const result = await profilerService.performFullImport(importUrl, employeeId, currentToken || undefined);
      setImportResult(result);
      
      if (result.success && result.profile) {
        setPreviewData(result.profile);
      }
    } catch (error) {
      setImportResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        importedFields: []
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = () => {
    if (importResult?.success && (importResult as any).convertedData) {
      onImportComplete((importResult as any).convertedData);
      onClose();
    }
  };

  const handleClose = () => {
    setImportResult(null);
    setPreviewData(null);
    setImportUrl(profileUrl || '');
    onClose();
  };

  // Prüfen ob wir im Preview-Modus sind (preloaded data vorhanden)
  const isPreviewMode = Boolean(preloadedData && importResult?.success);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isPreviewMode ? 'Profiler-Import Vorschau' : 'Profiler-Import'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {isPreviewMode 
                  ? `Vorschau der Profiler-Daten für ${employeeName} - Prüfen Sie die Daten vor dem Import`
                  : `Daten aus dem Adesso Profiler für ${employeeName} importieren`
                }
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Token Status - nur im manuellen Modus */}
            {!isPreviewMode && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Authentifizierung
                  </label>
                  <button
                    onClick={() => setIsTokenManagerOpen(true)}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Key className="w-4 h-4" />
                    Token verwalten
                  </button>
                </div>
                
                {isTokenValid ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Token gültig</span>
                      <div className="flex items-center gap-1 text-green-700 ml-auto">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">{tokenTimeRemaining}m verbleibend</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">
                        Kein gültiger Token verfügbar
                      </span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      Für den Profiler-Import wird ein gültiger JWT Token benötigt
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* URL Input - nur im manuellen Modus */}
            {!isPreviewMode && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profiler-URL
                </label>
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://profiler.adesso-group.com/profile/123456"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isImporting}
                  />
                  <button
                    onClick={handleImport}
                    disabled={isImporting || !importUrl.trim() || !isTokenValid}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title={!isTokenValid ? 'Gültiger Token erforderlich' : ''}
                  >
                    {isImporting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {isImporting ? 'Importiere...' : 'Importieren'}
                  </button>
                </div>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div className="mb-6">
                {importResult.success ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">Import erfolgreich</span>
                    </div>
                    <p className="text-sm text-green-700">
                      {importResult.importedFields.length} Datenfelder wurden erfolgreich importiert
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {importResult.importedFields.map(field => (
                        <span key={field} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="font-medium text-red-800">Import fehlgeschlagen</span>
                    </div>
                    <p className="text-sm text-red-700">{importResult.error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Preview Data */}
            {previewData && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Importierte Daten - Vorschau
                </h3>

                {/* Basic Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Grunddaten</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{previewData.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">E-Mail:</span>
                      <span className="ml-2 font-medium">{previewData.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Position:</span>
                      <span className="ml-2 font-medium">{previewData.position}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Bereich:</span>
                      <span className="ml-2 font-medium">{previewData.department}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Standort:</span>
                      <span className="ml-2 font-medium">{previewData.location}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Seit:</span>
                      <span className="ml-2 font-medium">
                        {previewData.startDate ? new Date(previewData.startDate).toLocaleDateString('de-DE') : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                {previewData.skills.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Skills ({previewData.skills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {previewData.skills.map(skill => (
                        <span
                          key={skill.id}
                          className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                        >
                          {skill.name}
                          {skill.level && (
                            <span className="ml-1 text-blue-600">({skill.level}/5)</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {previewData.projects.length > 0 && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Projekte ({previewData.projects.length})
                    </h4>
                    <div className="space-y-3">
                      {previewData.projects.map(project => (
                        <div key={project.id} className="bg-white rounded p-3 border border-green-200">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h5 className="font-medium text-gray-900">{project.name}</h5>
                              <p className="text-sm text-gray-600">{project.customer}</p>
                            </div>
                            <span className="text-xs text-gray-500">
                              {project.startDate && project.endDate && (
                                `${new Date(project.startDate).toLocaleDateString('de-DE')} - ${new Date(project.endDate).toLocaleDateString('de-DE')}`
                              )}
                            </span>
                          </div>
                          {project.role && (
                            <p className="text-sm text-gray-700 mb-1">
                              <span className="font-medium">Rolle:</span> {project.role}
                            </p>
                          )}
                          {project.skills && project.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {project.skills.map((skill, index) => (
                                <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Data */}
                {(previewData.certifications?.length || previewData.languages?.length || previewData.education?.length) && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Zusätzliche Informationen
                    </h4>
                    
                    {previewData.certifications && previewData.certifications.length > 0 && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-700">Zertifizierungen:</span>
                        <ul className="mt-1 text-sm text-gray-600">
                          {previewData.certifications.map((cert, index) => (
                            <li key={index} className="ml-4">• {cert}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {previewData.languages && previewData.languages.length > 0 && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-700">Sprachen:</span>
                        <ul className="mt-1 text-sm text-gray-600">
                          {previewData.languages.map((lang, index) => (
                            <li key={index} className="ml-4">• {lang}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {previewData.education && previewData.education.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Ausbildung:</span>
                        <ul className="mt-1 text-sm text-gray-600">
                          {previewData.education.map((edu, index) => (
                            <li key={index} className="ml-4">• {edu}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {importResult?.success && (
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ExternalLink className="w-4 h-4" />
                <span>Daten werden in das System übernommen</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Import bestätigen
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Token Manager Modal */}
        <ProfilerTokenManager
          isOpen={isTokenManagerOpen}
          onClose={() => setIsTokenManagerOpen(false)}
          onTokenSaved={handleTokenSaved}
          currentToken={currentToken || undefined}
        />
      </div>
    </AnimatePresence>
  );
}
