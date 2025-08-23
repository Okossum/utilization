import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Search, Users } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Employee {
  personId: string;
  person: string;
  team?: string;
  cc?: string;
  lbs?: string;
  isActionItem?: boolean;
}

interface EmployeeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (personId: string) => void;
  actionItems?: Record<string, { actionItem: boolean; source: 'manual' | 'rule' | 'default'; updatedBy?: string }>;
}

export default function EmployeeSelectionModal({
  isOpen,
  onClose,
  onSelect,
  actionItems = {}
}: EmployeeSelectionModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyActionItems, setShowOnlyActionItems] = useState(true);

  // Load employees from einsatzplan
  useEffect(() => {
    if (!isOpen) return;
    
    const loadEmployees = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, 'einsatzplan'));
        const allEmployees: Employee[] = [];
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.person && data.personId) {
            const isActionItem = actionItems[data.person]?.actionItem === true;
            allEmployees.push({
              personId: data.personId,
              person: data.person,
              team: data.team,
              cc: data.cc,
              lbs: data.lbs,
              isActionItem
            });
          }
        });

        // Remove duplicates by personId
        const uniqueEmployees = allEmployees.reduce((acc, emp) => {
          if (!acc.find(e => e.personId === emp.personId)) {
            acc.push(emp);
          }
          return acc;
        }, [] as Employee[]);

        // Sort: Action items first, then alphabetically
        uniqueEmployees.sort((a, b) => {
          if (a.isActionItem && !b.isActionItem) return -1;
          if (!a.isActionItem && b.isActionItem) return 1;
          return a.person.localeCompare(b.person);
        });

        setEmployees(uniqueEmployees);
      } catch (error) {
        console.error('Error loading employees:', error);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, [isOpen, actionItems]);

  // Filter employees based on search and action items toggle
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.person.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.team?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.cc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.lbs?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = !showOnlyActionItems || emp.isActionItem;
    
    return matchesSearch && matchesFilter;
  });

  const handleSelect = (personId: string) => {
    onSelect(personId);
    onClose();
  };

  const actionItemCount = employees.filter(emp => emp.isActionItem).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Mitarbeiter auswählen
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Wählen Sie einen Mitarbeiter für die Detailansicht aus
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </header>

            {/* Filters */}
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <div className="flex flex-col gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Mitarbeiter durchsuchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Action Items Toggle */}
                {actionItemCount > 0 && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOnlyActionItems}
                        onChange={(e) => setShowOnlyActionItems(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Nur Action-Items anzeigen ({actionItemCount})
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                  <span>Lade Mitarbeiter...</span>
                </div>
              ) : (
                <>
                  {/* Results Count */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      {filteredEmployees.length} von {employees.length} Mitarbeitern
                      {searchTerm && ` (gefiltert nach "${searchTerm}")`}
                    </p>
                  </div>

                  {/* Employee List */}
                  {filteredEmployees.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>Keine Mitarbeiter gefunden</p>
                      {showOnlyActionItems && actionItemCount === 0 && (
                        <p className="text-sm mt-2">
                          Keine Action-Items verfügbar. Deaktivieren Sie den Filter, um alle Mitarbeiter zu sehen.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredEmployees.map((employee) => (
                        <button
                          key={employee.personId}
                          onClick={() => handleSelect(employee.personId)}
                          className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-medium text-gray-900 group-hover:text-blue-900">
                                    {employee.person}
                                  </h3>
                                  {employee.isActionItem && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Action Item
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 space-x-2">
                                  {employee.lbs && <span>{employee.lbs}</span>}
                                  {employee.team && <span>• {employee.team}</span>}
                                  {employee.cc && <span>• {employee.cc}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
