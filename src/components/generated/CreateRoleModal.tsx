import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, AlertCircle, Loader2, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TaskFormData {
  task: string;
  description: string;
  outputs: string;
}

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoleCreated: (role: { id: string; name: string }, tasks: TaskFormData[]) => void;
}

const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  isOpen,
  onClose,
  onRoleCreated
}) => {
  const { token } = useAuth();
  
  // State
  const [roleName, setRoleName] = useState('');
  const [tasks, setTasks] = useState<TaskFormData[]>([
    { task: '', description: '', outputs: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setRoleName('');
      setTasks([{ task: '', description: '', outputs: '' }]);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Add new task
  const addTask = () => {
    setTasks([...tasks, { task: '', description: '', outputs: '' }]);
  };

  // Remove task
  const removeTask = (index: number) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  // Update task
  const updateTask = (index: number, field: keyof TaskFormData, value: string) => {
    const updatedTasks = tasks.map((task, i) => 
      i === index ? { ...task, [field]: value } : task
    );
    setTasks(updatedTasks);
  };

  // Validate form
  const validateForm = () => {
    if (!roleName.trim()) {
      setError('Rollen-Name ist erforderlich');
      return false;
    }

    const validTasks = tasks.filter(task => task.task.trim());
    if (validTasks.length === 0) {
      setError('Mindestens eine Tätigkeit ist erforderlich');
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
      // Create role first
      const roleResponse = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: roleName.trim() })
      });

      if (!roleResponse.ok) {
        const errorData = await roleResponse.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen der Rolle');
      }

      const roleResult = await roleResponse.json();
      const newRole = roleResult.role;

      // Create tasks for the role
      const validTasks = tasks.filter(task => task.task.trim());
      const createdTasks: TaskFormData[] = [];

      for (const task of validTasks) {
        const taskResponse = await fetch('/api/role-tasks', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            task: task.task.trim(),
            description: task.description.trim(),
            outputs: task.outputs.trim(),
            roleId: newRole.id,
            roleName: newRole.name
          })
        });

        if (taskResponse.ok) {
          createdTasks.push(task);
        }
      }

      // Notify parent component
      onRoleCreated(newRole, createdTasks);
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
            className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-purple-600" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Neue Rolle erstellen
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Erstellen Sie eine neue Rolle mit zugehörigen Tätigkeiten
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
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-600">{error}</div>
                  </div>
                )}

                {/* Role Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rollen-Name *
                  </label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="z.B. Projektmanager, Product Owner..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Tasks Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Tätigkeiten *
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Mindestens eine Tätigkeit ist erforderlich
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addTask}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tätigkeit hinzufügen</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {tasks.map((task, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-700">
                            Tätigkeit {index + 1}
                          </h4>
                          {tasks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTask(index)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                              title="Tätigkeit entfernen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          {/* Task Name */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Tätigkeits-Name *
                            </label>
                            <input
                              type="text"
                              value={task.task}
                              onChange={(e) => updateTask(index, 'task', e.target.value)}
                              placeholder="z.B. Projektinitialisierung, Stakeholder Management..."
                              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                              required
                            />
                          </div>

                          {/* Description */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Beschreibung
                            </label>
                            <textarea
                              value={task.description}
                              onChange={(e) => updateTask(index, 'description', e.target.value)}
                              placeholder="Beschreibung der Tätigkeit..."
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                            />
                          </div>

                          {/* Outputs */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Artefakte/Outputs
                            </label>
                            <textarea
                              value={task.outputs}
                              onChange={(e) => updateTask(index, 'outputs', e.target.value)}
                              placeholder="Erwartete Ergebnisse und Artefakte..."
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

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
                  disabled={isSubmitting || !roleName.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSubmitting ? 'Erstelle...' : 'Rolle erstellen'}</span>
                </button>
              </footer>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateRoleModal;
