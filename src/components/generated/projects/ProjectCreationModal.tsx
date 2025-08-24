"use client";

import React, { useState } from 'react';
import { X, Save, Building2, Calendar, User, FileText, Target, Award, MessageSquare, Briefcase, Code, Users, TrendingUp, Star, Quote, CheckCircle, AlertCircle, Plus, Minus } from 'lucide-react';
export interface ProjectData {
  // Grunddaten
  customerName: string;
  projectName: string;
  projectStart: string;
  projectEnd: string;
  roleInProject: string;
  projectDescription: string;

  // Tätigkeiten und Skills
  activities: string[];
  technicalSkills: string[];
  softSkills: string[];

  // Ergebnisse und Testimonials
  outcomes: string[];
  customerTestimonial: {
    text: string;
    author: string;
    position: string;
  };
  projectManagerTestimonial: {
    text: string;
    author: string;
    position: string;
  };

  // Zusätzliche Informationen
  teamSize?: number;
  budget?: string;
  industry?: string;
  technologies?: string[];
  challenges?: string[];
  learnings?: string[];
}
interface ProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: ProjectData) => void;
  mode: 'history' | 'planned';
  initialData?: Partial<ProjectData>;
  title?: string;
}
const initialProjectData: ProjectData = {
  customerName: '',
  projectName: '',
  projectStart: '',
  projectEnd: '',
  roleInProject: '',
  projectDescription: '',
  activities: [''],
  technicalSkills: [''],
  softSkills: [''],
  outcomes: [''],
  customerTestimonial: {
    text: '',
    author: '',
    position: ''
  },
  projectManagerTestimonial: {
    text: '',
    author: '',
    position: ''
  },
  teamSize: undefined,
  budget: '',
  industry: '',
  technologies: [''],
  challenges: [''],
  learnings: ['']
};
export default function ProjectCreationModal({
  isOpen,
  onClose,
  onSave,
  mode,
  initialData,
  title
}: ProjectCreationModalProps) {
  const [formData, setFormData] = useState<ProjectData>({
    ...initialProjectData,
    ...initialData
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const totalSteps = 5;
  if (!isOpen) return null;
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    switch (step) {
      case 1:
        if (!formData.customerName.trim()) newErrors.customerName = 'Kundenname ist erforderlich';
        if (!formData.projectName.trim()) newErrors.projectName = 'Projektname ist erforderlich';
        if (!formData.projectStart) newErrors.projectStart = 'Projektbeginn ist erforderlich';
        if (!formData.projectEnd) newErrors.projectEnd = 'Projektende ist erforderlich';
        if (!formData.roleInProject.trim()) newErrors.roleInProject = 'Rolle im Projekt ist erforderlich';
        break;
      case 2:
        if (!formData.projectDescription.trim()) newErrors.projectDescription = 'Projektbeschreibung ist erforderlich';
        break;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };
  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };
  const handleSave = () => {
    if (validateStep(currentStep)) {
      // Filter out empty arrays and clean data
      const cleanedData = {
        ...formData,
        activities: formData.activities.filter(item => item.trim()),
        technicalSkills: formData.technicalSkills.filter(item => item.trim()),
        softSkills: formData.softSkills.filter(item => item.trim()),
        outcomes: formData.outcomes.filter(item => item.trim()),
        technologies: formData.technologies?.filter(item => item.trim()) || [],
        challenges: formData.challenges?.filter(item => item.trim()) || [],
        learnings: formData.learnings?.filter(item => item.trim()) || []
      };
      onSave(cleanedData);
      onClose();
      setCurrentStep(1);
      setFormData({
        ...initialProjectData,
        ...initialData
      });
    }
  };
  const addArrayItem = (field: keyof ProjectData, value: string = '') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), value]
    }));
  };
  const removeArrayItem = (field: keyof ProjectData, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };
  const updateArrayItem = (field: keyof ProjectData, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).map((item, i) => i === index ? value : item)
    }));
  };
  const renderStepIndicator = () => <div className="flex items-center justify-center space-x-2 mb-8">
      {Array.from({
      length: totalSteps
    }, (_, i) => i + 1).map(step => <div key={step} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step === currentStep ? 'bg-blue-600 text-white' : step < currentStep ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            {step < currentStep ? <CheckCircle className="w-4 h-4" /> : step}
          </div>
          {step < totalSteps && <div className={`w-12 h-0.5 mx-2 transition-colors ${step < currentStep ? 'bg-green-600' : 'bg-gray-200'}`} />}
        </div>)}
    </div>;
  const renderArrayInput = (field: keyof ProjectData, label: string, placeholder: string, icon: React.ReactNode) => {
    const items = formData[field] as string[];
    return <div>
        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
          {icon}
          <span>{label}</span>
        </label>
        <div className="space-y-2">
          {items.map((item, index) => <div key={index} className="flex items-center space-x-2">
              <input type="text" value={item} onChange={e => updateArrayItem(field, index, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder={placeholder} />
              {items.length > 1 && <button type="button" onClick={() => removeArrayItem(field, index)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                  <Minus className="w-4 h-4" />
                </button>}
            </div>)}
          <button type="button" onClick={() => addArrayItem(field)} className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors text-sm">
            <Plus className="w-4 h-4" />
            <span>Weitere hinzufügen</span>
          </button>
        </div>
      </div>;
  };
  const renderStep1 = () => <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Grunddaten des Projekts</h3>
        <p className="text-sm text-gray-600">Erfassen Sie die wichtigsten Informationen zum Projekt</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Building2 className="w-4 h-4" />
            <span>Kundenname *</span>
          </label>
          <input type="text" value={formData.customerName} onChange={e => setFormData(prev => ({
          ...prev,
          customerName: e.target.value
        }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.customerName ? 'border-red-300' : 'border-gray-300'}`} placeholder="Name des Kunden oder Unternehmens" />
          {errors.customerName && <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
              <AlertCircle className="w-4 h-4" />
              <span>{errors.customerName}</span>
            </p>}
        </div>

        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Briefcase className="w-4 h-4" />
            <span>Projektname *</span>
          </label>
          <input type="text" value={formData.projectName} onChange={e => setFormData(prev => ({
          ...prev,
          projectName: e.target.value
        }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.projectName ? 'border-red-300' : 'border-gray-300'}`} placeholder="Bezeichnung des Projekts" />
          {errors.projectName && <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
              <AlertCircle className="w-4 h-4" />
              <span>{errors.projectName}</span>
            </p>}
        </div>

        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4" />
            <span>Projektbeginn *</span>
          </label>
          <input type="date" value={formData.projectStart} onChange={e => setFormData(prev => ({
          ...prev,
          projectStart: e.target.value
        }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.projectStart ? 'border-red-300' : 'border-gray-300'}`} />
          {errors.projectStart && <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
              <AlertCircle className="w-4 h-4" />
              <span>{errors.projectStart}</span>
            </p>}
        </div>

        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4" />
            <span>Projektende *</span>
          </label>
          <input type="date" value={formData.projectEnd} onChange={e => setFormData(prev => ({
          ...prev,
          projectEnd: e.target.value
        }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.projectEnd ? 'border-red-300' : 'border-gray-300'}`} />
          {errors.projectEnd && <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
              <AlertCircle className="w-4 h-4" />
              <span>{errors.projectEnd}</span>
            </p>}
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4" />
            <span>Rolle im Projekt *</span>
          </label>
          <input type="text" value={formData.roleInProject} onChange={e => setFormData(prev => ({
          ...prev,
          roleInProject: e.target.value
        }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.roleInProject ? 'border-red-300' : 'border-gray-300'}`} placeholder="z.B. Senior Frontend Developer, Technical Lead, UX Designer" />
          {errors.roleInProject && <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
              <AlertCircle className="w-4 h-4" />
              <span>{errors.roleInProject}</span>
            </p>}
        </div>

        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Users className="w-4 h-4" />
            <span>Teamgröße</span>
          </label>
          <input type="number" min="1" value={formData.teamSize || ''} onChange={e => setFormData(prev => ({
          ...prev,
          teamSize: e.target.value ? parseInt(e.target.value) : undefined
        }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Anzahl Teammitglieder" />
        </div>

        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Building2 className="w-4 h-4" />
            <span>Branche</span>
          </label>
          <input type="text" value={formData.industry || ''} onChange={e => setFormData(prev => ({
          ...prev,
          industry: e.target.value
        }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="z.B. Finanzdienstleistungen, E-Commerce, Healthcare" />
        </div>
      </div>
    </div>;
  const renderStep2 = () => <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Projektbeschreibung</h3>
        <p className="text-sm text-gray-600">Beschreiben Sie das Projekt und die Herausforderungen</p>
      </div>

      <div>
        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
          <FileText className="w-4 h-4" />
          <span>Projektbeschreibung *</span>
        </label>
        <textarea value={formData.projectDescription} onChange={e => setFormData(prev => ({
        ...prev,
        projectDescription: e.target.value
      }))} rows={4} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.projectDescription ? 'border-red-300' : 'border-gray-300'}`} placeholder="Detaillierte Beschreibung des Projekts, der Ziele und des Kontexts" />
        {errors.projectDescription && <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
            <AlertCircle className="w-4 h-4" />
            <span>{errors.projectDescription}</span>
          </p>}
      </div>

      {renderArrayInput('challenges', 'Herausforderungen', 'Beschreiben Sie eine Herausforderung', <AlertCircle className="w-4 h-4" />)}
    </div>;
  const renderStep3 = () => <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Tätigkeiten und Fähigkeiten</h3>
        <p className="text-sm text-gray-600">Erfassen Sie Ihre Aktivitäten und eingesetzten Skills</p>
      </div>

      <div className="space-y-6">
        {renderArrayInput('activities', 'Tätigkeiten im Projekt', 'Beschreiben Sie eine Tätigkeit', <Target className="w-4 h-4" />)}
        {renderArrayInput('technicalSkills', 'Eingesetzte technische Skills', 'z.B. React, TypeScript, AWS', <Code className="w-4 h-4" />)}
        {renderArrayInput('softSkills', 'Eingesetzte Fähigkeiten', 'z.B. Teamführung, Kommunikation, Problemlösung', <Star className="w-4 h-4" />)}
        {renderArrayInput('technologies', 'Verwendete Technologien', 'z.B. Docker, Kubernetes, PostgreSQL', <Code className="w-4 h-4" />)}
      </div>
    </div>;
  const renderStep4 = () => <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Ergebnisse und Learnings</h3>
        <p className="text-sm text-gray-600">Dokumentieren Sie die Projektergebnisse und gewonnenen Erkenntnisse</p>
      </div>

      <div className="space-y-6">
        {renderArrayInput('outcomes', 'Projektergebnisse (Outcomes)', 'Beschreiben Sie ein konkretes Ergebnis', <TrendingUp className="w-4 h-4" />)}
        {renderArrayInput('learnings', 'Gewonnene Erkenntnisse', 'Was haben Sie aus diesem Projekt gelernt?', <Award className="w-4 h-4" />)}
      </div>
    </div>;
  const renderStep5 = () => <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Testimonials</h3>
        <p className="text-sm text-gray-600">Erfassen Sie Feedback von Kunden und Projektleitern</p>
      </div>

      <div className="space-y-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="flex items-center space-x-2 text-sm font-medium text-blue-900 mb-4">
            <Quote className="w-4 h-4" />
            <span>Kundentestimonial</span>
          </h4>
          <div className="space-y-3">
            <textarea value={formData.customerTestimonial.text} onChange={e => setFormData(prev => ({
            ...prev,
            customerTestimonial: {
              ...prev.customerTestimonial,
              text: e.target.value
            }
          }))} rows={3} className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="Zitat oder Feedback des Kunden" />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={formData.customerTestimonial.author} onChange={e => setFormData(prev => ({
              ...prev,
              customerTestimonial: {
                ...prev.customerTestimonial,
                author: e.target.value
              }
            }))} className="px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="Name des Kunden" />
              <input type="text" value={formData.customerTestimonial.position} onChange={e => setFormData(prev => ({
              ...prev,
              customerTestimonial: {
                ...prev.customerTestimonial,
                position: e.target.value
              }
            }))} className="px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="Position/Titel" />
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="flex items-center space-x-2 text-sm font-medium text-green-900 mb-4">
            <MessageSquare className="w-4 h-4" />
            <span>Projektleiter Testimonial</span>
          </h4>
          <div className="space-y-3">
            <textarea value={formData.projectManagerTestimonial.text} onChange={e => setFormData(prev => ({
            ...prev,
            projectManagerTestimonial: {
              ...prev.projectManagerTestimonial,
              text: e.target.value
            }
          }))} rows={3} className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white" placeholder="Feedback des Projektleiters oder Vorgesetzten" />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={formData.projectManagerTestimonial.author} onChange={e => setFormData(prev => ({
              ...prev,
              projectManagerTestimonial: {
                ...prev.projectManagerTestimonial,
                author: e.target.value
              }
            }))} className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white" placeholder="Name des Projektleiters" />
              <input type="text" value={formData.projectManagerTestimonial.position} onChange={e => setFormData(prev => ({
              ...prev,
              projectManagerTestimonial: {
                ...prev.projectManagerTestimonial,
                position: e.target.value
              }
            }))} className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white" placeholder="Position/Titel" />
            </div>
          </div>
        </div>
      </div>
    </div>;
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return renderStep1();
    }
  };
  return <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {title || (mode === 'history' ? 'Projekt zur Historie hinzufügen' : 'Geplantes Projekt erstellen')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Erfassen Sie alle wichtigen Projektinformationen für eine vollständige Dokumentation
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 bg-gray-50">
          {renderStepIndicator()}
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[60vh]">
          {renderCurrentStep()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Schritt {currentStep} von {totalSteps}
            </div>
            <div className="flex items-center space-x-3">
              {currentStep > 1 && <button onClick={handlePrevious} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Zurück
                </button>}
              {currentStep < totalSteps ? <button onClick={handleNext} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Weiter
                </button> : <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                  <Save className="w-4 h-4" />
                  <span>Projekt speichern</span>
                </button>}
            </div>
          </div>
        </div>
      </div>
    </div>;
}