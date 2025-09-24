import React from 'react';
import { DocumentFile } from '../types/OCRTypes';
import { getHoktusStatusDisplay } from '../utils/statusUtils';

interface DocumentStatusBadgeProps {
  document: DocumentFile;
}

export const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = ({ document }) => {
  const statusDisplay = getHoktusStatusDisplay(document);
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.className}`}>
      {statusDisplay.icon}
      {statusDisplay.text}
    </span>
  );
};
