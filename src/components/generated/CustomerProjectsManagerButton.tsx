import React, { useState } from 'react';
import { Settings2, X } from 'lucide-react';
import { CustomerProjectsManager } from './CustomerProjectsManager';

export function CustomerProjectsManagerButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Open Button (floating) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-lg bg-blue-600 text-white hover:bg-blue-700"
        aria-label="Kunden & Projekte verwalten"
      >
        <Settings2 className="w-4 h-4" />
        Kunden/Projekte
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute inset-0 p-4 md:p-8 overflow-auto">
            <div className="relative max-w-6xl mx-auto bg-white rounded-xl shadow-2xl border border-gray-200">
              <div className="sticky top-0 flex items-center justify-between p-3 md:p-4 border-b border-gray-200 bg-white rounded-t-xl">
                <div className="text-sm font-medium text-gray-700">Kunden & Projekte</div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                  aria-label="Modal schließen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2 md:p-4">
                <CustomerProjectsManager />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CustomerProjectsManagerButton;


