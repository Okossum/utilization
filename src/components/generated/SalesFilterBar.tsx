import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, Filter } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  area: string;
  competenceCenter: string;
  team: string;
  careerLevel: string;
  status?: string; // Für zukünftige Stati
  skills: any[];
  completedProjects: any[];
  plannedProjects: any[];
}

interface SalesFilterBarProps {
  employees: Employee[];
  onFilterChange: (filteredEmployees: Employee[]) => void;
}

interface FilterState {
  bereich: string[];
  kompetenzzentrum: string[];
  team: string[];
  laufbahnStufe: string[];
  status: string[];
}

// @component: SalesFilterBar
export const SalesFilterBar = ({ employees, onFilterChange }: SalesFilterBarProps) => {
  const [filters, setFilters] = useState<FilterState>({
    bereich: [],
    kompetenzzentrum: [],
    team: [],
    laufbahnStufe: [],
    status: []
  });

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Eindeutige Werte aus Mitarbeiterdaten extrahieren
  const getUniqueValues = (key: keyof Employee) => {
    const values = employees.map(emp => {
      switch(key) {
        case 'area': return emp.area;
        case 'competenceCenter': return emp.competenceCenter;
        case 'team': return emp.team;
        case 'careerLevel': return emp.careerLevel;
        case 'status': return emp.status || 'Aktiv'; // Default Status
        default: return '';
      }
    }).filter(Boolean);
    
    return [...new Set(values)].sort();
  };

  // Filter-Optionen generieren
  const filterOptions = {
    bereich: getUniqueValues('area'),
    kompetenzzentrum: getUniqueValues('competenceCenter'),
    team: getUniqueValues('team'),
    laufbahnStufe: getUniqueValues('careerLevel'),
    status: getUniqueValues('status')
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideDropdown = Object.values(dropdownRefs.current).some(ref => 
        ref && ref.contains(target)
      );
      
      if (!isInsideDropdown) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter anwenden
  useEffect(() => {
    const filteredEmployees = employees.filter(employee => {
      const matchesBereich = filters.bereich.length === 0 || filters.bereich.includes(employee.area);
      const matchesKompetenzzentrum = filters.kompetenzzentrum.length === 0 || filters.kompetenzzentrum.includes(employee.competenceCenter);
      const matchesTeam = filters.team.length === 0 || filters.team.includes(employee.team);
      const matchesLaufbahnStufe = filters.laufbahnStufe.length === 0 || filters.laufbahnStufe.includes(employee.careerLevel);
      const matchesStatus = filters.status.length === 0 || filters.status.includes(employee.status || 'Aktiv');

      return matchesBereich && matchesKompetenzzentrum && matchesTeam && matchesLaufbahnStufe && matchesStatus;
    });

    onFilterChange(filteredEmployees);
  }, [filters, employees, onFilterChange]);

  // Filter-Wert togglen
  const toggleFilterValue = (filterKey: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: prev[filterKey].includes(value)
        ? prev[filterKey].filter(v => v !== value)
        : [...prev[filterKey], value]
    }));
  };

  // Alle Filter zurücksetzen
  const clearAllFilters = () => {
    setFilters({
      bereich: [],
      kompetenzzentrum: [],
      team: [],
      laufbahnStufe: [],
      status: []
    });
  };

  // Aktive Filter zählen
  const activeFiltersCount = Object.values(filters).reduce((sum, filterArray) => sum + filterArray.length, 0);

  // Filter-Dropdown rendern
  const renderFilterDropdown = (
    key: keyof FilterState, 
    label: string, 
    options: string[]
  ) => {
    const isOpen = openDropdown === key;
    const selectedCount = filters[key].length;

    return (
      <div 
        key={key}
        className="relative"
        ref={el => dropdownRefs.current[key] = el}
      >
        <button
          onClick={() => setOpenDropdown(isOpen ? null : key)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg transition-all duration-200 ${
            selectedCount > 0
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span>{label}</span>
          {selectedCount > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">
              {selectedCount}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900">{label}</span>
                  {selectedCount > 0 && (
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, [key]: [] }))}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Alle entfernen
                    </button>
                  )}
                </div>
                
                <div className="space-y-2">
                  {options.map(option => (
                    <label
                      key={option}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters[key].includes(option)}
                        onChange={() => toggleFilterValue(key, option)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 flex-1">{option}</span>
                      <span className="text-xs text-gray-500">
                        ({employees.filter(emp => {
                          switch(key) {
                            case 'bereich': return emp.area === option;
                            case 'kompetenzzentrum': return emp.competenceCenter === option;
                            case 'team': return emp.team === option;
                            case 'laufbahnStufe': return emp.careerLevel === option;
                            case 'status': return (emp.status || 'Aktiv') === option;
                            default: return false;
                          }
                        }).length})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="bg-white border-b border-gray-200 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Filter-Titel und Info */}
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Filter</h3>
              <p className="text-xs text-gray-600">
                {employees.length} Mitarbeiter
                {activeFiltersCount > 0 && ` • ${activeFiltersCount} Filter aktiv`}
              </p>
            </div>
          </div>

          {/* Filter-Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {renderFilterDropdown('bereich', 'Bereich', filterOptions.bereich)}
            {renderFilterDropdown('kompetenzzentrum', 'Kompetenzzentrum', filterOptions.kompetenzzentrum)}
            {renderFilterDropdown('team', 'Team', filterOptions.team)}
            {renderFilterDropdown('laufbahnStufe', 'Laufbahn Stufe', filterOptions.laufbahnStufe)}
            {renderFilterDropdown('status', 'Status', filterOptions.status)}

            {/* Alle Filter zurücksetzen */}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Alle zurücksetzen
              </button>
            )}
          </div>
        </div>

        {/* Aktive Filter-Tags */}
        {activeFiltersCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-gray-100"
          >
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters).map(([filterKey, values]) =>
                values.map(value => (
                  <span
                    key={`${filterKey}-${value}`}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    <span className="text-xs opacity-75">
                      {filterKey === 'bereich' ? 'Bereich' :
                       filterKey === 'kompetenzzentrum' ? 'CC' :
                       filterKey === 'team' ? 'Team' :
                       filterKey === 'laufbahnStufe' ? 'Level' : 'Status'}:
                    </span>
                    <span>{value}</span>
                    <button
                      onClick={() => toggleFilterValue(filterKey as keyof FilterState, value)}
                      className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
