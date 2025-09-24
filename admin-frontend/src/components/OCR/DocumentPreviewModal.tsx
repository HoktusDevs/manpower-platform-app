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
  fileUrl?: string; // ✅ URL real del archivo desde la base de datos
  title: string;
  ownerName: string; // ✅ NOMBRE POR CADA ARCHIVO
  ocrResult?: OCRResult;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'failed';
  hoktusDecision?: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
  hoktusProcessingStatus?: 'COMPLETED' | 'FAILED' | 'VALIDATION';
  documentType?: string;
  observations?: any[];
}

interface DocumentPreviewModalProps {
  document: DocumentFile | null;
  isOpen: boolean;
  onClose: () => void;
  onManualDecision?: (documentId: string, decision: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW') => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  isOpen,
  onClose,
  onManualDecision,
}) => {
  if (!isOpen || !document) return null;

  const handleManualDecision = (decision: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW') => {
    if (onManualDecision && document.id) {
      onManualDecision(document.id, decision);
    }
  };

  const getStatusColor = (status: string, hoktusStatus?: string, hoktusDecision?: string) => {
    if (status === 'processing') {
      return 'bg-blue-100 text-blue-800';
    }
    if (status === 'error') {
      return 'bg-red-100 text-red-800';
    }
    if (hoktusStatus === 'FAILED') {
      return 'bg-red-100 text-red-800';
    }
    if (hoktusStatus === 'COMPLETED') {
      // Usar finalDecision para determinar el color
      if (hoktusDecision === 'APPROVED') {
        return 'bg-green-100 text-green-800';
      } else if (hoktusDecision === 'REJECTED') {
        return 'bg-red-100 text-red-800';
      } else if (hoktusDecision === 'MANUAL_REVIEW') {
        return 'bg-yellow-100 text-yellow-800';
      }
      return 'bg-green-100 text-green-800';
    }
    if (hoktusStatus === 'VALIDATION') {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (status: string, hoktusStatus?: string, hoktusDecision?: string) => {
    if (status === 'processing') return 'Procesando...';
    if (status === 'error') return 'Error';
    if (hoktusStatus === 'FAILED') return 'Rechazado';
    if (hoktusStatus === 'COMPLETED') {
      // Usar finalDecision para determinar el texto
      if (hoktusDecision === 'APPROVED') return 'Aprobado';
      if (hoktusDecision === 'REJECTED') return 'Rechazado';
      if (hoktusDecision === 'MANUAL_REVIEW') return 'Revisión Manual';
      return 'Aprobado';
    }
    if (hoktusStatus === 'VALIDATION') return 'Revisión Manual';
    return 'Completado';
  };

  const isImage = document.file.type.startsWith('image/');
  const isPdf = document.file.type === 'application/pdf';

  // Usar fileUrl si está disponible, sino usar previewUrl
  const documentUrl = document.fileUrl || document.previewUrl;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0.5">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[99vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{document.title}</h2>
            <p className="text-sm text-gray-500">{document.file.name}</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(document.status, document.hoktusProcessingStatus, document.hoktusDecision)}`}>
              {getStatusText(document.status, document.hoktusProcessingStatus, document.hoktusDecision)}
            </span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(99vh-140px)]">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Document Preview */}
            <div>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                {isImage ? (
                  <img
                    src={documentUrl}
                    alt={document.title}
                    className="max-w-full h-auto rounded shadow-sm"
                    style={{ maxHeight: '800px' }}
                  />
                ) : isPdf ? (
                  <div className="w-full h-[800px]">
                    <iframe
                      src={documentUrl}
                      className="w-full h-full rounded shadow-sm border-0"
                      title={`Vista previa de ${document.title}`}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-600">Vista previa no disponible para este tipo de archivo</p>
                  </div>
                )}
              </div>
            </div>

            {/* Document Information and OCR Results */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Documento</h3>

              {/* Document Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Nombre:</span>
                    <span className="text-sm text-gray-900">{document.file.name}</span>
                  </div>
                  {document.documentType && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Tipo de documento:</span>
                      <span className="text-sm text-gray-900">{document.documentType}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* OCR Results */}
              {document.ocrResult && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Resultados del OCR</h4>
                  <div className="bg-blue-50 rounded-lg p-4">


                    {document.ocrResult.fields && Object.keys(document.ocrResult.fields).length > 0 && (
                      <div>
                        <div className="space-y-2">
                          {Object.entries(document.ocrResult.fields).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-xs text-gray-600 capitalize">{key}:</span>
                              <span className="text-xs text-gray-900 font-medium">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Observations */}
              {document.observations && document.observations.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Observaciones</h4>
                  <div className="space-y-3">
                    {document.observations
                      .filter(obs => !obs.message?.includes('Documento no cumple con los criterios de calidad'))
                      .map((obs, index) => (
                        <div key={index} className="mb-2">
                          <p className="text-sm text-gray-700">
                            {obs.razon_interna || obs.razon || obs.message}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {/* Manual Decision Actions - Solo mostrar si está completado */}
              {document.hoktusProcessingStatus === 'COMPLETED' && (
                <div className='pt-2'>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Acción Manual</h4>
                  <div className="flex space-x-3">
                    {/* Solo mostrar "Aprobar" si está rechazado */}
                    {document.hoktusDecision === 'REJECTED' && (
                      <button
                        onClick={() => handleManualDecision('APPROVED')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                      >
                      Aprobar
                      </button>
                    )}
                    {/* Solo mostrar "Rechazar" si está aprobado */}
                    {document.hoktusDecision === 'APPROVED' && (
                      <button
                        onClick={() => handleManualDecision('REJECTED')}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                      >
                        Rechazar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={() => window.open(documentUrl, '_blank')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Abrir Original
          </button>
        </div>
      </div>
    </div>
  );
};