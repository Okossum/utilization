import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Wrench, Save } from 'lucide-react';
import { skillService } from '../../lib/firebase-services';
import { StarRating } from './StarRating';
import DatabaseService from '../../services/database';

export interface EmployeeSkillLink {
  skillId: string;
  name: string;
  level: number; // 0..5, step 0.5
}

interface EmployeeSkillsEditorProps {
  employeeName: string; // NEW: Benötigt für Persistierung
  value: EmployeeSkillLink[];
  onChange: (next: EmployeeSkillLink[]) => void;
}

export function EmployeeSkillsEditor({ employeeName, value, onChange }: EmployeeSkillsEditorProps) {
  const [catalog, setCatalog] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [defaultLevel, setDefaultLevel] = useState(3);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const all = await skillService.getAll();
        setCatalog(all.map(s => ({ id: s.id, name: s.name })));
      } catch (e) {
        setError('Fehler beim Laden des Skill-Katalogs');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Skills laden beim Mount und Employee-Name Änderung
  useEffect(() => {
    if (employeeName) {
      loadEmployeeSkills();
    }
  }, [employeeName]);

  const loadEmployeeSkills = async () => {
    if (!employeeName) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const skills = await DatabaseService.getEmployeeSkills(employeeName);
      const employeeSkills: EmployeeSkillLink[] = skills.map(skill => ({
        skillId: skill.skillId,
        name: skill.skillName,
        level: skill.level
      }));
      
      onChange(employeeSkills);
      setHasUnsavedChanges(false);
      console.log(`✅ ${skills.length} Skills geladen für ${employeeName}`);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Employee Skills:', error);
      setError('Fehler beim Laden der Skills aus der Datenbank');
    } finally {
      setLoading(false);
    }
  };

  const saveSkills = async () => {
    if (!employeeName || !hasUnsavedChanges) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const skillsToSave = value.map(skill => ({
        skillId: skill.skillId,
        skillName: skill.name,
        level: skill.level
      }));
      
      await DatabaseService.saveEmployeeSkills(employeeName, skillsToSave);
      setHasUnsavedChanges(false);
      console.log(`✅ ${skillsToSave.length} Skills gespeichert für ${employeeName}`);
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Skills:', error);
      setError('Fehler beim Speichern der Skills in der Datenbank');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    const id = selectedSkillId.trim();
    if (!id) return;
    const exists = value.some(v => v.skillId === id);
    if (exists) return;
    const cat = catalog.find(c => c.id === id);
    if (!cat) return;
    onChange([...
      value,
      { skillId: id, name: cat.name, level: defaultLevel }
    ]);
    setSelectedSkillId('');
    setDefaultLevel(3);
    setHasUnsavedChanges(true); // Mark as changed
  };

  const removeSkill = (skillId: string) => {
    onChange(value.filter(v => v.skillId !== skillId));
    setHasUnsavedChanges(true); // Mark as changed
  };

  const setLevel = (skillId: string, level: number) => {
    onChange(value.map(v => v.skillId === skillId ? { ...v, level } : v));
    setHasUnsavedChanges(true); // Mark as changed
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-amber-600"/>
          Skills
        </h2>
        
        {/* Save Button */}
        {hasUnsavedChanges && (
          <button
            onClick={saveSkills}
            disabled={saving || !employeeName}
            className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4"/>
            {saving ? 'Speichert...' : 'Skills speichern'}
          </button>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>}

      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <select
          value={selectedSkillId}
          onChange={e=>setSelectedSkillId(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded"
        >
          <option value="">Skill auswählen…</option>
          {catalog.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Startlevel:</span>
          <StarRating value={defaultLevel} readOnly={false} onChange={setDefaultLevel} />
        </div>
        <button onClick={addSkill} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
          <Plus className="w-4 h-4"/> Hinzufügen
        </button>
      </div>

      <div className="space-y-2">
        {value.length === 0 ? (
          <div className="text-gray-500 text-sm">Noch keine Skills zugeordnet</div>
        ) : value.map(s => (
          <div key={s.skillId} className="flex items-center justify-between p-3 border border-gray-200 rounded">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-sm font-medium text-gray-900">{s.name}</div>
              <StarRating value={s.level} readOnly={false} onChange={(lvl)=>setLevel(s.skillId, lvl)} />
            </div>
            <button onClick={()=>removeSkill(s.skillId)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
              <Trash2 className="w-4 h-4"/>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default EmployeeSkillsEditor;


