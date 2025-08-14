import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, X, Check } from 'lucide-react';

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function MultiSelectFilter({ label, options, selected, onChange, placeholder }: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!search) return options;
    return options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  };
  const selectAll = () => onChange(options);
  const clearAll = () => onChange([]);

  const displayText = selected.length === 0
    ? (placeholder || `Alle ${label}`)
    : selected.length === options.length
      ? `Alle (${options.length})`
      : `${selected.length} ausgewählt`;

  return (
    <div className="w-full" ref={dropdownRef}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
        <span className="text-sm text-gray-700 truncate">{displayText}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.15 }} className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-80 overflow-hidden">
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder={`${label} suchen...`} className="w-full pl-8 pr-6 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <button onClick={selectAll} className="text-blue-600 hover:text-blue-700">Alle</button>
                <span className="text-gray-300">|</span>
                <button onClick={clearAll} className="text-gray-600 hover:text-gray-700">Zurücksetzen</button>
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 text-center">Keine Optionen</div>
              ) : (
                filtered.map(opt => {
                  const checked = selected.includes(opt);
                  return (
                    <label key={opt} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" checked={checked} onChange={() => toggle(opt)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        {checked && (
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Check className="w-3 h-3 text-blue-600" />
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-900">{opt}</span>
                    </label>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



