import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import { StarRating } from './StarRating';
import { useAuth } from '../../contexts/AuthContext';

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
      
      console.log('📡 API-Aufruf an /api/skills startet...');
      const response = await fetch('/api/skills', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 API-Antwort Status:', response.status, response.statusText);
      console.log('📡 API-Antwort Headers:', [...response.headers.entries()]);
      
      if (response.ok) {
        const skills = await response.json();
        console.log('✅ Verfügbare Skills geladen:', skills);
        console.log('✅ Skills Array Länge:', skills?.length);
        console.log('✅ Erstes Skill:', skills?.[0]);
        setAvailableSkills(skills);
      } else {
        const errorText = await response.text();
        console.error('❌ Fehler beim Laden der Skills:', response.status, response.statusText, errorText);
        setError('Fehler beim Laden der verfügbaren Skills');
      }
    } catch (error) {
      console.error('❌ Exception beim Laden der verfügbaren Skills:', error);
      setError('Fehler beim Laden der verfügbaren Skills');
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
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Skill-Levels:', error);
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

  console.log('🎨 Render wird ausgeführt');
  console.log('📊 availableSkills im Render:', availableSkills);
  console.log('📊 assignedSkills im Render:', assignedSkills);
  
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
        <Star className="w-4 h-4 text-yellow-600" />
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
          <option value="">Skill auswählen... ({availableSkills.length} verfügbar)</option>
          {getUnassignedSkills().map(skill => {
            console.log('🎯 Rendering option für Skill:', skill);
            return (
              <option key={skill.id} value={skill.id}>
                {skill.name}
              </option>
            );
          })}
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
        {isInitialLoading ? (
          <div className="text-center py-4 text-gray-500">Initialisiere Skills...</div>
        ) : isLoading ? (
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
