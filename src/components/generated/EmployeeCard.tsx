import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, MapPin, Users, Briefcase, Award } from 'lucide-react';
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
interface EmployeeCardProps {
  employee: Employee;
  isCompact?: boolean;
}

// @component: EmployeeCard
export const EmployeeCard = ({
  employee,
  isCompact = false
}: EmployeeCardProps) => {
  const [showProjects, setShowProjects] = useState(false);

  // @return
  return <motion.div layout className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-800 mb-1">
              <span>{employee.name}</span>
            </h3>
            <p className="text-blue-600 font-medium">
              <span>{employee.area}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full">
            <Award className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">{employee.careerLevel}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{employee.competenceCenter}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Users className="w-4 h-4" />
            <span className="text-sm">{employee.team}</span>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">
            <span>Skills</span>
          </h4>
          <div className={`grid gap-2 ${isCompact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {employee.skills.map(skill => <div key={skill.id} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{skill.name}</span>
                <SkillRating rating={skill.rating} />
              </div>)}
          </div>
        </div>

        <button onClick={() => setShowProjects(!showProjects)} className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors duration-200">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-slate-600" />
            <span className="font-medium text-slate-700">Projects</span>
            <span className="text-xs bg-slate-200 px-2 py-1 rounded-full text-slate-600">
              {employee.completedProjects.length + employee.plannedProjects.length}
            </span>
          </div>
          {showProjects ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
        </button>

        <AnimatePresence>
          {showProjects && <motion.div initial={{
          opacity: 0,
          height: 0
        }} animate={{
          opacity: 1,
          height: 'auto'
        }} exit={{
          opacity: 0,
          height: 0
        }} transition={{
          duration: 0.2
        }} className="mt-4 space-y-4">
              {employee.completedProjects.length > 0 && <div>
                  <h5 className="text-sm font-semibold text-slate-700 mb-2">
                    <span>Completed Projects</span>
                  </h5>
                  <div className="space-y-2">
                    {employee.completedProjects.map(project => <ProjectDetail key={project.id} project={project} type="completed" />)}
                  </div>
                </div>}

              {employee.plannedProjects.length > 0 && <div>
                  <h5 className="text-sm font-semibold text-slate-700 mb-2">
                    <span>Planned Projects</span>
                  </h5>
                  <div className="space-y-2">
                    {employee.plannedProjects.map(project => <ProjectDetail key={project.id} project={project} type="planned" />)}
                  </div>
                </div>}
            </motion.div>}
        </AnimatePresence>
      </div>
    </motion.div>;
};