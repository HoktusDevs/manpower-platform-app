import React, { useState, useRef, useEffect } from 'react';
import { s3Service } from '../services/s3Service';
import { ocrService } from '../services/ocrService';

interface DocumentUploadProps {
  documentName: string;
  onFileUpload: (file: File, documentId?: string) => void;
  onFileRemove: () => void;
  uploadedFile?: File | null;
  isRequired?: boolean;
  isUploaded?: boolean;
  userId: string;
  jobId: string;
  applicationId?: string;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (documentId: string, fileUrl: string) => void;
  onUploadError?: (error: string) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  documentName,
  onFileUpload,
  onFileRemove,
  uploadedFile,
  isRequired = true,
  isUploaded = false,
  userId: _userId,
  jobId: _jobId,
  applicationId: _applicationId,
  onUploadComplete: _onUploadComplete,
  onUploadError
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, _setIsUploading] = useState(false);
  const [uploadProgress, _setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploadError(null);

      // Validar archivo antes de guardarlo
      if (!s3Service.validateFileType(file)) {
        throw new Error('Tipo de archivo no permitido. Solo se permiten PDF, DOC, DOCX, JPG, PNG');
      }

      if (!s3Service.validateFileSize(file)) {
        throw new Error('El archivo es demasiado grande. Máximo 10MB');
      }

      // Solo guardar el archivo localmente, NO subir aún
      // La subida se hará cuando se presione "Enviar Aplicaciones"
      console.log(`📎 Archivo seleccionado: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

      // Notificar al componente padre que se seleccionó un archivo
      // NO pasamos documentId porque aún no se ha subido
      onFileUpload(file);

    } catch (error) {
      console.error('Error selecting file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setUploadError(errorMessage);
      onUploadError?.(errorMessage);
    }
  };

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = () => {
    setDocumentId(null);
    setOcrStatus('pending');
    setUploadError(null);
    onFileRemove();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Conectar WebSocket para notificaciones OCR
  useEffect(() => {
    const connectWebSocket = async () => {
      await ocrService.connectWebSocket();
      
      // Escuchar actualizaciones de documentos
      ocrService.onMessage('document_update', (message) => {
        if (message.documentId === documentId) {
          setOcrStatus(message.status as 'pending' | 'processing' | 'completed' | 'failed');
        }
      });
    };

    if (documentId) {
      connectWebSocket();
    }

    return () => {
      ocrService.offMessage('document_update');
    };
  }, [documentId]);

  return (
    <div className="w-full">
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {documentName}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        {isUploaded && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ Completado
          </span>
        )}
        {isUploading && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            📤 Subiendo...
          </span>
        )}
        {ocrStatus === 'processing' && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            🔍 Procesando OCR...
          </span>
        )}
        {ocrStatus === 'completed' && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✅ OCR Completado
          </span>
        )}
        {ocrStatus === 'failed' && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            ❌ OCR Falló
          </span>
        )}
      </div>

      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : isUploaded 
              ? 'border-green-300 bg-green-50' 
              : isUploading
                ? 'border-blue-300 bg-blue-50'
                : uploadError
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
        />

        {uploadedFile ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center">
              <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-medium">{uploadedFile.name}</p>
              <p className="text-gray-500">{formatFileSize(uploadedFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Eliminar archivo
            </button>
          </div>
        ) : isUploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center">
              <svg className="h-8 w-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-medium">Subiendo archivo...</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-gray-500">{uploadProgress}%</p>
            </div>
          </div>
        ) : uploadError ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm text-red-600">
              <p className="font-medium">Error al subir archivo</p>
              <p className="text-red-500">{uploadError}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUploadError(null);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Intentar de nuevo
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-center">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-medium">
                {isDragOver ? 'Suelta el archivo aquí' : 'Arrastra y suelta tu archivo aquí'}
              </p>
              <p className="text-gray-500">o haz clic para seleccionar</p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, DOC, DOCX, JPG, PNG (máx. 10MB)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
