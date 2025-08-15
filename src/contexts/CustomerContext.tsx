import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CustomerContextType {
  customers: string[];
  addCustomer: (name: string) => void;
  removeCustomer: (name: string) => void;
  updateCustomer: (oldName: string, newName: string) => void;
  setCustomers: (customers: string[]) => void;
  isLoading: boolean;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

interface CustomerProviderProps {
  children: ReactNode;
  initialCustomers?: string[];
}

export function CustomerProvider({ children, initialCustomers = [] }: CustomerProviderProps) {
  const [customers, setCustomers] = useState<string[]>(initialCustomers);
  const [isLoading, setIsLoading] = useState(false);

  // Lade gespeicherte Kunden aus dem localStorage beim Start
  useEffect(() => {
    const savedCustomers = localStorage.getItem('customers');
    if (savedCustomers) {
      try {
        const parsedCustomers = JSON.parse(savedCustomers);
        setCustomers(parsedCustomers);
      } catch (error) {
        console.error('Fehler beim Laden der gespeicherten Kunden:', error);
      }
    }
  }, []);

  // Speichere Kunden im localStorage bei Änderungen
  useEffect(() => {
    localStorage.setItem('customers', JSON.stringify(customers));
  }, [customers]);

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
    }
  };

  const value: CustomerContextType = {
    customers,
    addCustomer,
    removeCustomer,
    updateCustomer,
    setCustomers,
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
