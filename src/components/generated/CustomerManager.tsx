import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronDown, X, Edit2, Trash2, Building2 } from 'lucide-react';

export interface Customer {
  id: string;
  name: string;
  createdAt: Date;
  isActive: boolean;
}

interface CustomerManagerProps {
  customers: string[];
  onAddCustomer: (name: string) => void;
  onRemoveCustomer?: (name: string) => void;
  onUpdateCustomer?: (oldName: string, newName: string) => void;
  onSelect?: (customer: string) => void;
  showManagement?: boolean;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  allowCreate?: boolean;
}

export function CustomerManager({
  customers,
  onAddCustomer,
  onRemoveCustomer,
  onUpdateCustomer,
  onSelect,
  showManagement = false,
  className = "",
  value,
  onChange,
  allowCreate = true
}: CustomerManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Debug: Zeige Props und State
  console.log('🔍 CustomerManager - Props:', { customers, showManagement, allowCreate });
  console.log('🔍 CustomerManager - State:', { isOpen, searchTerm, filteredCustomers: customers?.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase())) });

  const filteredCustomers = customers.filter(customer =>
    customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Debug: Zeige Dropdown-Rendering
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 CustomerManager - Dropdown ist geöffnet, filteredCustomers:', filteredCustomers);
    }
  }, [isOpen, filteredCustomers]);

  const handleAddCustomer = () => {
    if (newCustomerName.trim() && !customers.includes(newCustomerName.trim())) {
      onAddCustomer(newCustomerName.trim());
      setNewCustomerName('');
      setIsOpen(false);
    }
  };

  const handleUpdateCustomer = (oldName: string, newName: string) => {
    if (newName.trim() && newName !== oldName && onUpdateCustomer) {
      onUpdateCustomer(oldName, newName.trim());
      setEditingCustomer(null);
      setEditName('');
    }
  };

  const handleRemoveCustomer = (customerName: string) => {
    if (onRemoveCustomer) {
      onRemoveCustomer(customerName);
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
    <div className={`relative ${className}`}>
      {/* Customer Selection Input */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
          placeholder="Kunde auswählen..."
        />
        <button
          onClick={() => {
            console.log('🔍 CustomerManager - Button geklickt, aktueller isOpen:', isOpen);
            setIsOpen(!isOpen);
            console.log('🔍 CustomerManager - Neuer isOpen wird:', !isOpen);
          }}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Debug Box */}
            <div className="fixed z-[9998] w-full p-2 bg-red-100 border-2 border-red-500 rounded-lg text-xs text-red-800" style={{ 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              width: '300px'
            }}>
              🔍 DEBUG: Dropdown ist sichtbar! {filteredCustomers.length} Kunden verfügbar
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="fixed z-[9999] w-80 bg-white border-2 border-blue-500 rounded-lg shadow-2xl max-h-60 overflow-hidden"
              style={{ 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)'
              }}
            >
            {/* Add New Customer Section */}
            {allowCreate && (
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomer()}
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Neuen Kunden hinzufügen..."
                  />
                  <button
                    onClick={handleAddCustomer}
                    disabled={!newCustomerName.trim()}
                    className="px-2 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Customer List */}
            <div className="max-h-48 overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <div className="p-3 text-center text-gray-500 text-sm">
                  {searchTerm ? 'Keine Kunden gefunden' : 'Keine Kunden verfügbar'}
                </div>
              ) : (
                filteredCustomers.map((customer) => {
                  console.log('🔍 CustomerManager - Rendering Kunde:', customer);
                  return (
                    <div
                      key={customer}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer border border-red-200"
                      onClick={() => {
                        console.log('🔍 CustomerManager - Kunde geklickt:', customer);
                        console.log('🔍 CustomerManager - onSelect:', onSelect);
                        console.log('🔍 CustomerManager - onChange:', onChange);
                        setSearchTerm(customer);
                        setIsOpen(false);
                        if (onSelect) {
                          console.log('🔍 CustomerManager - Rufe onSelect auf mit:', customer);
                          onSelect(customer);
                        }
                        if (onChange) {
                          console.log('🔍 CustomerManager - Rufe onChange auf mit:', customer);
                          onChange(customer);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{customer}</span>
                      </div>
                      
                      {showManagement && (
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(customer);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          {onRemoveCustomer && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCustomer(customer);
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
        )}
      </AnimatePresence>

      {/* Edit Customer Modal */}
      <AnimatePresence>
        {editingCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4"
            >
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Kunde bearbeiten
              </h3>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                placeholder="Kundenname"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={cancelEditing}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => handleUpdateCustomer(editingCustomer, editName)}
                  disabled={!editName.trim() || editName === editingCustomer}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Speichern
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Hook für die Kundenverwaltung
export function useCustomerManager(initialCustomers: string[] = []) {
  const [customers, setCustomers] = useState<string[]>(initialCustomers);

  const addCustomer = (name: string) => {
    setCustomers(prev => [...new Set([...prev, name.trim()])]);
  };

  const removeCustomer = (name: string) => {
    setCustomers(prev => prev.filter(c => c !== name));
  };

  const updateCustomer = (oldName: string, newName: string) => {
    setCustomers(prev => prev.map(c => c === oldName ? newName : c));
  };

  return {
    customers,
    addCustomer,
    removeCustomer,
    updateCustomer,
    setCustomers
  };
}
