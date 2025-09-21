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

  return (
    <FoldersProvider 
      onDeleteSuccess={handleDeleteSuccess}
      onDeleteError={handleDeleteError}
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Directorios y Archivos</h1>
        <FoldersManager />
      </div>
    </FoldersProvider>
  );
};