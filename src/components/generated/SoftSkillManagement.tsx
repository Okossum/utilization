import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalModal } from '@/contexts/GlobalModalContext';
import CreateEditSoftSkillModal from './CreateEditSoftSkillModal';


interface SoftSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  createdAt: any;
  isActive: boolean;
}

interface SoftSkillCategory {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

const SoftSkillManagement: React.FC = () => {
  const { token } = useAuth();
  const { openModal, closeModal } = useGlobalModal();
  const [skills, setSkills] = useState<SoftSkill[]>([]);
  const [categories, setCategories] = useState<SoftSkillCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const skillsData = await response.json();
      setSkills(skillsData);
      
    } catch (error) {
      console.error('Error loading soft skills:', error);
      setError('Fehler beim Laden der Soft Skills');
    } finally {
      setLoading(false);
    }
  };

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
      setCategories(categoriesData);
      
    } catch (error) {
      console.error('Error loading soft skill categories:', error);
    }
  };

  // Verfügbare Kategorien für Dropdown
  const availableCategories = categories.filter(cat => cat.isActive).map(cat => ({
    id: cat.id,
    name: cat.name
  }));

  // Modal für neuen Skill öffnen
  const openCreateModal = () => {
    const modalId = 'create-soft-skill-modal';
    openModal({
      id: modalId,
      component: (
        <CreateEditSoftSkillModal
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
  const openEditModal = (skill: SoftSkill) => {
    const modalId = 'edit-soft-skill-modal';
    openModal({
      id: modalId,
      component: (
        <CreateEditSoftSkillModal
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
  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diesen Soft Skill löschen möchten?')) {
      return;
    }

    try {
      const response = await fetch(`/api/soft-skills/${skillId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Skills neu laden
      await loadSkills();
      setError(null);
      
    } catch (error) {
      console.error('Error deleting soft skill:', error);
      setError('Fehler beim Löschen des Soft Skills');
    }
  };

  // Komponente laden
  useEffect(() => {
    if (token) {
      loadSkills();
      loadCategories();
    }
  }, [token]);

  // Skills nach Kategorie gruppieren
  const skillsByCategory = skills.reduce((acc, skill) => {
    const categoryName = skill.category || 'Ohne Kategorie';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(skill);
    return acc;
  }, {} as Record<string, SoftSkill[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Lade Soft Skills...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Soft Skills Verwaltung</h2>
          <p className="text-gray-600">Verwalten Sie Soft Skills und deren Kategorien</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Neuer Soft Skill
          </button>
        </div>
      </div>

      {/* Fehler anzeigen */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Skills nach Kategorie anzeigen */}
      <div className="space-y-6">
        {Object.entries(skillsByCategory).map(([categoryName, categorySkills]) => (
          <div key={categoryName} className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{categoryName}</h3>
              <p className="text-sm text-gray-500">{categorySkills.length} Skills</p>
            </div>
            <div className="divide-y divide-gray-200">
              {categorySkills.map((skill) => (
                <div key={skill.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="text-sm font-medium text-gray-900">{skill.name}</h4>
                      {!skill.isActive && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inaktiv
                        </span>
                      )}
                    </div>
                    {skill.description && (
                      <p className="text-sm text-gray-500 mt-1">{skill.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(skill)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Bearbeiten"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSkill(skill.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Keine Skills vorhanden */}
      {skills.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            <p className="text-lg font-medium">Keine Soft Skills vorhanden</p>
            <p className="text-sm mt-2">Erstellen Sie Ihren ersten Soft Skill oder importieren Sie Skills aus einer Excel-Datei.</p>
          </div>
          <div className="mt-6 flex justify-center space-x-3">

            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ersten Skill erstellen
            </button>
          </div>
        </div>
      )}


    </div>
  );
};

export default SoftSkillManagement;
