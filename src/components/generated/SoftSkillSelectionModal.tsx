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
  Heart
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SoftSkill {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName?: string;
}

interface SoftSkillCategory {
  id: string;
  name: string;
  description?: string;
}

interface AssignedSoftSkill {
  id: string;
  skillId: string;
  skillName: string;
  level: number;
  assignedAt: any;
  lastUpdated: any;
}

interface SoftSkillSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  onSkillAssigned: () => void;
}

const SoftSkillSelectionModal: React.FC<SoftSkillSelectionModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  onSkillAssigned,
}) => {
  const { token } = useAuth();
  
  // State für hierarchische Auswahl
  const [categories, setCategories] = useState<SoftSkillCategory[]>([]);
  const [skills, setSkills] = useState<SoftSkill[]>([]);
  const [assignedSkills, setAssignedSkills] = useState<AssignedSoftSkill[]>([]);
  
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
      const response = await fetch('/api/soft-skill-categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentifizierung fehlgeschlagen. Bitte melden Sie sich erneut an.');
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const categoriesData = await response.json();
      setCategories(categoriesData.filter((cat: any) => cat.isActive));
      
    } catch (error) {
      console.error('Error loading soft skill categories:', error);
      setError('Fehler beim Laden der Kategorien');
    }
  };

  // Skills laden
  const loadSkills = async () => {
    try {
      const response = await fetch('/api/soft-skills', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentifizierung fehlgeschlagen. Bitte melden Sie sich erneut an.');
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const skillsData = await response.json();
      setSkills(skillsData.filter((skill: any) => skill.isActive));
      
    } catch (error) {
      console.error('Error loading soft skills:', error);
      setError('Fehler beim Laden der Skills');
    }
  };

  // Bereits zugewiesene Skills laden
  const loadAssignedSkills = async () => {
    try {
      const response = await fetch(`/api/employees/${encodeURIComponent(employeeId)}/soft-skills`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentifizierung fehlgeschlagen. Bitte melden Sie sich erneut an.');
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const assignedData = await response.json();
      setAssignedSkills(assignedData);
      
      // Skill-Level State initialisieren
      const initialLevels: Record<string, number> = {};
      assignedData.forEach((assigned: AssignedSoftSkill) => {
        initialLevels[assigned.skillId] = assigned.level;
      });
      setSkillLevels(initialLevels);
      
    } catch (error) {
      console.error('Error loading assigned soft skills:', error);
      setError('Fehler beim Laden der zugewiesenen Skills');
    }
  };

  // Daten laden beim Öffnen
  useEffect(() => {
    if (isOpen && token) {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      Promise.all([
        loadCategories(),
        loadSkills(),
        loadAssignedSkills()
      ]).finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen, token, employeeId]);

  // Kategorie erweitern/zusammenklappen
  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Skill-Level ändern
  const handleSkillLevelChange = (skillId: string, level: number) => {
    setSkillLevels(prev => ({
      ...prev,
      [skillId]: level
    }));
    setError(null);
  };

  // Skills zuweisen/aktualisieren
  const handleAssignSkills = async () => {
    const skillsToAssign = Object.entries(skillLevels).filter(([_, level]) => level > 0);
    
    if (skillsToAssign.length === 0) {
      setError('Bitte wählen Sie mindestens einen Skill mit einem Level > 0 aus');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const assignments = skillsToAssign.map(([skillId, level]) => ({
        skillId,
        level
      }));

      const response = await fetch(`/api/employees/${encodeURIComponent(employeeId)}/soft-skills`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assignments })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentifizierung fehlgeschlagen. Bitte melden Sie sich erneut an.');
        }
        const errorData = await response.text();
        let errorMessage = `HTTP ${response.status}: ${errorData}`;
        try {
          const parsedError = JSON.parse(errorData);
          errorMessage = parsedError.error || errorMessage;
        } catch {
          // Keep original error message if parsing fails
        }
        throw new Error(errorMessage);
      }

      setSuccessMessage(`${skillsToAssign.length} Soft Skills erfolgreich zugewiesen!`);
      
      // Parent benachrichtigen
      onSkillAssigned();
      
      // Nach 2 Sekunden schließen
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Error assigning soft skills:', error);
      setError(error instanceof Error ? error.message : 'Fehler beim Zuweisen der Skills');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Skills nach Kategorie gruppieren und filtern
  const filteredAndGroupedSkills = React.useMemo(() => {
    const filtered = skills.filter(skill => 
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped = categories.map(category => ({
      ...category,
      skills: filtered.filter(skill => skill.categoryId === category.id)
    })).filter(category => category.skills.length > 0);

    return grouped;
  }, [skills, categories, searchTerm]);

  // Star Rating Component
  const StarRating: React.FC<{ skillId: string; currentLevel: number; onChange: (level: number) => void }> = ({
    skillId,
    currentLevel,
    onChange
  }) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`p-1 rounded transition-colors ${
              star <= currentLevel
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-gray-300 hover:text-yellow-300'
            }`}
          >
            <Star className="h-4 w-4 fill-current" />
          </button>
        ))}
        <span className="text-xs text-gray-500 ml-2">
          {currentLevel > 0 ? `Level ${currentLevel}` : 'Nicht ausgewählt'}
        </span>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Heart className="h-6 w-6 text-pink-500" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Soft Skills zuweisen
                </h2>
                <p className="text-sm text-gray-600">
                  Für: {employeeName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col h-[calc(90vh-120px)]">
            {/* Success Message */}
            {successMessage && (
              <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-green-800">{successMessage}</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-800">{error}</div>
              </div>
            )}

            {/* Search */}
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Soft Skills durchsuchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Skills List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                  <span className="ml-2 text-gray-600">Lade Soft Skills...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAndGroupedSkills.map((category) => (
                    <div key={category.id} className="border border-gray-200 rounded-lg">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          {expandedCategories.has(category.id) ? (
                            <FolderOpen className="h-5 w-5 text-pink-500" />
                          ) : (
                            <Folder className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <h3 className="font-medium text-gray-900">{category.name}</h3>
                            <p className="text-sm text-gray-500">{category.skills.length} Skills</p>
                          </div>
                        </div>
                        {expandedCategories.has(category.id) ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </button>

                      {/* Category Skills */}
                      {expandedCategories.has(category.id) && (
                        <div className="border-t border-gray-200 bg-gray-50">
                          {category.skills.map((skill) => {
                            const isAssigned = assignedSkills.some(assigned => assigned.skillId === skill.id);
                            const currentLevel = skillLevels[skill.id] || 0;
                            
                            return (
                              <div
                                key={skill.id}
                                className={`p-4 border-b border-gray-200 last:border-b-0 ${
                                  currentLevel > 0 ? 'bg-pink-50' : 'bg-white'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-medium text-gray-900">{skill.name}</h4>
                                      {isAssigned && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                                          Bereits zugewiesen
                                        </span>
                                      )}
                                    </div>
                                    {skill.description && (
                                      <p className="text-sm text-gray-600 mt-1">{skill.description}</p>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Star Rating */}
                                <div className="mt-3">
                                  <StarRating
                                    skillId={skill.id}
                                    currentLevel={currentLevel}
                                    onChange={(level) => handleSkillLevelChange(skill.id, level)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredAndGroupedSkills.length === 0 && !loading && (
                    <div className="text-center py-12">
                      <Heart className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-gray-500">
                        {searchTerm ? 'Keine Soft Skills gefunden' : 'Keine Soft Skills verfügbar'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {Object.values(skillLevels).filter(level => level > 0).length} Skills ausgewählt
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleAssignSkills}
                    disabled={isSubmitting || Object.values(skillLevels).filter(level => level > 0).length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-pink-600 border border-transparent rounded-md hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Skills zuweisen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export { SoftSkillSelectionModal };
