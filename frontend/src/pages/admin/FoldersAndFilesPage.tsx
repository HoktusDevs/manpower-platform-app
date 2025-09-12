import { FoldersManager, FoldersProvider } from '../../components/FoldersAndFiles';

/**
 * FoldersAndFilesPage
 * Refactored to use modular atomic design architecture
 * Now follows Clean Architecture principles with clear separation of concerns
 */
export const FoldersAndFilesPage: React.FC = () => {
  return (
    <FoldersProvider>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Directorios y Archivos</h1>
        <FoldersManager />
      </div>
    </FoldersProvider>
  );
};