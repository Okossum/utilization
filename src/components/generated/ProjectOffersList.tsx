import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Target, Save, X, Percent } from 'lucide-react';
import { ProjectOffer } from './EmployeeDossierModal';
interface ProjectOffersListProps {
  offers: ProjectOffer[];
  onChange: (offers: ProjectOffer[]) => void;
}
export function ProjectOffersList({
  offers,
  onChange
}: ProjectOffersListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<ProjectOffer, 'id'>>({
    customerName: '',
    startWeek: '',
    endWeek: '',
    probability: 0
  });
  const handleAdd = () => {
    const newOffer: ProjectOffer = {
      id: Date.now().toString(),
      customerName: 'Neuer Kunde',
      startWeek: '',
      endWeek: '',
      probability: 50
    };
    onChange([...offers, newOffer]);
    setEditingId(newOffer.id);
    setEditForm({
      customerName: newOffer.customerName,
      startWeek: newOffer.startWeek,
      endWeek: newOffer.endWeek,
      probability: newOffer.probability
    });
  };
  const handleEdit = (offer: ProjectOffer) => {
    setEditingId(offer.id);
    setEditForm({
      customerName: offer.customerName,
      startWeek: offer.startWeek,
      endWeek: offer.endWeek,
      probability: offer.probability
    });
  };
  const handleSave = () => {
    if (editingId) {
      const updatedOffers = offers.map(offer => offer.id === editingId ? {
        ...offer,
        ...editForm
      } : offer);
      onChange(updatedOffers);
      setEditingId(null);
    }
  };
  const handleCancel = () => {
    setEditingId(null);
    setEditForm({
      customerName: '',
      startWeek: '',
      endWeek: '',
      probability: 0
    });
  };
  const handleDelete = (id: string) => {
    onChange(offers.filter(offer => offer.id !== id));
    if (editingId === id) {
      setEditingId(null);
    }
  };
  const handleProbabilityChange = (value: string) => {
    const numValue = Math.max(0, Math.min(100, parseInt(value) || 0));
    setEditForm(prev => ({
      ...prev,
      probability: numValue
    }));
  };
  return <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-600" />
          Projektangebote
        </h2>
        <button onClick={handleAdd} className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
          <Plus className="w-4 h-4" />
          Angebot hinzufügen
        </button>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {offers.map(offer => <motion.div key={offer.id} initial={{
          opacity: 0,
          y: -10
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          y: -10
        }} className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              {editingId === offer.id ? <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Kunde</label>
                      <input type="text" value={editForm.customerName} onChange={e => setEditForm(prev => ({
                  ...prev,
                  customerName: e.target.value
                }))} className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start KW</label>
                      <input type="text" value={editForm.startWeek} onChange={e => setEditForm(prev => ({
                  ...prev,
                  startWeek: e.target.value
                }))} className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="KW15/2024" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Ende KW</label>
                      <input type="text" value={editForm.endWeek} onChange={e => setEditForm(prev => ({
                  ...prev,
                  endWeek: e.target.value
                }))} className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="KW30/2024" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Wahrscheinlichkeit (%)</label>
                      <div className="relative">
                        <input type="number" min="0" max="100" value={editForm.probability} onChange={e => handleProbabilityChange(e.target.value)} className="w-full px-2 py-1 pr-6 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                        <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleSave} className="flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors">
                      <Save className="w-3 h-3" />
                      Speichern
                    </button>
                    <button onClick={handleCancel} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors">
                      <X className="w-3 h-3" />
                      Abbrechen
                    </button>
                  </div>
                </div> : <div className="flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{offer.customerName}</p>
                      <p className="text-xs text-gray-500">Kunde</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{offer.startWeek}</p>
                      <p className="text-xs text-gray-500">Start</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{offer.endWeek}</p>
                      <p className="text-xs text-gray-500">Ende</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-emerald-700">{offer.probability}%</p>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{
                      width: `${offer.probability}%`
                    }} />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">Wahrscheinlichkeit</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button onClick={() => handleEdit(offer)} className="p-1 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(offer.id)} className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>}
            </motion.div>)}
        </AnimatePresence>

        {offers.length === 0 && <div className="text-center py-8 text-gray-500">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Noch keine Projektangebote hinzugefügt</p>
          </div>}
      </div>
    </section>;
}