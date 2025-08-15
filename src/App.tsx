import { useMemo } from 'react';
import { Container, Theme } from './settings/types';
import { UtilizationReportView } from './components/generated/UtilizationReportView';
import { CustomerProjectsManagerButton } from './components/generated/CustomerProjectsManagerButton';
import { SkillManagementButton } from './components/generated/SkillManagementButton';
import { CustomerProvider } from './contexts/CustomerContext';

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
    return (
      <CustomerProvider>
        <UtilizationReportView />
        <CustomerProjectsManagerButton />
        <SkillManagementButton className="fixed bottom-4 right-44 z-40" label="Skills" />
      </CustomerProvider>
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