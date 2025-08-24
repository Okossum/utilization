import React, { useState, useMemo } from 'react';
import { ChevronDown, MessageSquare, User, Edit3 } from 'lucide-react';
interface FilterState {
  teamName: string;
  careerLevel: string;
  status: string;
  searchTerm: string;
}
interface EmployeeDataColumnProps {
  filters: FilterState;
  onEmployeeClick?: (employeeId: string) => void;
}
interface Employee {
  id: string;
  name: string;
  ccTeamName: string;
  careerLevel: string;
  status: string;
  comment: string;
}
const employeeData: Employee[] = [{
  id: '1',
  name: 'Anna Schmidt',
  ccTeamName: 'Development',
  careerLevel: 'Senior',
  status: 'active',
  comment: 'Arbeitet an Projekt Alpha'
}, {
  id: '2',
  name: 'Max Müller',
  ccTeamName: 'Design',
  careerLevel: 'Mid-Level',
  status: 'vacation',
  comment: 'Urlaub bis 15.03.'
}, {
  id: '3',
  name: 'Sarah Weber',
  ccTeamName: 'Marketing',
  careerLevel: 'Junior',
  status: 'active',
  comment: 'Neue Kampagne in Planung'
}, {
  id: '4',
  name: 'Tom Fischer',
  ccTeamName: 'Development',
  careerLevel: 'Lead',
  status: 'training',
  comment: 'Leadership Schulung'
}, {
  id: '5',
  name: 'Lisa Klein',
  ccTeamName: 'Sales',
  careerLevel: 'Senior',
  status: 'active',
  comment: 'Q1 Ziele erreicht'
}, {
  id: '6',
  name: 'Jan Bauer',
  ccTeamName: 'HR',
  careerLevel: 'Manager',
  status: 'inactive',
  comment: 'Krankschreibung'
}, {
  id: '7',
  name: 'Nina Wolf',
  ccTeamName: 'Design',
  careerLevel: 'Mid-Level',
  status: 'active',
  comment: 'UI Redesign Projekt'
}, {
  id: '8',
  name: 'Paul Richter',
  ccTeamName: 'Marketing',
  careerLevel: 'Senior',
  status: 'active',
  comment: 'Social Media Strategie'
}];
const statusOptions = [{
  value: 'active',
  label: 'Aktiv',
  color: 'bg-green-100 text-green-800'
}, {
  value: 'inactive',
  label: 'Inaktiv',
  color: 'bg-red-100 text-red-800'
}, {
  value: 'vacation',
  label: 'Urlaub',
  color: 'bg-blue-100 text-blue-800'
}, {
  value: 'training',
  label: 'Schulung',
  color: 'bg-yellow-100 text-yellow-800'
}] as any[];

// @component: EmployeeDataColumn
export const EmployeeDataColumn = ({
  filters,
  onEmployeeClick
}: EmployeeDataColumnProps) => {
  const [employees, setEmployees] = useState<Employee[]>(employeeData);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = !filters.searchTerm || employee.name.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const matchesTeam = !filters.teamName || employee.ccTeamName.toLowerCase() === filters.teamName.toLowerCase();
      const matchesLevel = !filters.careerLevel || employee.careerLevel.toLowerCase() === filters.careerLevel.toLowerCase();
      const matchesStatus = !filters.status || employee.status === filters.status;
      return matchesSearch && matchesTeam && matchesLevel && matchesStatus;
    });
  }, [employees, filters]);
  const updateEmployeeStatus = (id: string, newStatus: string) => {
    setEmployees(prev => prev.map(emp => emp.id === id ? {
      ...emp,
      status: newStatus
    } : emp));
  };
  const updateEmployeeComment = (id: string, newComment: string) => {
    setEmployees(prev => prev.map(emp => emp.id === id ? {
      ...emp,
      comment: newComment
    } : emp));
    setEditingComment(null);
  };
  const getStatusStyle = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption?.color || 'bg-gray-100 text-gray-800';
  };

  // @return
  return <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-600">
          <span>{filteredEmployees.length} von {employees.length} Mitarbeitern</span>
        </span>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {filteredEmployees.map(employee => <div key={employee.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => onEmployeeClick?.(employee.id)}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    <span>{employee.name}</span>
                  </h4>
                  <p className="text-sm text-gray-600">
                    <span>{employee.ccTeamName} • {employee.careerLevel}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <div className="relative">
                  <select value={employee.status} onChange={e => updateEmployeeStatus(employee.id, e.target.value)} className={`appearance-none px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${getStatusStyle(employee.status)}`}>
                    {statusOptions.map(option => <option key={option.value} value={option.value}>
                        {option.label}
                      </option>)}
                  </select>
                  <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Kommentar:</span>
                  <button onClick={() => setEditingComment(editingComment === employee.id ? null : employee.id)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
                
                {editingComment === employee.id ? <div className="space-y-2">
                    <textarea defaultValue={employee.comment} className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" rows={2} onBlur={e => updateEmployeeComment(employee.id, e.target.value)} onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  updateEmployeeComment(employee.id, e.currentTarget.value);
                }
              }} autoFocus />
                  </div> : <div className="flex items-start space-x-2">
                    <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600 leading-relaxed">
                      <span>{employee.comment || 'Kein Kommentar'}</span>
                    </p>
                  </div>}
              </div>
            </div>
          </div>)}
      </div>

      {filteredEmployees.length === 0 && <div className="text-center py-8">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            <span>Keine Mitarbeiter gefunden</span>
          </p>
          <p className="text-sm text-gray-400 mt-1">
            <span>Versuchen Sie andere Filterkriterien</span>
          </p>
        </div>}
    </div>;
};