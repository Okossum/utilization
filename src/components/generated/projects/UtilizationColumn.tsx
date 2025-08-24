import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, Clock } from 'lucide-react';
const utilizationData = [{
  month: 'Jan',
  utilization: 85,
  target: 90
}, {
  month: 'Feb',
  utilization: 92,
  target: 90
}, {
  month: 'Mar',
  utilization: 88,
  target: 90
}, {
  month: 'Apr',
  utilization: 95,
  target: 90
}, {
  month: 'Mai',
  utilization: 89,
  target: 90
}, {
  month: 'Jun',
  utilization: 91,
  target: 90
}] as any[];
const teamUtilization = [{
  name: 'Development',
  value: 94,
  color: '#3B82F6'
}, {
  name: 'Design',
  value: 87,
  color: '#10B981'
}, {
  name: 'Marketing',
  value: 91,
  color: '#F59E0B'
}, {
  name: 'Sales',
  value: 89,
  color: '#EF4444'
}] as any[];
const projectHours = [{
  project: 'Alpha',
  hours: 320,
  budget: 400
}, {
  project: 'Beta',
  hours: 280,
  budget: 300
}, {
  project: 'Gamma',
  hours: 450,
  budget: 500
}, {
  project: 'Delta',
  hours: 180,
  budget: 200
}] as any[];

// @component: UtilizationColumn
export const UtilizationColumn = () => {
  // @return
  return <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Aktuelle Auslastung</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            <span>91%</span>
          </div>
          <div className="text-xs text-blue-700 mt-1">
            <span>+2% vs. Vormonat</span>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Verfügbare MA</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-green-900">
            <span>23</span>
          </div>
          <div className="text-xs text-green-700 mt-1">
            <span>von 247 gesamt</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          <span>Auslastung über Zeit</span>
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{
              fontSize: 12
            }} />
              <YAxis tick={{
              fontSize: 12
            }} />
              <Tooltip />
              <Line type="monotone" dataKey="utilization" stroke="#3B82F6" strokeWidth={2} />
              <Line type="monotone" dataKey="target" stroke="#EF4444" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          <span>Team Auslastung</span>
        </h3>
        <div className="space-y-3">
          {teamUtilization.map(team => <div key={team.name} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{team.name}</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{
                width: `${team.value}%`,
                backgroundColor: team.color
              }} />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8">
                  <span>{team.value}%</span>
                </span>
              </div>
            </div>)}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          <span>Projekt Stunden</span>
        </h3>
        <div className="space-y-2">
          {projectHours.map(project => <div key={project.project} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-700">{project.project}</span>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  <span>{project.hours}h</span>
                </div>
                <div className="text-xs text-gray-500">
                  <span>von {project.budget}h</span>
                </div>
              </div>
            </div>)}
        </div>
      </div>
    </div>;
};