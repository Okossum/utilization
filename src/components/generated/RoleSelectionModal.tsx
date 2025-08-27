import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  Star, 
  Loader2, 
  Search, 
  ChevronDown, 
  ChevronRight,
  Check,
  Folder,
  FolderOpen,
  User,
  CheckSquare,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addRoleToUtilizationData, getPersonSkillsRolesFromHub } from '../../lib/utilization-hub-services';

interface Role {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName?: string;
}

interface RoleCategory {
  id: string;
  name: string;
  description?: string;
}

interface RoleTask {
  id: string;
  task: string;
  description: string;
  outputs: string;
  roleId: string;
}

interface AssignedRole {
  id: string;
  roleId: string;
  roleName: string;
  level: number;
  assignedAt: any;
  lastUpdated: any;
}

interface EmployeeRoleAssignment {
  employeeId: string;
  categoryId: string;
  roleId: string;
  selectedTasks: string[];
  level: number;
  assignedAt: Date;
}

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  onRoleAssigned: () => void;
}

const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  onRoleAssigned,
}) => {
  const { token, loading: authLoading } = useAuth();
  
  // State für hierarchische Auswahl
  const [categories, setCategories] = useState<RoleCategory[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleTasks, setRoleTasks] = useState<Record<string, RoleTask[]>>({});
  const [assignedRoles, setAssignedRoles] = useState<AssignedRole[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Hierarchische Auswahl State
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  
  // Task-Auswahl State
  const [selectedTasks, setSelectedTasks] = useState<Record<string, string[]>>({});
  const [roleLevels, setRoleLevels] = useState<Record<string, number>>({});

  // Kategorien laden
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/role-categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const categoriesData = await response.json();
      setCategories(categoriesData);
      
    } catch (error) {
      setError('Fehler beim Laden der Kategorien');
    }
  };

  // Rollen laden
  const loadRoles = async () => {
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
      
    } catch (error) {
      setError('Fehler beim Laden der Rollen');
    }
  };



  // Zugewiesene Rollen aus utilizationData Hub laden
  const loadAssignedRoles = async () => {
    try {
      console.log('🔄 Lade zugewiesene Rollen aus utilizationData Hub für ID:', employeeId);
      
      const { assignedRoles: hubRoles } = await getPersonSkillsRolesFromHub(employeeId);
      
      // Konvertiere utilizationData Format zu Modal Format
      const convertedRoles = hubRoles.map(role => ({
        id: role.roleId,
        roleId: role.roleId,
        roleName: role.roleName,
        level: role.level || 3,
        assignedAt: role.assignedAt,
        lastUpdated: role.updatedAt
      }));
      
      console.log('✅ Rollen aus utilizationData Hub geladen:', convertedRoles);
      setAssignedRoles(convertedRoles);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Rollen aus utilizationData Hub:', error);
      // Fallback: Versuche Legacy API
      try {
        const response = await fetch(`/api/employee-roles/${encodeURIComponent(employeeId)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const rolesData = await response.json();
          console.log('📋 Fallback: Rollen aus Legacy API geladen:', rolesData);
          setAssignedRoles(rolesData);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (legacyError) {
        console.error('❌ Auch Legacy API fehlgeschlagen:', legacyError);
        setError('Fehler beim Laden der zugewiesenen Rollen');
      }
    }
  };

  // Alle Tasks für alle Rollen laden
  const loadAllRoleTasks = async () => {
    try {
      // Alle Tasks auf einmal laden (ohne roleId Filter)
      const response = await fetch('/api/role-tasks', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const allTasks = await response.json();
      
      // Tasks nach Rollen gruppieren
      const tasksByRole: Record<string, RoleTask[]> = {};
      const selectedTasksByRole: Record<string, string[]> = {};
      const levelsByRole: Record<string, number> = {};
      
      allTasks.forEach((task: RoleTask) => {
        if (!tasksByRole[task.roleId]) {
          tasksByRole[task.roleId] = [];
          selectedTasksByRole[task.roleId] = [];
          levelsByRole[task.roleId] = 3; // Standard Level
        }
        tasksByRole[task.roleId].push(task);
        selectedTasksByRole[task.roleId].push(task.id); // Alle standardmäßig ausgewählt
      });
      
      setRoleTasks(tasksByRole);
      setSelectedTasks(selectedTasksByRole);
      setRoleLevels(levelsByRole);
      
    } catch (error) {
      setError('Fehler beim Laden der Tasks');
    }
  };

  // Alle Daten laden
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadCategories(),
        loadRoles(),
        loadAssignedRoles(),
        loadAllRoleTasks() // Alle Tasks auf einmal laden
      ]);
    } catch (error) {
      // Fehlerbehandlung bereits in den einzelnen Funktionen
    } finally {
      setLoading(false);
    }
  };

  // Kategorie expandieren/kollabieren
  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Rolle expandieren/kollabieren
  const toggleRole = (roleId: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(roleId)) {
      newExpanded.delete(roleId);
    } else {
      newExpanded.add(roleId);
    }
    setExpandedRoles(newExpanded);
  };

  // Task-Auswahl togglen
  const toggleTask = (roleId: string, taskId: string) => {
    setSelectedTasks(prev => {
      const currentSelected = prev[roleId] || [];
      const newSelected = currentSelected.includes(taskId)
        ? currentSelected.filter(id => id !== taskId)
        : [...currentSelected, taskId];
      
      return {
        ...prev,
        [roleId]: newSelected
      };
    });
  };

  // Alle Tasks einer Rolle auswählen/abwählen
  const toggleAllTasks = (roleId: string, selectAll: boolean) => {
    const tasks = roleTasks[roleId] || [];
    setSelectedTasks(prev => ({
      ...prev,
      [roleId]: selectAll ? tasks.map(task => task.id) : []
    }));
  };

  // Bewertungslevel ändern
  const updateRoleLevel = (roleId: string, level: number) => {
    setRoleLevels(prev => ({
      ...prev,
      [roleId]: level
    }));
  };

  // Rolle mit Tasks zuweisen
  const assignRoleWithTasks = async (categoryId: string, roleId: string) => {
    const tasks = roleTasks[roleId] || [];
    const selectedTaskIds = selectedTasks[roleId] || [];
    const level = roleLevels[roleId] || 3;

    // Rollenname für Success-Nachricht finden
    const role = roles.find(r => r.id === roleId);
    const roleName = role?.name || 'Rolle';

    if (selectedTaskIds.length === 0) {
      setError('Bitte wählen Sie mindestens eine Task aus');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Prüfe ob Rolle bereits zugewiesen ist
      const isAlreadyAssigned = assignedRoles.some(role => role.roleId === roleId);
      if (isAlreadyAssigned) {
        setError(`Die Rolle "${roleName}" ist bereits zugewiesen.`);
        setIsSubmitting(false);
        return;
      }
      
      // Speichere Rolle in utilizationData Hub
      console.log('💾 Speichere Rolle in utilizationData Hub:', { employeeName, roleId, roleName, level });
      
      await addRoleToUtilizationData(employeeId, {
        roleId,
        roleName,
        categoryName: categories.find(c => c.id === categoryId)?.name || 'Unbekannt',
        level,
        tasks: selectedTaskIds
      });
      
      console.log('✅ Rolle erfolgreich in utilizationData Hub gespeichert');

      // Daten neu laden und Callback aufrufen
      await loadAssignedRoles();
      onRoleAssigned();
      
      // Erfolgreich zugewiesen - Success-Nachricht anzeigen
      console.log('Setting success message for role:', roleName);
      setSuccessMessage(`${roleName} wurde erfolgreich zugewiesen.`);
      
      // Auswahl zurücksetzen (aber nicht die Success-Message)
      setSelectedCategory('');
      setSelectedRole('');
      setSelectedTasks({});
      setRoleLevels({});
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verfügbare Rollen für eine Kategorie
  const getRolesForCategory = (categoryId: string) => {
    return roles.filter(role => role.categoryId === categoryId);
  };

  // Gefilterte Kategorien basierend auf Suche
  const getFilteredCategories = () => {
    return categories.filter(category => {
      const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
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

  // Beim Öffnen des Modals Daten laden
  useEffect(() => {
    if (isOpen && token && employeeId && !authLoading) {
      console.log('🔄 Loading data for RoleSelectionModal - Auth ready');
      loadData();
    } else if (isOpen && authLoading) {
      console.log('⏳ Waiting for auth to complete before loading data');
    }
  }, [isOpen, token, employeeId, authLoading]);

  // Success-Message Timeout verwalten
  useEffect(() => {
    if (successMessage) {
      console.log('Success message set, starting 3 second timeout');
      const timeoutId = setTimeout(() => {
        console.log('Hiding success message after 3 seconds');
        setSuccessMessage(null);
      }, 3000);
      
      return () => {
        console.log('Clearing success message timeout');
        clearTimeout(timeoutId);
      };
    }
  }, [successMessage]);

  // Reset bei Schließen
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedCategory('');
      setSelectedRole('');
      setSelectedTasks({});
      setRoleLevels({});
      setExpandedCategories(new Set());
      setExpandedRoles(new Set());
      setRoleTasks({});
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const filteredCategories = getFilteredCategories();

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
            className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Rollen & Tasks zuweisen
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Wählen Sie Kategorien, Rollen und Tasks für {employeeName} aus
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </header>

            {/* Success Message - Fixed Position */}
            {successMessage && (
              <div className="mx-6 mt-4 p-4 bg-green-100 border-2 border-green-300 rounded-lg text-sm text-green-800 flex items-center gap-2 shadow-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-medium">{successMessage}</span>
                {/* DEBUG: SUCCESS MESSAGE RENDERED AT TOP: {successMessage} */}
              </div>
            )}

            {/* Search */}
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                  placeholder="Kategorien durchsuchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                  <span>Lade Kategorien und Rollen...</span>
                </div>
              ) : (
                <>
                  {/* Results Count */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      {filteredCategories.length} Kategorien verfügbar
                      {searchTerm && ` (gefiltert nach "${searchTerm}")`}
                    </p>
                  </div>

                  {/* Hierarchische Kategorien-Liste */}
                  {filteredCategories.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p>Keine Kategorien gefunden.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredCategories.map(category => {
                        const categoryRoles = getRolesForCategory(category.id);
                        const isExpanded = expandedCategories.has(category.id);
                        
                        return (
                          <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                            {/* Kategorie-Header */}
                            <div className="bg-blue-50 border-b border-gray-200 p-4 flex items-center justify-between hover:bg-blue-100">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => toggleCategory(category.id)}
                                  className="text-gray-600 hover:text-gray-800"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                                
                                {isExpanded ? (
                                  <FolderOpen className="h-5 w-5 text-blue-600" />
                                ) : (
                                  <Folder className="h-5 w-5 text-blue-600" />
                                )}
                                
                                <div>
                                  <h3 className="font-medium text-gray-900">{category.name}</h3>
                                  {category.description && (
                                    <p className="text-sm text-gray-600">{category.description}</p>
                                  )}
                                  <p className="text-xs text-gray-500">
                                    {categoryRoles.length} Rolle(n)
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Rollen (wenn Kategorie expandiert) */}
                            {isExpanded && (
                              <div className="bg-white">
                                {categoryRoles.map(role => {
                                  const isRoleExpanded = expandedRoles.has(role.id);
                                  const tasks = roleTasks[role.id] || [];
                                  const selectedTaskIds = selectedTasks[role.id] || [];
                                  const level = roleLevels[role.id] || 3;
                                  
                                  return (
                                    <div key={role.id} className="border-b border-gray-100 last:border-b-0">
                                      {/* Rollen-Header */}
                                      <div className="bg-green-50 p-4 pl-12 flex items-center justify-between hover:bg-green-100">
                                        <div className="flex items-center gap-3">
                                          <button
                                            onClick={() => toggleRole(role.id)}
                                            className="text-gray-600 hover:text-gray-800"
                                          >
                                            {isRoleExpanded ? (
                                              <ChevronDown className="h-4 w-4" />
                                            ) : (
                                              <ChevronRight className="h-4 w-4" />
                                            )}
                                          </button>
                                          
                                          <User className="h-4 w-4 text-green-600" />
                                          
                                          <div>
                                            <h4 className="font-medium text-gray-900">{role.name}</h4>
                                            {role.description && (
                                              <p className="text-sm text-gray-600">{role.description}</p>
                                            )}
                                            <p className="text-xs text-gray-500">
                                              {tasks.length} Task(s)
                                            </p>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                          {/* Bewertungslevel */}
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600">Level:</span>
                                            <StarRating
                                              value={level}
                                              onChange={(newLevel) => updateRoleLevel(role.id, newLevel)}
                                              disabled={isSubmitting}
                                            />
                                          </div>
                                          
                                          {/* Zuweisen-Button */}
                                          <button
                                            onClick={() => assignRoleWithTasks(category.id, role.id)}
                                            disabled={isSubmitting || selectedTaskIds.length === 0}
                                            className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                          >
                                            {isSubmitting ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <Plus className="w-4 h-4" />
                                            )}
                                            Zuweisen
                                          </button>
                                        </div>
                                      </div>

                                      {/* Tasks (wenn Rolle expandiert) */}
                                      {isRoleExpanded && (
                                        <div className="bg-white">
                                          {tasks.length === 0 ? (
                                            <div className="p-4 pl-20 text-center text-gray-500 text-sm">
                                              Keine Tasks für diese Rolle verfügbar.
                                            </div>
                                          ) : (
                                            <>
                                              {/* Task-Header mit "Alle auswählen" */}
                                              <div className="p-3 pl-20 bg-gray-50 border-b border-gray-100">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-3">
                                                    <button
                                                      onClick={() => toggleAllTasks(role.id, selectedTaskIds.length === tasks.length)}
                                                      className="inline-flex items-center gap-2 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                                                    >
                                                      <CheckSquare className="w-3 h-3" />
                                                      {selectedTaskIds.length === tasks.length ? 'Alle abwählen' : 'Alle auswählen'}
                                                    </button>
                                                    <span className="text-sm text-gray-600">
                                                      {selectedTaskIds.length} von {tasks.length} Tasks ausgewählt
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              {/* Task-Liste */}
                                              <div className="p-4 pl-20 space-y-2">
                                                {tasks.map(task => (
                                                  <div
                                                    key={task.id}
                                                    className={`p-3 border rounded-lg transition-colors ${
                                                      selectedTaskIds.includes(task.id)
                                                        ? 'border-green-200 bg-green-50' 
                                                        : 'border-gray-200 bg-gray-50'
                                                    }`}
                                                  >
                                                    <div className="flex items-start gap-3">
                                                      <button
                                                        onClick={() => toggleTask(role.id, task.id)}
                                                        className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                                          selectedTaskIds.includes(task.id)
                                                            ? 'bg-green-600 border-green-600 text-white'
                                                            : 'border-gray-300 hover:border-green-400'
                                                        }`}
                                                      >
                                                        {selectedTaskIds.includes(task.id) && <Check className="w-3 h-3" />}
                                                      </button>
                                                      
                                                      <div className="flex-1 min-w-0">
                                                        <h5 className={`font-medium ${
                                                          selectedTaskIds.includes(task.id) ? 'text-green-900' : 'text-gray-700'
                                                        }`}>
                                                          {task.task}
                                                        </h5>
                                                        
                                                        {task.description && (
                                                          <p className={`text-sm mt-1 ${
                                                            selectedTaskIds.includes(task.id) ? 'text-green-700' : 'text-gray-600'
                                                          }`}>
                                                            <strong>Beschreibung:</strong> {task.description}
                                                          </p>
                                                        )}
                                                        
                                                        {task.outputs && (
                                                          <p className={`text-sm mt-1 ${
                                                            selectedTaskIds.includes(task.id) ? 'text-green-700' : 'text-gray-600'
                                                          }`}>
                                                            <strong>Outputs:</strong> {task.outputs}
                                                          </p>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                
                                {categoryRoles.length === 0 && (
                                  <div className="p-4 pl-12 text-center text-gray-500 text-sm">
                                    Keine Rollen in dieser Kategorie verfügbar.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
