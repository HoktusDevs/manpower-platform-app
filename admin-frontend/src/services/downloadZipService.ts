import JSZip from 'jszip';
import { documentsService } from './documentsService';
import { FoldersApiService } from './foldersApiService';
import type { Folder } from '../types';
import type { DownloadItem, DownloadProgress } from '../types/download';

class DownloadZipService {
  /**
   * Descargar todo el contenido (todas las carpetas y archivos)
   */
  async downloadAllContent(
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    try {
      onProgress?.({
        current: 0,
        total: 1,
        currentItem: 'Preparando descarga...',
        status: 'preparing'
      });

      // Obtener todas las carpetas raíz
      const foldersResponse = await FoldersApiService.getAllFolders();
      if (!foldersResponse.success || !foldersResponse.folders) {
        throw new Error('No se pudieron obtener las carpetas');
      }

      const allFolders = foldersResponse.folders;
      const allItems: DownloadItem[] = allFolders.map(folder => {
        // Agregar archivos de la carpeta como children
        const fileChildren: DownloadItem[] = folder.files ? folder.files.map(file => ({
          id: file.documentId,
          name: file.originalName,
          type: 'file' as const,
          fileUrl: file.fileUrl
        })) : [];

        return {
          id: folder.folderId,
          name: folder.name,
          type: 'folder' as const,
          children: fileChildren
        };
      });

      // Note: No se incluyen archivos sueltos en "descargar todo"
      // Solo se descargan las carpetas con su contenido
      const documentItems: DownloadItem[] = [];

      // Combinar carpetas y documentos
      const allContent = [...allItems, ...documentItems];

      await this.createAndDownloadZip(allContent, 'todo-el-contenido.zip', onProgress);
    } catch (error) {
      onProgress?.({
        current: 0,
        total: 1,
        currentItem: 'Error',
        status: 'error'
      });
      throw error;
    }
  }

  /**
   * Descargar elementos seleccionados
   */
  async downloadSelectedItems(
    selectedIds: string[],
    allFolders: Folder[],
    onProgress?: (progress: DownloadProgress) => void,
    selectedFiles?: unknown[]
  ): Promise<void> {
    try {
      onProgress?.({
        current: 0,
        total: 1,
        currentItem: 'Preparando descarga...',
        status: 'preparing'
      });

      // Obtener elementos seleccionados (carpetas y archivos)
      const selectedItems: DownloadItem[] = [];

      for (const id of selectedIds) {
        // Buscar carpeta
        const folder = allFolders.find(f => f.folderId === id);
        if (folder) {
          // Agregar archivos de la carpeta como children
          const fileChildren: DownloadItem[] = folder.files ? folder.files.map(file => ({
            id: file.documentId,
            name: file.originalName,
            type: 'file' as const,
            fileUrl: file.fileUrl
          })) : [];

          selectedItems.push({
            id: folder.folderId,
            name: folder.name,
            type: 'folder',
            children: fileChildren
          });
          continue;
        }

        // Buscar archivo en los archivos seleccionados
        if (selectedFiles) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const document = selectedFiles.find((doc: any) => doc && doc.documentId === id);
          if (document && typeof document === 'object' && 'documentId' in document) {
            selectedItems.push({
              id: (document as { documentId: string }).documentId,
              name: (document as { originalName?: string; fileName?: string }).originalName || (document as { fileName?: string }).fileName || 'archivo',
              type: 'file',
              fileUrl: (document as { fileUrl?: string }).fileUrl
            });
          }
        }
      }

      if (selectedItems.length === 0) {
        throw new Error('No hay elementos seleccionados para descargar');
      }

      const fileName = `contenido-seleccionado-${new Date().toISOString().split('T')[0]}.zip`;
      await this.createAndDownloadZip(selectedItems, fileName, onProgress);
    } catch (error) {
      onProgress?.({
        current: 0,
        total: 1,
        currentItem: 'Error',
        status: 'error'
      });
      throw error;
    }
  }

  /**
   * Crear y descargar archivo ZIP
   */
  private async createAndDownloadZip(
    items: DownloadItem[],
    fileName: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    const zip = new JSZip();
    let processedItems = 0;
    const totalItems = items.length;

    onProgress?.({
      current: 0,
      total: totalItems,
      currentItem: 'Creando archivo ZIP...',
      status: 'creating-zip'
    });

    // Procesar cada elemento
    for (const item of items) {
      onProgress?.({
        current: processedItems,
        total: totalItems,
        currentItem: `Procesando ${item.name}...`,
        status: 'downloading'
      });

      if (item.type === 'folder') {
        await this.addFolderToZip(zip, item, '');
      } else {
        await this.addFileToZip(zip, item, '');
      }

      processedItems++;
    }

    // Generar y descargar el ZIP
    onProgress?.({
      current: totalItems,
      total: totalItems,
      currentItem: 'Generando archivo ZIP...',
      status: 'creating-zip'
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Crear enlace de descarga
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onProgress?.({
      current: totalItems,
      total: totalItems,
      currentItem: 'Descarga completada',
      status: 'completed'
    });
  }

  /**
   * Agregar carpeta al ZIP
   */
  private async addFolderToZip(zip: JSZip, folder: DownloadItem, path: string): Promise<void> {
    const folderPath = path ? `${path}/${folder.name}` : folder.name;
    
    // Crear carpeta en el ZIP
    zip.folder(folderPath);

    // Si tiene hijos, procesarlos
    if (folder.children && folder.children.length > 0) {
      for (const child of folder.children) {
        if (child.type === 'folder') {
          await this.addFolderToZip(zip, child, folderPath);
        } else {
          await this.addFileToZip(zip, child, folderPath);
        }
      }
    }
  }

  /**
   * Agregar archivo al ZIP
   */
  private async addFileToZip(zip: JSZip, file: DownloadItem, path: string): Promise<void> {
    try {
      let downloadUrl = file.fileUrl;

      // Si no hay fileUrl, intentar obtenerla del backend
      if (!downloadUrl) {
        const downloadResponse = await this.getFileDownloadUrl(file.id);
        downloadUrl = downloadResponse.downloadUrl;
      }

      if (!downloadUrl) {
        console.warn(`No se pudo obtener URL de descarga para ${file.name}`);
        return;
      }

      // Descargar archivo
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        console.warn(`Error al descargar ${file.name}: ${response.status}`);
        return;
      }

      const fileBlob = await response.blob();
      const filePath = path ? `${path}/${file.name}` : file.name;

      // Agregar archivo al ZIP
      zip.file(filePath, fileBlob);
    } catch (error) {
      console.error(`Error al agregar archivo ${file.name} al ZIP:`, error);
      // Error al agregar archivo al ZIP, continuar con el siguiente
    }
  }

  /**
   * Obtener URL de descarga de un archivo
   */
  private async getFileDownloadUrl(fileId: string): Promise<{ downloadUrl?: string }> {
    try {
      // Usar el servicio de documentos existente para obtener la URL de descarga
      const response = await fetch(`/api/files/${fileId}/download`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        downloadUrl: data.downloadUrl
      };
    } catch {
      return {};
    }
  }
}

export const downloadZipService = new DownloadZipService();
