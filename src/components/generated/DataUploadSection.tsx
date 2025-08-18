import React from 'react';
import { UploadPanel } from './UploadPanel';

interface UploadedFile {
  name: string;
  data: any[];
  isValid: boolean;
  error?: string;
  preview?: string[][];
}

interface DataUploadSectionProps {
  uploadedFiles: {
    auslastung?: UploadedFile;
    einsatzplan?: UploadedFile;
  };
  onFilesChange: (files: {
    auslastung?: UploadedFile;
    einsatzplan?: UploadedFile;
  }) => void;
  onDatabaseRefresh?: () => void;
}

export function DataUploadSection({ uploadedFiles, onFilesChange, onDatabaseRefresh }: DataUploadSectionProps) {
  return (
    <div className="w-full">
      <UploadPanel uploadedFiles={uploadedFiles} onFilesChange={onFilesChange} onDatabaseRefresh={onDatabaseRefresh} />
    </div>
  );
}



