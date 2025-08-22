import React from 'react';
// import { UploadPanel } from './UploadPanel'; // DISABLED

interface UploadedFile {
  name: string;
  data: any[];
  isValid: boolean;
  error?: string;
  preview?: string[][];
}

// DISABLED: DataUploadSection Props
// interface DataUploadSectionProps {
//   uploadedFiles: {
//     auslastung?: UploadedFile;
//     einsatzplan?: UploadedFile;
//   };
//   onFilesChange: (files: {
//     auslastung?: UploadedFile;
//     einsatzplan?: UploadedFile;
//   }) => void;
//   onDatabaseRefresh?: () => void;
// }

export function DataUploadSection() {
  return (
    <div className="w-full">
      {/* DISABLED: UploadPanel
      <UploadPanel uploadedFiles={{}} onFilesChange={() => {}} onDatabaseRefresh={() => {}} />
      */}
      <div className="text-center py-8 text-gray-500">
        <p>Upload-Funktionalität ist deaktiviert</p>
        <p className="text-sm">Neue Upload-Funktion wird implementiert</p>
      </div>
    </div>
  );
}



