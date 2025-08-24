"use client";

import React, { useState } from 'react';
import { X, Save, ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Plus, Minus, Building2, Calendar, User, FileText, Target, Award, MessageSquare, Briefcase, Code, Users, TrendingUp, Star, Quote, DollarSign, Phone, Mail, MapPin, Clock, Percent, AlertTriangle, Eye, Settings } from 'lucide-react';

// TypeScript Interfaces
export interface ProjectOrigin {
  source: 'jira-ticket' | 'sales' | 'intern';
  jiraTicketNumber?: string;
  jiraContactPerson?: string;
  salesContactPerson?: string;
  internalRequestor?: string;
}
export interface ProjectBasicInfo {
  customerName: string;
  projectName: string;
  projectDescription: string;
  projectStartDate: string;
  projectEndDate: string;
  dailyRate: number;
  projectProbability: '25' | '50' | '75' | '100';
  projectType: 'existing' | 'new';
}
export interface ContactPersons {
  customerContact: {
    name: string;
    email: string;
    phone: string;
  };
  internalProjectContact: string;
  salesContact: string;
}
export interface TeamMember {
  id: string;
  employeeId: string;
  plannedRole: string;
  requiredActivities: string[];
  requiredSkills: string[];
}
export interface ProjectCreationData {
  origin: ProjectOrigin;
  basicInfo: ProjectBasicInfo;
  contactPersons: ContactPersons;
  teamMembers: TeamMember[];
  createdAt: string;
  createdBy: string;
}
interface ProjectCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: ProjectCreationData) => void;
  initialData?: Partial<ProjectCreationData>;
}

// Mock data for dropdowns
const salesTeamMembers = [{
  id: 'sales-1',
  name: 'Sarah Mueller',
  email: 's.mueller@company.de'
}, {
  id: 'sales-2',
  name: 'Thomas Weber',
  email: 't.weber@company.de'
}, {
  id: 'sales-3',
  name: 'Anna Schmidt',
  email: 'a.schmidt@company.de'
}, {
  id: 'sales-4',
  name: 'Michael Johnson',
  email: 'm.johnson@company.de'
}];
const employees = [{
  id: 'emp-1',
  name: 'Max Mustermann',
  role: 'Senior Frontend Developer'
}, {
  id: 'emp-2',
  name: 'Lisa Hoffmann',
  role: 'UX Designer'
}, {
  id: 'emp-3',
  name: 'Peter Klein',
  role: 'Backend Developer'
}, {
  id: 'emp-4',
  name: 'Maria Schneider',
  role: 'Data Scientist'
}, {
  id: 'emp-5',
  name: 'Jonas Müller',
  role: 'Full Stack Developer'
}, {
  id: 'emp-6',
  name: 'Emma Fischer',
  role: 'Project Manager'
}, {
  id: 'emp-7',
  name: 'Alexander Berg',
  role: 'DevOps Engineer'
}, {
  id: 'emp-8',
  name: 'Sophie Wagner',
  role: 'QA Engineer'
}];
const initialProjectData: ProjectCreationData = {
  origin: {
    source: 'jira-ticket',
    jiraTicketNumber: '',
    jiraContactPerson: '',
    salesContactPerson: '',
    internalRequestor: ''
  },
  basicInfo: {
    customerName: '',
    projectName: '',
    projectDescription: '',
    projectStartDate: '',
    projectEndDate: '',
    dailyRate: 0,
    projectProbability: '50',
    projectType: 'new'
  },
  contactPersons: {
    customerContact: {
      name: '',
      email: '',
      phone: ''
    },
    internalProjectContact: '',
    salesContact: ''
  },
  teamMembers: [],
  createdAt: new Date().toISOString(),
  createdBy: 'Current User'
};
export default function ProjectCreationWizard({
  isOpen,
  onClose,
  onSave,
  initialData
}: ProjectCreationWizardProps) {
  const [formData, setFormData] = useState<ProjectCreationData>({
    ...initialProjectData,
    ...initialData
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const totalSteps = 5;
  if (!isOpen) return null;
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    switch (step) {
      case 1:
        if (!formData.origin.source) newErrors.source = 'Projektherkunft ist erforderlich';
        if (formData.origin.source === 'jira-ticket' && !formData.origin.jiraTicketNumber?.trim()) {
          newErrors.jiraTicketNumber = 'Jira-Ticket-Nummer ist erforderlich';
        }
        if (formData.origin.source === 'jira-ticket' && !formData.origin.jiraContactPerson?.trim()) {
          newErrors.jiraContactPerson = 'Jira-Ansprechpartner ist erforderlich';
        }
        if (formData.origin.source === 'sales' && !formData.origin.salesContactPerson?.trim()) {
          newErrors.salesContactPerson = 'Sales-Ansprechpartner ist erforderlich';
        }
        if (formData.origin.source === 'intern' && !formData.origin.internalRequestor?.trim()) {
          newErrors.internalRequestor = 'Interner Anforderer ist erforderlich';
        }
        break;
      case 2:
        if (!formData.basicInfo.customerName.trim()) newErrors.customerName = 'Kundenname ist erforderlich';
        if (!formData.basicInfo.projectName.trim()) newErrors.projectName = 'Projektname ist erforderlich';
        if (!formData.basicInfo.projectDescription.trim()) newErrors.projectDescription = 'Projektbeschreibung ist erforderlich';
        if (!formData.basicInfo.projectStartDate) newErrors.projectStartDate = 'Projektstart ist erforderlich';
        if (!formData.basicInfo.projectEndDate) newErrors.projectEndDate = 'Projektende ist erforderlich';
        if (formData.basicInfo.dailyRate <= 0) newErrors.dailyRate = 'Tagessatz muss größer als 0 sein';
        break;
      case 3:
        if (!formData.contactPersons.customerContact.name.trim()) newErrors.customerContactName = 'Kundenansprechpartner ist erforderlich';
        if (!formData.contactPersons.customerContact.email.trim()) newErrors.customerContactEmail = 'E-Mail ist erforderlich';
        if (!formData.contactPersons.internalProjectContact.trim()) newErrors.internalProjectContact = 'Interner Projektansprechpartner ist erforderlich';
        if (!formData.contactPersons.salesContact.trim()) newErrors.salesContact = 'Sales-Ansprechpartner ist erforderlich';
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
  const handleStepClick = (step: number) => {
    if (step < currentStep || validateStep(currentStep)) {
      setCurrentStep(step);
    }
  };
  const handleSave = async () => {
    if (!validateStep(currentStep)) return;
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const finalData = {
        ...formData,
        createdAt: new Date().toISOString(),
        createdBy: 'Current User'
      };
      onSave(finalData);
      onClose();
      setCurrentStep(1);
      setFormData({
        ...initialProjectData,
        ...initialData
      });
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const addTeamMember = () => {
    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      employeeId: '',
      plannedRole: '',
      requiredActivities: [''],
      requiredSkills: ['']
    };
    setFormData(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, newMember]
    }));
  };
  const removeTeamMember = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter(member => member.id !== memberId)
    }));
  };
  const updateTeamMember = (memberId: string, field: keyof TeamMember, value: any) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.map(member => member.id === memberId ? {
        ...member,
        [field]: value
      } : member)
    }));
  };
  const addArrayItem = (memberId: string, field: 'requiredActivities' | 'requiredSkills') => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.map(member => member.id === memberId ? {
        ...member,
        [field]: [...member[field], '']
      } : member)
    }));
  };
  const removeArrayItem = (memberId: string, field: 'requiredActivities' | 'requiredSkills', index: number) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.map(member => member.id === memberId ? {
        ...member,
        [field]: member[field].filter((_, i) => i !== index)
      } : member)
    }));
  };
  const updateArrayItem = (memberId: string, field: 'requiredActivities' | 'requiredSkills', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.map(member => member.id === memberId ? {
        ...member,
        [field]: member[field].map((item, i) => i === index ? value : item)
      } : member)
    }));
  };
  const renderStepIndicator = () => <div className="flex items-center justify-center space-x-2 mb-8">
      {Array.from({
      length: totalSteps
    }, (_, i) => i + 1).map(step => <div key={step} className="flex items-center">
          <button onClick={() => handleStepClick(step)} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${step === currentStep ? 'bg-blue-600 text-white shadow-lg' : step < currentStep ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
            {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
          </button>
          {step < totalSteps && <div className={`w-12 h-0.5 mx-2 transition-colors ${step < currentStep ? 'bg-green-600' : 'bg-gray-200'}`} />}
        </div>)}
    </div>;
  const renderStep1 = () => <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Projektherkunft</h3>
        <p className="text-sm text-gray-600">Woher stammt die Projektanfrage?</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <span>Projektquelle *</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[{
            value: 'jira-ticket',
            label: 'Jira-Ticket',
            icon: <Target className="w-5 h-5" />
          }, {
            value: 'sales',
            label: 'Sales',
            icon: <TrendingUp className="w-5 h-5" />
          }, {
            value: 'intern',
            label: 'Intern',
            icon: <Building2 className="w-5 h-5" />
          }].map(option => <label key={option.value} className="relative">
                <input type="radio" name="source" value={option.value} checked={formData.origin.source === option.value} onChange={e => setFormData(prev => ({
              ...prev,
              origin: {
                ...prev.origin,
                source: e.target.value as any
              }
            }))} className="sr-only" />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.origin.source === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`${formData.origin.source === option.value ? 'text-blue-600' : 'text-gray-400'}`}>
                      {option.icon}
                    </div>
                    <span className="font-medium text-gray-900">{option.label}</span>
                  </div>
                </div>
              </label>)}
          </div>
          {errors.source && <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
              <AlertCircle className="w-4 h-4" />
              <span>{errors.source}</span>
            </p>}
        </div>

        {formData.origin.source === 'jira-ticket' && <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span>Jira-Ticket-Nummer *</span>
              </label>
              <input type="text" value={formData.origin.jiraTicketNumber || ''} onChange={e => setFormData(prev => ({
            ...prev,
            origin: {
              ...prev.origin,
              jiraTicketNumber: e.target.value
            }
          }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.jiraTicketNumber ? 'border-red-300' : 'border-gray-300'}`} placeholder="z.B. PROJ-1234" />
              {errors.jiraTicketNumber && <p className="mt-1 text-sm text-red-600">{errors.jiraTicketNumber}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span>Jira-Ansprechpartner *</span>
              </label>
              <input type="text" value={formData.origin.jiraContactPerson || ''} onChange={e => setFormData(prev => ({
            ...prev,
            origin: {
              ...prev.origin,
              jiraContactPerson: e.target.value
            }
          }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.jiraContactPerson ? 'border-red-300' : 'border-gray-300'}`} placeholder="Name des Ansprechpartners" />
              {errors.jiraContactPerson && <p className="mt-1 text-sm text-red-600">{errors.jiraContactPerson}</p>}
            </div>
          </div>}

        {formData.origin.source === 'sales' && <div className="p-4 bg-green-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span>Sales-Ansprechpartner *</span>
            </label>
            <select value={formData.origin.salesContactPerson || ''} onChange={e => setFormData(prev => ({
          ...prev,
          origin: {
            ...prev.origin,
            salesContactPerson: e.target.value
          }
        }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${errors.salesContactPerson ? 'border-red-300' : 'border-gray-300'}`}>
              <option value="">Sales-Mitarbeiter auswählen</option>
              {salesTeamMembers.map(member => <option key={member.id} value={member.name}>
                  {member.name} ({member.email})
                </option>)}
            </select>
            {errors.salesContactPerson && <p className="mt-1 text-sm text-red-600">{errors.salesContactPerson}</p>}
          </div>}

        {formData.origin.source === 'intern' && <div className="p-4 bg-purple-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span>Interner Anforderer *</span>
            </label>
            <input type="text" value={formData.origin.internalRequestor || ''} onChange={e => setFormData(prev => ({
          ...prev,
          origin: {
            ...prev.origin,
            internalRequestor: e.target.value
          }
        }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.internalRequestor ? 'border-red-300' : 'border-gray-300'}`} placeholder="Name des internen Anforderers" />
            {errors.internalRequestor && <p className="mt-1 text-sm text-red-600">{errors.internalRequestor}</p>}
          </div>}
      </div>
    </div>;
  const renderStep2 = () => <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Grundlegende Projektinformationen</h3>
        <p className="text-sm text-gray-600">Erfassen Sie die wichtigsten Projektdaten</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Building2 className="w-4 h-4" />
            <span>Kundenname *</span>
          </label>
          <input type="text" value={formData.basicInfo.customerName} onChange={e => setFormData(prev => ({
          ...prev,
          basicInfo: {
            ...prev.basicInfo,
            customerName: e.target.value
          }
        }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.customerName ? 'border-red-300' : 'border-gray-300'}`} placeholder="Name des Kunden oder Unternehmens" />
          {errors.customerName && <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>}
        </div>

        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Briefcase className="w-4 h-4" />
            <span>Projektname *</span>
          </label>
          <input type="text" value={formData.basicInfo.projectName} onChange={e => setFormData(prev => ({
          ...prev,
          basicInfo: {
            ...prev.basicInfo,
            projectName: e.target.value
          }
        }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.projectName ? 'border-red-300' : 'border-gray-300'}`} placeholder="Bezeichnung des Projekts" />
          {errors.projectName && <p className="mt-1 text-sm text-red-600">{errors.projectName}</p>}
        </div>

        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4" />
            <span>Projektstart *</span>
          </label>
          <input type="date" value={formData.basicInfo.projectStartDate} onChange={e => setFormData(prev => ({
          ...prev,
          basicInfo: {
            ...prev.basicInfo,
            projectStartDate: e.target.value
          }
        }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.projectStartDate ? 'border-red-300' : 'border-gray-300'}`} />
          {errors.projectStartDate && <p className="mt-1 text-sm text-red-600">{errors.projectStartDate}</p>}
        </div>

        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4" />
            <span>Projektende *</span>
          </label>
          <input type="date" value={formData.basicInfo.projectEndDate} onChange={e => setFormData(prev => ({
          ...prev,
          basicInfo: {
            ...prev.basicInfo,
            projectEndDate: e.target.value
          }
        }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.projectEndDate ? 'border-red-300' : 'border-gray-300'}`} />
          {errors.projectEndDate && <p className="mt-1 text-sm text-red-600">{errors.projectEndDate}</p>}
        </div>

        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="w-4 h-4" />
            <span>Tagessatz (EUR) *</span>
          </label>
          <input type="number" min="0" step="50" value={formData.basicInfo.dailyRate} onChange={e => setFormData(prev => ({
          ...prev,
          basicInfo: {
            ...prev.basicInfo,
            dailyRate: parseFloat(e.target.value) || 0
          }
        }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.dailyRate ? 'border-red-300' : 'border-gray-300'}`} placeholder="z.B. 800" />
          {errors.dailyRate && <p className="mt-1 text-sm text-red-600">{errors.dailyRate}</p>}
        </div>

        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Percent className="w-4 h-4" />
            <span>Projektwahrscheinlichkeit</span>
          </label>
          <select value={formData.basicInfo.projectProbability} onChange={e => setFormData(prev => ({
          ...prev,
          basicInfo: {
            ...prev.basicInfo,
            projectProbability: e.target.value as any
          }
        }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
            <option value="25">25% - Prospect</option>
            <option value="50">50% - Angeboten</option>
            <option value="75">75% - Geplant</option>
            <option value="100">100% - Beauftragt</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <span>Projekttyp</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{
          value: 'existing',
          label: 'Bestehendes Projekt',
          description: 'Erweiterung oder Wartung eines bestehenden Systems'
        }, {
          value: 'new',
          label: 'Neues Projekt',
          description: 'Komplett neues Projekt oder System'
        }].map(option => <label key={option.value} className="relative">
              <input type="radio" name="projectType" value={option.value} checked={formData.basicInfo.projectType === option.value} onChange={e => setFormData(prev => ({
            ...prev,
            basicInfo: {
              ...prev.basicInfo,
              projectType: e.target.value as any
            }
          }))} className="sr-only" />
              <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.basicInfo.projectType === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="font-medium text-gray-900 mb-1">{option.label}</div>
                <div className="text-sm text-gray-600">{option.description}</div>
              </div>
            </label>)}
        </div>
      </div>

      <div>
        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
          <FileText className="w-4 h-4" />
          <span>Projektbeschreibung *</span>
        </label>
        <textarea value={formData.basicInfo.projectDescription} onChange={e => setFormData(prev => ({
        ...prev,
        basicInfo: {
          ...prev.basicInfo,
          projectDescription: e.target.value
        }
      }))} rows={4} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.projectDescription ? 'border-red-300' : 'border-gray-300'}`} placeholder="Detaillierte Beschreibung des Projekts, der Ziele und des Kontexts" />
        {errors.projectDescription && <p className="mt-1 text-sm text-red-600">{errors.projectDescription}</p>}
      </div>
    </div>;
  const renderStep3 = () => <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Ansprechpartner</h3>
        <p className="text-sm text-gray-600">Definieren Sie die wichtigsten Kontaktpersonen</p>
      </div>

      <div className="space-y-8">
        {/* Customer Contact */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h4 className="flex items-center space-x-2 text-lg font-medium text-blue-900 mb-4">
            <Building2 className="w-5 h-5" />
            <span>Kundenansprechpartner</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span>Name *</span>
              </label>
              <input type="text" value={formData.contactPersons.customerContact.name} onChange={e => setFormData(prev => ({
              ...prev,
              contactPersons: {
                ...prev.contactPersons,
                customerContact: {
                  ...prev.contactPersons.customerContact,
                  name: e.target.value
                }
              }
            }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${errors.customerContactName ? 'border-red-300' : 'border-gray-300'}`} placeholder="Vor- und Nachname" />
              {errors.customerContactName && <p className="mt-1 text-sm text-red-600">{errors.customerContactName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span>E-Mail *</span>
              </label>
              <input type="email" value={formData.contactPersons.customerContact.email} onChange={e => setFormData(prev => ({
              ...prev,
              contactPersons: {
                ...prev.contactPersons,
                customerContact: {
                  ...prev.contactPersons.customerContact,
                  email: e.target.value
                }
              }
            }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${errors.customerContactEmail ? 'border-red-300' : 'border-gray-300'}`} placeholder="email@kunde.de" />
              {errors.customerContactEmail && <p className="mt-1 text-sm text-red-600">{errors.customerContactEmail}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span>Telefon</span>
              </label>
              <input type="tel" value={formData.contactPersons.customerContact.phone} onChange={e => setFormData(prev => ({
              ...prev,
              contactPersons: {
                ...prev.contactPersons,
                customerContact: {
                  ...prev.contactPersons.customerContact,
                  phone: e.target.value
                }
              }
            }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="+49 123 456789" />
            </div>
          </div>
        </div>

        {/* Internal Project Contact */}
        <div className="bg-green-50 rounded-lg p-6">
          <h4 className="flex items-center space-x-2 text-lg font-medium text-green-900 mb-4">
            <User className="w-5 h-5" />
            <span>Interner Projektansprechpartner</span>
          </h4>
          <select value={formData.contactPersons.internalProjectContact} onChange={e => setFormData(prev => ({
          ...prev,
          contactPersons: {
            ...prev.contactPersons,
            internalProjectContact: e.target.value
          }
        }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${errors.internalProjectContact ? 'border-red-300' : 'border-gray-300'}`}>
            <option value="">Mitarbeiter auswählen</option>
            {employees.map(employee => <option key={employee.id} value={employee.name}>
                {employee.name} - {employee.role}
              </option>)}
          </select>
          {errors.internalProjectContact && <p className="mt-1 text-sm text-red-600">{errors.internalProjectContact}</p>}
        </div>

        {/* Sales Contact */}
        <div className="bg-purple-50 rounded-lg p-6">
          <h4 className="flex items-center space-x-2 text-lg font-medium text-purple-900 mb-4">
            <TrendingUp className="w-5 h-5" />
            <span>Sales-Ansprechpartner</span>
          </h4>
          <select value={formData.contactPersons.salesContact} onChange={e => setFormData(prev => ({
          ...prev,
          contactPersons: {
            ...prev.contactPersons,
            salesContact: e.target.value
          }
        }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${errors.salesContact ? 'border-red-300' : 'border-gray-300'}`}>
            <option value="">Sales-Mitarbeiter auswählen</option>
            {salesTeamMembers.map(member => <option key={member.id} value={member.name}>
                {member.name} ({member.email})
              </option>)}
          </select>
          {errors.salesContact && <p className="mt-1 text-sm text-red-600">{errors.salesContact}</p>}
        </div>
      </div>
    </div>;
  const renderStep4 = () => <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Team-Zuordnung</h3>
        <p className="text-sm text-gray-600">Weisen Sie Mitarbeiter dem Projekt zu und definieren Sie deren Rollen</p>
      </div>

      <div className="space-y-6">
        {formData.teamMembers.length === 0 ? <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Noch keine Teammitglieder</h4>
            <p className="text-gray-600 mb-4">Fügen Sie Mitarbeiter zum Projektteam hinzu</p>
            <button onClick={addTeamMember} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto">
              <Plus className="w-4 h-4" />
              <span>Erstes Teammitglied hinzufügen</span>
            </button>
          </div> : <div className="space-y-4">
            {formData.teamMembers.map((member, index) => <div key={member.id} className="border border-gray-200 rounded-lg p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">
                    Teammitglied {index + 1}
                  </h4>
                  <button onClick={() => removeTeamMember(member.id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span>Mitarbeiter auswählen</span>
                    </label>
                    <select value={member.employeeId} onChange={e => updateTeamMember(member.id, 'employeeId', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                      <option value="">Mitarbeiter auswählen</option>
                      {employees.map(employee => <option key={employee.id} value={employee.id}>
                          {employee.name} - {employee.role}
                        </option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span>Geplante Rolle im Projekt</span>
                    </label>
                    <input type="text" value={member.plannedRole} onChange={e => updateTeamMember(member.id, 'plannedRole', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="z.B. Frontend Lead, UX Designer" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span>Erforderliche Tätigkeiten</span>
                    </label>
                    <div className="space-y-2">
                      {member.requiredActivities.map((activity, actIndex) => <div key={actIndex} className="flex items-center space-x-2">
                          <input type="text" value={activity} onChange={e => updateArrayItem(member.id, 'requiredActivities', actIndex, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Beschreiben Sie eine Tätigkeit" />
                          {member.requiredActivities.length > 1 && <button onClick={() => removeArrayItem(member.id, 'requiredActivities', actIndex)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                              <Minus className="w-4 h-4" />
                            </button>}
                        </div>)}
                      <button onClick={() => addArrayItem(member.id, 'requiredActivities')} className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors text-sm">
                        <Plus className="w-4 h-4" />
                        <span>Weitere Tätigkeit hinzufügen</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span>Erforderliche Fähigkeiten</span>
                    </label>
                    <div className="space-y-2">
                      {member.requiredSkills.map((skill, skillIndex) => <div key={skillIndex} className="flex items-center space-x-2">
                          <input type="text" value={skill} onChange={e => updateArrayItem(member.id, 'requiredSkills', skillIndex, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="z.B. React, TypeScript, Kommunikation" />
                          {member.requiredSkills.length > 1 && <button onClick={() => removeArrayItem(member.id, 'requiredSkills', skillIndex)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                              <Minus className="w-4 h-4" />
                            </button>}
                        </div>)}
                      <button onClick={() => addArrayItem(member.id, 'requiredSkills')} className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors text-sm">
                        <Plus className="w-4 h-4" />
                        <span>Weitere Fähigkeit hinzufügen</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>)}

            <button onClick={addTeamMember} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Weiteres Teammitglied hinzufügen</span>
            </button>
          </div>}
      </div>
    </div>;
  const renderStep5 = () => <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Zusammenfassung & Bestätigung</h3>
        <p className="text-sm text-gray-600">Überprüfen Sie alle Angaben vor der finalen Erstellung</p>
      </div>

      <div className="space-y-6">
        {/* Project Origin Summary */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Projektherkunft</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Quelle:</span>
              <span className="ml-2 text-gray-900">
                {formData.origin.source === 'jira-ticket' ? 'Jira-Ticket' : formData.origin.source === 'sales' ? 'Sales' : 'Intern'}
              </span>
            </div>
            {formData.origin.source === 'jira-ticket' && <>
                <div>
                  <span className="font-medium text-gray-700">Ticket-Nr.:</span>
                  <span className="ml-2 text-gray-900">{formData.origin.jiraTicketNumber}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Ansprechpartner:</span>
                  <span className="ml-2 text-gray-900">{formData.origin.jiraContactPerson}</span>
                </div>
              </>}
            {formData.origin.source === 'sales' && <div>
                <span className="font-medium text-gray-700">Sales-Kontakt:</span>
                <span className="ml-2 text-gray-900">{formData.origin.salesContactPerson}</span>
              </div>}
            {formData.origin.source === 'intern' && <div>
                <span className="font-medium text-gray-700">Anforderer:</span>
                <span className="ml-2 text-gray-900">{formData.origin.internalRequestor}</span>
              </div>}
          </div>
        </div>

        {/* Basic Info Summary */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h4 className="text-lg font-medium text-blue-900 mb-4 flex items-center space-x-2">
            <Briefcase className="w-5 h-5" />
            <span>Projektinformationen</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Kunde:</span>
              <span className="ml-2 text-gray-900">{formData.basicInfo.customerName}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Projekt:</span>
              <span className="ml-2 text-gray-900">{formData.basicInfo.projectName}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Zeitraum:</span>
              <span className="ml-2 text-gray-900">
                {new Date(formData.basicInfo.projectStartDate).toLocaleDateString('de-DE')} - {' '}
                {new Date(formData.basicInfo.projectEndDate).toLocaleDateString('de-DE')}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Tagessatz:</span>
              <span className="ml-2 text-gray-900">{formData.basicInfo.dailyRate.toLocaleString('de-DE')} €</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Wahrscheinlichkeit:</span>
              <span className="ml-2 text-gray-900">{formData.basicInfo.projectProbability}%</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Typ:</span>
              <span className="ml-2 text-gray-900">
                {formData.basicInfo.projectType === 'existing' ? 'Bestehendes Projekt' : 'Neues Projekt'}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <span className="font-medium text-gray-700">Beschreibung:</span>
            <p className="mt-1 text-gray-900 text-sm leading-relaxed">{formData.basicInfo.projectDescription}</p>
          </div>
        </div>

        {/* Contact Persons Summary */}
        <div className="bg-green-50 rounded-lg p-6">
          <h4 className="text-lg font-medium text-green-900 mb-4 flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Ansprechpartner</span>
          </h4>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-gray-700">Kunde:</span>
              <span className="ml-2 text-gray-900">
                {formData.contactPersons.customerContact.name} ({formData.contactPersons.customerContact.email})
                {formData.contactPersons.customerContact.phone && `, ${formData.contactPersons.customerContact.phone}`}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Intern:</span>
              <span className="ml-2 text-gray-900">{formData.contactPersons.internalProjectContact}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Sales:</span>
              <span className="ml-2 text-gray-900">{formData.contactPersons.salesContact}</span>
            </div>
          </div>
        </div>

        {/* Team Members Summary */}
        {formData.teamMembers.length > 0 && <div className="bg-purple-50 rounded-lg p-6">
            <h4 className="text-lg font-medium text-purple-900 mb-4 flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Teammitglieder ({formData.teamMembers.length})</span>
            </h4>
            <div className="space-y-4">
              {formData.teamMembers.map((member, index) => {
            const employee = employees.find(emp => emp.id === member.employeeId);
            return <div key={member.id} className="bg-white rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {employee ? employee.name : 'Nicht ausgewählt'}
                      </span>
                      <span className="text-sm text-gray-600">{member.plannedRole}</span>
                    </div>
                    {member.requiredActivities.filter(a => a.trim()).length > 0 && <div className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Tätigkeiten:</span> {member.requiredActivities.filter(a => a.trim()).join(', ')}
                      </div>}
                    {member.requiredSkills.filter(s => s.trim()).length > 0 && <div className="text-sm text-gray-600">
                        <span className="font-medium">Fähigkeiten:</span> {member.requiredSkills.filter(s => s.trim()).join(', ')}
                      </div>}
                  </div>;
          })}
            </div>
          </div>}

        {/* Validation Summary */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h5 className="font-medium text-yellow-800 mb-1">Wichtige Hinweise</h5>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Alle Pflichtfelder wurden ausgefüllt</li>
                <li>• Das Projekt wird nach der Erstellung im System verfügbar sein</li>
                <li>• Alle Beteiligten erhalten eine Benachrichtigung per E-Mail</li>
                <li>• Änderungen können später über die Projektverwaltung vorgenommen werden</li>
              </ul>
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
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Projekt-Erstellungs-Assistent
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Erstellen Sie ein neues Projekt mit allen erforderlichen Informationen
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 bg-gray-50 flex-shrink-0">
          {renderStepIndicator()}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {renderCurrentStep()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Schritt {currentStep} von {totalSteps}
            </div>
            <div className="flex items-center space-x-3">
              {currentStep > 1 && <button onClick={handlePrevious} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Zurück</span>
                </button>}
              {currentStep < totalSteps ? <button onClick={handleNext} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                  <span>Weiter</span>
                  <ArrowRight className="w-4 h-4" />
                </button> : <button onClick={handleSave} disabled={isLoading} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isLoading ? <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Wird erstellt...</span>
                    </> : <>
                      <Save className="w-4 h-4" />
                      <span>Projekt erstellen</span>
                    </>}
                </button>}
            </div>
          </div>
        </div>
      </div>
    </div>;
}