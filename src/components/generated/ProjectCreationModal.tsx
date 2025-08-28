import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

// Components
import { CustomerManager } from './CustomerManager';
import { ProbabilitySelector } from './ProbabilitySelector';
import { ProjectRoleSelectionModal } from './ProjectRoleSelectionModal';
import { ProjectSkillSelectionModal } from './ProjectSkillSelectionModal';

// Types & Utils
import { 
  ProjectCreationModalProps, 
  ProjectFormData, 
  ProjectType, 
  ProjectSource,
  ProbabilityLevel,
  PROJECT_TYPE_LABELS,
  PROJECT_SOURCE_LABELS
} from '../../types/projects';
import { ProjectHistoryItem, ProjectRole, ProjectSkill } from '../../lib/types';
import { createNewProject, validateProject } from '../../utils/projectUtils';
import { 
  validateProjectBusinessRules, 
  handleProbabilityChange,
  createProjectNotification 
} from '../../utils/projectBusinessLogic';
import { useCustomers } from '../../contexts/CustomerContext';

export function ProjectCreationModal({
  isOpen,
  onClose,
  onSave,
  employeeId,
  employeeName,
  project,
  forceProjectType
}: ProjectCreationModalProps) {
  
  // State Management
  const [formData, setFormData] = useState<ProjectFormData>({
    projectType: forceProjectType || 'historical',
    customer: '',
    projectName: '',
    description: '',
    startDate: '',
    endDate: '',
    duration: '',
    roles: [],
    skills: []
  });
  const [isRoleModalOpen, setRoleModalOpen] = useState(false);
  const [isSkillModalOpen, setSkillModalOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Contexts
  const { customers, addCustomer } = useCustomers();

  // Initialize form data for edit mode
  useEffect(() => {
    if (project) {
      setFormData({
        projectType: project.projectType,
        projectSource: project.projectSource,
        customer: project.customer,
        projectName: project.projectName,
        description: project.description || '',
        probability: project.probability as ProbabilityLevel,
        dailyRate: project.dailyRate,
        startDate: project.startDate,
        endDate: project.endDate,
        dueDate: project.dueDate,
        internalContact: project.internalContact,
        customerContact: project.customerContact,
        jiraTicketId: project.jiraTicketId,
        duration: project.duration,
        activities: project.activities || [],
        roles: project.roles || [],
        skills: project.skills || []
      });
    } else {
      // Reset for new project
      setFormData({
        projectType: forceProjectType || 'historical',
        customer: '',
        projectName: '',
        description: '',
        roles: [],
        skills: []
      });
    }
  }, [project, isOpen]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    // Grunddaten
    if (!formData.projectType) {
      newErrors.push('Bitte wählen Sie einen Projekt-Typ');
    }
    if (!formData.customer.trim()) {
      newErrors.push('Kunde ist erforderlich');
    }
    if (!formData.projectName.trim()) {
      newErrors.push('Projektname ist erforderlich');
    }

    // Projekt-Quelle bei geplanten Projekten
    if (formData.projectType === 'planned' && !formData.projectSource) {
      newErrors.push('Bitte wählen Sie eine Projekt-Quelle');
    }

    // JIRA Ticket ID wenn JIRA-Quelle
    if (formData.projectSource === 'jira' && !formData.jiraTicketId?.trim()) {
      newErrors.push('JIRA Ticket ID ist erforderlich');
    }

    // Geplante Projekte Validierung
    if (formData.projectType === 'planned') {
      if (formData.probability === undefined) {
        newErrors.push('Wahrscheinlichkeit ist erforderlich');
      }
      if (formData.dailyRate !== undefined && formData.dailyRate < 0) {
        newErrors.push('Tagessatz muss positiv sein');
      }
    }

    // Historische Projekte Validierung
    if (formData.projectType === 'historical') {
      if (!formData.startDate || !formData.endDate) {
        newErrors.push('Start- und Enddatum sind bei historischen Projekten erforderlich');
      } else if (new Date(formData.startDate) > new Date(formData.endDate)) {
        newErrors.push('Startdatum muss vor Enddatum liegen');
      }
    }

    // Datum-Validierung für alle Projekte
    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.push('Startdatum muss vor Enddatum liegen');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Form Handlers
  const updateFormData = (updates: Partial<ProjectFormData>) => {
    const newFormData = { ...formData, ...updates };
    
    // Automatische Berechnung der Projektdauer bei historischen Projekten
    if (formData.projectType === 'historical' && 
        (updates.startDate !== undefined || updates.endDate !== undefined)) {
      
      const startDate = updates.startDate !== undefined ? updates.startDate : formData.startDate;
      const endDate = updates.endDate !== undefined ? updates.endDate : formData.endDate;
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start <= end) {
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let calculatedDuration = '';
          if (diffDays === 1) {
            calculatedDuration = '1 Tag';
          } else if (diffDays < 30) {
            calculatedDuration = `${diffDays} Tage`;
          } else if (diffDays < 365) {
            const months = Math.round(diffDays / 30);
            calculatedDuration = months === 1 ? '1 Monat' : `${months} Monate`;
          } else {
            const years = Math.round(diffDays / 365);
            calculatedDuration = years === 1 ? '1 Jahr' : `${years} Jahre`;
          }
          
          newFormData.duration = calculatedDuration;
        }
      }
    }
    
    setFormData(newFormData);
    setErrors([]); // Clear errors when user makes changes
  };

  const handleCustomerSelect = async (customerName: string) => {
    updateFormData({ customer: customerName });
  };

  const handleNewCustomer = async (customerName: string) => {
    try {
      await addCustomer(customerName);
      updateFormData({ customer: customerName });
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  };

  const addActivity = () => {
    const activities = formData.activities || [];
    updateFormData({ activities: [...activities, ''] });
  };

  const updateActivity = (index: number, value: string) => {
    const activities = [...(formData.activities || [])];
    activities[index] = value;
    updateFormData({ activities });
  };

  const removeActivity = (index: number) => {
    const activities = [...(formData.activities || [])];
    activities.splice(index, 1);
    updateFormData({ activities });
  };

  // Role & Skill Handlers
  const handleRoleSelected = (roleData: { id: string; name: string; categoryName: string; tasks: string[]; level?: number }) => {
    const newRole: ProjectRole = {
      id: roleData.id,
      name: roleData.name,
      categoryName: roleData.categoryName,
      tasks: roleData.tasks,
      level: roleData.level
    };
    
    const existingIndex = formData.roles.findIndex(r => r.id === roleData.id);
    if (existingIndex >= 0) {
      const updatedRoles = [...formData.roles];
      updatedRoles[existingIndex] = newRole;
      updateFormData({ roles: updatedRoles });
    } else {
      updateFormData({ roles: [...formData.roles, newRole] });
    }
    
    setRoleModalOpen(false);
  };

  const handleSkillSelected = (skillData: { id: string; name: string; categoryName: string; level: number }) => {
    const newSkill: ProjectSkill = {
      id: skillData.id,
      name: skillData.name,
      categoryName: skillData.categoryName,
      level: skillData.level
    };
    
    const existingIndex = formData.skills.findIndex(s => s.id === skillData.id);
    if (existingIndex >= 0) {
      const updatedSkills = [...formData.skills];
      updatedSkills[existingIndex] = newSkill;
      updateFormData({ skills: updatedSkills });
    } else {
      updateFormData({ skills: [...formData.skills, newSkill] });
    }
    
    setSkillModalOpen(false);
  };

  const removeRole = (roleId: string) => {
    updateFormData({ roles: formData.roles.filter(r => r.id !== roleId) });
  };

  const removeSkill = (skillId: string) => {
    updateFormData({ skills: formData.skills.filter(s => s.id !== skillId) });
  };

  // Save Handler
  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const projectData: ProjectHistoryItem = project 
        ? { ...project, ...formData, updatedAt: new Date() }
        : {
            ...createNewProject(employeeId, formData.projectType, {
              customer: formData.customer,
              projectName: formData.projectName,
              description: formData.description
            }),
            ...formData
          };

      // Validate complete project with business rules
      const basicValidation = validateProject(projectData);
      const businessValidation = validateProjectBusinessRules(projectData);
      
      if (!basicValidation.isValid || !businessValidation.isValid) {
        const allErrors = [
          ...basicValidation.errors,
          ...businessValidation.errors
        ];
        setErrors(allErrors);
        return;
      }

      // Check for automatic upgrade to active project
      let finalProjectData = projectData;
      if (projectData.projectType === 'planned' && projectData.probability === 100) {
        finalProjectData = {
          ...projectData,
          projectType: 'active',
          updatedAt: new Date()
        };
      }

      await onSave(finalProjectData);
      onClose();
    } catch (error) {
      console.error('Error saving project:', error);
      setErrors(['Fehler beim Speichern des Projekts']);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          {/* Backdrop */}
          <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

          {/* Modal */}
          <div className="inline-block w-full max-w-6xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {project ? 'Projekt bearbeiten' : 'Neues Projekt erstellen'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Messages */}
            {errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Bitte korrigieren Sie folgende Fehler:</h4>
                    <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Form Content */}
            <div className="mb-8 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Linke Spalte */}
                <div className="space-y-6">
                  
                  {/* Projekt-Typ */}
                  {!forceProjectType && (
                    <div>
                      <h4 className="text-lg font-medium mb-4">Projekt-Typ</h4>
                      <div className="space-y-3">
                        {(['historical', 'planned'] as ProjectType[]).map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => updateFormData({ projectType: type })}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                              formData.projectType === type
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <h5 className="font-semibold mb-1">{PROJECT_TYPE_LABELS[type]}</h5>
                            <p className="text-sm text-gray-600">
                              {type === 'historical' 
                                ? 'Dokumentation abgeschlossener Projekte'
                                : 'Planung zukünftiger Projekte mit Wahrscheinlichkeiten'
                              }
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Wenn Projekt-Typ erzwungen ist, zeige Info */}
                  {forceProjectType && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-lg font-medium">Projekt-Typ: {PROJECT_TYPE_LABELS[forceProjectType]}</h4>
                    </div>
                  )}

                  {/* Projekt-Quelle (nur bei geplanten Projekten) */}
                  {formData.projectType === 'planned' && (
                    <div>
                      <h4 className="text-lg font-medium mb-4">Projekt-Quelle</h4>
                      <div className="space-y-3">
                        {(['regular', 'jira'] as ProjectSource[]).map(source => (
                          <button
                            key={source}
                            type="button"
                            onClick={() => updateFormData({ projectSource: source })}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                              formData.projectSource === source
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <h5 className="font-semibold mb-1">{PROJECT_SOURCE_LABELS[source]}</h5>
                            <p className="text-sm text-gray-600">
                              {source === 'regular'
                                ? 'Direktes Kundenprojekt'
                                : 'JIRA Ticket aus anderer LoB'
                              }
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grunddaten */}
                  <div>
                    <h4 className="text-lg font-medium mb-4">Grunddaten</h4>
                    <div className="space-y-4">
                      {/* Customer */}
                      <div>
                        {formData.projectSource === 'jira' || formData.projectType === 'historical' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Kunde {formData.projectSource === 'jira' && '(andere LoB)'}
                            </label>
                            <input
                              type="text"
                              value={formData.customer}
                              onChange={e => updateFormData({ customer: e.target.value })}
                              placeholder="Kundenname eingeben..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        ) : (
                          <CustomerManager
                            customers={customers}
                            value={formData.customer}
                            onChange={handleCustomerSelect}
                            onAddCustomer={handleNewCustomer}
                            allowCreate={true}
                            showManagement={false}
                          />
                        )}
                      </div>

                      {/* Project Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Projektname
                        </label>
                        <input
                          type="text"
                          value={formData.projectName}
                          onChange={e => updateFormData({ projectName: e.target.value })}
                          placeholder="Projektname eingeben..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Customer Contact */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Kunden-Ansprechpartner
                        </label>
                        <input
                          type="text"
                          value={formData.customerContact || ''}
                          onChange={e => updateFormData({ customerContact: e.target.value })}
                          placeholder="Name des Ansprechpartners beim Kunden"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Project Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Projektbeschreibung (optional)
                        </label>
                        <textarea
                          value={formData.description || ''}
                          onChange={e => updateFormData({ description: e.target.value })}
                          placeholder="Kurze Beschreibung des Projekts, Ziele, Besonderheiten..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>

                      {/* JIRA Ticket ID */}
                      {formData.projectSource === 'jira' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            JIRA Ticket ID
                          </label>
                          <input
                            type="text"
                            value={formData.jiraTicketId || ''}
                            onChange={e => updateFormData({ jiraTicketId: e.target.value })}
                            placeholder="z.B. PROJ-1234"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rechte Spalte */}
                <div className="space-y-6">
                  
                  {/* Projekt-Details */}
                  <div>
                    
                    {formData.projectType === 'planned' ? (
                      <div className="space-y-4">
                        {/* Probability */}
                        <ProbabilitySelector
                          value={formData.probability}
                          onChange={(probability) => updateFormData({ probability })}
                        />

                        {/* Dates and Rate */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Startdatum
                            </label>
                            <input
                              type="date"
                              value={formData.startDate || ''}
                              onChange={e => updateFormData({ startDate: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Enddatum
                            </label>
                            <input
                              type="date"
                              value={formData.endDate || ''}
                              onChange={e => updateFormData({ endDate: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Due Date - Follow-up Datum für Vertrieb */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Follow-up Datum
                            <span className="text-xs text-gray-500 ml-2">(Wann soll nachgefasst werden?)</span>
                          </label>
                          <input
                            type="date"
                            value={formData.dueDate || ''}
                            onChange={e => updateFormData({ dueDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Datum für Nachfass-Termin"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Hilft dem Vertrieb bei der Nachverfolgung von Angeboten
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tagessatz (€)
                            </label>
                            <input
                              type="number"
                              value={formData.dailyRate || ''}
                              onChange={e => updateFormData({ dailyRate: Number(e.target.value) })}
                              placeholder="z.B. 800"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Geplante Auslastung
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="75"
                                value={formData.plannedUtilization || ''}
                                onChange={e => {
                                  const value = e.target.value.replace(/[^0-9]/g, '');
                                  const numValue = value ? Math.min(100, Math.max(0, Number(value))) : '';
                                  updateFormData({ plannedUtilization: numValue ? Number(numValue) : undefined });
                                }}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-gray-600 text-sm">%</span>
                            </div>
                          </div>
                        </div>

                        {/* Internal Contact */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Interner Ansprechpartner
                          </label>
                          <input
                            type="text"
                            value={formData.internalContact || ''}
                            onChange={e => updateFormData({ internalContact: e.target.value })}
                            placeholder="Name des internen Ansprechpartners"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Start- und Enddatum für historische Projekte */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Startdatum
                            </label>
                            <input
                              type="date"
                              value={formData.startDate || ''}
                              onChange={e => updateFormData({ startDate: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Enddatum
                            </label>
                            <input
                              type="date"
                              value={formData.endDate || ''}
                              onChange={e => updateFormData({ endDate: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Berechnete Projektdauer anzeigen */}
                        {formData.startDate && formData.endDate && formData.duration && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm font-medium text-blue-800">
                                Berechnete Projektdauer: {formData.duration}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Activities */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Tätigkeiten im Projekt
                            </label>
                            <button
                              type="button"
                              onClick={addActivity}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              + Tätigkeit hinzufügen
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(formData.activities || []).map((activity, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={activity}
                                  onChange={e => updateActivity(index, e.target.value)}
                                  placeholder="Beschreibung der Tätigkeit..."
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeActivity(index)}
                                  className="p-2 text-red-500 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rollen & Skills */}
                  <div>
                    
                    {/* Roles Section */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium">Rollen im Projekt</h5>
                        <button
                          type="button"
                          onClick={() => setRoleModalOpen(true)}
                          className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          + Rolle
                        </button>
                      </div>
                      
                      {formData.roles.length > 0 ? (
                        <div className="space-y-2">
                          {formData.roles.map(role => (
                            <div key={role.id} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                              <div>
                                <div className="font-medium text-sm">{role.name}</div>
                                <div className="text-xs text-gray-600">{role.categoryName}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeRole(role.id)}
                                className="p-1 text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500 text-sm">
                          Noch keine Rollen ausgewählt
                        </div>
                      )}
                    </div>

                    {/* Skills Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium">Technical Skills</h5>
                        <button
                          type="button"
                          onClick={() => setSkillModalOpen(true)}
                          className="px-3 py-1 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm"
                        >
                          + Skill
                        </button>
                      </div>
                      
                      {formData.skills.length > 0 ? (
                        <div className="space-y-2">
                          {formData.skills.map(skill => (
                            <div key={skill.id} className="flex items-center justify-between p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                              <div>
                                <div className="font-medium text-sm">{skill.name}</div>
                                <div className="text-xs text-gray-600">Level: {skill.level}/5 ★</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeSkill(skill.id)}
                                className="p-1 text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500 text-sm">
                          Noch keine Skills ausgewählt
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {formData.projectType === 'historical' ? 'Historisches Projekt' : 'Geplantes Projekt'}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Abbrechen
                </button>
                
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {isLoading ? 'Speichere...' : (project ? 'Aktualisieren' : 'Erstellen')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Modals */}
      <ProjectRoleSelectionModal
        isOpen={isRoleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        onRoleSelected={handleRoleSelected}
      />

      <ProjectSkillSelectionModal
        isOpen={isSkillModalOpen}
        onClose={() => setSkillModalOpen(false)}
        onSkillSelected={handleSkillSelected}
      />
    </>
  );
}