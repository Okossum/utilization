import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, User, Search, Filter } from 'lucide-react';
import { Employee, EmployeeDropdownProps, EmployeeFilter } from '../../types/projects';
import DatabaseService from '../../services/database';

export function EmployeeDropdown({
  value,
  onChange,
  filterBy = [],
  label = 'Mitarbeiter auswählen',
  placeholder = 'Mitarbeiter auswählen...',
  employees: propEmployees
}: EmployeeDropdownProps) {
  const [employees, setEmployees] = useState<Employee[]>(propEmployees || []);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<EmployeeFilter>({
    bereich: '',
    cc: '',
    team: '',
    lob: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Lade Mitarbeiter-Daten wenn nicht über Props bereitgestellt
  useEffect(() => {
    if (!propEmployees) {
      loadEmployees();
    }
  }, [propEmployees]);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const employeeData = await DatabaseService.getEmployeeStammdaten();
      if (Array.isArray(employeeData)) {
        const normalizedEmployees: Employee[] = employeeData.map(emp => ({
          id: emp.id || emp.personId,
          name: emp.name,
          displayName: emp.displayName || emp.name,
          email: emp.email || '',
          bereich: emp.bereich || '',
          cc: emp.cc || '',
          team: emp.team || '',
          lob: emp.lob || ''
        }));
        setEmployees(normalizedEmployees);
      }
    } catch (error) {
      console.error('❌ Error loading employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Gefilterte Mitarbeiter basierend auf Suchbegriff und Filtern
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Suchbegriff-Filter
      const matchesSearch = !searchTerm || 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Bereichs-Filter
      if (filters.bereich && emp.bereich !== filters.bereich) return false;
      if (filters.cc && emp.cc !== filters.cc) return false;
      if (filters.team && emp.team !== filters.team) return false;
      if (filters.lob && emp.lob !== filters.lob) return false;

      return true;
    });
  }, [employees, searchTerm, filters]);

  // Eindeutige Werte für Filter-Dropdowns
  const uniqueValues = useMemo(() => {
    return {
      bereiche: [...new Set(employees.map(emp => emp.bereich).filter(Boolean))].sort(),
      ccs: [...new Set(employees.map(emp => emp.cc).filter(Boolean))].sort(),
      teams: [...new Set(employees.map(emp => emp.team).filter(Boolean))].sort(),
      lobs: [...new Set(employees.map(emp => emp.lob).filter(Boolean))].sort()
    };
  }, [employees]);

  // Aktuell ausgewählter Mitarbeiter
  const selectedEmployee = employees.find(emp => emp.id === value);

  const handleEmployeeSelect = (employee: Employee) => {
    onChange(employee.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const clearFilters = () => {
    setFilters({
      bereich: '',
      cc: '',
      team: '',
      lob: ''
    });
  };

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {/* Filter-Zeile */}
      {filterBy.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
          {filterBy.includes('bereich') && (
            <select
              value={filters.bereich}
              onChange={e => setFilters(prev => ({ ...prev, bereich: e.target.value }))}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="">Alle Bereiche</option>
              {uniqueValues.bereiche.map(bereich => (
                <option key={bereich} value={bereich}>{bereich}</option>
              ))}
            </select>
          )}

          {filterBy.includes('cc') && (
            <select
              value={filters.cc}
              onChange={e => setFilters(prev => ({ ...prev, cc: e.target.value }))}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="">Alle CCs</option>
              {uniqueValues.ccs.map(cc => (
                <option key={cc} value={cc}>{cc}</option>
              ))}
            </select>
          )}

          {filterBy.includes('team') && (
            <select
              value={filters.team}
              onChange={e => setFilters(prev => ({ ...prev, team: e.target.value }))}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="">Alle Teams</option>
              {uniqueValues.teams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          )}

          {filterBy.includes('lob') && (
            <select
              value={filters.lob}
              onChange={e => setFilters(prev => ({ ...prev, lob: e.target.value }))}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="">Alle LoB</option>
              {uniqueValues.lobs.map(lob => (
                <option key={lob} value={lob}>{lob}</option>
              ))}
            </select>
          )}

          {(filters.bereich || filters.cc || filters.team || filters.lob) && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Haupt-Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        >
          <div className="flex items-center">
            <User className="w-4 h-4 mr-2 text-gray-400" />
            <span className={selectedEmployee ? 'text-gray-900' : 'text-gray-500'}>
              {isLoading ? 'Lade Mitarbeiter...' : 
               selectedEmployee ? selectedEmployee.displayName : placeholder}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown-Menü */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            {/* Suchfeld */}
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Mitarbeiter suchen..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Mitarbeiter-Liste */}
            <div className="max-h-48 overflow-y-auto">
              {filteredEmployees.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 text-center">
                  {isLoading ? 'Lade Mitarbeiter...' : 'Keine Mitarbeiter gefunden'}
                </div>
              ) : (
                filteredEmployees.map(employee => (
                  <button
                    key={employee.id}
                    onClick={() => handleEmployeeSelect(employee)}
                    className={`w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                      value === employee.id ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{employee.displayName}</div>
                        <div className="text-xs text-gray-500">
                          {[employee.bereich, employee.cc, employee.team].filter(Boolean).join(' • ')}
                        </div>
                      </div>
                      {value === employee.id && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ausgewählter Mitarbeiter Info */}
      {selectedEmployee && (
        <div className="text-xs text-gray-500 flex items-center">
          <User className="w-3 h-3 mr-1" />
          {selectedEmployee.email} • {selectedEmployee.bereich}
        </div>
      )}
    </div>
  );
}
