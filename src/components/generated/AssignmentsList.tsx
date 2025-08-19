import React, { useEffect, useMemo, useState } from 'react';
import { useAssignments } from '../../contexts/AssignmentsContext';
import { Trash2, Pencil, Link2 } from 'lucide-react';

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

  return (
    <section className={`space-y-3 ${className}`}>
      <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
        <Link2 className="w-5 h-5 text-indigo-600" />
        Projektzuordnungen
      </h2>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-xs text-gray-600 flex items-center justify-between">
          <span>{busy ? 'Lade Zuordnungen…' : `${list.length} Zuordnung(en)`}</span>
        </div>
        {list.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Keine Zuordnungen vorhanden.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.map(a => (
              <li key={a.id} className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {a.projectName || a.projectId}
                    {a.customer && <span className="text-gray-500 font-normal"> · {a.customer}</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-600 flex flex-wrap gap-2">
                    {a.status && <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 border border-gray-200 rounded">Status: {a.status}</span>}
                    {typeof a.plannedAllocationPct === 'number' && <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 border border-gray-200 rounded">{a.plannedAllocationPct}%</span>}
                    {(a.startDate || a.endDate) && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 border border-gray-200 rounded">
                        {a.startDate || '—'} → {a.endDate || '—'}
                      </span>
                    )}
                    {a.offeredSkill && <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 border border-gray-200 rounded">{a.offeredSkill}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  {onEdit && (
                    <button onClick={() => onEdit(a.id)} className="p-1 text-gray-400 hover:text-indigo-600 rounded" title="Bearbeiten">
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => unlinkAssignment(a.id)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                    title="Entfernen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default AssignmentsList;


