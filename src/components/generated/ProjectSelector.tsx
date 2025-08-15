import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronDown, Building2, FolderOpen } from 'lucide-react';
import { useCustomers } from '../../contexts/CustomerContext';

interface ProjectSelectorProps {
  selectedCustomer: string;
  selectedProject: string;
  onProjectSelect: (project: string) => void;
  onProjectCreate?: (project: string) => void;
  className?: string;
  placeholder?: string;
}

export function ProjectSelector({
  selectedCustomer,
  selectedProject,
  onProjectSelect,
  onProjectCreate,
  className = "",
  placeholder = "Projekt auswählen..."
}: ProjectSelectorProps) {
  const { projects, addProject } = useCustomers();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProjectName, setNewProjectName] = useState('');

  // Filtere Projekte nach dem ausgewählten Kunden
  const customerProjects = projects.filter(project => 
    project.customer.toLowerCase() === selectedCustomer.toLowerCase()
  );

  // Filtere nach Suchbegriff
  const filteredProjects = customerProjects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Prüfe ob das gesuchte Projekt bereits existiert
  const projectExists = customerProjects.some(project =>
    project.name.toLowerCase() === searchTerm.toLowerCase()
  );

  const handleProjectSelect = (projectName: string) => {
    onProjectSelect(projectName);
    setSearchTerm(projectName);
    setIsOpen(false);
  };

  const handleCreateProject = () => {
    if (newProjectName.trim() && selectedCustomer && !projectExists) {
      // Füge das Projekt zum Context hinzu
      addProject(newProjectName.trim(), selectedCustomer);
      
      // Rufe den optionalen Callback auf
      if (onProjectCreate) {
        onProjectCreate(newProjectName.trim());
      }
      
      // Wähle das neue Projekt aus
      onProjectSelect(newProjectName.trim());
      setSearchTerm(newProjectName.trim());
      setNewProjectName('');
      setIsOpen(false);
    }
  };

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    if (!value) {
      onProjectSelect('');
    }
  };

  // Aktualisiere searchTerm wenn sich selectedProject ändert
  useEffect(() => {
    if (selectedProject) {
      setSearchTerm(selectedProject);
    }
  }, [selectedProject]);

  // Wenn sich der Kunde ändert, setze das Projekt zurück
  useEffect(() => {
    // Wenn sich der Kunde ändert, setze das Projekt zurück
    onProjectSelect('');
    setSearchTerm('');
  }, [selectedCustomer, onProjectSelect]);

  return (
    <div className={`relative ${className}`}>
      {/* Projektauswahl Input */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
          placeholder={selectedCustomer ? placeholder : "Zuerst Kunde auswählen..."}
        />
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden"
          >
            {/* Header mit Kundeninfo */}
            {selectedCustomer && (
              <div className="p-3 border-b border-gray-100 bg-blue-50">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Building2 className="w-4 h-4" />
                  <span>Kunde: <strong>{selectedCustomer}</strong></span>
                </div>
              </div>
            )}

            {/* Neues Projekt hinzufügen */}
            {selectedCustomer && !projectExists && searchTerm.trim() && (
              <div className="p-3 border-b border-gray-100 bg-green-50">
                <div className="flex items-center gap-2">
                  <Plus className="w-3 h-3 text-green-600" />
                  <span className="text-sm text-green-700">
                    Neues Projekt "{searchTerm}" für {selectedCustomer} erstellen
                  </span>
                  <button
                    onClick={handleCreateProject}
                    className="ml-auto px-2 py-1 text-xs text-white bg-green-600 rounded hover:bg-green-700"
                  >
                    Erstellen
                  </button>
                </div>
              </div>
            )}

            {/* Projektliste */}
            <div className="max-h-48 overflow-y-auto">
              {filteredProjects.length === 0 ? (
                <div className="p-3 text-center text-gray-500 text-sm">
                  {searchTerm ? 'Keine Projekte gefunden' : 'Keine Projekte für diesen Kunden'}
                </div>
              ) : (
                filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleProjectSelect(project.name)}
                  >
                    <FolderOpen className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{project.name}</span>
                    {project.name === selectedProject && (
                      <span className="ml-auto text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        Ausgewählt
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Hinweis wenn kein Kunde ausgewählt ist */}
            {!selectedCustomer && (
              <div className="p-3 border-t border-gray-100 bg-yellow-50">
                <div className="flex items-center gap-2 text-xs text-yellow-700 text-center justify-center">
                  <Building2 className="w-3 h-3" />
                  <span>Bitte wählen Sie zuerst einen Kunden aus</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
