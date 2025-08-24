import { useMemo, useState } from 'react';
import { Container, Theme } from './settings/types';
import { OverviewPage } from './components/generated/OverviewPage';
import EmployeeDetailView from './components/generated/EmployeeDetailView';
import ProjectManagementDashboard from './components/generated/ProjectManagementDashboard';
import ProjectCreationWizard, { ProjectCreationData } from './components/generated/ProjectCreationWizard';

let theme: Theme = 'light';
// only use 'centered' container for standalone components, never for full page apps or websites.
let container: Container = 'none';

function App() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'overview' | 'projects' | 'employee' | 'wizard'>('overview');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  function setTheme(theme: Theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  setTheme(theme);

  const handleEmployeeClick = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setCurrentView('employee');
  };

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    // For now, we'll just log the project click - in a real app this would navigate to project details
    console.log('Project clicked:', projectId);
  };

  const handleBackToOverview = () => {
    setSelectedEmployeeId(null);
    setSelectedProjectId(null);
    setCurrentView('overview');
  };

  const handleBackToProjects = () => {
    setSelectedEmployeeId(null);
    setSelectedProjectId(null);
    setCurrentView('projects');
  };

  const handleWizardSave = (projectData: ProjectCreationData) => {
    console.log('Project created:', projectData);
    // Here you would typically save the project data to your backend
    // For now, we'll just close the wizard and show the projects dashboard
    setIsWizardOpen(false);
    setCurrentView('projects');
  };

  const handleWizardClose = () => {
    setIsWizardOpen(false);
    setCurrentView('projects');
  };

  const generatedComponent = useMemo(() => {
    // THIS IS WHERE THE TOP LEVEL GENRATED COMPONENT WILL BE RETURNED!
    if (currentView === 'wizard') {
      return (
        <div className="min-h-screen bg-gray-50">
          <ProjectManagementDashboard onProjectClick={handleProjectClick} onBackToOverview={handleBackToOverview} />
          <ProjectCreationWizard 
            isOpen={isWizardOpen}
            onClose={handleWizardClose}
            onSave={handleWizardSave}
          />
        </div>
      );
    }
    if (currentView === 'employee' && selectedEmployeeId) {
      return <EmployeeDetailView employeeId={selectedEmployeeId} onBack={handleBackToProjects} />;
    }
    if (currentView === 'overview') {
      return <OverviewPage onEmployeeClick={handleEmployeeClick} />; 
    }
    return <ProjectManagementDashboard onProjectClick={handleProjectClick} onBackToOverview={handleBackToOverview} />; // %EXPORT_STATEMENT%
  }, [selectedEmployeeId, currentView, selectedProjectId, isWizardOpen]);

  // Navigation component
  const Navigation = () => (
    <nav className="bg-white shadow-sm border-b p-4">
      <div className="flex space-x-4">
        <button 
          onClick={() => setCurrentView('overview')}
          className={`px-3 py-2 rounded ${currentView === 'overview' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Overview
        </button>
        <button 
          onClick={() => setCurrentView('projects')}
          className={`px-3 py-2 rounded ${currentView === 'projects' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Projects
        </button>
        <button 
          onClick={() => setCurrentView('wizard')}
          className={`px-3 py-2 rounded ${currentView === 'wizard' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Wizard
        </button>
      </div>
    </nav>
  );

  if (container === 'centered') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        {generatedComponent}
      </div>
    );
  } else {
    return (
      <div>
        <Navigation />
        {generatedComponent}
      </div>
    );
  }
}

export default App;