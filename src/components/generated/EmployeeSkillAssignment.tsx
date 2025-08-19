import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import { StarRating } from './StarRating';

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
  const [assignedSkills, setAssignedSkills] = useState<EmployeeSkill[]>([]);
  const [availableSkills, setAvailableSkills] = useState<AvailableSkill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Lade verfügbare Skills und zugewiesene Skills
  useEffect(() => {
    loadAvailableSkills();
    loadAssignedSkills();
  }, [employeeId]);

  const loadAvailableSkills = async () => {
    try {
      const response = await fetch('/api/skills');
      if (response.ok) {
        const skills = await response.json();
        setAvailableSkills(skills);
      }
    } catch (error) {
      console.error('Fehler beim Laden der verfügbaren Skills:', error);
    }
  };

  const loadAssignedSkills = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/employee-skills/${employeeId}`);
      if (response.ok) {
        const skills = await response.json();
        setAssignedSkills(skills);
        onSkillsChange?.(skills);
      }
    } catch (error) {
      console.error('Fehler beim Laden der zugewiesenen Skills:', error);
      setError('Fehler beim Laden der Skills');
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
      const response = await fetch('/api/employee-skills', {
        method: 'POST',
        headers: {
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
      const response = await fetch(`/api/employee-skills/${employeeId}/${skillId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ level: newLevel })
      });

      if (response.ok) {
        await loadAssignedSkills();
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Skill-Levels:', error);
    }
  };

  const removeSkill = async (skillId: string) => {
    try {
      const response = await fetch(`/api/employee-skills/${employeeId}/${skillId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadAssignedSkills();
      }
    } catch (error) {
      console.error('Fehler beim Entfernen des Skills:', error);
    }
  };

  const getUnassignedSkills = () => {
    const assignedSkillIds = assignedSkills.map(s => s.skillId);
    return availableSkills.filter(skill => !assignedSkillIds.includes(skill.id));
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-600" />
        Skills & Kompetenzen
      </h2>

      {/* Skill hinzufügen */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <select
          value={selectedSkillId}
          onChange={(e) => setSelectedSkillId(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
        >
          <option value="">Skill auswählen...</option>
          {getUnassignedSkills().map(skill => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
        
        <button
          onClick={addSkill}
          disabled={!selectedSkillId || isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Hinzufügen
        </button>
      </div>

      {/* Fehlermeldung */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Zugewiesene Skills */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Lade Skills...</div>
        ) : assignedSkills.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <Star className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>Noch keine Skills zugewiesen</p>
            <p className="text-sm">Fügen Sie Skills über das Dropdown hinzu</p>
          </div>
        ) : (
          assignedSkills.map(skill => (
            <div
              key={skill.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{skill.skillName}</h3>
                  <p className="text-sm text-gray-500">Skill ID: {skill.skillId}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Level:</span>
                  <StarRating
                    value={skill.level}
                    onChange={(level) => updateSkillLevel(skill.skillId, level)}
                    size="sm"
                  />
                </div>
              </div>
              
              <button
                onClick={() => removeSkill(skill.id)}
                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                title="Skill entfernen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
