import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Project {
  id: string;
  name: string;
  customer: string;
  createdAt: Date;
}

interface CustomerContextType {
  customers: string[];
  projects: Project[];
  addCustomer: (name: string) => void;
  removeCustomer: (name: string) => void;
  updateCustomer: (oldName: string, newName: string) => void;
  setCustomers: (customers: string[]) => void;
  addProject: (name: string, customer: string) => void;
  removeProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  getProjectsByCustomer: (customer: string) => Project[];
  isLoading: boolean;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

interface CustomerProviderProps {
  children: ReactNode;
  initialCustomers?: string[];
}

export function CustomerProvider({ children, initialCustomers = [] }: CustomerProviderProps) {
  const [customers, setCustomers] = useState<string[]>(initialCustomers);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Lade gespeicherte Kunden und Projekte aus dem localStorage beim Start
  useEffect(() => {
    const savedCustomers = localStorage.getItem('customers');
    const savedProjects = localStorage.getItem('projects');
    
    if (savedCustomers) {
      try {
        const parsedCustomers = JSON.parse(savedCustomers);
        setCustomers(parsedCustomers);
      } catch (error) {
        console.error('Fehler beim Laden der gespeicherten Kunden:', error);
      }
    }
    
    if (savedProjects) {
      try {
        const parsedProjects = JSON.parse(savedProjects);
        setProjects(parsedProjects);
      } catch (error) {
        console.error('Fehler beim Laden der gespeicherten Projekte:', error);
      }
    }
  }, []);

  // Speichere Kunden und Projekte im localStorage bei Änderungen
  useEffect(() => {
    localStorage.setItem('customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);

  const addCustomer = (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName && !customers.includes(trimmedName)) {
      setCustomers(prev => [...prev, trimmedName]);
    }
  };

  const removeCustomer = (name: string) => {
    setCustomers(prev => prev.filter(c => c !== name));
  };

  const updateCustomer = (oldName: string, newName: string) => {
    const trimmedNewName = newName.trim();
    if (trimmedNewName && trimmedNewName !== oldName) {
      setCustomers(prev => prev.map(c => c === oldName ? trimmedNewName : c));
      // Aktualisiere auch alle Projekte mit dem alten Kundennamen
      setProjects(prev => prev.map(p => p.customer === oldName ? { ...p, customer: trimmedNewName } : p));
    }
  };

  const addProject = (name: string, customer: string) => {
    const trimmedName = name.trim();
    const trimmedCustomer = customer.trim();
    
    if (trimmedName && trimmedCustomer) {
      // Prüfe ob das Projekt bereits für diesen Kunden existiert
      const existingProject = projects.find(p => 
        p.name.toLowerCase() === trimmedName.toLowerCase() && 
        p.customer.toLowerCase() === trimmedCustomer.toLowerCase()
      );
      
      if (!existingProject) {
        const newProject: Project = {
          id: Date.now().toString(),
          name: trimmedName,
          customer: trimmedCustomer,
          createdAt: new Date()
        };
        setProjects(prev => [...prev, newProject]);
      }
    }
  };

  const removeProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const getProjectsByCustomer = (customer: string): Project[] => {
    return projects.filter(p => p.customer.toLowerCase() === customer.toLowerCase());
  };

  const value: CustomerContextType = {
    customers,
    projects,
    addCustomer,
    removeCustomer,
    updateCustomer,
    setCustomers,
    addProject,
    removeProject,
    updateProject,
    getProjectsByCustomer,
    isLoading
  };

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomers(): CustomerContextType {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomers must be used within a CustomerProvider');
  }
  return context;
}
