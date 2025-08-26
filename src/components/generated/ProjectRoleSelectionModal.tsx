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

// Projekt-spezifische Rolle (ohne globale DB-Speicherung)
interface ProjectRole {
  id: string;
  name: string;
  categoryName: string;
  tasks: string[];
  level: number;
}

interface ProjectRoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoleSelected: (role: ProjectRole) => void;
}

export const ProjectRoleSelectionModal: React.FC<ProjectRoleSelectionModalProps> = ({
  isOpen,
  onClose,
  onRoleSelected,
}) => {
  const { token } = useAuth();
  
  // State für hierarchische Auswahl
  const [categories, setCategories] = useState<RoleCategory[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleTasks, setRoleTasks] = useState<Record<string, RoleTask[]>>({});
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Hierarchische Auswahl State
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Task-Auswahl State
  const [selectedTasks, setSelectedTasks] = useState<Record<string, string[]>>({});
  const [roleLevels, setRoleLevels] = useState<Record<string, number>>({});

  // Kategorien laden
  const loadCategories = async () => {
    if (!token) {
      throw new Error('Kein Authentifizierungstoken verfügbar');
    }
    
    try {
      const response = await fetch('http://localhost:3001/api/role-categories', {
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
    if (!token) {
      throw new Error('Kein Authentifizierungstoken verfügbar');
    }
    
    try {
      const response = await fetch('http://localhost:3001/api/roles', {
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

  // Alle Tasks für alle Rollen laden
  const loadAllRoleTasks = async () => {
    if (!token) {
      throw new Error('Kein Authentifizierungstoken verfügbar');
    }
    
    try {
      const response = await fetch('http://localhost:3001/api/role-tasks', {
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
      
      console.log('✅ Tasks loaded and grouped by role:', Object.keys(tasksByRole).length, 'roles');
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der Tasks:', error);
      setError('Tasks could not be loaded, starting with empty array');
    }
  };

  // Alle Daten laden
  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await loadCategories();
      await loadRoles();
      await loadAllRoleTasks();
    } catch (error) {
      console.error('❌ Fehler beim Laden der Daten:', error);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  // Daten laden beim Öffnen
  useEffect(() => {
    if (isOpen && token) {
      console.log('🔄 ProjectRoleSelectionModal: Lade Daten...');
      console.log('🔑 Token verfügbar:', !!token, 'Länge:', token?.length);
      loadAllData();
      
      // Reset bei Öffnung
      setExpandedCategories(new Set());
      setSearchTerm('');
    } else if (isOpen && !token) {
      console.log('❌ ProjectRoleSelectionModal: Kein Token verfügbar');
      setError('Authentifizierung erforderlich');
    }
  }, [isOpen, !!token]);

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

  // Task auswählen/abwählen
  const toggleTask = (roleId: string, taskId: string) => {
    setSelectedTasks(prev => ({
      ...prev,
      [roleId]: prev[roleId]?.includes(taskId) 
        ? prev[roleId].filter(id => id !== taskId)
        : [...(prev[roleId] || []), taskId]
    }));
  };

  // Alle Tasks einer Rolle auswählen/abwählen
  const toggleAllTasks = (roleId: string, selectAll: boolean) => {
    const tasks = roleTasks[roleId] || [];
    setSelectedTasks(prev => ({
      ...prev,
      [roleId]: selectAll ? tasks.map(task => task.id) : []
    }));
  };

  // Level für Rolle setzen
  const setRoleLevel = (roleId: string, level: number) => {
    setRoleLevels(prev => ({
      ...prev,
      [roleId]: level
    }));
  };

  // Rolle zuweisen (nur lokale Auswahl, keine DB-Speicherung)
  const handleRoleSelection = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) {
      setError('Rolle nicht gefunden');
      return;
    }

    const roleTasksForRole = roleTasks[roleId] || [];
    const selectedTaskIds = selectedTasks[roleId] || [];
    const selectedTaskObjects = roleTasksForRole.filter(task => 
      selectedTaskIds.includes(task.id)
    );

    const projectRole: ProjectRole = {
      id: role.id,
      name: role.name,
      categoryName: categories.find(cat => cat.id === role.categoryId)?.name || 'Unbekannt',
      tasks: selectedTaskObjects.map(task => task.task),
      level: roleLevels[roleId] || 3
    };

    console.log('🎯 Projekt-Rolle ausgewählt:', projectRole);
    onRoleSelected(projectRole);
  };

  // Gefilterte Kategorien
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Rollen für eine Kategorie abrufen
  const getRolesForCategory = (categoryId: string): Role[] => {
    return roles.filter(role => role.categoryId === categoryId);
  };

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
                  Projekt-Rolle auswählen
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Wählen Sie eine Rolle für dieses spezifische Projekt
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </header>

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
                                  const tasks = roleTasks[role.id] || [];
                                  const selectedTaskIds = selectedTasks[role.id] || [];
                                  const level = roleLevels[role.id] || 3;
                                  
                                  return (
                                    <div key={role.id} className="border-b border-gray-100 last:border-b-0">
                                      {/* Rollen-Header */}
                                      <div className="bg-green-50 p-4 pl-12 flex items-center justify-between hover:bg-green-100">
                                        <div className="flex items-center gap-3">
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
                                          <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <button
                                                key={star}
                                                onClick={() => setRoleLevel(role.id, star)}
                                                className="text-lg hover:scale-110 transition-transform"
                                              >
                                                <Star
                                                  className={`w-4 h-4 ${
                                                    star <= level
                                                      ? 'text-yellow-400 fill-current'
                                                      : 'text-gray-300'
                                                  }`}
                                                />
                                              </button>
                                            ))}
                                            <span className="text-xs text-gray-500 ml-1">({level}/5)</span>
                                          </div>
                                          
                                          {/* Zuweisen Button */}
                                          <button
                                            onClick={() => handleRoleSelection(role.id)}
                                            disabled={selectedTaskIds.length === 0}
                                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            <Plus className="w-4 h-4 inline mr-1" />
                                            Auswählen
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Removed default export - using named export above
