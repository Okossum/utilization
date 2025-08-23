import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, MapPin, Users, Briefcase, Award, Mail, ChefHat, ExternalLink } from 'lucide-react';
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
  averageUtilization?: number; // Durchschnittliche Auslastung über konsolidierte Wochen
  probability?: 'Prospect' | 'Offered' | 'Planned' | 'Commissioned' | 'On-Hold' | 'Rejected';
}
interface Employee {
  id: string;
  name: string;
  lbs: string;              // Karrierestufe (wird als Untertitel angezeigt)
  cc: string;               // Competence Center
  team: string;
  mainRole: string;         // Hauptrolle (Projektleiter, Requirements Engineer, etc.)
  email?: string;           // E-Mail-Adresse
  vg?: string;              // Vorgesetzter
  profileUrl?: string;      // Link zum Profil
  skills: Skill[];
  completedProjects: Project[];
  plannedProjects: Project[];
}
interface EmployeeCardProps {
  employee: Employee;
  isCompact?: boolean;
  onToggleActive?: (employeeId: string) => void;
  onAvatarClick?: (employee: Employee) => void;
  onOpenDetail?: () => void;
}

// @component: EmployeeCard
export const EmployeeCard = ({
  employee,
  isCompact = false,
  onToggleActive,
  onAvatarClick,
  onOpenDetail
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
              <span>{employee.lbs}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full">
              <Award className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">{employee.mainRole}</span>
            </div>
            {employee.profileUrl && (
              <div className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3 text-slate-500" />
                <a 
                  href={employee.profileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  Profiler
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{employee.cc}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Users className="w-4 h-4" />
            <span className="text-sm">{employee.team}</span>
          </div>
          {employee.email && (
            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="w-4 h-4" />
              <span className="text-sm">{employee.email}</span>
            </div>
          )}
          {employee.vg && (
            <div className="flex items-center gap-2 text-slate-600">
              <ChefHat className="w-4 h-4" />
              <span className="text-sm">{employee.vg}</span>
            </div>
          )}
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

        {/* Detail öffnen Button */}
        {onOpenDetail && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <button
              onClick={onOpenDetail}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Detail öffnen</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>;
};