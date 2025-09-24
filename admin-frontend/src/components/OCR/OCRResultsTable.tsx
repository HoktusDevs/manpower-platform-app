import React from 'react';

interface OCRResult {
  success: boolean;
  text: string;
  confidence: number;
  processingTime: number;
  language: string;
  metadata: any;
  fields?: any;
}

interface DocumentFile {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  ownerName: string; // ✅ NOMBRE POR CADA ARCHIVO
  ocrResult?: OCRResult;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'failed';
  hoktusDecision?: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'PENDING';
  hoktusProcessingStatus?: 'COMPLETED' | 'FAILED' | 'VALIDATION' | 'PROCESSING';
  documentType?: string;
  observations?: any[];
}

interface OCRResultsTableProps {
  documents: DocumentFile[];
  onDeleteDocument?: (documentId: string) => void;
  onPreviewDocument?: (document: DocumentFile) => void;
  isLoading?: boolean;
}

const getHoktusStatusDisplay = (document: DocumentFile) => {
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

const OCRResultsSkeleton = () => {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <tr key={`skeleton-${index}`} className="animate-pulse">
          <td className="px-6 py-4 whitespace-nowrap">
            <div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="h-6 bg-gray-200 rounded-full w-20"></div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="h-4 bg-gray-200 rounded w-8"></div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex space-x-2">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};

export const OCRResultsTable: React.FC<OCRResultsTableProps> = ({ documents, onDeleteDocument, onPreviewDocument, isLoading = false }) => {
  // Mostrar documentos completados, en procesamiento, con error y fallidos
  const visibleDocuments = documents.filter(doc =>
    (doc.status === 'completed' && doc.ocrResult) ||
    doc.status === 'processing' ||
    doc.status === 'error' ||
    doc.status === 'failed'
  );

  if (visibleDocuments.length === 0 && !isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2">No hay resultados de OCR disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Documento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tiempo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading && visibleDocuments.length === 0 && <OCRResultsSkeleton />}
            {visibleDocuments.map((document) => (
              <tr key={document.id} className={`hover:bg-gray-50 ${document.status === 'processing' ? 'opacity-60' : ''}`}>
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
                  {(() => {
                    const statusDisplay = getHoktusStatusDisplay(document);
                    return (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.className}`}>
                        {statusDisplay.text}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {document.status === 'processing' || document.status === 'error' || document.status === 'failed' ? '-' : `${document.ocrResult!.processingTime}s`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {/* Botón de Vista Previa */}
                    <button
                      onClick={() => {
                        if (onPreviewDocument) {
                          onPreviewDocument(document);
                        }
                      }}
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
                      onClick={() => {
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
                      }}
                      disabled={document.status === 'processing' || document.status === 'error' || document.status === 'failed'}
                      className={`p-1 rounded ${
                        document.status === 'processing' || document.status === 'error' || document.status === 'failed'
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
                      onClick={() => {
                        if (onDeleteDocument && document.status !== 'processing') {
                          onDeleteDocument(document.id);
                        }
                      }}
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
