import React, { useState, useEffect } from 'react';
import { Plus, Star, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Role {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface AssignedRole {
  id: string;
  roleId: string;
  roleName: string;
  level: number; // 1-5 Sterne
  assignedAt: any;
  lastUpdated: any;
}

interface EmployeeRoleAssignmentProps {
  employeeId: string;
  employeeName: string;
}

const EmployeeRoleAssignment: React.FC<EmployeeRoleAssignmentProps> = ({
  employeeId,
  employeeName,
}) => {
  const { token } = useAuth();
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [assignedRoles, setAssignedRoles] = useState<AssignedRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log('🚀 EmployeeRoleAssignment Komponente wird gerendert');
  console.log('👤 employeeId:', employeeId);
  console.log('👤 employeeName:', employeeName);

  // Verfügbare Rollen laden
  const loadAvailableRoles = async () => {
    try {
      console.log('🔍 loadAvailableRoles() aufgerufen');
      
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
      setAvailableRoles(rolesData);
      console.log(`✅ ${rolesData.length} verfügbare Rollen geladen`);
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der verfügbaren Rollen:', error);
      setError('Fehler beim Laden der verfügbaren Rollen');
    }
  };

  // Zugewiesene Rollen laden
  const loadAssignedRoles = async () => {
    try {
      console.log('🔍 loadAssignedRoles() aufgerufen für:', employeeId);
      
      const response = await fetch(`/api/employee-roles/${encodeURIComponent(employeeId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rolesData = await response.json();
      setAssignedRoles(rolesData);
      console.log(`✅ ${rolesData.length} zugewiesene Rollen für ${employeeName} geladen`);
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der zugewiesenen Rollen:', error);
      setError('Fehler beim Laden der zugewiesenen Rollen');
    }
  };

  // Alle Daten laden
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadAvailableRoles(),
        loadAssignedRoles()
      ]);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  // Rolle zuweisen
  const assignRole = async (roleId: string, roleName: string, level: number) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log(`🔍 Weise Rolle ${roleName} zu (Level ${level})`);
      
      const response = await fetch(`/api/employee-roles/${encodeURIComponent(employeeId)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roleId, level })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Zuweisen der Rolle');
      }

      const result = await response.json();
      console.log('✅ Rolle erfolgreich zugewiesen:', result.assignment);
      
      // Zugewiesene Rollen neu laden
      await loadAssignedRoles();
      
    } catch (error: any) {
      console.error('❌ Fehler beim Zuweisen der Rolle:', error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rollen-Level ändern
  const updateRoleLevel = async (assignmentId: string, newLevel: number) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log(`🔍 Ändere Rollen-Level auf ${newLevel}`);
      
      const response = await fetch(`/api/employee-roles/${encodeURIComponent(employeeId)}/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ level: newLevel })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Ändern des Rollen-Levels');
      }

      const result = await response.json();
      console.log('✅ Rollen-Level erfolgreich geändert:', result.assignment);
      
      // Zugewiesene Rollen neu laden
      await loadAssignedRoles();
      
    } catch (error: any) {
      console.error('❌ Fehler beim Ändern des Rollen-Levels:', error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rollen-Zuweisung entfernen
  const removeRole = async (assignmentId: string, roleName: string) => {
    if (!confirm(`Möchten Sie die Rolle "${roleName}" wirklich entfernen?`)) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log(`🔍 Entferne Rolle ${roleName}`);
      
      const response = await fetch(`/api/employee-roles/${encodeURIComponent(employeeId)}/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Entfernen der Rolle');
      }

      console.log('✅ Rolle erfolgreich entfernt');
      
      // Zugewiesene Rollen neu laden
      await loadAssignedRoles();
      
    } catch (error: any) {
      console.error('❌ Fehler beim Entfernen der Rolle:', error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verfügbare (nicht zugewiesene) Rollen berechnen
  const getUnassignedRoles = () => {
    const assignedRoleIds = assignedRoles.map(role => role.roleId);
    return availableRoles.filter(role => !assignedRoleIds.includes(role.id));
  };

  // Sterne-Bewertung Component
  const StarRating: React.FC<{
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
  }> = ({ value, onChange, disabled = false }) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !disabled && onChange(star)}
            disabled={disabled}
            className={`text-lg ${
              star <= value 
                ? 'text-yellow-400' 
                : 'text-gray-300'
            } ${
              disabled 
                ? 'cursor-not-allowed' 
                : 'hover:text-yellow-300 cursor-pointer'
            }`}
          >
            <Star className="w-5 h-5 fill-current" />
          </button>
        ))}
      </div>
    );
  };

  // RoleAssignmentCard Component
  const RoleAssignmentCard: React.FC<{ role: AssignedRole }> = ({ role }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">{role.roleName}</h4>
        <button
          onClick={() => removeRole(role.id, role.roleName)}
          disabled={isSubmitting}
          className="text-red-600 hover:text-red-700 disabled:opacity-50"
          title="Rolle entfernen"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Bewertung:</span>
        <StarRating
          value={role.level}
          onChange={(newLevel) => updateRoleLevel(role.id, newLevel)}
          disabled={isSubmitting}
        />
        <span className="text-sm text-gray-500">({role.level}/5)</span>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        Zugewiesen: {role.assignedAt?.toDate ? 
          role.assignedAt.toDate().toLocaleDateString('de-DE') : 
          'Unbekannt'
        }
      </div>
    </div>
  );

  // AddRoleCard Component
  const AddRoleCard: React.FC<{ role: Role }> = ({ role }) => {
    const [selectedLevel, setSelectedLevel] = useState(3);
    
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">{role.name}</h4>
        {role.description && (
          <p className="text-sm text-gray-600 mb-3">{role.description}</p>
        )}
        {role.category && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-3">
            {role.category}
          </span>
        )}
        
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-gray-600">Bewertung:</span>
          <StarRating
            value={selectedLevel}
            onChange={setSelectedLevel}
            disabled={isSubmitting}
          />
          <span className="text-sm text-gray-500">({selectedLevel}/5)</span>
        </div>
        
        <button
          onClick={() => assignRole(role.id, role.name, selectedLevel)}
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Zuweisen
        </button>
      </div>
    );
  };

  // Beim Laden der Komponente
  useEffect(() => {
    if (token && employeeId) {
      loadData();
    }
  }, [token, employeeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Lade Rollen...</span>
      </div>
    );
  }

  const unassignedRoles = getUnassignedRoles();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Rollen-Zuweisungen</h3>
        <p className="text-sm text-gray-600 mt-1">
          Verwalten Sie die Rollen und Bewertungen für {employeeName}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Zugewiesene Rollen */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Zugewiesene Rollen ({assignedRoles.length})
        </h4>
        
        {assignedRoles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Noch keine Rollen zugewiesen.</p>
            <p className="text-sm">Weisen Sie eine Rolle aus den verfügbaren Rollen unten zu.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {assignedRoles.map((role) => (
              <RoleAssignmentCard key={role.id} role={role} />
            ))}
          </div>
        )}
      </div>

      {/* Verfügbare Rollen */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Verfügbare Rollen ({unassignedRoles.length})
        </h4>
        
        {unassignedRoles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Alle verfügbaren Rollen sind bereits zugewiesen.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {unassignedRoles.map((role) => (
              <AddRoleCard key={role.id} role={role} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeRoleAssignment;
