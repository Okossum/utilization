import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code, Eye } from 'lucide-react';
import ProjectRoleTaskSelector from './ProjectRoleTaskSelector';

interface ProjectRole {
  roleId: string;
  roleName: string;
  selectedTasks: {
    taskId: string;
    task: string;
    description: string;
    outputs: string;
    isSelected: boolean;
  }[];
  isExpanded?: boolean;
}

const ProjectRoleTaskSelectorDemo: React.FC = () => {
  const [selectedRoles, setSelectedRoles] = useState<ProjectRole[]>([]);
  const [showJson, setShowJson] = useState(false);

  // Get selected tasks summary
  const getSelectedTasksSummary = () => {
    const summary = selectedRoles.map(role => ({
      role: role.roleName,
      selectedTasks: role.selectedTasks
        .filter(task => task.isSelected)
        .map(task => ({
          task: task.task,
          description: task.description,
          outputs: task.outputs
        }))
    })).filter(role => role.selectedTasks.length > 0);

    return summary;
  };

  const selectedTasksSummary = getSelectedTasksSummary();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ProjectRoleTaskSelector Demo
          </h1>
          <p className="text-gray-600">
            Testen Sie die neue Komponente zur Auswahl von Projektrollen und Tätigkeiten
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Component */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Komponente
              </h2>
              
              <ProjectRoleTaskSelector
                selectedRoles={selectedRoles}
                onRolesChange={setSelectedRoles}
                employeeId="demo-employee"
                projectId="demo-project"
              />
            </div>
          </div>

          {/* Right Column - Output */}
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Ausgewählte Tätigkeiten
                </h2>
                <div className="text-sm text-gray-500">
                  {selectedRoles.length} Rollen, {selectedTasksSummary.reduce((acc, role) => acc + role.selectedTasks.length, 0)} Tätigkeiten
                </div>
              </div>

              {selectedTasksSummary.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Eye className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>Keine Rollen ausgewählt</p>
                  <p className="text-sm">Wählen Sie Rollen und Tätigkeiten aus, um sie hier zu sehen</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedTasksSummary.map((role, roleIndex) => (
                    <div key={roleIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-purple-50 px-4 py-3 border-b border-gray-200">
                        <h3 className="font-medium text-purple-900">{role.role}</h3>
                        <p className="text-sm text-purple-700">{role.selectedTasks.length} Tätigkeiten ausgewählt</p>
                      </div>
                      <div className="p-4 space-y-3">
                        {role.selectedTasks.map((task, taskIndex) => (
                          <div key={taskIndex} className="border-l-4 border-purple-400 pl-4">
                            <h4 className="font-medium text-gray-900">{task.task}</h4>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                <strong>Beschreibung:</strong> {task.description}
                              </p>
                            )}
                            {task.outputs && (
                              <p className="text-sm text-gray-600 mt-1">
                                <strong>Outputs:</strong> {task.outputs}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* JSON Output */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  JSON Output
                </h2>
                <button
                  onClick={() => setShowJson(!showJson)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Code className="w-4 h-4" />
                  <span>{showJson ? 'Ausblenden' : 'Anzeigen'}</span>
                </button>
              </div>

              {showJson && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedTasksSummary, null, 2)}
                  </pre>
                </motion.div>
              )}
            </div>

            {/* Usage Example */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Verwendung
              </h2>
              <div className="bg-gray-900 text-gray-300 p-4 rounded-lg text-sm overflow-x-auto">
                <pre>{`import ProjectRoleTaskSelector from './ProjectRoleTaskSelector';

const [selectedRoles, setSelectedRoles] = useState([]);

<ProjectRoleTaskSelector
  selectedRoles={selectedRoles}
  onRolesChange={setSelectedRoles}
  employeeId="employee-123"
  projectId="project-456"
/>`}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectRoleTaskSelectorDemo;
