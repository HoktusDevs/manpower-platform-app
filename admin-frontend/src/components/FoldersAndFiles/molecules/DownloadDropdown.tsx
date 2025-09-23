import React, { useState, useRef, useEffect } from 'react';

interface DownloadDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onDownloadAll: () => void;
  onDownloadSelected: () => void;
  selectedCount: number;
  hasSelection: boolean;
}

export const DownloadDropdown: React.FC<DownloadDropdownProps> = ({
  isOpen,
  onToggle,
  onClose,
  onDownloadAll,
  onDownloadSelected,
  selectedCount,
  hasSelection
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleDownloadAll = () => {
    onDownloadAll();
    onClose();
  };

  const handleDownloadSelected = () => {
    onDownloadSelected();
    onClose();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Download Button */}
      <button
        onClick={onToggle}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Descargar
        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="p-3">
            {/* Download Options */}
            <div className="space-y-2">
              {/* Download All */}
              <button
                onClick={handleDownloadAll}
                className="w-full flex items-center p-2 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Todo el contenido</p>
                  <p className="text-xs text-gray-500">Descargar todas las carpetas y archivos</p>
                </div>
              </button>

              {/* Download Selected */}
              <button
                onClick={handleDownloadSelected}
                disabled={!hasSelection}
                className={`w-full flex items-center p-2 text-left border rounded-lg transition-colors ${
                  hasSelection
                    ? 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                    : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                }`}
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center mr-3 ${
                  hasSelection ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <svg className={`w-3 h-3 ${hasSelection ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm font-medium ${hasSelection ? 'text-gray-900' : 'text-gray-500'}`}>
                    Contenido seleccionado
                  </p>
                  <p className="text-xs text-gray-500">
                    {hasSelection 
                      ? `${selectedCount} elemento${selectedCount > 1 ? 's' : ''} seleccionado${selectedCount > 1 ? 's' : ''}`
                      : 'Ningún elemento seleccionado'
                    }
                  </p>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="mt-3 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Los archivos se descargarán como archivo ZIP
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
