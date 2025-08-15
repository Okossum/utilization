import React, { useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Building2, FolderOpen, Check, X, Search } from 'lucide-react';
import { useCustomers } from '../../contexts/CustomerContext';

/**
 * Simple, self-contained customer and project management component.
 * - Uses existing CustomerContext (localStorage-backed) → no changes to main app required
 * - A customer can have many projects (1:n)
 * - Supports create/update/delete for customers and their projects
 */
export function CustomerProjectsManager() {
  const {
    customers,
    addCustomer,
    removeCustomer,
    updateCustomer,
    addProject,
    removeProject,
    updateProject,
    getProjectsByCustomer,
  } = useCustomers();

  const [searchTerm, setSearchTerm] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(c => c.toLowerCase().includes(term));
  }, [customers, searchTerm]);

  const handleAddCustomer = () => {
    const name = newCustomerName.trim();
    if (!name) return;
    if (!customers.includes(name)) {
      addCustomer(name);
    }
    setNewCustomerName('');
  };

  const beginEditCustomer = (customer: string) => {
    setEditingCustomer(customer);
    setEditCustomerName(customer);
  };

  const saveEditCustomer = (oldName: string) => {
    const next = editCustomerName.trim();
    if (next && next !== oldName) {
      updateCustomer(oldName, next);
    }
    setEditingCustomer(null);
    setEditCustomerName('');
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kunden & Projekte</h1>
            <p className="text-gray-600">Einfache Verwaltung von Kunden mit verknüpften Projekten</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Kunden durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="md:col-span-2 flex gap-2">
          <input
            type="text"
            placeholder="Neuen Kunden anlegen..."
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomer()}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleAddCustomer}
            disabled={!newCustomerName.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Kunde hinzufügen
          </button>
        </div>
      </div>

      {/* Customers with Projects */}
      <div className="space-y-4">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-gray-200">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
            Keine Kunden gefunden.
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer}
              customer={customer}
              onBeginEdit={() => beginEditCustomer(customer)}
              onCancelEdit={() => { setEditingCustomer(null); setEditCustomerName(''); }}
              onSaveEdit={() => saveEditCustomer(customer)}
              onRemove={() => removeCustomer(customer)}
              editing={editingCustomer === customer}
              editName={editCustomerName}
              setEditName={setEditCustomerName}
              addProject={(name) => addProject(name, customer)}
              removeProject={removeProject}
              updateProject={updateProject}
              projects={getProjectsByCustomer(customer)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface CustomerCardProps {
  customer: string;
  editing: boolean;
  editName: string;
  setEditName: (v: string) => void;
  onBeginEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRemove: () => void;
  projects: { id: string; name: string; customer: string; createdAt: Date }[];
  addProject: (name: string) => void;
  removeProject: (id: string) => void;
  updateProject: (id: string, updates: { name?: string }) => void;
}

function CustomerCard({
  customer,
  editing,
  editName,
  setEditName,
  onBeginEdit,
  onCancelEdit,
  onSaveEdit,
  onRemove,
  projects,
  addProject,
  removeProject,
  updateProject,
}: CustomerCardProps) {
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');

  const handleAddProject = () => {
    const name = newProjectName.trim();
    if (!name) return;
    addProject(name);
    setNewProjectName('');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button onClick={onSaveEdit} disabled={!editName.trim()} className="p-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={onCancelEdit} className="p-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{customer}</h3>
              <p className="text-xs text-gray-500">Kunde</p>
            </div>
          </div>
        )}

        {!editing && (
          <div className="flex items-center gap-2">
            <button onClick={onBeginEdit} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={onRemove} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Projects */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Neues Projekt für diesen Kunden..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleAddProject}
            disabled={!newProjectName.trim()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Projekt hinzufügen
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="p-6 text-center text-gray-500 border border-dashed border-gray-200 rounded-lg">
            <FolderOpen className="w-6 h-6 mx-auto mb-2 opacity-60" />
            Keine Projekte vorhanden.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50">
                {editingProjectId === p.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      value={editProjectName}
                      onChange={(e) => setEditProjectName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => {
                        const next = editProjectName.trim();
                        if (next && next !== p.name) updateProject(p.id, { name: next });
                        setEditingProjectId(null);
                        setEditProjectName('');
                      }}
                      disabled={!editProjectName.trim()}
                      className="p-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setEditingProjectId(null); setEditProjectName(''); }}
                      className="p-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FolderOpen className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-500">Erstellt: {new Date(p.createdAt).toLocaleDateString('de-DE')}</div>
                    </div>
                  </div>
                )}
                {editingProjectId !== p.id && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingProjectId(p.id); setEditProjectName(p.name); }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeProject(p.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default CustomerProjectsManager;


