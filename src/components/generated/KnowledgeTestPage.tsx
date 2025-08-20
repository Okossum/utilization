import React, { useState, useEffect } from 'react';
import { KnowledgeUploadPanel } from './KnowledgeUploadPanel';
import KnowledgeService from '../../services/knowledge';
import { useAuth } from '../../contexts/AuthContext';

interface KnowledgeUploadedFile {
  name: string;
  data: any[];
  isValid: boolean;
  error?: string;
  preview?: string[][];
  debug?: string[];
  type: 'mitarbeiter' | 'branchen';
}

export function KnowledgeTestPage() {
  const { user, token } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<{
    mitarbeiter?: KnowledgeUploadedFile;
    branchen?: KnowledgeUploadedFile;
  }>({});
  
  // ✅ NEU: State für Datenbank-Daten
  const [databaseData, setDatabaseData] = useState<{
    mitarbeiter: any[];
    branchen: any[];
  }>({ mitarbeiter: [], branchen: [] });
  const [loading, setLoading] = useState(false);

  // ✅ NEU: Token Provider für KnowledgeService setzen
  useEffect(() => {
    if (user && token) {
      KnowledgeService.setAuthTokenProvider(async () => {
        try {
          console.log('🔑 Token für KnowledgeService gesetzt:', token.substring(0, 20) + '...');
          return token;
        } catch (error) {
          console.error('❌ Fehler beim Token-Abruf für KnowledgeService:', error);
          return null;
        }
      });
    }
  }, [user, token]);

  const handleFilesChange = (files: {
    mitarbeiter?: KnowledgeUploadedFile;
    branchen?: KnowledgeUploadedFile;
  }) => {
    setUploadedFiles(files);
    console.log('📁 Knowledge-Dateien aktualisiert:', files);
  };

  const handleDatabaseRefresh = async () => {
    console.log('🔄 Datenbank-Refresh angefordert');
    await loadDatabaseData();
  };

  // ✅ NEU: Datenbank-Daten laden
  const loadDatabaseData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('🔍 Lade Knowledge-Daten aus der Datenbank...');
      const result = await KnowledgeService.getAllKnowledge();
      setDatabaseData(result);
      console.log('✅ Knowledge-Daten erfolgreich geladen:', result);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Knowledge-Daten:', error);
      // Bei Fehlern verwenden wir leere Arrays
      setDatabaseData({ mitarbeiter: [], branchen: [] });
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEU: Datenbank-Daten beim ersten Laden abrufen
  useEffect(() => {
    if (user) {
      loadDatabaseData();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Knowledge Upload Test</h1>
          <p className="text-gray-600">
            Testen Sie die neue Knowledge-Upload-Funktionalität für Mitarbeiter Knowledge und Branchen Know-How
          </p>
        </div>

        {/* Knowledge Upload Panel */}
        <KnowledgeUploadPanel
          uploadedFiles={uploadedFiles}
          onFilesChange={handleFilesChange}
          onDatabaseRefresh={handleDatabaseRefresh}
        />

        {/* Status Übersicht */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Status - Unabhängige Verarbeitung</h2>
          <p className="text-gray-600 mb-4">
            Jeder Knowledge-Typ wird unabhängig verarbeitet. Sie können Mitarbeiter Knowledge und Branchen Know-How 
            zu verschiedenen Zeitpunkten hochladen.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Mitarbeiter Knowledge Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                Mitarbeiter Knowledge
              </h3>
              {uploadedFiles.mitarbeiter ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <strong>Datei:</strong> {uploadedFiles.mitarbeiter.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Status:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      uploadedFiles.mitarbeiter.isValid 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {uploadedFiles.mitarbeiter.isValid ? 'Gültig' : 'Fehler'}
                    </span>
                  </p>
                  {uploadedFiles.mitarbeiter.isValid && (
                    <p className="text-sm text-gray-600">
                      <strong>Einträge:</strong> {uploadedFiles.mitarbeiter.data.length}
                    </p>
                  )}
                  {uploadedFiles.mitarbeiter.error && (
                    <p className="text-sm text-red-600">
                      <strong>Fehler:</strong> {uploadedFiles.mitarbeiter.error}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Keine Datei hochgeladen</p>
              )}
            </div>

            {/* Branchen Know-How Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Branchen Know-How
              </h3>
              {uploadedFiles.branchen ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <strong>Datei:</strong> {uploadedFiles.branchen.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Status:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      uploadedFiles.branchen.isValid 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {uploadedFiles.branchen.isValid ? 'Gültig' : 'Fehler'}
                    </span>
                  </p>
                  {uploadedFiles.branchen.isValid && (
                    <p className="text-sm text-gray-600">
                      <strong>Einträge:</strong> {uploadedFiles.branchen.data.length}
                    </p>
                  )}
                  {uploadedFiles.branchen.error && (
                    <p className="text-sm text-red-600">
                      <strong>Fehler:</strong> {uploadedFiles.branchen.error}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Keine Datei hochgeladen</p>
              )}
            </div>
          </div>
        </div>

        {/* Beispiel Excel-Format */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Erwartetes Excel-Format</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Mitarbeiter Knowledge Format */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Mitarbeiter Knowledge</h3>
              <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-700">A</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">B</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium text-gray-900">Kategorie</td>
                      <td className="py-2 px-3 font-medium text-gray-900">Knowledge</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-700">Java Development</td>
                      <td className="py-2 px-3 text-gray-700">Spring Boot, JPA, Maven</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-700">Cloud Computing</td>
                      <td className="py-2 px-3 text-gray-700">AWS, Docker, Kubernetes</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-gray-700">Agile Methods</td>
                      <td className="py-2 px-3 text-gray-700">Scrum, Kanban, Jira</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Branchen Know-How Format */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Branchen Know-How</h3>
              <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-700">A</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">B</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium text-gray-900">Kategorie</td>
                      <td className="py-2 px-3 font-medium text-gray-900">Know-How</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-700">Automotive</td>
                      <td className="py-2 px-3 text-gray-700">CAN-Bus, OBD, Diagnose</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-700">Banking</td>
                      <td className="py-2 px-3 text-gray-700">SEPA, SWIFT, Compliance</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-gray-700">Healthcare</td>
                      <td className="py-2 px-3 text-gray-700">HL7, DICOM, HIPAA</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ NEU: Datenbank-Übersicht */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Datenbank-Übersicht - Separate Collections</h2>
              <p className="text-gray-600 text-sm">
                Jeder Knowledge-Typ wird in separaten Firestore-Collections gespeichert
              </p>
            </div>
            <button
              onClick={loadDatabaseData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Lade...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Aktualisieren
                </>
              )}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Mitarbeiter Knowledge in Datenbank */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                Mitarbeiter Knowledge (DB)
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Einträge:</strong> {databaseData.mitarbeiter.length}
                </p>
                {databaseData.mitarbeiter.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Beispiele:</p>
                    <div className="space-y-1">
                      {databaseData.mitarbeiter.slice(0, 3).map((item, index) => (
                        <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                          <span className="font-medium">{item.kategorie}:</span> {item.knowledge}
                        </div>
                      ))}
                      {databaseData.mitarbeiter.length > 3 && (
                        <p className="text-xs text-gray-500 text-center">
                          +{databaseData.mitarbeiter.length - 3} weitere
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Branchen Know-How in Datenbank */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Branchen Know-How (DB)
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Einträge:</strong> {databaseData.branchen.length}
                </p>
                {databaseData.branchen.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Beispiele:</p>
                    <div className="space-y-1">
                      {databaseData.branchen.slice(0, 3).map((item, index) => (
                        <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                          <span className="font-medium">{item.kategorie}:</span> {item.knowHow}
                        </div>
                      ))}
                      {databaseData.branchen.length > 3 && (
                        <p className="text-xs text-gray-500 text-center">
                          +{databaseData.branchen.length - 3} weitere
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
