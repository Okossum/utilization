import React, { useState } from 'react';
import { CustomerManager } from './CustomerManager';
import { CustomerManagementPage } from './CustomerManagementPage';
import { useCustomers } from '../../contexts/CustomerContext';

export function CustomerDemo() {
  const { customers, addCustomer } = useCustomers();
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [showManagementPage, setShowManagementPage] = useState(false);

  if (showManagementPage) {
    return (
      <div>
        <button
          onClick={() => setShowManagementPage(false)}
          className="mb-4 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          ← Zurück zur Demo
        </button>
        <CustomerManagementPage />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          CustomerManager Demo
        </h1>
        <p className="text-gray-600 mb-8">
          Testen Sie die neue zentrale Kundenverwaltung
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Einfache Kundenauswahl */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Kundenauswahl
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kunde auswählen
              </label>
              <CustomerManager
                customers={customers}
                onAddCustomer={addCustomer}
                value={selectedCustomer}
                onChange={setSelectedCustomer}
              />
            </div>
            {selectedCustomer && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Ausgewählter Kunde: <strong>{selectedCustomer}</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Kundenliste */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Verfügbare Kunden
          </h2>
          <div className="space-y-2">
            {customers.length === 0 ? (
              <p className="text-gray-500 text-sm">Noch keine Kunden vorhanden</p>
            ) : (
              customers.map((customer) => (
                <div
                  key={customer}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm">{customer}</span>
                  <button
                    onClick={() => setSelectedCustomer(customer)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Auswählen
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Vollständige Verwaltungsseite */}
      <div className="text-center">
        <button
          onClick={() => setShowManagementPage(true)}
          className="px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Vollständige Kundenverwaltung öffnen
        </button>
      </div>

      {/* Aktueller Status */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aktueller Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Gesamt Kunden:</span>
            <span className="ml-2 font-medium">{customers.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Ausgewählt:</span>
            <span className="ml-2 font-medium">
              {selectedCustomer || 'Keiner'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Speicherort:</span>
            <span className="ml-2 font-medium">localStorage</span>
          </div>
        </div>
      </div>
    </div>
  );
}
