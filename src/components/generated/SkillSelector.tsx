import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, X } from 'lucide-react';
import { skillService } from '../../lib/firebase-services';

interface SkillSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowInlineCreation?: boolean;
}

export function SkillSelector({ 
  value, 
  onChange, 
  placeholder = "Skill auswählen...", 
  className = "",
  allowInlineCreation = true 
}: SkillSelectorProps) {
  const [skills, setSkills] = useState<{ id: string; name: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [newSkillName, setNewSkillName] = useState('');
  const [adding, setAdding] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Skills beim Mount laden
  useEffect(() => {
    loadSkills();
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
        setNewSkillName('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Auto-focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const loadSkills = async () => {
    try {
      setLoading(true);
      setError(null);
      const allSkills = await skillService.getAll();
      setSkills(allSkills.map(s => ({ id: s.id, name: s.name })));
    } catch (e) {
      // console.error entfernt
      setError('Fehler beim Laden der Skills');
    } finally {
      setLoading(false);
    }
  };

  const filteredSkills = skills.filter(skill => 
    skill.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedSkill = skills.find(s => s.name === value);
  const displayValue = selectedSkill ? selectedSkill.name : value;

  const handleSelectSkill = (skillName: string) => {
    onChange(skillName);
    setIsOpen(false);
    setSearch('');
    setNewSkillName('');
  };

  const handleAddNewSkill = async () => {
    const name = newSkillName.trim();
    if (!name) return;

    // Prüfe ob bereits vorhanden
    const existingSkill = skills.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (existingSkill) {
      handleSelectSkill(existingSkill.name);
      return;
    }

    try {
      setAdding(true);
      setError(null);
      
      const newSkillId = await skillService.save({ name });
      const newSkill = { id: newSkillId, name };
      
      setSkills(prev => [...prev, newSkill]);
      handleSelectSkill(name);
      // console.log entfernt
    } catch (e) {
      // console.error entfernt
      setError('Fehler beim Erstellen des neuen Skills');
    } finally {
      setAdding(false);
    }
  };

  const clearSelection = () => {
    onChange('');
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-left flex items-center justify-between hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      >
        <span className={displayValue ? "text-gray-900" : "text-gray-500"}>
          {displayValue || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                clearSelection();
              }}
              className="p-1 hover:bg-gray-100 rounded cursor-pointer"
            >
              <X className="w-3 h-3 text-gray-400" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded shadow-lg"
          >
            {/* Search Input */}
            <div className="p-2 border-b border-gray-200">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Skill suchen..."
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Skills List */}
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="p-3 text-sm text-gray-500">Laden...</div>
              ) : filteredSkills.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">
                  {search ? `Keine Skills gefunden für "${search}"` : 'Keine Skills verfügbar'}
                </div>
              ) : (
                filteredSkills.map(skill => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => handleSelectSkill(skill.name)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-b-0"
                  >
                    {skill.name}
                  </button>
                ))
              )}
            </div>

            {/* Add New Skill Section */}
            {allowInlineCreation && search && !filteredSkills.some(s => s.name.toLowerCase() === search.toLowerCase()) && (
              <div className="p-2 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSkillName || search}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="Neuen Skill erstellen..."
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewSkill();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewSkill}
                    disabled={adding || !(newSkillName || search).trim()}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-indigo-700 border border-indigo-200 rounded bg-white hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3" />
                    {adding ? 'Erstellt...' : 'Hinzufügen'}
                  </button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-2 border-t border-red-200 bg-red-50 text-xs text-red-600">
                {error}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SkillSelector;
