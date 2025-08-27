import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, X, ChevronRight, ChevronDown, FolderOpen, Folder, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Interfaces
interface SkillCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: any;
  isActive: boolean;
}

interface SoftSkill {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  createdAt: any;
  isActive: boolean;
}

interface FormData {
  name: string;
  description: string;
  category?: string;
}

type EditMode = 'category' | 'skill' | null;

const SoftSkillManagement: React.FC = () => {
  const { token } = useAuth();
  
  // State
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [skills, setSkills] = useState<SoftSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reassignment dialog state
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<SkillCategory | null>(null);
  const [reassignToCategoryId, setReassignToCategoryId] = useState<string>('');

  // Load all data
  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Load categories
      const categoriesResponse = await fetch('/api/soft-skill-categories', {
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
      console.log('🔍 Soft Skill Categories loaded:', categoriesData);

      // Load skills
      const skillsResponse = await fetch('/api/soft-skills', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!skillsResponse.ok) {
        throw new Error(`HTTP ${skillsResponse.status}: ${skillsResponse.statusText}`);
      }
      
      const skillsData = await skillsResponse.json();
      setSkills(skillsData);
      console.log('🔍 Soft Skills loaded:', skillsData);
      
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
      const response = await fetch('/api/soft-skill-categories', {
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

  // Create skill
  const createSkill = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/soft-skills', {
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
        throw new Error(errorData.error || 'Fehler beim Erstellen des Skills');
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
      const response = await fetch(`/api/soft-skill-categories/${editingItem.id}`, {
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

  // Update skill
  const updateSkill = async () => {
    if (!editingItem) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/soft-skills/${editingItem.id}`, {
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
        throw new Error(errorData.error || 'Fehler beim Bearbeiten des Skills');
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
  const deleteCategory = async (category: SkillCategory) => {
    const skillsInCategory = getSkillsForCategory(category.name);
    
    if (skillsInCategory.length > 0) {
      setCategoryToDelete(category);
      setShowReassignDialog(true);
      return;
    }
    
    if (!confirm(`Möchten Sie die Kategorie "${category.name}" wirklich löschen?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/soft-skill-categories/${category.id}`, {
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

  // Delete skill
  const deleteSkill = async (skill: SoftSkill) => {
    if (!confirm(`Möchten Sie den Soft Skill "${skill.name}" wirklich löschen?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/soft-skills/${skill.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen des Skills');
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
      
      // Reassign skills if target category selected
      if (reassignToCategoryId) {
        const targetCategory = categories.find(c => c.id === reassignToCategoryId);
        if (targetCategory) {
          const skillsToReassign = getSkillsForCategory(categoryToDelete.name);
          
          for (const skill of skillsToReassign) {
            await fetch(`/api/soft-skills/${skill.id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ...skill,
                category: targetCategory.name
              })
            });
          }
        }
      }
      
      // Delete category
      const response = await fetch(`/api/soft-skill-categories/${categoryToDelete.id}`, {
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
    setFormData({ name: '', description: '', category: '' });
    setIsFormOpen(true);
  };

  const openCreateSkillForm = (categoryName?: string) => {
    setEditMode('skill');
    setEditingItem(null);
    setFormData({ name: '', description: '', category: categoryName || '' });
    setIsFormOpen(true);
  };

  const openEditCategoryForm = (category: SkillCategory) => {
    setEditMode('category');
    setEditingItem(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      category: ''
    });
    setIsFormOpen(true);
  };

  const openEditSkillForm = (skill: SoftSkill) => {
    setEditMode('skill');
    setEditingItem(skill);
    setFormData({
      name: skill.name,
      description: skill.description || '',
      category: skill.categoryName || ''
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditMode(null);
    setEditingItem(null);
    setFormData({ name: '', description: '', category: '' });
    setError(null);
  };

  const handleSubmit = () => {
    if (editMode === 'category') {
      if (editingItem) {
        updateCategory();
      } else {
        createCategory();
      }
    } else if (editMode === 'skill') {
      if (editingItem) {
        updateSkill();
      } else {
        createSkill();
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

  // Get skills for category
  const getSkillsForCategory = (categoryName: string) => {
    return skills.filter(skill => 
      skill.categoryName === categoryName || 
      skill.category === categoryName ||
      (skill.categoryId && categories.find(cat => cat.id === skill.categoryId)?.name === categoryName)
    );
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
        <span>Lade Soft Skills...</span>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Soft Skills Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Verwalten Sie Kategorien, Soft Skills und Aufgaben in einer hierarchischen Struktur
          </p>
        </div>
        
        <button
          onClick={openCreateCategoryForm}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
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
            const categorySkills = getSkillsForCategory(category.name);
            const isExpanded = expandedCategories.has(category.id);
            
            return (
              <div key={category.id} className="border border-gray-200 rounded-lg bg-pink-50">
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
                      {isExpanded ? <FolderOpen className="w-4 h-4 text-pink-600" /> : <Folder className="w-4 h-4 text-pink-600" />}
                      <span className="font-medium text-gray-900">{category.name}</span>
                      <span className="text-sm text-gray-500">
                        {categorySkills.length} Skill{categorySkills.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openCreateSkillForm(category.name)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-pink-600 text-white text-sm rounded hover:bg-pink-700"
                    >
                      <Plus className="w-3 h-3" />
                      Skill
                    </button>
                    <button
                      onClick={() => openEditCategoryForm(category)}
                      className="inline-flex items-center justify-center w-8 h-8 text-pink-600 hover:bg-pink-100 rounded"
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
                
                {/* Skills List */}
                {isExpanded && (
                  <div className="border-t border-pink-200 bg-white">
                    {categorySkills.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        Keine Skills in dieser Kategorie
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {categorySkills.map((skill) => (
                          <div key={skill.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <Heart className="w-4 h-4 text-pink-600" />
                              <div>
                                <div className="font-medium text-gray-900">{skill.name}</div>
                                {skill.description && (
                                  <div className="text-sm text-gray-600">{skill.description}</div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditSkillForm(skill)}
                                className="inline-flex items-center justify-center w-8 h-8 text-pink-600 hover:bg-pink-50 rounded"
                                title="Skill bearbeiten"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteSkill(skill)}
                                className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:bg-red-50 rounded"
                                title="Skill löschen"
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

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={closeForm} />
          <div className="relative bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editMode === 'category' 
                  ? (editingItem ? 'Kategorie bearbeiten' : 'Neue Kategorie erstellen')
                  : (editingItem ? 'Skill bearbeiten' : 'Neuen Skill erstellen')
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {editMode === 'category' ? 'Kategoriename' : 'Skill-Name'} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={editMode === 'category' ? 'z.B. Kommunikation, Führung' : 'z.B. Teamwork, Empathie'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              
              {editMode === 'skill' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategorie *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
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
                onClick={closeForm}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.name.trim() || (editMode === 'skill' && !formData.category.trim()) || isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                Die Kategorie "{categoryToDelete.name}" enthält {getSkillsForCategory(categoryToDelete.name).length} Skills. 
                Was soll mit diesen Skills geschehen?
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
                  Skills ebenfalls löschen
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
                  Skills zu anderer Kategorie verschieben:
                </label>
                
                {reassignToCategoryId && (
                  <select
                    value={reassignToCategoryId}
                    onChange={(e) => setReassignToCategoryId(e.target.value)}
                    className="ml-6 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
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

export default SoftSkillManagement;