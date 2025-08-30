import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, CheckCircle, AlertCircle, Loader2, Eye, Calendar, Building2, Key, Clock } from 'lucide-react';
import { EinsatzplanTokenManager } from './EinsatzplanTokenManager';
import { useEinsatzplanToken } from '../../hooks/useEinsatzplanToken';

interface LoB {
  id: string;
  externalApiId: string;
  name: string;
  devOrCon: string;
  clientId: string;
  supervisor: string;
}

interface Client {
  id: string;
  externalApiId: string;
  name: string;
}

interface ImportOptions {
  includeStatistics: boolean;
  includeEmployeeData: boolean;
  startDate: string;
  amountCW: number;
}

interface ImportResult {
  clientId: string;
  selectedLobs: LoB[];
  importedData: any;
  statistics: {
    totalLobs: number;
    successfulImports: number;
    failedImports: number;
    totalRecords: number;
  };
  startedAt: string;
  completedAt: string;
  errors: Array<{
    type: string;
    error: string;
    timestamp: string;
  }>;
  firebaseDocId?: string;
}

interface EinsatzplanImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (result: ImportResult) => void;
}

const EinsatzplanImportModal: React.FC<EinsatzplanImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const { token, tokenInfo, saveToken, hasToken, isTokenValid, getTimeRemaining } = useEinsatzplanToken();
  const [step, setStep] = useState<'token' | 'lobs' | 'options' | 'importing' | 'results'>('token');
  const [showTokenManager, setShowTokenManager] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>({ 
    id: '642d98b1374b7f7fba41adcc', 
    externalApiId: 'adesso-se', 
    name: 'adesso SE' 
  });
  const [lobs, setLobs] = useState<LoB[]>([]);
  const [selectedLobs, setSelectedLobs] = useState<LoB[]>([]);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    includeStatistics: true, // ✅ Standardmäßig aktiviert für vollständige Mitarbeiter-Daten
    includeEmployeeData: true, // ✅ Neue Option für vollständige Mitarbeiter-Daten
    startDate: '2025-01-01',
    amountCW: 52
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // ESC-Taste zum Schließen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // LoB-Daten laden (muss vor useEffect definiert werden)
  const loadLobs = useCallback(async (clientId: string) => {
    // Verhindere mehrfache gleichzeitige Aufrufe
    if (loading) return;
    
    // Prüfe ob Token vorhanden ist
    if (!token) {
      setError('Kein gültiges Token verfügbar. Bitte Token eingeben.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/einsatzplan/lobs?clientId=${clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const lobsData = await response.json();
      setLobs(lobsData);
      setStep('lobs');
    } catch (err) {
      console.error('Fehler beim Laden der LoB-Daten:', err);
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden der LoB-Daten';
      
      // Spezifische Behandlung für häufige Fehler
      if (errorMessage.includes('500')) {
        setError('Server-Fehler: Die Einsatzplan-API ist momentan nicht erreichbar. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Administrator.');
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError('Token ungültig: Bitte erneuern Sie Ihr Bearer Token.');
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        setError('Netzwerk-Fehler: Bitte prüfen Sie Ihre Internetverbindung.');
      } else {
        setError(`Fehler beim Laden der LoB-Daten: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, token]);

  // Schritt-Management basierend auf Token-Status
  useEffect(() => {
    if (!isOpen) return;
    
    const tokenValid = isTokenValid();
    if (hasToken && tokenValid) {
      if (step !== 'lobs' && step !== 'options' && step !== 'importing' && step !== 'complete') {
        setStep('lobs');
        // LoB-Daten nur laden wenn noch nicht vorhanden
        if (selectedClient && lobs.length === 0) {
          loadLobs(selectedClient.id);
        }
      }
    } else {
      setStep('token');
    }
  }, [isOpen, hasToken, selectedClient, lobs.length, step, loadLobs, isTokenValid]);

  // Automatisch LOB AUTOMOTIVE&TRANSPORTATION (AT) auswählen
  useEffect(() => {
    if (lobs.length > 0 && selectedLobs.length === 0) {
      const automotiveLob = lobs.find(lob => 
        lob.name.includes('AUTOMOTIVE') || lob.name.includes('TRANSPORTATION')
      );
      if (automotiveLob) {
        setSelectedLobs([automotiveLob]);
      }
    }
  }, [lobs, selectedLobs.length]);

  const loadClients = async () => {
    if (!token) {
      setError('Kein gültiges Token verfügbar. Bitte Token eingeben.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/einsatzplan/clients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const clientsData = await response.json();
      setClients(clientsData);
      
      // Automatisch adesso SE auswählen falls verfügbar
      const adessoSE = clientsData.find((c: Client) => c.name === 'adesso SE');
      if (adessoSE) {
        setSelectedClient(adessoSE);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Clients:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Clients');
    } finally {
      setLoading(false);
    }
  };

  const toggleLobSelection = (lob: LoB) => {
    setSelectedLobs(prev => {
      const isSelected = prev.some(l => l.id === lob.id);
      if (isSelected) {
        return prev.filter(l => l.id !== lob.id);
      } else {
        return [...prev, lob];
      }
    });
  };

  const selectAllLobs = () => {
    setSelectedLobs(lobs);
  };

  const clearSelection = () => {
    setSelectedLobs([]);
  };

  const startImport = async () => {
    if (!selectedClient || selectedLobs.length === 0) {
      setError('Bitte wählen Sie mindestens eine LoB aus');
      return;
    }
    
    if (!token) {
      setError('Kein gültiges Token verfügbar. Bitte Token eingeben.');
      return;
    }

    setStep('importing');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/einsatzplan/import-lob-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selectedLobs,
          clientId: selectedClient.id,
          importOptions
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setImportResult(result);
      setStep('results');
      
      if (onImportComplete) {
        onImportComplete(result);
      }
    } catch (err) {
      console.error('Fehler beim Import:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Import');
      setStep('options');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    if (hasToken && isTokenValid()) {
      setStep('lobs');
    } else {
      setStep('token');
    }
    // Client bleibt fest eingestellt
    setLobs([]);
    setSelectedLobs([]);
    setImportResult(null);
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        // Schließe Dialog nur wenn auf das Overlay geklickt wird
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Verhindere Schließen beim Klick auf den Dialog
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Einsatzplan-Datenimport
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* Token Status */}
          {hasToken && tokenInfo && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Key className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">Token aktiv</span>
                  <span className="text-sm text-green-700">({tokenInfo.userName})</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 text-sm text-green-700">
                    <Clock className="w-4 h-4" />
                    <span>{getTimeRemaining()}</span>
                  </div>
                  <button
                    onClick={() => setShowTokenManager(true)}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Token ändern
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info über ausgewählten Client */}
          {step !== 'token' && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Client: {selectedClient?.name}</span>
              </div>
            </div>
          )}

          {/* Step 0: Token Setup */}
          {step === 'token' && (
            <div className="text-center py-8">
              <Key className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Bearer Token erforderlich
              </h3>
              <p className="text-gray-600 mb-6">
                Für den Zugriff auf die Einsatzplan-API benötigen Sie einen gültigen Bearer Token.
              </p>
              <button
                onClick={() => setShowTokenManager(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Token eingeben
              </button>
            </div>
          )}

          {/* Step 1: LoB Selection */}
          {step === 'lobs' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  1. Line of Business auswählen
                </h3>
                <div className="text-sm text-gray-500">
                  {selectedLobs.length} von {lobs.length} ausgewählt
                </div>
              </div>

              <div className="flex space-x-2 mb-4">
                <button
                  onClick={selectAllLobs}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Alle auswählen
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Auswahl löschen
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Lade LoB-Daten...</span>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-700 font-medium">Fehler beim Laden der LoB-Daten</span>
                  </div>
                  <p className="text-red-600 text-sm mb-4">{error}</p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setError(null);
                        if (selectedClient) {
                          loadLobs(selectedClient.id);
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      Erneut versuchen
                    </button>
                    <button
                      onClick={() => {
                        setError(null);
                        setStep('options');
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                    >
                      Ohne LoB-Daten fortfahren
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {lobs.map((lob) => (
                    <div
                      key={lob.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedLobs.some(l => l.id === lob.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleLobSelection(lob)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{lob.name}</div>
                          <div className="text-sm text-gray-500">
                            Supervisor: {lob.supervisor} | ID: {lob.externalApiId}
                          </div>
                        </div>
                        {selectedLobs.some(l => l.id === lob.id) && (
                          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep('clients')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Zurück
                </button>
                <button
                  onClick={() => setStep('options')}
                  disabled={selectedLobs.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Import Options */}
          {step === 'options' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                2. Import-Optionen
              </h3>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="includeStatistics"
                    checked={importOptions.includeStatistics}
                    onChange={(e) => setImportOptions(prev => ({
                      ...prev,
                      includeStatistics: e.target.checked
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="includeStatistics" className="text-gray-700">
                    Mitarbeiter-Statistiken einbeziehen
                  </label>
                </div>

                {importOptions.includeStatistics && (
                  <div className="ml-7 space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Startdatum
                      </label>
                      <input
                        type="date"
                        value={importOptions.startDate}
                        onChange={(e) => setImportOptions(prev => ({
                          ...prev,
                          startDate: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Anzahl Kalenderwochen
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="104"
                        value={importOptions.amountCW}
                        onChange={(e) => setImportOptions(prev => ({
                          ...prev,
                          amountCW: parseInt(e.target.value) || 52
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Import-Zusammenfassung</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>Client: {selectedClient?.name}</div>
                  <div>Ausgewählte LoB: {selectedLobs.length}</div>
                  <div>Statistiken: {importOptions.includeStatistics ? 'Ja' : 'Nein'}</div>
                  {importOptions.includeStatistics && (
                    <div>Zeitraum: {importOptions.startDate} ({importOptions.amountCW} Wochen)</div>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep('lobs')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Zurück
                </button>
                <button
                  onClick={startImport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Import starten</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Import läuft...
              </h3>
              <p className="text-gray-600">
                Die Daten werden von der Einsatzplan-API importiert. Dies kann einen Moment dauern.
              </p>
            </div>
          )}

          {/* Step 5: Results */}
          {step === 'results' && importResult && (
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Import erfolgreich abgeschlossen
                  </h3>
                  <p className="text-gray-600">
                    Die Daten wurden erfolgreich importiert und gespeichert.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {importResult.statistics.totalLobs}
                  </div>
                  <div className="text-sm text-blue-800">LoB importiert</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {importResult.statistics.successfulImports}
                  </div>
                  <div className="text-sm text-green-800">Erfolgreich</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {importResult.statistics.failedImports}
                  </div>
                  <div className="text-sm text-red-800">Fehlgeschlagen</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {importResult.statistics.totalRecords}
                  </div>
                  <div className="text-sm text-purple-800">Datensätze</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">Warnungen:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {importResult.errors.map((error, index) => (
                      <li key={index}>• {error.type}: {error.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={resetModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Neuer Import
                </button>
                <div className="space-x-2">
                  <button
                    onClick={() => {
                      // TODO: Implementiere Visualisierung
                      console.log('Visualisierung öffnen für:', importResult.firebaseDocId);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Visualisierung öffnen</span>
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Token Manager Modal */}
      <EinsatzplanTokenManager
        isOpen={showTokenManager}
        onClose={() => setShowTokenManager(false)}
        onTokenSaved={(newToken) => {
          saveToken(newToken);
          setShowTokenManager(false);
          // Nach Token-Speicherung zu LoB-Auswahl wechseln (nur wenn noch keine Daten vorhanden)
          if (selectedClient && lobs.length === 0) {
            loadLobs(selectedClient.id);
          }
        }}
        currentToken={token || ''}
      />
    </div>
  );
};

export default EinsatzplanImportModal;
