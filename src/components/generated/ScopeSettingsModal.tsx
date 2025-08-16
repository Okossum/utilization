import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { UserProfile } from '../../contexts/AuthContext';

interface ScopeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  lobOptions?: string[];
  buOptions: string[];
  ccOptions: string[];
  teamOptions: string[];
  onSave: (data: { businessUnit?: string | null; competenceCenter?: string | null; team?: string | null; canViewAll?: boolean }) => Promise<void>;
}

export function ScopeSettingsModal({ isOpen, onClose, profile, lobOptions = [], buOptions, ccOptions, teamOptions, onSave }: ScopeSettingsModalProps) {
  const [businessUnit, setBusinessUnit] = useState<string | ''>('');
  const [lob, setLob] = useState<string | ''>('');
  const [competenceCenter, setCompetenceCenter] = useState<string | ''>('');
  const [team, setTeam] = useState<string | ''>('');
  const [canViewAll, setCanViewAll] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLob((profile?.lob as any as string) || '');
    setBusinessUnit((profile?.businessUnit as string) || '');
    setCompetenceCenter((profile?.competenceCenter as string) || '');
    setTeam((profile?.team as string) || '');
    setCanViewAll(Boolean(profile?.canViewAll));
  }, [isOpen, profile]);

  const filteredCcOptions = useMemo(() => ccOptions, [ccOptions]);
  const filteredTeamOptions = useMemo(() => teamOptions, [teamOptions]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        // lob wird aktuell serverseitig nicht persistiert; kann später ergänzt werden
        businessUnit: businessUnit || null,
        competenceCenter: competenceCenter || null,
        team: team || null,
        canViewAll,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div className="absolute inset-0 p-4 overflow-auto">
            <motion.div
              className="relative max-w-lg mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="text-gray-900 font-medium">Bereich einstellen</div>
                <button onClick={onClose} className="p-2 rounded hover:bg-gray-100" aria-label="Schließen"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="p-4 space-y-4">
                {!!lobOptions.length && (
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Line of Business</label>
                    <select value={lob} onChange={e => setLob(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">— Nicht gesetzt —</option>
                      {lobOptions.map(x => (
                        <option key={x} value={x}>{x}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Business Unit</label>
                  <select value={businessUnit} onChange={e => setBusinessUnit(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">— Nicht gesetzt —</option>
                    {buOptions.map(bu => (
                      <option key={bu} value={bu}>{bu}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Competence Center</label>
                  <select value={competenceCenter} onChange={e => setCompetenceCenter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">— Nicht gesetzt —</option>
                    {filteredCcOptions.map(cc => (
                      <option key={cc} value={cc}>{cc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Team</label>
                  <select value={team} onChange={e => setTeam(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">— Nicht gesetzt —</option>
                    {filteredTeamOptions.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={canViewAll} onChange={e => setCanViewAll(e.target.checked)} />
                  <span className="text-sm text-gray-700">Alle Daten sehen dürfen</span>
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
                <button onClick={onClose} className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Abbrechen</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">Speichern</button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ScopeSettingsModal;


