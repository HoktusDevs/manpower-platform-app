import React from 'react';

interface DocumentFile {
  id: string;
  file: File;
  previewUrl: string;
  fileUrl?: string;
  title: string;
  ownerName: string;
  ocrResult?: { text: string; processingTime?: number; [key: string]: unknown };
  status: 'pending' | 'processing' | 'completed' | 'error' | 'failed';
  hoktusDecision?: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'PENDING';
  hoktusProcessingStatus?: 'COMPLETED' | 'FAILED' | 'VALIDATION' | 'PROCESSING';
  documentType?: string;
  observations?: unknown[];
}
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { DocumentActions } from './DocumentActions';

interface DocumentTableRowProps {
  document: DocumentFile;
  onPreviewDocument?: (document: DocumentFile) => void;
  onDeleteDocument?: (documentId: string) => void;
}

export const DocumentTableRow: React.FC<DocumentTableRowProps> = ({
  document,
  onPreviewDocument,
  onDeleteDocument
}) => {
  return (
    <tr className={`hover:bg-gray-50 ${document.status === 'processing' ? 'opacity-60' : ''}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {document.title}
          </div>
          <div className="text-sm text-gray-500">
            {document.file.name}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <DocumentStatusBadge document={document} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {document.status === 'processing' || document.status === 'error' || document.status === 'failed' 
          ? '-' 
          : `${document.ocrResult?.processingTime || 0}s`
        }
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <DocumentActions
          document={document}
          onPreviewDocument={onPreviewDocument}
          onDeleteDocument={onDeleteDocument}
        />
      </td>
    </tr>
  );
};
