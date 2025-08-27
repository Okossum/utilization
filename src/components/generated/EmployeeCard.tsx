import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, MapPin, Users, Briefcase, Award, Mail, ChefHat, ExternalLink, Phone, Calendar, Building, Clock, Star, TrendingUp, MessageSquare, Heart, ThumbsUp, User, Plus, FileText } from 'lucide-react';
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
  lbs: string;
  cc: string;
  team: string;
  mainRole: string;
  role: string;
  email?: string;
  vg?: string;
  profileUrl?: string;
  skills: Skill[];
  completedProjects: Project[];
  activeProjects: Project[];
  plannedProjects: Project[];
  phone?: string;
  location?: string;
  startDate?: string;
  status?: string;
  utilization?: number;
  averageUtilization?: number;
  softSkills?: Skill[];
  technicalSkills?: Skill[];
  strengths?: string[];
  weaknesses?: string[];
  utilizationComment?: string;
  planningComment?: string;
  onCreateProject?: () => void;
}

interface EmployeeCardEmployee extends Employee {
  role: string;             // Hauptrolle (Projektleiter, Requirements Engineer, etc.)
  email?: string;           // E-Mail-Adresse
  vg?: string;              // Vorgesetzter
  profileUrl?: string;      // Link zum Profil
  skills: Skill[];
  completedProjects: Project[];
  activeProjects: Project[];
  plannedProjects: Project[];
  // Zusätzliche Felder aus EmployeeDetailView
  phone?: string;           // Telefonnummer
  location?: string;        // Standort
  startDate?: string;       // Startdatum
  status?: string;          // Status (aktiv, inaktiv, etc.)
  utilization?: number;     // Aktuelle Auslastung
  averageUtilization?: number; // Durchschnittliche Auslastung
  softSkills?: Skill[];     // Soft Skills
  technicalSkills?: Skill[]; // Technical Skills
  strengths?: string[];     // Stärken
  weaknesses?: string[];    // Schwächen
  utilizationComment?: string; // Auslastungskommentar
  planningComment?: string; // Planungskommentar
}
interface EmployeeCardProps {
  employee: Employee;
  isCompact?: boolean;
  onToggleActive?: (employeeId: string) => void;
  onAvatarClick?: (employee: Employee) => void;
  onOpenDetail?: () => void;
  onCreateProject?: () => void;
}

// @component: EmployeeCard
export const EmployeeCard = ({
  employee,
  isCompact = false,
  onToggleActive,
  onAvatarClick,
  onOpenDetail,
  onCreateProject
}: EmployeeCardProps) => {
  const [showProjectHistory, setShowProjectHistory] = useState(false);
  const [showActiveProjects, setShowActiveProjects] = useState(false);
  const [showPlannedProjects, setShowPlannedProjects] = useState(false);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);

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
              <span className="text-sm font-medium text-emerald-700">{employee.role}</span>
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

        {/* Basis-Informationen */}
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
          {employee.phone && (
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-4 h-4" />
              <span className="text-sm">{employee.phone}</span>
            </div>
          )}
          {employee.location && (
            <div className="flex items-center gap-2 text-slate-600">
              <Building className="w-4 h-4" />
              <span className="text-sm">{employee.location}</span>
            </div>
          )}
          {employee.startDate && (
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">{new Date(employee.startDate).toLocaleDateString('de-DE')}</span>
            </div>
          )}
          {employee.status && (
            <div className="flex items-center gap-2 text-slate-600">
              <User className="w-4 h-4" />
              <span className="text-sm capitalize">{employee.status}</span>
            </div>
          )}
        </div>

        {/* Auslastungs-KPIs */}
        {(employee.utilization !== undefined || employee.averageUtilization !== undefined) && (
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Auslastung
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {employee.utilization !== undefined && (
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{employee.utilization}%</div>
                  <div className="text-xs text-slate-600">Geplante Auslastung</div>
                </div>
              )}
              {employee.averageUtilization !== undefined && (
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{employee.averageUtilization}%</div>
                  <div className="text-xs text-slate-600">Ø Auslastung {new Date().getFullYear()}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Skills Bereich */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-600" />
            Skills
          </h4>
          
          {/* Technical Skills */}
          {employee.technicalSkills && employee.technicalSkills.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-medium text-slate-600 mb-2">Technical Skills</h5>
              <div className={`grid gap-2 ${isCompact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {employee.technicalSkills.map(skill => (
                  <div key={skill.id} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{skill.name}</span>
                    <SkillRating rating={skill.rating || 0} />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Soft Skills */}
          {employee.softSkills && employee.softSkills.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-medium text-slate-600 mb-2">Soft Skills</h5>
              <div className={`grid gap-2 ${isCompact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {employee.softSkills.map(skill => (
                  <div key={skill.id} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{skill.name}</span>
                    <SkillRating rating={skill.rating || 0} />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Fallback: General Skills */}
          {(!employee.technicalSkills || employee.technicalSkills.length === 0) && 
           (!employee.softSkills || employee.softSkills.length === 0) && 
           employee.skills && employee.skills.length > 0 && (
            <div className={`grid gap-2 ${isCompact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {employee.skills.map(skill => (
                <div key={skill.id} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{skill.name}</span>
                  <SkillRating rating={skill.rating} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stärken und Schwächen */}
        {((employee.strengths && employee.strengths.length > 0) || (employee.weaknesses && employee.weaknesses.length > 0)) && (
          <button 
            onClick={() => setShowAdditionalInfo(!showAdditionalInfo)} 
            className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors duration-200 mb-4"
          >
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-slate-600" />
              <span className="font-medium text-slate-700">Stärken & Entwicklungsfelder</span>
            </div>
            {showAdditionalInfo ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
          </button>
        )}

        <AnimatePresence>
          {showAdditionalInfo && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }} 
              transition={{ duration: 0.2 }} 
              className="mb-4 space-y-3"
            >
              {employee.strengths && employee.strengths.length > 0 && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <h5 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4" />
                    Stärken
                  </h5>
                  <ul className="text-sm text-green-700 space-y-1">
                    {employee.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">•</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {employee.weaknesses && employee.weaknesses.length > 0 && (
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <h5 className="text-sm font-semibold text-orange-800 mb-2 flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Entwicklungsfelder
                  </h5>
                  <ul className="text-sm text-orange-700 space-y-1">
                    {employee.weaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-orange-600 mt-1">•</span>
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Projekthistorie (Abgeschlossene Projekte) */}
        {employee.completedProjects && employee.completedProjects.length > 0 && (
          <button 
            onClick={() => setShowProjectHistory(!showProjectHistory)} 
            className="flex items-center justify-between w-full p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200 mb-3 border border-blue-200"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-700">Projekthistorie</span>
              <span className="text-xs bg-blue-200 px-2 py-1 rounded-full text-blue-700">
                {employee.completedProjects.length}
              </span>
            </div>
            {showProjectHistory ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
          </button>
        )}

        <AnimatePresence>
          {showProjectHistory && employee.completedProjects && employee.completedProjects.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }} 
              transition={{ duration: 0.2 }} 
              className="mb-4 space-y-2"
            >
              {employee.completedProjects.map(project => (
                <ProjectDetail key={project.id} project={project} type="completed" />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Aktive Projekte */}
        {employee.activeProjects && employee.activeProjects.length > 0 && (
          <button 
            onClick={() => setShowActiveProjects(!showActiveProjects)} 
            className="flex items-center justify-between w-full p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200 mb-3 border border-green-200"
          >
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-700">Aktive Projekte</span>
              <span className="text-xs bg-green-200 px-2 py-1 rounded-full text-green-700">
                {employee.activeProjects.length}
              </span>
            </div>
            {showActiveProjects ? <ChevronUp className="w-4 h-4 text-green-600" /> : <ChevronDown className="w-4 h-4 text-green-600" />}
          </button>
        )}

        <AnimatePresence>
          {showActiveProjects && employee.activeProjects && employee.activeProjects.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }} 
              transition={{ duration: 0.2 }} 
              className="mb-4 space-y-2"
            >
              {employee.activeProjects.map(project => (
                <ProjectDetail key={project.id} project={project} type="active" />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Geplante Projekte */}
        {employee.plannedProjects && employee.plannedProjects.length > 0 && (
          <button 
            onClick={() => setShowPlannedProjects(!showPlannedProjects)} 
            className="flex items-center justify-between w-full p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200 mb-3 border border-blue-200"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-700">Geplante Projekte</span>
              <span className="text-xs bg-blue-200 px-2 py-1 rounded-full text-blue-700">
                {employee.plannedProjects.length}
              </span>
            </div>
            {showPlannedProjects ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
          </button>
        )}

        <AnimatePresence>
          {showPlannedProjects && employee.plannedProjects && employee.plannedProjects.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }} 
              transition={{ duration: 0.2 }} 
              className="mb-4 space-y-2"
            >
              {employee.plannedProjects.map(project => (
                <ProjectDetail key={project.id} project={project} type="planned" />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kommentare */}
        {(employee.utilizationComment || employee.planningComment) && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Kommentare
            </h4>
            {employee.utilizationComment && (
              <div className="mb-2">
                <h5 className="text-xs font-medium text-blue-700 mb-1">Auslastung:</h5>
                <p className="text-sm text-blue-600">{employee.utilizationComment}</p>
              </div>
            )}
            {employee.planningComment && (
              <div>
                <h5 className="text-xs font-medium text-blue-700 mb-1">Planung:</h5>
                <p className="text-sm text-blue-600">{employee.planningComment}</p>
              </div>
            )}
          </div>
        )}

        {/* Neues Projekt erstellen Button (wie Opportunities-Spalte) */}
        {onCreateProject && (
          <div className="mb-4">
            <button
              onClick={onCreateProject}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              title="Neues Projekt erstellen"
            >
              <Plus className="w-4 h-4" />
              <span>Neues Projekt erstellen</span>
            </button>
          </div>
        )}

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