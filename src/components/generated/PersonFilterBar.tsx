import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronDown, Users, RotateCcw, Check } from 'lucide-react';
interface PersonFilterBarProps {
  allPersons: string[];
  selectedPersons: string[];
  onSelectionChange: (persons: string[]) => void;
  mpid?: string;
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
  }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" data-magicpath-id="0" data-magicpath-path="PersonFilterBar.tsx">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4" data-magicpath-id="1" data-magicpath-path="PersonFilterBar.tsx">
        <div data-magicpath-id="2" data-magicpath-path="PersonFilterBar.tsx">
          <h3 className="text-lg font-semibold text-gray-900" data-magicpath-id="3" data-magicpath-path="PersonFilterBar.tsx">
            Personen Filter
          </h3>
          <p className="text-sm text-gray-600" data-magicpath-id="4" data-magicpath-path="PersonFilterBar.tsx">
            Wähle Personen aus, um die Daten zu filtern
          </p>
        </div>
        
        <div className="flex items-center gap-2" data-magicpath-id="5" data-magicpath-path="PersonFilterBar.tsx">
          <button onClick={selectAll} disabled={selectedPersons.length === allPersons.length} className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition-colors" data-magicpath-id="6" data-magicpath-path="PersonFilterBar.tsx">
            Alle auswählen
          </button>
          <span className="text-gray-300" data-magicpath-id="7" data-magicpath-path="PersonFilterBar.tsx">|</span>
          <button onClick={clearAll} disabled={selectedPersons.length === 0} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors" data-magicpath-id="8" data-magicpath-path="PersonFilterBar.tsx">
            <RotateCcw className="w-3 h-3" data-magicpath-id="9" data-magicpath-path="PersonFilterBar.tsx" />
            Zurücksetzen
          </button>
        </div>
      </div>

      {/* Multi-Select Dropdown */}
      <div className="relative" ref={dropdownRef} data-magicpath-id="10" data-magicpath-path="PersonFilterBar.tsx">
        <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500" data-magicpath-id="11" data-magicpath-path="PersonFilterBar.tsx">
          <div className="flex items-center gap-2 flex-1 min-w-0" data-magicpath-id="12" data-magicpath-path="PersonFilterBar.tsx">
            <Users className="w-4 h-4 text-gray-500 flex-shrink-0" data-magicpath-id="13" data-magicpath-path="PersonFilterBar.tsx" />
            <span className="text-gray-700 truncate" data-magicpath-id="14" data-magicpath-path="PersonFilterBar.tsx">
              {getDisplayText()}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} data-magicpath-id="15" data-magicpath-path="PersonFilterBar.tsx" />
        </button>

        <AnimatePresence data-magicpath-id="16" data-magicpath-path="PersonFilterBar.tsx">
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
        }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-80 overflow-hidden" data-magicpath-id="17" data-magicpath-path="PersonFilterBar.tsx">
              {/* Search Input */}
              <div className="p-3 border-b border-gray-200" data-magicpath-id="18" data-magicpath-path="PersonFilterBar.tsx">
                <div className="relative" data-magicpath-id="19" data-magicpath-path="PersonFilterBar.tsx">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" data-magicpath-id="20" data-magicpath-path="PersonFilterBar.tsx" />
                  <input ref={inputRef} type="text" placeholder="Person suchen..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" data-magicpath-id="21" data-magicpath-path="PersonFilterBar.tsx" />
                  {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600" data-magicpath-id="22" data-magicpath-path="PersonFilterBar.tsx">
                      <X className="w-4 h-4" data-magicpath-id="23" data-magicpath-path="PersonFilterBar.tsx" />
                    </button>}
                </div>
              </div>

              {/* Select All Option */}
              <div className="border-b border-gray-100" data-magicpath-id="24" data-magicpath-path="PersonFilterBar.tsx">
                <label className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer" data-magicpath-id="25" data-magicpath-path="PersonFilterBar.tsx">
                  <div className="relative" data-magicpath-id="26" data-magicpath-path="PersonFilterBar.tsx">
                    <input type="checkbox" checked={selectedPersons.length === allPersons.length} ref={el => {
                  if (el) {
                    el.indeterminate = selectedPersons.length > 0 && selectedPersons.length < allPersons.length;
                  }
                }} onChange={toggleAll} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" data-magicpath-id="27" data-magicpath-path="PersonFilterBar.tsx" />
                  </div>
                  <span className="text-sm font-medium text-gray-900" data-magicpath-id="28" data-magicpath-path="PersonFilterBar.tsx">
                    Alle auswählen ({allPersons.length})
                  </span>
                </label>
              </div>

              {/* Person List */}
              <div className="max-h-48 overflow-y-auto" data-magicpath-id="29" data-magicpath-path="PersonFilterBar.tsx">
                {filteredPersons.length === 0 ? <div className="p-4 text-sm text-gray-500 text-center" data-magicpath-id="30" data-magicpath-path="PersonFilterBar.tsx">
                    {searchTerm ? <>
                        Keine Personen gefunden für "{searchTerm}"
                        <button onClick={() => setSearchTerm('')} className="block mx-auto mt-2 text-blue-600 hover:text-blue-700" data-magicpath-id="31" data-magicpath-path="PersonFilterBar.tsx">
                          Suche zurücksetzen
                        </button>
                      </> : 'Keine Personen verfügbar'}
                  </div> : filteredPersons.map(person => {
              const isSelected = selectedPersons.includes(person);
              return <motion.label key={person} initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer group" data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="32" data-magicpath-path="PersonFilterBar.tsx">
                        <div className="relative" data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="33" data-magicpath-path="PersonFilterBar.tsx">
                          <input type="checkbox" checked={isSelected} onChange={() => togglePerson(person)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="34" data-magicpath-path="PersonFilterBar.tsx" />
                          {isSelected && <motion.div initial={{
                    scale: 0
                  }} animate={{
                    scale: 1
                  }} className="absolute inset-0 flex items-center justify-center pointer-events-none" data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="35" data-magicpath-path="PersonFilterBar.tsx">
                              <Check className="w-3 h-3 text-white" data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="36" data-magicpath-path="PersonFilterBar.tsx" />
                            </motion.div>}
                        </div>
                        <span className="text-sm text-gray-900 flex-1" data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="37" data-magicpath-path="PersonFilterBar.tsx">
                          {person}
                        </span>
                        {isSelected && <motion.div initial={{
                  opacity: 0,
                  scale: 0.8
                }} animate={{
                  opacity: 1,
                  scale: 1
                }} className="w-2 h-2 bg-blue-500 rounded-full" data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="38" data-magicpath-path="PersonFilterBar.tsx" />}
                      </motion.label>;
            })}
              </div>

              {/* Footer with selection count */}
              {filteredPersons.length > 0 && <div className="p-3 border-t border-gray-200 bg-gray-50" data-magicpath-id="39" data-magicpath-path="PersonFilterBar.tsx">
                  <div className="flex items-center justify-between text-xs text-gray-600" data-magicpath-id="40" data-magicpath-path="PersonFilterBar.tsx">
                    <span data-magicpath-id="41" data-magicpath-path="PersonFilterBar.tsx">
                      {selectedPersons.length} von {allPersons.length} ausgewählt
                    </span>
                    {searchTerm && <span data-magicpath-id="42" data-magicpath-path="PersonFilterBar.tsx">
                        {filteredPersons.length} gefunden
                      </span>}
                  </div>
                </div>}
            </motion.div>}
        </AnimatePresence>
      </div>

      {/* Selected Person Chips */}
      <AnimatePresence data-magicpath-id="43" data-magicpath-path="PersonFilterBar.tsx">
        {selectedPersons.length > 0 && <motion.div initial={{
        opacity: 0,
        height: 0
      }} animate={{
        opacity: 1,
        height: 'auto'
      }} exit={{
        opacity: 0,
        height: 0
      }} className="mt-4" data-magicpath-id="44" data-magicpath-path="PersonFilterBar.tsx">
            <div className="flex items-center gap-2 mb-2" data-magicpath-id="45" data-magicpath-path="PersonFilterBar.tsx">
              <span className="text-sm font-medium text-gray-700" data-magicpath-id="46" data-magicpath-path="PersonFilterBar.tsx">
                Ausgewählte Personen:
              </span>
              <span className="text-xs text-gray-500" data-magicpath-id="47" data-magicpath-path="PersonFilterBar.tsx">
                ({selectedPersons.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2" data-magicpath-id="48" data-magicpath-path="PersonFilterBar.tsx">
              {selectedPersons.map(person => <motion.div key={person} initial={{
            opacity: 0,
            scale: 0.8
          }} animate={{
            opacity: 1,
            scale: 1
          }} exit={{
            opacity: 0,
            scale: 0.8
          }} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm group hover:bg-blue-200 transition-colors" data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="49" data-magicpath-path="PersonFilterBar.tsx">
                  <span className="max-w-32 truncate" data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="50" data-magicpath-path="PersonFilterBar.tsx">{person}</span>
                  <button onClick={() => removePerson(person)} className="p-0.5 hover:bg-blue-300 rounded-full transition-colors group-hover:bg-blue-300" title={`${person} entfernen`} data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="51" data-magicpath-path="PersonFilterBar.tsx">
                    <X className="w-3 h-3" data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="52" data-magicpath-path="PersonFilterBar.tsx" />
                  </button>
                </motion.div>)}
            </div>
          </motion.div>}
      </AnimatePresence>
    </motion.div>;
}