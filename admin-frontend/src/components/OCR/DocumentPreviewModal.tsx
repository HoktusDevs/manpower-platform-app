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
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !document) return null;

  const getStatusColor = (status: string, hoktusStatus?: string) => {
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
      return 'bg-green-100 text-green-800';
    }
    if (hoktusStatus === 'VALIDATION') {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (status: string, hoktusStatus?: string) => {
    if (status === 'processing') return 'Procesando...';
    if (status === 'error') return 'Error';
    if (hoktusStatus === 'FAILED') return 'Rechazado';
    if (hoktusStatus === 'COMPLETED') return 'Aprobado';
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
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(document.status, document.hoktusProcessingStatus)}`}>
              {getStatusText(document.status, document.hoktusProcessingStatus)}
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
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Tamaño:</span>
                    <span className="text-sm text-gray-900">
                      {(document.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Tipo:</span>
                    <span className="text-sm text-gray-900">{document.file.type || 'Desconocido'}</span>
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
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-gray-700">Confianza:</span>
                      <span className="text-sm font-bold text-blue-900">
                        {document.ocrResult.confidence}%
                      </span>
                    </div>

                    {document.ocrResult.text && document.ocrResult.text !== 'null' && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Texto extraído:</h5>
                        <div className="bg-white p-3 rounded border text-xs text-gray-600 max-h-32 overflow-y-auto">
                          {document.ocrResult.text}
                        </div>
                      </div>
                    )}

                    {document.ocrResult.fields && Object.keys(document.ocrResult.fields).length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Campos extraídos:</h5>
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

              {/* Observations */}
              {document.observations && document.observations.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Observaciones</h4>
                  <div className="space-y-3">
                    {document.observations.map((obs, index) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-yellow-800">{obs.regla || obs.capa}</span>
                          {obs.capa && (
                            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                              {obs.capa}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-yellow-700">
                          {obs.razon_interna || obs.razon || obs.message}
                        </p>
                      </div>
                    ))}
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