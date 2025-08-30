import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Calendar, 
  Filter, 
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, orderBy, query, limit as firestoreLimit, doc, getDoc } from 'firebase/firestore';

interface LoB {
  id: string;
  externalApiId: string;
  name: string;
  devOrCon: string;
  clientId: string;
  supervisor: string;
}

interface ImportData {
  id: string;
  clientId: string;
  selectedLobs: LoB[];
  importedData: {
    organization: any;
    filteredLobs: LoB[];
    employeeStatistics?: any;
  };
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
  createdAt: string;
}

interface EinsatzplanVisualizationViewProps {
  importId?: string;
}

const EinsatzplanVisualizationView: React.FC<EinsatzplanVisualizationViewProps> = ({
  importId
}) => {
  const [imports, setImports] = useState<ImportData[]>([]);
  const [selectedImport, setSelectedImport] = useState<ImportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'lobs' | 'organization' | 'statistics'>('overview');

  useEffect(() => {
    loadImports();
  }, []);

  useEffect(() => {
    if (importId && imports.length > 0) {
      const importData = imports.find(imp => imp.id === importId);
      if (importData) {
        setSelectedImport(importData);
      }
    }
  }, [importId, imports]);

  const loadImports = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Lade Import-Historie aus Firestore...');
      
      // Direkt aus Firestore lesen - kein Token erforderlich!
      const importsQuery = query(
        collection(db, 'einsatzplan_imports'),
        orderBy('createdAt', 'desc'),
        firestoreLimit(20)
      );
      
      const snapshot = await getDocs(importsQuery);
      const importsData: ImportData[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        importsData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
        } as ImportData);
      });

      console.log(`✅ ${importsData.length} Import(s) aus Firestore geladen`);
      setImports(importsData);

      // Automatisch neuesten Import auswählen falls keiner spezifiziert
      if (!importId && importsData.length > 0) {
        setSelectedImport(importsData[0]);
      }
      
      if (importsData.length === 0) {
        setError('Keine Import-Daten gefunden. Führen Sie zuerst einen Import durch.');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Imports:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Import-Historie');
    } finally {
      setLoading(false);
    }
  };

  const loadSpecificImport = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Lade spezifischen Import ${id} aus Firestore...`);
      
      // Direkt aus Firestore lesen - kein Token erforderlich!
      const docRef = doc(db, 'einsatzplan_imports', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Import nicht gefunden');
      }
      
      const data = docSnap.data();
      const importData: ImportData = {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
      } as ImportData;
      
      console.log(`✅ Import ${id} aus Firestore geladen`);
      setSelectedImport(importData);
    } catch (err) {
      console.error('Fehler beim Laden des spezifischen Imports:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden des Imports');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE');
  };

  const getStatusColor = (errors: any[]) => {
    if (errors.length === 0) return 'text-green-600 bg-green-100';
    return 'text-yellow-600 bg-yellow-100';
  };

  const getStatusIcon = (errors: any[]) => {
    if (errors.length === 0) return <CheckCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  if (loading && !selectedImport) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Lade Einsatzplan-Daten...</span>
      </div>
    );
  }

  if (error) {
    const isTokenError = error.includes('Token') || error.includes('401') || error.includes('Unauthorized');
    
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700 font-medium">
            {isTokenError ? 'Token-Problem' : 'Fehler beim Laden der Daten'}
          </span>
        </div>
        <p className="text-red-600 mt-2">{error}</p>
        {isTokenError && (
          <p className="text-red-600 mt-1 text-sm">
            Bitte gehen Sie zurück zur Übersicht und erneuern Sie das Token über den Import-Dialog.
          </p>
        )}
        <button
          onClick={loadImports}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Building2 className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Einsatzplan-Datenvisualisierung
            </h1>
            <p className="text-gray-600">
              Analyse und Visualisierung der importierten Einsatzplan-Daten
            </p>
          </div>
        </div>
        <button
          onClick={loadImports}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Aktualisieren</span>
        </button>
      </div>

      {/* Import Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Import auswählen</h2>
        <div className="grid gap-4">
          {imports.map((importData) => (
            <div
              key={importData.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedImport?.id === importData.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedImport(importData)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(importData.errors)}`}>
                      {getStatusIcon(importData.errors)}
                      <span>{importData.errors.length === 0 ? 'Erfolgreich' : 'Mit Warnungen'}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(importData.createdAt)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="font-medium text-gray-900">
                      {importData.statistics.totalLobs} LoB(s) importiert
                    </div>
                    <div className="text-sm text-gray-600">
                      {importData.statistics.totalRecords} Datensätze • 
                      {importData.statistics.successfulImports} erfolgreich • 
                      {importData.statistics.failedImports} fehlgeschlagen
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Client ID</div>
                  <div className="font-mono text-xs text-gray-700">
                    {importData.clientId.slice(-8)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visualization Content */}
      {selectedImport && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', label: 'Übersicht', icon: BarChart3 },
                  { id: 'lobs', label: 'Line of Business', icon: Building2 },
                  { id: 'organization', label: 'Organisation', icon: Users },
                  { id: 'statistics', label: 'Statistiken', icon: TrendingUp }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <div className="flex items-center">
                        <Building2 className="w-8 h-8 text-blue-600" />
                        <div className="ml-4">
                          <div className="text-2xl font-bold text-blue-900">
                            {selectedImport.statistics.totalLobs}
                          </div>
                          <div className="text-blue-700">LoB importiert</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 p-6 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                        <div className="ml-4">
                          <div className="text-2xl font-bold text-green-900">
                            {selectedImport.statistics.successfulImports}
                          </div>
                          <div className="text-green-700">Erfolgreich</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 p-6 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                        <div className="ml-4">
                          <div className="text-2xl font-bold text-red-900">
                            {selectedImport.statistics.failedImports}
                          </div>
                          <div className="text-red-700">Fehlgeschlagen</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 p-6 rounded-lg">
                      <div className="flex items-center">
                        <Activity className="w-8 h-8 text-purple-600" />
                        <div className="ml-4">
                          <div className="text-2xl font-bold text-purple-900">
                            {selectedImport.statistics.totalRecords}
                          </div>
                          <div className="text-purple-700">Datensätze</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Import-Details
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Client ID:</span>
                          <span className="font-mono text-sm">{selectedImport.clientId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Gestartet:</span>
                          <span>{formatDate(selectedImport.startedAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Abgeschlossen:</span>
                          <span>{formatDate(selectedImport.completedAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dauer:</span>
                          <span>
                            {Math.round((new Date(selectedImport.completedAt).getTime() - 
                                       new Date(selectedImport.startedAt).getTime()) / 1000)}s
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedImport.errors.length > 0 && (
                      <div className="bg-yellow-50 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold text-yellow-900 mb-4">
                          Warnungen & Fehler
                        </h3>
                        <div className="space-y-2">
                          {selectedImport.errors.map((error, index) => (
                            <div key={index} className="text-sm">
                              <div className="font-medium text-yellow-800">
                                {error.type}
                              </div>
                              <div className="text-yellow-700">{error.error}</div>
                              <div className="text-yellow-600 text-xs">
                                {formatDate(error.timestamp)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* LoB Tab */}
              {activeTab === 'lobs' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Importierte Line of Business ({selectedImport.importedData.filteredLobs?.length || 0})
                  </h3>
                  
                  <div className="grid gap-4">
                    {selectedImport.importedData.filteredLobs?.map((lob) => (
                      <div key={lob.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{lob.name}</h4>
                            <div className="mt-2 space-y-1 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Supervisor:</span> {lob.supervisor}
                              </div>
                              <div>
                                <span className="font-medium">External API ID:</span> {lob.externalApiId}
                              </div>
                              <div>
                                <span className="font-medium">Dev/Con:</span> {lob.devOrCon}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">LoB ID</div>
                            <div className="font-mono text-xs text-gray-700">
                              {lob.id.slice(-8)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-gray-500">
                        Keine LoB-Daten verfügbar
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Organization Tab */}
              {activeTab === 'organization' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Organisationsstruktur
                  </h3>
                  
                  {selectedImport.importedData.organization && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(selectedImport.importedData.organization).map(([key, value]) => {
                        if (key === 'clientId' || key === 'loadedAt' || !Array.isArray(value)) return null;
                        
                        return (
                          <div key={key} className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-3 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </h4>
                            <div className="text-2xl font-bold text-blue-600 mb-2">
                              {(value as any[]).length}
                            </div>
                            <div className="text-sm text-gray-600">
                              Einträge verfügbar
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Statistics Tab */}
              {activeTab === 'statistics' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Mitarbeiter-Statistiken
                  </h3>
                  
                  {selectedImport.importedData.employeeStatistics ? (
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <div className="text-center">
                        <PieChart className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          Statistiken verfügbar
                        </h4>
                        <p className="text-gray-600">
                          Mitarbeiter-Statistiken wurden erfolgreich importiert.
                        </p>
                        <div className="mt-4 text-sm text-gray-500">
                          Detaillierte Analyse wird in einer zukünftigen Version verfügbar sein.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <div>Keine Mitarbeiter-Statistiken verfügbar</div>
                      <div className="text-sm mt-2">
                        Aktivieren Sie die Option "Mitarbeiter-Statistiken einbeziehen" beim nächsten Import.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EinsatzplanVisualizationView;
