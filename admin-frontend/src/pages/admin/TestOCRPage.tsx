import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDocumentProcessingWebSocket } from '../../hooks/useDocumentProcessingWebSocket';
import { documentProcessingService } from '../../services/documentProcessingService';

// Definir las interfaces localmente
interface ProcessDocumentsRequest {
  owner_user_name: string;
  documents: Array<{
    file_name: string;
    file_url: string;
    platform_document_id: string;
  }>;
}

interface WebSocketNotification {
  documentId: string;
  status: string;
  processingStatus: string;
  finalDecision?: string;
  documentType?: string;
  ocrResult?: any;
  extractedData?: any;
  observations?: any[];
  message: string;
  ownerUserName: string;
  fileName?: string;
  processingTime?: number;
  timestamp: string;
  error?: string;
  lambdaError?: boolean;
}
import { OCRResultsTable } from '../../components/OCR/OCRResultsTable';
import { DocumentPreviewModal } from '../../components/OCR/DocumentPreviewModal';
import { cognitoAuthService } from '../../services/cognitoAuthService';

interface DocumentFile {
  id: string;
  file: File;
  previewUrl: string;
  fileUrl?: string; // ✅ URL real del archivo desde la base de datos
  title: string;
  ownerName: string; // ✅ NOMBRE POR CADA ARCHIVO
  ocrResult?: any;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'failed';
  hoktusDecision?: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'PENDING';
  hoktusProcessingStatus?: 'COMPLETED' | 'FAILED' | 'VALIDATION' | 'PROCESSING';
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

  // WebSocket para recibir actualizaciones en tiempo real del nuevo microservicio
  const { isConnected, connectionStatus, notifications, lastNotification } = useDocumentProcessingWebSocket();

  // Manejar notificaciones del WebSocket
  useEffect(() => {
    if (lastNotification) {
      console.log('Document Processing notification received:', lastNotification);

      const updateDoc = (doc: DocumentFile) => {
        if (doc.id === lastNotification.documentId) {
          if (lastNotification.status === 'completed' || lastNotification.status === 'failed') {
            return {
              ...doc,
              status: lastNotification.status === 'completed' ? 'completed' as const : 'error' as const,
              hoktusDecision: lastNotification.finalDecision as 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'PENDING',
              hoktusProcessingStatus: lastNotification.processingStatus as 'COMPLETED' | 'FAILED' | 'VALIDATION' | 'PROCESSING',
              documentType: lastNotification.documentType,
              observations: lastNotification.observations,
              ocrResult: lastNotification.ocrResult ? {
                success: true,
                text: lastNotification.ocrResult?.text || 'Texto extraído',
                confidence: 0.95,
                processingTime: lastNotification.processingTime || 0,
                language: 'es',
                metadata: {},
                fields: lastNotification.extractedData || {}
              } : undefined
            };
          } else if (lastNotification.status === 'processing') {
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
      if (lastNotification.status === 'completed' || lastNotification.status === 'failed') {
        setDocuments(prev => prev.filter(doc => doc.id !== lastNotification.documentId));
      } else {
        // Solo actualizar si aún está procesando
        setDocuments(prev => prev.map(updateDoc));
      }
    }
  }, [lastNotification]);

  // Cargar documentos históricos de la base de datos
  const loadHistoricalDocuments = useCallback(async () => {
    try {
      const result = await documentProcessingService.getDocuments();

      if (result.success && result.data) {
        console.log('🔍 DEBUG - Raw data from API:', result.data);
        
        const formattedDocs: DocumentFile[] = result.data.map((doc: any) => {
          console.log('🔍 Mapping document:', {
            id: doc.id,
            finalDecision: doc.finalDecision,
            status: doc.status,
            fileName: doc.fileName
          });
          
          const formatted = {
            id: doc.id,
            file: new File([], doc.fileName, { type: doc.fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg' }),
            previewUrl: doc.fileUrl || '/api/placeholder/100/100',
            fileUrl: doc.fileUrl, // ✅ Pasar el fileUrl real
            title: doc.fileName,
            ownerName: doc.ownerUserName || 'Unknown',
            status: doc.status === 'COMPLETED' ? 'completed' as const :
                    doc.status === 'FAILED' ? 'error' as const : 
                    doc.status === 'PROCESSING' ? 'processing' as const : 'processing' as const,
            hoktusDecision: doc.finalDecision,
            hoktusProcessingStatus: doc.status,
            documentType: doc.documentType,
            observations: doc.observations,
            ocrResult: doc.ocrResult ? {
              success: true,
              text: doc.ocrResult.text || '',
              confidence: doc.ocrResult.confidence || 0,
              processingTime: 0,
              language: 'es',
              metadata: {},
              fields: doc.extractedData ? {
                name: doc.extractedData.name,
                document_number: doc.extractedData.document_number,
                file_name: doc.extractedData.file_name,
                processed_at: doc.extractedData.processed_at
              } : {}
            } : undefined
          };
          console.log('🔍 DEBUG - Formatted document:', formatted);
          return formatted;
        });

        console.log('🔍 DEBUG - Total formatted documents:', formattedDocs.length);
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

  // WebSocket se encarga de las actualizaciones en tiempo real
  // Escuchar notificaciones del WebSocket para actualizar la tabla
  useEffect(() => {
    if (lastNotification) {
      console.log('🔔 WebSocket notification received:', lastNotification);
      
      // Si el documento se completó, recargar la tabla histórica
      if (lastNotification.status === 'completed' || lastNotification.processingStatus === 'COMPLETED') {
        console.log('📋 Document completed, reloading historical documents');
        loadHistoricalDocuments();
      }
    }
  }, [lastNotification, loadHistoricalDocuments]);

  // WebSocket debe manejar las actualizaciones en tiempo real
  // NO usar polling - el WebSocket debe funcionar correctamente

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
        ownerName: '', // ✅ CAMPO PARA NOMBRE DEL PROPIETARIO
        status: 'pending' // ✅ MOSTRAR COMO PENDIENTE HASTA QUE SE ENVÍE
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

    // PASO 1: Crear documento "optimista" en la tabla histórica inmediatamente
    const optimisticDocument: DocumentFile = {
      id: documentId,
      file: document.file,
      previewUrl: document.previewUrl,
      fileUrl: document.fileUrl,
      title: document.title,
      ownerName: document.ownerName,
      status: 'processing' as const,
      hoktusProcessingStatus: 'PROCESSING',
      hoktusDecision: undefined,
      documentType: undefined,
      observations: [],
      ocrResult: undefined
    };

    // Agregar inmediatamente a la tabla histórica como "Procesando"
    setHistoricalDocuments(prev => [optimisticDocument, ...prev]);
    console.log('📋 Documento agregado optimistamente como "Procesando"');

    // Cambiar estado a 'processing' cuando se presiona el botón
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

      // Paso 2: Enviar referencia al nuevo document_processing_microservice
      // Construir URL pública de S3
      const s3PublicUrl = `https://${presignedData.file.s3Bucket}.s3.us-east-1.amazonaws.com/${presignedData.file.s3Key}`;
      
      // Usar el nombre del propietario del documento específico
      const currentUser = cognitoAuthService.getCurrentUser();
      const finalOwnerName = document.ownerName.trim() || currentUser?.fullName || currentUser?.email || 'Usuario Admin';
      
      console.log('🔍 DEBUG - Document ownerName:', document.ownerName);
      console.log('🔍 DEBUG - Final owner name:', finalOwnerName);
      console.log('🔍 DEBUG - Current user:', currentUser);
      
      const requestData: ProcessDocumentsRequest = {
        owner_user_name: finalOwnerName,
        documents: [
          {
            file_name: document.file.name,
            file_url: s3PublicUrl, // URL pública de S3
            platform_document_id: platformDocumentId
          }
        ]
      };

      console.log('🔍 DEBUG - Request payload:', JSON.stringify(requestData, null, 2));

      // Llamar al nuevo document_processing_microservice
      const response = await documentProcessingService.processDocuments(requestData);

      if (response.status === 'success') {
        // Limpiar documento local ya que se procesó y está en la tabla histórica
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        console.log('Document sent for processing, waiting for WebSocket notification');
        console.log('Response:', response);
        // El documento optimista ya está en la tabla histórica, el WebSocket lo actualizará
      } else {
        // Actualizar documento optimista con error
        setHistoricalDocuments(prev => prev.map(doc => 
          doc.id === documentId ? { ...doc, status: 'error' as const, hoktusProcessingStatus: 'FAILED' } : doc
        ));
        setDocuments(prev => prev.map(doc => 
          doc.id === documentId ? { ...doc, status: 'error' } : doc
        ));
        setError('Error al enviar documento: ' + response.message);
      }
    } catch (err) {
      // Actualizar documento optimista con error
      setHistoricalDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, status: 'error' as const, hoktusProcessingStatus: 'FAILED' } : doc
      ));
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

  const updateDocumentOwnerName = (documentId: string, ownerName: string) => {
    console.log('🔍 DEBUG - Updating owner name for document:', documentId, 'to:', ownerName);
    setDocuments(prev => prev.map(doc =>
      doc.id === documentId ? { ...doc, ownerName } : doc
    ));
  };

  const removeDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const deleteDocument = async (documentId: string) => {
    try {
      await documentProcessingService.deleteDocument(documentId);
      
      // Actualizar la lista de documentos
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      setHistoricalDocuments(prev => prev.filter(doc => doc.id !== documentId));
      console.log(`Document ${documentId} deleted successfully`);
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

  const handleManualDecision = async (documentId: string, decision: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'PENDING') => {
    try {
      console.log(`🔄 Cambiando decisión del documento ${documentId} a: ${decision}`);
      
      const response = await documentProcessingService.updateDocumentDecision(documentId, decision);
      
      if (response.success) {
        console.log('✅ Decisión actualizada exitosamente:', response);
        
        // Actualizar inmediatamente el estado local de la tabla
        setHistoricalDocuments(prev => prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, hoktusDecision: decision }
            : doc
        ));
        
        // Actualizar también el previewDocument si está abierto
        if (previewDocument && previewDocument.id === documentId) {
          setPreviewDocument(prev => prev ? { ...prev, hoktusDecision: decision } : null);
        }
        
        // Recargar documentos históricos para asegurar sincronización con el backend
        await loadHistoricalDocuments();
        
        // Mostrar mensaje de éxito
        alert(`Documento ${decision === 'APPROVED' ? 'aprobado' : decision === 'REJECTED' ? 'rechazado' : decision === 'PENDING' ? 'marcado como pendiente' : 'marcado para revisión manual'} exitosamente`);
      } else {
        console.error('❌ Error actualizando decisión:', response);
        alert('Error al actualizar la decisión del documento');
      }
    } catch (error) {
      console.error('❌ Error en decisión manual:', error);
      alert('Error al actualizar la decisión del documento');
    }
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
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}></div>
              <span className={`text-sm font-medium ${
                connectionStatus === 'connected' ? 'text-green-700' : 
                connectionStatus === 'connecting' ? 'text-yellow-700' : 
                'text-red-700'
              }`}>
                {connectionStatus === 'connected' ? 'Conectado' : 
                 connectionStatus === 'connecting' ? 'Conectando...' : 
                 'Desconectado'}
              </span>
            </div>
          </div>
          
          {/* WebSocket Status Info */}
          {connectionStatus === 'error' && (
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
                    No se pudo conectar al servicio de procesamiento de documentos
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

                          {/* Nombre del propietario */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del propietario:</label>
                            <input
                              type="text"
                              value={document.ownerName}
                              onChange={(e) => updateDocumentOwnerName(document.id, e.target.value)}
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Ej: Juan Pérez"
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
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-gray-700">Resultados Históricos del OCR</h2>
          </div>
          <OCRResultsTable
            documents={historicalDocuments}
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
          onManualDecision={handleManualDecision}
        />

      </div>
    </div>
  );
};
