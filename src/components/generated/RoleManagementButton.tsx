import React, { useState } from 'react';
import { Shield, X } from 'lucide-react';
import RoleManagement from './RoleManagement';

interface RoleManagementButtonProps {
  className?: string;
  label?: string;
}

const RoleManagementButton: React.FC<RoleManagementButtonProps> = ({ 
  className = "", 
  label = "Rollen" 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 ${className}`}
      >
        <Shield className="w-4 h-4" />
        <span>{label}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsOpen(false)} />
          <div className="absolute inset-0 p-4 overflow-auto">
            <div className="relative max-w-6xl mx-auto bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <Shield className="w-5 h-5" />
                  <span>Rollen-Management</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                <RoleManagement />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RoleManagementButton;
