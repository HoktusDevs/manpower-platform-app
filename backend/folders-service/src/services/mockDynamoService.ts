import { Folder, FolderModel } from '../models/Folder';
import { FolderQuery } from '../types';

export class MockDynamoService {
  private folders: Map<string, Folder> = new Map();

  async createFolder(folder: FolderModel): Promise<Folder> {
    console.log('MockDynamoService: createFolder called');
    const folderData = folder.toJSON();
    this.folders.set(`${folderData.folderId}-${folderData.userId}`, folderData);
    return folderData;
  }

  async getFolder(folderId: string, userId: string): Promise<Folder | null> {
    console.log('MockDynamoService: getFolder called');
    return this.folders.get(`${folderId}-${userId}`) || null;
  }

  async updateFolder(folderId: string, userId: string, updates: Partial<Folder>): Promise<Folder | null> {
    console.log('MockDynamoService: updateFolder called');
    const key = `${folderId}-${userId}`;
    const existing = this.folders.get(key);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.folders.set(key, updated);
    return updated;
  }

  async deleteFolder(folderId: string, userId: string): Promise<void> {
    console.log('MockDynamoService: deleteFolder called');
    this.folders.delete(`${folderId}-${userId}`);
  }

  async getFoldersByUser(userId: string, limit?: number, nextToken?: string): Promise<{ folders: Folder[], nextToken?: string }> {
    console.log('MockDynamoService: getFoldersByUser called');
    const userFolders = Array.from(this.folders.values())
      .filter(folder => folder.userId === userId && folder.isActive);

    return {
      folders: userFolders.slice(0, limit || 50),
      nextToken: undefined
    };
  }

  async getFoldersByParent(parentId: string, userId: string, limit?: number): Promise<Folder[]> {
    console.log('MockDynamoService: getFoldersByParent called');
    return Array.from(this.folders.values())
      .filter(folder => folder.parentId === parentId && folder.userId === userId && folder.isActive)
      .slice(0, limit || 50);
  }

  async getRootFolders(userId: string): Promise<Folder[]> {
    console.log('MockDynamoService: getRootFolders called');
    return Array.from(this.folders.values())
      .filter(folder => !folder.parentId && folder.userId === userId && folder.isActive);
  }

  async getFolderByUniqueKey(uniqueKey: string): Promise<Folder | null> {
    console.log('MockDynamoService: getFolderByUniqueKey called');
    const folder = Array.from(this.folders.values())
      .find(f => f.uniqueKey === uniqueKey && f.isActive);
    return folder || null;
  }

  async queryFolders(query: FolderQuery): Promise<{ folders: Folder[], nextToken?: string }> {
    console.log('MockDynamoService: queryFolders called');
    let filteredFolders = Array.from(this.folders.values())
      .filter(folder => folder.userId === query.userId && folder.isActive);

    if (query.parentId) {
      filteredFolders = filteredFolders.filter(folder => folder.parentId === query.parentId);
    }

    return {
      folders: filteredFolders.slice(0, query.limit || 50),
      nextToken: undefined
    };
  }

  async batchDeleteFolders(folderIds: string[], userId: string): Promise<string[]> {
    console.log('MockDynamoService: batchDeleteFolders called');
    const deletedFolders: string[] = [];

    for (const folderId of folderIds) {
      const key = `${folderId}-${userId}`;
      if (this.folders.has(key)) {
        this.folders.delete(key);
        deletedFolders.push(folderId);
      }
    }

    return deletedFolders;
  }
}