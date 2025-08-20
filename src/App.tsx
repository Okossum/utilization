import { useMemo, useState, useRef, useEffect } from 'react';
import { Container, Theme } from './settings/types';
import { UtilizationReportView } from './components/generated/UtilizationReportView';
import { EmployeeListView } from './components/generated/EmployeeListView';
import { CustomerProjectsManagerButton } from './components/generated/CustomerProjectsManagerButton';
import { KnowledgeTestPage } from './components/generated/KnowledgeTestPage';
import RoleManagementButton from './components/generated/RoleManagementButton';
import TechnicalSkillManagementButton from './components/generated/TechnicalSkillManagementButton';
import { CustomerProvider } from './contexts/CustomerContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { User as UserIcon, ChevronDown, LogOut, Users, BarChart3, FileText } from 'lucide-react';
import AdminUserManagementModal from './components/generated/AdminUserManagementModal';
import { AssignmentsProvider } from './contexts/AssignmentsContext';
import { RoleProvider } from './contexts/RoleContext';

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
    const [currentView, setCurrentView] = useState<'utilization' | 'employees' | 'knowledge'>('utilization');
    
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
          {/* Navigation & Account */}
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
            {/* Navigation Buttons */}
            <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg shadow-sm p-1">
              <button
                onClick={() => setCurrentView('utilization')}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'utilization' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title="Auslastung Report"
              >
                <BarChart3 className="w-4 h-4" />
                Auslastung
              </button>
              <button
                onClick={() => setCurrentView('employees')}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'employees' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title="Mitarbeiter Liste"
              >
                <Users className="w-4 h-4" />
                Mitarbeiter
              </button>
              <button
                onClick={() => setCurrentView('knowledge')}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'knowledge' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title="Knowledge Upload Test"
              >
                <FileText className="w-4 h-4" />
                Knowledge
              </button>
            </div>
            
            {/* Account Menu */}
            <div ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
                title="Account"
              >
                <UserIcon className="w-4 h-4 text-gray-700" />
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            {isMenuOpen && (
              <div className="mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                <div className="mb-3">
                  <div className="text-xs text-gray-500">Angemeldet als</div>
                  <div className="text-sm font-medium text-gray-900 truncate">{profile?.displayName || user.email || '—'}</div>
                  <div className="text-xs text-gray-600">Rolle: {String(profile?.role || 'unknown')}</div>
                </div>
                {profile?.role === 'admin' && (
                  <button
                    onClick={() => { setAdminModalOpen(true); setMenuOpen(false); }}
                    className="w-full px-3 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 mb-2"
                  >
                    Benutzerverwaltung
                  </button>
                )}
                <button
                  onClick={async () => { setMenuOpen(false); await logout(); }}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <LogOut className="w-4 h-4" /> Abmelden
                </button>
              </div>
            )}
            </div>
          </div>

          {/* Main Content */}
          {currentView === 'utilization' && (
            <>
              <UtilizationReportView 
                actionItems={actionItems}
                setActionItems={setActionItems}
              />
              <CustomerProjectsManagerButton />
                      <TechnicalSkillManagementButton className="fixed bottom-4 right-44 z-40" label="Tech Skills" />
              <RoleManagementButton className="fixed bottom-4 right-[22rem] z-40" label="Rollen" />
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
          
          <AdminUserManagementModal isOpen={isAdminModalOpen} onClose={() => setAdminModalOpen(false)} />
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