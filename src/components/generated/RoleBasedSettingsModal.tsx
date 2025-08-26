import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Database, 
  Users, 
  Star, 
  Briefcase, 
  Settings, 
  Upload,
  UserCheck,
  Shield,
  Zap,
  Heart,
  Building2,
  FileText,
  ChevronRight,
  Lock,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SETTINGS_CATEGORIES, canAccessSettings } from '../../lib/permissions';
import { HelpModal } from './HelpModal';

interface RoleBasedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExcelUpload: () => void;
  onOpenUserManagement: () => void;
  onOpenRoleManagement: () => void;
  onOpenTechnicalSkills: () => void;
  onOpenSoftSkills: () => void;
  onOpenHierarchicalRoles: () => void;
  onOpenCustomerProjects: () => void;
  onOpenAuslastungserklaerung: () => void;
}

const iconMap = {
  Database,
  Users,
  Star,
  Briefcase,
  Settings,
  Upload,
  UserCheck,
  Shield,
  Zap,
  Heart,
  Building2,
  FileText,
  HelpCircle
};

export function RoleBasedSettingsModal({
  isOpen,
  onClose,
  onOpenExcelUpload,
  onOpenUserManagement,
  onOpenRoleManagement,
  onOpenTechnicalSkills,
  onOpenSoftSkills,
  onOpenHierarchicalRoles,
  onOpenCustomerProjects,
  onOpenAuslastungserklaerung
}: RoleBasedSettingsModalProps) {
  const { role } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Mapping von Settings zu Handler-Funktionen
  const settingsHandlers = {
    'excel-upload': onOpenExcelUpload,
    'user-management': onOpenUserManagement,
    'role-management': onOpenRoleManagement,
    'technical-skills': onOpenTechnicalSkills,
    'soft-skills': onOpenSoftSkills,
    'hierarchical-roles': onOpenHierarchicalRoles,
    'customer-projects': onOpenCustomerProjects,
    'auslastungserklaerung': onOpenAuslastungserklaerung,
    'general-settings': () => {}, // Placeholder
    'data-management': () => {}, // Placeholder
    'help': () => setIsHelpModalOpen(true)
  };

  // Filtere verfügbare Kategorien basierend auf Berechtigungen
  const availableCategories = Object.entries(SETTINGS_CATEGORIES).filter(([_, category]) => {
    return category.settings.some(setting => canAccessSettings(role, setting));
  });

  // Filtere verfügbare Settings in einer Kategorie
  const getAvailableSettings = (categorySettings: readonly string[]) => {
    return categorySettings.filter(setting => canAccessSettings(role, setting));
  };

  const handleSettingClick = (setting: string) => {
    const handler = settingsHandlers[setting as keyof typeof settingsHandlers];
    if (handler) {
      handler();
      onClose();
    }
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
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Einstellungen</h2>
              <p className="text-sm text-gray-600 mt-1">
                Verfügbare Funktionen für Rolle: <span className="font-medium capitalize">{role}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {availableCategories.length === 0 ? (
              // Keine Berechtigungen
              <div className="text-center py-12">
                <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Keine Berechtigung
                </h3>
                <p className="text-gray-600">
                  Sie haben keine Berechtigung für Settings-Funktionen.
                </p>
              </div>
            ) : (
              // Kategorien-Grid
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableCategories.map(([categoryKey, category]) => {
                  const IconComponent = iconMap[category.icon as keyof typeof iconMap];
                  const availableSettings = getAvailableSettings(category.settings);
                  
                  return (
                    <motion.div
                      key={categoryKey}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100 hover:border-blue-200 transition-all cursor-pointer"
                      onClick={() => setSelectedCategory(categoryKey)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <IconComponent className="w-6 h-6 text-blue-600" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                      
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {category.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {category.description}
                      </p>
                      
                      <div className="text-xs text-blue-600 font-medium">
                        {availableSettings.length} Funktion{availableSettings.length !== 1 ? 'en' : ''} verfügbar
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Spezielle Führungskraft-Ansicht */}
          {role === 'führungskraft' && (
            <div className="border-t border-gray-200 bg-blue-50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Upload className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Excel-Upload</h3>
                  <p className="text-sm text-gray-600">Auslastungs- und Einsatzplandaten hochladen</p>
                </div>
              </div>
              
              <button
                onClick={() => handleSettingClick('excel-upload')}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Excel-Upload öffnen
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Kategorie-Detail-Modal */}
      <AnimatePresence>
        {selectedCategory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60"
            onClick={() => setSelectedCategory(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const category = SETTINGS_CATEGORIES[selectedCategory as keyof typeof SETTINGS_CATEGORIES];
                const IconComponent = iconMap[category.icon as keyof typeof iconMap];
                const availableSettings = getAvailableSettings(category.settings);
                
                return (
                  <>
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <IconComponent className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{category.title}</h3>
                      </div>
                      <p className="text-gray-600">{category.description}</p>
                    </div>
                    
                    <div className="p-6">
                      <div className="space-y-3">
                        {availableSettings.map(setting => (
                          <button
                            key={setting}
                            onClick={() => handleSettingClick(setting)}
                            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                          >
                            <div className="font-medium text-gray-900 capitalize">
                              {setting.replace('-', ' ')}
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="w-full mt-4 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Zurück
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <HelpModal 
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </AnimatePresence>
  );
}
