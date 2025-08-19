import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { assignmentService } from '../lib/firebase-services';
import { AssignmentDoc, FirestoreAssignment } from '../lib/types';

interface AssignmentsContextType {
  // Cached data
  assignmentsByEmployee: Record<string, FirestoreAssignment[]>;
  assignmentsByProject: Record<string, FirestoreAssignment[]>;

  // Loading flags
  isLoading: boolean;
  loadingEmployees: Record<string, boolean>;
  loadingProjects: Record<string, boolean>;

  // Queries
  getAssignmentsForEmployee: (employeeName: string, force?: boolean) => Promise<FirestoreAssignment[]>;
  getAssignmentsForProject: (projectId: string, force?: boolean) => Promise<FirestoreAssignment[]>;

  // Mutations
  linkEmployeeToProject: (
    employeeName: string,
    projectId: string,
    meta?: Partial<Omit<AssignmentDoc, 'employeeName' | 'projectId' | 'createdAt' | 'updatedAt'>>
  ) => Promise<string>;
  updateAssignment: (id: string, updates: Partial<AssignmentDoc>) => Promise<void>;
  unlinkAssignment: (id: string) => Promise<void>;

  // Refresh
  refreshEmployee: (employeeName: string) => Promise<void>;
  refreshProject: (projectId: string) => Promise<void>;
}

const AssignmentsContext = createContext<AssignmentsContextType | undefined>(undefined);

export function AssignmentsProvider({ children }: { children: React.ReactNode }) {
  const [assignmentsByEmployee, setAssignmentsByEmployee] = useState<Record<string, FirestoreAssignment[]>>({});
  const [assignmentsByProject, setAssignmentsByProject] = useState<Record<string, FirestoreAssignment[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingEmployees, setLoadingEmployees] = useState<Record<string, boolean>>({});
  const [loadingProjects, setLoadingProjects] = useState<Record<string, boolean>>({});

  const inflightByEmployee = useRef<Record<string, Promise<FirestoreAssignment[]>>>({});
  const inflightByProject = useRef<Record<string, Promise<FirestoreAssignment[]>>>({});

  const setEmployeeLoading = (employeeName: string, loading: boolean) =>
    setLoadingEmployees(prev => ({ ...prev, [employeeName]: loading }));
  const setProjectLoading = (projectId: string, loading: boolean) =>
    setLoadingProjects(prev => ({ ...prev, [projectId]: loading }));

  const mergeAssignmentIntoCaches = useCallback((assignment: FirestoreAssignment) => {
    const { employeeName, projectId } = assignment;
    if (employeeName) {
      setAssignmentsByEmployee(prev => {
        const list = prev[employeeName] || [];
        const idx = list.findIndex(a => a.id === assignment.id);
        const next = idx >= 0 ? [...list.slice(0, idx), assignment, ...list.slice(idx + 1)] : [assignment, ...list];
        return { ...prev, [employeeName]: next };
      });
    }
    if (projectId) {
      setAssignmentsByProject(prev => {
        const list = prev[projectId] || [];
        const idx = list.findIndex(a => a.id === assignment.id);
        const next = idx >= 0 ? [...list.slice(0, idx), assignment, ...list.slice(idx + 1)] : [assignment, ...list];
        return { ...prev, [projectId]: next };
      });
    }
  }, []);

  const removeAssignmentFromCaches = useCallback((id: string, employeeName?: string, projectId?: string) => {
    if (employeeName) {
      setAssignmentsByEmployee(prev => {
        const list = prev[employeeName] || [];
        return { ...prev, [employeeName]: list.filter(a => a.id !== id) };
      });
    } else {
      // Fallback: remove from all employees (in case we don't have the name)
      setAssignmentsByEmployee(prev => {
        const next: typeof prev = {};
        for (const [key, list] of Object.entries(prev)) {
          next[key] = list.filter(a => a.id !== id);
        }
        return next;
      });
    }
    if (projectId) {
      setAssignmentsByProject(prev => {
        const list = prev[projectId] || [];
        return { ...prev, [projectId]: list.filter(a => a.id !== id) };
      });
    } else {
      setAssignmentsByProject(prev => {
        const next: typeof prev = {};
        for (const [key, list] of Object.entries(prev)) {
          next[key] = list.filter(a => a.id !== id);
        }
        return next;
      });
    }
  }, []);

  const getAssignmentsForEmployee = useCallback(async (employeeName: string, force = false) => {
    if (!employeeName) return [] as FirestoreAssignment[];
    if (!force && assignmentsByEmployee[employeeName]) {
      return assignmentsByEmployee[employeeName];
    }
    if (inflightByEmployee.current[employeeName]) return inflightByEmployee.current[employeeName];

    setIsLoading(true);
    setEmployeeLoading(employeeName, true);
    const promise = assignmentService.getByEmployee(employeeName)
      .then(list => {
        console.log('🔍 Assignments geladen für', employeeName, ':', list);
        setAssignmentsByEmployee(prev => ({ ...prev, [employeeName]: list }));
        // Mirror into project cache
        setAssignmentsByProject(prev => {
          const next = { ...prev };
          list.forEach(a => {
            const l = next[a.projectId] || [];
            if (!l.find(x => x.id === a.id)) next[a.projectId] = [...l, a];
          });
          return next;
        });
        return list;
      })
      .finally(() => {
        setIsLoading(false);
        setEmployeeLoading(employeeName, false);
        delete inflightByEmployee.current[employeeName];
      });
    inflightByEmployee.current[employeeName] = promise;
    return promise;
  }, [assignmentsByEmployee]);

  const getAssignmentsForProject = useCallback(async (projectId: string, force = false) => {
    if (!projectId) return [] as FirestoreAssignment[];
    if (!force && assignmentsByProject[projectId]) {
      return assignmentsByProject[projectId];
    }
    if (inflightByProject.current[projectId]) return inflightByProject.current[projectId];

    setIsLoading(true);
    setProjectLoading(projectId, true);
    const promise = assignmentService.getByProject(projectId)
      .then(list => {
        setAssignmentsByProject(prev => ({ ...prev, [projectId]: list }));
        // Mirror into employee cache
        setAssignmentsByEmployee(prev => {
          const next = { ...prev };
          list.forEach(a => {
            const l = next[a.employeeName] || [];
            if (!l.find(x => x.id === a.id)) next[a.employeeName] = [...l, a];
          });
          return next;
        });
        return list;
      })
      .finally(() => {
        setIsLoading(false);
        setProjectLoading(projectId, false);
        delete inflightByProject.current[projectId];
      });
    inflightByProject.current[projectId] = promise;
    return promise;
  }, [assignmentsByProject]);

  const linkEmployeeToProject: AssignmentsContextType['linkEmployeeToProject'] = useCallback(async (employeeName, projectId, meta) => {
    // Dedup guard: prevent identical active/prospect duplicates in cache
    const existing = (assignmentsByEmployee[employeeName] || []).find(a => a.projectId === projectId && (a.status !== 'closed'));
    if (existing) return existing.id;

    const toCreate: Omit<AssignmentDoc, 'createdAt' | 'updatedAt'> = {
      employeeName,
      projectId,
      status: 'planned',
      ...meta,
    } as any;

    // Optimistic: add temp entry
    const tempId = `temp-${Date.now()}`;
    const optimistic: FirestoreAssignment = {
      id: tempId,
      ...(toCreate as any),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mergeAssignmentIntoCaches(optimistic);

    try {
      const id = await assignmentService.create(toCreate);
      // Replace optimistic with real
      const real: FirestoreAssignment = { ...optimistic, id };
      mergeAssignmentIntoCaches(real);
      removeAssignmentFromCaches(tempId, employeeName, projectId);
      
      // Aktualisiere die Liste für den Mitarbeiter
      await getAssignmentsForEmployee(employeeName, true);
      
      return id;
    } catch (e) {
      // rollback
      removeAssignmentFromCaches(tempId, employeeName, projectId);
      throw e;
    }
  }, [assignmentsByEmployee, mergeAssignmentIntoCaches, removeAssignmentFromCaches]);

  const updateAssignment = useCallback(async (id: string, updates: Partial<AssignmentDoc>) => {
    // Optimistic: find and update in caches
    let snapshot: { employeeName?: string; projectId?: string } = {};
    setAssignmentsByEmployee(prev => {
      const next: typeof prev = {};
      for (const [emp, list] of Object.entries(prev)) {
        const idx = list.findIndex(a => a.id === id);
        if (idx >= 0) {
          snapshot.employeeName = emp;
          const updated = { ...list[idx], ...updates, updatedAt: new Date() } as FirestoreAssignment;
          next[emp] = [...list.slice(0, idx), updated, ...list.slice(idx + 1)];
        } else {
          next[emp] = list;
        }
      }
      return next;
    });
    setAssignmentsByProject(prev => {
      const next: typeof prev = {};
      for (const [pid, list] of Object.entries(prev)) {
        const idx = list.findIndex(a => a.id === id);
        if (idx >= 0) {
          snapshot.projectId = pid;
          const updated = { ...list[idx], ...updates, updatedAt: new Date() } as FirestoreAssignment;
          next[pid] = [...list.slice(0, idx), updated, ...list.slice(idx + 1)];
        } else {
          next[pid] = list;
        }
      }
      return next;
    });

    try {
      await assignmentService.update(id, updates);
    } catch (e) {
      // On failure, force refresh if we know keys
      if (snapshot.employeeName) await getAssignmentsForEmployee(snapshot.employeeName, true);
      if (snapshot.projectId) await getAssignmentsForProject(snapshot.projectId, true);
      throw e;
    }
  }, [getAssignmentsForEmployee, getAssignmentsForProject]);

  const unlinkAssignment = useCallback(async (id: string) => {
    // Remove optimistically (we don't necessarily know keys here)
    removeAssignmentFromCaches(id);
    try {
      await assignmentService.remove(id);
    } catch (e) {
      // No reliable rollback without lookup; consumers can refresh on error
      throw e;
    }
  }, [removeAssignmentFromCaches]);

  const refreshEmployee = useCallback(async (employeeName: string) => {
    await getAssignmentsForEmployee(employeeName, true);
  }, [getAssignmentsForEmployee]);

  const refreshProject = useCallback(async (projectId: string) => {
    await getAssignmentsForProject(projectId, true);
  }, [getAssignmentsForProject]);

  const value = useMemo<AssignmentsContextType>(() => ({
    assignmentsByEmployee,
    assignmentsByProject,
    isLoading,
    loadingEmployees,
    loadingProjects,
    getAssignmentsForEmployee,
    getAssignmentsForProject,
    linkEmployeeToProject,
    updateAssignment,
    unlinkAssignment,
    refreshEmployee,
    refreshProject,
  }), [
    assignmentsByEmployee,
    assignmentsByProject,
    isLoading,
    loadingEmployees,
    loadingProjects,
    getAssignmentsForEmployee,
    getAssignmentsForProject,
    linkEmployeeToProject,
    updateAssignment,
    unlinkAssignment,
    refreshEmployee,
    refreshProject,
  ]);

  return (
    <AssignmentsContext.Provider value={value}>
      {children}
    </AssignmentsContext.Provider>
  );
}

export function useAssignments(): AssignmentsContextType {
  const ctx = useContext(AssignmentsContext);
  if (!ctx) throw new Error('useAssignments must be used within AssignmentsProvider');
  return ctx;
}


