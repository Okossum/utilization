import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Star, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TechnicalSkill {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface AssignedSkill {
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
  onSkillAssigned: () => void; // Callback wenn ein Skill zugewiesen wurde
}

const TechnicalSkillSelectionModal: React.FC<TechnicalSkillSelectionModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  onSkillAssigned,
}) => {
  const { token } = useAuth();
  const [availableSkills, setAvailableSkills] = useState<TechnicalSkill[]>([]);
  const [assignedSkills, setAssignedSkills] = useState<AssignedSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Verfügbare Skills laden
  const loadAvailableSkills = async () => {
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

      const skillsData = await response.json();
      setAvailableSkills(skillsData);
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der verfügbaren Skills:', error);
      setError('Fehler beim Laden der verfügbaren Skills');
    }
  };

  // Zugewiesene Skills laden (über bestehende Employee Skills API)
  const loadAssignedSkills = async () => {
    try {
      // Verwende die korrekte API für Employee Skills
      const response = await fetch(`/api/employee-skills/${encodeURIComponent(employeeId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Falls 404, hat der Employee noch keine Skills - das ist OK
        if (response.status === 404) {
          setAssignedSkills([]);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const skillsData = await response.json();
      // Konvertiere das Format für Kompatibilität
      const formattedSkills = skillsData.map((skill: any) => ({
        id: skill.skillId,
        skillId: skill.skillId,
        skillName: skill.skillName || skill.name,
        level: skill.level,
        assignedAt: skill.assignedAt,
        lastUpdated: skill.lastUpdated
      }));
      setAssignedSkills(formattedSkills);
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der zugewiesenen Skills:', error);
      setError('Fehler beim Laden der zugewiesenen Skills');
    }
  };

  // Alle Daten laden
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadAvailableSkills(),
        loadAssignedSkills()
      ]);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  // Skill zuweisen (über bestehende Employee Skills API)
  const assignSkill = async (skillId: string, skillName: string, level: number) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Verwende die korrekte API für einzelne Skill-Zuweisungen
      const response = await fetch('/api/employee-skills', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          employeeId,
          skillId, 
          skillName, 
          level 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Zuweisen des Skills');
      }

      // Erfolgreich zugewiesen - Daten neu laden und Callback aufrufen
      await loadAssignedSkills();
      onSkillAssigned();
      
    } catch (error: any) {
      console.error('❌ Fehler beim Zuweisen des Skills:', error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verfügbare (nicht zugewiesene) Skills berechnen
  const getUnassignedSkills = () => {
    const assignedSkillIds = assignedSkills.map(skill => skill.skillId);
    return availableSkills.filter(skill => !assignedSkillIds.includes(skill.id));
  };

  // Gefilterte Skills basierend auf Suche und Kategorie
  const getFilteredSkills = () => {
    const unassigned = getUnassignedSkills();
    
    return unassigned.filter(skill => {
      const matchesSearch = skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           skill.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || skill.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  };

  // Verfügbare Kategorien
  const getAvailableCategories = () => {
    const categories = Array.from(new Set(availableSkills.map(skill => skill.category)));
    return categories.filter(cat => cat && cat.trim() !== '');
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

  // SkillCard Component
  const SkillCard: React.FC<{ skill: TechnicalSkill }> = ({ skill }) => {
    const [selectedLevel, setSelectedLevel] = useState(3);
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="mb-3">
          <h4 className="font-medium text-gray-900 mb-1">{skill.name}</h4>
          {skill.description && (
            <p className="text-sm text-gray-600 mb-2">{skill.description}</p>
          )}
          {skill.category && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {skill.category}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-gray-600">Bewertung:</span>
          <StarRating
            value={selectedLevel}
            onChange={setSelectedLevel}
            disabled={isSubmitting}
          />
          <span className="text-sm text-gray-500">({selectedLevel}/5)</span>
        </div>
        
        <button
          onClick={() => assignSkill(skill.id, skill.name, selectedLevel)}
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Zuweisen
        </button>
      </div>
    );
  };

  // Beim Öffnen des Modals Daten laden
  useEffect(() => {
    if (isOpen && token && employeeId) {
      loadData();
    }
  }, [isOpen, token, employeeId]);

  // Reset bei Schließen
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedCategory('');
      setError(null);
    }
  }, [isOpen]);

  const filteredSkills = getFilteredSkills();
  const categories = getAvailableCategories();

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
            className="relative w-full max-w-4xl max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Technical Skills zuweisen
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Neue Technical Skills für {employeeName} auswählen und zuweisen
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </header>

            {/* Filters */}
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Skills durchsuchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                {/* Category Filter */}
                {categories.length > 0 && (
                  <div className="sm:w-48">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Alle Kategorien</option>
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                  <span>Lade verfügbare Skills...</span>
                </div>
              ) : (
                <>
                  {/* Results Count */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      {filteredSkills.length} von {getUnassignedSkills().length} verfügbaren Skills
                      {searchTerm && ` (gefiltert nach "${searchTerm}")`}
                      {selectedCategory && ` in Kategorie "${selectedCategory}"`}
                    </p>
                  </div>

                  {/* Skills Grid */}
                  {filteredSkills.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      {getUnassignedSkills().length === 0 ? (
                        <p>Alle verfügbaren Skills sind bereits zugewiesen.</p>
                      ) : (
                        <p>Keine Skills gefunden, die den Filterkriterien entsprechen.</p>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredSkills.map((skill) => (
                        <SkillCard key={skill.id} skill={skill} />
                      ))}
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

export default TechnicalSkillSelectionModal;
