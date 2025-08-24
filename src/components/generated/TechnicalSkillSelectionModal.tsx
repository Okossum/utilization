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
  CheckCircle2,
  Code
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TechnicalSkill {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName?: string;
}

interface TechnicalSkillCategory {
  id: string;
  name: string;
  description?: string;
}

interface AssignedTechnicalSkill {
  id: string;
  skillId: string;
  skillName: string;
  level: number;
  assignedAt: any;
  lastUpdated: any;
}

interface TechnicalSkillSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  onSkillAssigned: () => void;
}

const TechnicalSkillSelectionModal: React.FC<TechnicalSkillSelectionModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  onSkillAssigned,
}) => {
  const { token } = useAuth();
  
  // State für hierarchische Auswahl
  const [categories, setCategories] = useState<TechnicalSkillCategory[]>([]);
  const [skills, setSkills] = useState<TechnicalSkill[]>([]);
  const [assignedSkills, setAssignedSkills] = useState<AssignedTechnicalSkill[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Hierarchische Auswahl State
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Skill-Level State für jeden einzelnen Skill
  const [skillLevels, setSkillLevels] = useState<Record<string, number>>({});

  // Kategorien laden
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/technical-skill-categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) { throw new Error(`HTTP ${response.status}: ${response.statusText}`); }
      const categoriesData = await response.json();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
      setError('Fehler beim Laden der Kategorien');
    }
  };

  // Skills laden
  const loadSkills = async () => {
    try {
      const response = await fetch('/api/technical-skills', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) { throw new Error(`HTTP ${response.status}: ${response.statusText}`); }
      const skillsData = await response.json();
      setSkills(skillsData);
      
      // Initialisiere Skill-Levels (Standard: 3 pro Skill)
      const levelsBySkill: Record<string, number> = {};
      skillsData.forEach((skill: TechnicalSkill) => {
        levelsBySkill[skill.id] = 3; // Jeder Skill bekommt Standard-Level 3
      });
      setSkillLevels(levelsBySkill);
      
    } catch (error) {
      console.error('Error loading skills:', error);
      setError('Fehler beim Laden der Skills');
    }
  };

  // Zugewiesene Skills laden
  const loadAssignedSkills = async () => {
    try {
      const response = await fetch(`/api/employee-technical-skills/${employeeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) { throw new Error(`HTTP ${response.status}: ${response.statusText}`); }
      const assignedData = await response.json();
      setAssignedSkills(assignedData);
    } catch (error) {
      console.warn('Error loading assigned skills:', error);
      setAssignedSkills([]);
    }
  };

  // Alle Daten laden
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadCategories(),
        loadSkills(),
        loadAssignedSkills()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Fehler beim Laden der Daten');
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

  // Bewertungslevel für einzelnen Skill ändern
  const updateSkillLevel = (skillId: string, level: number) => {
    setSkillLevels(prev => ({
      ...prev,
      [skillId]: level
    }));
  };

  // Skill zuweisen
  const assignSkill = async (categoryId: string, skillId: string) => {
    const level = skillLevels[skillId] || 3;
    const skill = skills.find(s => s.id === skillId);
    const skillName = skill?.name || 'Skill';

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/employee-technical-skills/${employeeId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          skillId: skillId,
          level: level,
          categoryId: categoryId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Zuweisen des Skills');
      }

      // Success message setzen
      setSuccessMessage(`${skillName} wurde erfolgreich zugewiesen`);
      
      // Daten neu laden
      await loadAssignedSkills();
      
      // Callback aufrufen
      onSkillAssigned();

    } catch (error: any) {
      console.error('Error assigning skill:', error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Skills für eine Kategorie abrufen
  const getSkillsForCategory = (categoryId: string): TechnicalSkill[] => {
    return skills.filter(skill => skill.categoryId === categoryId);
  };

  // Gefilterte Kategorien
  const getFilteredCategories = (): TechnicalSkillCategory[] => {
    return categories.filter(category => {
      const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  };

  // Prüfen ob Skill bereits zugewiesen ist
  const isSkillAssigned = (skillId: string) => {
    return assignedSkills.some(assigned => assigned.skillId === skillId);
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
    if (isOpen && token && employeeId) {
      loadData();
    }
  }, [isOpen, token, employeeId]);

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
      setSkillLevels({});
      setExpandedCategories(new Set());
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
            <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Technical Skills zuweisen
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Wählen Sie Kategorien und Skills für {employeeName} aus
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  <span>Lade Kategorien und Skills...</span>
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
                        const categorySkills = getSkillsForCategory(category.id);
                        const isExpanded = expandedCategories.has(category.id);
                        
                        return (
                          <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                            {/* Kategorie-Header */}
                            <div className="bg-purple-50 border-b border-gray-200 p-4 flex items-center justify-between hover:bg-purple-100">
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
                                  <FolderOpen className="h-5 w-5 text-purple-600" />
                                ) : (
                                  <Folder className="h-5 w-5 text-purple-600" />
                                )}
                                
                                <div>
                                  <h3 className="font-medium text-gray-900">{category.name}</h3>
                                  {category.description && (
                                    <p className="text-sm text-gray-600">{category.description}</p>
                                  )}
                                  <p className="text-xs text-gray-500">
                                    {categorySkills.length} Skill(s)
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Skills (wenn Kategorie expandiert) */}
                            {isExpanded && (
                              <div className="bg-white">
                                {categorySkills.length === 0 ? (
                                  <div className="p-4 pl-12 text-center text-gray-500 text-sm">
                                    Keine Skills für diese Kategorie verfügbar.
                                  </div>
                                ) : (
                                  <div className="p-4 pl-12 space-y-2">
                                    {categorySkills.map(skill => {
                                      const isAssigned = isSkillAssigned(skill.id);
                                      const level = skillLevels[skill.id] || 3;
                                      
                                      return (
                                        <div
                                          key={skill.id}
                                          className={`p-3 border rounded-lg transition-colors ${
                                            isAssigned
                                              ? 'border-green-200 bg-green-50' 
                                              : 'border-gray-200 bg-gray-50 hover:bg-purple-50'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-start gap-3">
                                              <Code className="w-5 h-5 text-purple-600 mt-1" />
                                              
                                              <div className="flex-1 min-w-0">
                                                <h5 className={`font-medium ${
                                                  isAssigned ? 'text-green-900' : 'text-gray-700'
                                                }`}>
                                                  {skill.name}
                                                </h5>
                                                
                                                {skill.description && (
                                                  <p className={`text-sm mt-1 ${
                                                    isAssigned ? 'text-green-700' : 'text-gray-600'
                                                  }`}>
                                                    {skill.description}
                                                  </p>
                                                )}
                                                
                                                {/* Level-Auswahl für diesen Skill */}
                                                {!isAssigned && (
                                                  <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-sm text-gray-600">Level:</span>
                                                    <StarRating
                                                      value={level}
                                                      onChange={(newLevel) => updateSkillLevel(skill.id, newLevel)}
                                                      disabled={isSubmitting}
                                                    />
                                                  </div>
                                                )}
                                                
                                                {isAssigned && (
                                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                                                    Bereits zugewiesen
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            
                                            {/* Zuweisen-Button */}
                                            {!isAssigned && (
                                              <button
                                                onClick={() => assignSkill(category.id, skill.id)}
                                                disabled={isSubmitting}
                                                className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                              >
                                                {isSubmitting ? (
                                                  <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                  <Plus className="w-4 h-4" />
                                                )}
                                                Zuweisen
                                              </button>
                                            )}
                                          </div>
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
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TechnicalSkillSelectionModal;