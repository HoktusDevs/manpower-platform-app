import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FolderAction } from '../types';

interface RowActionsMenuProps {
  show: boolean;
  folderId: string;
  onAction: (folderId: string, action: FolderAction) => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

/**
 * RowActionsMenu Molecule
 * Dropdown menu for individual row actions
 * Follows Single Responsibility Principle
 * Uses Portal to render outside scroll container
 */
export const RowActionsMenu: React.FC<RowActionsMenuProps> = ({
  show,
  folderId,
  onAction,
  buttonRef
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show && buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect();

      console.log('Button rect:', rect);

      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 192 // 192px = w-48
      });
    }
  }, [show, buttonRef]);

  if (!show) return null;

  const handleAction = (action: FolderAction): void => {
    onAction(folderId, action);
  };

  const menuContent = (
    <div
      ref={menuRef}
      className="absolute w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[9999]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      <div className="py-1">
        <button
          onClick={() => handleAction('upload-files')}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Subir archivo/s
        </button>

        <button
          onClick={() => handleAction('create-subfolder')}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Crear Subcarpeta
        </button>

        <button
          onClick={() => handleAction('edit')}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </button>
        
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

  return createPortal(menuContent, document.body);
};