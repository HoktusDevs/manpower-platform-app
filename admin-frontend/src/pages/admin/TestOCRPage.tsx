import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useOCRWebSocket } from '../../hooks/useOCRWebSocket';
import { OCRResultsTable } from '../../components/OCR/OCRResultsTable';
import { DocumentPreviewModal } from '../../components/OCR/DocumentPreviewModal';

interface DocumentFile {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  ocrResult?: any;
  status: 'pending' | 'processing' | 'completed' | 'error';
  hoktusDecision?: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
  hoktusProcessingStatus?: 'COMPLETED' | 'FAILED' | 'VALIDATION';
  documentType?: string;
  observations?: any[];
}

export const TestOCRPage = () => {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [historicalDocuments, setHistoricalDocuments] = useState<DocumentFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<DocumentFile | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WebSocket para recibir actualizaciones en tiempo real
  const handleDocumentUpdate = useCallback((update: any) => {
    console.log('Document update received:', update);

    const updateDoc = (doc: DocumentFile) => {
      if (doc.id === update.documentId) {
        if (update.status === 'completed' || update.status === 'failed') {
          return {
            ...doc,
            status: update.status === 'completed' ? 'completed' as const : 'error' as const,
            hoktusDecision: update.hoktusDecision,
            hoktusProcessingStatus: update.hoktusProcessingStatus,
            documentType: update.documentType,
            observations: update.observations,
            ocrResult: update.ocrResult ? {
              success: update.ocrResult.success || false,
              text: update.ocrResult?.extractedText || 'No se pudo extraer texto',
              confidence: update.ocrResult?.confidence || 0,
              processingTime: update.ocrResult?.processingTime || 0,
              language: update.ocrResult?.language || 'unknown',
              metadata: update.ocrResult?.metadata || {},
              fields: update.ocrResult?.fields || {}
            } : undefined
          };
        } else if (update.status === 'processing') {
          return {
            ...doc,
            status: 'processing' as const
          };
        }
      }
      return doc;
    };

    // Actualizar documentos históricos
    setHistoricalDocuments(prev => prev.map(updateDoc));

    // Para documentos locales: si se completó o falló, eliminar del panel de documentos
    // ya que aparecerá en la tabla de resultados
    if (update.status === 'completed' || update.status === 'failed') {
      setDocuments(prev => prev.filter(doc => doc.id !== update.documentId));
    } else {
      // Solo actualizar si aún está procesando
      setDocuments(prev => prev.map(updateDoc));
    }
  }, []);

  const { isConnected, connectionError } = useOCRWebSocket(handleDocumentUpdate);

  // Cargar documentos históricos de la base de datos
  const loadHistoricalDocuments = useCallback(async () => {
    try {
      const response = await fetch('https://xtspcl5cj6.execute-api.us-east-1.amazonaws.com/dev/api/ocr/documents');
      const result = await response.json();

      if (result.success && result.data) {
        const formattedDocs: DocumentFile[] = result.data.map((doc: any) => ({
          id: doc.platformDocumentId || doc.id,
          file: new File([], doc.fileName, { type: doc.fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg' }), // Mock file with proper type
          previewUrl: doc.fileUrl || '/api/placeholder/100/100', // Use actual fileUrl from database
          title: doc.fileName,
          status: doc.status || 'completed' as const,
          hoktusDecision: doc.hoktusDecision,
          hoktusProcessingStatus: doc.hoktusProcessingStatus,
          documentType: doc.documentType,
          observations: doc.observations,
          ocrResult: doc.ocrResult ? {
            success: doc.ocrResult.success,
            text: doc.ocrResult.extractedText || '',
            confidence: doc.ocrResult.confidence || 0,
            processingTime: doc.ocrResult.processingTime || 0,
            language: doc.ocrResult.language || 'unknown',
            metadata: doc.ocrResult.metadata || {},
            fields: doc.ocrResult.fields || {}
          } : undefined
        }));

        setHistoricalDocuments(formattedDocs);
      }
    } catch (error) {
      console.error('Error loading historical documents:', error);
    }
  }, []);

  // Cargar documentos históricos al montar el componente
  useEffect(() => {
    loadHistoricalDocuments();
  }, [loadHistoricalDocuments]);

  const processFile = useCallback((file: File) => {
    const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // Crear preview de la imagen
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewUrl = e.target?.result as string;
      const newDocument: DocumentFile = {
        id,
        file,
        previewUrl,
        title: file.name,
        status: 'pending'
      };
      
      setDocuments(prev => [...prev, newDocument]);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(event.dataTransfer.files);
    files.forEach(file => {
      // Verificar que sea un tipo de archivo válido
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        processFile(file);
      } else {
        setError('Por favor, selecciona archivos de imagen (JPG, PNG) o PDF');
      }
    });
  };

  const handleOCR = async (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (!document) return;

    setIsLoading(true);
    setError(null);

    // Actualizar estado del documento
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId ? { ...doc, status: 'processing' } : doc
    ));

    try {
      // Paso 1: Subir archivo a S3 usando files-service
      const platformDocumentId = document.id;

      // Obtener presignedURL del files-service
      const presignedResponse = await fetch('https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev/files/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderId: 'ocr-temp-folder', // Carpeta temporal para OCR
          originalName: document.file.name,
          fileType: document.file.type,
          fileSize: document.file.size
        })
      });

      const presignedData = await presignedResponse.json();
      
      if (!presignedData.success) {
        throw new Error('Error obteniendo presignedURL: ' + presignedData.error);
      }

      // Subir archivo a S3
      const uploadResponse = await fetch(presignedData.uploadUrl, {
        method: 'PUT',
        body: document.file,
        headers: {
          'Content-Type': document.file.type,
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Error subiendo archivo a S3');
      }

      // Paso 2: Enviar referencia a ocr-service
      // Construir URL pública de S3
      const s3PublicUrl = `https://${presignedData.file.s3Bucket}.s3.us-east-1.amazonaws.com/${presignedData.file.s3Key}`;
      
      const requestData = {
        ownerUserName: 'Usuario de Prueba',
        documents: [
          {
            fileName: document.file.name,
            fileUrl: s3PublicUrl, // URL pública de S3
            platformDocumentId: platformDocumentId
          }
        ]
      };

      // Llamar al microservicio OCR
      const response = await fetch('https://xtspcl5cj6.execute-api.us-east-1.amazonaws.com/dev/api/ocr/process-documents-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (result.success) {
        // El WebSocket se encargará de notificar cuando esté listo
        console.log('Document sent for processing, waiting for WebSocket notification');
      } else {
        setDocuments(prev => prev.map(doc => 
          doc.id === documentId ? { ...doc, status: 'error' } : doc
        ));
        setError('Error al enviar documento: ' + result.error);
      }
    } catch (err) {
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, status: 'error' } : doc
      ));
      setError('Error al procesar la imagen: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };


  const handleClear = () => {
    setDocuments([]);
    setError(null);
    setIsDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateDocumentTitle = (documentId: string, title: string) => {
    setDocuments(prev => prev.map(doc =>
      doc.id === documentId ? { ...doc, title } : doc
    ));
  };

  const removeDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`https://xtspcl5cj6.execute-api.us-east-1.amazonaws.com/dev/api/ocr/delete/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        // Solo eliminar de los arrays locales si la eliminación en la base de datos fue exitosa
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        setHistoricalDocuments(prev => prev.filter(doc => doc.id !== documentId));
      } else {
        console.error('Error deleting document:', result.error);
        // Opcionalmente mostrar un mensaje de error al usuario
        setError(`Error al eliminar documento: ${result.error}`);
      }
    } catch (error) {
      console.error('Error calling delete API:', error);
      setError('Error al eliminar el documento. Por favor, inténtalo de nuevo.');
    }
  };

  const handlePreviewDocument = (document: DocumentFile) => {
    setPreviewDocument(document);
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setPreviewDocument(null);
  };


  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Test OCR</h1>
              <p className="text-gray-600">
                Prueba la funcionalidad de reconocimiento óptico de caracteres (OCR) para extraer texto de imágenes
              </p>
            </div>
            
            {/* WebSocket Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </div>
          
          {/* WebSocket Error */}
          {connectionError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error de conexión WebSocket</h3>
                  <div className="mt-1 text-sm text-red-700">
                    {connectionError}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel izquierdo - Subida de archivos */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar documentos
              </label>
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragOver 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileSelect}
                  multiple
                  className="hidden"
                />
                <div className="space-y-4">
                  <div className="text-gray-500">
                    <svg className="mx-auto h-16 w-16 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      Arrastra y suelta tus archivos aquí
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      o haz clic para seleccionar múltiples archivos
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Formatos soportados: JPG, PNG, PDF
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleClear}
                disabled={documents.length === 0}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Limpiar todo
              </button>
            </div>
          </div>

          {/* Panel derecho - Lista de documentos */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-700">Documentos ({documents.length})</h3>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2">No hay documentos seleccionados</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {documents.map((document) => (
                  <div key={document.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex items-start">
                      {/* Información del documento */}
                      <div className="flex-1 min-w-0">
                        <div className="space-y-2">
                          {/* Título editable */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Título:</label>
                            <input
                              type="text"
                              value={document.title}
                              onChange={(e) => updateDocumentTitle(document.id, e.target.value)}
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Ej: Carnet Frontal"
                            />
                          </div>
                          
                          
                          {/* Estado y acciones */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                document.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                                document.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                document.status === 'completed' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {document.status === 'pending' ? 'Pendiente' :
                                 document.status === 'processing' ? 'Procesando...' :
                                 document.status === 'completed' ? 'Completado' : 'Error'}
                              </span>
                            </div>
                            
                            <div className="flex space-x-2">
                              {document.status === 'pending' && (
                                <button
                                  onClick={() => handleOCR(document.id)}
                                  disabled={isLoading}
                                  className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                                >
                                  Procesar OCR
                                </button>
                              )}
                              <button
                                onClick={() => removeDocument(document.id)}
                                className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                          
                          {/* Resultados OCR */}
                          {document.ocrResult && (
                            <div className="mt-3 bg-gray-50 rounded border">
                              <div className="px-3 py-2 bg-gray-100 border-b">
                                <h4 className="text-sm font-medium text-gray-700">Resultados del Procesamiento OCR</h4>
                              </div>
                              <div className="p-3">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b">
                                        <th className="text-left py-2 font-medium text-gray-600">Métrica</th>
                                        <th className="text-left py-2 font-medium text-gray-600">Valor</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="border-b">
                                        <td className="py-2 text-gray-600">Confianza</td>
                                        <td className="py-2">
                                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            document.ocrResult.confidence >= 80 ? 'bg-green-100 text-green-800' :
                                            document.ocrResult.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                          }`}>
                                            {document.ocrResult.confidence}%
                                          </span>
                                        </td>
                                      </tr>
                                      <tr className="border-b">
                                        <td className="py-2 text-gray-600">Idioma detectado</td>
                                        <td className="py-2 font-medium">{document.ocrResult.language}</td>
                                      </tr>
                                      <tr className="border-b">
                                        <td className="py-2 text-gray-600">Tiempo de procesamiento</td>
                                        <td className="py-2 font-medium">{document.ocrResult.processingTime}s</td>
                                      </tr>
                                      <tr>
                                        <td className="py-2 text-gray-600">Caracteres extraídos</td>
                                        <td className="py-2 font-medium">{document.ocrResult.text?.length || 0}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                                
                                <div className="mt-3">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Texto extraído:</label>
                                  <textarea
                                    value={document.ocrResult.text}
                                    readOnly
                                    rows={4}
                                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white resize-none"
                                    placeholder="Texto extraído aparecerá aquí..."
                                  />
                                </div>
                                
                                {/* Campos estructurados si están disponibles */}
                                {document.ocrResult.fields && Object.keys(document.ocrResult.fields).length > 0 && (
                                  <div className="mt-3">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Campos estructurados:</label>
                                    <div className="bg-gray-50 rounded border p-2 max-h-32 overflow-y-auto">
                                      <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                                        {JSON.stringify(document.ocrResult.fields, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabla de resultados del OCR */}
        <div className="mt-8">
          <OCRResultsTable
            documents={[...documents, ...historicalDocuments]}
            onDeleteDocument={deleteDocument}
            onPreviewDocument={handlePreviewDocument}
            isLoading={isLoading}
          />
        </div>

        {/* Modal de vista previa */}
        <DocumentPreviewModal
          document={previewDocument}
          isOpen={showPreviewModal}
          onClose={handleClosePreview}
        />

      </div>
    </div>
  );
};
