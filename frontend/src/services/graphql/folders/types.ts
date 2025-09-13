/**
 * Folders GraphQL Types
 * Types specific to folder management
 */

export interface Folder {
  userId: string;
  folderId: string;
  name: string;
  type: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  childrenCount?: number;
}

export interface CreateFolderInput {
  name: string;
  type: string;
  parentId?: string;
}

export interface UpdateFolderInput {
  folderId: string;
  name?: string;
  type?: string;
}

export interface FoldersStats {
  totalFolders: number;
  rootFolders: number;
  averageDepth?: number;
  mostUsedTypes: Array<{
    type: string;
    count: number;
  }>;
}