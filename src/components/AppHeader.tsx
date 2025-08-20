import React, { useState, useRef, useEffect } from 'react';
import { Settings, Database, TrendingUp, Target, User, Ticket, Columns, BarChart3, Users, FileText, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AppHeaderProps {
  currentView: 'utilization' | 'employees' | 'knowledge';
  setCurrentView: (view: 'utilization' | 'employees' | 'knowledge') => void;
  logout: () => Promise<void>;
  setAdminModalOpen: (open: boolean) => void;
  // UtilizationReportView spezifische Props (nur wenn currentView === 'utilization')
  onAdminUpload?: () => void;
  onAuslastungView?: () => void;
  onEinsatzplanView?: () => void;
  onSettings?: () => void;
  onColumnsMenu?: () => void;
  isColumnsMenuOpen?: boolean;
  lobOptions?: string[];
}

export function AppHeader({
  currentView,
  setCurrentView,
  logout,
  setAdminModalOpen,
  onAdminUpload,
  onAuslastungView,
  onEinsatzplanView,
  onSettings,
  onColumnsMenu,
  isColumnsMenuOpen,
  lobOptions = []
}: AppHeaderProps) {
  const { user, profile } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-6">
      <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentView === 'utilization' && 'Auslastung & Vorblick'}
            {currentView === 'employees' && 'Mitarbeiter'}
            {currentView === 'knowledge' && 'Knowledge Library'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {currentView === 'utilization' && 'Rückblick & Vorblick · ISO-KW'}
            {currentView === 'employees' && 'Mitarbeiter-Verwaltung und Übersicht'}
            {currentView === 'knowledge' && 'Knowledge Upload und Verwaltung'}
          </p>
        </div>
        
        <div className="flex items-center gap-2" style={{ zIndex: 40 }}>
          {/* Navigation Buttons - IMMER sichtbar */}
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
          <button
            onClick={() => setCurrentView('employees')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              currentView === 'employees' 
                ? 'text-blue-700 bg-blue-50 border-blue-200' 
                : 'text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100'
            } border rounded-lg`}
            style={{ zIndex: 40 }}
            title="Mitarbeiter Liste"
          >
            <Users className="w-4 h-4" />
            Mitarbeiter
          </button>
          <button
            onClick={() => setCurrentView('knowledge')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              currentView === 'knowledge' 
                ? 'text-blue-700 bg-blue-50 border-blue-200' 
                : 'text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100'
            } border rounded-lg`}
            style={{ zIndex: 40 }}
            title="Knowledge Upload Test"
          >
            <FileText className="w-4 h-4" />
            Knowledge
          </button>

          {/* LoB als feststehender Chip - nur bei Utilization */}
          {currentView === 'utilization' && lobOptions.length === 1 && (
            <span className="px-4 py-2 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg uppercase tracking-wide" style={{ zIndex: 40 }}>
              {lobOptions[0]}
            </span>
          )}

          {/* View-spezifische Buttons - nur bei Utilization */}
          {currentView === 'utilization' && (
            <>
              {onAdminUpload && (
                <button 
                  onClick={onAdminUpload}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  style={{ zIndex: 40 }}
                  title="Neue Daten hochladen (Admin)"
                >
                  <Database className="w-4 h-4" />
                  Admin Upload
                </button>
              )}
              {onAuslastungView && (
                <button 
                  onClick={onAuslastungView}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  style={{ zIndex: 40 }}
                  title="Auslastung-Übersicht öffnen"
                >
                  <TrendingUp className="w-4 h-4" />
                  Auslastung
                </button>
              )}
              {onEinsatzplanView && (
                <button 
                  onClick={onEinsatzplanView}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  style={{ zIndex: 40 }}
                  title="Einsatzplan-Übersicht öffnen"
                >
                  <Target className="w-4 h-4" />
                  Einsatzplan
                </button>
              )}

              {onColumnsMenu && (
                <button 
                  onClick={onColumnsMenu}
                  className="p-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" 
                  style={{ zIndex: 40 }} 
                  title="Spalten"
                >
                  <Columns className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {/* Settings Button - IMMER sichtbar */}
          <button 
            onClick={onSettings || (() => {})}
            className="p-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" 
            style={{ zIndex: 40 }}
            title="Settings"
            disabled={!onSettings}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Account Menu - IMMER sichtbar */}
          <div className="relative">
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
                {profile?.role === 'admin' && (
                  <button
                    onClick={() => { setAdminModalOpen(true); setIsAccountMenuOpen(false); }}
                    className="w-full px-3 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 mb-2"
                  >
                    Benutzerverwaltung
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
