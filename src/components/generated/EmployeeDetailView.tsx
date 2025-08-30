"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, User, Mail, MapPin, Calendar, Clock, Star, TrendingUp, MessageSquare, Edit3, Video, UserPlus, FileText, ChevronDown, ChevronUp, Award, Edit, Trash2, Plus, ThumbsUp, ThumbsDown, Briefcase, Building, Pencil, Grid3X3, List, BarChart3, Heart, Download, AlertCircle, Database, Globe, BookOpen, GraduationCap, Shield, Code, Target, Users, Layers, Settings, Eye, Phone, Home, Cake, UserCheck } from 'lucide-react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

import { useAuth } from '../../contexts/AuthContext';

export interface EmployeeDetailViewProps {
  employeeId: string;
  onBack: () => void;
}

export default function EmployeeDetailView({
  employeeId,
  onBack
}: EmployeeDetailViewProps) {
  const { token } = useAuth();
  
  // 🆕 PROFILER DATA: State für profilerData Collection
  const [profilerData, setProfilerData] = useState<any>(null);
  const [profilerLoading, setProfilerLoading] = useState(true);
  const [profilerError, setProfilerError] = useState<string | null>(null);
  
  // 🆕 UI STATE: Expandable sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basicInfo: true,
    skills: true,
    projects: true,
    certifications: false,
    languages: false,
    education: false,
    professionalExperience: false,
    systemData: false
  });
  
  // 🆕 PROFILER DATA: Lade profilerData für employeeId
  useEffect(() => {
    const loadProfilerData = async () => {
      try {
        setProfilerLoading(true);
        setProfilerError(null);
        
        console.log('🔄 Loading fresh profiler data from Firestore for:', employeeId);
        
        const profilerCollection = collection(db, 'profilerData');
        const snapshot = await getDocs(profilerCollection);
        
        let foundProfilerData = null;
        snapshot.forEach((doc) => {
          // Suche nach employeeId in verschiedenen Feldern
          const data = doc.data();
          if (doc.id === employeeId || 
              data.employeeId === employeeId || 
              data.firebaseDocumentId === employeeId ||
              data.globalExternalId === employeeId) {
            foundProfilerData = {
              id: doc.id,
              ...data
            };
          }
        });
        
        if (foundProfilerData) {
          console.log('✅ Profiler data found:', foundProfilerData);
          setProfilerData(foundProfilerData);
        } else {
          console.log('❌ No profiler data found for employeeId:', employeeId);
          setProfilerError('Keine Profiler-Daten für diesen Mitarbeiter gefunden');
        }
        
      } catch (error) {
        console.error('❌ Error loading profiler data:', error);
        setProfilerError('Fehler beim Laden der Profiler-Daten');
      } finally {
        setProfilerLoading(false);
      }
    };
    
    if (employeeId) {
      loadProfilerData();
    }
  }, [employeeId]);
  
  // 🆕 PROFILER DATA: Extrahiere Daten aus profilerData
  const personName = useMemo(() => {
    if (!profilerData) return '';
    
    // Priorität: name > firstName + lastName > 'Unbekannt'
    if (profilerData.name) return profilerData.name;
    
    const firstName = profilerData.user?.employee?.personalData?.firstName || '';
    const lastName = profilerData.user?.employee?.personalData?.lastName || '';
    if (firstName || lastName) return `${firstName} ${lastName}`.trim();
    
    return 'Unbekannter Mitarbeiter';
  }, [profilerData]);
  
  const meta = useMemo(() => {
    if (!profilerData) return null;
    
    const employmentInfo = profilerData.user?.employee?.employmentInformation;
    
    return {
      team: employmentInfo?.teamName || '',
      cc: employmentInfo?.competenceCenter || '',
      lbs: employmentInfo?.careerLevel || employmentInfo?.careerStage || '',
      standort: employmentInfo?.location || '',
      startDate: employmentInfo?.dateOfEntry || '',
      email: profilerData.email || profilerData.user?.employee?.personalData?.email || '',
      utilizationComment: '', // Nicht in profilerData verfügbar
      planningComment: '' // Nicht in profilerData verfügbar
    };
  }, [profilerData]);
  
  // 🆕 PROFILER DATA: Extrahiere Skills aus profilerData
  const assignedTechnicalSkills = useMemo(() => {
    if (!profilerData?.skills) return [];
    
    return profilerData.skills.map((skill: any) => {
      // 🛠️ SICHERER SKILL-NAME: Behandle sowohl String als auch mehrsprachige Objekte
      let skillName = 'Unbekannter Skill';
      
      if (typeof skill.name === 'string') {
        skillName = skill.name;
      } else if (typeof skill.name === 'object' && skill.name !== null) {
        // Mehrsprachiges Objekt - verwende deutsche Version mit Fallbacks
        skillName = skill.name.de || skill.name.en || skill.name.tr || skill.name.hu || 'Unbekannter Skill';
      }
      
      return {
        id: skill.id || skill.skillId,
        skillId: skill.skillId,
        skillName: skillName,
        level: skill.rating || 0,
        assignedAt: skill.lastUsedInYear,
        lastUpdated: skill.lastUsedInYear
      };
    });
  }, [profilerData]);
  
  // 🆕 UI HELPER: Toggle section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // 🆕 UI HELPER: Format date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Nicht verfügbar';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Ungültiges Datum';
    }
  };

  // 🆕 UI HELPER: Format project date from range object
  const formatProjectDate = (dateObj: any) => {
    if (!dateObj || typeof dateObj !== 'object') return 'Nicht verfügbar';
    
    // Handle nested range structure: { range: { start: { month: 10, year: 2024 } } }
    if (dateObj.range && dateObj.range.start) {
      const { month, year } = dateObj.range.start;
      if (month && year) {
        return `${String(month).padStart(2, '0')}/${year}`;
      }
    }
    
    // Handle direct start structure: { start: { month: 10, year: 2024 } }
    if (dateObj.start) {
      const { month, year } = dateObj.start;
      if (month && year) {
        return `${String(month).padStart(2, '0')}/${year}`;
      }
    }
    
    // Handle direct month/year: { month: 10, year: 2024 }
    if (dateObj.month && dateObj.year) {
      return `${String(dateObj.month).padStart(2, '0')}/${dateObj.year}`;
    }
    
    return 'Nicht verfügbar';
  };
  
  // 🆕 UI HELPER: Render multi-language value (for simple text)
  const renderMultiLanguageValue = (value: any): string => {
    if (!value) return 'Nicht verfügbar';
    
    let text = '';
    if (typeof value === 'string') {
      text = value;
    } else if (typeof value === 'object' && value !== null) {
      text = value.de || value.en || value.tr || value.hu || 'Nicht verfügbar';
    } else {
      text = String(value);
    }
    
    return text;
  };

  // 🆕 UI HELPER: Convert text with #%# to bullet points array
  const convertToBulletPoints = (value: any): string[] => {
    const text = renderMultiLanguageValue(value);
    if (!text || text === 'Nicht verfügbar') return [];
    
    // Split by #%# and clean up
    return text
      .split('#%#')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  };
  
  // 🆕 UI HELPER: Get auth method badge
  const getAuthMethodBadge = (method: string) => {
    const badges = {
      'token-auth': { color: 'bg-green-100 text-green-800', icon: Shield, label: 'Token' },
      'cookie-auth': { color: 'bg-blue-100 text-blue-800', icon: Globe, label: 'Cookie' },
      'mock-fallback': { color: 'bg-yellow-100 text-yellow-800', icon: Code, label: 'Mock' },
      'unknown': { color: 'bg-gray-100 text-gray-800', icon: User, label: 'Unbekannt' }
    };
    
    const badge = badges[method] || badges.unknown;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };
  
  // 🆕 PROFILER DATA: Loading State
  if (profilerLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Database className="w-12 h-12 animate-pulse text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Lade Profiler-Daten...</h2>
          <p className="text-gray-600">Mitarbeiter-ID: {employeeId}</p>
        </div>
      </div>
    );
  }
  
  // 🆕 PROFILER DATA: Error State
  if (profilerError || !profilerData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Keine Profiler-Daten gefunden</h2>
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <p className="text-gray-600 mb-4">
              {profilerError || 'Für diesen Mitarbeiter sind keine Profiler-Daten in der Datenbank verfügbar.'}
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p><strong>Mitarbeiter-ID:</strong> {employeeId}</p>
              <p><strong>Datenquelle:</strong> profilerData Collection</p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }
  
  // 🆕 PROFILER DATA: Success State - Zeige Mitarbeiter-Daten
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Zurück</span>
              </button>
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Mitarbeiter-Details</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Database className="w-4 h-4" />
              <span>Datenquelle: profilerData</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Card with Employee Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border p-8 mb-8"
        >
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{personName}</h2>
                  <p className="text-lg text-gray-600">{meta?.lbs || 'Position nicht verfügbar'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getAuthMethodBadge(profilerData?.authMethod || 'unknown')}
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                    ID: {employeeId}
                  </span>
                </div>
              </div>
              
              {/* Quick Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium text-gray-500">E-MAIL</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{meta?.email || 'Nicht verfügbar'}</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Building className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-medium text-gray-500">COMPETENCE CENTER</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{meta?.cc || 'Nicht verfügbar'}</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-medium text-gray-500">STANDORT</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{meta?.standort || 'Nicht verfügbar'}</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-medium text-gray-500">STARTDATUM</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{meta?.startDate || 'Nicht verfügbar'}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{profilerData?.skills?.length || 0}</p>
                <p className="text-sm text-gray-600">Skills</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{profilerData?.projects?.length || 0}</p>
                <p className="text-sm text-gray-600">Projekte</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{profilerData?.certifications?.length || 0}</p>
                <p className="text-sm text-gray-600">Zertifikate</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{profilerData?.languageRatings?.length || 0}</p>
                <p className="text-sm text-gray-600">Sprachen</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information Section */}
          <ExpandableSection
            title="Grunddaten"
            icon={User}
            isExpanded={expandedSections.basicInfo}
            onToggle={() => toggleSection('basicInfo')}
            count={null}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InfoCard
                icon={User}
                label="Vollständiger Name"
                value={personName}
              />
              <InfoCard
                icon={Mail}
                label="E-Mail Adresse"
                value={meta?.email}
              />
              <InfoCard
                icon={Phone}
                label="Employee ID"
                value={profilerData?.employeeId || profilerData?.user?.employee?.id}
              />
              <InfoCard
                icon={Building}
                label="Unternehmen"
                value={profilerData?.user?.employee?.employmentInformation?.company}
              />
              <InfoCard
                icon={Target}
                label="Line of Business"
                value={profilerData?.user?.employee?.employmentInformation?.lineOfBusiness}
              />
              <InfoCard
                icon={Users}
                label="Team"
                value={meta?.team}
              />
              <InfoCard
                icon={MapPin}
                label="Standort"
                value={meta?.standort}
              />
              <InfoCard
                icon={Calendar}
                label="Eintrittsdatum"
                value={meta?.startDate}
              />
              <InfoCard
                icon={UserCheck}
                label="Status"
                value={profilerData?.user?.employee?.employmentInformation?.active ? 'Aktiv' : 'Inaktiv'}
              />
            </div>
          </ExpandableSection>

          {/* Skills Section */}
          <ExpandableSection
            title="Skills & Kompetenzen"
            icon={Star}
            isExpanded={expandedSections.skills}
            onToggle={() => toggleSection('skills')}
            count={assignedTechnicalSkills.length}
          >
            {assignedTechnicalSkills.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignedTechnicalSkills.map((skill) => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Star}
                title="Keine Skills gefunden"
                description="Für diesen Mitarbeiter sind keine Skills in den Profiler-Daten verfügbar."
              />
            )}
          </ExpandableSection>

          {/* Projects Section */}
          <ExpandableSection
            title="Projekte"
            icon={Briefcase}
            isExpanded={expandedSections.projects}
            onToggle={() => toggleSection('projects')}
            count={profilerData?.projects?.length || 0}
          >
            {profilerData?.projects && profilerData.projects.length > 0 ? (
              <div className="space-y-4">
                {profilerData.projects.map((project: any, index: number) => (
                  <ProjectCard key={index} project={project} renderMultiLanguageValue={renderMultiLanguageValue} formatProjectDate={formatProjectDate} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Briefcase}
                title="Keine Projekte gefunden"
                description="Für diesen Mitarbeiter sind keine Projekte in den Profiler-Daten verfügbar."
              />
            )}
          </ExpandableSection>

          {/* Certifications Section */}
          <ExpandableSection
            title="Zertifizierungen"
            icon={Award}
            isExpanded={expandedSections.certifications}
            onToggle={() => toggleSection('certifications')}
            count={profilerData?.certifications?.length || 0}
          >
            {profilerData?.certifications && profilerData.certifications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profilerData.certifications.map((cert: any, index: number) => (
                  <CertificationCard key={index} certification={cert} formatDate={formatDate} renderMultiLanguageValue={renderMultiLanguageValue} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Award}
                title="Keine Zertifizierungen gefunden"
                description="Für diesen Mitarbeiter sind keine Zertifizierungen in den Profiler-Daten verfügbar."
              />
            )}
          </ExpandableSection>

          {/* Languages Section */}
          <ExpandableSection
            title="Sprachkenntnisse"
            icon={Globe}
            isExpanded={expandedSections.languages}
            onToggle={() => toggleSection('languages')}
            count={profilerData?.languageRatings?.length || 0}
          >
            {profilerData?.languageRatings && profilerData.languageRatings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profilerData.languageRatings.map((lang: any, index: number) => (
                  <LanguageCard key={index} language={lang} renderMultiLanguageValue={renderMultiLanguageValue} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Globe}
                title="Keine Sprachkenntnisse gefunden"
                description="Für diesen Mitarbeiter sind keine Sprachkenntnisse in den Profiler-Daten verfügbar."
              />
            )}
          </ExpandableSection>

          {/* Education Section */}
          <ExpandableSection
            title="Ausbildung & Studium"
            icon={GraduationCap}
            isExpanded={expandedSections.education}
            onToggle={() => toggleSection('education')}
            count={profilerData?.education?.length || 0}
          >
            {profilerData?.education && profilerData.education.length > 0 ? (
              <div className="space-y-4">
                {profilerData.education.map((edu: any, index: number) => (
                  <EducationCard key={index} education={edu} formatDate={formatDate} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={GraduationCap}
                title="Keine Ausbildungsdaten gefunden"
                description="Für diesen Mitarbeiter sind keine Ausbildungsdaten in den Profiler-Daten verfügbar."
              />
            )}
          </ExpandableSection>

          {/* Professional Experience Section */}
          <ExpandableSection
            title="Berufserfahrung"
            icon={Briefcase}
            isExpanded={expandedSections.professionalExperience}
            onToggle={() => toggleSection('professionalExperience')}
            count={profilerData?.professionalExperiences?.length || 0}
          >
            {profilerData?.professionalExperiences && profilerData.professionalExperiences.length > 0 ? (
              <div className="space-y-4">
                {profilerData.professionalExperiences.map((exp: any, index: number) => (
                  <ExperienceCard key={index} experience={exp} formatDate={formatDate} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Briefcase}
                title="Keine Berufserfahrung gefunden"
                description="Für diesen Mitarbeiter sind keine Berufserfahrungsdaten in den Profiler-Daten verfügbar."
              />
            )}
          </ExpandableSection>

          {/* System Data Section */}
          <ExpandableSection
            title="System & Import-Daten"
            icon={Database}
            isExpanded={expandedSections.systemData}
            onToggle={() => toggleSection('systemData')}
            count={null}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoCard
                icon={Database}
                label="Datenquelle"
                value={profilerData?.source || 'Profiler API'}
              />
              <InfoCard
                icon={Shield}
                label="Auth-Methode"
                value={profilerData?.authMethod}
              />
              <InfoCard
                icon={Clock}
                label="Importiert am"
                value={formatDate(profilerData?.importedAt)}
              />
              <InfoCard
                icon={Clock}
                label="Letzte Aktualisierung"
                value={formatDate(profilerData?.lastUpdated)}
              />
              <InfoCard
                icon={Target}
                label="Profiler-ID"
                value={profilerData?.profileId}
              />
              <InfoCard
                icon={Eye}
                label="Skills-Quelle"
                value={profilerData?.skillsSource}
              />
            </div>
          </ExpandableSection>
        </div>
      </div>
    </div>
  );
}

// 🆕 COMPONENT: Bullet Point List
interface BulletPointListProps {
  text: any;
  className?: string;
}

function BulletPointList({ text, className = '' }: BulletPointListProps) {
  const bulletPoints = React.useMemo(() => {
    if (!text) return [];
    
    let textValue = '';
    if (typeof text === 'string') {
      textValue = text;
    } else if (typeof text === 'object' && text !== null) {
      textValue = text.de || text.en || text.tr || text.hu || '';
    } else {
      textValue = String(text);
    }
    
    if (!textValue) return [];
    
    // Split by #%# and clean up
    return textValue
      .split('#%#')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }, [text]);

  if (bulletPoints.length === 0) {
    return <span className={className}>Nicht verfügbar</span>;
  }

  if (bulletPoints.length === 1) {
    // Single item - no bullet point needed
    return <span className={className}>{bulletPoints[0]}</span>;
  }

  // Check if this is inline usage (for titles, names, etc.)
  const isInline = className.includes('inline');
  
  if (isInline) {
    // For inline usage (titles, names), join with bullet separator
    return <span className={className}>{bulletPoints.join(' • ')}</span>;
  }

  // Multiple items - show as proper bullet list
  const shouldUseTwoColumns = bulletPoints.length > 5;

  if (shouldUseTwoColumns) {
    // Split bullet points into two columns
    const midPoint = Math.ceil(bulletPoints.length / 2);
    const leftColumn = bulletPoints.slice(0, midPoint);
    const rightColumn = bulletPoints.slice(midPoint);

    return (
      <div className={`${className} grid grid-cols-1 md:grid-cols-2 gap-x-6`}>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {leftColumn.map((point, index) => (
            <li key={index} className="text-gray-700">
              {point}
            </li>
          ))}
        </ul>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {rightColumn.map((point, index) => (
            <li key={midPoint + index} className="text-gray-700">
              {point}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Single column for 5 or fewer items
  return (
    <div className={className}>
      <ul className="list-disc list-inside space-y-1 text-sm">
        {bulletPoints.map((point, index) => (
          <li key={index} className="text-gray-700">
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

// 🆕 COMPONENT: Expandable Section
interface ExpandableSectionProps {
  title: string;
  icon: React.ElementType;
  isExpanded: boolean;
  onToggle: () => void;
  count: number | null;
  children: React.ReactNode;
}

function ExpandableSection({ title, icon: Icon, isExpanded, onToggle, count, children }: ExpandableSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {count !== null && (
            <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full font-medium">
              {count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 border-t border-gray-100">
              <div className="pt-4">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 🆕 COMPONENT: Info Card
interface InfoCardProps {
  icon: React.ElementType;
  label: string;
  value: any;
}

function InfoCard({ icon: Icon, label, value }: InfoCardProps) {
  const displayValue = value || 'Nicht verfügbar';
  const isEmpty = !value;
  
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${isEmpty ? 'text-gray-400' : 'text-blue-500'}`} />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-sm font-medium ${isEmpty ? 'text-gray-400 italic' : 'text-gray-900'}`}>
        {displayValue}
      </p>
    </div>
  );
}

// 🆕 COMPONENT: Skill Card
interface SkillCardProps {
  skill: {
    id: any;
    skillName: string;
    level: number;
    lastUpdated: any;
  };
}

function SkillCard({ skill }: SkillCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 truncate pr-2">{skill.skillName}</h4>
        <div className="flex items-center gap-1 flex-shrink-0">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < skill.level ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Level:</span>
          <span className="font-medium text-gray-900">{skill.level}/5</span>
        </div>
        {skill.lastUpdated && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Zuletzt verwendet:</span>
            <span className="font-medium text-gray-900">{skill.lastUpdated}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// 🆕 COMPONENT: Project Card
interface ProjectCardProps {
  project: any;
  renderMultiLanguageValue: (value: any) => string;
  formatProjectDate: (dateObj: any) => string;
}

function ProjectCard({ project, renderMultiLanguageValue, formatProjectDate }: ProjectCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">
          {renderMultiLanguageValue(project.title) || 
           renderMultiLanguageValue(project.name) || 
           'Unbekanntes Projekt'}
        </h4>
        {project.projectPoolProject && (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            Pool-Projekt
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <InfoItem
          label="Kunde"
          value={renderMultiLanguageValue(project.customer) || 
                 renderMultiLanguageValue(project.projectPoolProject?.customer)}
        />
        <InfoItem
          label="Rolle"
          value={renderMultiLanguageValue(project.role)}
        />
        <InfoItem
          label="Zeitraum"
          value={`${formatProjectDate(project)} - ${project.endDate || 'Laufend'}`}
        />
        <InfoItem
          label="Branche"
          value={renderMultiLanguageValue(project.industry)}
        />
      </div>
      
      {project.description && (
        <div className="pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-700 leading-relaxed">
            <BulletPointList text={project.description} />
          </div>
        </div>
      )}
      
      {project.tasks && (
        <div className="pt-4 border-t border-gray-200 mt-4">
          <h5 className="font-medium text-gray-900 mb-2">Aufgaben:</h5>
          <div className="text-sm text-gray-700 leading-relaxed">
            <BulletPointList text={project.tasks} />
          </div>
        </div>
      )}
    </div>
  );
}

// 🆕 COMPONENT: Certification Card
interface CertificationCardProps {
  certification: any;
  formatDate: (date: any) => string;
  renderMultiLanguageValue?: (value: any) => string;
}

function CertificationCard({ certification, formatDate, renderMultiLanguageValue }: CertificationCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Award className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 mb-1">
            <BulletPointList text={certification.name} className="inline" />
          </h4>
          <div className="space-y-1 text-sm text-gray-600">
            {certification.issuer && (
              <p>Aussteller: <span className="font-medium">{certification.issuer}</span></p>
            )}
            {certification.date && (
              <p>Datum: <span className="font-medium">{formatDate(certification.date)}</span></p>
            )}
            {certification.validUntil && (
              <p>Gültig bis: <span className="font-medium">{formatDate(certification.validUntil)}</span></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 🆕 COMPONENT: Language Card
interface LanguageCardProps {
  language: any;
  renderMultiLanguageValue: (value: any) => string;
}

function LanguageCard({ language, renderMultiLanguageValue }: LanguageCardProps) {
  const getLevelColor = (level: number) => {
    if (level >= 4) return 'bg-green-100 text-green-800';
    if (level >= 3) return 'bg-yellow-100 text-yellow-800';
    if (level >= 2) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };
  
  const getLevelText = (level: number) => {
    if (level >= 4) return 'Fließend';
    if (level >= 3) return 'Gut';
    if (level >= 2) return 'Grundkenntnisse';
    return 'Anfänger';
  };
  
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">
          {renderMultiLanguageValue(language.language)}
        </h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(language.level || 0)}`}>
          {getLevelText(language.level || 0)}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full ${
              i < (language.level || 0) ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {language.level || 0}/5
        </span>
      </div>
    </div>
  );
}

// 🆕 COMPONENT: Education Card
interface EducationCardProps {
  education: any;
  formatDate: (date: any) => string;
}

function EducationCard({ education, formatDate }: EducationCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">
            {education.degree || education.title || 'Unbekannte Ausbildung'}
          </h4>
          <div className="space-y-1 text-sm text-gray-600">
            {education.institution && (
              <p>Institution: <span className="font-medium">{education.institution}</span></p>
            )}
            {education.fieldOfStudy && (
              <p>Fachrichtung: <span className="font-medium">{education.fieldOfStudy}</span></p>
            )}
            {(education.startDate || education.endDate) && (
              <p>
                Zeitraum: 
                <span className="font-medium ml-1">
                  {education.startDate ? formatDate(education.startDate) : 'Unbekannt'} - 
                  {education.endDate ? formatDate(education.endDate) : 'Laufend'}
                </span>
              </p>
            )}
            {education.grade && (
              <p>Note: <span className="font-medium">{education.grade}</span></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 🆕 COMPONENT: Experience Card
interface ExperienceCardProps {
  experience: any;
  formatDate: (date: any) => string;
}

function ExperienceCard({ experience, formatDate }: ExperienceCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Briefcase className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">
            <BulletPointList text={experience.role || experience.position} className="inline" />
          </h4>
          <div className="space-y-1 text-sm text-gray-600">
            {experience.employer && (
              <p>Arbeitgeber: <span className="font-medium"><BulletPointList text={experience.employer} className="inline" /></span></p>
            )}
            {(experience.startDate || experience.endDate) && (
              <p>
                Zeitraum: 
                <span className="font-medium ml-1">
                  {experience.startDate ? formatDate(experience.startDate) : 'Unbekannt'} - 
                  {experience.endDate ? formatDate(experience.endDate) : 'Laufend'}
                </span>
              </p>
            )}
            {experience.description && (
              <p className="mt-2 leading-relaxed">{experience.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 🆕 COMPONENT: Empty State
interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-md mx-auto">{description}</p>
    </div>
  );
}

// 🆕 COMPONENT: Info Item
interface InfoItemProps {
  label: string;
  value: string;
}

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div>
      <span className="text-sm text-gray-600">{label}:</span>
      <span className="ml-2 text-sm font-medium text-gray-900">
        {value || 'Nicht verfügbar'}
      </span>
    </div>
  );
}
