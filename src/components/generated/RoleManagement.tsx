import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, X, ChevronRight, ChevronDown, FolderOpen, Folder, User, CheckSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Interfaces
interface RoleCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: any;
  isActive: boolean;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  createdAt: any;
  isActive: boolean;
}

interface RoleTask {
  id: string;
  task: string;
  description: string;
  outputs: string;
  roleId: string;
  roleName?: string;
  categoryId: string;
  categoryName?: string;
  createdAt: any;
  isActive: boolean;
}

interface FormData {
  name: string;
  description: string;
  category?: string;
  task?: string;
  outputs?: string;
}

type EditMode = 'category' | 'role' | 'task' | null;

const RoleManagement: React.FC = () => {
  const { token } = useAuth();
  
  // State
  const [categories, setCategories] = useState<RoleCategory[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tasks, setTasks] = useState<RoleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: '',
    task: '',
    outputs: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reassignment dialog state
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<RoleCategory | null>(null);
  const [reassignToCategoryId, setReassignToCategoryId] = useState<string>('');

  // Load all data
  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Load categories
      const categoriesResponse = await fetch('/api/role-categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!categoriesResponse.ok) {
        throw new Error(`HTTP ${categoriesResponse.status}: ${categoriesResponse.statusText}`);
      }
      
      const categoriesData = await categoriesResponse.json();
      setCategories(categoriesData);
      console.log('🔍 Role Categories loaded:', categoriesData);

      // Load roles
      const rolesResponse = await fetch('/api/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!rolesResponse.ok) {
        throw new Error(`HTTP ${rolesResponse.status}: ${rolesResponse.statusText}`);
      }
      
      const rolesData = await rolesResponse.json();
      setRoles(rolesData);
      console.log('🔍 Roles loaded:', rolesData);

      // Load tasks
      const tasksResponse = await fetch('/api/role-tasks', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!tasksResponse.ok) {
        throw new Error(`HTTP ${tasksResponse.status}: ${tasksResponse.statusText}`);
      }
      
      const tasksData = await tasksResponse.json();
      setTasks(tasksData);
      console.log('🔍 Role Tasks loaded:', tasksData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Fehler beim Laden der Daten: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create category
  const createCategory = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/role-categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen der Kategorie');
      }

      await loadAllData();
      closeForm();
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create role
  const createRole = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category: formData.category
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen der Rolle');
      }

      await loadAllData();
      closeForm();
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create task
  const createTask = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/role-tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task: formData.task,
          description: formData.description,
          outputs: formData.outputs,
          roleName: formData.category // This should be the role name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen der Aufgabe');
      }

      await loadAllData();
      closeForm();
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update category
  const updateCategory = async () => {
    if (!editingItem) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/role-categories/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Bearbeiten der Kategorie');
      }

      await loadAllData();
      closeForm();
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update role
  const updateRole = async () => {
    if (!editingItem) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/roles/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category: formData.category
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Bearbeiten der Rolle');
      }

      await loadAllData();
      closeForm();
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update task
  const updateTask = async () => {
    if (!editingItem) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/role-tasks/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task: formData.task,
          description: formData.description,
          outputs: formData.outputs,
          roleName: formData.category
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Bearbeiten der Aufgabe');
      }

      await loadAllData();
      closeForm();
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete category
  const deleteCategory = async (category: RoleCategory) => {
    const rolesInCategory = roles.filter(r => r.categoryName === category.name);
    
    if (rolesInCategory.length > 0) {
      setCategoryToDelete(category);
      setShowReassignDialog(true);
      return;
    }
    
    if (!confirm(`Möchten Sie die Kategorie "${category.name}" wirklich löschen?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/role-categories/${category.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen der Kategorie');
      }

      await loadAllData();
      
    } catch (error: any) {
      setError(error.message);
    }
  };

  // Delete role
  const deleteRole = async (role: Role) => {
    const tasksForRole = tasks.filter(t => t.roleName === role.name);
    
    if (tasksForRole.length > 0) {
      if (!confirm(`Die Rolle "${role.name}" hat ${tasksForRole.length} Aufgaben. Möchten Sie die Rolle und alle Aufgaben löschen?`)) {
        return;
      }
    }
    
    if (!confirm(`Möchten Sie die Rolle "${role.name}" wirklich löschen?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/roles/${role.id}`, {
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

      await loadAllData();
      
    } catch (error: any) {
      setError(error.message);
    }
  };

  // Delete task
  const deleteTask = async (task: RoleTask) => {
    if (!confirm(`Möchten Sie die Aufgabe "${task.task}" wirklich löschen?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/role-tasks/${task.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen der Aufgabe');
      }

      await loadAllData();
      
    } catch (error: any) {
      setError(error.message);
    }
  };

  // Handle reassignment and deletion
  const handleReassignAndDelete = async () => {
    if (!categoryToDelete) return;
    
    try {
      setIsSubmitting(true);
      
      // Reassign roles if target category selected
      if (reassignToCategoryId) {
        const targetCategory = categories.find(c => c.id === reassignToCategoryId);
        if (targetCategory) {
          const rolesToReassign = roles.filter(r => r.categoryName === categoryToDelete.name);
          
          for (const role of rolesToReassign) {
            await fetch(`/api/roles/${role.id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ...role,
                category: targetCategory.name
              })
            });
          }
        }
      }
      
      // Delete category
      const response = await fetch(`/api/role-categories/${categoryToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen der Kategorie');
      }

      await loadAllData();
      setShowReassignDialog(false);
      setCategoryToDelete(null);
      setReassignToCategoryId('');
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form handlers
  const openCreateCategoryForm = () => {
    setEditMode('category');
    setEditingItem(null);
    setFormData({ name: '', description: '', category: '', task: '', outputs: '' });
    setIsFormOpen(true);
  };

  const openCreateRoleForm = (categoryName?: string) => {
    setEditMode('role');
    setEditingItem(null);
    setFormData({ name: '', description: '', category: categoryName || '', task: '', outputs: '' });
    setIsFormOpen(true);
  };

  const openCreateTaskForm = (roleName?: string) => {
    setEditMode('task');
    setEditingItem(null);
    setFormData({ name: '', description: '', category: roleName || '', task: '', outputs: '' });
    setIsFormOpen(true);
  };

  const openEditCategoryForm = (category: RoleCategory) => {
    setEditMode('category');
    setEditingItem(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      category: '',
      task: '',
      outputs: ''
    });
    setIsFormOpen(true);
  };

  const openEditRoleForm = (role: Role) => {
    setEditMode('role');
    setEditingItem(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      category: role.categoryName || '',
      task: '',
      outputs: ''
    });
    setIsFormOpen(true);
  };

  const openEditTaskForm = (task: RoleTask) => {
    setEditMode('task');
    setEditingItem(task);
    setFormData({
      name: '',
      description: task.description || '',
      category: task.roleName || '',
      task: task.task,
      outputs: task.outputs
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditMode(null);
    setEditingItem(null);
    setFormData({ name: '', description: '', category: '', task: '', outputs: '' });
    setError(null);
  };

  const handleSubmit = () => {
    if (editMode === 'category') {
      if (editingItem) {
        updateCategory();
      } else {
        createCategory();
      }
    } else if (editMode === 'role') {
      if (editingItem) {
        updateRole();
      } else {
        createRole();
      }
    } else if (editMode === 'task') {
      if (editingItem) {
        updateTask();
      } else {
        createTask();
      }
    }
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Toggle role expansion
  const toggleRole = (roleId: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(roleId)) {
      newExpanded.delete(roleId);
    } else {
      newExpanded.add(roleId);
    }
    setExpandedRoles(newExpanded);
  };

  // Get roles for category
  const getRolesForCategory = (categoryName: string) => {
    return roles.filter(role => role.categoryName === categoryName);
  };

  // Get tasks for role
  const getTasksForRole = (roleName: string) => {
    return tasks.filter(task => task.roleName === roleName);
  };

  // Load data on mount
  useEffect(() => {
    if (token) {
      loadAllData();
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
          <h2 className="text-xl font-semibold text-gray-900">Rollen Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Verwalten Sie Kategorien, Rollen und Aufgaben in einer hierarchischen Struktur
          </p>
        </div>
        
        <button
          onClick={openCreateCategoryForm}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Kategorie
        </button>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Noch keine Kategorien vorhanden.</p>
          <p className="text-sm">Erstellen Sie die erste Kategorie mit dem Button oben.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => {
            const categoryRoles = getRolesForCategory(category.name);
            const isExpanded = expandedCategories.has(category.id);
            
            return (
              <div key={category.id} className="border border-gray-200 rounded-lg bg-blue-50">
                {/* Category Header */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    
                    <div className="flex items-center gap-2">
                      {isExpanded ? <FolderOpen className="w-4 h-4 text-blue-600" /> : <Folder className="w-4 h-4 text-blue-600" />}
                      <span className="font-medium text-gray-900">{category.name}</span>
                      <span className="text-sm text-gray-500">
                        {categoryRoles.length} Rolle{categoryRoles.length !== 1 ? 'n' : ''}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openCreateRoleForm(category.name)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      <Plus className="w-3 h-3" />
                      Rolle
                    </button>
                    <button
                      onClick={() => openEditCategoryForm(category)}
                      className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:bg-blue-100 rounded"
                      title="Kategorie bearbeiten"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCategory(category)}
                      className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:bg-red-100 rounded"
                      title="Kategorie löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Category Description */}
                {category.description && (
                  <div className="px-4 pb-2">
                    <p className="text-sm text-gray-600">{category.description}</p>
                  </div>
                )}
                
                {/* Roles List */}
                {isExpanded && (
                  <div className="border-t border-blue-200 bg-white">
                    {categoryRoles.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        Keine Rollen in dieser Kategorie
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {categoryRoles.map((role) => {
                          const roleTasks = getTasksForRole(role.name);
                          const isRoleExpanded = expandedRoles.has(role.id);
                          
                          return (
                            <div key={role.id} className="bg-gray-50">
                              {/* Role Header */}
                              <div className="flex items-center justify-between p-4 hover:bg-gray-100">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => toggleRole(role.id)}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    {isRoleExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                  <User className="w-4 h-4 text-green-600" />
                                  <div>
                                    <div className="font-medium text-gray-900">{role.name}</div>
                                    {role.description && (
                                      <div className="text-sm text-gray-600">{role.description}</div>
                                    )}
                                    <div className="text-xs text-gray-500">
                                      {roleTasks.length} Aufgabe{roleTasks.length !== 1 ? 'n' : ''}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openCreateTaskForm(role.name)}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Aufgabe
                                  </button>
                                  <button
                                    onClick={() => openEditRoleForm(role)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-green-600 hover:bg-green-50 rounded"
                                    title="Rolle bearbeiten"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteRole(role)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:bg-red-50 rounded"
                                    title="Rolle löschen"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Tasks List */}
                              {isRoleExpanded && (
                                <div className="border-t border-gray-200 bg-white ml-8">
                                  {roleTasks.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500 text-sm">
                                      Keine Aufgaben für diese Rolle
                                    </div>
                                  ) : (
                                    <div className="divide-y divide-gray-100">
                                      {roleTasks.map((task) => (
                                        <div key={task.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                                          <div className="flex items-center gap-3">
                                            <CheckSquare className="w-4 h-4 text-purple-600" />
                                            <div>
                                              <div className="font-medium text-gray-900">{task.task}</div>
                                              {task.description && (
                                                <div className="text-sm text-gray-600">{task.description}</div>
                                              )}
                                              {task.outputs && (
                                                <div className="text-sm text-blue-600">Output: {task.outputs}</div>
                                              )}
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => openEditTaskForm(task)}
                                              className="inline-flex items-center justify-center w-8 h-8 text-purple-600 hover:bg-purple-50 rounded"
                                              title="Aufgabe bearbeiten"
                                            >
                                              <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => deleteTask(task)}
                                              className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:bg-red-50 rounded"
                                              title="Aufgabe löschen"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={closeForm} />
          <div className="relative bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editMode === 'category' 
                  ? (editingItem ? 'Kategorie bearbeiten' : 'Neue Kategorie erstellen')
                  : editMode === 'role'
                  ? (editingItem ? 'Rolle bearbeiten' : 'Neue Rolle erstellen')
                  : (editingItem ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen')
                }
              </h3>
              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {editMode === 'task' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aufgabe *
                    </label>
                    <input
                      type="text"
                      value={formData.task}
                      onChange={(e) => setFormData(prev => ({ ...prev, task: e.target.value }))}
                      placeholder="z.B. Kundenberatung durchführen"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rolle *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Rolle auswählen...</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.name}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beschreibung
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Detaillierte Beschreibung der Aufgabe..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Erwartete Outputs
                    </label>
                    <textarea
                      value={formData.outputs}
                      onChange={(e) => setFormData(prev => ({ ...prev, outputs: e.target.value }))}
                      placeholder="Was soll das Ergebnis dieser Aufgabe sein..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {editMode === 'category' ? 'Kategoriename' : 'Rollenname'} *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={editMode === 'category' ? 'z.B. Entwicklung, Marketing' : 'z.B. Frontend Developer, Sales Manager'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {editMode === 'role' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kategorie *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Kategorie auswählen...</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beschreibung
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optionale Beschreibung..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  (editMode === 'task' && (!formData.task?.trim() || !formData.category?.trim())) ||
                  (editMode !== 'task' && (!formData.name?.trim() || (editMode === 'role' && !formData.category?.trim()))) ||
                  isSubmitting
                }
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingItem ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassignment Dialog */}
      {showReassignDialog && categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Kategorie löschen</h3>
              <button
                onClick={() => setShowReassignDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Die Kategorie "{categoryToDelete.name}" enthält {getRolesForCategory(categoryToDelete.name).length} Rollen. 
                Was soll mit diesen Rollen geschehen?
              </p>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="reassign"
                    value="delete"
                    checked={!reassignToCategoryId}
                    onChange={() => setReassignToCategoryId('')}
                    className="mr-2"
                  />
                  Rollen ebenfalls löschen
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="reassign"
                    value="reassign"
                    checked={!!reassignToCategoryId}
                    onChange={() => setReassignToCategoryId(categories[0]?.id || '')}
                    className="mr-2"
                  />
                  Rollen zu anderer Kategorie verschieben:
                </label>
                
                {reassignToCategoryId && (
                  <select
                    value={reassignToCategoryId}
                    onChange={(e) => setReassignToCategoryId(e.target.value)}
                    className="ml-6 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories
                      .filter(c => c.id !== categoryToDelete.id)
                      .map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowReassignDialog(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleReassignAndDelete}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Kategorie löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;