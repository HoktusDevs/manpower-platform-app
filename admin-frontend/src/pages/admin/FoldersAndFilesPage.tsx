import { FoldersManager, FoldersProvider } from '../../components/FoldersAndFiles';
import { useToast } from '../../core-ui/useToast';

/**
 * FoldersAndFilesPage
 * Refactored to use modular atomic design architecture
 * Now follows Clean Architecture principles with clear separation of concerns
 */
export const FoldersAndFilesPage: React.FC = () => {
  const { showSuccess, showError } = useToast();

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

  return (
    <FoldersProvider 
      onDeleteSuccess={handleDeleteSuccess}
      onDeleteError={handleDeleteError}
      onCreateSuccess={handleCreateSuccess}
      onCreateError={handleCreateError}
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Directorios y Archivos</h1>
        <FoldersManager />
      </div>
    </FoldersProvider>
  );
};