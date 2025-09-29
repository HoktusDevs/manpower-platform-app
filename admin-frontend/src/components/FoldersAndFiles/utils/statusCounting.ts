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

export interface StatusCounts {
  approved: number;
  rejected: number;
  pending: number;
  aboutToExpire: number;
  expired: number;
}

/**
 * Count files by their status
 */
export const countFileStatuses = (files: DocumentFile[]): StatusCounts => {
  const now = new Date();
  const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  return files.reduce((counts, file) => {
    // Count by hoktusDecision
    switch (file.hoktusDecision) {
      case 'APPROVED':
        counts.approved++;
        break;
      case 'REJECTED':
        counts.rejected++;
        break;
      case 'PENDING':
      case 'MANUAL_REVIEW':
        counts.pending++;
        break;
    }

    // Count expiration status based on creation date
    if (file.createdAt) {
      const createdDate = new Date(file.createdAt);
      const thirtyDaysFromCreation = new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (thirtyDaysFromCreation < now) {
        counts.expired++;
      } else if (thirtyDaysFromCreation < fiveDaysFromNow) {
        counts.aboutToExpire++;
      }
    }

    return counts;
  }, {
    approved: 0,
    rejected: 0,
    pending: 0,
    aboutToExpire: 0,
    expired: 0,
  });
};

/**
 * Recursively calculate status counts for a folder including all its subfolders
 */
export const calculateRecursiveStatusCounts = (
  folder: FolderRow,
  allFolders: FolderRow[]
): StatusCounts => {
  // Validate inputs
  if (!folder) {
    return { approved: 0, rejected: 0, pending: 0, aboutToExpire: 0, expired: 0 };
  }

  // Count files in current folder
  const currentFolderCounts = countFileStatuses(folder.files || []);

  // Validate allFolders array
  if (!allFolders || !Array.isArray(allFolders)) {
    return currentFolderCounts;
  }

  // Find all direct subfolders
  const subfolders = allFolders.filter(f => f.parentId === folder.id);

  // Recursively count files in subfolders
  const subcounts = subfolders.reduce((acc, subfolder) => {
    const subCounts = calculateRecursiveStatusCounts(subfolder, allFolders);
    return {
      approved: acc.approved + subCounts.approved,
      rejected: acc.rejected + subCounts.rejected,
      pending: acc.pending + subCounts.pending,
      aboutToExpire: acc.aboutToExpire + subCounts.aboutToExpire,
      expired: acc.expired + subCounts.expired,
    };
  }, { approved: 0, rejected: 0, pending: 0, aboutToExpire: 0, expired: 0 });

  // Combine current folder counts with subfolder counts
  return {
    approved: currentFolderCounts.approved + subcounts.approved,
    rejected: currentFolderCounts.rejected + subcounts.rejected,
    pending: currentFolderCounts.pending + subcounts.pending,
    aboutToExpire: currentFolderCounts.aboutToExpire + subcounts.aboutToExpire,
    expired: currentFolderCounts.expired + subcounts.expired,
  };
};

/**
 * Create a map of folder IDs to their recursive status counts
 */
export const createStatusCountsMap = (allFolders: FolderRow[]): Map<string, StatusCounts> => {
  const countsMap = new Map<string, StatusCounts>();

  // Validate input
  if (!allFolders || !Array.isArray(allFolders)) {
    return countsMap;
  }

  // Calculate counts for each folder
  allFolders.forEach(folder => {
    const counts = calculateRecursiveStatusCounts(folder, allFolders);
    countsMap.set(folder.id, counts);
  });

  return countsMap;
};