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

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const HierarchicalRoleManagement: React.FC<Props> = ({ isOpen, onClose }) => {
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
      
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
      }

      // Load roles
      const rolesResponse = await fetch('/api/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        setRoles(rolesData);
      }

      // Load tasks
      try {
        const tasksResponse = await fetch('/api/role-tasks', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          setTasks(tasksData);
        } else {
          console.warn('Tasks could not be loaded, starting with empty array');
          setTasks([]);
        }
      } catch (taskError) {
        console.warn('Tasks API error, starting with empty array:', taskError);
        setTasks([]);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  // Toggle expand/collapse
  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleRole = (roleId: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(roleId)) {
      newExpanded.delete(roleId);
    } else {
      newExpanded.add(roleId);
    }
    setExpandedRoles(newExpanded);
  };

  // Form handlers
  const openCreateForm = (mode: EditMode, parentId?: string) => {
    setEditMode(mode);
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      category: mode === 'role' ? parentId : '',
      task: '',
      outputs: ''
    });
    setIsFormOpen(true);
    setError(null);
  };

  const openEditForm = (mode: EditMode, item: any) => {
    setEditMode(mode);
    setEditingItem(item);
    
    if (mode === 'category') {
      setFormData({
        name: item.name,
        description: item.description || '',
        category: '',
        task: '',
        outputs: ''
      });
    } else if (mode === 'role') {
      setFormData({
        name: item.name,
        description: item.description || '',
        category: item.categoryId,
        task: '',
        outputs: ''
      });
    } else if (mode === 'task') {
      setFormData({
        name: item.task,
        description: item.description || '',
        category: item.categoryId,
        task: item.task,
        outputs: item.outputs || ''
      });
    }
    
    setIsFormOpen(true);
    setError(null);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditMode(null);
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      task: '',
      outputs: ''
    });
    setError(null);
  };

  // CRUD operations
  const handleSubmit = async () => {
    if (!editMode) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      let url = '';
      let method = editingItem ? 'PUT' : 'POST';
      let body: any = {};
      
      if (editMode === 'category') {
        url = editingItem ? `/api/role-categories/${editingItem.id}` : '/api/role-categories';
        body = {
          name: formData.name,
          description: formData.description
        };
      } else if (editMode === 'role') {
        url = editingItem ? `/api/roles/${editingItem.id}` : '/api/roles';
        body = {
          name: formData.name,
          description: formData.description,
          categoryId: formData.category
        };
      } else if (editMode === 'task') {
        url = editingItem ? `/api/role-tasks/${editingItem.id}` : '/api/role-tasks';
        body = {
          task: formData.name,
          description: formData.description,
          outputs: formData.outputs,
          roleId: editingItem?.roleId || formData.category, // For new tasks, category contains roleId
          categoryId: formData.category
        };
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Speichern');
      }
      
      // Reload data
      await loadAllData();
      closeForm();
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (mode: EditMode, item: any) => {
    if (mode === 'category') {
      // Check if category has roles/tasks
      const categoryRoles = roles.filter(r => r.categoryId === item.id);
      const categoryTasks = tasks.filter(t => t.categoryId === item.id);
      
      if (categoryRoles.length > 0 || categoryTasks.length > 0) {
        setCategoryToDelete(item);
        setShowReassignDialog(true);
        return;
      }
    }
    
    const confirmMessage = mode === 'category' 
      ? `Möchten Sie die Kategorie "${item.name}" wirklich löschen?`
      : mode === 'role'
      ? `Möchten Sie die Rolle "${item.name}" wirklich löschen?`
      : `Möchten Sie die Aufgabe "${item.task}" wirklich löschen?`;
      
    if (!confirm(confirmMessage)) return;
    
    try {
      let url = '';
      if (mode === 'category') url = `/api/role-categories/${item.id}`;
      else if (mode === 'role') url = `/api/roles/${item.id}`;
      else if (mode === 'task') url = `/api/role-tasks/${item.id}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen');
      }
      
      await loadAllData();
      
    } catch (error: any) {
      setError(error.message);
    }
  };

  // Reassignment dialog
  const handleReassignment = async () => {
    if (!categoryToDelete || !reassignToCategoryId) return;
    
    try {
      const response = await fetch(`/api/role-categories/${categoryToDelete.id}/reassign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newCategoryId: reassignToCategoryId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler bei der Neuzuordnung');
      }
      
      await loadAllData();
      setShowReassignDialog(false);
      setCategoryToDelete(null);
      setReassignToCategoryId('');
      
    } catch (error: any) {
      setError(error.message);
    }
  };

  // Get roles for category
  const getRolesForCategory = (categoryId: string) => {
    return roles.filter(role => role.categoryId === categoryId);
  };

  // Get tasks for role
  const getTasksForRole = (roleId: string) => {
    return tasks.filter(task => task.roleId === roleId);
  };

  // Load data on mount
  useEffect(() => {
    if (isOpen && token) {
      loadAllData();
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Hierarchisches Rollen-Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              Verwalten Sie Kategorien, Rollen und Aufgaben in einer hierarchischen Struktur
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => openCreateForm('category')}
              className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              <Plus className="h-4 w-4" />
              Kategorie
            </button>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Lade Daten...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Noch keine Kategorien vorhanden.</p>
              <p className="text-sm">Erstellen Sie die erste Kategorie mit dem Button oben.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map(category => {
                const categoryRoles = getRolesForCategory(category.id);
                const isExpanded = expandedCategories.has(category.id);
                
                return (
                  <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Category Row */}
                    <div className="bg-green-50 border-b border-gray-200 p-4 flex items-center justify-between hover:bg-green-100">
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
                          <FolderOpen className="h-5 w-5 text-green-600" />
                        ) : (
                          <Folder className="h-5 w-5 text-green-600" />
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
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openCreateForm('role', category.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          <Plus className="h-3 w-3" />
                          Rolle
                        </button>
                        
                        <button
                          onClick={() => openEditForm('category', category)}
                          className="inline-flex items-center justify-center w-8 h-8 text-green-600 hover:bg-green-100 rounded"
                          title="Bearbeiten"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDelete('category', category)}
                          className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:bg-red-100 rounded"
                          title="Löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Roles (when category is expanded) */}
                    {isExpanded && (
                      <div className="bg-white">
                        {categoryRoles.map(role => {
                          const roleTasks = getTasksForRole(role.id);
                          const isRoleExpanded = expandedRoles.has(role.id);
                          
                          return (
                            <div key={role.id} className="border-b border-gray-100 last:border-b-0">
                              {/* Role Row */}
                              <div className="bg-blue-50 p-4 pl-12 flex items-center justify-between hover:bg-blue-100">
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
                                  
                                  <User className="h-4 w-4 text-blue-600" />
                                  
                                  <div>
                                    <h4 className="font-medium text-gray-900">{role.name}</h4>
                                    {role.description && (
                                      <p className="text-sm text-gray-600">{role.description}</p>
                                    )}
                                    <p className="text-xs text-gray-500">
                                      {roleTasks.length} Aufgabe(n)
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openCreateForm('task', role.id)}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Aufgabe
                                  </button>
                                  
                                  <button
                                    onClick={() => openEditForm('role', role)}
                                    className="inline-flex items-center justify-center w-7 h-7 text-blue-600 hover:bg-blue-100 rounded"
                                    title="Bearbeiten"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  
                                  <button
                                    onClick={() => handleDelete('role', role)}
                                    className="inline-flex items-center justify-center w-7 h-7 text-red-600 hover:bg-red-100 rounded"
                                    title="Löschen"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Tasks (when role is expanded) */}
                              {isRoleExpanded && (
                                <div className="bg-white">
                                  {roleTasks.map(task => (
                                    <div key={task.id} className="p-4 pl-20 border-b border-gray-50 last:border-b-0 hover:bg-gray-50">
                                      <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3 flex-1">
                                          <CheckSquare className="h-4 w-4 text-purple-600 mt-0.5" />
                                          
                                          <div className="flex-1">
                                            <h5 className="font-medium text-gray-900">{task.task}</h5>
                                            {task.description && (
                                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                            )}
                                            {task.outputs && (
                                              <div className="mt-2">
                                                <span className="text-xs font-medium text-gray-700">Outputs:</span>
                                                <p className="text-sm text-gray-600">{task.outputs}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 ml-4">
                                          <button
                                            onClick={() => openEditForm('task', task)}
                                            className="inline-flex items-center justify-center w-6 h-6 text-purple-600 hover:bg-purple-100 rounded"
                                            title="Bearbeiten"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </button>
                                          
                                          <button
                                            onClick={() => handleDelete('task', task)}
                                            className="inline-flex items-center justify-center w-6 h-6 text-red-600 hover:bg-red-100 rounded"
                                            title="Löschen"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  
                                  {roleTasks.length === 0 && (
                                    <div className="p-4 pl-20 text-center text-gray-500 text-sm">
                                      Noch keine Aufgaben vorhanden.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {categoryRoles.length === 0 && (
                          <div className="p-4 pl-12 text-center text-gray-500 text-sm">
                            Noch keine Rollen vorhanden.
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
      </div>

      {/* Create/Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeForm} />
          <div className="relative bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingItem ? 'Bearbeiten' : 'Erstellen'}: {
                  editMode === 'category' ? 'Kategorie' :
                  editMode === 'role' ? 'Rolle' : 'Aufgabe'
                }
              </h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {editMode === 'task' ? 'Aufgabe' : 'Name'} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={
                    editMode === 'category' ? 'z.B. Development' :
                    editMode === 'role' ? 'z.B. Backend Developer' :
                    'z.B. API Design'
                  }
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
                    <option value="">Kategorie wählen...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
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
              
              {editMode === 'task' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Outputs/Ergebnisse
                  </label>
                  <textarea
                    value={formData.outputs}
                    onChange={(e) => setFormData(prev => ({ ...prev, outputs: e.target.value }))}
                    placeholder="z.B. API Dokumentation, Swagger Files..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
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
                disabled={!formData.name.trim() || isSubmitting || (editMode === 'role' && !formData.category)}
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
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Kategorie neu zuordnen</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Die Kategorie "{categoryToDelete.name}" enthält Rollen und Aufgaben. 
                Wählen Sie eine andere Kategorie für die Neuzuordnung:
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Neue Kategorie *
                </label>
                <select
                  value={reassignToCategoryId}
                  onChange={(e) => setReassignToCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Kategorie wählen...</option>
                  {categories
                    .filter(cat => cat.id !== categoryToDelete.id)
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowReassignDialog(false);
                  setCategoryToDelete(null);
                  setReassignToCategoryId('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleReassignment}
                disabled={!reassignToCategoryId}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Neu zuordnen & löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HierarchicalRoleManagement;
