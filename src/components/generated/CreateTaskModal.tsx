import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Loader2, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleId: string;
  roleName: string;
  onTaskCreated: (task: {
    id: string;
    task: string;
    description: string;
    outputs: string;
  }) => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  roleId,
  roleName,
  onTaskCreated
}) => {
  const { token } = useAuth();
  
  // State
  const [formData, setFormData] = useState({
    task: '',
    description: '',
    outputs: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setFormData({ task: '', description: '', outputs: '' });
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Handle input changes
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null); // Clear error when user starts typing
  };

  // Validate form
  const validateForm = () => {
    if (!formData.task.trim()) {
      setError('Tätigkeits-Name ist erforderlich');
      return false;
    }
    return true;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

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
          task: formData.task.trim(),
          description: formData.description.trim(),
          outputs: formData.outputs.trim(),
          roleId: roleId,
          roleName: roleName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen der Tätigkeit');
      }

      const result = await response.json();
      
      // Notify parent component
      onTaskCreated({
        id: result.task.id,
        task: result.task.task,
        description: result.task.description,
        outputs: result.task.outputs
      });
      
      onClose();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-600" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Neue Tätigkeit hinzufügen
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Für Rolle: <span className="font-medium text-blue-700">{roleName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </header>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-600">{error}</div>
                </div>
              )}

              {/* Task Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tätigkeits-Name *
                </label>
                <input
                  type="text"
                  value={formData.task}
                  onChange={(e) => handleInputChange('task', e.target.value)}
                  placeholder="z.B. Projektinitialisierung, Stakeholder Management..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beschreibung
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Detaillierte Beschreibung der Tätigkeit..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Beschreiben Sie die Aufgaben und Verantwortlichkeiten
                </p>
              </div>

              {/* Outputs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Artefakte/Outputs
                </label>
                <textarea
                  value={formData.outputs}
                  onChange={(e) => handleInputChange('outputs', e.target.value)}
                  placeholder="Erwartete Ergebnisse, Dokumente, Deliverables..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Was soll als Ergebnis dieser Tätigkeit entstehen?
                </p>
              </div>

              {/* Preview */}
              {formData.task && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Vorschau:</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-blue-700">Tätigkeit:</span>
                      <p className="text-sm text-blue-800">{formData.task}</p>
                    </div>
                    {formData.description && (
                      <div>
                        <span className="text-xs font-medium text-blue-700">Beschreibung:</span>
                        <p className="text-sm text-blue-800">{formData.description}</p>
                      </div>
                    )}
                    {formData.outputs && (
                      <div>
                        <span className="text-xs font-medium text-blue-700">Outputs:</span>
                        <p className="text-sm text-blue-800">{formData.outputs}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>

            {/* Footer */}
            <footer className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.task.trim()}
                className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isSubmitting ? 'Erstelle...' : 'Tätigkeit hinzufügen'}</span>
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateTaskModal;
