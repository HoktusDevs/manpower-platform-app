import { useState, useEffect, useCallback } from 'react';
import { documentTypesService, type DocumentType } from '../services/documentTypesService';

export interface UseDocumentTypesReturn {
  documentTypes: DocumentType[];
  loading: boolean;
  error: string | null;
  searchDocumentTypes: (query: string) => Promise<DocumentType[]>;
  refreshDocumentTypes: () => Promise<void>;
}

export const useDocumentTypes = (): UseDocumentTypesReturn => {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocumentTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await documentTypesService.getAllDocumentTypes();
      if (response.success && response.documentTypes) {
        setDocumentTypes(response.documentTypes);
      } else {
        setError(response.message || 'Failed to load document types');
      }
    } catch {
      setError('Failed to load document types');
      console.warn('Failed to load document types from service');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchDocumentTypes = useCallback(async (query: string): Promise<DocumentType[]> => {
    if (!query.trim()) {
      return documentTypes;
    }

    try {
      const response = await documentTypesService.searchDocumentTypes({
        query: query.trim(),
        limit: 10,
        sortBy: 'usageCount',
        sortOrder: 'desc'
      });

      if (response.success && response.documentTypes) {
        return response.documentTypes;
      }
      return [];
    } catch {
      // Return empty array on search error
      console.warn('Document types search failed');
      return [];
    }
  }, [documentTypes]);

  const refreshDocumentTypes = useCallback(async () => {
    await loadDocumentTypes();
  }, [loadDocumentTypes]);

  useEffect(() => {
    loadDocumentTypes();
  }, [loadDocumentTypes]);

  return {
    documentTypes,
    loading,
    error,
    searchDocumentTypes,
    refreshDocumentTypes
  };
};
