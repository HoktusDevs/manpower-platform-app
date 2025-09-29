import React, { useState } from 'react';
import { FoldersManager, FoldersProvider } from '../../components/FoldersAndFiles';
import { DocumentViewer } from '../../components/Documents';
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
  const [selectedDocument, setSelectedDocument] = useState<DocumentInfo | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);


  const handleDeleteSuccess = () => {
    showSuccess('Carpetas eliminadas', 'Las carpetas se eliminaron exitosamente');
  };

  const handleDeleteError = () => {
    showError('Error al eliminar', 'No se pudieron eliminar las carpetas seleccionadas');
  };

  const handleCreateSuccess = () => {
    showSuccess('Carpeta creada', 'La carpeta se creó exitosamente');
  };

  const handleCreateError = () => {
    showError('Error al crear', 'No se pudo crear la carpeta');
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
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Directorios y Archivos</h1>
        </div>

        {/* Content */}
        <FoldersManager />

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