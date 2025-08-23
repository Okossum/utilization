import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, RefreshCw, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { consolidateAllData, validateConsolidatedData } from '../../lib/consolidation';
import { useAuth } from '../../contexts/AuthContext';

export function ConsolidationAdminPanel() {
  const { user } = useAuth();
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [consolidationResult, setConsolidationResult] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any | null>(null);

  const handleConsolidateAll = async () => {
    setIsConsolidating(true);
    setConsolidationResult(null);
    
    try {
      await consolidateAllData();
      setConsolidationResult('success');
    } catch (error: any) {
      // console.error entfernt
      setConsolidationResult(error?.message || 'Unbekannter Fehler');
    } finally {
      setIsConsolidating(false);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResult(null);
    
    try {
      const result = await validateConsolidatedData();
      setValidationResult(result);
    } catch (error: any) {
      // console.error entfernt
      setValidationResult({ error: error?.message || 'Unbekannter Fehler' });
    } finally {
      setIsValidating(false);
    }
  };

  // Nur für authentifizierte User anzeigen
  if (!user) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Database className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Datenkonsolidierung</h3>
          <p className="text-sm text-gray-600">Verwalte die konsolidierte utilizationData Collection</p>
        </div>
      </div>

      {/* Konsolidierung */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Vollkonsolidierung</h4>
            <p className="text-sm text-gray-600">
              Konsolidiert alle Daten aus mitarbeiter, auslastung und einsatzplan Collections
            </p>
          </div>
          <button
            onClick={handleConsolidateAll}
            disabled={isConsolidating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConsolidating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isConsolidating ? 'Konsolidiert...' : 'Konsolidierung starten'}
          </button>
        </div>

        {/* Konsolidierungs-Ergebnis */}
        {consolidationResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-lg border ${
              consolidationResult === 'success' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {consolidationResult === 'success' ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm ${
                consolidationResult === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {consolidationResult === 'success' 
                  ? 'Konsolidierung erfolgreich abgeschlossen' 
                  : `Fehler: ${consolidationResult}`
                }
              </span>
            </div>
          </motion.div>
        )}
      </div>

      <hr className="border-gray-200" />

      {/* Validierung */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Datenqualität prüfen</h4>
            <p className="text-sm text-gray-600">
              Analysiert die Vollständigkeit der konsolidierten Daten
            </p>
          </div>
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <BarChart3 className="w-4 h-4" />
            )}
            {isValidating ? 'Validiert...' : 'Validierung starten'}
          </button>
        </div>

        {/* Validierungs-Ergebnis */}
        {validationResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            {validationResult.error ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Fehler: {validationResult.error}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Validierung erfolgreich</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Gesamt Datensätze:</span>
                    <span className="ml-2 text-gray-900">{validationResult.totalRecords}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Vollständige Datensätze:</span>
                    <span className="ml-2 text-gray-900">{validationResult.completenessStats.hasAllThree}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Mit Mitarbeiter-Daten:</span>
                    <span className="ml-2 text-gray-900">{validationResult.completenessStats.hasMitarbeiter}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Mit Auslastungs-Daten:</span>
                    <span className="ml-2 text-gray-900">{validationResult.completenessStats.hasAuslastung}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Mit Einsatzplan-Daten:</span>
                    <span className="ml-2 text-gray-900">{validationResult.completenessStats.hasEinsatzplan}</span>
                  </div>
                </div>

                {validationResult.sampleData && validationResult.sampleData.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Beispiel-Datensätze:</h5>
                    <div className="space-y-1">
                      {validationResult.sampleData.slice(0, 3).map((sample: any, index: number) => (
                        <div key={index} className="text-xs text-gray-600 bg-white p-2 rounded border">
                          <span className="font-medium">{sample.person}</span>
                          <span className="ml-2 text-gray-500">
                            ({sample.cc}) - {sample.team}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Hinweise:</p>
            <ul className="space-y-1 text-xs">
              <li>• Die Konsolidierung läuft automatisch nach jedem Excel-Upload</li>
              <li>• Manuelle Konsolidierung ist nur bei Problemen oder Dateninkonsistenzen nötig</li>
              <li>• Die Validierung zeigt die Qualität der konsolidierten Daten</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
