import { Checkbox, RowActionsButton } from '../atoms';
import { FileActionsMenu } from './FileActionsMenu';
import type { File, FileAction } from '../types';

interface FileRowProps {
  file: File;
  isSelected: boolean;
  showActionsMenu: boolean;
  isLastRow?: boolean;
  indentLevel?: number;
  onSelect: (fileId: string) => void;
  onAction: (fileId: string, action: FileAction) => void;
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
      <div className="flex items-center w-full">
        {/* Carpeta Column - limited width */}
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
            <div className="ml-3 flex-1 flex items-center max-w-[500px]">
              {/* File Name - Fixed width container */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate" title={file.originalName}>{file.originalName}</p>
              </div>

              {/* Badges - Fixed position */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Status Badge */}
                {file.status && (
                  <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium h-6 min-w-[80px] ${
                    (() => {
                      const hoktusDecision = (file as any).hoktusDecision;
                      const hoktusProcessingStatus = (file as any).hoktusProcessingStatus;
                      
                      // Si está procesando
                      if (file.status === 'processing') {
                        return 'bg-blue-100 text-blue-800';
                      }
                      
                      // Si hay error o falló
                      if (file.status === 'error' || file.status === 'failed' || hoktusProcessingStatus === 'FAILED') {
                        return 'bg-red-100 text-red-800';
                      }
                      
                      // Si está completado, usar hoktusDecision
                      if (file.status === 'completed' && hoktusProcessingStatus === 'COMPLETED') {
                        if (hoktusDecision === 'APPROVED') {
                          return 'bg-green-100 text-green-800';
                        } else if (hoktusDecision === 'REJECTED') {
                          return 'bg-red-100 text-red-800';
                        } else if (hoktusDecision === 'MANUAL_REVIEW') {
                          return 'bg-yellow-100 text-yellow-800';
                        } else if (hoktusDecision === 'PENDING') {
                          return 'bg-gray-100 text-gray-800';
                        }
                      }
                      
                      // Si está en validación
                      if (hoktusProcessingStatus === 'VALIDATION') {
                        return 'bg-yellow-100 text-yellow-800';
                      }
                      
                      // Por defecto, pendiente
                      return 'bg-gray-100 text-gray-800';
                    })()
                  }`}>
                    {(() => {
                      const hoktusDecision = (file as any).hoktusDecision;
                      const hoktusProcessingStatus = (file as any).hoktusProcessingStatus;
                      
                      // Si está procesando
                      if (file.status === 'processing') {
                        return 'Procesando...';
                      }
                      
                      // Si hay error o falló
                      if (file.status === 'error' || file.status === 'failed' || hoktusProcessingStatus === 'FAILED') {
                        return 'Rechazado';
                      }
                      
                      // Si está completado, usar hoktusDecision
                      if (file.status === 'completed' && hoktusProcessingStatus === 'COMPLETED') {
                        if (hoktusDecision === 'APPROVED') {
                          return 'Aprobado';
                        } else if (hoktusDecision === 'REJECTED') {
                          return 'Rechazado';
                        } else if (hoktusDecision === 'MANUAL_REVIEW') {
                          return 'Revisión Manual';
                        } else if (hoktusDecision === 'PENDING') {
                          return 'Pendiente';
                        }
                      }
                      
                      // Si está en validación
                      if (hoktusProcessingStatus === 'VALIDATION') {
                        return 'Revisión Manual';
                      }
                      
                      // Por defecto, pendiente
                      return 'Pendiente';
                    })()}
                  </span>
                )}
                {/* Expiration Badge (placeholder) */}
                <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 whitespace-nowrap h-6 min-w-[80px]">
                  Expira: 5d
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Acciones Column */}
        <div className="w-24 text-right">
          <div className="flex items-center justify-end">
            {/* Row Actions */}
            <div className="relative">
              <RowActionsButton onClick={handleToggleActionsMenu} />
              
              <FileActionsMenu
                show={showActionsMenu}
                fileId={file.documentId}
                onAction={onAction}
              />
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};
