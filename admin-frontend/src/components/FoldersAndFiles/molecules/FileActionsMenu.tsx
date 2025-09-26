import type { FileAction } from '../types';

interface FileActionsMenuProps {
  show: boolean;
  fileId: string;
  onAction: (fileId: string, action: FileAction) => void;
}

/**
 * FileActionsMenu Molecule
 * Dropdown menu for individual file actions
 * Includes the 3 actions from Test OCR: view, download, delete
 */
export const FileActionsMenu: React.FC<FileActionsMenuProps> = ({
  show,
  fileId,
  onAction
}) => {
  if (!show) return null;

  const handleAction = (action: FileAction): void => {
    onAction(fileId, action);
  };

  return (
    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
      <div className="py-1">
        {/* Ver/View Action */}
        <button
          onClick={() => handleAction('view')}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Ver
        </button>

        {/* Descargar/Download Action */}
        <button
          onClick={() => handleAction('download')}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Descargar
        </button>
        
        {/* Eliminar/Delete Action */}
        <button
          onClick={() => handleAction('delete')}
          className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center"
        >
          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Eliminar
        </button>
      </div>
    </div>
  );
};
