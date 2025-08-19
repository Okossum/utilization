import React, { useEffect, useMemo, useState } from 'react';
import { useAssignments } from '../../contexts/AssignmentsContext';
import { Trash2, Pencil, Link2, Building, User, Target, Calendar } from 'lucide-react';

interface AssignmentsListProps {
  employeeName: string;
  className?: string;
  onEdit?: (assignmentId: string) => void;
}

export function AssignmentsList({ employeeName, className = '', onEdit }: AssignmentsListProps) {
  const { getAssignmentsForEmployee, assignmentsByEmployee, unlinkAssignment, loadingEmployees } = useAssignments();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        await getAssignmentsForEmployee(employeeName);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [employeeName, getAssignmentsForEmployee]);

  const list = assignmentsByEmployee[employeeName] || [];
  const busy = isLoading || !!loadingEmployees[employeeName];

  if (!employeeName) return null;

  // ProjectCard Component
  const ProjectCard = ({ assignment }: { assignment: any }) => {
    // Berechne Wahrscheinlichkeit basierend auf Status
    const getProbabilityFromStatus = (status?: string) => {
      switch (status) {
        case 'prospect': return 25;
        case 'planned': return 75;
        case 'active': return 100;
        case 'onHold': return 50;
        case 'closed': return 0;
        default: return 50;
      }
    };

    const probability = getProbabilityFromStatus(assignment.status);

    return (
      <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4 hover:from-purple-100 hover:to-violet-100 transition-colors">
        {/* Header mit Aktionen */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-purple-900 truncate">
              {assignment.projectName || assignment.projectId}
            </h4>
            {assignment.customer && (
              <div className="flex items-center gap-1 mt-1">
                <Building className="w-3 h-3 text-purple-500" />
                <span className="text-sm text-purple-700">{assignment.customer}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 ml-3 shrink-0">
            {onEdit && (
              <button 
                onClick={() => onEdit(assignment.id)} 
                className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors" 
                title="Bearbeiten"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => unlinkAssignment(assignment.id)}
              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
              title="Entfernen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Projekt-Details */}
        <div className="space-y-2">
          {assignment.role && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-700">
                <span className="font-medium">Rolle:</span> {assignment.role}
              </span>
            </div>
          )}

          {typeof assignment.plannedAllocationPct === 'number' && (
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-700">
                <span className="font-medium">Auslastung:</span> {assignment.plannedAllocationPct}%
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            </div>
            <span className="text-sm text-purple-700">
              <span className="font-medium">Wahrscheinlichkeit:</span> {probability}%
            </span>
          </div>

          {(assignment.startDate || assignment.endDate) && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-700">
                <span className="font-medium">Zeitraum:</span> {assignment.startDate || '—'} → {assignment.endDate || '—'}
              </span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        {assignment.status && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              assignment.status === 'active' ? 'bg-green-100 text-green-800' :
              assignment.status === 'planned' ? 'bg-blue-100 text-blue-800' :
              assignment.status === 'prospect' ? 'bg-yellow-100 text-yellow-800' :
              assignment.status === 'onHold' ? 'bg-gray-100 text-gray-800' :
              assignment.status === 'closed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {assignment.status}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-indigo-600" />
          Projektzuordnungen
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {busy ? 'Lade Zuordnungen…' : `${list.length} aktuelle Projektzuordnung(en)`}
        </p>
      </div>

      {/* Projekt-Karten */}
      {list.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Link2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Noch keine Projektzuordnungen vorhanden.</p>
          <p className="text-sm">Verwenden Sie den Button unten, um Projekte zuzuordnen.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map(assignment => (
            <ProjectCard key={assignment.id} assignment={assignment} />
          ))}
        </div>
      )}
    </section>
  );
}

export default AssignmentsList;


