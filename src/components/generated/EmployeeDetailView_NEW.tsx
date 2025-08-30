"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, Mail, MapPin, Calendar, Clock, Star, TrendingUp, MessageSquare, Edit3, Video, UserPlus, FileText, ChevronDown, Award, Edit, Trash2, Plus, ThumbsUp, ThumbsDown, Briefcase, Building, Pencil, Grid3X3, List, BarChart3, Heart, Download, AlertCircle, Database } from 'lucide-react';
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
    
    return profilerData.skills.map((skill: any) => ({
      id: skill.id || skill.skillId,
      skillId: skill.skillId,
      skillName: skill.name || 'Unbekannter Skill',
      level: skill.rating || 0,
      assignedAt: skill.lastUsedInYear,
      lastUpdated: skill.lastUsedInYear
    }));
  }, [profilerData]);
  
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
        {/* Employee Info Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{personName}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Position:</span>
                  <span className="text-sm font-medium">{meta?.lbs || 'Nicht verfügbar'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">E-Mail:</span>
                  <span className="text-sm font-medium">{meta?.email || 'Nicht verfügbar'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">CC:</span>
                  <span className="text-sm font-medium">{meta?.cc || 'Nicht verfügbar'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Standort:</span>
                  <span className="text-sm font-medium">{meta?.standort || 'Nicht verfügbar'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Startdatum:</span>
                  <span className="text-sm font-medium">{meta?.startDate || 'Nicht verfügbar'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Team:</span>
                  <span className="text-sm font-medium">{meta?.team || 'Nicht verfügbar'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Skills & Kompetenzen
          </h3>
          {assignedTechnicalSkills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedTechnicalSkills.map((skill) => (
                <div key={skill.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{skill.skillName}</h4>
                    <div className="flex items-center gap-1">
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
                  <div className="text-sm text-gray-600">
                    Level: {skill.level}/5
                    {skill.lastUpdated && (
                      <span className="block">Zuletzt verwendet: {skill.lastUpdated}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Keine Skills in den Profiler-Daten gefunden</p>
            </div>
          )}
        </div>

        {/* Projects Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-500" />
            Projekte
          </h3>
          {profilerData?.projects && profilerData.projects.length > 0 ? (
            <div className="space-y-4">
              {profilerData.projects.map((project: any, index: number) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {project.name || project.projectName || 'Unbekanntes Projekt'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Kunde:</span>
                      <span className="ml-2 font-medium">{project.customer || 'Nicht verfügbar'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Rolle:</span>
                      <span className="ml-2 font-medium">{project.role || 'Nicht verfügbar'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Zeitraum:</span>
                      <span className="ml-2 font-medium">
                        {project.startDate || 'Nicht verfügbar'} - {project.endDate || 'Laufend'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Branche:</span>
                      <span className="ml-2 font-medium">{project.industry || 'Nicht verfügbar'}</span>
                    </div>
                  </div>
                  {project.description && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-700">{project.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Keine Projekte in den Profiler-Daten gefunden</p>
            </div>
          )}
        </div>

        {/* Data Source Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Datenquelle: profilerData Collection</h4>
              <p className="text-sm text-blue-700">
                Diese Ansicht zeigt Daten aus der profilerData Collection. 
                Auslastungsdaten, Kommentare und einige andere Felder sind in dieser Datenquelle nicht verfügbar.
              </p>
              <div className="mt-2 text-xs text-blue-600">
                <p>Mitarbeiter-ID: {employeeId}</p>
                <p>Profiler-ID: {profilerData.profileId || 'Nicht verfügbar'}</p>
                <p>Letzte Aktualisierung: {profilerData.lastUpdated ? new Date(profilerData.lastUpdated.toDate()).toLocaleDateString('de-DE') : 'Unbekannt'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
