import React, { useState, useMemo } from 'react';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, AlertCircle, X, Upload, FileSpreadsheet, Users, TrendingUp, Star, Info } from 'lucide-react';
import { useFirebaseStorage } from '../hooks/use-firebase-storage';
import { UploadedFile, PlannedEngagement } from '../lib/types';

interface UtilizationData {
  person: string;
  week: string;
  utilization: number | null;
  isHistorical: boolean;
}

export function SimpleFirebaseApp() {
  // Firebase Storage Hook
  const {
    uploadedFiles,
    plannedByPerson,
    customers,
    personStatus,
    personTravelReadiness,
    isLoading: firebaseLoading,
    error: firebaseError,
    saveUploadedFile,
    savePlannedEngagement,
    savePersonStatus,
    savePersonTravelReadiness,
    saveCustomer
  } = useFirebaseStorage();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newReadiness, setNewReadiness] = useState(50);

  // Mock data for development/testing
  const mockData: UtilizationData[] = [
    { person: 'Max Mustermann', week: '2024-KW1', utilization: 85, isHistorical: true },
    { person: 'Max Mustermann', week: '2024-KW2', utilization: 90, isHistorical: true },
    { person: 'Max Mustermann', week: '2024-KW3', utilization: 75, isHistorical: true },
    { person: 'Max Mustermann', week: '2024-KW4', utilization: 80, isHistorical: true },
  ];

  // Get unique persons from data
  const allPersons = useMemo(() => {
    const persons = new Set<string>();
    mockData.forEach(d => persons.add(d.person));
    return Array.from(persons).sort();
  }, []);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const historical = mockData.filter(d => d.isHistorical);
    const forecast = mockData.filter(d => !d.isHistorical);

    const historicalAvg = historical.length > 0 
      ? historical.reduce((sum, d) => sum + (d.utilization || 0), 0) / historical.length 
      : 0;

    const forecastAvg = forecast.length > 0 
      ? forecast.reduce((sum, d) => sum + (d.utilization || 0), 0) / forecast.length 
      : 0;

    const trend = historicalAvg > 0 ? ((forecastAvg - historicalAvg) / historicalAvg) * 100 : 0;

    return {
      historicalAverage: Math.round(historicalAvg * 10) / 10,
      forecastAverage: Math.round(forecastAvg * 10) / 10,
      trend: Math.round(trend * 10) / 10,
      totalPersons: allPersons.length,
      activePersons: allPersons.length
    };
  }, [allPersons]);

  // Handle file uploads
  const handleFileUpload = async (type: 'auslastung' | 'einsatzplan') => {
    try {
      const testFile: UploadedFile = {
        name: `test-${type}.xlsx`,
        data: [{ person: 'Test User', week: 'KW1', utilization: 80 }],
        isValid: true,
        uploadedAt: new Date(),
        fileSize: 1000
      };
      
      const id = await saveUploadedFile(type, testFile);
      alert(`${type} Datei erfolgreich gespeichert mit ID: ${id}`);
    } catch (err) {
      alert(`Fehler beim Speichern: ${err}`);
    }
  };

  // Handle customer addition
  const handleAddCustomer = async () => {
    if (newCustomer.trim()) {
      try {
        await saveCustomer(newCustomer.trim());
        setNewCustomer('');
        alert('Kunde erfolgreich gespeichert');
      } catch (err) {
        alert(`Fehler beim Speichern: ${err}`);
      }
    }
  };

  // Handle person status change
  const handleStatusChange = async () => {
    if (selectedPerson && newStatus) {
      try {
        await savePersonStatus(selectedPerson, newStatus);
        setNewStatus('');
        alert('Status erfolgreich gespeichert');
      } catch (err) {
        alert(`Fehler beim Speichern: ${err}`);
      }
    }
  };

  // Handle travel readiness change
  const handleReadinessChange = async () => {
    if (selectedPerson) {
      try {
        await savePersonTravelReadiness(selectedPerson, newReadiness);
        alert('Reisebereitschaft erfolgreich gespeichert');
      } catch (err) {
        alert(`Fehler beim Speichern: ${err}`);
      }
    }
  };

  // Show loading state or error
  if (firebaseLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Lade Daten aus Firebase...</p>
        </div>
      </div>
    );
  }

  if (firebaseError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-32 w-32 text-red-500 mx-auto" />
          <p className="mt-4 text-lg text-red-600">Fehler beim Laden der Daten</p>
          <p className="mt-2 text-sm text-gray-600">{firebaseError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Resource Utilization Report</h1>
              <p className="text-sm text-gray-600">Vollständige App mit Firebase-Integration</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Firebase Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{Object.keys(uploadedFiles).length}</div>
              <div className="text-gray-600">Uploaded Files</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{customers.length}</div>
              <div className="text-gray-600">Customers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Object.keys(personStatus).length}</div>
              <div className="text-gray-600">Person Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{Object.keys(personTravelReadiness).length}</div>
              <div className="text-gray-600">Travel Readiness</div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Durchschnitt (Historie)</p>
                <p className="text-2xl font-semibold text-gray-900">{kpis.historicalAverage}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Durchschnitt (Prognose)</p>
                <p className="text-2xl font-semibold text-gray-900">{kpis.forecastAverage}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Trend</p>
                <p className="text-2xl font-semibold text-gray-900">{kpis.trend}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Info className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Personen</p>
                <p className="text-2xl font-semibold text-gray-900">{kpis.totalPersons}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Schnelle Aktionen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Datei-Upload testen</h3>
              <div className="space-x-2">
                <button
                  onClick={() => handleFileUpload('auslastung')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Upload className="inline w-4 h-4 mr-2" />
                  Auslastung
                </button>
                <button
                  onClick={() => handleFileUpload('einsatzplan')}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <FileSpreadsheet className="inline w-4 h-4 mr-2" />
                  Einsatzplan
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Kunde hinzufügen</h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  placeholder="Kundenname"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddCustomer}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Hinzufügen
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Data Display */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Aktuelle Daten</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Kunden</h3>
              <div className="bg-gray-100 p-3 rounded">
                {customers.length > 0 ? (
                  <ul className="space-y-1">
                    {customers.map((customer, index) => (
                      <li key={index} className="text-sm">• {customer}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">Keine Kunden vorhanden</p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Person-Status</h3>
              <div className="bg-gray-100 p-3 rounded">
                {Object.keys(personStatus).length > 0 ? (
                  <ul className="space-y-1">
                    {Object.entries(personStatus).map(([person, status]) => (
                      <li key={person} className="text-sm">• {person}: {status}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">Keine Status-Daten vorhanden</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setIsSettingsOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Einstellungen</h2>
                    <button
                      onClick={() => setIsSettingsOpen(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Person Status */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Person-Status ändern</h3>
                      <div className="space-y-3">
                        <select
                          value={selectedPerson}
                          onChange={(e) => setSelectedPerson(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Person auswählen</option>
                          {allPersons.map(person => (
                            <option key={person} value={person}>{person}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          placeholder="Neuer Status"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleStatusChange}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Status speichern
                        </button>
                      </div>
                    </div>

                    {/* Travel Readiness */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Reisebereitschaft ändern</h3>
                      <div className="space-y-3">
                        <select
                          value={selectedPerson}
                          onChange={(e) => setSelectedPerson(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Person auswählen</option>
                          {allPersons.map(person => (
                            <option key={person} value={person}>{person}</option>
                          ))}
                        </select>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reisebereitschaft: {newReadiness}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={newReadiness}
                            onChange={(e) => setNewReadiness(Number(e.target.value))}
                            className="w-full"
                          />
                        </div>
                        <button
                          onClick={handleReadinessChange}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Reisebereitschaft speichern
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}





