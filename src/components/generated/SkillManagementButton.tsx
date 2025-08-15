import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { SkillManagement } from './SkillManagement';

interface SkillManagementButtonProps {
  label?: string;
  className?: string;
}

export function SkillManagementButton({ label = 'Skill-Verwaltung', className = '' }: SkillManagementButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 ${className}`}
      >
        <Settings className="w-4 h-4" />
        <span>{label}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-0 p-4 overflow-auto">
            <div className="relative max-w-5xl mx-auto bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <Settings className="w-4 h-4 text-indigo-600" />
                  <span>Skill-Verwaltung</span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded text-gray-500"
                  aria-label="Schließen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2 md:p-4">
                <SkillManagement />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SkillManagementButton;


