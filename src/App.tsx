import { useMemo, useState, useRef, useEffect } from 'react';
import { Container, Theme } from './settings/types';
import { UtilizationReportView } from './components/generated/UtilizationReportView';
import EmployeeOverviewDashboard from './components/generated/EmployeeOverviewDashboard';
import { AuslastungCommentView } from './components/generated/AuslastungCommentView';
import { SalesView } from './components/generated/SalesView';
import EmployeeSelectionModal from './components/generated/EmployeeSelectionModal';
import EmployeeDetailView from './components/generated/EmployeeDetailView';
import HierarchicalRoleManagement from './components/generated/HierarchicalRoleManagement';
import RoleManagement from './components/generated/RoleManagement';
import TechnicalSkillManagement from './components/generated/TechnicalSkillManagement';
import SoftSkillManagement from './components/generated/SoftSkillManagement';
import { SoftSkillBulkUploadModal } from './components/generated/SoftSkillBulkUploadModal';
import TechnicalSkillBulkUploadModal from './components/generated/TechnicalSkillBulkUploadModal';
import RoleTaskBulkUploadModal from './components/generated/RoleTaskBulkUploadModal';
import ProjectRoleTaskSelectorDemo from './components/generated/ProjectRoleTaskSelectorDemo';
import ProjectSkillSelectorDemo from './components/generated/ProjectSkillSelectorDemo';
import { CustomerProjectsManager } from './components/generated/CustomerProjectsManager';
import AuslastungserklaerungManagement from './components/generated/AuslastungserklaerungManagement';
import { UserSettingsDemo } from './components/generated/UserSettingsDemo';
import UserRoleManagement from './components/generated/UserRoleManagement';
import AdminSetup from './components/generated/AdminSetup';
import RestoreAdminRole from './components/generated/RestoreAdminRole';
import EmergencyAdminCreator from './components/generated/EmergencyAdminCreator';
import FirebaseAuthBulkSetup from './components/generated/FirebaseAuthBulkSetup';
import { CustomerProvider } from './contexts/CustomerContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
// Entfernt: import { canAccessView } from './lib/permissions'; - verwende nur AuthContext
import { GlobalModalProvider } from './contexts/GlobalModalContext';
import { LoginForm } from './components/LoginForm';
import { User as UserIcon, ChevronDown, LogOut, Users, BarChart3, FileText, X } from 'lucide-react';
import AdminUserManagementModal from './components/generated/AdminUserManagementModal';
import { AdminDataUploadModal } from './components/generated/AdminDataUploadModal';
import { ExcelUploadModal } from './components/generated/ExcelUploadModal';
import { HelpModal } from './components/generated/HelpModal';

import { AssignmentsProvider } from './contexts/AssignmentsContext';
import { RoleProvider } from './contexts/RoleContext';
import { ProjectHistoryProvider } from './contexts/ProjectHistoryContext';
import { UtilizationDataProvider } from './contexts/UtilizationDataContext';
import { AppHeader } from './components/AppHeader';
// Projekt-Komponenten entfernt - nicht mehr verfügbar


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
    const { user, loading, profile, logout, role, canAccessView } = useAuth();
    const [isAdminModalOpen, setAdminModalOpen] = useState(false);
    const [isMenuOpen, setMenuOpen] = useState(false);
    
    // Standard-View basierend auf Benutzerrolle setzen
    const getDefaultView = (): 'utilization' | 'employees' | 'knowledge' | 'auslastung-comments' | 'sales' | 'project-roles-demo' | 'project-skills-demo' | 'employee-detail' | 'projects' => {
      // Prüfe verfügbare Views für die aktuelle Rolle
      if (canAccessView('sales')) {
        return 'sales'; // Sales-View wenn verfügbar
      }
      if (canAccessView('utilization')) {
        return 'utilization'; // Utilization-View wenn verfügbar
      }
      if (canAccessView('employees')) {
        return 'employees'; // Employee-View als Fallback
      }
      return 'utilization'; // Letzter Fallback
    };
    
    const [currentView, setCurrentView] = useState<'utilization' | 'employees' | 'knowledge' | 'auslastung-comments' | 'sales' | 'project-roles-demo' | 'project-skills-demo' | 'employee-detail' | 'projects'>(getDefaultView());
    
    // Aktualisiere View wenn sich die Rolle ändert
    useEffect(() => {
      const defaultView = getDefaultView();
      if (role !== 'unknown' && currentView !== defaultView) {
        console.log(`🎯 Rolle "${role}" erkannt - wechsle zu View: ${defaultView}`);
        setCurrentView(defaultView);
      }
    }, [role, canAccessView]);
    
    // Schutz: Verhindere Zugriff auf nicht-erlaubte Views
    const safeSetCurrentView = (view: typeof currentView) => {
      // Prüfe ob der Benutzer Zugriff auf diese View hat
      const viewPermissionMap = {
        'utilization': 'utilization',
        'employees': 'employees', 
        'sales': 'sales',
        'knowledge': 'utilization', // Knowledge braucht Utilization-Berechtigung
        'auslastung-comments': 'utilization',
        'project-roles-demo': 'utilization',
        'project-skills-demo': 'utilization', 
        'employee-detail': 'employees',
        'projects': 'utilization'
      };
      
      // Zugriffskontrolle aktiviert
      const requiredPermission = viewPermissionMap[view];
      if (requiredPermission && !canAccessView(requiredPermission)) {
        console.warn(`⚠️ Zugriff verweigert auf View "${view}" für Rolle "${role}"`);
        // Fallback auf erlaubte View
        const allowedViews = ['utilization', 'employees', 'sales'].filter(v => canAccessView(v));
        if (allowedViews.length > 0) {
          console.log(`🔄 Weiterleitung zu erlaubter View: ${allowedViews[0]}`);
          setCurrentView(allowedViews[0] as typeof currentView);
        }
        return;
      }
      
      setCurrentView(view);
    };
    
    // Projects sub-navigation states
    const [projectsSubView, setProjectsSubView] = useState<'overview' | 'projects' | 'employee' | 'wizard'>('overview');
    const [selectedProjectEmployeeId, setSelectedProjectEmployeeId] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isProjectWizardOpen, setIsProjectWizardOpen] = useState(false);
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [isEmployeeSelectionOpen, setIsEmployeeSelectionOpen] = useState(false);
    
    // States für UtilizationReportView spezifische Modals
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isAuslastungViewOpen, setIsAuslastungViewOpen] = useState(false);
    const [isEinsatzplanViewOpen, setIsEinsatzplanViewOpen] = useState(false);
    const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
    
    // States für Management Modals
    const [isHierarchicalRoleManagementOpen, setIsHierarchicalRoleManagementOpen] = useState(false);
    const [isRoleManagementOpen, setIsRoleManagementOpen] = useState(false);
    const [isTechnicalSkillManagementOpen, setIsTechnicalSkillManagementOpen] = useState(false);
    const [isSoftSkillManagementOpen, setIsSoftSkillManagementOpen] = useState(false);
    const [isSoftSkillImportOpen, setIsSoftSkillImportOpen] = useState(false);
    const [isTechnicalSkillImportOpen, setIsTechnicalSkillImportOpen] = useState(false);
  const [isRoleTaskImportOpen, setIsRoleTaskImportOpen] = useState(false);
    const [isCustomerProjectsManagementOpen, setIsCustomerProjectsManagementOpen] = useState(false);
    const [isAuslastungserklaerungManagementOpen, setIsAuslastungserklaerungManagementOpen] = useState(false);
    const [isGeneralSettingsOpen, setIsGeneralSettingsOpen] = useState(false);
    const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
    const [isUserRoleManagementOpen, setIsUserRoleManagementOpen] = useState(false);
  const [isAdminSetupOpen, setIsAdminSetupOpen] = useState(false);
  const [isRestoreAdminOpen, setIsRestoreAdminOpen] = useState(false);
  const [isFirebaseAuthSetupOpen, setIsFirebaseAuthSetupOpen] = useState(false);
    
    // Help Modal State
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    
    // State für Upload Panel

    const [isExcelUploadModalOpen, setIsExcelUploadModalOpen] = useState(false);
    
    // ✅ KORRIGIERT: Action-Items State mit komplexer Struktur für beide Views
    const [actionItems, setActionItems] = useState<Record<string, { actionItem: boolean; source: 'manual' | 'rule' | 'default'; updatedBy?: string }>>(() => {
      try { 
        const stored = localStorage.getItem('utilization_action_items');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Konvertiere alte boolean-Struktur zu neuer Objekt-Struktur
          if (typeof Object.values(parsed)[0] === 'boolean') {
            const converted: Record<string, { actionItem: boolean; source: 'manual' | 'rule' | 'default'; updatedBy?: string }> = {};
            Object.entries(parsed).forEach(([person, actionItem]) => {
              converted[person] = { 
                actionItem: actionItem as boolean, 
                source: 'default', 
                updatedBy: undefined 
              };
            });
            return converted;
          }
          return parsed;
        }
        return {};
      } catch { return {}; }
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
    
    // Handle employee detail navigation - now goes to overview first
    const handleEmployeeDetailNavigation = () => {
      // Für Test: Setze einen Standard-Mitarbeiter
      setSelectedPersonId('test-employee-1');
      safeSetCurrentView('employee-detail');
    };

    const handleEmployeeSelected = (personId: string) => {
      setSelectedPersonId(personId);
      safeSetCurrentView('employee-detail');
    };
    
    // Projects navigation handlers
    const handleProjectEmployeeClick = (employeeId: string) => {
      setSelectedProjectEmployeeId(employeeId);
      setProjectsSubView('employee');
    };

    const handleProjectClick = (projectId: string) => {
      setSelectedProjectId(projectId);
      // For now, we'll just log the project click - in a real app this would navigate to project details
      console.log('Project clicked:', projectId);
    };

    const handleBackToProjectsOverview = () => {
      setSelectedProjectEmployeeId(null);
      setSelectedProjectId(null);
      setProjectsSubView('overview');
    };

    const handleBackToProjects = () => {
      setSelectedProjectEmployeeId(null);
      setSelectedProjectId(null);
      setProjectsSubView('projects');
    };



    const handleProjectWizardSave = (projectData: any) => {
      console.log('Project created:', projectData);
      // Here you would typically save the project data to your backend
      // For now, we'll just close the wizard and show the projects dashboard
      setIsProjectWizardOpen(false);
      setProjectsSubView('projects');
    };

    const handleProjectWizardClose = () => {
      setIsProjectWizardOpen(false);
      setProjectsSubView('projects');
    };

    return (
      <GlobalModalProvider>
        <CustomerProvider>
          <UtilizationDataProvider>
            <AssignmentsProvider>
              <RoleProvider>
                <ProjectHistoryProvider>
          {/* App Header - IMMER sichtbar */}
          <AppHeader
            currentView={currentView}
            setCurrentView={(view) => {
              if (view === 'employee-detail') {
                handleEmployeeDetailNavigation();
              } else if (view === 'projects') {
                safeSetCurrentView(view);
                setProjectsSubView('overview'); // Always start with overview
                setSelectedProjectEmployeeId(null);
                setSelectedProjectId(null);
                setIsProjectWizardOpen(false);
              } else {
                safeSetCurrentView(view);
              }
            }}

            logout={logout}
            setAdminModalOpen={setAdminModalOpen}
            onSettings={() => setIsSettingsModalOpen(true)}
            onHelp={() => setIsHelpModalOpen(true)}
            onAdminUpload={() => {}}
            onEmployeeUpload={() => {}}
            onExcelUpload={() => setIsExcelUploadModalOpen(true)}
            onAuslastungView={() => setIsAuslastungViewOpen(true)}
            onEinsatzplanView={() => setIsEinsatzplanViewOpen(true)}
            onRoleManagement={() => setIsRoleManagementOpen(true)}
            onTechnicalSkillManagement={() => setIsTechnicalSkillManagementOpen(true)}
            onSoftSkillManagement={() => setIsSoftSkillManagementOpen(true)}
            onSoftSkillImport={() => setIsSoftSkillImportOpen(true)}
                          onTechnicalSkillImport={() => setIsTechnicalSkillImportOpen(true)}
              onRoleTaskImport={() => setIsRoleTaskImportOpen(true)}
            onCustomerProjectsManagement={() => setIsCustomerProjectsManagementOpen(true)}
            onAuslastungserklaerungManagement={() => setIsAuslastungserklaerungManagementOpen(true)}
            onUserSettings={() => setIsUserSettingsOpen(true)}
            onGeneralSettings={() => setIsGeneralSettingsOpen(true)}
            onUserRoleManagement={() => setIsUserRoleManagementOpen(true)}
            onAdminSetup={() => setIsAdminSetupOpen(true)}
            onRestoreAdmin={() => setIsRestoreAdminOpen(true)}
            onFirebaseAuthSetup={() => setIsFirebaseAuthSetupOpen(true)}
            onProjectRolesDemo={() => safeSetCurrentView('project-roles-demo')}
            onProjectSkillsDemo={() => safeSetCurrentView('project-skills-demo')}
            lobOptions={[]} // TODO: von UtilizationReportView holen
          />

          {/* Main Content */}
                    {currentView === 'utilization' && canAccessView('utilization') && (
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
                onEmployeeDetailNavigation={(employeeId) => {
                  setSelectedPersonId(employeeId);
                  safeSetCurrentView('employee-detail');
                }}
              />
            </>
          )}
          
          {currentView === 'employees' && canAccessView('employees') && (
            <EmployeeOverviewDashboard 
              onEmployeeClick={handleEmployeeSelected}
              onBackToOverview={() => safeSetCurrentView('utilization')}
            />
          )}

          {/* Fallback für nicht-berechtigte Employee View */}
          {currentView === 'employees' && !canAccessView('employees') && (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Zugriff verweigert</h2>
                <p className="text-gray-600 mb-4">
                  Sie haben keine Berechtigung für die Mitarbeiteransicht.
                </p>
                <p className="text-sm text-gray-500">
                  Rolle: <span className="font-medium capitalize">{role}</span>
                </p>
              </div>
            </div>
          )}
          
          {currentView === 'knowledge' && (
            <AuslastungCommentView />
          )}
          
          {currentView === 'auslastung-comments' && (
            <AuslastungCommentView />
          )}
          
          {currentView === 'sales' && canAccessView('sales') && (
            <SalesView actionItems={actionItems} />
          )}

          {/* Fallback für nicht-berechtigte Views */}
          {currentView === 'utilization' && !canAccessView('utilization') && (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Zugriff verweigert</h2>
                <p className="text-gray-600 mb-4">
                  Sie haben keine Berechtigung für die Auslastungsansicht.
                </p>
                <p className="text-sm text-gray-500">
                  Rolle: <span className="font-medium capitalize">{role}</span>
                </p>
              </div>
            </div>
          )}

          {currentView === 'project-roles-demo' && (
            <ProjectRoleTaskSelectorDemo />
          )}

          {currentView === 'project-skills-demo' && (
            <ProjectSkillSelectorDemo />
          )}

          {currentView === 'employee-detail' && (
            <>
              {selectedPersonId ? (
                <EmployeeDetailView
                  employeeId={selectedPersonId}
                  onBack={() => safeSetCurrentView('employees')}
                />
              ) : (
                <div className="p-6">
                  <div className="max-w-2xl mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="text-sm text-yellow-800">Kein Mitarbeiter ausgewählt. Bitte wählen Sie in der Mitarbeiterliste einen Mitarbeiter aus oder klicken Sie auf "Detail" im Header.</div>
                    <div className="mt-3">
                      <button
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded mr-2"
                        onClick={() => safeSetCurrentView('employees')}
                      >Zur Mitarbeiterliste</button>
                      <button
                        className="px-4 py-2 text-sm bg-green-600 text-white rounded"
                        onClick={() => setIsEmployeeSelectionOpen(true)}
                      >Mitarbeiter auswählen</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {currentView === 'projects' && (
            <div>
              {/* Projects Sub-Navigation */}
              <nav className="bg-white shadow-sm border-b p-4">
                <div className="flex space-x-4">
                  <button 
                    onClick={() => setProjectsSubView('overview')}
                    className={`px-3 py-2 rounded ${projectsSubView === 'overview' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    Overview
                  </button>
                  <button 
                    onClick={() => setProjectsSubView('projects')}
                    className={`px-3 py-2 rounded ${projectsSubView === 'projects' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    Projects
                  </button>
                  <button 
                    onClick={() => {
                      setProjectsSubView('wizard');
                      setIsProjectWizardOpen(true);
                    }}
                    className={`px-3 py-2 rounded ${projectsSubView === 'wizard' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    Wizard
                  </button>
                </div>
              </nav>

              {/* Projects Content */}
              {projectsSubView === 'wizard' && (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="text-center p-8 bg-white rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Projekt-Wizard</h2>
                    <p className="text-gray-600 mb-4">
                      Die Projekt-Wizard Komponente wurde entfernt.
                    </p>
                    <button
                      onClick={() => safeSetCurrentView('utilization')}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Zurück zur Auslastung
                    </button>
                  </div>
                </div>
              )}
              
              {projectsSubView === 'employee' && selectedProjectEmployeeId && (
                <EmployeeDetailView 
                  employeeId={selectedProjectEmployeeId} 
                  onBack={handleBackToProjects} 
                />
              )}
              
              {projectsSubView === 'overview' && (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="text-center p-8 bg-white rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Projekt-Übersicht</h2>
                    <p className="text-gray-600 mb-4">
                      Die Projekt-Übersicht Komponente wurde entfernt.
                    </p>
                    <button
                      onClick={() => safeSetCurrentView('utilization')}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Zurück zur Auslastung
                    </button>
                  </div>
                </div>
              )}
              
              {projectsSubView === 'projects' && (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="text-center p-8 bg-white rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Projekt-Management</h2>
                    <p className="text-gray-600 mb-4">
                      Das Projekt-Management Dashboard wurde entfernt.
                    </p>
                    <button
                      onClick={() => safeSetCurrentView('utilization')}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Zurück zur Auslastung
                    </button>
                  </div>
                </div>
              )}
            </div>
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
          <HierarchicalRoleManagement 
            isOpen={isHierarchicalRoleManagementOpen} 
            onClose={() => setIsHierarchicalRoleManagementOpen(false)} 
          />

          {isRoleManagementOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
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

          {isSoftSkillManagementOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                  <SoftSkillManagement />
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      onClick={() => setIsSoftSkillManagementOpen(false)}
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

          {isAuslastungserklaerungManagementOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                  <AuslastungserklaerungManagement />
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      onClick={() => setIsAuslastungserklaerungManagementOpen(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Settings Modal */}
          {isUserSettingsOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsUserSettingsOpen(false)}></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
                  <UserSettingsDemo />
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      onClick={() => setIsUserSettingsOpen(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Role Management Modal */}
          {isUserRoleManagementOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsUserRoleManagementOpen(false)}></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
                  <UserRoleManagement />
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      onClick={() => setIsUserRoleManagementOpen(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admin Setup Modal */}
          {isAdminSetupOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsAdminSetupOpen(false)}></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                  <AdminSetup />
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      onClick={() => setIsAdminSetupOpen(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Restore Admin Modal */}
          {isRestoreAdminOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsRestoreAdminOpen(false)}></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                  <EmergencyAdminCreator />
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      onClick={() => setIsRestoreAdminOpen(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Firebase Auth Setup Modal */}
          {isFirebaseAuthSetupOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsFirebaseAuthSetupOpen(false)}></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
                  <FirebaseAuthBulkSetup />
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      onClick={() => setIsFirebaseAuthSetupOpen(false)}
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





          {/* Excel Upload Modal */}
          <ExcelUploadModal 
            isOpen={isExcelUploadModalOpen}
            onClose={() => setIsExcelUploadModalOpen(false)}
          />

          {/* Technical Skills Import Modal */}
          <TechnicalSkillBulkUploadModal
            isOpen={isTechnicalSkillImportOpen}
            onClose={() => setIsTechnicalSkillImportOpen(false)}
            onImportComplete={() => {
              // Refresh any relevant data if needed
            }}
          />

          <SoftSkillBulkUploadModal
            isOpen={isSoftSkillImportOpen}
            onClose={() => setIsSoftSkillImportOpen(false)}
            onImportComplete={() => {
              // Refresh any relevant data if needed
            }}
          />

          <RoleTaskBulkUploadModal
            isOpen={isRoleTaskImportOpen}
            onClose={() => setIsRoleTaskImportOpen(false)}
            onImportComplete={() => {
              // Refresh any relevant data if needed
            }}
          />

          {/* Help Modal */}
          <HelpModal 
            isOpen={isHelpModalOpen}
            onClose={() => setIsHelpModalOpen(false)}
          />

          {/* Employee Selection Modal */}
          <EmployeeSelectionModal
            isOpen={isEmployeeSelectionOpen}
            onClose={() => setIsEmployeeSelectionOpen(false)}
            onSelect={handleEmployeeSelected}
            actionItems={actionItems}
          />

          {/* Upload Panel Modal */}
          {/* DISABLED: UploadPanel Modal
          {isUploadPanelOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Excel Upload</h3>
                      <button
                        onClick={() => setIsUploadPanelOpen(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <UploadPanel 
                      uploadedFiles={{}}
                      onFilesChange={() => {}}
                      onDatabaseRefresh={() => {}}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          */}

                </ProjectHistoryProvider>
              </RoleProvider>
            </AssignmentsProvider>
          </UtilizationDataProvider>
        </CustomerProvider>
      </GlobalModalProvider>
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