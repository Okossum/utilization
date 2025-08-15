import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Ticket, Save, X, Percent, ExternalLink } from 'lucide-react';
import { JiraTicket } from './EmployeeDossierModal';
interface JiraTicketsListProps {
  tickets: JiraTicket[];
  onChange: (tickets: JiraTicket[]) => void;
}
export function JiraTicketsList({
  tickets,
  onChange
}: JiraTicketsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<JiraTicket, 'id'>>({
    ticketId: '',
    probability: 0,
    contactPerson: ''
  });
  const handleAdd = () => {
    const newTicket: JiraTicket = {
      id: Date.now().toString(),
      ticketId: 'STAFF-',
      probability: 50,
      contactPerson: ''
    };
    onChange([...tickets, newTicket]);
    setEditingId(newTicket.id);
    setEditForm({
      ticketId: newTicket.ticketId,
      probability: newTicket.probability,
      contactPerson: newTicket.contactPerson
    });
  };
  const handleEdit = (ticket: JiraTicket) => {
    setEditingId(ticket.id);
    setEditForm({
      ticketId: ticket.ticketId,
      probability: ticket.probability,
      contactPerson: ticket.contactPerson
    });
  };
  const handleSave = () => {
    if (editingId) {
      const updatedTickets = tickets.map(ticket => ticket.id === editingId ? {
        ...ticket,
        ...editForm
      } : ticket);
      onChange(updatedTickets);
      setEditingId(null);
    }
  };
  const handleCancel = () => {
    setEditingId(null);
    setEditForm({
      ticketId: '',
      probability: 0,
      contactPerson: ''
    });
  };
  const handleDelete = (id: string) => {
    onChange(tickets.filter(ticket => ticket.id !== id));
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
          <Ticket className="w-5 h-5 text-amber-600" />
          Jira Staffing Tickets
        </h2>
        <button onClick={handleAdd} className="flex items-center gap-2 px-3 py-2 text-sm text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
          <Plus className="w-4 h-4" />
          Jira Ticket hinzufügen
        </button>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {tickets.map(ticket => <motion.div key={ticket.id} initial={{
          opacity: 0,
          y: -10
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          y: -10
        }} className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              {editingId === ticket.id ? <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Jira Ticket ID</label>
                      <input type="text" value={editForm.ticketId} onChange={e => setEditForm(prev => ({
                  ...prev,
                  ticketId: e.target.value
                }))} className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent" placeholder="STAFF-123" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Wahrscheinlichkeit (%)</label>
                      <div className="relative">
                        <input type="number" min="0" max="100" value={editForm.probability} onChange={e => handleProbabilityChange(e.target.value)} className="w-full px-2 py-1 pr-6 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                        <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Ansprechpartner</label>
                      <input type="text" value={editForm.contactPerson} onChange={e => setEditForm(prev => ({
                  ...prev,
                  contactPerson: e.target.value
                }))} className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent" placeholder="Name des Ansprechpartners" />
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
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{ticket.ticketId}</p>
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-500">Ticket ID</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-amber-700">{ticket.probability}%</p>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="bg-amber-500 h-2 rounded-full transition-all duration-300" style={{
                      width: `${ticket.probability}%`
                    }} />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">Wahrscheinlichkeit</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{ticket.contactPerson || 'Nicht angegeben'}</p>
                      <p className="text-xs text-gray-500">Ansprechpartner</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button onClick={() => handleEdit(ticket)} className="p-1 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(ticket.id)} className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>}
            </motion.div>)}
        </AnimatePresence>

        {tickets.length === 0 && <div className="text-center py-8 text-gray-500">
            <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Noch keine Jira Tickets hinzugefügt</p>
          </div>}
      </div>
    </section>;
}