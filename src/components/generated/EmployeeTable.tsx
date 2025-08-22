import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, MapPin, Users, Award, Briefcase } from 'lucide-react';
import { SkillRating } from './SkillRating';
import { ProjectDetail } from './ProjectDetail';
interface Skill {
  id: string;
  name: string;
  rating: number;
}
interface Project {
  id: string;
  customer: string;
  projectName: string;
  startDate: string;
  endDate: string;
  description: string;
  skillsUsed: string[];
  employeeRole: string;
  utilization?: number;
  probability?: 'Prospect' | 'Offered' | 'Planned' | 'Commissioned' | 'On-Hold' | 'Rejected';
}
interface Employee {
  id: string;
  name: string;
  area: string;
  competenceCenter: string;
  team: string;
  careerLevel: string;
  skills: Skill[];
  completedProjects: Project[];
  plannedProjects: Project[];
}
interface EmployeeTableProps {
  employees: Employee[];
}

// @component: EmployeeTable
export const EmployeeTable = ({
  employees
}: EmployeeTableProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const toggleRow = (employeeId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedRows(newExpanded);
  };

  // @return
  return <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 font-semibold text-slate-700">
                <span>Employee</span>
              </th>
              <th className="text-left p-4 font-semibold text-slate-700">
                <span>Area</span>
              </th>
              <th className="text-left p-4 font-semibold text-slate-700">
                <span>Team</span>
              </th>
              <th className="text-left p-4 font-semibold text-slate-700">
                <span>Level</span>
              </th>
              <th className="text-left p-4 font-semibold text-slate-700">
                <span>Projects</span>
              </th>
              <th className="w-12 p-4"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map(employee => <React.Fragment key={employee.id}>
                <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150">
                  <td className="p-4">
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        <span>{employee.name}</span>
                      </h3>
                      <p className="text-sm text-slate-600">
                        <span>{employee.competenceCenter}</span>
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-blue-600 font-medium">{employee.area}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-slate-700">{employee.team}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full w-fit">
                      <Award className="w-3 h-3 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-700">{employee.careerLevel}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm bg-slate-100 px-2 py-1 rounded-full text-slate-600">
                      {employee.completedProjects.length + employee.plannedProjects.length} total
                    </span>
                  </td>
                  <td className="p-4">
                    <button onClick={() => toggleRow(employee.id)} className="p-1 hover:bg-slate-100 rounded transition-colors duration-150">
                      {expandedRows.has(employee.id) ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                    </button>
                  </td>
                </tr>
                <AnimatePresence>
                  {expandedRows.has(employee.id) && <motion.tr initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} exit={{
                opacity: 0
              }} transition={{
                duration: 0.2
              }}>
                      <td colSpan={6} className="p-0">
                        <div className="bg-slate-25 border-t border-slate-100 p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div>
                              <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span>Skills</span>
                              </h4>
                              <div className="space-y-2">
                                {employee.skills.map(skill => <div key={skill.id} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">{skill.name}</span>
                                    <SkillRating rating={skill.rating} />
                                  </div>)}
                              </div>
                            </div>

                            {employee.completedProjects.length > 0 && <div>
                                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                  <Briefcase className="w-4 h-4" />
                                  <span>Completed Projects</span>
                                </h4>
                                <div className="space-y-3">
                                  {employee.completedProjects.map(project => <ProjectDetail key={project.id} project={project} type="completed" />)}
                                </div>
                              </div>}

                            {employee.plannedProjects.length > 0 && <div>
                                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                  <Briefcase className="w-4 h-4" />
                                  <span>Planned Projects</span>
                                </h4>
                                <div className="space-y-3">
                                  {employee.plannedProjects.map(project => <ProjectDetail key={project.id} project={project} type="planned" />)}
                                </div>
                              </div>}
                          </div>
                        </div>
                      </td>
                    </motion.tr>}
                </AnimatePresence>
              </React.Fragment>)}
          </tbody>
        </table>
      </div>
    </div>;
};