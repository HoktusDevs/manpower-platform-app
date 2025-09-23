import { useState, useCallback } from 'react';
import { downloadZipService } from '../services/downloadZipService';
import type { Folder } from '../types';
import type { DownloadProgress } from '../types/download';

export interface UseDownloadZipReturn {
  isDownloading: boolean;
  progress: DownloadProgress | null;
  downloadAllContent: () => Promise<void>;
  downloadSelectedItems: (selectedIds: string[], allFolders: Folder[]) => Promise<void>;
  clearProgress: () => void;
}

/**
 * Hook para manejar descargas de ZIP
 */
export const useDownloadZip = (): UseDownloadZipReturn => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  const handleProgress = useCallback((progressData: DownloadProgress) => {
    setProgress(progressData);
  }, []);

  const downloadAllContent = useCallback(async (): Promise<void> => {
    try {
      setIsDownloading(true);
      setProgress(null);
      await downloadZipService.downloadAllContent(handleProgress);
    } catch (error) {
      console.error('Error downloading all content:', error);
      throw error;
    } finally {
      setIsDownloading(false);
    }
  }, [handleProgress]);

  const downloadSelectedItems = useCallback(async (
    selectedIds: string[], 
    allFolders: Folder[]
  ): Promise<void> => {
    try {
      setIsDownloading(true);
      setProgress(null);
      await downloadZipService.downloadSelectedItems(selectedIds, allFolders, handleProgress);
    } catch (error) {
      console.error('Error downloading selected items:', error);
      throw error;
    } finally {
      setIsDownloading(false);
    }
  }, [handleProgress]);

  const clearProgress = useCallback(() => {
    setProgress(null);
  }, []);

  return {
    isDownloading,
    progress,
    downloadAllContent,
    downloadSelectedItems,
    clearProgress
  };
};
