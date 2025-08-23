import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalModal } from '@/contexts/GlobalModalContext';
import CreateEditSkillModal from './CreateEditSkillModal';

interface TechnicalSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  createdAt: any;
  isActive: boolean;
}



const TechnicalSkillManagement: React.FC = () => {
  const { token } = useAuth();
  const { openModal, closeModal } = useGlobalModal();
  const [skills, setSkills] = useState<TechnicalSkill[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Modal für neuen Skill öffnen
  const openCreateModal = () => {
    const modalId = 'create-skill-modal';
    openModal({
      id: modalId,
      component: (
        <CreateEditSkillModal
          isOpen={true}
          onClose={() => closeModal(modalId)}
          editingSkill={null}
          onSkillSaved={() => {
            loadSkills();
            closeModal(modalId);
          }}
          availableCategories={availableCategories}
        />
      ),
    });
    setError(null);
  };

  // Modal für Skill-Bearbeitung öffnen
  const openEditModal = (skill: TechnicalSkill) => {
    const modalId = 'edit-skill-modal';
    openModal({
      id: modalId,
      component: (
        <CreateEditSkillModal
          isOpen={true}
          onClose={() => closeModal(modalId)}
          editingSkill={skill}
          onSkillSaved={() => {
            loadSkills();
            closeModal(modalId);
          }}
          availableCategories={availableCategories}
        />
      ),
    });
    setError(null);
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
          onClick={openCreateModal}
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
              onClick={openCreateModal}
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
                        onClick={() => openEditModal(skill)}
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


    </div>
  );
};

export default TechnicalSkillManagement;
