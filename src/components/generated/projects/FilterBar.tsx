import React from 'react';
import { Search, Filter, X } from 'lucide-react';
interface FilterState {
  teamName: string;
  careerLevel: string;
  status: string;
  searchTerm: string;
}
interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
}
const teamOptions = [{
  value: '',
  label: 'Alle Teams'
}, {
  value: 'development',
  label: 'Development'
}, {
  value: 'design',
  label: 'Design'
}, {
  value: 'marketing',
  label: 'Marketing'
}, {
  value: 'sales',
  label: 'Sales'
}, {
  value: 'hr',
  label: 'HR'
}] as any[];
const careerLevelOptions = [{
  value: '',
  label: 'Alle Stufen'
}, {
  value: 'junior',
  label: 'Junior'
}, {
  value: 'mid',
  label: 'Mid-Level'
}, {
  value: 'senior',
  label: 'Senior'
}, {
  value: 'lead',
  label: 'Team Lead'
}, {
  value: 'manager',
  label: 'Manager'
}] as any[];
const statusOptions = [{
  value: '',
  label: 'Alle Status'
}, {
  value: 'active',
  label: 'Aktiv'
}, {
  value: 'inactive',
  label: 'Inaktiv'
}, {
  value: 'vacation',
  label: 'Urlaub'
}, {
  value: 'training',
  label: 'Schulung'
}] as any[];

// @component: FilterBar
export const FilterBar = ({
  filters,
  onFilterChange
}: FilterBarProps) => {
  const hasActiveFilters = Object.values(filters).some(value => value !== '');
  const clearAllFilters = () => {
    onFilterChange('teamName', '');
    onFilterChange('careerLevel', '');
    onFilterChange('status', '');
    onFilterChange('searchTerm', '');
  };

  // @return
  return <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center space-x-2 text-gray-700">
          <Filter className="w-5 h-5" />
          <span className="font-medium">Filter</span>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Mitarbeiter suchen..." value={filters.searchTerm} onChange={e => onFilterChange('searchTerm', e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
          </div>

          <select value={filters.teamName} onChange={e => onFilterChange('teamName', e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white">
            {teamOptions.map(option => <option key={option.value} value={option.value}>
                {option.label}
              </option>)}
          </select>

          <select value={filters.careerLevel} onChange={e => onFilterChange('careerLevel', e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white">
            {careerLevelOptions.map(option => <option key={option.value} value={option.value}>
                {option.label}
              </option>)}
          </select>

          <select value={filters.status} onChange={e => onFilterChange('status', e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white">
            {statusOptions.map(option => <option key={option.value} value={option.value}>
                {option.label}
              </option>)}
          </select>
        </div>

        {hasActiveFilters && <button onClick={clearAllFilters} className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
            <span>Zurücksetzen</span>
          </button>}
      </div>
    </div>;
};