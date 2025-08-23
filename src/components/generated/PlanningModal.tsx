import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Target, Ticket, Plus, Info } from 'lucide-react';
import DatabaseService from '../../services/database';
import { employeeSkillService } from '../../lib/firebase-services';
import { SkillDropdownWithAdd } from './SkillDropdownWithAdd';

type OfferedSkill = { skillId: string; name: string; level: number };

interface PlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  personId: string; // verwendet als Dossier-ID
  filterByWeek?: { year: number; week: number };
  initialTab?: 'offers' | 'jira' | 'all';
}

export function PlanningModal({ isOpen, onClose, personId, filterByWeek, initialTab = 'all' }: PlanningModalProps) {
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<OfferedSkill[]>([]);
  const [projectOffers, setProjectOffers] = useState<any[]>([]);
  const [jiraTickets, setJiraTickets] = useState<any[]>([]);
  const [showForms, setShowForms] = useState(false);

  // Forms
  const [offerForm, setOfferForm] = useState({ title: '', contactPerson: '', startDate: '', endDate: '', offeredSkillId: '', probability: 25 });
  const [jiraForm, setJiraForm] = useState({ title: '', ticketId: '', link: '', contactPerson: '', startDate: '', endDate: '', offeredSkillId: '', probability: 25 });

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Lade Employee Skills aus Firebase
        const firebaseSkills = await employeeSkillService.getByEmployee(personId);
        const skillsData = firebaseSkills.map(fs => ({
          skillId: fs.skillId,
          name: fs.skillName,
          level: fs.level
        }));

        const dossier = await DatabaseService.getEmployeeDossier(personId);
        if (cancelled) return;
        const ds = dossier || {};
        
        // Skills aus Firebase haben Vorrang
        setSkills(skillsData.length > 0 ? skillsData : (Array.isArray(ds.skills) ? ds.skills : []));
        setProjectOffers(Array.isArray(ds.projectOffers) ? ds.projectOffers : []);
        setJiraTickets(Array.isArray(ds.jiraTickets) ? ds.jiraTickets : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, personId]);

  // Funktion zum Aktualisieren der Skills nach dem Hinzufügen neuer Skills
  const refreshSkills = async () => {
    try {
      const firebaseSkills = await employeeSkillService.getByEmployee(personId);
      const skillsData = firebaseSkills.map(fs => ({
        skillId: fs.skillId,
        name: fs.skillName,
        level: fs.level
      }));
      setSkills(skillsData);
    } catch (error) {
      // console.error entfernt
    }
  };

  // KW-Hilfen
  function getIsoWeekStartDate(year: number, week: number): Date {
    const fourthJan = new Date(year, 0, 4);
    const dayOfWeek = (fourthJan.getDay() + 6) % 7; // Montag=0
    const mondayOfWeek1 = new Date(fourthJan);
    mondayOfWeek1.setDate(fourthJan.getDate() - dayOfWeek);
    const result = new Date(mondayOfWeek1);
    result.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
    result.setHours(0, 0, 0, 0);
    return result;
  }
  function overlapsWeek(start: string | undefined, end: string | undefined, year: number, week: number): boolean {
    if (!start || !end) return false;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return false;
    const ws = getIsoWeekStartDate(year, week);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6);
    we.setHours(23, 59, 59, 999);
    return s <= we && e >= ws;
  }

  const filteredOffers = useMemo(() => {
    if (!filterByWeek) return projectOffers;
    return projectOffers.filter(o => overlapsWeek(o.startDate, o.endDate, filterByWeek.year, filterByWeek.week));
  }, [projectOffers, filterByWeek]);

  const filteredJira = useMemo(() => {
    if (!filterByWeek) return jiraTickets;
    return jiraTickets.filter(j => overlapsWeek(j.startDate, j.endDate, filterByWeek.year, filterByWeek.week));
  }, [jiraTickets, filterByWeek]);

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
        probability: offerForm.probability,
      },
    ]);
    setOfferForm({ title: '', contactPerson: '', startDate: '', endDate: '', offeredSkillId: '', probability: 25 });
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
        probability: jiraForm.probability,
      },
    ]);
    setJiraForm({ title: '', ticketId: '', link: '', contactPerson: '', startDate: '', endDate: '', offeredSkillId: '', probability: 25 });
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
              <div className="p-4">
                {filterByWeek && (
                  <div className="mb-3 text-xs text-gray-600">
                    Gefiltert auf KW {filterByWeek.week}/{filterByWeek.year}
                  </div>
                )}
                {/* Listen-Übersicht */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2 text-gray-800">
                      <div className="flex items-center gap-2"><Target className="w-4 h-4 text-emerald-600"/> Projektangebote</div>
                    </div>
                    <div className="space-y-2">
                      {filteredOffers.length === 0 && (
                        <div className="text-sm text-gray-400">Keine Einträge</div>
                      )}
                      {filteredOffers.map(o=> (
                        <div key={o.id} className="flex items-center justify-between px-2 py-1 border border-gray-200 rounded">
                          <div className="text-sm text-gray-800 truncate" title={o.title}>{o.title}</div>
                          <button onClick={()=>removeOffer(o.id)} className="text-xs text-red-600 hover:underline">Entfernen</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2 text-gray-800">
                      <div className="flex items-center gap-2"><Ticket className="w-4 h-4 text-sky-600"/> Jira-Tickets</div>
                    </div>
                    <div className="space-y-2">
                      {filteredJira.length === 0 && (
                        <div className="text-sm text-gray-400">Keine Einträge</div>
                      )}
                      {filteredJira.map(j=> (
                        <div key={j.id} className="flex items-center justify-between px-2 py-1 border border-gray-200 rounded">
                          <div className="text-sm text-gray-800 truncate" title={j.title}>{j.title}</div>
                          <button onClick={()=>removeJira(j.id)} className="text-xs text-red-600 hover:underline">Entfernen</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Formulare einklappbar */}
                <div className="mt-4">
                  <button onClick={()=>setShowForms(s=>!s)} className="inline-flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                    <Plus className="w-4 h-4"/> {showForms ? 'Formulare ausblenden' : 'Neuen Eintrag hinzufügen'}
                  </button>
                  {showForms && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Angebot-Form */}
                      <div className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2 text-gray-800"><Target className="w-4 h-4 text-emerald-600"/> Projektangebot anlegen</div>
                        <div className="space-y-2">
                          <input className="w-full px-2 py-1 border border-gray-200 rounded" placeholder="Titel" value={offerForm.title} onChange={e=>setOfferForm(v=>({...v,title:e.target.value}))}/>
                          <input className="w-full px-2 py-1 border border-gray-200 rounded" placeholder="Ansprechpartner" value={offerForm.contactPerson} onChange={e=>setOfferForm(v=>({...v,contactPerson:e.target.value}))}/>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="date" className="px-2 py-1 border border-gray-200 rounded" value={offerForm.startDate} onChange={e=>setOfferForm(v=>({...v,startDate:e.target.value}))}/>
                            <input type="date" className="px-2 py-1 border border-gray-200 rounded" value={offerForm.endDate} onChange={e=>setOfferForm(v=>({...v,endDate:e.target.value}))}/>
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Wahrscheinlichkeit</label>
                              <div className="relative group ml-2">
                                <Info className="w-3.5 h-3.5 text-gray-400" />
                                <div className="absolute right-0 top-5 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                  <div className="font-semibold mb-1 text-blue-200">Erklärung</div>
                                  <ul className="space-y-1 text-gray-200">
                                    <li>25% = Profil abgegeben</li>
                                    <li>50% = Angeboten</li>
                                    <li>75% = Positives Feedback</li>
                                    <li>100% = Beauftragt</li>
                                  </ul>
                                  <div className="absolute -top-2 right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                                </div>
                              </div>
                            </div>
                            <select
                              className="w-full px-2 py-1 border border-gray-200 rounded"
                              value={offerForm.probability}
                              onChange={e=>setOfferForm(v=>({...v, probability: Number(e.target.value)}))}
                            >
                              <option value={25}>25%</option>
                              <option value={50}>50%</option>
                              <option value={75}>75%</option>
                              <option value={100}>100%</option>
                            </select>
                          </div>
                          <SkillDropdownWithAdd
                            value={offerForm.offeredSkillId}
                            onChange={(skillId) => setOfferForm(v => ({ ...v, offeredSkillId: skillId }))}
                            availableSkills={skills}
                            onSkillsUpdated={refreshSkills}
                            placeholder="— angebotener Skill —"
                            employeeId={personId}
                            className="w-full"
                          />
                          <button onClick={addOffer} className="px-3 py-1 bg-emerald-600 text-white rounded disabled:opacity-60" disabled={loading}>Hinzufügen</button>
                        </div>
                      </div>

                      {/* Jira-Form */}
                      <div className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2 text-gray-800"><Ticket className="w-4 h-4 text-sky-600"/> Jira-Ticket anlegen</div>
                        <div className="space-y-2">
                          <input className="w-full px-2 py-1 border border-gray-200 rounded" placeholder="Titel" value={jiraForm.title} onChange={e=>setJiraForm(v=>({...v,title:e.target.value}))}/>
                          <input className="w-full px-2 py-1 border border-gray-200 rounded" placeholder="Ticket-ID (z. B. ABC-123)" value={jiraForm.ticketId} onChange={e=>setJiraForm(v=>({...v,ticketId:e.target.value}))}/>
                          <input className="w-full px-2 py-1 border border-gray-200 rounded" placeholder="Link (optional)" value={jiraForm.link} onChange={e=>setJiraForm(v=>({...v,link:e.target.value}))}/>
                          <input className="w-full px-2 py-1 border border-gray-200 rounded" placeholder="Ansprechpartner" value={jiraForm.contactPerson} onChange={e=>setJiraForm(v=>({...v,contactPerson:e.target.value}))}/>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="date" className="px-2 py-1 border border-gray-200 rounded" value={jiraForm.startDate} onChange={e=>setJiraForm(v=>({...v,startDate:e.target.value}))}/>
                            <input type="date" className="px-2 py-1 border border-gray-200 rounded" value={jiraForm.endDate} onChange={e=>setJiraForm(v=>({...v,endDate:e.target.value}))}/>
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Wahrscheinlichkeit</label>
                              <div className="relative group ml-2">
                                <Info className="w-3.5 h-3.5 text-gray-400" />
                                <div className="absolute right-0 top-5 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                  <div className="font-semibold mb-1 text-blue-200">Erklärung</div>
                                  <ul className="space-y-1 text-gray-200">
                                    <li>25% = Profil abgegeben</li>
                                    <li>50% = Angeboten</li>
                                    <li>75% = Positives Feedback</li>
                                    <li>100% = Beauftragt</li>
                                  </ul>
                                  <div className="absolute -top-2 right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                                </div>
                              </div>
                            </div>
                            <select
                              className="w-full px-2 py-1 border border-gray-200 rounded"
                              value={jiraForm.probability}
                              onChange={e=>setJiraForm(v=>({...v, probability: Number(e.target.value)}))}
                            >
                              <option value={25}>25%</option>
                              <option value={50}>50%</option>
                              <option value={75}>75%</option>
                              <option value={100}>100%</option>
                            </select>
                          </div>
                          <SkillDropdownWithAdd
                            value={jiraForm.offeredSkillId}
                            onChange={(skillId) => setJiraForm(v => ({ ...v, offeredSkillId: skillId }))}
                            availableSkills={skills}
                            onSkillsUpdated={refreshSkills}
                            placeholder="— angebotener Skill —"
                            employeeId={personId}
                            className="w-full"
                          />
                          <button onClick={addJira} className="px-3 py-1 bg-sky-600 text-white rounded disabled:opacity-60" disabled={loading}>Hinzufügen</button>
                        </div>
                      </div>
                    </div>
                  )}
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


