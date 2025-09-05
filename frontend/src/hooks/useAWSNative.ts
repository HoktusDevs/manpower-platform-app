import { useState, useEffect } from 'react';
import { awsNativeService } from '../services/awsNativeService';
import { legacyApiService } from '../services/legacyApiService';
import { authService } from '../services/authService';
import { migrationService } from '../services/migrationService';

interface Application {
  userId: string;
  applicationId: string;
  companyName: string;
  position: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW' | 'INTERVIEW_SCHEDULED' | 'HIRED';
  description?: string;
  salary?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  companyId?: string;
}

interface CreateApplicationInput {
  companyName: string;
  position: string;
  description?: string;
  salary?: string;
  location?: string;
  companyId?: string;
}

/**
 * Hook for AWS-Native operations (Direct DynamoDB + AppSync)
 * Replaces REST API calls with direct AWS SDK usage
 */
export const useAWSNative = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize AWS-Native service when user is authenticated
  useEffect(() => {
    const initializeService = async () => {
      const user = authService.getCurrentUser();
      if (user && !awsNativeService.isInitialized()) {
        try {
          // Get AWS config from environment
          const config = {
            userPoolId: import.meta.env.VITE_USER_POOL_ID,
            userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
            identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
            region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
            graphqlUrl: import.meta.env.VITE_GRAPHQL_URL || '',
            graphqlApiId: import.meta.env.VITE_GRAPHQL_API_ID || '',
            applicationsTable: import.meta.env.VITE_APPLICATIONS_TABLE || '',
            documentsTable: import.meta.env.VITE_DOCUMENTS_TABLE || ''
          };

          awsNativeService.initialize(config);
          console.log('✅ AWS-Native service initialized successfully');
        } catch (error) {
          console.error('❌ Failed to initialize AWS-Native service:', error);
        }
      }
    };

    initializeService();
  }, []);

  /**
   * POSTULANTE: Fetch my applications (Direct DynamoDB)
   */
  const fetchMyApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Track performance for migration service
      const startTime = Date.now();
      const systemUsed = migrationService.getSystemForFeature('applications', user.userId);
      
      let data: Application[];
      if (systemUsed === 'aws_native') {
        data = await awsNativeService.getMyApplications();
        console.log(`✅ Fetched ${data.length} applications directly from DynamoDB`);
      } else {
        // Legacy API fallback
        const token = authService.getToken();
        if (token) {
          legacyApiService.setAuthToken(token);
        }
        data = await legacyApiService.getMyApplications();
        console.log(`📊 Fetched ${data.length} applications via Legacy API`);
      }

      // Track performance metrics
      migrationService.trackPerformance({
        system: systemUsed === 'aws_native' ? 'aws_native' : 'legacy',
        feature: 'applications',
        operation: 'fetchMyApplications',
        latency: Date.now() - startTime,
        success: true,
        userId: user.userId
      });

      setApplications(data);
    } catch (err) {
      const user = authService.getCurrentUser();
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch applications';
      
      // Track error metrics
      if (user) {
        migrationService.trackPerformance({
          system: 'aws_native',
          feature: 'applications',
          operation: 'fetchMyApplications',
          latency: Date.now(),
          success: false,
          error: errorMessage,
          userId: user.userId
        });
      }

      setError(errorMessage);
      console.error('❌ Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * POSTULANTE: Create new application (Direct DynamoDB)
   */
  const createApplication = async (input: CreateApplicationInput): Promise<Application | null> => {
    setLoading(true);
    setError(null);

    try {
      const user = authService.getCurrentUser();
      if (!user || user.role !== 'postulante') {
        throw new Error('Only postulantes can create applications');
      }

      // Track performance for migration service
      const startTime = Date.now();
      const systemUsed = migrationService.getSystemForFeature('applications', user.userId);
      
      let newApplication: Application;
      if (systemUsed === 'aws_native') {
        newApplication = await awsNativeService.createApplication(input);
        console.log('✅ Application created successfully via AWS-Native');
      } else {
        // Legacy API fallback
        const token = authService.getToken();
        if (token) {
          legacyApiService.setAuthToken(token);
        }
        newApplication = await legacyApiService.createApplication(input);
        console.log('📊 Application created successfully via Legacy API');
      }

      // Track performance metrics
      migrationService.trackPerformance({
        system: systemUsed === 'aws_native' ? 'aws_native' : 'legacy',
        feature: 'applications',
        operation: 'createApplication',
        latency: Date.now() - startTime,
        success: true,
        userId: user.userId
      });
      
      // Update local state
      setApplications(prev => [newApplication, ...prev]);
      
      return newApplication;
    } catch (err) {
      const user = authService.getCurrentUser();
      const errorMessage = err instanceof Error ? err.message : 'Failed to create application';
      
      // Track error metrics
      if (user) {
        migrationService.trackPerformance({
          system: 'aws_native',
          feature: 'applications',
          operation: 'createApplication',
          latency: Date.now(),
          success: false,
          error: errorMessage,
          userId: user.userId
        });
      }

      setError(errorMessage);
      console.error('❌ Error creating application:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * POSTULANTE: Update my application (Direct DynamoDB)
   */
  const updateMyApplication = async (
    applicationId: string, 
    updates: Partial<CreateApplicationInput>
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const user = authService.getCurrentUser();
      if (!user || user.role !== 'postulante') {
        throw new Error('Unauthorized to update applications');
      }

      const updatedApplication = await awsNativeService.updateMyApplication(applicationId, updates);
      
      // Update local state
      setApplications(prev => 
        prev.map(app => 
          app.applicationId === applicationId ? updatedApplication : app
        )
      );
      
      console.log('✅ Application updated successfully via AWS-Native');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update application';
      setError(errorMessage);
      console.error('❌ Error updating application:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * ADMIN ONLY: Fetch all applications (Direct DynamoDB)
   */
  const fetchAllApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      const user = authService.getCurrentUser();
      if (!user || user.role !== 'admin') {
        throw new Error('Admin access required');
      }

      const data = await awsNativeService.getAllApplications();
      setApplications(data);
      
      console.log(`✅ Fetched ${data.length} applications (admin) directly from DynamoDB`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch applications';
      setError(errorMessage);
      console.error('❌ Error fetching all applications:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ADMIN ONLY: Update application status (Direct DynamoDB)
   */
  const updateApplicationStatus = async (
    userId: string,
    applicationId: string,
    status: Application['status']
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const user = authService.getCurrentUser();
      if (!user || user.role !== 'admin') {
        throw new Error('Admin access required');
      }

      const updatedApplication = await awsNativeService.updateApplicationStatus(
        userId, 
        applicationId, 
        status
      );
      
      // Update local state
      setApplications(prev => 
        prev.map(app => 
          app.applicationId === applicationId && app.userId === userId 
            ? updatedApplication 
            : app
        )
      );
      
      console.log('✅ Application status updated successfully via AWS-Native');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update application status';
      setError(errorMessage);
      console.error('❌ Error updating application status:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get application statistics (for admin dashboard)
   */
  const getApplicationStats = () => {
    const stats = {
      total: applications.length,
      pending: applications.filter(app => app.status === 'PENDING').length,
      approved: applications.filter(app => app.status === 'APPROVED').length,
      rejected: applications.filter(app => app.status === 'REJECTED').length,
      inReview: applications.filter(app => app.status === 'IN_REVIEW').length,
    };

    return stats;
  };

  /**
   * Check if AWS-Native service is available
   */
  const isAWSNativeAvailable = () => {
    const user = authService.getCurrentUser();
    if (!user) return false;
    
    const systemUsed = migrationService.getSystemForFeature('applications', user.userId);
    return systemUsed === 'aws_native' && awsNativeService.isInitialized();
  };

  /**
   * Get migration configuration
   */
  const getMigrationConfig = () => {
    return migrationService.getConfig();
  };

  /**
   * Get performance comparison between systems
   */
  const getPerformanceComparison = (timeWindowMinutes = 60) => {
    return migrationService.getPerformanceComparison('applications', timeWindowMinutes);
  };

  /**
   * Update migration configuration (admin only)
   */
  const updateMigrationConfig = (newConfig: unknown) => {
    const user = authService.getCurrentUser();
    if (user?.role === 'admin') {
      migrationService.updateConfig(newConfig);
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  return {
    // State
    applications,
    loading,
    error,
    
    // Actions
    fetchMyApplications,
    createApplication,
    updateMyApplication,
    fetchAllApplications,
    updateApplicationStatus,
    
    // Utils
    getApplicationStats,
    isAWSNativeAvailable,
    clearError,
    
    // Migration & A/B Testing
    getMigrationConfig,
    getPerformanceComparison,
    updateMigrationConfig,
  };
};