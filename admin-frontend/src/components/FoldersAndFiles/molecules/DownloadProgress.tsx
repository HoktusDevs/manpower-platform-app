import React from 'react';
import type { DownloadProgress } from '../../../types/download';

interface DownloadProgressProps {
  progress: DownloadProgress;
  onClose: () => void;
}

export const DownloadProgressComponent: React.FC<DownloadProgressProps> = ({
  progress,
  onClose
}) => {
  const getStatusText = (status: DownloadProgress['status']): string => {
    switch (status) {
      case 'preparing':
        return 'Preparando descarga...';
      case 'downloading':
        return 'Descargando archivos...';
      case 'creating-zip':
        return 'Creando archivo ZIP...';
      case 'completed':
        return 'Descarga completada';
      case 'error':
        return 'Error en la descarga';
      default:
        return 'Procesando...';
    }
  };

  const getStatusColor = (status: DownloadProgress['status']): string => {
    switch (status) {
      case 'preparing':
      case 'downloading':
      case 'creating-zip':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getProgressPercentage = (): number => {
    if (progress.total === 0) return 0;
    return Math.round((progress.current / progress.total) * 100);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Descargando archivos</h3>
          {progress.status === 'completed' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Status */}
          <div className="text-center">
            <p className={`text-sm font-medium ${getStatusColor(progress.status)}`}>
              {getStatusText(progress.status)}
            </p>
            {progress.currentItem && (
              <p className="text-xs text-gray-500 mt-1 truncate">
                {progress.currentItem}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          {progress.status !== 'completed' && progress.status !== 'error' && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          )}

          {/* Progress Text */}
          {progress.total > 0 && (
            <div className="text-center text-sm text-gray-600">
              {progress.current} de {progress.total} elementos
            </div>
          )}

          {/* Success/Error Messages */}
          {progress.status === 'completed' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-600 font-medium">¡Descarga completada!</p>
              <p className="text-sm text-gray-500 mt-1">
                El archivo ZIP se ha descargado exitosamente
              </p>
            </div>
          )}

          {progress.status === 'error' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-red-600 font-medium">Error en la descarga</p>
              <p className="text-sm text-gray-500 mt-1">
                No se pudo completar la descarga
              </p>
            </div>
          )}
        </div>

        {/* Close Button */}
        {progress.status === 'completed' && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
