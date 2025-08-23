import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Check, 
  X, 
  Award, 
  Settings, 
  AlertCircle,
  CheckCircle2,
  Trash2,
  Star
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { StarRating } from './StarRating';

// Types
interface ProjectSkill {
  skillId: string;
  skillName: string;
  description?: string;
  rating: number; // 1-5 Sterne
  isSelected: boolean;
}

interface ProjectSkillCategory {
  categoryId: string;
  categoryName: string;
  selectedSkills: ProjectSkill[];
  isExpanded?: boolean;
}

interface SkillCategory {
  id: string;
  name: string;
  description?: string;
}

interface TechnicalSkill {
  id: string;
  name: string;
  description?: string;
  category: string;
  isActive: boolean;
}

interface ProjectSkillSelectorProps {
  selectedCategories: ProjectSkillCategory[];
  onCategoriesChange: (categories: ProjectSkillCategory[]) => void;
  employeeId?: string;
  projectId?: string;
  className?: string;
}

const ProjectSkillSelector: React.FC<ProjectSkillSelectorProps> = ({
  selectedCategories,
  onCategoriesChange,
  employeeId,
  projectId,
  className = ""
}) => {
  const { token } = useAuth();
  
  // State
  const [availableCategories, setAvailableCategories] = useState<SkillCategory[]>([]);
  const [allSkills, setAllSkills] = useState<Record<string, TechnicalSkill[]>>({});
  const [isAddCategoryDropdownOpen, setIsAddCategoryDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available skill categories
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading skill categories...');
      const response = await fetch('/api/technical-skill-categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Server Error: ${errorData.error || response.statusText}`);
      }
      
      const categories = await response.json();
      console.log('Loaded categories:', categories);
      setAvailableCategories(categories);
      
      if (categories.length === 0) {
        console.log('No skill categories found in database. You may need to create some categories first.');
      }
    } catch (err: any) {
      console.error('Error loading skill categories:', err);
      setError(`Fehler beim Laden der Skill-Kategorien: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load skills for a specific category
  const loadCategorySkills = useCallback(async (categoryName: string) => {
    try {
      console.log('Loading skills for category:', categoryName);
      const response = await fetch('/api/technical-skills', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Server Error: ${errorData.error || response.statusText}`);
      }
      
      const allSkillsData = await response.json();
      console.log('Loaded all skills:', allSkillsData);
      
      // Filter skills by category
      console.log('Filtering skills for category:', categoryName);
      console.log('Available categories in skills:', [...new Set(allSkillsData.map((s: any) => s.category))]);
      
      const categorySkills = allSkillsData.filter((skill: TechnicalSkill) => 
        skill.category === categoryName && skill.isActive
      );
      
      console.log('Filtered skills for category', categoryName, ':', categorySkills);
      
      setAllSkills(prev => ({
        ...prev,
        [categoryName]: categorySkills
      }));
      
      return categorySkills;
    } catch (err: any) {
      console.error('Error loading category skills:', err);
      setError(`Fehler beim Laden der Skills: ${err.message}`);
      return [];
    }
  }, [token]);

  // Initialize
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Get available categories for dropdown (exclude already selected)
  const availableCategoriesForDropdown = useMemo(() => {
    const selectedCategoryIds = selectedCategories.map(cat => cat.categoryId);
    return availableCategories.filter(cat => !selectedCategoryIds.includes(cat.id));
  }, [availableCategories, selectedCategories]);

  // Add existing category
  const handleAddExistingCategory = async (categoryId: string) => {
    const category = availableCategories.find(c => c.id === categoryId);
    if (!category) return;

    // Load skills for this category
    const skills = await loadCategorySkills(category.name);
    
    // Convert to ProjectSkills with default rating 3 and all unselected initially
    const projectSkills: ProjectSkill[] = skills.map(skill => ({
      skillId: skill.id,
      skillName: skill.name,
      description: skill.description,
      rating: 3, // Default rating
      isSelected: false // Not selected by default
    }));

    const newProjectCategory: ProjectSkillCategory = {
      categoryId: category.id,
      categoryName: category.name,
      selectedSkills: projectSkills,
      isExpanded: true
    };

    onCategoriesChange([...selectedCategories, newProjectCategory]);
    setIsAddCategoryDropdownOpen(false);
  };

  // Remove category
  const handleRemoveCategory = (categoryId: string) => {
    const updatedCategories = selectedCategories.filter(cat => cat.categoryId !== categoryId);
    onCategoriesChange(updatedCategories);
  };

  // Toggle skill selection
  const handleSkillToggle = (categoryId: string, skillId: string) => {
    const updatedCategories = selectedCategories.map(category => {
      if (category.categoryId === categoryId) {
        const updatedSkills = category.selectedSkills.map(skill => 
          skill.skillId === skillId 
            ? { ...skill, isSelected: !skill.isSelected }
            : skill
        );
        return { ...category, selectedSkills: updatedSkills };
      }
      return category;
    });
    onCategoriesChange(updatedCategories);
  };

  // Update skill rating
  const handleSkillRatingChange = (categoryId: string, skillId: string, rating: number) => {
    const updatedCategories = selectedCategories.map(category => {
      if (category.categoryId === categoryId) {
        const updatedSkills = category.selectedSkills.map(skill => 
          skill.skillId === skillId 
            ? { ...skill, rating }
            : skill
        );
        return { ...category, selectedSkills: updatedSkills };
      }
      return category;
    });
    onCategoriesChange(updatedCategories);
  };

  // Toggle category expansion
  const handleToggleExpansion = (categoryId: string) => {
    const updatedCategories = selectedCategories.map(category => 
      category.categoryId === categoryId 
        ? { ...category, isExpanded: !category.isExpanded }
        : category
    );
    onCategoriesChange(updatedCategories);
  };

  // Toggle all skills in a category
  const handleToggleAllSkills = (categoryId: string, selectAll: boolean) => {
    const updatedCategories = selectedCategories.map(category => {
      if (category.categoryId === categoryId) {
        const updatedSkills = category.selectedSkills.map(skill => ({
          ...skill,
          isSelected: selectAll
        }));
        return { ...category, selectedSkills: updatedSkills };
      }
      return category;
    });
    onCategoriesChange(updatedCategories);
  };

  // Get skill statistics for a category
  const getSkillStats = (category: ProjectSkillCategory) => {
    const selected = category.selectedSkills.filter(skill => skill.isSelected).length;
    const total = category.selectedSkills.length;
    return { selected, total };
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Projekt Skills & Bewertungen
          </h3>
          <p className="text-sm text-gray-600">
            Wählen Sie Skills und bewerten Sie diese für dieses Projekt
          </p>
        </div>
        
        {/* Add Category Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsAddCategoryDropdownOpen(!isAddCategoryDropdownOpen)}
            disabled={availableCategoriesForDropdown.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Skill-Kategorie hinzufügen</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isAddCategoryDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
              >
                <div className="p-2">
                  {availableCategoriesForDropdown.length > 0 ? (
                    <>
                      <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold px-3 py-2">
                        Verfügbare Kategorien
                      </div>
                      {availableCategoriesForDropdown.map(category => (
                        <button
                          key={category.id}
                          onClick={() => handleAddExistingCategory(category.id)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-blue-500" />
                            <span>{category.name}</span>
                          </div>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      Alle verfügbaren Kategorien bereits ausgewählt
                    </div>
                  )}
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

      {/* Selected Categories */}
      <div className="space-y-3">
        <AnimatePresence>
          {selectedCategories.map(category => {
            const stats = getSkillStats(category);
            const allSelected = stats.selected === stats.total;
            const someSelected = stats.selected > 0 && stats.selected < stats.total;
            
            return (
              <motion.div
                key={category.categoryId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="border border-gray-200 rounded-lg overflow-hidden bg-white"
              >
                {/* Category Header */}
                <div className="p-4 bg-blue-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleExpansion(category.categoryId)}
                        className="p-1 hover:bg-blue-100 rounded transition-colors"
                      >
                        {category.isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-blue-600" />
                        <h4 className="font-medium text-blue-900">{category.categoryName}</h4>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-blue-700">
                        <span>{stats.selected}/{stats.total} Skills</span>
                        {allSelected && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {someSelected && <div className="w-4 h-4 bg-yellow-400 rounded-sm"></div>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Toggle All Skills */}
                      <button
                        onClick={() => handleToggleAllSkills(category.categoryId, !allSelected)}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        {allSelected ? 'Alle abwählen' : 'Alle auswählen'}
                      </button>
                      
                      {/* Remove Category */}
                      <button
                        onClick={() => handleRemoveCategory(category.categoryId)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Kategorie entfernen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Skills List */}
                <AnimatePresence>
                  {category.isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-3">
                        {category.selectedSkills.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Settings className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p>Keine Skills in dieser Kategorie verfügbar</p>
                          </div>
                        ) : (
                          category.selectedSkills.map(skill => (
                            <div
                              key={skill.skillId}
                              className={`p-4 border rounded-lg transition-colors ${
                                skill.isSelected 
                                  ? 'border-blue-200 bg-blue-50' 
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => handleSkillToggle(category.categoryId, skill.skillId)}
                                  className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    skill.isSelected
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-gray-300 hover:border-blue-400'
                                  }`}
                                >
                                  {skill.isSelected && <Check className="w-3 h-3" />}
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h5 className={`font-medium ${
                                      skill.isSelected ? 'text-blue-900' : 'text-gray-700'
                                    }`}>
                                      {skill.skillName}
                                    </h5>
                                    
                                    {/* Skill Rating */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">Bewertung:</span>
                                      <StarRating
                                        value={skill.rating}
                                        max={5}
                                        size={16}
                                        readOnly={false}
                                        onChange={(rating) => handleSkillRatingChange(category.categoryId, skill.skillId, rating)}
                                        className="flex-shrink-0"
                                      />
                                      <span className="text-xs text-gray-600 min-w-[20px]">
                                        {skill.rating}/5
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {skill.description && (
                                    <p className={`text-sm mt-1 ${
                                      skill.isSelected ? 'text-blue-700' : 'text-gray-600'
                                    }`}>
                                      {skill.description}
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
        {selectedCategories.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Keine Skill-Kategorien ausgewählt
            </h3>
            <p className="text-gray-600 mb-4">
              Fügen Sie Skill-Kategorien hinzu, um Skills zu bewerten
            </p>
            <button
              onClick={() => setIsAddCategoryDropdownOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Erste Kategorie hinzufügen</span>
            </button>
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {isAddCategoryDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsAddCategoryDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default ProjectSkillSelector;
