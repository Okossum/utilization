import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Wrench } from 'lucide-react';
import { skillService } from '../../lib/firebase-services';
import { StarRating } from './StarRating';

export interface EmployeeSkillLink {
  skillId: string;
  name: string;
  level: number; // 0..5, step 0.5
}

interface EmployeeSkillsEditorProps {
  value: EmployeeSkillLink[];
  onChange: (next: EmployeeSkillLink[]) => void;
}

export function EmployeeSkillsEditor({ value, onChange }: EmployeeSkillsEditorProps) {
  const [catalog, setCatalog] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [defaultLevel, setDefaultLevel] = useState(3);

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
  };

  const removeSkill = (skillId: string) => {
    onChange(value.filter(v => v.skillId !== skillId));
  };

  const setLevel = (skillId: string, level: number) => {
    onChange(value.map(v => v.skillId === skillId ? { ...v, level } : v));
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
        <Wrench className="w-5 h-5 text-amber-600"/>
        Skills
      </h2>

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


