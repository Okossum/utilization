import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Role {
  id: string;
  name: string;
  description: string;
  category: string;
  createdAt: any;
  isActive: boolean;
}

interface RoleFormData {
  name: string;
  description: string;
  category: string;
}

const RoleManagement: React.FC = () => {
  const { token } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    category: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rollen laden
  const loadRoles = async () => {
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
      setRoles(rolesData);
      // console.log entfernt
      
    } catch (error) {
      // console.error entfernt
      setError('Fehler beim Laden der Rollen');
    } finally {
      setLoading(false);
    }
  };

  // Neue Rolle erstellen
  const createRole = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // console.log entfernt
      
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen der Rolle');
      }

      const result = await response.json();
      // console.log entfernt
      
      // Rolle zu Liste hinzufügen
      setRoles(prev => [...prev, result.role]);
      
      // Dialog schließen und Form zurücksetzen
      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '', category: '' });
      
    } catch (error: any) {
      // console.error entfernt
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rolle bearbeiten
  const updateRole = async () => {
    if (!editingRole) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // console.log entfernt
      
      const response = await fetch(`/api/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Bearbeiten der Rolle');
      }

      const result = await response.json();
      // console.log entfernt
      
      // Rolle in Liste aktualisieren
      setRoles(prev => prev.map(role => 
        role.id === editingRole.id ? result.role : role
      ));
      
      // Dialog schließen und Form zurücksetzen
      setIsEditDialogOpen(false);
      setEditingRole(null);
      setFormData({ name: '', description: '', category: '' });
      
    } catch (error: any) {
      // console.error entfernt
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rolle löschen
  const deleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Möchten Sie die Rolle "${roleName}" wirklich löschen?`)) {
      return;
    }
    
    try {
      // console.log entfernt
      
      const response = await fetch(`/api/roles/${roleId}`, {
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

      // console.log entfernt
      
      // Rolle aus Liste entfernen
      setRoles(prev => prev.filter(role => role.id !== roleId));
      
    } catch (error: any) {
      // console.error entfernt
      setError(error.message);
    }
  };

  // Bearbeiten-Dialog öffnen
  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      category: role.category
    });
    setIsEditDialogOpen(true);
  };

  // Dialog schließen
  const closeDialogs = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setEditingRole(null);
    setFormData({ name: '', description: '', category: '' });
    setError(null);
  };

  // Beim Laden der Komponente
  useEffect(() => {
    if (token) {
      loadRoles();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Lade Rollen...</span>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Rollen-Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Verwalten Sie hier alle verfügbaren Rollen für die Mitarbeiter-Zuweisungen
          </p>
        </div>
        
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Neue Rolle
        </button>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}
      
      {/* Roles Table */}
      {roles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Noch keine Rollen vorhanden.</p>
          <p className="text-sm">Erstellen Sie die erste Rolle mit dem Button oben.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                  Name
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                  Kategorie
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                  Beschreibung
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                  Erstellt
                </th>
                <th className="border border-gray-200 px-4 py-3 text-right text-sm font-medium text-gray-900">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3 font-medium">
                    {role.name}
                  </td>
                  <td className="border border-gray-200 px-4 py-3">
                    {role.category && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {role.category}
                      </span>
                    )}
                  </td>
                  <td className="border border-gray-200 px-4 py-3 max-w-xs truncate">
                    {role.description || '-'}
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-sm text-gray-600">
                    {role.createdAt?.toDate ? 
                      role.createdAt.toDate().toLocaleDateString('de-DE') : 
                      'Unbekannt'
                    }
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditDialog(role)}
                        className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:bg-blue-50 rounded"
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteRole(role.id, role.name)}
                        className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:bg-red-50 rounded"
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Create Dialog */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={closeDialogs} />
          <div className="relative bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Neue Rolle erstellen</h3>
              <button
                onClick={closeDialogs}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rollenname *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="z.B. Backend Developer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategorie
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="z.B. Development, Management"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beschreibung
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optionale Beschreibung der Rolle..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={closeDialogs}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={createRole}
                disabled={!formData.name.trim() || isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={closeDialogs} />
          <div className="relative bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Rolle bearbeiten</h3>
              <button
                onClick={closeDialogs}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rollenname *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="z.B. Backend Developer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategorie
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="z.B. Development, Management"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beschreibung
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optionale Beschreibung der Rolle..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={closeDialogs}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={updateRole}
                disabled={!formData.name.trim() || isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;