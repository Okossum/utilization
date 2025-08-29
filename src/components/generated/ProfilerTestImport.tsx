import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface MasterDataInfo {
  skillsLoaded: number;
  trainingsLoaded: number;
  projectRolesLoaded: number;
}

interface Statistics {
  totalDataSize: number;
  hasUser: boolean;
  hasBiography: boolean;
  projectsCount: number;
  skillsCount: number;
  resolvedSkillsInProjects: number;
  resolvedGeneralSkills: number;
  resolvedTrainings: number;
}

interface TestResponse {
  success: boolean;
  message: string;
  employeeId?: string;
  collection?: string;
  masterDataInfo?: MasterDataInfo;
  statistics?: Statistics;
  previewData?: any;
  importedData?: any;
  error?: string;
  details?: string;
}

export default function ProfilerTestImport() {
  const [profileUrl, setProfileUrl] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<TestResponse | null>(null);
  const [importResult, setImportResult] = useState<TestResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'import'>('preview');

  const handleTestPreview = async () => {
    if (!profileUrl || !employeeId || !authToken) {
      alert('Bitte alle Felder ausfüllen');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/profiler/test-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileUrl,
          employeeId,
          authToken
        }),
      });

      const result = await response.json();
      setPreviewResult(result);
      setActiveTab('preview');
    } catch (error) {
      console.error('Preview-Fehler:', error);
      setPreviewResult({
        success: false,
        message: 'Fehler beim Preview',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestImport = async () => {
    if (!profileUrl || !employeeId || !authToken) {
      alert('Bitte alle Felder ausfüllen');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/profiler/test-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileUrl,
          employeeId,
          authToken
        }),
      });

      const result = await response.json();
      setImportResult(result);
      setActiveTab('import');
    } catch (error) {
      console.error('Import-Fehler:', error);
      setImportResult({
        success: false,
        message: 'Fehler beim Import',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderMasterDataInfo = (info: MasterDataInfo) => (
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{info.skillsLoaded}</div>
        <div className="text-sm text-gray-600">Skills geladen</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{info.trainingsLoaded}</div>
        <div className="text-sm text-gray-600">Trainings geladen</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-600">{info.projectRolesLoaded}</div>
        <div className="text-sm text-gray-600">Rollen geladen</div>
      </div>
    </div>
  );

  const renderStatistics = (stats: Statistics) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="font-semibold mb-2">Basis-Daten</h4>
        <div className="space-y-1 text-sm">
          <div>Projekte: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{stats.projectsCount}</span></div>
          <div>Skills: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{stats.skillsCount}</span></div>
          <div>Biografie: <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stats.hasBiography ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {stats.hasBiography ? "Ja" : "Nein"}
          </span></div>
        </div>
      </div>
      <div>
        <h4 className="font-semibold mb-2">Aufgelöste Referenzen</h4>
        <div className="space-y-1 text-sm">
          <div>Skills in Projekten: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{stats.resolvedSkillsInProjects}</span></div>
          <div>Allgemeine Skills: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{stats.resolvedGeneralSkills}</span></div>
          <div>Trainings: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{stats.resolvedTrainings}</span></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            🧪 Profiler Test-Import mit Master-Daten-Auflösung
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="profileUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Profiler-URL
              </label>
              <input
                id="profileUrl"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://profiler.adesso-group.com/api/profiles/2002123847/full-profile"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID
              </label>
              <input
                id="employeeId"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="2002123847"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="authToken" className="block text-sm font-medium text-gray-700 mb-1">
                Bearer Token
              </label>
              <textarea
                id="authToken"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleTestPreview} 
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Lädt...' : '🔍 Test-Preview'}
            </button>
            
            <button 
              onClick={handleTestImport} 
              disabled={isLoading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Lädt...' : '💾 Test-Import'}
            </button>
          </div>
        </div>
      </div>

      {(previewResult || importResult) && (
        <div className="w-full">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('preview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'preview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Preview-Ergebnis
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'import'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Import-Ergebnis
              </button>
            </nav>
          </div>
          
          {activeTab === 'preview' && previewResult && (
            <div className="mt-4 space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {previewResult.success ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                    Test-Preview Ergebnis
                  </h3>
                </div>
                <div className="p-6">
                  {previewResult.success ? (
                    <div className="space-y-6">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                          <span className="text-green-800">{previewResult.message}</span>
                        </div>
                      </div>

                      {previewResult.masterDataInfo && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Master-Daten geladen</h3>
                          {renderMasterDataInfo(previewResult.masterDataInfo)}
                        </div>
                      )}

                      {previewResult.statistics && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Statistiken</h3>
                          {renderStatistics(previewResult.statistics)}
                        </div>
                      )}

                      {previewResult.previewData && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Preview-Daten (Auszug)</h3>
                          <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-auto">
                            <pre className="text-xs">
                              {JSON.stringify(previewResult.previewData, null, 2).substring(0, 2000)}
                              {JSON.stringify(previewResult.previewData, null, 2).length > 2000 && '\n... (gekürzt)'}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <XCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
                        <div>
                          <div className="text-red-800 font-medium">Fehler: {previewResult.error || previewResult.message}</div>
                          {previewResult.details && (
                            <div className="mt-2 text-sm text-red-700">
                              <strong>Details:</strong> {previewResult.details}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'import' && importResult && (
            <div className="mt-4 space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {importResult.success ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                    Test-Import Ergebnis
                  </h3>
                </div>
                <div className="p-6">
                  {importResult.success ? (
                    <div className="space-y-6">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                          <div>
                            <span className="text-green-800">{importResult.message}</span>
                            {importResult.collection && (
                              <div className="mt-2">
                                <strong>Collection:</strong> <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{importResult.collection}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {importResult.masterDataInfo && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Master-Daten geladen</h3>
                          {renderMasterDataInfo(importResult.masterDataInfo)}
                        </div>
                      )}

                      {importResult.importedData && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Importierte Daten</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold mb-2">Datenmengen</h4>
                              <div className="space-y-1 text-sm">
                                <div>Projekte: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{importResult.importedData.projectsCount}</span></div>
                                <div>Skills: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{importResult.importedData.skillsCount}</span></div>
                                <div>Zertifikate: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{importResult.importedData.certificationsCount}</span></div>
                                <div>Sprachen: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{importResult.importedData.languageRatingsCount}</span></div>
                                <div>Trainings: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{importResult.importedData.trainingParticipationsCount}</span></div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Aufgelöste Referenzen</h4>
                              <div className="space-y-1 text-sm">
                                <div>Skills in Projekten: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{importResult.importedData.resolvedSkillsInProjects}</span></div>
                                <div>Allgemeine Skills: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{importResult.importedData.resolvedGeneralSkills}</span></div>
                                <div>Trainings: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{importResult.importedData.resolvedTrainings}</span></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <XCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
                        <div>
                          <div className="text-red-800 font-medium">Fehler: {importResult.error || importResult.message}</div>
                          {importResult.details && (
                            <div className="mt-2 text-sm text-red-700">
                              <strong>Details:</strong> {importResult.details}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}