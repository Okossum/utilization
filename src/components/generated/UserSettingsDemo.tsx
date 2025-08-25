import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, RotateCcw, User, Eye, Filter } from 'lucide-react';
import { useUserSettings } from '../../hooks/useUserSettings';
import { useAuth } from '../../contexts/AuthContext';

export function UserSettingsDemo() {
  const { user } = useAuth();
  const {
    settings,
    loading,
    error,
    filterSettings,
    viewSettings,
    uiSettings,
    updateFilterSettings,
    updateViewSettings,
    updateUISettings,
    resetToDefaults,
  } = useUserSettings();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Lade Benutzereinstellungen...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Fehler beim Laden der Einstellungen: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Settings className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Benutzereinstellungen</h1>
            <p className="text-gray-600">Personalisierte Einstellungen für {user?.email}</p>
          </div>
        </div>
        
        <button
          onClick={resetToDefaults}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Zurücksetzen</span>
        </button>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Filter Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <Filter className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Filter-Einstellungen</h2>
          </div>

          <div className="space-y-4">
            {/* Show Working Students */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Werkstudenten anzeigen
              </label>
              <button
                onClick={() => updateFilterSettings({ 
                  showWorkingStudents: !filterSettings.showWorkingStudents 
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  filterSettings.showWorkingStudents ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    filterSettings.showWorkingStudents ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Show All Data */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Alle Daten anzeigen
              </label>
              <button
                onClick={() => updateFilterSettings({ 
                  showAllData: !filterSettings.showAllData 
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  filterSettings.showAllData ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    filterSettings.showAllData ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Show Action Items */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Action Items anzeigen
              </label>
              <button
                onClick={() => updateFilterSettings({ 
                  showActionItems: !filterSettings.showActionItems 
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  filterSettings.showActionItems ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    filterSettings.showActionItems ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Selected Persons Count */}
            <div className="pt-2 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                <strong>{filterSettings.selectedPersons.length}</strong> Personen ausgewählt
              </div>
              {filterSettings.selectedPersons.length > 0 && (
                <button
                  onClick={() => updateFilterSettings({ selectedPersons: [] })}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                >
                  Alle abwählen
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* View Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Eye className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Ansicht-Einstellungen</h2>
          </div>

          <div className="space-y-4">
            {/* Forecast Weeks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prognose-Wochen: {viewSettings.forecastWeeks}
              </label>
              <input
                type="range"
                min="4"
                max="16"
                value={viewSettings.forecastWeeks}
                onChange={(e) => updateViewSettings({ 
                  forecastWeeks: parseInt(e.target.value) 
                })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>4 Wochen</span>
                <span>16 Wochen</span>
              </div>
            </div>

            {/* Lookback Weeks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rückblick-Wochen: {viewSettings.lookbackWeeks}
              </label>
              <input
                type="range"
                min="4"
                max="16"
                value={viewSettings.lookbackWeeks}
                onChange={(e) => updateViewSettings({ 
                  lookbackWeeks: parseInt(e.target.value) 
                })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>4 Wochen</span>
                <span>16 Wochen</span>
              </div>
            </div>

            {/* Visible Columns */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Sichtbare Spalten
              </label>
              <div className="space-y-2">
                {Object.entries(viewSettings.visibleColumns).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <button
                      onClick={() => updateViewSettings({
                        visibleColumns: {
                          ...viewSettings.visibleColumns,
                          [key]: !value
                        }
                      })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        value ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          value ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* UI Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-lg">
              <User className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">UI-Einstellungen</h2>
          </div>

          <div className="space-y-4">
            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Design-Theme
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateUISettings({ theme: 'light' })}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    uiSettings.theme === 'light'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Hell
                </button>
                <button
                  onClick={() => updateUISettings({ theme: 'dark' })}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    uiSettings.theme === 'dark'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Dunkel
                </button>
              </div>
            </div>

            {/* Table View */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tabellen-Ansicht
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateUISettings({ tableView: 'compact' })}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    uiSettings.tableView === 'compact'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Kompakt
                </button>
                <button
                  onClick={() => updateUISettings({ tableView: 'detailed' })}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    uiSettings.tableView === 'detailed'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Detailliert
                </button>
              </div>
            </div>

            {/* Default View */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Standard-Ansicht
              </label>
              <select
                value={uiSettings.defaultView}
                onChange={(e) => updateUISettings({ 
                  defaultView: e.target.value as any 
                })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="utilization">Auslastung</option>
                <option value="employees">Mitarbeiter</option>
                <option value="sales">Sales</option>
              </select>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Settings Info */}
      {settings && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-50 rounded-lg p-4"
        >
          <div className="text-sm text-gray-600">
            <p><strong>Benutzer-ID:</strong> {settings.userId}</p>
            <p><strong>Letzte Aktualisierung:</strong> {settings.lastUpdated.toLocaleString('de-DE')}</p>
            <p className="mt-2 text-green-600">
              ✅ Alle Einstellungen werden automatisch in der Cloud gespeichert und auf allen Geräten synchronisiert.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
