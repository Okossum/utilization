import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Settings } from 'lucide-react';
import { skillService } from '../../lib/firebase-services';

interface SkillItem {
  id: string;
  name: string;
  levels: string[];
}

export function SkillManagement() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLevelInput, setNewLevelInput] = useState('');
  const [newLevels, setNewLevels] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLevels, setEditLevels] = useState<string[]>([]);
  const [editLevelInput, setEditLevelInput] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const all = await skillService.getAll();
        setSkills(all.map(s => ({ id: s.id, name: s.name, levels: s.levels || [] })));
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
    setNewLevels([]);
    setNewLevelInput('');
    setIsAddOpen(false);
  };

  const addLevelToNew = () => {
    const v = newLevelInput.trim();
    if (!v) return;
    setNewLevels(prev => Array.from(new Set([...prev, v])));
    setNewLevelInput('');
  };

  const addLevelToEdit = () => {
    const v = editLevelInput.trim();
    if (!v) return;
    setEditLevels(prev => Array.from(new Set([...prev, v])));
    setEditLevelInput('');
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const id = await skillService.save({ name: newName.trim(), levels: newLevels });
      setSkills(prev => [...prev, { id, name: newName.trim(), levels: newLevels }]);
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
    setEditLevels(s.levels || []);
    setEditLevelInput('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditLevels([]);
    setEditLevelInput('');
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setLoading(true);
    try {
      await skillService.update(editingId, { name: editName.trim(), levels: editLevels });
      setSkills(prev => prev.map(s => s.id === editingId ? { ...s, name: editName.trim(), levels: editLevels } : s));
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
            <p className="text-gray-600">Skills mit Leveln verwalten (CRUD)</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Levels</label>
                  <div className="flex gap-2">
                    <input value={newLevelInput} onChange={e=>setNewLevelInput(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded" placeholder="z. B. Beginner"/>
                    <button onClick={addLevelToNew} className="px-3 py-2 bg-gray-100 rounded border border-gray-200">Hinzufügen</button>
                  </div>
                  {newLevels.length>0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {newLevels.map(l => (
                        <span key={l} className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded border border-indigo-200">{l}</span>
                      ))}
                    </div>
                  )}
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
                  <div>
                    <div className="flex gap-2">
                      <input value={editLevelInput} onChange={e=>setEditLevelInput(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded" placeholder="Level hinzufügen"/>
                      <button onClick={addLevelToEdit} className="px-3 py-2 bg-gray-100 rounded border border-gray-200">Hinzufügen</button>
                    </div>
                    {editLevels.length>0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {editLevels.map(l => (
                          <span key={l} className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded border border-indigo-200">{l}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={cancelEdit} className="px-3 py-2 bg-gray-100 rounded border border-gray-200">Abbrechen</button>
                    <button onClick={saveEdit} disabled={!editName.trim() || isBusy} className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">Speichern</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{s.name}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {s.levels.map(l => (
                        <span key={l} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded border border-gray-200">{l}</span>
                      ))}
                    </div>
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


