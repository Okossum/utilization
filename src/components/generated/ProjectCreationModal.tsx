import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import { CustomerManager } from './CustomerManager';
import { EmployeeDropdown } from './EmployeeDropdown';
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

const STEPS = [
  { id: 1, title: 'Projekt-Typ', description: 'Wählen Sie den Typ des Projekts' },
  { id: 2, title: 'Projekt-Quelle', description: 'Bestimmen Sie die Quelle des Projekts' },
  { id: 3, title: 'Grunddaten', description: 'Kunde und Projektname eingeben' },
  { id: 4, title: 'Details', description: 'Zusätzliche Projekt-Informationen' },
  { id: 5, title: 'Rollen & Skills', description: 'Benötigte Kompetenzen auswählen' }
];

export function ProjectCreationModal({
  isOpen,
  onClose,
  onSave,
  employeeId,
  employeeName,
  project
}: ProjectCreationModalProps) {
  
  // State Management
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProjectFormData>({
    projectType: 'historical',
    customer: '',
    projectName: '',
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
        probability: project.probability as ProbabilityLevel,
        dailyRate: project.dailyRate,
        startDate: project.startDate,
        endDate: project.endDate,
        internalContact: project.internalContact,
        customerContact: project.customerContact,
        jiraTicketId: project.jiraTicketId,
        duration: project.duration,
        activities: project.activities || [],
        roles: project.roles || [],
        skills: project.skills || []
      });
      
      // Skip to appropriate step based on project type
      if (project.projectType === 'planned') {
        setCurrentStep(project.projectSource ? 3 : 2);
      } else {
        setCurrentStep(3);
      }
    } else {
      // Reset for new project
      setFormData({
        projectType: 'historical',
        customer: '',
        projectName: '',
        roles: [],
        skills: []
      });
      setCurrentStep(1);
    }
  }, [project, isOpen]);

  // Validation
  const validateCurrentStep = (): boolean => {
    const newErrors: string[] = [];

    switch (currentStep) {
      case 1:
        if (!formData.projectType) {
          newErrors.push('Bitte wählen Sie einen Projekt-Typ');
        }
        break;
      
      case 2:
        if (formData.projectType === 'planned' && !formData.projectSource) {
          newErrors.push('Bitte wählen Sie eine Projekt-Quelle');
        }
        break;
      
      case 3:
        if (!formData.customer.trim()) {
          newErrors.push('Kunde ist erforderlich');
        }
        if (!formData.projectName.trim()) {
          newErrors.push('Projektname ist erforderlich');
        }
        if (formData.projectSource === 'jira' && !formData.jiraTicketId?.trim()) {
          newErrors.push('JIRA Ticket ID ist erforderlich');
        }
        break;
      
      case 4:
        if (formData.projectType === 'planned') {
          if (formData.probability === undefined) {
            newErrors.push('Wahrscheinlichkeit ist erforderlich');
          }
          if (formData.dailyRate !== undefined && formData.dailyRate < 0) {
            newErrors.push('Tagessatz muss positiv sein');
          }
          if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
            newErrors.push('Startdatum muss vor Enddatum liegen');
          }
        }
        if (formData.projectType === 'historical') {
          if (!formData.startDate || !formData.endDate) {
            newErrors.push('Start- und Enddatum sind bei historischen Projekten erforderlich');
          } else if (new Date(formData.startDate) > new Date(formData.endDate)) {
            newErrors.push('Startdatum muss vor Enddatum liegen');
          } else if (!formData.duration?.trim()) {
            newErrors.push('Projektdauer konnte nicht berechnet werden');
          }
        }
        break;
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Navigation
  const nextStep = () => {
    if (validateCurrentStep()) {
      // Skip step 2 for historical projects
      if (currentStep === 1 && formData.projectType === 'historical') {
        setCurrentStep(3);
      }
      // Historical projects need step 4 for duration input
      // No skipping of step 4 for historical projects
      else if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      // Skip step 2 for historical projects when going back
      if (currentStep === 3 && formData.projectType === 'historical') {
        setCurrentStep(1);
      }
      // Historical projects use step 4 for duration
      // No skipping of step 4 when going back
      else {
        setCurrentStep(currentStep - 1);
      }
    }
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
    if (!validateCurrentStep()) return;

    setIsLoading(true);
    try {
      const projectData: ProjectHistoryItem = project 
        ? { ...project, ...formData, updatedAt: new Date() }
        : {
            ...createNewProject(employeeId, formData.projectType, {
              customer: formData.customer,
              projectName: formData.projectName
            }),
            ...formData
          };

      console.log('🔍 DEBUG ProjectCreationModal: Final projectData being passed to onSave:', projectData);
      console.log('🔍 DEBUG ProjectCreationModal: ProjectType:', projectData.projectType);
      console.log('🔍 DEBUG ProjectCreationModal: StartDate:', projectData.startDate);
      console.log('🔍 DEBUG ProjectCreationModal: EndDate:', projectData.endDate);

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

      // Show warnings if any (but allow saving)
      if (businessValidation.warnings.length > 0) {
        console.warn('Project validation warnings:', businessValidation.warnings);
        // TODO: Show warning toast
      }

      // Check for automatic upgrade to active project
      let finalProjectData = projectData;
      if (projectData.projectType === 'planned' && projectData.probability === 100) {
        finalProjectData = {
          ...projectData,
          projectType: 'active',
          updatedAt: new Date()
        };
        
        console.log('🚀 Projekt automatisch zu aktivem Projekt überführt:', finalProjectData.projectName);
        // TODO: Show upgrade notification
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
          <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {project ? 'Projekt bearbeiten' : 'Neues Projekt erstellen'}
                </h3>
                <p className="text-sm text-gray-600">
                  Schritt {currentStep} von {STEPS.length}: {STEPS[currentStep - 1]?.description}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                {STEPS.map((step, index) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  const isSkipped = (
                    (formData.projectType === 'historical' && step.id === 2) ||
                    (formData.projectType === 'historical' && step.id === 4)
                  );

                  return (
                    <div key={step.id} className="flex items-center">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        ${isCompleted ? 'bg-green-500 text-white' : 
                          isActive ? 'bg-blue-500 text-white' : 
                          isSkipped ? 'bg-gray-200 text-gray-400' : 'bg-gray-200 text-gray-600'}
                      `}>
                        {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                      </div>
                      {index < STEPS.length - 1 && (
                        <div className={`w-12 h-0.5 mx-2 ${
                          currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
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

            {/* Step Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="mb-8"
              >
                {/* Step 1: Project Type */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium">Welchen Projekt-Typ möchten Sie erstellen?</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(['historical', 'planned'] as ProjectType[]).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => updateFormData({ projectType: type })}
                          className={`p-6 rounded-lg border-2 text-left transition-all ${
                            formData.projectType === type
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <h5 className="font-semibold mb-2">{PROJECT_TYPE_LABELS[type]}</h5>
                          <p className="text-sm text-gray-600">
                            {type === 'historical' 
                              ? 'Dokumentation abgeschlossener Projekte für die Mitarbeiter-Historie'
                              : 'Planung zukünftiger Projekte mit Wahrscheinlichkeiten und Details'
                            }
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Project Source (nur bei planned) */}
                {currentStep === 2 && formData.projectType === 'planned' && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium">Woher stammt das geplante Projekt?</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(['regular', 'jira'] as ProjectSource[]).map(source => (
                        <button
                          key={source}
                          type="button"
                          onClick={() => updateFormData({ projectSource: source })}
                          className={`p-6 rounded-lg border-2 text-left transition-all ${
                            formData.projectSource === source
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <h5 className="font-semibold mb-2">{PROJECT_SOURCE_LABELS[source]}</h5>
                          <p className="text-sm text-gray-600">
                            {source === 'regular'
                              ? 'Direktes Kundenprojekt mit bekanntem Kunden aus der Datenbank'
                              : 'JIRA Ticket aus anderer Line of Business mit Freitext-Eingabe'
                            }
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Basic Data */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium">Grunddaten des Projekts</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                      {/* JIRA Ticket ID */}
                      {formData.projectSource === 'jira' && (
                        <div className="md:col-span-2">
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
                )}

                {/* Step 4: Details */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium">
                      {formData.projectType === 'planned' ? 'Projekt-Details' : 'Projekt-Zeitraum und Tätigkeiten'}
                    </h4>

                    {formData.projectType === 'planned' ? (
                      <div className="space-y-6">
                        {/* Probability */}
                        <ProbabilitySelector
                          value={formData.probability}
                          onChange={async (probability) => {
                            updateFormData({ probability });
                            
                            // Automatische Überführung bei 100% Wahrscheinlichkeit
                            if (probability === 100 && formData.projectType === 'planned') {
                              // Zeige Hinweis über automatische Überführung
                              console.log('🚀 Projekt wird bei Speicherung zu aktivem Projekt überführt');
                              // TODO: Show info toast
                            }
                          }}
                        />

                        {/* Dates and Rate */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        </div>

                        {/* Contacts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <EmployeeDropdown
                            value={formData.internalContact}
                            onChange={(employeeId) => updateFormData({ internalContact: employeeId })}
                            filterBy={['bereich', 'cc', 'team']}
                            label="Interner Ansprechpartner"
                            placeholder="Ansprechpartner auswählen..."
                          />
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
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Start- und Enddatum für historische Projekte */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                )}

                {/* Step 5: Roles & Skills */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium">Benötigte Rollen und Skills</h4>

                    {/* Roles Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium">Rollen im Projekt</h5>
                        <button
                          type="button"
                          onClick={() => setRoleModalOpen(true)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Rolle hinzufügen
                        </button>
                      </div>
                      
                      {formData.roles.length > 0 ? (
                        <div className="space-y-2">
                          {formData.roles.map(role => (
                            <div key={role.id} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                              <div>
                                <div className="font-medium">{role.name}</div>
                                <div className="text-sm text-gray-600">{role.categoryName}</div>
                                <div className="text-xs text-gray-500">
                                  {role.tasks.length} Aufgaben: {role.tasks.slice(0, 3).join(', ')}
                                  {role.tasks.length > 3 && '...'}
                                </div>
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
                        <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
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
                          className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                        >
                          Skill hinzufügen
                        </button>
                      </div>
                      
                      {formData.skills.length > 0 ? (
                        <div className="space-y-2">
                          {formData.skills.map(skill => (
                            <div key={skill.id} className="flex items-center justify-between p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                              <div>
                                <div className="font-medium">{skill.name}</div>
                                <div className="text-sm text-gray-600">{skill.categoryName}</div>
                                <div className="text-xs text-gray-500">
                                  Level: {skill.level}/5 ★
                                </div>
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
                        <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                          Noch keine Skills ausgewählt
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Footer */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Zurück
              </button>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Abbrechen
                </button>
                
                {currentStep < STEPS.length ? (
                  <button
                    onClick={nextStep}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Weiter
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex items-center px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {isLoading ? 'Speichere...' : (project ? 'Aktualisieren' : 'Erstellen')}
                  </button>
                )}
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
