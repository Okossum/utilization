import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Target, Users, Building2, Link2 } from 'lucide-react';
import { CustomerManager } from './CustomerManager';
import { useCustomers } from '../../contexts/CustomerContext';
import { AssignmentEditorModal } from './AssignmentEditorModal';

interface SalesOpportunitiesProps {
  isOpen: boolean;
  onClose: () => void;
  personId: string;
  personName: string;
}

export function SalesOpportunities({ isOpen, onClose, personId, personName }: SalesOpportunitiesProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const { customers, addCustomer, removeCustomer, updateCustomer } = useCustomers();
  const [isAssignmentEditorOpen, setAssignmentEditorOpen] = useState(false);

  // Debug: Zeige geladene Kunden
  console.log('🔍 SalesOpportunities - Geladene Kunden:', customers);
  console.log('🔍 SalesOpportunities - Kunden Array Länge:', customers?.length);

  // Wenn nicht geöffnet, nichts rendern
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <motion.div 
        className="relative w-full max-w-7xl max-h-[90vh] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Sales Opportunities für {personName}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Kunden und Projektmöglichkeiten verwalten
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            aria-label="Schließen"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-blue-600" />
              Kunden und Projektmöglichkeiten
            </h2>
            <p className="text-sm text-gray-600">
              Hier können Sie bestehende Kunden verwalten und dem Mitarbeiter {personName} 
              neue Projektmöglichkeiten zuweisen.
            </p>
          </div>

          {/* Debug Info */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Debug:</strong> {customers?.length || 0} Kunden geladen
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Kunden: {customers?.join(', ') || 'Keine'}
            </p>
          </div>

          {/* CustomerManager Integration */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Kundenverwaltung
            </h3>
            <CustomerManager 
              customers={customers || []}
              onAddCustomer={addCustomer}
              onRemoveCustomer={removeCustomer}
              onUpdateCustomer={updateCustomer}
              onSelect={setSelectedCustomer}
              value={selectedCustomer || ''}
              onChange={setSelectedCustomer}
              showManagement={true}
              allowCreate={true}
            />
          </div>

          {/* Selected Customer Info */}
          {selectedCustomer && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-md font-medium text-blue-900 mb-2">
                Ausgewählter Kunde
              </h3>
              <p className="text-sm text-blue-700">
                Kunde: <strong>{selectedCustomer}</strong>
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Sie können jetzt diesem Kunden neue Projekte zuweisen oder bestehende Projekte bearbeiten.
              </p>
              <div className="mt-3">
                <button
                  onClick={() => setAssignmentEditorOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  <Link2 className="w-4 h-4" /> Projekt zuordnen
                </button>
              </div>
            </div>
          )}
        </div>
        <AssignmentEditorModal
          isOpen={isAssignmentEditorOpen}
          onClose={() => setAssignmentEditorOpen(false)}
          employeeName={personId}
        />
      </motion.div>
    </div>
  );
}

export default SalesOpportunities;
