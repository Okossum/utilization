import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Code, Database, Palette, Settings } from 'lucide-react';
import ProjectSkillSelector from './ProjectSkillSelector';

// Demo data types (same as in ProjectSkillSelector)
interface ProjectSkill {
  skillId: string;
  skillName: string;
  description?: string;
  rating: number;
  isSelected: boolean;
}

interface ProjectSkillCategory {
  categoryId: string;
  categoryName: string;
  selectedSkills: ProjectSkill[];
  isExpanded?: boolean;
}

const ProjectSkillSelectorDemo: React.FC = () => {
  const [selectedCategories, setSelectedCategories] = useState<ProjectSkillCategory[]>([]);
  const [showDemo, setShowDemo] = useState(false);

  // Demo data für Testzwecke
  const loadDemoData = () => {
    const demoCategories: ProjectSkillCategory[] = [
      {
        categoryId: 'frontend',
        categoryName: 'Frontend Development',
        isExpanded: true,
        selectedSkills: [
          {
            skillId: 'react',
            skillName: 'React',
            description: 'JavaScript library for building user interfaces',
            rating: 4,
            isSelected: true
          },
          {
            skillId: 'typescript',
            skillName: 'TypeScript',
            description: 'Typed superset of JavaScript',
            rating: 5,
            isSelected: true
          },
          {
            skillId: 'tailwind',
            skillName: 'Tailwind CSS',
            description: 'Utility-first CSS framework',
            rating: 3,
            isSelected: false
          }
        ]
      },
      {
        categoryId: 'backend',
        categoryName: 'Backend Development',
        isExpanded: false,
        selectedSkills: [
          {
            skillId: 'nodejs',
            skillName: 'Node.js',
            description: 'JavaScript runtime for server-side development',
            rating: 4,
            isSelected: true
          },
          {
            skillId: 'firebase',
            skillName: 'Firebase',
            description: 'Backend-as-a-Service platform',
            rating: 3,
            isSelected: false
          }
        ]
      }
    ];
    
    setSelectedCategories(demoCategories);
  };

  const clearData = () => {
    setSelectedCategories([]);
  };

  const getSelectedSkillsCount = () => {
    return selectedCategories.reduce((total, category) => {
      return total + category.selectedSkills.filter(skill => skill.isSelected).length;
    }, 0);
  };

  const getAverageRating = () => {
    const selectedSkills = selectedCategories.flatMap(category => 
      category.selectedSkills.filter(skill => skill.isSelected)
    );
    
    if (selectedSkills.length === 0) return 0;
    
    const totalRating = selectedSkills.reduce((sum, skill) => sum + skill.rating, 0);
    return (totalRating / selectedSkills.length).toFixed(1);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Project Skill Selector Demo
        </h1>
        <p className="text-gray-600">
          Teste die neue Skill-Auswahl Komponente mit Kategorien, Skills und Sterne-Bewertungen
        </p>
      </div>

      {/* Demo Controls */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => setShowDemo(!showDemo)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Award className="w-4 h-4" />
          {showDemo ? 'Demo ausblenden' : 'Demo anzeigen'}
        </button>
        
        {showDemo && (
          <>
            <button
              onClick={loadDemoData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Database className="w-4 h-4" />
              Demo-Daten laden
            </button>
            
            <button
              onClick={clearData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Daten löschen
            </button>
          </>
        )}
      </div>

      {/* Statistics */}
      {showDemo && selectedCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Kategorien</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {selectedCategories.length}
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Ausgewählte Skills</span>
            </div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {getSelectedSkillsCount()}
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">Ø Bewertung</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">
              {getAverageRating()}/5
            </div>
          </div>
        </motion.div>
      )}

      {/* Demo Component */}
      {showDemo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-lg p-6"
        >
          <ProjectSkillSelector
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
            employeeId="demo-employee"
            projectId="demo-project"
          />
        </motion.div>
      )}

      {/* JSON Output */}
      {showDemo && selectedCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Aktuelle Auswahl (JSON)
          </h3>
          <pre className="bg-gray-100 border border-gray-200 rounded-lg p-4 text-sm overflow-x-auto">
            {JSON.stringify(selectedCategories, null, 2)}
          </pre>
        </motion.div>
      )}

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          Funktionen testen:
        </h3>
        <ul className="space-y-2 text-blue-800">
          <li>• <strong>Kategorien hinzufügen:</strong> Wähle Skill-Kategorien aus der Dropdown-Liste</li>
          <li>• <strong>Skills auswählen:</strong> Aktiviere/deaktiviere einzelne Skills per Checkbox</li>
          <li>• <strong>Bewertungen:</strong> Klicke auf die Sterne um Skills zu bewerten (1-5)</li>
          <li>• <strong>Kategorien verwalten:</strong> Expandiere/kollabiere Kategorien oder entferne sie</li>
          <li>• <strong>Bulk-Aktionen:</strong> "Alle auswählen/abwählen" für ganze Kategorien</li>
        </ul>
      </div>
    </div>
  );
};

export default ProjectSkillSelectorDemo;
