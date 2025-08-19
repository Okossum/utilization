import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface Role {
  id: string;
  name: string;
  description: string;
  category: string;
  createdAt: any;
  isActive: boolean;
}

interface RoleContextType {
  roles: Role[];
  loading: boolean;
  error: string | null;
  loadRoles: () => Promise<void>;
  createRole: (roleData: Omit<Role, 'id' | 'createdAt'>) => Promise<Role>;
  updateRole: (id: string, updates: Partial<Role>) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  getActiveRoles: () => Role[];
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rolesData = await response.json();
      setRoles(rolesData);
    } catch (error: any) {
      console.error('Fehler beim Laden der Rollen:', error);
      setError(error.message || 'Fehler beim Laden der Rollen');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createRole = useCallback(async (roleData: Omit<Role, 'id' | 'createdAt'>) => {
    if (!token) throw new Error('Kein Token verfügbar');
    
    const response = await fetch('/api/roles', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(roleData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Fehler beim Erstellen der Rolle');
    }

    const result = await response.json();
    setRoles(prev => [...prev, result.role]);
    return result.role;
  }, [token]);

  const updateRole = useCallback(async (id: string, updates: Partial<Role>) => {
    if (!token) throw new Error('Kein Token verfügbar');
    
    const response = await fetch(`/api/roles/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Fehler beim Aktualisieren der Rolle');
    }

    setRoles(prev => prev.map(role => 
      role.id === id ? { ...role, ...updates } : role
    ));
  }, [token]);

  const deleteRole = useCallback(async (id: string) => {
    if (!token) throw new Error('Kein Token verfügbar');
    
    const response = await fetch(`/api/roles/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Fehler beim Löschen der Rolle');
    }

    setRoles(prev => prev.filter(role => role.id !== id));
  }, [token]);

  const getActiveRoles = useCallback(() => {
    return roles.filter(role => role.isActive);
  }, [roles]);

  // Rollen beim Mount laden
  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const value: RoleContextType = {
    roles,
    loading,
    error,
    loadRoles,
    createRole,
    updateRole,
    deleteRole,
    getActiveRoles
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRoles() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRoles must be used within a RoleProvider');
  }
  return context;
}
