export interface Folder {
  folderId: string;
  userId: string;
  name: string;
  type: string;
  parentId?: string;
  metadata?: { [key: string]: any };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  childrenCount?: number;
}

export class FolderModel {
  public folderId: string;
  public userId: string;
  public name: string;
  public type: string;
  public parentId?: string;
  public metadata?: { [key: string]: any };
  public isActive: boolean;
  public createdAt: string;
  public updatedAt: string;
  public childrenCount: number;

  constructor(data: Partial<Folder>) {
    this.folderId = data.folderId || '';
    this.userId = data.userId || '';
    this.name = data.name || '';
    this.type = data.type || 'folder';
    this.parentId = data.parentId;
    this.metadata = data.metadata;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.childrenCount = data.childrenCount || 0;
  }

  // Get full hierarchy path (for breadcrumbs)
  public getPath(allFolders: FolderModel[]): string[] {
    const path: string[] = [];
    let currentFolder: FolderModel | undefined = this;

    while (currentFolder) {
      path.unshift(currentFolder.name);
      if (!currentFolder.parentId) break;
      currentFolder = allFolders.find(f => f.folderId === currentFolder!.parentId);
    }

    return path;
  }

  // Check if this folder is ancestor of another folder
  public isAncestorOf(folderId: string, allFolders: FolderModel[]): boolean {
    const targetFolder = allFolders.find(f => f.folderId === folderId);
    if (!targetFolder) return false;

    let currentFolder: FolderModel | undefined = targetFolder;
    while (currentFolder?.parentId) {
      if (currentFolder.parentId === this.folderId) return true;
      currentFolder = allFolders.find(f => f.folderId === currentFolder!.parentId);
    }

    return false;
  }

  // Get all descendant folders
  public getDescendants(allFolders: FolderModel[]): FolderModel[] {
    const descendants: FolderModel[] = [];

    const addChildren = (parentId: string) => {
      const children = allFolders.filter(f => f.parentId === parentId);
      descendants.push(...children);
      children.forEach(child => addChildren(child.folderId));
    };

    addChildren(this.folderId);
    return descendants;
  }

  public toJSON(): Folder {
    return {
      folderId: this.folderId,
      userId: this.userId,
      name: this.name,
      type: this.type,
      parentId: this.parentId,
      metadata: this.metadata,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      childrenCount: this.childrenCount
    };
  }

  public updateTimestamp(): void {
    this.updatedAt = new Date().toISOString();
  }
}