import React, { useState } from 'react';
import { Users } from 'lucide-react';
import RoleTaskBulkUploadModal from './RoleTaskBulkUploadModal';

interface RoleTaskBulkUploadButtonProps {
  className?: string;
  label?: string;
  onImportComplete?: () => void;
}

const RoleTaskBulkUploadButton: React.FC<RoleTaskBulkUploadButtonProps> = ({ 
  className = "", 
  label = "Rollen & Tätigkeiten Import",
  onImportComplete
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImportComplete = () => {
    if (onImportComplete) {
      onImportComplete();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors ${className}`}
      >
        <Users className="w-4 h-4" />
        <span>{label}</span>
      </button>

      <RoleTaskBulkUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </>
  );
};

export default RoleTaskBulkUploadButton;
