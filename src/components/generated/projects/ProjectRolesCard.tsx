"use client";

import React, { useState } from 'react';
import { Users, Star, ChevronDown, ChevronRight, Edit, Trash2, Plus } from 'lucide-react';
interface ProjectRole {
  id: string;
  roleName: string;
  rating: number;
  projectsCount: number;
  description: string;
}
interface ProjectRolesCardProps {
  employeeId?: string;
  className?: string;
}
const mockProjectRoles: Record<string, ProjectRole[]> = {
  '1': [{
    id: 'role-1',
    roleName: 'Lead Frontend Developer',
    rating: 5,
    projectsCount: 8,
    description: 'Führung von Frontend-Teams und Architekturentscheidungen'
  }, {
    id: 'role-2',
    roleName: 'Technical Lead',
    rating: 4,
    projectsCount: 5,
    description: 'Technische Projektleitung und Koordination'
  }, {
    id: 'role-3',
    roleName: 'Senior Frontend Developer',
    rating: 5,
    projectsCount: 12,
    description: 'Entwicklung komplexer Frontend-Anwendungen'
  }, {
    id: 'role-4',
    roleName: 'Mentor',
    rating: 4,
    projectsCount: 3,
    description: 'Betreuung und Schulung von Junior-Entwicklern'
  }, {
    id: 'role-5',
    roleName: 'Code Reviewer',
    rating: 5,
    projectsCount: 15,
    description: 'Qualitätssicherung durch systematische Code-Reviews'
  }],
  '2': [{
    id: 'role-6',
    roleName: 'Lead UX Designer',
    rating: 5,
    projectsCount: 6,
    description: 'Leitung von UX-Design-Prozessen und User Research'
  }, {
    id: 'role-7',
    roleName: 'Senior UX Designer',
    rating: 4,
    projectsCount: 9,
    description: 'Gestaltung von Benutzererfahrungen und Interfaces'
  }, {
    id: 'role-8',
    roleName: 'Design System Lead',
    rating: 4,
    projectsCount: 4,
    description: 'Entwicklung und Pflege von Design Systems'
  }, {
    id: 'role-9',
    roleName: 'User Researcher',
    rating: 3,
    projectsCount: 7,
    description: 'Durchführung von Nutzerstudien und Usability-Tests'
  }]
};
const renderStars = (rating: number) => {
  return Array.from({
    length: 5
  }, (_, i) => <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />);
};
export default function ProjectRolesCard({
  employeeId = '1',
  className = ''
}: ProjectRolesCardProps) {
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  const roles = mockProjectRoles[employeeId] || [];
  const toggleRole = (roleId: string) => {
    setExpandedRoles(prev => ({
      ...prev,
      [roleId]: !prev[roleId]
    }));
  };
  const totalProjects = roles.reduce((sum, role) => sum + role.projectsCount, 0);
  const averageRating = roles.length > 0 ? (roles.reduce((sum, role) => sum + role.rating, 0) / roles.length).toFixed(1) : '0';
  return <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`} style={{
    paddingTop: "8px",
    paddingLeft: "14px",
    paddingRight: "14px",
    paddingBottom: "14px",
    height: "auto",
    minHeight: "min-content"
  }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center" style={{
          display: "none"
        }}>
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              <span>Rollen in Projekten</span>
            </h2>
            <p className="text-sm text-gray-600">
              <span style={{
              display: "none"
            }}>Übersicht der Projektrollen und Bewertungen</span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Rolle hinzufügen">
            <Plus className="w-4 h-4" />
          </button>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">
              <span style={{
              display: "none"
            }}>{roles.length}</span>
            </div>
            <div className="text-xs text-gray-500">
              <span style={{
              display: "none"
            }}>Rollen gesamt</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg" style={{
      display: "none"
    }}>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            <span>{totalProjects}</span>
          </div>
          <div className="text-xs text-gray-600">
            <span>Projekte gesamt</span>
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="text-lg font-semibold text-gray-900">{averageRating}</span>
          </div>
          <div className="text-xs text-gray-600">
            <span>Durchschnitt</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {roles.length === 0 ? <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              <span>Keine Projektrollen verfügbar</span>
            </p>
          </div> : roles.map(role => <div key={role.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow group" style={{
        paddingTop: "1px"
      }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      <span>{role.roleName}</span>
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        {renderStars(role.rating)}
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Bearbeiten">
                          <Edit className="w-3 h-3" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Löschen">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <button onClick={() => toggleRole(role.id)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                        {expandedRoles[role.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-gray-600">
                      <span>{role.projectsCount} Projekt{role.projectsCount !== 1 ? 'e' : ''}</span>
                    </span>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-gray-500">
                        <span>{role.rating}/5</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {expandedRoles[role.id] && <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    <span>{role.description}</span>
                  </p>
                </div>}
            </div>)}
      </div>
    </div>;
}