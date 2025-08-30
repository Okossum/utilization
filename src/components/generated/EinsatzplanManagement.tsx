import React, { useState } from 'react';
import { Building2, Download, Eye, Plus, AlertCircle } from 'lucide-react';
import EinsatzplanImportModal from './EinsatzplanImportModal';
import EinsatzplanVisualizationView from './EinsatzplanVisualizationView';
import { useEinsatzplanToken } from '../../hooks/useEinsatzplanToken';

const EinsatzplanManagement: React.FC = () => {
  const { token } = useEinsatzplanToken();
  const [activeView, setActiveView] = useState<'overview' | 'visualization'>('overview');
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<string | undefined>();

  const handleImportComplete = (result: any) => {
    setShowImportModal(false);
    if (result.firebaseDocId) {
      setSelectedImportId(result.firebaseDocId);
      setActiveView('visualization');
    }
  };

  const openVisualization = (importId?: string) => {
    if (importId) {
      setSelectedImportId(importId);
    }
    setActiveView('visualization');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="w-10 h-10 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Einsatzplan-Management
                </h1>
                <p className="text-gray-600 mt-1">
                  Import und Visualisierung von adesso Einsatzplan-Daten
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setActiveView('overview')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'overview'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Übersicht
              </button>
              <button
                onClick={() => setActiveView('visualization')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'visualization'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Eye className="w-4 h-4 inline mr-2" />
                Visualisierung
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Neuer Import</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeView === 'overview' && (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="text-center">
                <Building2 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Willkommen beim Einsatzplan-Management
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto mb-8">
                  Importieren Sie Daten aus der adesso Einsatzplan-API und visualisieren Sie 
                  Organisationsstrukturen, Line of Business Informationen und Mitarbeiter-Statistiken.
                </p>
                
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Ersten Import starten</span>
                  </button>
                  <button
                    onClick={() => setActiveView('visualization')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center space-x-2"
                  >
                    <Eye className="w-5 h-5" />
                    <span>Vorhandene Daten anzeigen</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Download className="w-8 h-8 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Datenimport
                  </h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Importieren Sie selektiv Daten aus der Einsatzplan-API für spezifische 
                  Line of Business Bereiche.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Client-Auswahl</li>
                  <li>• LoB-Filter</li>
                  <li>• Organisationsstruktur</li>
                  <li>• Mitarbeiter-Statistiken</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Eye className="w-8 h-8 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Visualisierung
                  </h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Analysieren und visualisieren Sie die importierten Daten in 
                  übersichtlichen Dashboards.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Import-Übersicht</li>
                  <li>• LoB-Analyse</li>
                  <li>• Organisationsstruktur</li>
                  <li>• Statistiken & Trends</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Building2 className="w-8 h-8 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Integration
                  </h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Nahtlose Integration mit der bestehenden Ressourcen-Utilization 
                  Plattform.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Firestore-Speicherung</li>
                  <li>• Historische Daten</li>
                  <li>• Export-Funktionen</li>
                  <li>• API-Zugriff</li>
                </ul>
              </div>
            </div>

            {/* API Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                API-Informationen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Verfügbare Endpoints</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <code>/api/einsatzplan/clients</code> - Client-Liste</li>
                    <li>• <code>/api/einsatzplan/lobs</code> - Line of Business</li>
                    <li>• <code>/api/einsatzplan/organization</code> - Organisationsstruktur</li>
                    <li>• <code>/api/einsatzplan/import-lob-data</code> - Datenimport</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Authentifizierung</h4>
                  <p className="text-sm text-blue-700">
                    Verwendet Bearer Token für die Authentifizierung mit der adesso Einsatzplan-API.
                    Token werden sicher übertragen und nicht gespeichert.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'visualization' && (
          <EinsatzplanVisualizationView
            importId={selectedImportId}
          />
        )}

        {/* Import Modal */}
        <EinsatzplanImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
        />
      </div>
    </div>
  );
};

export default EinsatzplanManagement;
