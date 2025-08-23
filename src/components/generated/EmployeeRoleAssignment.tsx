import React, { useState, useEffect } from 'react';
import { Plus, Star, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import RoleSelectionModal from './RoleSelectionModal';

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
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // console.log entfernt
  // console.log entfernt
  // console.log entfernt

  // Verfügbare Rollen laden
  const loadAvailableRoles = async () => {
    try {
      // console.log entfernt
      
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
      // console.log entfernt
      
    } catch (error) {
      // console.error entfernt
      setError('Fehler beim Laden der verfügbaren Rollen');
    }
  };

  // Zugewiesene Rollen laden
  const loadAssignedRoles = async () => {
    try {
      // console.log entfernt
      
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
      // console.log entfernt
      
    } catch (error) {
      // console.error entfernt
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
      // console.error entfernt
    } finally {
      setLoading(false);
    }
  };



  // Rollen-Level ändern
  const updateRoleLevel = async (assignmentId: string, newLevel: number) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
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
      // console.log entfernt
      
      // Zugewiesene Rollen neu laden
      await loadAssignedRoles();
      
    } catch (error: any) {
      // console.error entfernt
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
      // console.log entfernt
      
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

      // console.log entfernt
      
      // Zugewiesene Rollen neu laden
      await loadAssignedRoles();
      
    } catch (error: any) {
      // console.error entfernt
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
  const RoleAssignmentCard: React.FC<{ role: AssignedRole }> = ({ role }) => {
    // Finde die Beschreibung der Rolle aus den verfügbaren Rollen
    const roleDetails = availableRoles.find(r => r.id === role.roleId);
    const roleDescription = roleDetails?.description || '';
    
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4 hover:from-emerald-100 hover:to-green-100 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-emerald-900">{role.roleName}</h4>
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
        
        {roleDescription && (
          <div className="mt-2 text-xs text-emerald-600 bg-emerald-100 rounded p-2">
            {roleDescription}
          </div>
        )}
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

      {/* Rollen hinzufügen */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Weitere Rollen hinzufügen
        </h4>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-3">
            Weisen Sie {employeeName} weitere Rollen zu. Es stehen {unassignedRoles.length} Rollen zur Verfügung.
          </p>
          <button
            onClick={() => setIsRoleModalOpen(true)}
            disabled={unassignedRoles.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Rollen zuweisen ({unassignedRoles.length} verfügbar)
          </button>
        </div>
      </div>

      {/* Role Selection Modal */}
      <RoleSelectionModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        employeeId={employeeId}
        employeeName={employeeName}
        onRoleAssigned={() => {
          // Rolle wurde zugewiesen - Daten neu laden
          loadAssignedRoles();
        }}
      />
    </div>
  );
};

export default EmployeeRoleAssignment;
