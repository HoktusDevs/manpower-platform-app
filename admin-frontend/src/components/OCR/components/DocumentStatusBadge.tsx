import React from 'react';

interface DocumentFile {
  id: string;
  file: File;
  previewUrl: string;
  fileUrl?: string;
  title: string;
  ownerName: string;
  ocrResult?: any;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'failed';
  hoktusDecision?: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'PENDING';
  hoktusProcessingStatus?: 'COMPLETED' | 'FAILED' | 'VALIDATION' | 'PROCESSING';
  documentType?: string;
  observations?: any[];
}

interface StatusDisplay {
  text: string;
  className: string;
  icon: React.ReactElement | null;
}

const getHoktusStatusDisplay = (document: DocumentFile): StatusDisplay => {
  if (document.status === 'processing') {
    return {
      text: 'Procesando...',
      className: 'bg-blue-100 text-blue-800',
      icon: (
        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )
    };
  }

  if (document.status === 'error' || document.status === 'failed') {
    return {
      text: 'Rechazado',
      className: 'bg-red-100 text-red-800',
      icon: null
    };
  }

  // Para documentos completados, usar finalDecision (hoktusDecision)
  if (document.hoktusProcessingStatus === 'COMPLETED') {
    if (document.hoktusDecision === 'APPROVED') {
      return {
        text: 'Aprobado',
        className: 'bg-green-100 text-green-800',
        icon: null
      };
    } else if (document.hoktusDecision === 'REJECTED') {
      return {
        text: 'Rechazado',
        className: 'bg-red-100 text-red-800',
        icon: null
      };
    } else if (document.hoktusDecision === 'MANUAL_REVIEW') {
      return {
        text: 'Revisión Manual',
        className: 'bg-yellow-100 text-yellow-800',
        icon: null
      };
    } else if (document.hoktusDecision === 'PENDING') {
      return {
        text: 'Pendiente',
        className: 'bg-gray-100 text-gray-800',
        icon: null
      };
    }
  }

  if (document.hoktusProcessingStatus === 'FAILED') {
    return {
      text: 'Rechazado',
      className: 'bg-red-100 text-red-800',
      icon: null
    };
  }

  if (document.hoktusProcessingStatus === 'VALIDATION') {
    return {
      text: 'Revisión Manual',
      className: 'bg-yellow-100 text-yellow-800',
      icon: null
    };
  }

  // Fallback para documentos completados sin hoktusProcessingStatus
  return {
    text: 'Completado',
    className: 'bg-green-100 text-green-800',
    icon: null
  };
};

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
