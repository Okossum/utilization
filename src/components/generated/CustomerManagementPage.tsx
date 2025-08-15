import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Building2, Edit2, Trash2, Users, Calendar, FolderOpen } from 'lucide-react';
import { useCustomers } from '../../contexts/CustomerContext';

export function CustomerManagementPage() {
  const {
    customers,
    projects,
    addCustomer,
    removeCustomer,
    updateCustomer,
    setCustomers
  } = useCustomers();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filteredCustomers = customers.filter(customer =>
    customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCustomer = () => {
    if (newCustomerName.trim() && !customers.includes(newCustomerName.trim())) {
      addCustomer(newCustomerName.trim());
      setNewCustomerName('');
      setShowAddForm(false);
    }
  };

  const handleUpdateCustomer = (oldName: string, newName: string) => {
    if (newName.trim() && newName !== oldName) {
      updateCustomer(oldName, newName.trim());
      setEditingCustomer(null);
      setEditName('');
    }
  };

  const handleRemoveCustomer = (customerName: string) => {
    if (window.confirm(`Möchten Sie den Kunden "${customerName}" wirklich löschen?`)) {
      removeCustomer(customerName);
    }
  };

  const startEditing = (customerName: string) => {
    setEditingCustomer(customerName);
    setEditName(customerName);
  };

  const cancelEditing = () => {
    setEditingCustomer(null);
    setEditName('');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kundenverwaltung</h1>
            <p className="text-gray-600">Verwalten Sie alle Kunden zentral</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neuen Kunden hinzufügen
        </button>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Kunden durchsuchen..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">Gesamt Kunden</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600">Gesamt Projekte</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
        </div>
      </div>

      {/* Add Customer Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-6 rounded-lg border border-gray-200"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">Neuen Kunden hinzufügen</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomer()}
                placeholder="Kundenname eingeben..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleAddCustomer}
                disabled={!newCustomerName.trim()}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hinzufügen
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewCustomerName('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Abbrechen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customers List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Alle Kunden</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {searchTerm ? 'Keine Kunden gefunden' : 'Noch keine Kunden vorhanden'}
              </p>
              {!searchTerm && (
                <p className="text-sm">Fügen Sie den ersten Kunden hinzu, um zu beginnen.</p>
              )}
            </div>
          ) : (
            filteredCustomers.map((customer, index) => (
              <motion.div
                key={customer}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                {editingCustomer === customer ? (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Kundenname"
                      />
                    </div>
                    <button
                      onClick={() => handleUpdateCustomer(customer, editName)}
                      disabled={!editName.trim() || editName === customer}
                      className="px-3 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Speichern
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{customer}</h3>
                        <p className="text-sm text-gray-500">Kunde</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditing(customer)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveCustomer(customer)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Projekte Übersicht */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Alle Projekte</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {projects.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium mb-2">Noch keine Projekte vorhanden</p>
              <p className="text-sm">Projekte werden automatisch erstellt, wenn Sie sie in der Projektverwaltung hinzufügen.</p>
            </div>
          ) : (
            projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FolderOpen className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500">Kunde: {project.customer}</p>
                      <p className="text-xs text-gray-400">
                        Erstellt: {project.createdAt.toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
