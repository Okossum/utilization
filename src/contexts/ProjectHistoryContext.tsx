import React, { createContext, useContext, useState, useCallback } from 'react';

// Separate historische Daten - komplett getrennt von aktuellen Geschäftsdaten
interface HistoricalCustomer {
  id: string;
  name: string;
}

interface HistoricalProject {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
}

interface ProjectHistoryContextType {
  // Historische Kunden (nur für Projektvergangenheit)
  historicalCustomers: HistoricalCustomer[];
  addHistoricalCustomer: (name: string) => Promise<HistoricalCustomer>;
  
  // Historische Projekte (nur für Projektvergangenheit)
  historicalProjects: HistoricalProject[];
  addHistoricalProject: (name: string, customerId: string, customerName: string) => Promise<HistoricalProject>;
  getHistoricalProjectsForCustomer: (customerId: string) => HistoricalProject[];
}

const ProjectHistoryContext = createContext<ProjectHistoryContextType | null>(null);

export function ProjectHistoryProvider({ children }: { children: React.ReactNode }) {
  const [historicalCustomers, setHistoricalCustomers] = useState<HistoricalCustomer[]>([]);
  const [historicalProjects, setHistoricalProjects] = useState<HistoricalProject[]>([]);

  const addHistoricalCustomer = useCallback(async (name: string): Promise<HistoricalCustomer> => {
    // Prüfen ob Kunde bereits existiert (in historischen Daten)
    const existing = historicalCustomers.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      return existing;
    }

    const newCustomer: HistoricalCustomer = {
      id: Date.now().toString(),
      name: name.trim()
    };

    setHistoricalCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  }, [historicalCustomers]);

  const addHistoricalProject = useCallback(async (
    name: string, 
    customerId: string, 
    customerName: string
  ): Promise<HistoricalProject> => {
    // Prüfen ob Projekt bereits existiert (in historischen Daten für diesen Kunden)
    const existing = historicalProjects.find(p => 
      p.customerId === customerId && 
      p.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      return existing;
    }

    const newProject: HistoricalProject = {
      id: Date.now().toString(),
      name: name.trim(),
      customerId,
      customerName
    };

    setHistoricalProjects(prev => [...prev, newProject]);
    return newProject;
  }, [historicalProjects]);

  const getHistoricalProjectsForCustomer = useCallback((customerId: string): HistoricalProject[] => {
    return historicalProjects.filter(p => p.customerId === customerId);
  }, [historicalProjects]);

  return (
    <ProjectHistoryContext.Provider value={{
      historicalCustomers,
      addHistoricalCustomer,
      historicalProjects,
      addHistoricalProject,
      getHistoricalProjectsForCustomer
    }}>
      {children}
    </ProjectHistoryContext.Provider>
  );
}

export function useProjectHistory() {
  const context = useContext(ProjectHistoryContext);
  if (!context) {
    throw new Error('useProjectHistory must be used within a ProjectHistoryProvider');
  }
  return context;
}
