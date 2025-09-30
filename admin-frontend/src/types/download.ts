export interface DownloadProgress {
  current: number;
  total: number;
  currentItem: string;
  status: 'preparing' | 'downloading' | 'creating-zip' | 'completed' | 'error';
}

export interface DownloadItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  fileUrl?: string; // URL del archivo para descarga directa
  children?: DownloadItem[];
}
