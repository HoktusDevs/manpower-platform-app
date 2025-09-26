import { File, FileModel } from '../models/File';
import { FileQuery } from '../types';

export class MockDynamoService {
  private files: Map<string, File> = new Map();

  async createFile(file: FileModel): Promise<File> {
    console.log('MockDynamoService: createFile called');
    const fileData = file.toJSON();
    const key = `${fileData.fileId}-${fileData.userId}`;
    this.files.set(key, fileData);
    return fileData;
  }

  async getFile(fileId: string, userId: string): Promise<File | null> {
    console.log('MockDynamoService: getFile called');
    const key = `${fileId}-${userId}`;
    const file = this.files.get(key);

    if (!file) {
      // Try to find file by just fileId (in case it's a public file)
      for (const [, fileData] of this.files) {
        if (fileData.fileId === fileId && (fileData.userId === userId || fileData.isPublic)) {
          return fileData;
        }
      }
      return null;
    }

    return file;
  }

  async updateFile(fileId: string, userId: string, updates: Partial<File>): Promise<File | null> {
    console.log('MockDynamoService: updateFile called');
    const key = `${fileId}-${userId}`;
    const existing = this.files.get(key);

    if (!existing) {
      // Try to find file by userId
      for (const [k, fileData] of this.files) {
        if (fileData.fileId === fileId && fileData.userId === userId) {
          const updated = {
            ...fileData,
            ...updates,
            updatedAt: new Date().toISOString()
          };
          this.files.set(k, updated);
          return updated;
        }
      }
      return null;
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.files.set(key, updated);
    return updated;
  }

  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    console.log('MockDynamoService: deleteFile called');
    const key = `${fileId}-${userId}`;

    if (this.files.has(key)) {
      this.files.delete(key);
      return true;
    }

    // Try to find and delete by fileId and userId
    for (const [k, fileData] of this.files) {
      if (fileData.fileId === fileId && fileData.userId === userId) {
        this.files.delete(k);
        return true;
      }
    }

    return false;
  }

  async getFilesByUser(userId: string, limit?: number, nextToken?: string): Promise<{ files: File[], nextToken?: string }> {
    console.log('MockDynamoService: getFilesByUser called');
    const userFiles = Array.from(this.files.values())
      .filter(file => file.userId === userId && file.isActive)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

    return {
      files: userFiles.slice(0, limit || 50),
      nextToken: undefined
    };
  }

  async getFilesByFolder(folderId: string, userId: string, limit?: number): Promise<File[]> {
    console.log('MockDynamoService: getFilesByFolder called');
    return Array.from(this.files.values())
      .filter(file =>
        file.folderId === folderId &&
        (file.userId === userId || file.isPublic) &&
        file.isActive
      )
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
      .slice(0, limit || 50);
  }

  async getPublicFile(fileId: string): Promise<File | null> {
    console.log('MockDynamoService: getPublicFile called');
    for (const fileData of this.files.values()) {
      if (fileData.fileId === fileId && fileData.isPublic && fileData.isActive) {
        return fileData;
      }
    }
    return null;
  }

  async queryFiles(query: FileQuery): Promise<{ files: File[], nextToken?: string }> {
    console.log('MockDynamoService: queryFiles called');
    let filteredFiles = Array.from(this.files.values())
      .filter(file => file.isActive);

    if (query.userId) {
      filteredFiles = filteredFiles.filter(file => file.userId === query.userId);
    }

    if (query.folderId) {
      filteredFiles = filteredFiles.filter(file => file.folderId === query.folderId);
    }

    if (query.fileType) {
      filteredFiles = filteredFiles.filter(file => file.fileType === query.fileType);
    }

    if (query.isPublic !== undefined) {
      filteredFiles = filteredFiles.filter(file => file.isPublic === query.isPublic);
    }

    if (query.tags && query.tags.length > 0) {
      filteredFiles = filteredFiles.filter(file =>
        file.tags?.some(tag => query.tags?.includes(tag))
      );
    }

    filteredFiles.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

    return {
      files: filteredFiles.slice(0, query.limit || 50),
      nextToken: undefined
    };
  }

  async batchDeleteFiles(fileIds: string[], userId: string): Promise<string[]> {
    console.log('MockDynamoService: batchDeleteFiles called');
    const deletedFiles: string[] = [];

    for (const fileId of fileIds) {
      if (await this.deleteFile(fileId, userId)) {
        deletedFiles.push(fileId);
      }
    }

    return deletedFiles;
  }

  async confirmUpload(fileId: string, userId: string): Promise<File | null> {
    console.log('MockDynamoService: confirmUpload called');
    // In a real implementation, this would update the file status
    // For mock, we just return the file
    return this.getFile(fileId, userId);
  }

  async updateFileStatus(fileId: string, status: string, processingResult?: any): Promise<File | null> {
    console.log('MockDynamoService: updateFileStatus called');
    // Find file by documentId
    for (const [key, fileData] of this.files) {
      if (fileData.documentId === fileId) {
        const updated = {
          ...fileData,
          status,
          processingResult,
          updatedAt: new Date().toISOString()
        };
        this.files.set(key, updated);
        return updated;
      }
    }
    return null;
  }
}