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
      <div className="flex items-center justify-between">
        {/* Fixed Checkbox Column - aligned with parent folder */}
        <div className="w-6 flex-shrink-0">
          <Checkbox
            checked={isSelected}
            onChange={handleSelect}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>

        {/* Content Area (indentable) */}
        <div className="flex items-center flex-1 ml-4" style={{ marginLeft: `${16 + (indentLevel * 20)}px` }}>
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
            <p className="text-sm font-medium text-gray-900">{file.originalName}</p>
            <div className="text-sm text-gray-500 space-y-0.5">
              <div className="flex items-center gap-4">
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : 'Tamaño desconocido'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions Column */}
        <div className="flex items-center space-x-2 flex-shrink-0">
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
    </li>
  );
};
