import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SoftSkill {
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

interface CreateEditSoftSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSkill?: SoftSkill | null;
  onSkillSaved: () => void; // Callback wenn ein Skill gespeichert wurde
  availableCategories: {id: string, name: string}[];
}

const CreateEditSoftSkillModal: React.FC<CreateEditSoftSkillModalProps> = ({
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
      const response = await fetch('/api/soft-skill-categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const categoriesData = await response.json();
      setCategories(categoriesData.filter((cat: any) => cat.isActive));
      
    } catch (error) {
      console.error('Error loading soft skill categories:', error);
    }
  };

  // Form zurücksetzen
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      categoryId: ''
    });
    setError(null);
  };

  // Bearbeitungsmodus: Form mit Skill-Daten füllen
  useEffect(() => {
    if (editingSkill) {
      setFormData({
        name: editingSkill.name,
        description: editingSkill.description || '',
        category: editingSkill.category || '',
        categoryId: editingSkill.category || '' // Fallback for legacy data
      });
    } else {
      resetForm();
    }
  }, [editingSkill, isOpen]);

  // Kategorien beim Öffnen laden
  useEffect(() => {
    if (isOpen && token) {
      loadCategories();
    }
  }, [isOpen, token]);

  // Form-Handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  // Form absenden
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Name ist erforderlich');
      return;
    }

    if (!formData.categoryId) {
      setError('Kategorie ist erforderlich');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = editingSkill 
        ? `/api/soft-skills/${editingSkill.id}`
        : '/api/soft-skills';
      
      const method = editingSkill ? 'PUT' : 'POST';

      // Find category name for the selected categoryId
      const selectedCategory = categories.find(cat => cat.id === formData.categoryId);
      
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId,
        category: selectedCategory?.name || formData.categoryId, // Fallback for legacy compatibility
        isActive: true
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      // Erfolg: Modal schließen und Parent benachrichtigen
      onSkillSaved();
      resetForm();
      
    } catch (error) {
      console.error('Error saving soft skill:', error);
      setError(error instanceof Error ? error.message : 'Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modal schließen
  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg shadow-xl max-w-md w-full"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingSkill ? 'Soft Skill bearbeiten' : 'Neuer Soft Skill'}
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Fehler anzeigen */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="text-red-800 text-sm">{error}</div>
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="z.B. Kommunikationsfähigkeit"
                required
              />
            </div>

            {/* Kategorie */}
            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
                Kategorie *
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                required
              >
                <option value="">Kategorie auswählen...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Beschreibung */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Beschreibung
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                disabled={isSubmitting}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Optionale Beschreibung des Soft Skills..."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.name.trim() || !formData.categoryId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingSkill ? 'Aktualisieren' : 'Erstellen'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateEditSoftSkillModal;
