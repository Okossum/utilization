import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { skillService } from '../../lib/firebase-services';

interface SkillItem {
  id: string;
  name: string;
  type: 'CON' | 'DEV';
}

export function SkillManagement() {
  const [skills, setSkills] = useState<SkillItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'CON' | 'DEV'>('CON');
  

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'CON' | 'DEV'>('CON');
  

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const all = await skillService.getAll();
        const skillsData = all.map(s => ({ id: s.id, name: s.name, type: s.type || 'CON' }));
        setSkills(skillsData);
      } catch (e: any) {
        setError('Fehler beim Laden der Skills');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const resetAdd = () => {
    setNewName('');
    setNewType('CON');
    setIsAddOpen(false);
  };

  

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const id = await skillService.save({ name: newName.trim(), type: newType });
      const newSkill = { id, name: newName.trim(), type: newType };
      setSkills(prev => [...prev, newSkill]);
      resetAdd();
    } catch (e) {
      setError('Fehler beim Anlegen des Skills');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (s: SkillItem) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditType(s.type);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditType('CON');
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setLoading(true);
    try {
      await skillService.update(editingId, { name: editName.trim(), type: editType });
      const updatedSkill = { id: editingId, name: editName.trim(), type: editType };
      setSkills(prev => prev.map(s => s.id === editingId ? updatedSkill : s));
      cancelEdit();
    } catch (e) {
      setError('Fehler beim Aktualisieren');
    } finally {
      setLoading(false);
    }
  };

  const removeSkill = async (id: string) => {
    if (!confirm('Skill wirklich löschen?')) return;
    setLoading(true);
    try {
      await skillService.delete(id);
      setSkills(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      setError('Fehler beim Löschen');
    } finally {
      setLoading(false);
    }
  };



  const isBusy = loading;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-lg"><Settings className="w-6 h-6 text-indigo-600"/></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Skill-Verwaltung</h1>
            <p className="text-gray-600">Skills verwalten (CRUD)</p>
          </div>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4"/> Skill anlegen
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>}

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={resetAdd} />
          <div className="absolute inset-0 p-4 overflow-auto">
            <div className="max-w-lg mx-auto bg-white rounded-lg shadow border border-gray-200">
              <div className="p-4 border-b border-gray-200 font-medium">Neuen Skill anlegen</div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input value={newName} onChange={e=>setNewName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                  <select 
                    value={newType} 
                    onChange={e => setNewType(e.target.value as 'CON' | 'DEV')}
                    className="w-full px-3 py-2 border border-gray-200 rounded"
                  >
                    <option value="CON">CON (Consultant)</option>
                    <option value="DEV">DEV (Developer)</option>
                  </select>
                </div>
                
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <button onClick={resetAdd} className="px-4 py-2 bg-gray-100 rounded border border-gray-200">Abbrechen</button>
                <button onClick={handleAdd} disabled={!newName.trim() || isBusy} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">Speichern</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skills Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 text-sm text-gray-700 flex items-center justify-between">
          <span>{skills.length} Skills</span>
          {loading && <span className="text-gray-400">Laden…</span>}
        </div>
        <div className="divide-y divide-gray-100">
          {skills.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Keine Skills vorhanden</div>
          ) : skills.map(s => (
            <div key={s.id} className="p-4 hover:bg-gray-50">
              {editingId === s.id ? (
                <div className="space-y-3">
                  <input value={editName} onChange={e=>setEditName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded"/>
                  <select 
                    value={editType} 
                    onChange={e => setEditType(e.target.value as 'CON' | 'DEV')}
                    className="w-full px-3 py-2 border border-gray-200 rounded"
                  >
                    <option value="CON">CON (Consultant)</option>
                    <option value="DEV">DEV (Developer)</option>
                  </select>
                  
                  <div className="flex justify-end gap-2">
                    <button onClick={cancelEdit} className="px-3 py-2 bg-gray-100 rounded border border-gray-200">Abbrechen</button>
                    <button onClick={saveEdit} disabled={!editName.trim() || isBusy} className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">Speichern</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-gray-900">{s.name}</div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      s.type === 'CON' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {s.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>startEdit(s)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                      <Edit2 className="w-4 h-4"/>
                    </button>
                    <button onClick={()=>removeSkill(s.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SkillManagement;


