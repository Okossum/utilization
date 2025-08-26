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
import { useAuth } from '../../contexts/AuthContext';

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

// Projekt-spezifischer Skill (ohne globale DB-Speicherung)
interface ProjectSkill {
  id: string;
  name: string;
  categoryName: string;
  level: number;
}

interface ProjectSkillSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillSelected: (skill: ProjectSkill) => void;
}

export const ProjectSkillSelectionModal: React.FC<ProjectSkillSelectionModalProps> = ({
  isOpen,
  onClose,
  onSkillSelected,
}) => {
  const { token } = useAuth();
  
  // State für hierarchische Auswahl
  const [categories, setCategories] = useState<TechnicalSkillCategory[]>([]);
  const [skills, setSkills] = useState<TechnicalSkill[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Hierarchische Auswahl State
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Skill-Level State für jeden einzelnen Skill
  const [skillLevels, setSkillLevels] = useState<Record<string, number>>({});

  // Kategorien laden
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/technical-skill-categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📂 Skill-Kategorien geladen:', data);
      setCategories(data);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Skill-Kategorien:', error);
      setError('Fehler beim Laden der Skill-Kategorien');
    }
  };

  // Skills laden
  const loadSkills = async () => {
    try {
      const response = await fetch('/api/technical-skills', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🛠️ Skills geladen:', data);
      
      // Kategorienamen zu Skills hinzufügen
      const skillsWithCategories = data.map((skill: TechnicalSkill) => ({
        ...skill,
        categoryName: categories.find(cat => cat.id === skill.categoryId)?.name || 'Unbekannt'
      }));
      
      setSkills(skillsWithCategories);
      
      // Standard-Level für alle Skills setzen
      const defaultLevels: Record<string, number> = {};
      skillsWithCategories.forEach((skill: TechnicalSkill) => {
        defaultLevels[skill.id] = 3; // Standard: 3 Sterne
      });
      setSkillLevels(defaultLevels);
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der Skills:', error);
      setError('Fehler beim Laden der Skills');
    }
  };

  // Alle Daten laden beim Öffnen
  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await loadCategories();
    } catch (error) {
      console.error('❌ Fehler beim Laden der Daten:', error);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  // Skills laden nach Kategorien
  useEffect(() => {
    if (categories.length > 0) {
      loadSkills();
    }
  }, [categories]);

  // Daten laden beim Öffnen
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 ProjectSkillSelectionModal: Lade Daten...');
      loadAllData();
      
      // Reset bei Öffnung
      setExpandedCategories(new Set());
      setSearchTerm('');
      setSkillLevels({});
    }
  }, [isOpen]);

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

  // Skill-Level setzen
  const setSkillLevel = (skillId: string, level: number) => {
    setSkillLevels(prev => ({
      ...prev,
      [skillId]: level
    }));
  };

  // Skill auswählen (nur lokale Auswahl, keine DB-Speicherung)
  const handleSkillSelection = (skillId: string) => {
    const skill = skills.find(s => s.id === skillId);
    if (!skill) {
      setError('Skill nicht gefunden');
      return;
    }

    const level = skillLevels[skillId] || 3;

    const projectSkill: ProjectSkill = {
      id: skill.id,
      name: skill.name,
      categoryName: skill.categoryName || 'Unbekannt',
      level: level
    };

    console.log('🛠️ Projekt-Skill ausgewählt:', JSON.stringify(projectSkill, null, 2));
    onSkillSelected(projectSkill);
  };

  // Gefilterte Kategorien
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

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
                  Projekt-Skill auswählen
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Wählen Sie einen Skill für dieses spezifische Projekt
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
                        const categorySkills = skills.filter(skill => skill.categoryId === category.id);
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
                                {categorySkills.map(skill => {
                                  const level = skillLevels[skill.id] || 3;
                                  
                                  return (
                                    <div key={skill.id} className="border-b border-gray-100 last:border-b-0">
                                      {/* Skill-Header */}
                                      <div className="bg-green-50 p-4 pl-12 flex items-center justify-between hover:bg-green-100">
                                        <div className="flex items-center gap-3">
                                          <Code className="h-4 w-4 text-green-600" />
                                          
                                          <div>
                                            <h4 className="font-medium text-gray-900">{skill.name}</h4>
                                            {skill.description && (
                                              <p className="text-sm text-gray-600">{skill.description}</p>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                          {/* Bewertungslevel */}
                                          <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <button
                                                key={star}
                                                onClick={() => setSkillLevel(skill.id, star)}
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
                                            onClick={() => handleSkillSelection(skill.id)}
                                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
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
