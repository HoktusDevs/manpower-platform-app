import { FoldersManager, FoldersProvider } from '../../../components/FoldersAndFiles';

/**
 * PluxeeFoldersAndFilesPage
 * Reuses the FoldersAndFiles functionality for Pluxee portal
 * Maintains the same atomic design architecture with Pluxee-specific context
 */
export const PluxeeFoldersAndFilesPage: React.FC = () => {
  return (
    <div className="h-full bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Gestión de Documentos Pluxee
            </h1>
            <p className="text-gray-600 mt-1">
              Administra archivos y documentos del sistema Pluxee, incluyendo contratos, reportes y configuraciones
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <FoldersProvider>
              <FoldersManager />
            </FoldersProvider>
          </div>
        </div>
      </div>
    </div>
  );
};