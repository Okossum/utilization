import React, { useState, useRef, useEffect } from 'react';
import { Settings, Database, TrendingUp, Target, User, Ticket, BarChart3, Users, FileText, ChevronDown, LogOut, Minus, Plus, MessageSquare, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ProfilerTokenStatus } from './generated/ProfilerTokenStatus';

interface AppHeaderProps {
  currentView: 'utilization' | 'employees' | 'knowledge' | 'auslastung-comments' | 'sales' | 'project-roles-demo' | 'project-skills-demo' | 'employee-detail' | 'projects';
  setCurrentView: (view: 'utilization' | 'employees' | 'knowledge' | 'auslastung-comments' | 'sales' | 'project-roles-demo' | 'project-skills-demo' | 'employee-detail' | 'projects') => void;

  logout: () => Promise<void>;
  setAdminModalOpen: (open: boolean) => void;
  // UtilizationReportView spezifische Props (nur wenn currentView === 'utilization')
  onAdminUpload?: () => void;
  onEmployeeUpload?: () => void;
  onExcelUpload?: () => void;
  onAuslastungView?: () => void;
  onEinsatzplanView?: () => void;
  onSettings?: () => void;
  onHelp?: () => void;
  lobOptions?: string[];
  // Management Buttons
  onRoleManagement?: () => void;
  onTechnicalSkillManagement?: () => void;
  onSoftSkillManagement?: () => void;
  onSoftSkillImport?: () => void;
  onTechnicalSkillImport?: () => void;
  onRoleTaskImport?: () => void;
  onProjectRolesDemo?: () => void;
  onProjectSkillsDemo?: () => void;
  onCustomerProjectsManagement?: () => void;
  onAuslastungserklaerungManagement?: () => void;
  onUserSettings?: () => void;
  onGeneralSettings?: () => void;
  onUserRoleManagement?: () => void;
  onAdminSetup?: () => void;
  onRestoreAdmin?: () => void;
  onFirebaseAuthSetup?: () => void;
  onProfilerImport?: () => void;

}

export function AppHeader({
  currentView,
  setCurrentView,
  logout,
  setAdminModalOpen,
  onAdminUpload,
  onEmployeeUpload,
  onExcelUpload,
  onAuslastungView,
  onEinsatzplanView,
  onSettings,
  onHelp,
  lobOptions = [],
  onRoleManagement,
  onTechnicalSkillManagement,
  onSoftSkillManagement,
  onSoftSkillImport,
  onTechnicalSkillImport,
  onRoleTaskImport,
  onProjectRolesDemo,
  onProjectSkillsDemo,
  onCustomerProjectsManagement,
  onAuslastungserklaerungManagement,
  onUserSettings,
  onGeneralSettings,
  onUserRoleManagement,
  onAdminSetup,
  onRestoreAdmin,
  onFirebaseAuthSetup,
  onProfilerImport
}: AppHeaderProps) {
  const { user, profile, role, canAccessView, canAccessSettings } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    dataUpload: false,
    controlViews: false,
    management: false,
    settings: false
  });
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Click outside to close menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
    }

    if (isAccountMenuOpen || isSettingsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAccountMenuOpen, isSettingsMenuOpen]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-6">
      <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentView === 'utilization' && 'Auslastung & Einsatzplan'}
            {currentView === 'employees' && 'Mitarbeiter'}
            {currentView === 'knowledge' && 'Knowledge Library'}
            {currentView === 'auslastung-comments' && 'Auslastung mit Kommentaren'}
            {currentView === 'sales' && 'Sales View'}
            {currentView === 'employee-detail' && 'Mitarbeiter Detail'}
            {currentView === 'projects' && 'Projekt Management'}
          </h1>
        </div>
        
        <div className="flex items-center gap-2" style={{ zIndex: 40 }}>
          {/* Navigation Buttons - basierend auf Berechtigungen */}
          {canAccessView('utilization') && (
            <button
              onClick={() => setCurrentView('utilization')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                currentView === 'utilization' 
                  ? 'text-blue-700 bg-blue-50 border-blue-200' 
                  : 'text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100'
              } border rounded-lg`}
              style={{ zIndex: 40 }}
              title="Auslastung Report"
            >
              <BarChart3 className="w-4 h-4" />
              Auslastung
            </button>
          )}
          

          
          {canAccessView('sales') && (
            <button
              onClick={() => setCurrentView('sales')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                currentView === 'sales' 
                  ? 'text-blue-700 bg-blue-50 border-blue-200' 
                  : 'text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100'
              } border rounded-lg`}
              style={{ zIndex: 40 }}
              title="Sales View"
            >
              <Target className="w-4 h-4" />
              Sales View
            </button>
          )}
          


          {/* LoB als feststehender Chip - nur bei Utilization */}
          {currentView === 'utilization' && lobOptions.length === 1 && (
            <span className="px-4 py-2 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg uppercase tracking-wide" style={{ zIndex: 40 }}>
              {lobOptions[0]}
            </span>
          )}



          {/* Help Button - IMMER sichtbar */}
          {onHelp && (
            <button 
              onClick={onHelp}
              className="inline-flex items-center gap-2 p-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors" 
              style={{ zIndex: 40 }}
              title="Hilfe & Anleitung"
            >
              <HelpCircle className="w-4 h-4" />
              Hilfe
            </button>
          )}

          {/* Settings Menu - IMMER sichtbar */}
          <div className="relative" ref={settingsMenuRef}>
            <button 
              onClick={() => setIsSettingsMenuOpen(v => !v)}
              className="inline-flex items-center gap-2 p-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" 
              style={{ zIndex: 40 }}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </button>
            {isSettingsMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3" style={{ zIndex: 50 }}>
                
                {/* Daten & Upload - nur für Berechtigte */}
                {canAccessSettings('excel-upload') && (onAdminUpload || currentView === 'utilization') && (
                  <div className="mb-3">
                    <button
                      onClick={() => toggleSection('dataUpload')}
                      className="w-full flex items-center justify-between text-xs text-gray-500 uppercase tracking-wider font-semibold hover:text-gray-700 transition-colors py-2"
                    >
                      Daten & Upload
                      <ChevronDown className={`w-3 h-3 transition-transform ${expandedSections.dataUpload ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.dataUpload && (
                      <div className="space-y-2 mt-2">

                        {/* DISABLED: Employee Upload
                        {onEmployeeUpload && (
                          <button
                            onClick={() => { onEmployeeUpload(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-left font-medium"
                          >
                            👥 Mitarbeiter Upload
                          </button>
                        )}
                        */}
                        
                        {/* Excel Upload - nur für Führungskräfte und Admins */}
                        {canAccessSettings('excel-upload') && onExcelUpload && (
                          <button
                            onClick={() => { onExcelUpload(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 text-left font-medium"
                          >
                            📊 Excel Upload
                          </button>
                        )}
                        
                        {/* Profiler Import - nur für Admins */}
                        {canAccessSettings('profiler-import') && onProfilerImport && (
                          <button
                            onClick={() => { onProfilerImport(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-left font-medium"
                          >
                            🔗 Profiler Import
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Control Views - nur bei Utilization */}
                {currentView === 'utilization' && (onAuslastungView || onEinsatzplanView) && (
                  <div className="mb-3">
                    <button
                      onClick={() => toggleSection('controlViews')}
                      className="w-full flex items-center justify-between text-xs text-gray-500 uppercase tracking-wider font-semibold hover:text-gray-700 transition-colors py-2"
                    >
                      Control Views
                      <ChevronDown className={`w-3 h-3 transition-transform ${expandedSections.controlViews ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.controlViews && (
                      <div className="space-y-2 mt-2">
                        {onAuslastungView && (
                          <button
                            onClick={() => { onAuslastungView(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 text-left font-medium"
                          >
                            📈 Auslastung-Übersicht
                          </button>
                        )}
                        {onEinsatzplanView && (
                          <button
                            onClick={() => { onEinsatzplanView(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-left font-medium"
                          >
                            🎯 Einsatzplan-Übersicht
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Management - nur für Admins */}
                {canAccessSettings('user-management') && (onRoleManagement || onTechnicalSkillManagement || onSoftSkillManagement || onSoftSkillImport || onTechnicalSkillImport || onRoleTaskImport || onProjectRolesDemo || onProjectSkillsDemo || onCustomerProjectsManagement || onAuslastungserklaerungManagement || onUserSettings) && (
                  <div className="mb-3">
                    <button
                      onClick={() => toggleSection('management')}
                      className="w-full flex items-center justify-between text-xs text-gray-500 uppercase tracking-wider font-semibold hover:text-gray-700 transition-colors py-2"
                    >
                      Management
                      <ChevronDown className={`w-3 h-3 transition-transform ${expandedSections.management ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.management && (
                      <div className="space-y-2 mt-2">
                        {onRoleManagement && (
                          <button
                            onClick={() => { onRoleManagement(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 text-left font-medium"
                          >
                            👥 Rollen-Verwaltung
                          </button>
                        )}
                        {onTechnicalSkillManagement && (
                          <button
                            onClick={() => { onTechnicalSkillManagement(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 text-left font-medium"
                          >
                            🛠️ Tech Skills
                          </button>
                        )}
                        {onSoftSkillManagement && (
                          <button
                            onClick={() => { onSoftSkillManagement(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-pink-700 bg-pink-50 border border-pink-200 rounded-lg hover:bg-pink-100 text-left font-medium"
                          >
                            💝 Soft Skills
                          </button>
                        )}
                        {onTechnicalSkillImport && (
                          <button
                            onClick={() => { onTechnicalSkillImport(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 text-left font-medium"
                          >
                            📊 Tech Skills Import
                          </button>
                        )}
                        {onSoftSkillImport && (
                          <button
                            onClick={() => { onSoftSkillImport(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 text-left font-medium"
                          >
                            📊 Soft Skills Import
                          </button>
                        )}
                        {onRoleTaskImport && (
                          <button
                            onClick={() => { onRoleTaskImport(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-pink-700 bg-pink-50 border border-pink-200 rounded-lg hover:bg-pink-100 text-left font-medium"
                          >
                            📋 Rollen & Tätigkeiten Import
                          </button>
                        )}
                        {onProjectRolesDemo && (
                          <button
                            onClick={() => { onProjectRolesDemo(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-left font-medium"
                          >
                            🧪 Projektrollen Demo
                          </button>
                        )}
                        {onProjectSkillsDemo && (
                          <button
                            onClick={() => { onProjectSkillsDemo(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 text-left font-medium"
                          >
                            ⭐ Projekt Skills Demo
                          </button>
                        )}
                        {onCustomerProjectsManagement && (
                          <button
                            onClick={() => { onCustomerProjectsManagement(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 text-left font-medium"
                          >
                            🏢 Kunden & Projekte
                          </button>
                        )}
                        {onAuslastungserklaerungManagement && (
                          <button
                            onClick={() => { onAuslastungserklaerungManagement(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 text-left font-medium"
                          >
                            📋 Auslastungserklärung
                          </button>
                        )}

                        {onUserSettings && (
                          <button
                            onClick={() => { onUserSettings(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-left font-medium"
                          >
                            🎯 Benutzereinstellungen
                          </button>
                        )}
                        
                        {/* Benutzerverwaltung - nur für Admins */}
                        {canAccessSettings('user-management') && onUserRoleManagement && (
                          <button
                            onClick={() => { onUserRoleManagement(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 text-left font-medium"
                          >
                            👥 Benutzerverwaltung
                          </button>
                        )}
                        


                        {/* Admin Setup - nur für Admins */}
                        {canAccessSettings('user-management') && onAdminSetup && (
                          <button
                            onClick={() => { onAdminSetup(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-left font-medium"
                          >
                            🛡️ Admin einrichten
                          </button>
                        )}

                        {/* Admin Restore - NOTFALL für überschriebene Admin-Rolle */}
                        {(onRestoreAdmin || role === 'unknown') && (
                          <button
                            onClick={() => { 
                              if (onRestoreAdmin) {
                                onRestoreAdmin(); 
                              }
                              setIsSettingsMenuOpen(false); 
                            }}
                            className="w-full px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 text-left font-medium"
                          >
                            🚨 Admin-Rolle wiederherstellen
                          </button>
                        )}

                        {/* Firebase Auth Setup - nur für Admins */}
                        {canAccessSettings('user-management') && onFirebaseAuthSetup && (
                          <button
                            onClick={() => { onFirebaseAuthSetup(); setIsSettingsMenuOpen(false); }}
                            className="w-full px-3 py-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 text-left font-medium"
                          >
                            🔐 Firebase Auth Setup
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Allgemeine Einstellungen */}
                <div>
                  <button
                    onClick={() => toggleSection('settings')}
                    className="w-full flex items-center justify-between text-xs text-gray-500 uppercase tracking-wider font-semibold hover:text-gray-700 transition-colors py-2"
                  >
                    Einstellungen
                    <ChevronDown className={`w-3 h-3 transition-transform ${expandedSections.settings ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedSections.settings && (
                    <div className="space-y-2 mt-2">
                      {currentView === 'utilization' && onSettings && (
                        <button
                          onClick={() => { onSettings(); setIsSettingsMenuOpen(false); }}
                          className="w-full px-3 py-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-left font-medium"
                        >
                          📊 Zeitraum-Einstellungen
                        </button>
                      )}
                      {onGeneralSettings && (
                        <button
                          onClick={() => { onGeneralSettings(); setIsSettingsMenuOpen(false); }}
                          className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 text-left font-medium"
                        >
                          ⚙️ Allgemeine Einstellungen
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Account Menu - IMMER sichtbar */}
          <div className="relative" ref={accountMenuRef}>
            <button
              onClick={() => setIsAccountMenuOpen(v => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              style={{ zIndex: 40 }}
              title="Account"
            >
              <User className="w-4 h-4" />
              <ChevronDown className="w-4 h-4" />
            </button>
            {isAccountMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3" style={{ zIndex: 50 }}>
                <div className="mb-3">
                  <div className="text-xs text-gray-500">Angemeldet als</div>
                  <div className="text-sm font-medium text-gray-900 truncate">{profile?.displayName || user?.email || '—'}</div>
                  <div className="text-xs text-gray-600">Rolle: {String(profile?.role || 'unknown')}</div>
                </div>
                
                {/* Profiler Token Status */}
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <ProfilerTokenStatus showLabel={true} />
                </div>
                {profile?.role === 'admin' && (
                  <button
                    onClick={() => { setAdminModalOpen(true); setIsAccountMenuOpen(false); }}
                    className="w-full px-3 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 mb-2"
                  >
                    Benutzerverwaltung
                  </button>
                )}
                
                {/* ✅ Admin-Rolle wiederherstellen - nur für Admins */}
                {role === 'admin' && onRestoreAdmin && (
                  <button
                    onClick={() => { 
                      if (onRestoreAdmin) {
                        onRestoreAdmin(); 
                      }
                      setIsAccountMenuOpen(false); 
                    }}
                    className="w-full px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 mb-2"
                  >
                    🚨 Admin-Rolle wiederherstellen
                  </button>
                )}
                
                <button
                  onClick={async () => { setIsAccountMenuOpen(false); await logout(); }}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <LogOut className="w-4 h-4" /> Abmelden
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
