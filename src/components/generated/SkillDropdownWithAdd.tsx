import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { skillService, employeeSkillService } from '../../lib/firebase-services';
import { motion, AnimatePresence } from 'framer-motion';

interface Skill {
  skillId: string;
  name: string;
  level: number;
}

interface SkillDropdownWithAddProps {
  value: string;
  onChange: (skillId: string) => void;
  availableSkills: Skill[];
  onSkillsUpdated?: () => void; // Callback wenn neue Skills hinzugefügt wurden
  placeholder?: string;
  className?: string;
  employeeId?: string; // Für automatische Zuordnung von neuen Skills
}

export function SkillDropdownWithAdd({
  value,
  onChange,
  availableSkills,
  onSkillsUpdated,
  placeholder = "— Skill auswählen —",
  className = "",
  employeeId
}: SkillDropdownWithAddProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState(3);
  const [isAdding, setIsAdding] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter skills by search term
  const filteredSkills = availableSkills.filter(skill =>
    skill.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAddForm(false);
        setSearchTerm('');
        setNewSkillName('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSkillSelect = (skillId: string) => {
    onChange(skillId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleAddNewSkill = async () => {
    if (!newSkillName.trim() || isAdding) return;
    
    setIsAdding(true);
    try {
      // 1. Create the skill in the skills collection
      const skillId = await skillService.save({ name: newSkillName.trim() });
      
      // 2. If employeeId provided, also add to employee's skills
      if (employeeId) {
        await employeeSkillService.save({
          employeeId,
          skillId,
          skillName: newSkillName.trim(),
          level: newSkillLevel
        });
      }
      
      // 3. Select the newly created skill
      onChange(skillId);
      
      // 4. Notify parent to refresh skills list
      if (onSkillsUpdated) {
        onSkillsUpdated();
      }
      
      // 5. Reset form and close
      setNewSkillName('');
      setNewSkillLevel(3);
      setShowAddForm(false);
      setIsOpen(false);
      setSearchTerm('');
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Skills:', error);
      alert('Fehler beim Hinzufügen des Skills. Bitte versuchen Sie es erneut.');
    } finally {
      setIsAdding(false);
    }
  };

  const selectedSkill = availableSkills.find(skill => skill.skillId === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
      >
        <span className={selectedSkill ? "text-gray-900" : "text-gray-500"}>
          {selectedSkill ? `${selectedSkill.name} (Level ${selectedSkill.level})` : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden"
          >
            {/* Search Input */}
            <div className="p-2 border-b border-gray-200">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Skill suchen..."
                className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Skills List */}
            <div className="max-h-32 overflow-y-auto">
              {filteredSkills.length === 0 && !showAddForm ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  {searchTerm ? 'Keine Skills gefunden' : 'Keine Skills verfügbar'}
                </div>
              ) : (
                filteredSkills.map((skill) => (
                  <button
                    key={skill.skillId}
                    onClick={() => handleSkillSelect(skill.skillId)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>{skill.name}</span>
                    <span className="text-xs text-gray-500">Level {skill.level}</span>
                  </button>
                ))
              )}
            </div>

            {/* Add New Skill Section */}
            <div className="border-t border-gray-200 bg-gray-50">
              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Neuen Skill hinzufügen
                </button>
              ) : (
                <div className="p-3 space-y-2">
                  <div>
                    <input
                      type="text"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      placeholder="Skill-Name"
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewSkill();
                        } else if (e.key === 'Escape') {
                          setShowAddForm(false);
                          setNewSkillName('');
                        }
                      }}
                    />
                  </div>
                  {employeeId && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">Level:</label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setNewSkillLevel(level)}
                            className={`w-6 h-6 text-xs rounded-full border transition-colors ${
                              newSkillLevel >= level
                                ? 'bg-yellow-400 border-yellow-500 text-yellow-900'
                                : 'bg-gray-100 border-gray-300 text-gray-500'
                            }`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddNewSkill}
                      disabled={!newSkillName.trim() || isAdding}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isAdding ? (
                        <>
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                          Hinzufügen...
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          Hinzufügen
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewSkillName('');
                        setNewSkillLevel(3);
                      }}
                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SkillDropdownWithAdd;
