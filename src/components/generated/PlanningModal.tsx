import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Target, Ticket } from 'lucide-react';
import DatabaseService from '../../services/database';

type OfferedSkill = { skillId: string; name: string; level: number };

interface PlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  personId: string; // verwendet als Dossier-ID
}

export function PlanningModal({ isOpen, onClose, personId }: PlanningModalProps) {
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<OfferedSkill[]>([]);
  const [projectOffers, setProjectOffers] = useState<any[]>([]);
  const [jiraTickets, setJiraTickets] = useState<any[]>([]);

  // Forms
  const [offerForm, setOfferForm] = useState({ title: '', contactPerson: '', startDate: '', endDate: '', offeredSkillId: '' });
  const [jiraForm, setJiraForm] = useState({ title: '', ticketId: '', link: '', contactPerson: '', startDate: '', endDate: '', offeredSkillId: '' });

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const dossier = await DatabaseService.getEmployeeDossier(personId);
        if (cancelled) return;
        const ds = dossier || {};
        setSkills(Array.isArray(ds.skills) ? ds.skills : []);
        setProjectOffers(Array.isArray(ds.projectOffers) ? ds.projectOffers : []);
        setJiraTickets(Array.isArray(ds.jiraTickets) ? ds.jiraTickets : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, personId]);

  const addOffer = () => {
    if (!offerForm.title || !offerForm.startDate || !offerForm.endDate) return;
    const skill = skills.find(s => s.skillId === offerForm.offeredSkillId);
    setProjectOffers(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        title: offerForm.title,
        contactPerson: offerForm.contactPerson,
        startDate: offerForm.startDate,
        endDate: offerForm.endDate,
        offeredSkill: skill ? { ...skill } : undefined,
      },
    ]);
    setOfferForm({ title: '', contactPerson: '', startDate: '', endDate: '', offeredSkillId: '' });
  };

  const addJira = () => {
    if (!jiraForm.title || !jiraForm.startDate || !jiraForm.endDate) return;
    const skill = skills.find(s => s.skillId === jiraForm.offeredSkillId);
    setJiraTickets(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        title: jiraForm.title,
        ticketId: jiraForm.ticketId,
        link: jiraForm.link,
        contactPerson: jiraForm.contactPerson,
        startDate: jiraForm.startDate,
        endDate: jiraForm.endDate,
        offeredSkill: skill ? { ...skill } : undefined,
        probability: 0,
      },
    ]);
    setJiraForm({ title: '', ticketId: '', link: '', contactPerson: '', startDate: '', endDate: '', offeredSkillId: '' });
  };

  const removeOffer = (id: string) => setProjectOffers(prev => prev.filter(o => o.id !== id));
  const removeJira = (id: string) => setJiraTickets(prev => prev.filter(j => j.id !== id));

  const saveAll = async () => {
    setLoading(true);
    try {
      const dossier = await DatabaseService.getEmployeeDossier(personId);
      const base = dossier || { id: personId, name: personId };
      await DatabaseService.saveEmployeeDossier(personId, {
        ...base,
        projectOffers,
        jiraTickets,
      });
      onClose();
    } catch (e) {
      console.error('Speichern fehlgeschlagen', e);
      alert('Speichern fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="absolute inset-0 p-4 overflow-auto">
            <motion.div className="relative max-w-5xl mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="font-medium text-gray-900">Planung: Projektangebote & Jira-Tickets</div>
                <button onClick={onClose} className="p-2 rounded hover:bg-gray-100"><X className="w-4 h-4 text-gray-500"/></button>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Projektangebot */}
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2 text-gray-800"><Target className="w-4 h-4 text-emerald-600"/> Projektangebot</div>
                  <div className="space-y-2">
                    <input className="w-full px-2 py-1 border border-gray-200 rounded" placeholder="Titel" value={offerForm.title} onChange={e=>setOfferForm(v=>({...v,title:e.target.value}))}/>
                    <input className="w-full px-2 py-1 border border-gray-200 rounded" placeholder="Ansprechpartner" value={offerForm.contactPerson} onChange={e=>setOfferForm(v=>({...v,contactPerson:e.target.value}))}/>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" className="px-2 py-1 border border-gray-200 rounded" value={offerForm.startDate} onChange={e=>setOfferForm(v=>({...v,startDate:e.target.value}))}/>
                      <input type="date" className="px-2 py-1 border border-gray-200 rounded" value={offerForm.endDate} onChange={e=>setOfferForm(v=>({...v,endDate:e.target.value}))}/>
                    </div>
                    <select className="w-full px-2 py-1 border border-gray-200 rounded" value={offerForm.offeredSkillId} onChange={e=>setOfferForm(v=>({...v,offeredSkillId:e.target.value}))}>
                      <option value="">— angebotener Skill —</option>
                      {skills.map(s=> (
                        <option key={s.skillId} value={s.skillId}>{s.name} (Level {s.level})</option>
                      ))}
                    </select>
                    <button onClick={addOffer} className="px-3 py-1 bg-emerald-600 text-white rounded disabled:opacity-60" disabled={loading}>Hinzufügen</button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {projectOffers.map(o=> (
                      <div key={o.id} className="flex items-center justify-between px-2 py-1 border border-gray-200 rounded">
                        <div className="text-sm text-gray-800 truncate" title={o.title}>{o.title}</div>
                        <button onClick={()=>removeOffer(o.id)} className="text-xs text-red-600 hover:underline">Entfernen</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Jira Ticket */}
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2 text-gray-800"><Ticket className="w-4 h-4 text-sky-600"/> Jira-Ticket</div>
                  <div className="space-y-2">
                    <input className="w-full px-2 py-1 border border-gray-200 rounded" placeholder="Titel" value={jiraForm.title} onChange={e=>setJiraForm(v=>({...v,title:e.target.value}))}/>
                    <input className="w-full px-2 py-1 border border-gray-200 rounded" placeholder="Ticket-ID (z. B. ABC-123)" value={jiraForm.ticketId} onChange={e=>setJiraForm(v=>({...v,ticketId:e.target.value}))}/>
                    <input className="w-full px-2 py-1 border border-gray-200 rounded" placeholder="Link (optional)" value={jiraForm.link} onChange={e=>setJiraForm(v=>({...v,link:e.target.value}))}/>
                    <input className="w-full px-2 py-1 border border-gray-200 rounded" placeholder="Ansprechpartner" value={jiraForm.contactPerson} onChange={e=>setJiraForm(v=>({...v,contactPerson:e.target.value}))}/>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" className="px-2 py-1 border border-gray-200 rounded" value={jiraForm.startDate} onChange={e=>setJiraForm(v=>({...v,startDate:e.target.value}))}/>
                      <input type="date" className="px-2 py-1 border border-gray-200 rounded" value={jiraForm.endDate} onChange={e=>setJiraForm(v=>({...v,endDate:e.target.value}))}/>
                    </div>
                    <select className="w-full px-2 py-1 border border-gray-200 rounded" value={jiraForm.offeredSkillId} onChange={e=>setJiraForm(v=>({...v,offeredSkillId:e.target.value}))}>
                      <option value="">— angebotener Skill —</option>
                      {skills.map(s=> (
                        <option key={s.skillId} value={s.skillId}>{s.name} (Level {s.level})</option>
                      ))}
                    </select>
                    <button onClick={addJira} className="px-3 py-1 bg-sky-600 text-white rounded disabled:opacity-60" disabled={loading}>Hinzufügen</button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {jiraTickets.map(j=> (
                      <div key={j.id} className="flex items-center justify-between px-2 py-1 border border-gray-200 rounded">
                        <div className="text-sm text-gray-800 truncate" title={j.title}>{j.title}</div>
                        <button onClick={()=>removeJira(j.id)} className="text-xs text-red-600 hover:underline">Entfernen</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 rounded">Abbrechen</button>
                <button onClick={saveAll} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60" disabled={loading}>Speichern</button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default PlanningModal;


