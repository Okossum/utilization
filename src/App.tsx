import { useMemo, useState, useRef, useEffect } from 'react';
import { Container, Theme } from './settings/types';
import { UtilizationReportView } from './components/generated/UtilizationReportView';
import { CustomerProjectsManagerButton } from './components/generated/CustomerProjectsManagerButton';
import { SkillManagementButton } from './components/generated/SkillManagementButton';
import { CustomerProvider } from './contexts/CustomerContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { User as UserIcon, ChevronDown, LogOut } from 'lucide-react';
import AdminUserManagementModal from './components/generated/AdminUserManagementModal';

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
        {/* Global Header Actions */}
        <div className="fixed top-4 right-4 z-50" ref={menuRef}>
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

        <UtilizationReportView />
        <AdminUserManagementModal isOpen={isAdminModalOpen} onClose={() => setAdminModalOpen(false)} />
        <CustomerProjectsManagerButton />
        <SkillManagementButton className="fixed bottom-4 right-44 z-40" label="Skills" />
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