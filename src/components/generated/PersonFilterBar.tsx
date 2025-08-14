import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronDown, Users, RotateCcw, Check } from 'lucide-react';
interface PersonFilterBarProps {
  allPersons: string[];
  selectedPersons: string[];
  onSelectionChange: (persons: string[]) => void;
}
export function PersonFilterBar({
  allPersons,
  selectedPersons,
  onSelectionChange
}: PersonFilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filteredPersons = allPersons.filter(person => person.toLowerCase().includes(searchTerm.toLowerCase()));
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  const togglePerson = (person: string) => {
    if (selectedPersons.includes(person)) {
      onSelectionChange(selectedPersons.filter(p => p !== person));
    } else {
      onSelectionChange([...selectedPersons, person]);
    }
  };
  const removePerson = (person: string) => {
    onSelectionChange(selectedPersons.filter(p => p !== person));
  };
  const clearAll = () => {
    onSelectionChange([]);
    setSearchTerm('');
  };
  const selectAll = () => {
    onSelectionChange(allPersons);
  };
  const toggleAll = () => {
    if (selectedPersons.length === allPersons.length) {
      clearAll();
    } else {
      selectAll();
    }
  };
  const getDisplayText = () => {
    if (selectedPersons.length === 0) {
      return 'Personen auswählen...';
    } else if (selectedPersons.length === allPersons.length) {
      return 'Alle Personen ausgewählt';
    } else if (selectedPersons.length === 1) {
      return selectedPersons[0];
    } else {
      return `${selectedPersons.length} von ${allPersons.length} ausgewählt`;
    }
  };
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Personen Filter
          </h3>
          <p className="text-sm text-gray-600">
            Wähle Personen aus, um die Daten zu filtern
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={selectAll} disabled={selectedPersons.length === allPersons.length} className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition-colors">
            Alle auswählen
          </button>
          <span className="text-gray-300">|</span>
          <button onClick={clearAll} disabled={selectedPersons.length === 0} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors">
            <RotateCcw className="w-3 h-3" />
            Zurücksetzen
          </button>
        </div>
      </div>

      {/* Multi-Select Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-gray-700 truncate">
              {getDisplayText()}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && <motion.div initial={{
          opacity: 0,
          y: -10,
          scale: 0.95
        }} animate={{
          opacity: 1,
          y: 0,
          scale: 1
        }} exit={{
          opacity: 0,
          y: -10,
          scale: 0.95
        }} transition={{
          duration: 0.15
        }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-80 overflow-hidden">
              {/* Search Input */}
              <div className="p-3 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input ref={inputRef} type="text" placeholder="Person suchen..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
                  {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>}
                </div>
              </div>

              {/* Select All Option */}
              <div className="border-b border-gray-100">
                <label className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" checked={selectedPersons.length === allPersons.length} ref={el => {
                  if (el) {
                    el.indeterminate = selectedPersons.length > 0 && selectedPersons.length < allPersons.length;
                  }
                }} onChange={toggleAll} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    Alle auswählen ({allPersons.length})
                  </span>
                </label>
              </div>

              {/* Person List */}
              <div className="max-h-48 overflow-y-auto">
                {filteredPersons.length === 0 ? <div className="p-4 text-sm text-gray-500 text-center">
                    {searchTerm ? <>
                        Keine Personen gefunden für "{searchTerm}"
                        <button onClick={() => setSearchTerm('')} className="block mx-auto mt-2 text-blue-600 hover:text-blue-700">
                          Suche zurücksetzen
                        </button>
                      </> : 'Keine Personen verfügbar'}
                  </div> : filteredPersons.map(person => {
              const isSelected = selectedPersons.includes(person);
              return <motion.label key={person} initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer group">
                        <div className="relative">
                          <input type="checkbox" checked={isSelected} onChange={() => togglePerson(person)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                          {isSelected && <motion.div initial={{
                    scale: 0
                  }} animate={{
                    scale: 1
                  }} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <Check className="w-3 h-3 text-white" />
                            </motion.div>}
                        </div>
                        <span className="text-sm text-gray-900 flex-1">
                          {person}
                        </span>
                        {isSelected && <motion.div initial={{
                  opacity: 0,
                  scale: 0.8
                }} animate={{
                  opacity: 1,
                  scale: 1
                }} className="w-2 h-2 bg-blue-500 rounded-full" />}
                      </motion.label>;
            })}
              </div>

              {/* Footer with selection count */}
              {filteredPersons.length > 0 && <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                      {selectedPersons.length} von {allPersons.length} ausgewählt
                    </span>
                    {searchTerm && <span>
                        {filteredPersons.length} gefunden
                      </span>}
                  </div>
                </div>}
            </motion.div>}
        </AnimatePresence>
      </div>

      {/* Selected Person Chips */}
      <AnimatePresence>
        {selectedPersons.length > 0 && <motion.div initial={{
        opacity: 0,
        height: 0
      }} animate={{
        opacity: 1,
        height: 'auto'
      }} exit={{
        opacity: 0,
        height: 0
      }} className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">
                Ausgewählte Personen:
              </span>
              <span className="text-xs text-gray-500">
                ({selectedPersons.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedPersons.map(person => <motion.div key={person} initial={{
            opacity: 0,
            scale: 0.8
          }} animate={{
            opacity: 1,
            scale: 1
          }} exit={{
            opacity: 0,
            scale: 0.8
          }} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm group hover:bg-blue-200 transition-colors">
                  <span className="max-w-32 truncate">{person}</span>
                  <button onClick={() => removePerson(person)} className="p-0.5 hover:bg-blue-300 rounded-full transition-colors group-hover:bg-blue-300" title={`${person} entfernen`}>
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>)}
            </div>
          </motion.div>}
      </AnimatePresence>
    </motion.div>;
}