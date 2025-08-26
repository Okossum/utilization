import React from 'react';
import { motion } from 'framer-motion';

interface PlannedUtilizationBarProps {
  utilization: number;
  projects: Array<{
    projectName: string;
    customer: string;
    plannedUtilization: number;
    probability: number;
  }>;
  className?: string;
}

export function PlannedUtilizationBar({ 
  utilization, 
  projects, 
  className = '' 
}: PlannedUtilizationBarProps) {
  
  // Begrenze die Anzeige auf maximal 100%
  const displayUtilization = Math.min(utilization, 100);
  
  // Bestimme die Farbe basierend auf der Auslastung
  const getBarColor = (util: number) => {
    if (util >= 100) return 'bg-blue-600';
    if (util >= 80) return 'bg-blue-500';
    if (util >= 60) return 'bg-blue-400';
    return 'bg-blue-300';
  };
  
  // Bestimme die Textfarbe
  const getTextColor = (util: number) => {
    if (util >= 100) return 'text-white';
    if (util >= 80) return 'text-white';
    return 'text-blue-900';
  };
  
  // Erstelle Tooltip-Text
  const tooltipText = projects.length > 0 
    ? `Geplante Projekte:\n${projects.map(p => `• ${p.projectName} (${p.customer}): ${p.plannedUtilization}%`).join('\n')}`
    : 'Geplante Auslastung';
  
  return (
    <div className={`relative group ${className}`}>
      {/* Hintergrund-Container */}
      <div className="relative w-full h-8 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
        {/* Blauer Balken */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${displayUtilization}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full ${getBarColor(utilization)} relative`}
        >
          {/* Prozent-Text */}
          <div className={`absolute inset-0 flex items-center justify-center text-xs font-medium ${getTextColor(utilization)}`}>
            {utilization}%
          </div>
        </motion.div>
        
        {/* Überlauf-Indikator (falls über 100%) */}
        {utilization > 100 && (
          <div className="absolute top-0 right-0 h-full w-2 bg-red-500 opacity-75">
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-pulse" />
          </div>
        )}
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-pre-line max-w-xs">
        {tooltipText}
        {/* Tooltip-Pfeil */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
      </div>
      
      {/* Projekt-Badges (bei Hover) */}
      {projects.length > 1 && (
        <div className="absolute top-full left-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
          <div className="flex flex-wrap gap-1 max-w-xs">
            {projects.slice(0, 3).map((project, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {project.projectName}
              </span>
            ))}
            {projects.length > 3 && (
              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{projects.length - 3} weitere
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Einfache Variante für kleine Zellen
 */
export function PlannedUtilizationBadge({ 
  utilization, 
  projects, 
  className = '' 
}: PlannedUtilizationBarProps) {
  
  const getBadgeColor = (util: number) => {
    if (util >= 100) return 'bg-blue-600 text-white';
    if (util >= 80) return 'bg-blue-500 text-white';
    if (util >= 60) return 'bg-blue-400 text-white';
    return 'bg-blue-200 text-blue-900';
  };
  
  const tooltipText = projects.length > 0 
    ? `Geplante Projekte (${utilization}%):\n${projects.map(p => `• ${p.projectName}: ${p.plannedUtilization}%`).join('\n')}`
    : `Geplante Auslastung: ${utilization}%`;
  
  return (
    <div className={`relative group ${className}`}>
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(utilization)} cursor-help`}
        title={tooltipText}
      >
        {utilization}%
        {utilization > 100 && (
          <span className="ml-1 text-red-200">⚠</span>
        )}
      </motion.span>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-pre-line max-w-xs">
        {tooltipText}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}
