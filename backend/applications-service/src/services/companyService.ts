/**
 * Company Service
 * Handles company data retrieval from folders
 */

import { FoldersServiceClient } from './foldersServiceClient';

export interface CompanyData {
  companyId: string;
  companyName: string;
  parentCompany?: string;
  location?: string;
  description?: string;
}

export class CompanyService {
  private foldersServiceClient: FoldersServiceClient;

  constructor() {
    this.foldersServiceClient = new FoldersServiceClient();
  }

  /**
   * Extract company name from folder path
   * Example: "Fletzy > La florida" -> "Fletzy"
   */
  private extractCompanyName(folderPath: string): string {
    if (!folderPath) return 'Empresa no especificada';
    
    // Split by " > " and take the first part
    const parts = folderPath.split(' > ');
    return parts[0] || 'Empresa no especificada';
  }

  /**
   * Get company data from folder information
   */
  async getCompanyFromFolder(folderId: string): Promise<CompanyData | null> {
    try {
      const folder = await this.foldersServiceClient.getFolder(folderId);
      
      if (!folder) {
        return null;
      }

      // Obtener la carpeta padre (empresa principal)
      const parentCompany = await this.getParentCompanyName(folder.parentId || folder.id);
      
      return {
        companyId: folder.id,
        companyName: parentCompany || this.extractCompanyName(folder.name),
        parentCompany: parentCompany,
        location: folder.metadata?.location,
        description: folder.metadata?.description
      };
    } catch (error) {
      console.error('Error getting company from folder:', error);
      return null;
    }
  }

  /**
   * Get parent company name (carpeta padre)
   */
  private async getParentCompanyName(parentId: string): Promise<string | undefined> {
    try {
      const parentFolder = await this.foldersServiceClient.getFolder(parentId);
      if (!parentFolder) {
        return undefined;
      }
      
      // Si la carpeta padre tiene un padre, obtener ese (empresa principal)
      if (parentFolder.parentId && parentFolder.parentId !== parentId) {
        const grandParentFolder = await this.foldersServiceClient.getFolder(parentFolder.parentId);
        if (grandParentFolder) {
          return this.extractCompanyName(grandParentFolder.name);
        }
      }
      
      // Si no tiene abuelo, usar el nombre de la carpeta padre
      return this.extractCompanyName(parentFolder.name);
    } catch (error) {
      console.error('Error getting parent company:', error);
      return undefined;
    }
  }

  /**
   * Get company data for multiple folders
   */
  async getCompaniesFromFolders(folderIds: string[]): Promise<Map<string, CompanyData>> {
    const companiesMap = new Map<string, CompanyData>();
    
    try {
      const promises = folderIds.map(folderId => 
        this.getCompanyFromFolder(folderId).then(company => ({ folderId, company }))
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(({ folderId, company }) => {
        if (company) {
          companiesMap.set(folderId, company);
        }
      });
    } catch (error) {
      console.error('Error getting companies from folders:', error);
    }
    
    return companiesMap;
  }
}
