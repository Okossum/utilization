import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Database, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Mail, 
  MapPin, 
  Calendar, 
  Briefcase, 
  Building, 
  Award, 
  BookOpen, 
  Code,
  User,
  Globe,
  Users,
  Download,
  RefreshCw,
  Eye,
  Key,
  Link2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Komponente für detaillierte Datenvorschau
function ProfileDataPreview({ data }: { data: any }) {
  if (!data) return <div className="text-gray-500 text-sm">Keine Daten verfügbar</div>;

  return (
    <div className="space-y-3 text-sm">
      {/* Persönliche Daten */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <User className="w-3 h-3" />
            <span className="font-medium">Name:</span>
          </div>
          <div className="text-gray-900">{data.name || 'Nicht verfügbar'}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <Mail className="w-3 h-3" />
            <span className="font-medium">E-Mail:</span>
          </div>
          <div className="text-gray-900">{data.email || 'Nicht verfügbar'}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <Briefcase className="w-3 h-3" />
            <span className="font-medium">Position:</span>
          </div>
          <div className="text-gray-900">{data.position || 'Nicht verfügbar'}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <Building className="w-3 h-3" />
            <span className="font-medium">Abteilung:</span>
          </div>
          <div className="text-gray-900">{data.department || 'Nicht verfügbar'}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <MapPin className="w-3 h-3" />
            <span className="font-medium">Standort:</span>
          </div>
          <div className="text-gray-900">{data.location || 'Nicht verfügbar'}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <Calendar className="w-3 h-3" />
            <span className="font-medium">Startdatum:</span>
          </div>
          <div className="text-gray-900">{data.startDate || 'Nicht verfügbar'}</div>
        </div>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-200">
        <div className="text-center p-2 bg-blue-50 rounded">
          <div className="text-lg font-semibold text-blue-600">{data.skills?.length || 0}</div>
          <div className="text-xs text-blue-600">Skills</div>
        </div>
        <div className="text-center p-2 bg-green-50 rounded">
          <div className="text-lg font-semibold text-green-600">{data.projects?.length || 0}</div>
          <div className="text-xs text-green-600">Projekte</div>
        </div>
        <div className="text-center p-2 bg-purple-50 rounded">
          <div className="text-lg font-semibold text-purple-600">{data.certifications?.length || 0}</div>
          <div className="text-xs text-purple-600">Zertifikate</div>
        </div>
        <div className="text-center p-2 bg-orange-50 rounded">
          <div className="text-lg font-semibold text-orange-600">{data.languages?.length || 0}</div>
          <div className="text-xs text-orange-600">Sprachen</div>
        </div>
      </div>

      {/* Top Skills */}
      {data.skills && data.skills.length > 0 && (
        <div>
          <div className="flex items-center gap-1 text-gray-600 mb-2">
            <Code className="w-3 h-3" />
            <span className="font-medium">Top Skills:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {data.skills.slice(0, 5).map((skill: any, index: number) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                {skill.name} {skill.level ? `(${skill.level})` : ''}
              </span>
            ))}
            {data.skills.length > 5 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                +{data.skills.length - 5} weitere
              </span>
            )}
          </div>
        </div>
      )}

      {/* Recent Projects */}
      {data.projects && data.projects.length > 0 && (
        <div>
          <div className="flex items-center gap-1 text-gray-600 mb-2">
            <Briefcase className="w-3 h-3" />
            <span className="font-medium">Aktuelle Projekte:</span>
          </div>
          <div className="space-y-1">
            {data.projects.slice(0, 2).map((project: any, index: number) => (
              <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                <div className="font-medium">{project.name}</div>
                <div className="text-gray-600">{project.customer} • {project.role}</div>
              </div>
            ))}
            {data.projects.length > 2 && (
              <div className="text-xs text-gray-500">+{data.projects.length - 2} weitere Projekte</div>
            )}
          </div>
        </div>
      )}

      {/* Certifications */}
      {data.certifications && data.certifications.length > 0 && (
        <div>
          <div className="flex items-center gap-1 text-gray-600 mb-2">
            <Award className="w-3 h-3" />
            <span className="font-medium">Zertifizierungen:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {data.certifications.slice(0, 3).map((cert: any, index: number) => (
              <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                {cert.name || cert}
              </span>
            ))}
            {data.certifications.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                +{data.certifications.length - 3} weitere
              </span>
            )}
          </div>
        </div>
      )}

      {/* Languages */}
      {data.languages && data.languages.length > 0 && (
        <div>
          <div className="flex items-center gap-1 text-gray-600 mb-2">
            <Globe className="w-3 h-3" />
            <span className="font-medium">Sprachen:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {data.languages.map((lang: any, index: number) => (
              <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                {lang.name || lang} {lang.level ? `(${lang.level})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
import { useUtilizationData } from '../../contexts/UtilizationDataContext';

interface ProfilerManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EmployeeProfilerData {
  employeeId: string;
  employeeName: string;
  profilerUrl: string;
  status: 'pending' | 'importing' | 'success' | 'error';
  error?: string;
  lastImported?: string;
}

interface ImportProgress {
  total: number;
  completed: number;
  current?: string;
  isRunning: boolean;
}

export function ProfilerManagementModal({ isOpen, onClose }: ProfilerManagementModalProps) {
  const { token } = useAuth();
  const { databaseData } = useUtilizationData();
  
  // State Management
  const [profilerCookies, setProfilerCookies] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [employees, setEmployees] = useState<EmployeeProfilerData[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    total: 0,
    completed: 0,
    isRunning: false
  });
  const [showPreview, setShowPreview] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [useTokenAuth, setUseTokenAuth] = useState(true);

  // Lade Mitarbeiter mit Profiler-URLs
  const loadEmployeesWithProfilerUrls = async () => {
    if (!databaseData?.utilizationData) return;
    
    setIsLoadingEmployees(true);
    try {
      const employeesWithUrls = databaseData.utilizationData
        .filter(emp => emp.linkZumProfilUrl && emp.linkZumProfilUrl.trim() !== '')
        .map(emp => ({
          employeeId: emp.id,
          employeeName: emp.person,
          profilerUrl: emp.linkZumProfilUrl,
          status: 'pending' as const
        }));
      
      setEmployees(employeesWithUrls);
      setImportProgress({
        total: employeesWithUrls.length,
        completed: 0,
        isRunning: false
      });
      
      console.log(`📊 Profiler Management: ${employeesWithUrls.length} Mitarbeiter mit Profiler-URLs gefunden`);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Mitarbeiter:', error);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  // Lade Mitarbeiter beim Öffnen des Modals
  useEffect(() => {
    if (isOpen && databaseData?.utilizationData) {
      loadEmployeesWithProfilerUrls();
    }
  }, [isOpen, databaseData]);

  // State für Preview-Test
  const [isTestingPreview, setIsTestingPreview] = useState(false);
  const [previewResults, setPreviewResults] = useState<any[]>([]);

  // Echter Preview-Test mit API-Calls
  const handleShowPreview = async () => {
    if (useTokenAuth) {
      if (!authToken.trim()) {
        alert('Bitte geben Sie einen Token ein.');
        return;
      }
    } else {
      if (!profilerCookies.trim()) {
        alert('Bitte geben Sie zuerst die Profiler-Cookies ein.');
        return;
      }
    }

    setIsTestingPreview(true);
    setPreviewResults([]);
    
    try {
      // Lade erst die Mitarbeiter mit URLs
      await loadEmployeesWithProfilerUrls();
      
      // Teste die ersten 2 Mitarbeiter mit vollständiger Daten-Preview
      const testEmployees = employees.slice(0, 2);
      const testResults: any[] = [];
      
      console.log(`🧪 Lade vollständige Preview-Daten für ${testEmployees.length} Mitarbeiter...`);
      
      for (const employee of testEmployees) {
        try {
          console.log(`🔍 Lade Preview-Daten für ${employee.employeeName}...`);
          
          const requestBody: any = {
            profileUrl: employee.profilerUrl,
            employeeId: employee.employeeId
          };

          // Füge Authentifizierung hinzu
          if (useTokenAuth) {
            requestBody.authToken = authToken;
          } else {
            requestBody.profilerCookies = profilerCookies;
          }

          const response = await fetch('http://localhost:3001/api/profiler/preview', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
          });

          const result = await response.json();
          
          if (response.ok && result.success) {
            testResults.push({
              employee: employee.employeeName,
              employeeId: employee.employeeId,
              profileUrl: employee.profilerUrl,
              success: true,
              status: response.status,
              message: result.message,
              authMethod: result.previewData?.authMethod || 'unknown',
              previewData: result.previewData // Vollständige Daten!
            });
          } else {
            testResults.push({
              employee: employee.employeeName,
              employeeId: employee.employeeId,
              profileUrl: employee.profilerUrl,
              success: false,
              status: response.status,
              message: result.error || 'Unbekannter Fehler',
              authMethod: 'error'
            });
          }
          
        } catch (error) {
          testResults.push({
            employee: employee.employeeName,
            employeeId: employee.employeeId,
            profileUrl: employee.profilerUrl,
            success: false,
            status: 0,
            message: error instanceof Error ? error.message : 'Netzwerk-Fehler',
            authMethod: 'error'
          });
        }
      }
      
      setPreviewResults(testResults);
      setShowPreview(true);
      
    } catch (error) {
      console.error('❌ Preview-Test fehlgeschlagen:', error);
      alert('Fehler beim Preview-Test: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    } finally {
      setIsTestingPreview(false);
    }
  };

  // Bulk Import starten
  const handleStartImport = async () => {
    // Validiere Authentifizierung
    if (useTokenAuth) {
      if (!authToken.trim()) {
        alert('Bitte geben Sie einen Token ein.');
        return;
      }
    } else {
      if (!profilerCookies.trim()) {
        alert('Bitte geben Sie zuerst die Profiler-Cookies ein.');
        return;
      }
    }

    if (employees.length === 0) {
      alert('Keine Mitarbeiter mit Profiler-URLs gefunden.');
      return;
    }

    setImportProgress(prev => ({ ...prev, isRunning: true, completed: 0 }));
    
    try {
      // Rufe Backend-API für Bulk-Import auf
      const requestBody: any = {
        employees: employees.map(emp => ({
          employeeId: emp.employeeId,
          profilerUrl: emp.profilerUrl
        }))
      };

      // Füge Authentifizierungsdaten hinzu
      if (useTokenAuth) {
        requestBody.authToken = authToken;
      } else {
        requestBody.profilerCookies = profilerCookies;
      }

      console.log('🚀 Sende Bulk-Import Request:', {
        url: 'http://localhost:3001/api/profiler/bulk-import',
        employeesCount: requestBody.employees.length,
        useTokenAuth,
        hasAuthToken: !!requestBody.authToken,
        hasCookies: !!requestBody.profilerCookies,
        requestBody: { ...requestBody, authToken: requestBody.authToken ? '[REDACTED]' : undefined }
      });

      const response = await fetch('http://localhost:3001/api/profiler/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Backend Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        console.error('❌ Backend-Fehler:', errorResult);
        throw new Error(`HTTP ${response.status}: ${errorResult.error || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Bulk-Import gestartet:', result);
      
      // Starte Status-Polling
      pollImportStatus();
      
    } catch (error) {
      console.error('❌ Fehler beim Starten des Bulk-Imports:', error);
      setImportProgress(prev => ({ ...prev, isRunning: false }));
      alert(`Fehler beim Starten des Imports: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  // Status-Polling für Import-Fortschritt
  const pollImportStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/profiler/import-status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const status = await response.json();
        
        setImportProgress({
          total: status.total,
          completed: status.completed,
          current: status.currentEmployee,
          isRunning: status.isRunning
        });

        // Update employee status
        if (status.employeeResults) {
          setEmployees(prev => prev.map(emp => {
            const result = status.employeeResults[emp.employeeId];
            if (result) {
              return {
                ...emp,
                status: result.status,
                error: result.error,
                lastImported: result.completedAt
              };
            }
            return emp;
          }));
        }

        // Continue polling if still running
        if (status.isRunning) {
          setTimeout(pollImportStatus, 2000);
        }
      }
    } catch (error) {
      console.error('❌ Fehler beim Abrufen des Import-Status:', error);
    }
  };

  // Status-Icon für Mitarbeiter
  const getStatusIcon = (status: EmployeeProfilerData['status']) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      case 'importing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Status-Text für Mitarbeiter
  const getStatusText = (employee: EmployeeProfilerData) => {
    switch (employee.status) {
      case 'pending':
        return 'Wartend';
      case 'importing':
        return 'Importiert...';
      case 'success':
        return employee.lastImported ? `Erfolgreich (${new Date(employee.lastImported).toLocaleString('de-DE')})` : 'Erfolgreich';
      case 'error':
        return employee.error || 'Fehler';
      default:
        return 'Unbekannt';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Profiler Import Management</h2>
              <p className="text-sm text-gray-600">Bulk-Import aller Mitarbeiter-Profile aus dem Profiler</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Authentifizierung */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium text-gray-900">Authentifizierung</h3>
            </div>

            {/* Auth-Methode Auswahl */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setUseTokenAuth(true)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  useTokenAuth
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🎫 Token-Auth (Empfohlen)
              </button>
              <button
                onClick={() => setUseTokenAuth(false)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  !useTokenAuth
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🍪 Cookie-Auth (Legacy)
              </button>
            </div>

            {useTokenAuth ? (
              /* Token-Auth Eingabefeld */
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Bearer Token
                  </label>
                  <div className="flex gap-3">
                    <textarea
                      value={authToken}
                      onChange={(e) => setAuthToken(e.target.value)}
                      placeholder="Geben Sie Ihren Profiler Bearer Token ein..."
                      rows={3}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                    <button
                      onClick={handleShowPreview}
                      disabled={!authToken.trim() || isLoadingEmployees || isTestingPreview}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isTestingPreview ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Teste API...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          API testen
                        </>
                      )}
                    </button>
                  </div>
                  {authToken && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Token bereit</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Cookie-Auth Eingabefeld */
              <div className="flex gap-3">
                <textarea
                  value={profilerCookies}
                  onChange={(e) => setProfilerCookies(e.target.value)}
                  placeholder="Geben Sie Ihre Profiler-Cookies ein (z.B. KEYCLOAK_IDENTITY=...; JSESSIONID=...)..."
                  rows={3}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <button
                  onClick={handleShowPreview}
                  disabled={!profilerCookies.trim() || isLoadingEmployees || isTestingPreview}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isTestingPreview ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Teste API...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      API testen
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Detailed Preview Results */}
          {previewResults.length > 0 && (
            <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-purple-600" />
                <h3 className="font-medium text-gray-900">Vollständige Daten-Vorschau ({previewResults.length} Mitarbeiter)</h3>
              </div>
              
              <div className="space-y-4">
                {previewResults.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium text-gray-900">{result.employee}</div>
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                          HTTP {result.status}
                        </span>
                      </div>
                    </div>

                    {/* Detaillierte Daten oder Fehlermeldung */}
                    {result.success && result.previewData ? (
                      <ProfileDataPreview data={result.previewData} />
                    ) : (
                      <div className="text-sm text-red-600">{result.message}</div>
                    )}
                    
                    <div className="mt-2 text-xs text-gray-500">Auth: {result.authMethod}</div>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>Test-Zusammenfassung:</strong> {previewResults.filter(r => r.success).length} von {previewResults.length} erfolgreich
                  {previewResults.filter(r => r.success).length === previewResults.length && 
                    " - Authentifizierung funktioniert! ✅"
                  }
                </div>
              </div>
            </div>
          )}

          {/* Import Actions */}
          <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium text-gray-900">Profiler Import</h3>
            </div>
            
            <div className="space-y-3">
              {/* Info über gefundene Mitarbeiter */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Mitarbeiter mit Profiler-URLs: <strong>{employees.length}</strong>
                  </span>
                  <button
                    onClick={loadEmployeesWithProfilerUrls}
                    disabled={importProgress.isRunning || isLoadingEmployees}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingEmployees ? 'animate-spin' : ''}`} />
                    Aktualisieren
                  </button>
                </div>
              </div>

              {/* Haupt-Import Button */}
              <button
                onClick={handleStartImport}
                disabled={importProgress.isRunning || (useTokenAuth ? !authToken.trim() : !profilerCookies.trim()) || employees.length === 0}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {importProgress.isRunning ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Import läuft... ({importProgress.completed}/{importProgress.total})
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Profiler-Import starten ({employees.length} Mitarbeiter)
                  </>
                )}
              </button>
              
              {employees.length === 0 && (
                <p className="text-sm text-gray-500 text-center">
                  Keine Mitarbeiter mit Profiler-URLs gefunden. Stellen Sie sicher, dass Mitarbeiter das Feld "Link zum Profil-URL" ausgefüllt haben.
                </p>
              )}
            </div>
          </div>

          {/* Import Progress */}
          {importProgress.total > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Import Status</h3>
                </div>
                <div className="text-sm text-gray-600">
                  {importProgress.completed} / {importProgress.total} abgeschlossen
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.completed / importProgress.total) * 100}%` }}
                />
              </div>
              
              {importProgress.current && (
                <p className="text-sm text-gray-600">
                  Aktuell: {importProgress.current}
                </p>
              )}
            </div>
          )}

          {/* Employee List */}
          {showPreview && employees.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-medium text-gray-900">
                  Mitarbeiter mit Profiler-URLs ({employees.length})
                </h3>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {employees.map((employee) => (
                  <div key={employee.employeeId} className="p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="font-medium text-gray-900">
                            {employee.employeeName}
                          </div>
                          {getStatusIcon(employee.status)}
                          <div className="text-sm text-gray-600">
                            {getStatusText(employee)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Link2 className="w-3 h-3 text-gray-400" />
                          <div className="text-xs text-gray-500 truncate">
                            {employee.profilerUrl}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Employees Message */}
          {showPreview && employees.length === 0 && !isLoadingEmployees && (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Keine Mitarbeiter mit Profiler-URLs gefunden.</p>
              <p className="text-sm mt-1">Stellen Sie sicher, dass in der utilizationData Collection Profiler-URLs hinterlegt sind.</p>
            </div>
          )}

          {/* Loading State */}
          {isLoadingEmployees && (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 text-blue-500 animate-spin" />
              <p className="text-gray-600">Lade Mitarbeiter...</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
