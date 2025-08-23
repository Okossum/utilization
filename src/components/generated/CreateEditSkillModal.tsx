import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TechnicalSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  createdAt: any;
  isActive: boolean;
}

interface SkillFormData {
  name: string;
  description: string;
  category: string; // Legacy field for backward compatibility
  categoryId: string; // New field for category reference
}

interface CreateEditSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSkill?: TechnicalSkill | null;
  onSkillSaved: () => void; // Callback wenn ein Skill gespeichert wurde
  availableCategories: string[];
}

const CreateEditSkillModal: React.FC<CreateEditSkillModalProps> = ({
  isOpen,
  onClose,
  editingSkill,
  onSkillSaved,
  availableCategories,
}) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState<SkillFormData>({
    name: '',
    description: '',
    category: '', // Legacy field
    categoryId: '' // New field
  });
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kategorien laden
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/technical-skill-categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const categoriesData = await response.json();
        setCategories(categoriesData);
      }
    } catch (error) {
      // Ignore errors - categories are optional
    }
  };

  // Form mit editingSkill-Daten füllen
  useEffect(() => {
    if (editingSkill) {
      setFormData({
        name: editingSkill.name,
        description: editingSkill.description,
        category: editingSkill.category || '', // Legacy field
        categoryId: (editingSkill as any).categoryId || '' // New field
      });
    } else {
      setFormData({ 
        name: '', 
        description: '', 
        category: '', // Legacy field
        categoryId: '' // New field
      });
    }
    setError(null);
  }, [editingSkill, isOpen]);

  // Kategorien laden beim Öffnen
  useEffect(() => {
    if (isOpen && token) {
      loadCategories();
    }
  }, [isOpen, token]);

  // Skill erstellen
  const createSkill = async (skillData: SkillFormData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/technical-skills', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: skillData.name,
          description: skillData.description,
          category: skillData.category, // Legacy field
          categoryId: skillData.categoryId // New field
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen des Skills');
      }

      // Erfolgreich erstellt
      onSkillSaved();
      onClose();
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Skill bearbeiten
  const updateSkill = async (skillData: SkillFormData) => {
    if (!editingSkill) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/technical-skills/${editingSkill.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: skillData.name,
          description: skillData.description,
          category: skillData.category, // Legacy field
          categoryId: skillData.categoryId // New field
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Bearbeiten des Skills');
      }

      // Erfolgreich bearbeitet
      onSkillSaved();
      onClose();
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSkill) {
      updateSkill(formData);
    } else {
      createSkill(formData);
    }
  };

  // Dialog schließen
  const handleClose = () => {
    setFormData({ 
      name: '', 
      description: '', 
      category: '', // Legacy field
      categoryId: '' // New field
    });
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {editingSkill ? 'Technical Skill bearbeiten' : 'Neuen Technical Skill hinzufügen'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {editingSkill ? 'Bearbeiten Sie die Details des Technical Skills' : 'Erstellen Sie einen neuen Technical Skill für die Mitarbeiter-Zuweisungen'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Skill Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skill-Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="z.B. React, Python, AWS, Docker..."
                    required
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Geben Sie einen präzisen Namen für den Technical Skill ein
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschreibung
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                    rows={4}
                    placeholder="Detaillierte Beschreibung des Skills, Anwendungsbereich, wichtige Aspekte..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Optionale Beschreibung für bessere Verständlichkeit und Zuordnung
                  </p>
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategorie
                  </label>
                  
                  {/* Dropdown für Firebase-Kategorien */}
                  <select
                    value={formData.categoryId}
                    onChange={(e) => {
                      const selectedCategory = categories.find(cat => cat.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        categoryId: e.target.value,
                        category: selectedCategory?.name || '' // Legacy field
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Keine Kategorie</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  
                  <p className="mt-1 text-xs text-gray-500">
                    Wählen Sie eine Kategorie aus oder lassen Sie das Feld leer
                  </p>
                </div>

                {/* Preview Card */}
                {formData.name && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Vorschau:</h4>
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="font-medium text-gray-900 mb-1">{formData.name}</div>
                      {formData.description && (
                        <p className="text-sm text-gray-600 mb-2">{formData.description}</p>
                      )}
                      {formData.categoryId && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {categories.find(cat => cat.id === formData.categoryId)?.name || formData.category}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.name.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingSkill ? 'Änderungen speichern' : 'Skill hinzufügen'}
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateEditSkillModal;
