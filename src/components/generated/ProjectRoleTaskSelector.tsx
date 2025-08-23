import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Check, 
  X, 
  Users, 
  Settings, 
  AlertCircle,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import CreateRoleModal from './CreateRoleModal';
import CreateTaskModal from './CreateTaskModal';

// Types
interface ProjectTask {
  taskId: string;
  task: string;
  description: string;
  outputs: string;
  isSelected: boolean;
}

interface ProjectRole {
  roleId: string;
  roleName: string;
  selectedTasks: ProjectTask[];
  isExpanded?: boolean;
}

interface Role {
  id: string;
  name: string;
}

interface RoleTask {
  id: string;
  task: string;
  description: string;
  outputs: string;
  roleId: string;
}

interface ProjectRoleTaskSelectorProps {
  selectedRoles: ProjectRole[];
  onRolesChange: (roles: ProjectRole[]) => void;
  employeeId?: string;
  projectId?: string;
  className?: string;
}

const ProjectRoleTaskSelector: React.FC<ProjectRoleTaskSelectorProps> = ({
  selectedRoles,
  onRolesChange,
  employeeId,
  projectId,
  className = ""
}) => {
  const { token } = useAuth();
  
  // State
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [allRoleTasks, setAllRoleTasks] = useState<Record<string, RoleTask[]>>({});
  const [isAddRoleDropdownOpen, setIsAddRoleDropdownOpen] = useState(false);
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [selectedRoleForNewTask, setSelectedRoleForNewTask] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available roles
  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading roles...');
      const response = await fetch('/api/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Server Error: ${errorData.error || response.statusText}`);
      }
      
      const roles = await response.json();
      console.log('Loaded roles:', roles);
      setAvailableRoles(roles);
      
      if (roles.length === 0) {
        console.log('No roles found in database. You may need to create some roles first.');
      }
    } catch (err: any) {
      console.error('Error loading roles:', err);
      setError(`Fehler beim Laden der Rollen: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load tasks for a specific role
  const loadRoleTasks = useCallback(async (roleId: string) => {
    try {
      console.log('Loading tasks for role:', roleId);
      const response = await fetch(`/api/role-tasks?roleId=${roleId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Server Error: ${errorData.error || response.statusText}`);
      }
      
      const tasks = await response.json();
      console.log('Loaded tasks:', tasks);
      
      // Filter tasks by roleId (in case server returns all tasks)
      const filteredTasks = tasks.filter((task: RoleTask) => task.roleId === roleId);
      
      setAllRoleTasks(prev => ({
        ...prev,
        [roleId]: filteredTasks
      }));
      
      return filteredTasks;
    } catch (err: any) {
      console.error('Error loading role tasks:', err);
      setError(`Fehler beim Laden der Tasks: ${err.message}`);
      return [];
    }
  }, [token]);

  // Initialize
  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // Get available roles for dropdown (exclude already selected)
  const availableRolesForDropdown = useMemo(() => {
    const selectedRoleIds = selectedRoles.map(role => role.roleId);
    return availableRoles.filter(role => !selectedRoleIds.includes(role.id));
  }, [availableRoles, selectedRoles]);

  // Handle role creation
  const handleRoleCreated = async (role: { id: string; name: string }, tasks: any[]) => {
    // Convert tasks to ProjectTasks
    const projectTasks: ProjectTask[] = tasks.map(task => ({
      taskId: `temp-${Date.now()}-${Math.random()}`, // Temporary ID, will be replaced
      task: task.task,
      description: task.description,
      outputs: task.outputs,
      isSelected: true
    }));

    // Load the actual tasks from the server to get real IDs
    const actualTasks = await loadRoleTasks(role.id);
    const actualProjectTasks: ProjectTask[] = actualTasks.map(task => ({
      taskId: task.id,
      task: task.task,
      description: task.description,
      outputs: task.outputs,
      isSelected: true
    }));

    const newProjectRole: ProjectRole = {
      roleId: role.id,
      roleName: role.name,
      selectedTasks: actualProjectTasks,
      isExpanded: true
    };

    // Update available roles and selected roles
    setAvailableRoles(prev => [...prev, role]);
    onRolesChange([...selectedRoles, newProjectRole]);
  };

  // Handle task creation
  const handleTaskCreated = (roleId: string, task: { id: string; task: string; description: string; outputs: string }) => {
    const updatedRoles = selectedRoles.map(role => {
      if (role.roleId === roleId) {
        const newTask: ProjectTask = {
          taskId: task.id,
          task: task.task,
          description: task.description,
          outputs: task.outputs,
          isSelected: true // New tasks are selected by default
        };
        return {
          ...role,
          selectedTasks: [...role.selectedTasks, newTask]
        };
      }
      return role;
    });
    onRolesChange(updatedRoles);
    setSelectedRoleForNewTask(null);
  };

  // Add existing role
  const handleAddExistingRole = async (roleId: string) => {
    const role = availableRoles.find(r => r.id === roleId);
    if (!role) return;

    // Load tasks for this role
    const tasks = await loadRoleTasks(roleId);
    
    // Convert to ProjectTasks with all selected by default
    const projectTasks: ProjectTask[] = tasks.map(task => ({
      taskId: task.id,
      task: task.task,
      description: task.description,
      outputs: task.outputs,
      isSelected: true // All tasks selected by default
    }));

    const newProjectRole: ProjectRole = {
      roleId: role.id,
      roleName: role.name,
      selectedTasks: projectTasks,
      isExpanded: true
    };

    onRolesChange([...selectedRoles, newProjectRole]);
    setIsAddRoleDropdownOpen(false);
  };

  // Remove role
  const handleRemoveRole = (roleId: string) => {
    const updatedRoles = selectedRoles.filter(role => role.roleId !== roleId);
    onRolesChange(updatedRoles);
  };

  // Toggle task selection
  const handleTaskToggle = (roleId: string, taskId: string) => {
    const updatedRoles = selectedRoles.map(role => {
      if (role.roleId === roleId) {
        const updatedTasks = role.selectedTasks.map(task => 
          task.taskId === taskId 
            ? { ...task, isSelected: !task.isSelected }
            : task
        );
        return { ...role, selectedTasks: updatedTasks };
      }
      return role;
    });
    onRolesChange(updatedRoles);
  };

  // Toggle role expansion
  const handleToggleExpansion = (roleId: string) => {
    const updatedRoles = selectedRoles.map(role => 
      role.roleId === roleId 
        ? { ...role, isExpanded: !role.isExpanded }
        : role
    );
    onRolesChange(updatedRoles);
  };

  // Toggle all tasks in a role
  const handleToggleAllTasks = (roleId: string, selectAll: boolean) => {
    const updatedRoles = selectedRoles.map(role => {
      if (role.roleId === roleId) {
        const updatedTasks = role.selectedTasks.map(task => ({
          ...task,
          isSelected: selectAll
        }));
        return { ...role, selectedTasks: updatedTasks };
      }
      return role;
    });
    onRolesChange(updatedRoles);
  };

  // Get task statistics for a role
  const getTaskStats = (role: ProjectRole) => {
    const selected = role.selectedTasks.filter(task => task.isSelected).length;
    const total = role.selectedTasks.length;
    return { selected, total };
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Projektrollen & Tätigkeiten
          </h3>
          <p className="text-sm text-gray-600">
            Wählen Sie Rollen und zugehörige Tätigkeiten für dieses Projekt aus
          </p>
        </div>
        
        {/* Add Role Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsAddRoleDropdownOpen(!isAddRoleDropdownOpen)}
            disabled={availableRolesForDropdown.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Rolle hinzufügen</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isAddRoleDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
              >
                <div className="p-2">
                  {availableRolesForDropdown.length > 0 ? (
                    <>
                      <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold px-3 py-2">
                        Verfügbare Rollen
                      </div>
                      {availableRolesForDropdown.map(role => (
                        <button
                          key={role.id}
                          onClick={() => handleAddExistingRole(role.id)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 rounded-md transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-500" />
                            <span>{role.name}</span>
                          </div>
                        </button>
                      ))}
                      <div className="border-t border-gray-100 my-2"></div>
                    </>
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      Alle verfügbaren Rollen bereits ausgewählt
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      setIsCreateRoleModalOpen(true);
                      setIsAddRoleDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      <span>Neue Rolle erstellen</span>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      {/* Selected Roles */}
      <div className="space-y-3">
        <AnimatePresence>
          {selectedRoles.map(role => {
            const stats = getTaskStats(role);
            const allSelected = stats.selected === stats.total;
            const someSelected = stats.selected > 0 && stats.selected < stats.total;
            
            return (
              <motion.div
                key={role.roleId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="border border-gray-200 rounded-lg overflow-hidden bg-white"
              >
                {/* Role Header */}
                <div className="p-4 bg-purple-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleExpansion(role.roleId)}
                        className="p-1 hover:bg-purple-100 rounded transition-colors"
                      >
                        {role.isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-purple-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-purple-600" />
                        )}
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-600" />
                        <h4 className="font-medium text-purple-900">{role.roleName}</h4>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-purple-700">
                        <span>{stats.selected}/{stats.total} Tätigkeiten</span>
                        {allSelected && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {someSelected && <div className="w-4 h-4 bg-yellow-400 rounded-sm"></div>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Toggle All Tasks */}
                      <button
                        onClick={() => handleToggleAllTasks(role.roleId, !allSelected)}
                        className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                      >
                        {allSelected ? 'Alle abwählen' : 'Alle auswählen'}
                      </button>
                      
                      {/* Add Task */}
                      <button
                        onClick={() => {
                          setSelectedRoleForNewTask(role.roleId);
                          setIsCreateTaskModalOpen(true);
                        }}
                        className="p-1 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                        title="Task hinzufügen"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      
                      {/* Remove Role */}
                      <button
                        onClick={() => handleRemoveRole(role.roleId)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Rolle entfernen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tasks List */}
                <AnimatePresence>
                  {role.isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-3">
                        {role.selectedTasks.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Settings className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p>Keine Tätigkeiten verfügbar</p>
                            <button
                              onClick={() => {
                                setSelectedRoleForNewTask(role.roleId);
                                setIsCreateTaskModalOpen(true);
                              }}
                              className="mt-2 text-purple-600 hover:text-purple-700 text-sm"
                            >
                              Erste Tätigkeit hinzufügen
                            </button>
                          </div>
                        ) : (
                          role.selectedTasks.map(task => (
                            <div
                              key={task.taskId}
                              className={`p-3 border rounded-lg transition-colors ${
                                task.isSelected 
                                  ? 'border-purple-200 bg-purple-50' 
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => handleTaskToggle(role.roleId, task.taskId)}
                                  className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    task.isSelected
                                      ? 'bg-purple-600 border-purple-600 text-white'
                                      : 'border-gray-300 hover:border-purple-400'
                                  }`}
                                >
                                  {task.isSelected && <Check className="w-3 h-3" />}
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                  <h5 className={`font-medium ${
                                    task.isSelected ? 'text-purple-900' : 'text-gray-700'
                                  }`}>
                                    {task.task}
                                  </h5>
                                  
                                  {task.description && (
                                    <p className={`text-sm mt-1 ${
                                      task.isSelected ? 'text-purple-700' : 'text-gray-600'
                                    }`}>
                                      <strong>Beschreibung:</strong> {task.description}
                                    </p>
                                  )}
                                  
                                  {task.outputs && (
                                    <p className={`text-sm mt-1 ${
                                      task.isSelected ? 'text-purple-700' : 'text-gray-600'
                                    }`}>
                                      <strong>Outputs:</strong> {task.outputs}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty State */}
        {selectedRoles.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Keine Rollen ausgewählt
            </h3>
            <p className="text-gray-600 mb-4">
              Fügen Sie Projektrollen hinzu, um Tätigkeiten zu definieren
            </p>
            <button
              onClick={() => setIsAddRoleDropdownOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Erste Rolle hinzufügen</span>
            </button>
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {isAddRoleDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsAddRoleDropdownOpen(false)}
        />
      )}

      {/* Create Role Modal */}
      <CreateRoleModal
        isOpen={isCreateRoleModalOpen}
        onClose={() => setIsCreateRoleModalOpen(false)}
        onRoleCreated={handleRoleCreated}
      />

      {/* Create Task Modal */}
      {selectedRoleForNewTask && (
        <CreateTaskModal
          isOpen={isCreateTaskModalOpen}
          onClose={() => {
            setIsCreateTaskModalOpen(false);
            setSelectedRoleForNewTask(null);
          }}
          roleId={selectedRoleForNewTask}
          roleName={selectedRoles.find(r => r.roleId === selectedRoleForNewTask)?.roleName || ''}
          onTaskCreated={(task) => handleTaskCreated(selectedRoleForNewTask, task)}
        />
      )}
    </div>
  );
};

export default ProjectRoleTaskSelector;
