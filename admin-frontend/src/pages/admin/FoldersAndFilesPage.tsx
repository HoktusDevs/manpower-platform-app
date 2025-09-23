import React, { useState, useEffect } from 'react';
import { FoldersManager, FoldersProvider } from '../../components/FoldersAndFiles';
import { DocumentsList } from '../../components/Documents/DocumentsList';
import { DocumentViewer } from '../../components/Documents/DocumentViewer';
import type { DocumentInfo } from '../../services/documentsService';
import { useToast } from '../../core-ui/useToast';

/**
 * FoldersAndFilesPage
 * Refactored to use modular atomic design architecture
 * Now follows Clean Architecture principles with clear separation of concerns
 * Enhanced with document management capabilities
 */
export const FoldersAndFilesPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentInfo | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [activeTab, setActiveTab] = useState<'folders' | 'documents'>('folders');

  useEffect(() => {
    // Simular carga de carpetas (en un sistema real, esto vendría del backend)
    const mockFolders = [
      {
        "isActive": true,
        "childrenCount": 0,
        "userId": "b41824b8-70d1-7052-4d26-cbfaefcac8ed",
        "updatedAt": "2025-09-21T21:20:35.900Z",
        "folderId": "2466348b-0aa7-4f47-81ab-a9f6dec5afc5",
        "createdAt": "2025-09-21T21:20:35.900Z",
        "parentId": "384d9206-642f-409f-88c1-35dd0c17aed8",
        "name": "Metropolitana",
        "type": "Region",
        "path": "/SmartFit/Metropolitana"
      },
      {
        "isActive": true,
        "childrenCount": 0,
        "userId": "b41824b8-70d1-7052-4d26-cbfaefcac8ed",
        "updatedAt": "2025-09-21T20:37:56.926Z",
        "folderId": "384d9206-642f-409f-88c1-35dd0c17aed8",
        "createdAt": "2025-09-21T20:37:56.926Z",
        "name": "SmartFit",
        "type": "Empresa",
        "path": "/SmartFit"
      },
      {
        "isActive": true,
        "childrenCount": 0,
        "userId": "b41824b8-70d1-7052-4d26-cbfaefcac8ed",
        "updatedAt": "2025-09-22T20:14:16.581Z",
        "folderId": "46ec420d-13d5-42b2-bfd1-5775dc6986fc",
        "createdAt": "2025-09-22T20:14:16.581Z",
        "name": "Fletzy",
        "type": "Empresa",
        "path": "/Fletzy"
      },
      {
        "isActive": true,
        "childrenCount": 0,
        "userId": "b41824b8-70d1-7052-4d26-cbfaefcac8ed",
        "updatedAt": "2025-09-22T20:14:42.469Z",
        "folderId": "4c89b3b6-c11f-441f-9b1c-c0d39d44aacd",
        "createdAt": "2025-09-22T20:14:42.469Z",
        "parentId": "46ec420d-13d5-42b2-bfd1-5775dc6986fc",
        "name": "La florida",
        "type": "Comuna",
        "path": "/Fletzy/La florida"
      },
      {
        "isActive": true,
        "childrenCount": 0,
        "userId": "b41824b8-70d1-7052-4d26-cbfaefcac8ed",
        "updatedAt": "2025-09-21T20:35:40.884Z",
        "folderId": "5232baed-e575-4a03-b5a2-8fb2d3c76b3b",
        "createdAt": "2025-09-21T20:35:40.884Z",
        "name": "Falabella",
        "type": "Empresa",
        "path": "/Falabella"
      },
      {
        "metadata": {
          "createdAt": "2025-09-23T12:07:41.972Z",
          "applicationStatus": "PENDING",
          "createdBy": "applications-service",
          "jobTitle": "Gardia de Seguridad",
          "companyName": "Falabella",
          "location": "Santiago (100% Remoto)",
          "applicationId": "fadbe1a8-a543-4556-a7a7-2566b26a123d_e4f80488-c021-7069-215a-7aa326fa29b9",
          "applicantEmail": "user@example.com",
          "appliedAt": "2025-09-23T12:07:41.972Z"
        },
        "isActive": true,
        "childrenCount": 0,
        "userId": "b41824b8-70d1-7052-4d26-cbfaefcac8ed",
        "updatedAt": "2025-09-23T12:07:44.837Z",
        "folderId": "70a73e89-4315-416e-96e2-86670e34c043",
        "createdAt": "2025-09-23T12:07:44.837Z",
        "parentId": "cb4894a3-70b9-4550-a8ef-f289cd6ee147",
        "name": "ricardo",
        "type": "Postulante",
        "path": "/Falabella/Gardia de Seguridad - Falabella - Santiago (100% Remoto)/ricardo"
      },
      {
        "isActive": true,
        "childrenCount": 0,
        "userId": "b41824b8-70d1-7052-4d26-cbfaefcac8ed",
        "updatedAt": "2025-09-21T21:20:48.773Z",
        "folderId": "a804a775-487c-4aff-bde7-11ec6a11532f",
        "createdAt": "2025-09-21T21:20:48.773Z",
        "parentId": "5232baed-e575-4a03-b5a2-8fb2d3c76b3b",
        "name": "Los lagos",
        "type": "Region",
        "path": "/Falabella/Los lagos"
      },
      {
        "metadata": {
          "location": "Santiago (100% Remoto)",
          "jobTitle": "Gardia de Seguridad",
          "companyName": "Falabella"
        },
        "isActive": true,
        "childrenCount": 0,
        "userId": "b41824b8-70d1-7052-4d26-cbfaefcac8ed",
        "updatedAt": "2025-09-23T12:04:54.472Z",
        "folderId": "cb4894a3-70b9-4550-a8ef-f289cd6ee147",
        "createdAt": "2025-09-23T12:04:54.472Z",
        "parentId": "5232baed-e575-4a03-b5a2-8fb2d3c76b3b",
        "name": "Gardia de Seguridad - Falabella - Santiago (100% Remoto)",
        "type": "Cargo",
        "path": "/Falabella/Gardia de Seguridad - Falabella - Santiago (100% Remoto)"
      },
      {
        "metadata": {
          "createdAt": "2025-09-22T20:12:51.855Z",
          "applicationStatus": "PENDING",
          "createdBy": "applications-service",
          "jobTitle": "Desarrollador",
          "companyName": "Falabella > Los lagos",
          "location": "Por definir",
          "applicationId": "d66db9c7-3b97-4042-a730-3377ec49057a_e4f80488-c021-7069-215a-7aa326fa29b9",
          "applicantEmail": "user@example.com",
          "appliedAt": "2025-09-22T20:12:51.854Z"
        },
        "isActive": true,
        "childrenCount": 0,
        "userId": "b41824b8-70d1-7052-4d26-cbfaefcac8ed",
        "updatedAt": "2025-09-22T20:12:54.580Z",
        "folderId": "d3ab3951-d30f-485b-b879-41ee78f5f278",
        "createdAt": "2025-09-22T20:12:54.580Z",
        "parentId": "b431de06-5d41-44ce-85e4-dfe3ef116c9c",
        "name": "ricardo",
        "type": "Postulante",
        "path": "/ricardo"
      },
      {
        "metadata": {
          "createdAt": "2025-09-22T20:16:04.093Z",
          "applicationStatus": "PENDING",
          "createdBy": "applications-service",
          "jobTitle": "Transportador",
          "companyName": "Fletzy > La florida",
          "location": "Por definir",
          "applicationId": "120a05b4-8b91-4e35-b39d-3311398cdc3d_e4f80488-c021-7069-215a-7aa326fa29b9",
          "applicantEmail": "user@example.com",
          "appliedAt": "2025-09-22T20:16:04.093Z"
        },
        "isActive": true,
        "childrenCount": 0,
        "userId": "b41824b8-70d1-7052-4d26-cbfaefcac8ed",
        "updatedAt": "2025-09-22T20:16:04.524Z",
        "folderId": "d4966d8b-7b0f-4e47-aa15-99d89280ff5e",
        "createdAt": "2025-09-22T20:16:04.524Z",
        "parentId": "4d2e4b56-deb5-41e1-bd34-dc40383ed8b2",
        "name": "ricardo",
        "type": "Postulante",
        "path": "/ricardo"
      }
    ];
    
    setFolders(mockFolders);
  }, []);

  const handleDeleteSuccess = () => {
    showSuccess('Carpetas eliminadas', 'Las carpetas se eliminaron exitosamente');
  };

  const handleDeleteError = (error: Error) => {
    console.error('Error deleting folders:', error);
    showError('Error al eliminar', 'No se pudieron eliminar las carpetas seleccionadas');
  };

  const handleCreateSuccess = () => {
    showSuccess('Carpeta creada', 'La carpeta se creó exitosamente');
  };

  const handleCreateError = (error: Error) => {
    console.error('Error creating folder:', error);
    showError('Error al crear', 'No se pudo crear la carpeta');
  };

  const handleDocumentView = (document: DocumentInfo) => {
    setSelectedDocument(document);
    setShowDocumentViewer(true);
  };

  const handleCloseDocumentViewer = () => {
    setShowDocumentViewer(false);
    setSelectedDocument(null);
  };


  return (
    <FoldersProvider 
      onDeleteSuccess={handleDeleteSuccess}
      onDeleteError={handleDeleteError}
      onCreateSuccess={handleCreateSuccess}
      onCreateError={handleCreateError}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Directorios y Archivos</h1>
          
          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('folders')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'folders'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Carpetas
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'documents'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Documentos
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'folders' ? (
          <FoldersManager />
        ) : (
          <DocumentsList 
            folders={folders}
            onDocumentView={handleDocumentView}
          />
        )}

        {/* Document Viewer Modal */}
        <DocumentViewer
          document={selectedDocument}
          isOpen={showDocumentViewer}
          onClose={handleCloseDocumentViewer}
        />
      </div>
    </FoldersProvider>
  );
};