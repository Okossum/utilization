import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import TechnicalSkillSelectionModal from './TechnicalSkillSelectionModal';

interface EmployeeSkill {
  id: string;
  employeeId: string;
  skillId: string;
  skillName: string;
  level: number;
  timestamp?: string;
}

interface AvailableSkill {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface EmployeeSkillAssignmentProps {
  employeeId: string;
  employeeName: string;
  onSkillsChange?: (skills: EmployeeSkill[]) => void;
}

export function EmployeeSkillAssignment({ 
  employeeId, 
  employeeName, 
  onSkillsChange 
}: EmployeeSkillAssignmentProps) {
  console.log('🚀 EmployeeSkillAssignment Komponente wird gerendert');
  console.log('👤 employeeId:', employeeId);
  console.log('👤 employeeName:', employeeName);
  
  const { user, token } = useAuth();
  
  const [assignedSkills, setAssignedSkills] = useState<EmployeeSkill[]>([]);
  const [availableSkills, setAvailableSkills] = useState<AvailableSkill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isInitializingSkills, setIsInitializingSkills] = useState(false);
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);

  // Lade verfügbare Skills und zugewiesene Skills
  useEffect(() => {
    console.log('🔄 useEffect wird ausgeführt, employeeId:', employeeId);
    console.log('👤 AuthContext User:', user);
    console.log('🔑 AuthContext Token:', token ? 'Verfügbar' : 'Nicht verfügbar');
    
    if (user && token) {
      console.log('✅ User und Token verfügbar, lade Skills...');
      setIsInitialLoading(true);
      
      // Separate async Funktion für das Laden der Skills
      const loadSkills = async () => {
        try {
          await Promise.all([loadAvailableSkills(), loadAssignedSkills()]);
        } finally {
          setIsInitialLoading(false);
        }
      };
      
      loadSkills();
    } else {
      console.log('⏳ User oder Token noch nicht verfügbar, warte...');
    }
  }, [employeeId, user, token]);

  const loadAvailableSkills = async () => {
    console.log('🔍 loadAvailableSkills() aufgerufen');
    try {
      // Token aus AuthContext verwenden
      if (!token) {
        console.error('❌ Kein Token verfügbar');
        return;
      }
      
      console.log('🔑 Token aus AuthContext:', token ? 'Verfügbar' : 'Nicht verfügbar');
      console.log('🔑 Token Länge:', token?.length);
      console.log('🔑 Token Anfang:', token?.substring(0, 20) + '...');
      
      console.log('📡 API-Aufruf an /api/technical-skills startet...');
      const response = await fetch('/api/technical-skills', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 API-Antwort Status:', response.status, response.statusText);
      console.log('📡 API-Antwort Headers:', [...response.headers.entries()]);
      
      if (response.ok) {
        const skills = await response.json();
        console.log('✅ Verfügbare Technical Skills geladen:', skills);
        console.log('✅ Technical Skills Array Länge:', skills?.length);
        console.log('✅ Erstes Technical Skill:', skills?.[0]);
        setAvailableSkills(skills);
      } else {
        const errorText = await response.text();
        console.error('❌ Fehler beim Laden der Technical Skills:', response.status, response.statusText, errorText);
        setError('Fehler beim Laden der verfügbaren Technical Skills');
      }
    } catch (error) {
      console.error('❌ Exception beim Laden der verfügbaren Technical Skills:', error);
      setError('Fehler beim Laden der verfügbaren Technical Skills');
    }
  };

  const loadAssignedSkills = async () => {
    try {
      setIsLoading(true);
      if (!token) {
        console.error('Kein Token verfügbar');
        return;
      }
      const response = await fetch(`/api/employee-skills/${employeeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const skills = await response.json();
        setAssignedSkills(skills);
        onSkillsChange?.(skills);
      } else {
        console.error('Fehler beim Laden der zugewiesenen Skills:', response.status, response.statusText);
        setError('Fehler beim Laden der zugewiesenen Skills');
      }
    } catch (error) {
      console.error('Fehler beim Laden der zugewiesenen Skills:', error);
      setError('Fehler beim Laden der zugewiesenen Skills');
    } finally {
      setIsLoading(false);
    }
  };

  const addSkill = async () => {
    if (!selectedSkillId) return;

    const skill = availableSkills.find(s => s.id === selectedSkillId);
    if (!skill) return;

    try {
      setIsLoading(true);
      if (!token) {
        console.error('Kein Token verfügbar');
        return;
      }
      const response = await fetch('/api/employee-skills', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId,
          skillId: selectedSkillId,
          skillName: skill.name,
          level: 1 // Standard-Level
        })
      });

      if (response.ok) {
        await loadAssignedSkills();
        setSelectedSkillId('');
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Fehler beim Hinzufügen des Skills');
      }
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Skills:', error);
      setError('Fehler beim Hinzufügen des Skills');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSkillLevel = async (skillId: string, newLevel: number) => {
    try {
      if (!token) {
        console.error('Kein Token verfügbar');
        return;
      }
      const response = await fetch(`/api/employee-skills/${employeeId}/${skillId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ level: newLevel })
      });

      if (response.ok) {
        await loadAssignedSkills();
      } else {
        console.error('Fehler beim Aktualisieren des Skill-Levels:', response.status, response.statusText);
        setError('Fehler beim Aktualisieren des Skill-Levels');
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Skill-Levels:', error);
      setError('Fehler beim Aktualisieren des Skill-Levels');
    }
  };

  const removeSkill = async (skillId: string) => {
    try {
      if (!token) {
        console.error('Kein Token verfügbar');
        return;
      }
      const response = await fetch(`/api/employee-skills/${employeeId}/${skillId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await loadAssignedSkills();
      }
    } catch (error) {
      console.error('Fehler beim Entfernen des Skills:', error);
    }
  };

  const initializeSkills = async () => {
    try {
      setIsInitializingSkills(true);
      console.log('🔧 Initialisiere Skills...');
      
      if (!token) {
        console.error('Kein Token verfügbar');
        return;
      }
      
      const response = await fetch('/api/skills/init', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Skills initialisiert:', result);
        // Lade verfügbare Skills neu
        await loadAvailableSkills();
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Fehler beim Initialisieren der Skills');
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren der Skills:', error);
      setError('Fehler beim Initialisieren der Skills');
    } finally {
      setIsInitializingSkills(false);
    }
  };

  const getUnassignedSkills = () => {
    console.log('🔍 getUnassignedSkills() aufgerufen');
    console.log('📊 availableSkills:', availableSkills);
    console.log('📊 assignedSkills:', assignedSkills);
    
    const assignedSkillIds = assignedSkills.map(s => s.skillId);
    console.log('🔑 assignedSkillIds:', assignedSkillIds);
    
    const unassignedSkills = availableSkills.filter(skill => !assignedSkillIds.includes(skill.id));
    console.log('✅ unassignedSkills:', unassignedSkills);
    
    return unassignedSkills;
  };

  // Sterne-Bewertung Component (identisch zu Rollen)
  const SkillStarRating: React.FC<{
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

  // SkillAssignmentCard Component (exakt wie RoleAssignmentCard)
  const SkillAssignmentCard: React.FC<{ skill: EmployeeSkill }> = ({ skill }) => {
    // Finde die Beschreibung des Skills aus den verfügbaren Skills
    const skillDetails = availableSkills.find(s => s.id === skill.skillId);
    const skillDescription = skillDetails?.description || '';
    
    // ✅ FIX: Skill-Name aus skillDetails nehmen, falls skill.skillName leer ist
    const displayName = skill.skillName || skillDetails?.name || 'Unbekannter Skill';
    
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 hover:from-blue-100 hover:to-indigo-100 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-blue-900">{displayName}</h4>
          <button
            onClick={() => removeSkill(skill.id)}
            disabled={isLoading}
            className="text-red-600 hover:text-red-700 disabled:opacity-50"
            title="Skill entfernen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Bewertung:</span>
          <SkillStarRating
            value={skill.level}
            onChange={(level) => updateSkillLevel(skill.skillId, level)}
            disabled={isLoading}
          />
          <span className="text-sm text-gray-500">({skill.level}/5)</span>
        </div>
        
        {skillDescription && (
          <div className="mt-2 text-xs text-blue-600 bg-blue-100 rounded p-2">
            {skillDescription}
          </div>
        )}
      </div>
    );
  };

  console.log('🎨 Render wird ausgeführt');
  console.log('📊 availableSkills im Render:', availableSkills);
  console.log('📊 assignedSkills im Render:', assignedSkills);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Skills & Kompetenzen</h3>
        <p className="text-sm text-gray-600 mt-1">
          Verwalten Sie die Skills und Bewertungen für {employeeName}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Zugewiesene Skills */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Zugewiesene Skills ({assignedSkills.length})
        </h4>
        
        {isInitialLoading ? (
          <div className="text-center py-4 text-gray-500">Initialisiere Skills...</div>
        ) : isLoading ? (
          <div className="text-center py-4 text-gray-500">Lade Skills...</div>
        ) : assignedSkills.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Noch keine Skills zugewiesen.</p>
            <p className="text-sm">Weisen Sie einen Skill aus den verfügbaren Skills unten zu.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {assignedSkills.map((skill) => (
              <SkillAssignmentCard key={skill.id} skill={skill} />
            ))}
          </div>
        )}
      </div>

      {/* Skills hinzufügen */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Weitere Skills hinzufügen
        </h4>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-3">
            Weisen Sie {employeeName} weitere Technical Skills zu. Es stehen {getUnassignedSkills().length} Skills zur Verfügung.
          </p>
          <button
            onClick={() => setIsSkillModalOpen(true)}
            disabled={getUnassignedSkills().length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Skills zuweisen ({getUnassignedSkills().length} verfügbar)
          </button>
        </div>
      </div>

      {/* Technical Skill Selection Modal */}
      <TechnicalSkillSelectionModal
        isOpen={isSkillModalOpen}
        onClose={() => setIsSkillModalOpen(false)}
        employeeId={employeeId}
        employeeName={employeeName}
        onSkillAssigned={() => {
          // Skill wurde zugewiesen - Daten neu laden
          loadAssignedSkills();
        }}
      />
    </div>
  );
}
