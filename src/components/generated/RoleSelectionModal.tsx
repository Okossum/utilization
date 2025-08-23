import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Star, Loader2, Search } from 'lucide-react';
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
  level: number;
  assignedAt: any;
  lastUpdated: any;
}

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  onRoleAssigned: () => void; // Callback wenn eine Rolle zugewiesen wurde
}

const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  onRoleAssigned,
}) => {
  const { token } = useAuth();
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [assignedRoles, setAssignedRoles] = useState<AssignedRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Verfügbare Rollen laden
  const loadAvailableRoles = async () => {
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
      setAvailableRoles(rolesData);
      
    } catch (error) {
      // console.error entfernt
      setError('Fehler beim Laden der verfügbaren Rollen');
    }
  };

  // Zugewiesene Rollen laden
  const loadAssignedRoles = async () => {
    try {
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

  // Rolle zuweisen
  const assignRole = async (roleId: string, roleName: string, level: number) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
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

      // Erfolgreich zugewiesen - Daten neu laden und Callback aufrufen
      await loadAssignedRoles();
      onRoleAssigned();
      
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

  // Gefilterte Rollen basierend auf Suche und Kategorie
  const getFilteredRoles = () => {
    const unassigned = getUnassignedRoles();
    
    return unassigned.filter(role => {
      const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           role.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || role.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  };

  // Verfügbare Kategorien
  const getAvailableCategories = () => {
    const categories = Array.from(new Set(availableRoles.map(role => role.category)));
    return categories.filter(cat => cat && cat.trim() !== '');
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

  // RoleCard Component
  const RoleCard: React.FC<{ role: Role }> = ({ role }) => {
    const [selectedLevel, setSelectedLevel] = useState(3);
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="mb-3">
          <h4 className="font-medium text-gray-900 mb-1">{role.name}</h4>
          {role.description && (
            <p className="text-sm text-gray-600 mb-2">{role.description}</p>
          )}
          {role.category && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {role.category}
            </span>
          )}
        </div>
        
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
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

  // Beim Öffnen des Modals Daten laden
  useEffect(() => {
    if (isOpen && token && employeeId) {
      loadData();
    }
  }, [isOpen, token, employeeId]);

  // Reset bei Schließen
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedCategory('');
      setError(null);
    }
  }, [isOpen]);

  const filteredRoles = getFilteredRoles();
  const categories = getAvailableCategories();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Rollen zuweisen
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Neue Rollen für {employeeName} auswählen und zuweisen
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </header>

            {/* Filters */}
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Rollen durchsuchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Category Filter */}
                {categories.length > 0 && (
                  <div className="sm:w-48">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Alle Kategorien</option>
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Loading */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Lade verfügbare Rollen...</span>
                </div>
              ) : (
                <>
                  {/* Results Count */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      {filteredRoles.length} von {getUnassignedRoles().length} verfügbaren Rollen
                      {searchTerm && ` (gefiltert nach "${searchTerm}")`}
                      {selectedCategory && ` in Kategorie "${selectedCategory}"`}
                    </p>
                  </div>

                  {/* Roles Grid */}
                  {filteredRoles.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      {getUnassignedRoles().length === 0 ? (
                        <p>Alle verfügbaren Rollen sind bereits zugewiesen.</p>
                      ) : (
                        <p>Keine Rollen gefunden, die den Filterkriterien entsprechen.</p>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredRoles.map((role) => (
                        <RoleCard key={role.id} role={role} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Schließen
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RoleSelectionModal;
