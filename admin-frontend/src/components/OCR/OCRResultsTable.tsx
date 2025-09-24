import React from 'react';
import type { OCRResultsTableProps } from './types/OCRTypes';
import { OCRResultsSkeleton } from './components/OCRResultsSkeleton';
import { DocumentTableRow } from './components/DocumentTableRow';
import { EmptyState } from './components/EmptyState';
import { TABLE_HEADERS, TABLE_CLASSES } from './constants/tableConstants';

export const OCRResultsTable: React.FC<OCRResultsTableProps> = ({ 
  documents, 
  onDeleteDocument, 
  onPreviewDocument, 
  isLoading = false 
}) => {
  // Mostrar documentos completados, en procesamiento, con error y fallidos
  const visibleDocuments = documents.filter(doc =>
    (doc.status === 'completed' && doc.ocrResult) ||
    doc.status === 'processing' ||
    doc.status === 'error' ||
    doc.status === 'failed'
  );

  if (visibleDocuments.length === 0 && !isLoading) {
    return <EmptyState />;
  }

  return (
    <div className={TABLE_CLASSES.container}>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className={TABLE_CLASSES.table}>
          <thead className={TABLE_CLASSES.header}>
            <tr>
              {TABLE_HEADERS.map((header) => (
                <th key={header.key} className={TABLE_CLASSES.headerCell}>
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={TABLE_CLASSES.body}>
            {isLoading && visibleDocuments.length === 0 && <OCRResultsSkeleton />}
            {visibleDocuments.map((document) => (
              <DocumentTableRow
                key={document.id}
                document={document}
                onPreviewDocument={onPreviewDocument}
                onDeleteDocument={onDeleteDocument}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};