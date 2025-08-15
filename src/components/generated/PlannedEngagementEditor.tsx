import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronDown, X, Calendar } from 'lucide-react';
import { PlanningModal } from './PlanningModal';

export interface PlannedEngagement {
  planned: boolean;
  customer?: string;
  probability?: number;
  startKw?: string; // e.g. "2025-KW33"
  endKw?: string; // e.g. "2025-KW35"
  ticketId?: string; // Jira ticket link
}

interface PlannedEngagementEditorProps {
  person: string;
  value: PlannedEngagement | undefined;
  customers: string[];
  availableKws: string[];
  onChange: (next: PlannedEngagement) => void;
  onAddCustomer: (name: string) => void;
}

export function PlannedEngagementEditor({ person, value, customers, availableKws, onChange, onAddCustomer }: PlannedEngagementEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlanningOpen, setPlanningOpen] = useState(false);
  const [local, setLocal] = useState<PlannedEngagement>(value || { planned: false });
  const [customerOpen, setCustomerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setLocal(value || { planned: false }), [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCustomerOpen(false);
        setSearch('');
        setNewCustomer('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (customerOpen && inputRef.current) inputRef.current.focus();
  }, [customerOpen]);

  const filteredCustomers = useMemo(() => {
    if (!search) return customers;
    return customers.filter(c => c.toLowerCase().includes(search.toLowerCase()));
  }, [customers, search]);

  function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  }

  const handleAddCustomer = () => {
    const name = newCustomer.trim();
    if (!name) return;
    const existsExact = customers.some(c => c.trim().toLowerCase() === name.toLowerCase());
    if (existsExact) {
      setLocal(prev => ({ ...prev, customer: customers.find(c => c.trim().toLowerCase() === name.toLowerCase()) }));
      setNewCustomer('');
      setCustomerOpen(false);
      return;
    }
    const similar = customers.find(c => levenshtein(c.toLowerCase(), name.toLowerCase()) <= 2);
    if (similar) {
      const ok = window.confirm(`Ähnlicher Kundenname gefunden: "${similar}". Trotzdem neuen Kunden "${name}" anlegen?`);
      if (!ok) return;
    }
    onAddCustomer(name);
    setLocal(prev => ({ ...prev, customer: name }));
    setNewCustomer('');
    setCustomerOpen(false);
  };

  const save = () => {
    onChange(local);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button onClick={() => setPlanningOpen(true)} className="inline-flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
          <Calendar className="w-3 h-3"/>
          Planung
        </button>
        <button onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded hover:bg-gray-50">
          Details
          <ChevronDown className={`w-3 h-3 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <PlanningModal isOpen={isPlanningOpen} onClose={() => setPlanningOpen(false)} personId={person} />
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={!!local.planned} onChange={e => setLocal(prev => ({ ...prev, planned: e.target.checked }))} className="w-4 h-4" />
              Einsatz geplant?
            </label>

            {local.planned && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Customer selector */}
                <div className="relative sm:col-span-1" ref={dropdownRef}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kunde</label>
                  <button onClick={() => setCustomerOpen(!customerOpen)} className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded">
                    <span className="text-sm text-gray-800 truncate">{local.customer || 'Kunden auswählen…'}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 ${customerOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {customerOpen && (
                      <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded shadow-lg">
                        <div className="p-2 border-b border-gray-200">
                          <div className="relative">
                            <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Kunde suchen…" className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
                            {search && (
                              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredCustomers.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500">Keine Kunden</div>
                          ) : (
                            filteredCustomers.map(c => (
                              <button key={c} onClick={() => { setLocal(prev => ({ ...prev, customer: c })); setCustomerOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                                {c}
                              </button>
                            ))
                          )}
                        </div>
                        <div className="p-2 border-t border-gray-200 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <input value={newCustomer} onChange={e => setNewCustomer(e.target.value)} placeholder="Neuen Kunden anlegen…" className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm" />
                            <button onClick={handleAddCustomer} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-700 border border-blue-200 rounded bg-white hover:bg-blue-50">
                              <Plus className="w-3 h-3" />
                              Hinzufügen
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Probability */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Wahrscheinlichkeit (%)</label>
                  <input type="number" min={0} max={100} step={5} value={local.probability ?? ''} onChange={e => setLocal(prev => ({ ...prev, probability: e.target.value === '' ? undefined : Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded" />
                </div>

                {/* Start KW */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start (KW)</label>
                  <select value={local.startKw || ''} onChange={e => setLocal(prev => ({ ...prev, startKw: e.target.value || undefined }))} className="w-full px-3 py-2 border border-gray-300 rounded bg-white">
                    <option value="">Keine Auswahl</option>
                    {availableKws.map(kw => (
                      <option key={kw} value={kw}>{kw}</option>
                    ))}
                  </select>
                </div>

                {/* End KW */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ende (KW)</label>
                  <select value={local.endKw || ''} onChange={e => setLocal(prev => ({ ...prev, endKw: e.target.value || undefined }))} className="w-full px-3 py-2 border border-gray-300 rounded bg-white">
                    <option value="">Keine Auswahl</option>
                    {availableKws.map(kw => (
                      <option key={kw} value={kw}>{kw}</option>
                    ))}
                  </select>
                </div>

                {/* Ticket ID */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ticket ID (Jira-Link)</label>
                  <input 
                    type="url" 
                    placeholder="https://jira.company.com/browse/PROJ-123" 
                    value={local.ticketId || ''} 
                    onChange={e => setLocal(prev => ({ ...prev, ticketId: e.target.value || undefined }))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded" 
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button onClick={save} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700">Speichern</button>
              <button onClick={() => setIsOpen(false)} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">Abbrechen</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



