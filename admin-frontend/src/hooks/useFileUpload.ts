import { useState } from 'react';

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface UseFileUploadReturn {
  uploadFiles: (files: File[], folderId: string) => Promise<void>;
  uploading: boolean;
  progress: UploadProgress[];
  errors: string[];
}

const UPLOAD_API_URL = 'https://lp5u5gdahh.execute-api.us-east-1.amazonaws.com/dev/upload';

export const useFileUpload = (): UseFileUploadReturn => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const uploadSingleFile = async (file: File, folderId: string, index: number): Promise<void> => {
    // Update progress to uploading
    setProgress(prev => prev.map((p, i) =>
      i === index ? { ...p, status: 'uploading' as const, progress: 10 } : p
    ));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', folderId);
      formData.append('fileName', file.name);
      formData.append('fileType', file.type || 'application/octet-stream');

      // Simulate progress updates (since we can't track real upload progress with fetch)
      const progressInterval = setInterval(() => {
        setProgress(prev => prev.map((p, i) => {
          if (i === index && p.status === 'uploading' && p.progress < 90) {
            return { ...p, progress: Math.min(p.progress + 10, 90) };
          }
          return p;
        }));
      }, 200);

      const response = await fetch(UPLOAD_API_URL, {
        method: 'POST',
        body: formData,
        // Note: Don't set Content-Type header when sending FormData
        // The browser will set it automatically with the correct boundary
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        let errorMessage = 'Error al subir el archivo';

        // Handle specific HTTP errors
        if (response.status === 413) {
          errorMessage = 'Archivo demasiado grande. El servidor rechazó la carga.';
        } else if (response.status === 400) {
          errorMessage = 'Solicitud inválida. Verifica el formato del archivo.';
        } else if (response.status === 401 || response.status === 403) {
          errorMessage = 'No autorizado. Verifica tus permisos.';
        } else if (response.status === 500) {
          errorMessage = 'Error del servidor. Inténtalo más tarde.';
        } else {
          // Try to get error message from response
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || `Error HTTP: ${response.status}`;
          } catch {
            errorMessage = `Error HTTP: ${response.status}`;
          }
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Upload success for', file.name, ':', result);

      // Update progress to success
      setProgress(prev => prev.map((p, i) =>
        i === index ? { ...p, status: 'success' as const, progress: 100 } : p
      ));

    } catch (error) {
      console.error('Upload error for file:', file.name, error);

      // Handle network errors and other exceptions
      let errorMessage = 'Error desconocido';

      if (error instanceof Error) {
        // Check if it's a network error (CORS, connection failed, etc.)
        if (error.message === 'Failed to fetch') {
          errorMessage = 'Error de red. Verifica tu conexión o configuración de CORS.';
        } else {
          errorMessage = error.message;
        }
      }

      // Update progress to error
      setProgress(prev => prev.map((p, i) =>
        i === index ? { ...p, status: 'error' as const, error: errorMessage } : p
      ));

      setErrors(prev => [...prev, `${file.name}: ${errorMessage}`]);
      throw error;
    }
  };

  const uploadFiles = async (files: File[], folderId: string): Promise<void> => {
    setUploading(true);
    setErrors([]);

    // Initialize progress for all files
    const initialProgress: UploadProgress[] = files.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'pending' as const
    }));
    setProgress(initialProgress);

    // Configure parallel upload with concurrency limit
    const MAX_CONCURRENT_UPLOADS = 3; // Limit to 3 simultaneous uploads
    const uploadPromises: Promise<void>[] = [];
    let currentIndex = 0;

    // Function to manage concurrent uploads
    const uploadNext = async (): Promise<void> => {
      if (currentIndex >= files.length) return;

      const index = currentIndex++;
      const file = files[index];

      try {
        await uploadSingleFile(file, folderId, index);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Error is already handled in uploadSingleFile
      }

      // After completing one upload, start the next one
      await uploadNext();
    };

    // Start initial batch of concurrent uploads
    for (let i = 0; i < Math.min(MAX_CONCURRENT_UPLOADS, files.length); i++) {
      uploadPromises.push(uploadNext());
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    setUploading(false);
  };

  return {
    uploadFiles,
    uploading,
    progress,
    errors
  };
};