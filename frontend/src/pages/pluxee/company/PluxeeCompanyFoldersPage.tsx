import { DocumentUploader } from '../../../components/DocumentUploader';

/**
 * PluxeeCompanyFoldersPage
 * Company document upload interface for Pluxee portal
 * Simple document uploader for company files
 */
export const PluxeeCompanyFoldersPage: React.FC = () => {
  const handleUpload = (files: FileList) => {
    console.log('Archivos subidos:', files);
    // Aquí se puede implementar la lógica de guardado
  };

  return (
    <div className="h-full bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <DocumentUploader
            onUpload={handleUpload}
            maxFiles={20}
            maxFileSize={25}
          />
        </div>
      </div>
    </div>
  );
};