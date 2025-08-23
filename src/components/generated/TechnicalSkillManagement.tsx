import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, X } from 'lucide-react';
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
  category: string;
}

const TechnicalSkillManagement: React.FC = () => {
  const { token } = useAuth();
  const [skills, setSkills] = useState<TechnicalSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<TechnicalSkill | null>(null);
  const [formData, setFormData] = useState<SkillFormData>({
    name: '',
    description: '',
    category: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Skills laden
  const loadSkills = async () => {
    try {
      // console.log entfernt
      
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
      setSkills(skillsData);
      // console.log entfernt
      
    } catch (error) {
      // console.error entfernt
      setError('Fehler beim Laden der Technical Skills');
    } finally {
      setLoading(false);
    }
  };

  // Skill erstellen
  const createSkill = async (skillData: SkillFormData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // console.log entfernt
      
      const response = await fetch('/api/technical-skills', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(skillData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen des Skills');
      }

      const result = await response.json();
      // console.log entfernt
      
      // Skills neu laden
      await loadSkills();
      
      // Dialog schließen und Form zurücksetzen
      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '', category: '' });
      
    } catch (error: any) {
      // console.error entfernt
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
      // console.log entfernt
      
      const response = await fetch(`/api/technical-skills/${editingSkill.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(skillData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Bearbeiten des Skills');
      }

      const result = await response.json();
      // console.log entfernt
      
      // Skills neu laden
      await loadSkills();
      
      // Dialog schließen und Form zurücksetzen
      setIsEditDialogOpen(false);
      setEditingSkill(null);
      setFormData({ name: '', description: '', category: '' });
      
    } catch (error: any) {
      // console.error entfernt
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Skill löschen
  const deleteSkill = async (skill: TechnicalSkill) => {
    if (!confirm(`Möchten Sie den Technical Skill "${skill.name}" wirklich löschen?`)) {
      return;
    }
    
    setError(null);
    
    try {
      // console.log entfernt
      
      const response = await fetch(`/api/technical-skills/${skill.id}`, {
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

      // console.log entfernt
      
      // Skills neu laden
      await loadSkills();
      
    } catch (error: any) {
      // console.error entfernt
      setError(error.message);
    }
  };

  // Bearbeiten-Dialog öffnen
  const openEditDialog = (skill: TechnicalSkill) => {
    setEditingSkill(skill);
    setFormData({
      name: skill.name,
      description: skill.description,
      category: skill.category
    });
    setIsEditDialogOpen(true);
    setError(null);
  };

  // Dialog schließen
  const closeDialogs = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setEditingSkill(null);
    setFormData({ name: '', description: '', category: '' });
    setError(null);
  };

  // Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditDialogOpen && editingSkill) {
      updateSkill(formData);
    } else {
      createSkill(formData);
    }
  };

  // Beim Laden der Komponente
  useEffect(() => {
    if (token) {
      loadSkills();
    }
  }, [token]);

  // Verfügbare Kategorien aus vorhandenen Skills
  const availableCategories = Array.from(
    new Set(skills.map(skill => skill.category).filter(cat => cat && cat.trim() !== ''))
  ).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Lade Technical Skills...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Technical Skill Management</h1>
        <p className="text-gray-600 mt-1">
          Verwalten Sie alle verfügbaren Technical Skills für Mitarbeiter-Zuweisungen
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="mb-6 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {skills.length} Technical Skills verfügbar
        </div>
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neuen Skill hinzufügen
        </button>
      </div>

      {/* Skills Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {skills.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Noch keine Technical Skills vorhanden.</p>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ersten Skill hinzufügen
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Beschreibung
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Erstellt
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {skills.map((skill) => (
                <tr key={skill.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{skill.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 max-w-xs truncate">
                      {skill.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {skill.category && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {skill.category}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {skill.createdAt?.toDate ? 
                      skill.createdAt.toDate().toLocaleDateString('de-DE') : 
                      '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditDialog(skill)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Bearbeiten"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteSkill(skill)}
                        className="text-red-600 hover:text-red-700"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Dialog */}
      {(isCreateDialogOpen || isEditDialogOpen) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeDialogs}
          />
          
          <div className="relative w-full max-w-lg min-h-[500px] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {isEditDialogOpen ? 'Skill bearbeiten' : 'Neuen Skill hinzufügen'}
                </h1>
              </div>
              <button
                onClick={closeDialogs}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Skill Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skill-Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="z.B. React, Python, AWS..."
                    required
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschreibung
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                    rows={2}
                    placeholder="Beschreibung des Skills..."
                  />
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategorie
                  </label>
                  
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors mb-2"
                  >
                    <option value="">Kategorie auswählen...</option>
                    {availableCategories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                    <option value="Programming Languages">Programming Languages</option>
                    <option value="Frameworks">Frameworks</option>
                    <option value="Cloud Platforms">Cloud Platforms</option>
                    <option value="Databases">Databases</option>
                    <option value="DevOps">DevOps</option>
                    <option value="Other">Other</option>
                  </select>
                  
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Oder neue Kategorie eingeben..."
                  />
                </div>


              </form>
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={closeDialogs}
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
                {isEditDialogOpen ? 'Änderungen speichern' : 'Skill hinzufügen'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicalSkillManagement;
