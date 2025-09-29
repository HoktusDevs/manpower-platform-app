import { useMemo } from 'react';
import { createStatusCountsMap, type StatusCounts } from '../utils/statusCounting';

// Temporary inline types to avoid import issues
interface DocumentFile {
  documentId: string;
  originalName: string;
  fileSize?: number;
  fileType?: string;
  folderId: string;
  userId: string;
  createdAt?: string;
  isActive?: boolean;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'error';
  fileUrl?: string;
  hoktusDecision?: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'PENDING';
  hoktusProcessingStatus?: 'COMPLETED' | 'FAILED' | 'VALIDATION' | 'PROCESSING';
  documentType?: string;
  processingResult?: {
    contentAnalysis?: {
      text?: string;
      confidence_score?: number;
    };
    processingTime?: number;
    data_structure?: Record<string, unknown>;
    observations?: Array<{
      message?: string;
      type?: string;
      severity?: string;
    }>;
  };
}

interface FolderRow {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  parentId?: string | null;
  level?: number;
  files?: DocumentFile[];
}

/**
 * Hook to calculate and memoize status counts for all folders
 */
export const useStatusCounts = (allFolders: FolderRow[] = []): Map<string, StatusCounts> => {
  return useMemo(() => {
    return createStatusCountsMap(allFolders || []);
  }, [allFolders]);
};

/**
 * Hook to get status counts for a specific folder
 */
export const useFolderStatusCounts = (
  folderId: string,
  allFolders: FolderRow[] = []
): StatusCounts => {
  const statusCountsMap = useStatusCounts(allFolders);

  return useMemo(() => {
    return statusCountsMap.get(folderId) || {
      approved: 0,
      rejected: 0,
      pending: 0,
      aboutToExpire: 0,
      expired: 0,
    };
  }, [statusCountsMap, folderId]);
};