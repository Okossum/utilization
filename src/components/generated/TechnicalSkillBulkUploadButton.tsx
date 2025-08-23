import React, { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import TechnicalSkillBulkUploadModal from './TechnicalSkillBulkUploadModal';

interface TechnicalSkillBulkUploadButtonProps {
  className?: string;
  label?: string;
  onImportComplete?: () => void;
}

const TechnicalSkillBulkUploadButton: React.FC<TechnicalSkillBulkUploadButtonProps> = ({ 
  className = "", 
  label = "Technical Skills Import",
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
        className={`inline-flex items-center gap-2 px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors ${className}`}
      >
        <FileSpreadsheet className="w-4 h-4" />
        <span>{label}</span>
      </button>

      <TechnicalSkillBulkUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </>
  );
};

export default TechnicalSkillBulkUploadButton;
