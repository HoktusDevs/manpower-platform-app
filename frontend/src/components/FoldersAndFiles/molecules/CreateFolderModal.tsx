import { FORM_VALIDATION } from '../types';
import type { CreateFolderModalProps, CreateFolderData } from '../types';

/**
 * CreateFolderModal Molecule
 * Modal component for creating and editing folders
 * Handles its own form state and validation
 */
export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  show,
  mode = 'create',
  parentFolderName,
  formData,
  onFormChange,
  onSubmit,
  onClose
}) => {
  if (!show) return null;

  const isEditMode = mode === 'edit';
  const isSubfolder = parentFolderName !== undefined;
  const modalTitle = isEditMode 
    ? 'Editar Carpeta' 
    : isSubfolder 
      ? `Crear Subcarpeta en "${parentFolderName}"` 
      : 'Crear Nueva Carpeta';
  const submitButtonText = isEditMode ? 'Guardar Cambios' : 'Crear Carpeta';

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    
    // Validation
    if (!formData.folderName.trim()) {
      alert(FORM_VALIDATION.REQUIRED_NAME);
      return;
    }
    
    if (!formData.folderType.trim()) {
      alert(FORM_VALIDATION.REQUIRED_TYPE);
      return;
    }

    const submitData: CreateFolderData = {
      name: formData.folderName.trim(),
      type: formData.folderType.trim()
    };

    onSubmit(submitData);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onFormChange({ folderName: e.target.value });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onFormChange({ folderType: e.target.value });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-[300px] mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {modalTitle}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la Carpeta
              </label>
              <input
                type="text"
                id="folderName"
                value={formData.folderName}
                onChange={handleNameChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Empresa, Región, Comuna..."
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="folderType" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Carpeta
              </label>
              <input
                type="text"
                id="folderType"
                value={formData.folderType}
                onChange={handleTypeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Organización, Ubicación, Departamento..."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                {submitButtonText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};