import { useMemo } from 'react';
import { Container, Theme } from './settings/types';
import { UtilizationReportView } from './components/generated/UtilizationReportView';
import { CustomerProjectsManagerButton } from './components/generated/CustomerProjectsManagerButton';
import { SkillManagementButton } from './components/generated/SkillManagementButton';
import { CustomerProvider } from './contexts/CustomerContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import LoginForm from './components/LoginForm';

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
    // THIS IS WHERE THE TOP LEVEL GENRATED COMPONENT WILL BE RETURNED!
    function RootRouter() {
      const { user, loading } = useAuth();
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
          <UtilizationReportView />
          <CustomerProjectsManagerButton />
          <SkillManagementButton className="fixed bottom-4 right-44 z-40" label="Skills" />
        </CustomerProvider>
      );
    }

    return (
      <AuthProvider>
        <RootRouter />
      </AuthProvider>
    );
  }, []);

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