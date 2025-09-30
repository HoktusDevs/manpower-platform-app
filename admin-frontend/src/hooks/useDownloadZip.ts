import { useState, useCallback } from 'react';
import { downloadZipService } from '../services/downloadZipService';
import type { Folder } from '../types';
import type { DownloadProgress } from '../types/download';

export interface UseDownloadZipReturn {
  isDownloading: boolean;
  progress: DownloadProgress | null;
  downloadAllContent: () => Promise<void>;
  downloadSelectedItems: (selectedIds: string[], allFolders: Folder[], selectedFiles?: unknown[]) => Promise<void>;
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
    setIsDownloading(true);
    setProgress(null);
    try {
      await downloadZipService.downloadAllContent(handleProgress);
    } finally {
      setIsDownloading(false);
    }
  }, [handleProgress]);

  const downloadSelectedItems = useCallback(async (
    selectedIds: string[],
    allFolders: Folder[],
    selectedFiles?: unknown[]
  ): Promise<void> => {
    setIsDownloading(true);
    setProgress(null);
    try {
      await downloadZipService.downloadSelectedItems(selectedIds, allFolders, handleProgress, selectedFiles);
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
