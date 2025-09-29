import React, { useState, useEffect, useCallback } from 'react';
import { DocumentCard } from '../molecules';
import { documentsService, type DocumentInfo, type FolderDocument } from '../../../services/documentsService';

interface DocumentsListProps {
  folders: unknown[];
  onDocumentView: (document: DocumentInfo) => void;
}

export const DocumentsList: React.FC<DocumentsListProps> = ({
  folders,
  onDocumentView,
}) => {
  const [folderDocuments, setFolderDocuments] = useState<FolderDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await documentsService.getAllDocumentsByFolders(folders);
      
      if (response.success && response.documents) {
        setFolderDocuments(response.documents);
      } else {
        setError(response.error || 'Error cargando documentos');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [folders]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleDownload = async (documentId: string) => {
    try {
      const response = await documentsService.downloadDocument(documentId);
      
      if (response.success && response.downloadUrl) {
        // Abrir en nueva pestaña para descarga
        window.open(response.downloadUrl, '_blank');
      } else {
        console.warn('No se pudo descargar el documento');
      }
    } catch {
      console.error('Error al descargar documento');
    }
  };

  const handleView = (documentId: string) => {
    const folderDoc = folderDocuments.find(fd => 
      fd.documents.some(doc => doc.documentId === documentId)
    );
    
    if (folderDoc) {
      const document = folderDoc.documents.find(doc => doc.documentId === documentId);
      if (document) {
        onDocumentView(document);
      }
    }
  };

  const getTotalDocuments = () => {
    return folderDocuments.reduce((total, folder) => total + folder.totalDocuments, 0);
  };

  const getCompletedDocuments = () => {
    return folderDocuments.reduce((total, folder) => 
      total + folder.documents.filter(doc => doc.status === 'completed').length, 0
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando documentos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">Error cargando documentos</div>
        <div className="text-sm text-gray-500">{error}</div>
        <button
          onClick={loadDocuments}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (folderDocuments.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-2">No hay documentos disponibles</div>
        <div className="text-sm text-gray-400 mb-4">
          Los documentos aparecerán aquí cuando los postulantes los suban
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-yellow-800">
              <strong>Nota:</strong> Los documentos se almacenan localmente en el navegador del postulante. 
              Para ver documentos reales, el postulante debe subirlos desde el applicant-frontend.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Estadísticas de Documentos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{getTotalDocuments()}</div>
            <div className="text-sm text-gray-500">Total Documentos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{getCompletedDocuments()}</div>
            <div className="text-sm text-gray-500">Completados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {getTotalDocuments() - getCompletedDocuments()}
            </div>
            <div className="text-sm text-gray-500">En Proceso</div>
          </div>
        </div>
      </div>

      {/* Lista de carpetas con documentos */}
      <div className="space-y-4">
        {folderDocuments.map((folder) => (
          <div key={folder.folderId} className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{folder.folderName}</h3>
                  <p className="text-sm text-gray-500">{folder.folderPath}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {folder.totalDocuments} documento{folder.totalDocuments !== 1 ? 's' : ''}
                  </div>
                  {folder.lastUploaded && (
                    <div className="text-xs text-gray-500">
                      Último: {new Date(folder.lastUploaded).toLocaleDateString('es-ES')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {folder.documents.map((document) => (
                  <DocumentCard
                    key={document.documentId}
                    document={document}
                    onDownload={handleDownload}
                    onView={handleView}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
