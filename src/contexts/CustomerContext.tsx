import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { customerService, projectService } from '../lib/firebase-services';

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
  const [isHydrated, setIsHydrated] = useState(false);

  // Firestore laden (keine Migration erforderlich)
  useEffect(() => {
    let isCancelled = false;
    (async () => {
      try {
        const [fsCustomers, fsProjects] = await Promise.all([
          customerService.getAll(),
          projectService.getAll(),
        ]);
        if (isCancelled) return;
        setCustomers(fsCustomers.map(c => c.name));
        setProjects(fsProjects.map(p => ({ id: p.id, name: p.name, customer: p.customer, createdAt: p.createdAt })));
      } catch (e) {
  
      } finally {
        if (!isCancelled) setIsHydrated(true);
      }
    })();
    return () => { isCancelled = true; };
  }, []);

  // Speichere Kunden und Projekte im localStorage bei Änderungen
  // Speichern in Firestore
  useEffect(() => {
    // kein autosave nötig; Methoden unten persistieren direkt
  }, [customers]);

  useEffect(() => {
    // kein autosave nötig; Methoden unten persistieren direkt
  }, [projects]);

  const addCustomer = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (customers.includes(trimmedName)) return;
    // Persistieren
    const id = await customerService.save({ name: trimmedName, createdAt: new Date(), updatedAt: new Date() } as any);
    // Lokalen Zustand aktualisieren
    setCustomers(prev => [...prev, trimmedName]);
  };

  const removeCustomer = async (name: string) => {
    // Soft-delete via Name nicht möglich ohne ID; für Management-UI beibehalten, hier kein globales Löschen auf Ruf aus Dossier
    setCustomers(prev => prev.filter(c => c !== name));
  };

  const updateCustomer = async (oldName: string, newName: string) => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName || trimmedNewName === oldName) return;
    // Kunden-Dokument per Name finden (einfach): alle Kunden laden, passenden updaten
    const all = await customerService.getAll();
    const match = all.find(c => c.name === oldName);
    if (match) {
      await customerService.update(match.id, { name: trimmedNewName });
    }
    setCustomers(prev => prev.map(c => c === oldName ? trimmedNewName : c));
    setProjects(prev => prev.map(p => p.customer === oldName ? { ...p, customer: trimmedNewName } : p));
  };

  const addProject = async (name: string, customer: string) => {
    const trimmedName = name.trim();
    const trimmedCustomer = customer.trim();
    if (!trimmedName || !trimmedCustomer) return;
    const exists = projects.find(p => p.name.toLowerCase() === trimmedName.toLowerCase() && p.customer.toLowerCase() === trimmedCustomer.toLowerCase());
    if (exists) return;
    const id = await projectService.save({ name: trimmedName, customer: trimmedCustomer });
    setProjects(prev => [...prev, { id, name: trimmedName, customer: trimmedCustomer, createdAt: new Date() }]);
  };

  const removeProject = async (id: string) => {
    await projectService.delete(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const toSave: any = {};
    if (typeof updates.name === 'string') toSave.name = updates.name;
    if (typeof updates.customer === 'string') toSave.customer = updates.customer;
    if (Object.keys(toSave).length > 0) await projectService.update(id, toSave);
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
