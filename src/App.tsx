import { useMemo, useState, useRef, useEffect } from 'react';
import { Container, Theme } from './settings/types';
import { UtilizationReportView } from './components/generated/UtilizationReportView';
import { EmployeeListView } from './components/generated/EmployeeListView';
import { KnowledgeTestPage } from './components/generated/KnowledgeTestPage';
import { AuslastungCommentView } from './components/generated/AuslastungCommentView';
import RoleManagement from './components/generated/RoleManagement';
import TechnicalSkillManagement from './components/generated/TechnicalSkillManagement';
import { CustomerProjectsManager } from './components/generated/CustomerProjectsManager';
import { CustomerProvider } from './contexts/CustomerContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { User as UserIcon, ChevronDown, LogOut, Users, BarChart3, FileText, X } from 'lucide-react';
import AdminUserManagementModal from './components/generated/AdminUserManagementModal';
import { AssignmentsProvider } from './contexts/AssignmentsContext';
import { RoleProvider } from './contexts/RoleContext';
import { ProjectHistoryProvider } from './contexts/ProjectHistoryContext';
import { AppHeader } from './components/AppHeader';

let theme: Theme = 'light';
// only use 'centered' container for standalone components, never for full page apps or websites.
let container: Container = 'none';

function App() {
  function setTheme(theme: Theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  setTheme(theme);

  const generatedComponent = useMemo(() => {
    // ✅ SCHRITT 3: RootRouter außerhalb von useMemo definieren
    return (
      <AuthProvider>
        <RootRouter />
      </AuthProvider>
    );
  }, []);

  // ✅ SCHRITT 3: RootRouter als separate Komponente definieren
  function RootRouter() {
    const { user, loading, profile, logout } = useAuth();
    const [isAdminModalOpen, setAdminModalOpen] = useState(false);
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [currentView, setCurrentView] = useState<'utilization' | 'employees' | 'knowledge' | 'auslastung-comments'>('utilization');
    
    // States für UtilizationReportView spezifische Modals
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isAuslastungViewOpen, setIsAuslastungViewOpen] = useState(false);
    const [isEinsatzplanViewOpen, setIsEinsatzplanViewOpen] = useState(false);
    const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
    
    // States für Management Modals
    const [isRoleManagementOpen, setIsRoleManagementOpen] = useState(false);
    const [isTechnicalSkillManagementOpen, setIsTechnicalSkillManagementOpen] = useState(false);
    const [isCustomerProjectsManagementOpen, setIsCustomerProjectsManagementOpen] = useState(false);
    const [isGeneralSettingsOpen, setIsGeneralSettingsOpen] = useState(false);
    
    // ✅ NEU: Action-Items State für beide Views (Act-Toggle aus Auslastungs-Übersicht)
    const [actionItems, setActionItems] = useState<Record<string, boolean>>(() => {
      try { return JSON.parse(localStorage.getItem('utilization_action_items') || '{}'); } catch { return {}; }
    });
    
    // Speichere Action-Items im localStorage
    useEffect(() => {
      try { localStorage.setItem('utilization_action_items', JSON.stringify(actionItems)); } catch {}
    }, [actionItems]);
    
    const menuRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setMenuOpen(false);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);
    
    if (loading) {
      return (
        <div className="h-full w-full flex items-center justify-center p-8">Lade...</div>
      );
    }
    
    if (!user) {
      return <LoginForm />;
    }
    
    return (
      <CustomerProvider>
        <AssignmentsProvider>
          <RoleProvider>
            <ProjectHistoryProvider>
          {/* App Header - IMMER sichtbar */}
          <AppHeader
            currentView={currentView}
            setCurrentView={setCurrentView}
            logout={logout}
            setAdminModalOpen={setAdminModalOpen}
            onSettings={() => setIsSettingsModalOpen(true)}
            onAdminUpload={() => setAdminModalOpen(true)}
            onAuslastungView={() => setIsAuslastungViewOpen(true)}
            onEinsatzplanView={() => setIsEinsatzplanViewOpen(true)}
            onRoleManagement={() => setIsRoleManagementOpen(true)}
            onTechnicalSkillManagement={() => setIsTechnicalSkillManagementOpen(true)}
            onCustomerProjectsManagement={() => setIsCustomerProjectsManagementOpen(true)}
            onGeneralSettings={() => setIsGeneralSettingsOpen(true)}
            lobOptions={[]} // TODO: von UtilizationReportView holen
          />

          {/* Main Content */}
          {currentView === 'utilization' && (
            <>
              <UtilizationReportView 
                actionItems={actionItems}
                setActionItems={setActionItems}
                isSettingsModalOpen={isSettingsModalOpen}
                setIsSettingsModalOpen={setIsSettingsModalOpen}
                isAuslastungViewOpen={isAuslastungViewOpen}
                setIsAuslastungViewOpen={setIsAuslastungViewOpen}
                isEinsatzplanViewOpen={isEinsatzplanViewOpen}
                setIsEinsatzplanViewOpen={setIsEinsatzplanViewOpen}
                isColumnsMenuOpen={isColumnsMenuOpen}
                setIsColumnsMenuOpen={setIsColumnsMenuOpen}
              />
            </>
          )}
          
          {currentView === 'employees' && (
            <EmployeeListView 
              actionItems={actionItems}
            />
          )}
          
          {currentView === 'knowledge' && (
            <KnowledgeTestPage />
          )}
          
          {currentView === 'auslastung-comments' && (
            <AuslastungCommentView />
          )}
          
          {/* General Settings Modal */}
          {isGeneralSettingsOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Allgemeine Einstellungen</h3>
                      <button
                        onClick={() => setIsGeneralSettingsOpen(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Darstellung</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="text-sm font-medium text-gray-900">Theme</div>
                              <div className="text-xs text-gray-500">Hell- oder Dunkelmodus</div>
                            </div>
                            <select className="text-sm border border-gray-300 rounded px-3 py-1">
                              <option>Hell</option>
                              <option>Dunkel</option>
                              <option>System</option>
                            </select>
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="text-sm font-medium text-gray-900">Sprache</div>
                              <div className="text-xs text-gray-500">Interface-Sprache</div>
                            </div>
                            <select className="text-sm border border-gray-300 rounded px-3 py-1">
                              <option>Deutsch</option>
                              <option>English</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Benachrichtigungen</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="text-sm font-medium text-gray-900">Desktop-Benachrichtigungen</div>
                              <div className="text-xs text-gray-500">Browser-Benachrichtigungen aktivieren</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="text-sm font-medium text-gray-900">E-Mail-Updates</div>
                              <div className="text-xs text-gray-500">Wichtige Updates per E-Mail erhalten</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" defaultChecked />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Export & Daten</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="text-sm font-medium text-gray-900">Standard Export-Format</div>
                              <div className="text-xs text-gray-500">Bevorzugtes Format für Daten-Export</div>
                            </div>
                            <select className="text-sm border border-gray-300 rounded px-3 py-1">
                              <option>Excel (.xlsx)</option>
                              <option>CSV</option>
                              <option>PDF</option>
                            </select>
                          </div>
                          
                          <button className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-left">
                            <div className="text-sm font-medium text-blue-900">Cache leeren</div>
                            <div className="text-xs text-blue-600">Gespeicherte Daten und Einstellungen zurücksetzen</div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      onClick={() => setIsGeneralSettingsOpen(false)}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Speichern
                    </button>
                    <button
                      onClick={() => setIsGeneralSettingsOpen(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Management Modals */}
          {isRoleManagementOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                  <RoleManagement />
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      onClick={() => setIsRoleManagementOpen(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isTechnicalSkillManagementOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                  <TechnicalSkillManagement />
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      onClick={() => setIsTechnicalSkillManagementOpen(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isCustomerProjectsManagementOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                  <CustomerProjectsManager />
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      onClick={() => setIsCustomerProjectsManagementOpen(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <AdminUserManagementModal isOpen={isAdminModalOpen} onClose={() => setAdminModalOpen(false)} />
            </ProjectHistoryProvider>
          </RoleProvider>
        </AssignmentsProvider>
      </CustomerProvider>
    );
  }

  if (container === 'centered') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        {generatedComponent}
      </div>
    );
  } else {
    return generatedComponent;
  }
}

export default App;