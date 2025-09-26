import { Checkbox, RowActionsButton } from '../atoms';
import { RowActionsMenu } from './RowActionsMenu';
import type { File } from '../../types';

interface FileRowProps {
  file: File;
  isSelected: boolean;
  showActionsMenu: boolean;
  isLastRow?: boolean;
  indentLevel?: number;
  onSelect: (fileId: string) => void;
  onAction: (fileId: string, action: string) => void;
  onToggleActionsMenu: (fileId: string | null) => void;
}

/**
 * FileRow Molecule
 * Individual row displaying file information
 * Replicates the same structure as FolderRow but for files
 */
export const FileRow: React.FC<FileRowProps> = ({
  file,
  isSelected,
  showActionsMenu,
  isLastRow = false,
  indentLevel = 0,
  onSelect,
  onAction,
  onToggleActionsMenu
}) => {
  const handleSelect = (): void => {
    onSelect(file.documentId);
  };

  const handleToggleActionsMenu = (): void => {
    onToggleActionsMenu(showActionsMenu ? null : file.documentId);
  };

  const handleDoubleClick = (): void => {
    // TODO: Implement file preview or download
    console.log('File double-clicked:', file.originalName);
  };

  const rowClassName = `px-6 py-4 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''} ${!isLastRow ? 'border-b border-gray-200' : ''}`;

  return (
    <li className={rowClassName} onDoubleClick={handleDoubleClick}>
      <div className="flex items-center">
        {/* Carpeta Column - takes more space */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            {/* Checkbox - always aligned to the left */}
            <div className="w-6 flex-shrink-0 mr-2">
              <Checkbox
                checked={isSelected}
                onChange={handleSelect}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            
            {/* Indentation spacer */}
            <div className="w-4 mr-2" style={{ marginLeft: `${indentLevel * 20}px` }}>
              <div className="w-4 h-4"></div>
            </div>
            
            {/* Empty space for arrow (files don't expand) */}
            <div className="w-4 mr-2">
              <div className="w-4 h-4"></div>
            </div>
            
            {/* File Icon */}
            <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            
            {/* File Information */}
            <div className="ml-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900">{file.originalName}</p>
                {/* File Type Badge */}
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {file.fileType?.split('/')[1]?.toUpperCase() || 'FILE'}
                </span>
                {/* Status Badge */}
                {file.status && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    file.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    file.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    file.status === 'completed' ? 'bg-green-100 text-green-800' :
                    file.status === 'failed' || file.status === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {file.status === 'pending' ? 'Pendiente' :
                     file.status === 'processing' ? 'Procesando...' :
                     file.status === 'completed' ? 'Completado' :
                     file.status === 'failed' ? 'Fallido' :
                     file.status === 'error' ? 'Error' : 'Desconocido'}
                  </span>
                )}
                {/* Expiration Badge (placeholder) */}
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Expira en: 5 días
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tipo Column */}
        <div className="w-24 text-center">
          <span className="text-sm text-gray-400">-</span>
        </div>
        
        {/* Status Columns - fixed width */}
        <div className="w-20 text-center">
          <span className="text-sm text-gray-400">-</span>
        </div>
        
        <div className="w-20 text-center">
          <span className="text-sm text-gray-400">-</span>
        </div>
        
        <div className="w-20 text-center">
          <span className="text-sm text-gray-400">-</span>
        </div>
        
        <div className="w-20 text-center">
          <span className="text-sm text-gray-400">-</span>
        </div>
        
        <div className="w-20 text-center">
          <span className="text-sm text-gray-400">-</span>
        </div>
        
        {/* Acciones Column */}
        <div className="w-24 text-center">
          <div className="flex items-center justify-center">
            {/* Row Actions */}
            <div className="relative">
              <RowActionsButton onClick={handleToggleActionsMenu} />
              
              <RowActionsMenu
                show={showActionsMenu}
                folderId={file.documentId}
                onAction={onAction}
              />
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};
