import { useState, useCallback, useEffect } from 'react';
import { graphqlService } from '../services/graphqlService';
import type { Application, Document, CreateApplicationInput, UploadDocumentInput, ApplicationStats } from '../services/graphqlService';

interface UseGraphQLReturn {
  // State
  applications: Application[];
  documents: Document[];
  applicationStats: ApplicationStats | null;
  loading: boolean;
  error: string | null;
  
  // Methods
  fetchMyApplications: () => Promise<void>;
  fetchAllApplications: (status?: Application['status']) => Promise<void>;
  fetchMyDocuments: () => Promise<void>;
  fetchApplicationStats: () => Promise<void>;
  
  // Mutations
  createApplication: (input: CreateApplicationInput) => Promise<boolean>;
  updateMyApplication: (applicationId: string, updates: Partial<CreateApplicationInput>) => Promise<boolean>;
  deleteMyApplication: (applicationId: string) => Promise<boolean>;
  updateApplicationStatus: (userId: string, applicationId: string, status: Application['status']) => Promise<boolean>;
  uploadDocument: (input: UploadDocumentInput) => Promise<boolean>;
  
  // Utils
  clearError: () => void;
  isGraphQLAvailable: () => boolean;
}

export const useGraphQL = (): UseGraphQLReturn => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [applicationStats, setApplicationStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize GraphQL service on mount
  useEffect(() => {
    if (!graphqlService.isInitialized()) {
      const config = {
        graphqlEndpoint: import.meta.env.VITE_GRAPHQL_URL || '',
        region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
        authenticationType: 'AMAZON_COGNITO_USER_POOLS' as const
      };

      if (config.graphqlEndpoint) {
        graphqlService.initialize(config);
      } else {
        console.warn('GraphQL URL not configured in environment variables');
      }
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isGraphQLAvailable = useCallback(() => {
    return graphqlService.isInitialized() && !!import.meta.env.VITE_GRAPHQL_URL;
  }, []);

  // ========== QUERIES ==========

  const fetchMyApplications = useCallback(async () => {
    if (!isGraphQLAvailable()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getMyApplications();
      setApplications(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch applications';
      setError(errorMessage);
      console.error('Error fetching my applications:', err);
    } finally {
      setLoading(false);
    }
  }, [isGraphQLAvailable]);

  const fetchAllApplications = useCallback(async (status?: Application['status']) => {
    if (!isGraphQLAvailable()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getAllApplications(status);
      setApplications(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch all applications';
      setError(errorMessage);
      console.error('Error fetching all applications:', err);
    } finally {
      setLoading(false);
    }
  }, [isGraphQLAvailable]);

  const fetchMyDocuments = useCallback(async () => {
    if (!isGraphQLAvailable()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getMyDocuments();
      setDocuments(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch documents';
      setError(errorMessage);
      console.error('Error fetching my documents:', err);
    } finally {
      setLoading(false);
    }
  }, [isGraphQLAvailable]);

  const fetchApplicationStats = useCallback(async () => {
    if (!isGraphQLAvailable()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getApplicationStats();
      setApplicationStats(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch application stats';
      setError(errorMessage);
      console.error('Error fetching application stats:', err);
    } finally {
      setLoading(false);
    }
  }, [isGraphQLAvailable]);

  // ========== MUTATIONS ==========

  const createApplication = useCallback(async (input: CreateApplicationInput): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.createApplication(input);
      
      // Add new application to local state
      setApplications(prev => [result, ...prev]);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create application';
      setError(errorMessage);
      console.error('Error creating application:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isGraphQLAvailable]);

  const updateMyApplication = useCallback(async (
    applicationId: string, 
    updates: Partial<CreateApplicationInput>
  ): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.updateMyApplication(applicationId, updates);
      
      // Update application in local state
      setApplications(prev => 
        prev.map(app => 
          app.applicationId === applicationId ? result : app
        )
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update application';
      setError(errorMessage);
      console.error('Error updating application:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isGraphQLAvailable]);

  const deleteMyApplication = useCallback(async (applicationId: string): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const success = await graphqlService.deleteMyApplication(applicationId);
      
      if (success) {
        // Remove application from local state
        setApplications(prev => 
          prev.filter(app => app.applicationId !== applicationId)
        );
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete application';
      setError(errorMessage);
      console.error('Error deleting application:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isGraphQLAvailable]);

  const updateApplicationStatus = useCallback(async (
    userId: string,
    applicationId: string,
    status: Application['status']
  ): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.updateApplicationStatus(userId, applicationId, status);
      
      // Update application status in local state
      setApplications(prev => 
        prev.map(app => 
          app.applicationId === applicationId ? result : app
        )
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update application status';
      setError(errorMessage);
      console.error('Error updating application status:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isGraphQLAvailable]);

  const uploadDocument = useCallback(async (input: UploadDocumentInput): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.uploadDocument(input);
      
      // Add new document to local state
      setDocuments(prev => [result, ...prev]);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMessage);
      console.error('Error uploading document:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isGraphQLAvailable]);

  return {
    // State
    applications,
    documents,
    applicationStats,
    loading,
    error,
    
    // Queries
    fetchMyApplications,
    fetchAllApplications,
    fetchMyDocuments,
    fetchApplicationStats,
    
    // Mutations
    createApplication,
    updateMyApplication,
    deleteMyApplication,
    updateApplicationStatus,
    uploadDocument,
    
    // Utils
    clearError,
    isGraphQLAvailable,
  };
};