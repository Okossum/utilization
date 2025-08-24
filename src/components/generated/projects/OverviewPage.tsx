import React, { useState } from 'react';
import { Header } from './Header';
import { FilterBar } from './FilterBar';
import { UtilizationColumn } from './UtilizationColumn';
import { EmployeeDataColumn } from './EmployeeDataColumn';
import ProjectHistoryCard from './ProjectHistoryCard';
import ProjectRolesCard from './ProjectRolesCard';
interface FilterState {
  teamName: string;
  careerLevel: string;
  status: string;
  searchTerm: string;
}
interface OverviewPageProps {
  onEmployeeClick?: (employeeId: string) => void;
}

// @component: OverviewPage
export const OverviewPage = ({
  onEmployeeClick
}: OverviewPageProps) => {
  const [filters, setFilters] = useState<FilterState>({
    teamName: '',
    careerLevel: '',
    status: '',
    searchTerm: ''
  });
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // @return
  return <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="px-6 py-4">
        <FilterBar filters={filters} onFilterChange={handleFilterChange} />
      </div>

      <main className="px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-[1800px] mx-auto">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                <span>Blick zurück</span>
              </h2>
              <UtilizationColumn />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                <span>Mitarbeiterdaten</span>
              </h2>
              <EmployeeDataColumn filters={filters} onEmployeeClick={onEmployeeClick} />
            </div>
          </div>

          <div className="lg:col-span-1">
            <ProjectHistoryCard employeeId="1" />
          </div>

          <div className="lg:col-span-1" style={{
          display: "none"
        }}>
            <ProjectRolesCard employeeId="1" />
          </div>
        </div>
      </main>
    </div>;
};