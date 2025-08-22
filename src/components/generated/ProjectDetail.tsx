import React from 'react';
import { Calendar, Building, User, TrendingUp, AlertCircle } from 'lucide-react';
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
interface ProjectDetailProps {
  project: Project;
  type: 'completed' | 'planned';
}
const probabilityColors = {
  'Prospect': 'bg-purple-100 text-purple-700 border-purple-200',
  'Offered': 'bg-blue-100 text-blue-700 border-blue-200',
  'Planned': 'bg-green-100 text-green-700 border-green-200',
  'Commissioned': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'On-Hold': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Rejected': 'bg-red-100 text-red-700 border-red-200'
};

// @component: ProjectDetail
export const ProjectDetail = ({
  project,
  type
}: ProjectDetailProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // @return
  return <div className={`p-4 rounded-lg border ${type === 'completed' ? 'bg-slate-50 border-slate-200' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h6 className="font-semibold text-slate-800 mb-1">
            <span>{project.projectName}</span>
          </h6>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Building className="w-3 h-3" />
            <span>{project.customer}</span>
          </div>
        </div>
        {type === 'planned' && project.probability && <div className={`px-2 py-1 rounded-full text-xs font-medium border ${probabilityColors[project.probability]}`}>
            <span>{project.probability}</span>
          </div>}
      </div>

      <p className="text-sm text-slate-600 mb-3">
        <span>{project.description}</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(project.startDate)} - {formatDate(project.endDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <User className="w-3 h-3" />
          <span>{project.employeeRole}</span>
        </div>
      </div>

      {type === 'planned' && project.utilization && <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-3 h-3 text-blue-600" />
          <span className="text-xs text-slate-600">Utilization:</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{
            width: `${project.utilization}%`
          }}></div>
            </div>
            <span className="text-xs font-medium text-blue-600">{project.utilization}%</span>
          </div>
        </div>}

      <div className="flex flex-wrap gap-1">
        {project.skillsUsed.map((skill, index) => <span key={index} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600">
            {skill}
          </span>)}
      </div>
    </div>;
};