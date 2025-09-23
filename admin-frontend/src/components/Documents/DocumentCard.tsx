import React from 'react';
import type { DocumentInfo } from '../../services/documentsService';

interface DocumentCardProps {
  document: DocumentInfo;
  onDownload: (documentId: string) => void;
  onView: (documentId: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onDownload,
  onView,
}) => {
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {document.fileName}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {document.documentType}
          </p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
          {getStatusText(document.status)}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Tamaño:</span>
          <span>{formatFileSize(document.fileSize)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Subido:</span>
          <span>{formatDate(document.uploadedAt)}</span>
        </div>
        {document.ocrResult && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>Confianza OCR:</span>
            <span className="font-medium">{document.ocrResult.confidence}%</span>
          </div>
        )}
      </div>

      {document.ocrResult && document.ocrResult.success && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Datos extraídos:</h4>
          <div className="space-y-1">
            {Object.entries(document.ocrResult.fields || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-gray-600 capitalize">{key}:</span>
                <span className="text-gray-900 font-medium">{value as string}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex space-x-2">
        <button
          onClick={() => onView(document.documentId)}
          className="flex-1 bg-blue-600 text-white text-xs py-2 px-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Ver
        </button>
        <button
          onClick={() => onDownload(document.documentId)}
          className="flex-1 bg-green-600 text-white text-xs py-2 px-3 rounded-md hover:bg-green-700 transition-colors"
        >
          Descargar
        </button>
      </div>
    </div>
  );
};
