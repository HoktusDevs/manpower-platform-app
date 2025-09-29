import React from 'react';
import type { DocumentInfo } from '../../../services/documentsService';

interface DocumentViewerProps {
  document: DocumentInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !document) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'processing':
        return 'Procesando';
      case 'failed':
        return 'Fallido';
      default:
        return 'Subido';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{document.fileName}</h2>
            <p className="text-sm text-gray-500">{document.documentType}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Document Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Información del Documento</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Estado:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                      {getStatusText(document.status)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Tamaño:</span>
                    <span className="text-sm text-gray-900">{formatFileSize(document.fileSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Tipo:</span>
                    <span className="text-sm text-gray-900">{document.mimeType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Subido:</span>
                    <span className="text-sm text-gray-900">{formatDate(document.uploadedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">ID:</span>
                    <span className="text-sm text-gray-900 font-mono">{document.documentId}</span>
                  </div>
                </div>
              </div>

              {/* OCR Results */}
              {document.ocrResult && document.ocrResult.success && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Resultados OCR</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-gray-500">Confianza:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {document.ocrResult.confidence}%
                      </span>
                    </div>
                    
                    {document.ocrResult.extractedText && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Texto extraído:</h4>
                        <div className="bg-white p-3 rounded border text-xs text-gray-600 max-h-32 overflow-y-auto">
                          {document.ocrResult.extractedText}
                        </div>
                      </div>
                    )}

                    {document.ocrResult.fields && Object.keys(document.ocrResult.fields).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Campos extraídos:</h4>
                        <div className="space-y-2">
                          {Object.entries(document.ocrResult.fields).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-xs text-gray-600 capitalize">{key}:</span>
                              <span className="text-xs text-gray-900 font-medium">{value as string}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Document Preview */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Vista Previa</h3>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                {document.mimeType.startsWith('image/') ? (
                  <img
                    src={document.fileUrl}
                    alt={document.fileName}
                    className="max-w-full h-auto rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">Vista previa no disponible</p>
                  </div>
                )}
                <div className="hidden text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No se puede mostrar la vista previa</p>
                </div>
              </div>
              
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => window.open(document.fileUrl, '_blank')}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Ver Original
                </button>
                <button
                  onClick={() => {
                    const link = window.document.createElement('a');
                    link.href = document.fileUrl;
                    link.download = document.fileName;
                    link.click();
                  }}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  Descargar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
