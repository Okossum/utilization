import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  HelpCircle, 
  Users, 
  BarChart3, 
  Building2, 
  ChevronDown, 
  ChevronUp,
  BookOpen,
  Target,
  Settings,
  FileText,
  Star,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'sales': false,
    'fuehrungskraft': false,
    'haeufige-aufgaben': false,
    'tipps': false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <HelpCircle className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Benutzeranleitung</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Vollständige Anleitung für alle Benutzer der Resource Utilization App
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Übersicht */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Übersicht der verfügbaren Views
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <h4 className="font-medium text-blue-900">Utilization View</h4>
                  </div>
                  <p className="text-sm text-blue-800">Zentrale Übersicht über Mitarbeiterauslastung und -planung</p>
                  <div className="mt-2 text-xs text-blue-600">
                    Verfügbar für: Admin, Führungskraft, User
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-green-600" />
                    <h4 className="font-medium text-green-900">Sales View</h4>
                  </div>
                  <p className="text-sm text-green-800">Vertriebsrelevante Mitarbeiterinformationen und Projektplanung</p>
                  <div className="mt-2 text-xs text-green-600">
                    Verfügbar für: Admin, Führungskraft, Sales
                  </div>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    <h4 className="font-medium text-purple-900">Employees View</h4>
                  </div>
                  <p className="text-sm text-purple-800">Detaillierte Mitarbeiterübersicht und -verwaltung</p>
                  <div className="mt-2 text-xs text-purple-600">
                    Verfügbar für: Admin, Führungskraft
                  </div>
                </div>
              </div>
            </div>

            {/* Sales-Mitarbeiter Anleitung */}
            <div className="mb-8">
              <button
                onClick={() => toggleSection('sales')}
                className="w-full flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-green-900">Anleitung für Sales-Mitarbeiter</h3>
                </div>
                {expandedSections['sales'] ? (
                  <ChevronUp className="w-5 h-5 text-green-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-green-600" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections['sales'] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 bg-green-50 border-x border-b border-green-200 rounded-b-lg">
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Erste Schritte
                          </h4>
                          <ul className="text-sm text-green-800 space-y-1 ml-6">
                            <li>• Anmeldung mit E-Mail und Passwort</li>
                            <li>• Automatische Weiterleitung zur Sales View</li>
                            <li>• Navigation über das Hauptmenü</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Mitarbeiterübersicht
                          </h4>
                          <p className="text-sm text-green-800 mb-2">Finden Sie passende Mitarbeiter für neue Projekte:</p>
                          <ul className="text-sm text-green-800 space-y-1 ml-6">
                            <li>• Durch Mitarbeiterliste scrollen</li>
                            <li>• Suchfunktion für spezifische Namen nutzen</li>
                            <li>• Auf Mitarbeiter klicken für Details</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Projektplanung
                          </h4>
                          <p className="text-sm text-green-800 mb-2">Neues Projekt erstellen:</p>
                          <ol className="text-sm text-green-800 space-y-1 ml-6">
                            <li>1. Gewünschten Mitarbeiter auswählen</li>
                            <li>2. "Neues Projekt erstellen" wählen</li>
                            <li>3. Projektinformationen ausfüllen</li>
                            <li>4. Projekt speichern</li>
                          </ol>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Verfügbarkeitsprüfung
                          </h4>
                          <div className="text-sm text-green-800 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span>Verfügbar (unter 100% Auslastung)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                              <span>Teilweise verfügbar (100% Auslastung)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <span>Nicht verfügbar (über 100% Auslastung)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Führungskraft Anleitung */}
            <div className="mb-8">
              <button
                onClick={() => toggleSection('fuehrungskraft')}
                className="w-full flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Star className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-blue-900">Anleitung für Führungskräfte</h3>
                </div>
                {expandedSections['fuehrungskraft'] ? (
                  <ChevronUp className="w-5 h-5 text-blue-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-blue-600" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections['fuehrungskraft'] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 bg-blue-50 border-x border-b border-blue-200 rounded-b-lg">
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Utilization View - Hauptfunktionen
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <h5 className="font-medium text-blue-800">Auslastungsübersicht</h5>
                              <ul className="text-sm text-blue-800 space-y-1 ml-6">
                                <li>• Wochenbasierte Tabelle (historisch und prognostiziert)</li>
                                <li>• Farbkodierung: Grün (verfügbar), Gelb (100%), Rot (überlastet)</li>
                                <li>• KPI-Karten für Übersicht</li>
                              </ul>
                            </div>
                            <div>
                              <h5 className="font-medium text-blue-800">Filter und Suche</h5>
                              <ul className="text-sm text-blue-800 space-y-1 ml-6">
                                <li>• Personenfilter für spezifische Mitarbeiter</li>
                                <li>• Bereichsfilter nach LOB, Bereich, CC, Team</li>
                                <li>• Zeitfilter für Wochenbereiche</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Employees View - Mitarbeiterverwaltung
                          </h4>
                          <ul className="text-sm text-blue-800 space-y-1 ml-6">
                            <li>• Detaillierte Verwaltung aller Mitarbeiter</li>
                            <li>• Mitarbeiterdetails anzeigen</li>
                            <li>• Skills verwalten und Rollen zuweisen</li>
                            <li>• Projekte zuordnen</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Verwaltungsfunktionen
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <h5 className="font-medium text-blue-800">Excel-Upload</h5>
                              <ol className="text-sm text-blue-800 space-y-1 ml-6">
                                <li>1. "Excel-Upload" im Hauptmenü klicken</li>
                                <li>2. Excel-Datei auswählen</li>
                                <li>3. Upload bestätigen</li>
                                <li>4. Automatische Verarbeitung</li>
                              </ol>
                            </div>
                            <div>
                              <h5 className="font-medium text-blue-800">Einstellungen</h5>
                              <ul className="text-sm text-blue-800 space-y-1 ml-6">
                                <li>• Personalfilter konfigurieren</li>
                                <li>• Spaltenauswahl anpassen</li>
                                <li>• Export-Einstellungen konfigurieren</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Häufige Aufgaben */}
            <div className="mb-8">
              <button
                onClick={() => toggleSection('haeufige-aufgaben')}
                className="w-full flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-purple-900">Häufige Aufgaben - Schritt-für-Schritt</h3>
                </div>
                {expandedSections['haeufige-aufgaben'] ? (
                  <ChevronUp className="w-5 h-5 text-purple-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-purple-600" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections['haeufige-aufgaben'] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 bg-purple-50 border-x border-b border-purple-200 rounded-b-lg">
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-medium text-purple-900 mb-2">Neues Projekt planen</h4>
                          <ol className="text-sm text-purple-800 space-y-1 ml-6">
                            <li>1. Wechseln Sie zur Sales View</li>
                            <li>2. Suchen Sie nach passenden Mitarbeitern</li>
                            <li>3. Prüfen Sie deren Verfügbarkeit</li>
                            <li>4. Erstellen Sie ein neues Projekt</li>
                            <li>5. Ordnen Sie Mitarbeiter zu</li>
                          </ol>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-purple-900 mb-2">Auslastungsdaten aktualisieren</h4>
                          <ol className="text-sm text-purple-800 space-y-1 ml-6">
                            <li>1. Öffnen Sie die Utilization View</li>
                            <li>2. Nutzen Sie den Excel-Upload</li>
                            <li>3. Wählen Sie Ihre aktualisierten Daten</li>
                            <li>4. Bestätigen Sie den Upload</li>
                            <li>5. Überprüfen Sie die Änderungen</li>
                          </ol>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-purple-900 mb-2">Mitarbeiterdetails einsehen</h4>
                          <ol className="text-sm text-purple-800 space-y-1 ml-6">
                            <li>1. Wechseln Sie zur Employees View</li>
                            <li>2. Suchen Sie nach dem gewünschten Mitarbeiter</li>
                            <li>3. Klicken Sie auf den Namen für Details</li>
                            <li>4. Nutzen Sie die verschiedenen Tabs für Informationen</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tipps */}
            <div className="mb-8">
              <button
                onClick={() => toggleSection('tipps')}
                className="w-full flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Info className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-amber-900">Tipps für effiziente Nutzung</h3>
                </div>
                {expandedSections['tipps'] ? (
                  <ChevronUp className="w-5 h-5 text-amber-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-amber-600" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections['tipps'] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 bg-amber-50 border-x border-b border-amber-200 rounded-b-lg">
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-medium text-amber-900 mb-2">Für Sales-Mitarbeiter</h4>
                          <ul className="text-sm text-amber-800 space-y-1 ml-6">
                            <li>• Nutzen Sie die Suchfunktion für schnelle Mitarbeitersuche</li>
                            <li>• Prüfen Sie immer die aktuelle Verfügbarkeit vor Projektplanung</li>
                            <li>• Dokumentieren Sie Projektanforderungen detailliert</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-amber-900 mb-2">Für Führungskräfte</h4>
                          <ul className="text-sm text-amber-800 space-y-1 ml-6">
                            <li>• Überprüfen Sie regelmäßig die KPI-Karten</li>
                            <li>• Nutzen Sie Filter für fokussierte Analysen</li>
                            <li>• Kommentieren Sie wichtige Planungsentscheidungen</li>
                            <li>• Exportieren Sie Daten für externe Berichte</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hilfe und Support */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Hilfe und Support</h3>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                Bei Fragen oder Problemen:
              </p>
              <ul className="text-sm text-gray-700 space-y-1 ml-6">
                <li>• Prüfen Sie zuerst die verfügbaren Filter und Einstellungen</li>
                <li>• Nutzen Sie die Kommentarfunktionen für Notizen</li>
                <li>• Kontaktieren Sie den Systemadministrator bei technischen Problemen</li>
              </ul>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Hinweis:</strong> Diese Anleitung beschreibt nur die aktuell verfügbaren und funktionalen Features der App. 
                  Der Mitarbeiter-View ist derzeit nicht verfügbar.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
