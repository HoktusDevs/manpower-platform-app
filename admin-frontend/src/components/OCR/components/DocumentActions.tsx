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

interface DocumentActionsProps {
  document: DocumentFile;
  onPreviewDocument?: (document: DocumentFile) => void;
  onDeleteDocument?: (documentId: string) => void;
}

export const DocumentActions: React.FC<DocumentActionsProps> = ({
  document,
  onPreviewDocument,
  onDeleteDocument
}) => {
  const handleDownload = () => {
    if (document.status === 'completed' && document.ocrResult) {
      // Descargar como archivo de texto
      const blob = new Blob([document.ocrResult.text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${document.title}_ocr.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const isProcessing = document.status === 'processing' || document.status === 'error' || document.status === 'failed';

  return (
    <div className="flex space-x-2">
      {/* Botón de Vista Previa */}
      <button
        onClick={() => onPreviewDocument?.(document)}
        className="p-1 rounded text-blue-600 hover:text-blue-900 hover:bg-blue-50"
        title="Vista previa del documento"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
      
      {/* Botón de Descarga */}
      <button
        onClick={handleDownload}
        disabled={isProcessing}
        className={`p-1 rounded ${
          isProcessing
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-green-600 hover:text-green-900 hover:bg-green-50'
        }`}
        title={
          document.status === 'processing' ? 'Procesando...' :
          document.status === 'error' || document.status === 'failed' ? 'Error en procesamiento' :
          'Descargar texto OCR'
        }
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>
      
      {/* Botón de Eliminar */}
      <button
        onClick={() => onDeleteDocument?.(document.id)}
        disabled={document.status === 'processing'}
        className={`p-1 rounded ${
          document.status === 'processing'
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-red-600 hover:text-red-900 hover:bg-red-50'
        }`}
        title={document.status === 'processing' ? 'Procesando...' : 'Eliminar documento'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
};
