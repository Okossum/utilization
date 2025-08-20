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
    const [currentView, setCurrentView] = useState<'utilization' | 'employees' | 'knowledge'>('utilization');
    
    // States für UtilizationReportView spezifische Modals
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isAuslastungViewOpen, setIsAuslastungViewOpen] = useState(false);
    const [isEinsatzplanViewOpen, setIsEinsatzplanViewOpen] = useState(false);
    const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
    
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
            onColumnsMenu={() => setIsColumnsMenuOpen(v => !v)}
            isColumnsMenuOpen={isColumnsMenuOpen}
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