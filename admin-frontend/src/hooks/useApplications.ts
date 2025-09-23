/**
 * Hook for Applications Management
 * Provides state and operations for application management
 */

import { useState } from 'react';
import { applicationsApiService, type Application, type ApplicationStats } from '../services/applicationsApiService';

export const useApplications = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all applications (ADMIN)
   */
  const fetchAllApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching all applications...');
      const response = await applicationsApiService.getAllApplications();
      
      console.log('📊 API Response:', { response, isArray: Array.isArray(response), type: typeof response });
      
      // Extraer applications del objeto de respuesta
      let applicationsArray = [];
      if (Array.isArray(response)) {
        applicationsArray = response;
      } else if (response && (response as any).data && Array.isArray((response as any).data.applications)) {
        applicationsArray = (response as any).data.applications;
      } else if (response && Array.isArray((response as any).applications)) {
        applicationsArray = (response as any).applications;
      }
      
      setApplications(applicationsArray);
      console.log(`✅ Fetched ${applicationsArray.length} applications`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch applications';
      setError(errorMessage);
      console.error('❌ Error fetching applications:', err);
      
      // Si es error de autenticación, mostrar mensaje específico
      if (errorMessage.includes('authentication') || errorMessage.includes('token')) {
        setError('Error de autenticación. Por favor, inicia sesión nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch my applications (USER)
   */
  const fetchMyApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await applicationsApiService.getMyApplications();
      setApplications(data);
      console.log(`✅ Fetched ${data.length} my applications`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch my applications';
      setError(errorMessage);
      console.error('❌ Error fetching my applications:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch application statistics
   */
  const fetchApplicationStats = async () => {
    try {
      const data = await applicationsApiService.getApplicationStats();
      setStats(data);
      console.log('✅ Fetched application stats:', data);
    } catch (err) {
      console.error('❌ Error fetching application stats:', err);
    }
  };

  /**
   * Update application status (ADMIN)
   */
  const updateApplicationStatus = async (
    applicationId: string,
    status: Application['status']
  ): Promise<boolean> => {
    try {
      const updatedApplication = await applicationsApiService.updateApplicationStatus(
        applicationId,
        status
      );
      
      setApplications(prev => 
        prev.map(app => 
          app.applicationId === applicationId ? updatedApplication : app
        )
      );
      
      console.log(`✅ Updated application ${applicationId} status to ${status}`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update application status';
      setError(errorMessage);
      console.error('❌ Error updating application status:', err);
      return false;
    }
  };

  /**
   * Update my application (USER)
   */
  const updateMyApplication = async (
    applicationId: string,
    updates: { status?: Application['status']; description?: string; salary?: string; location?: string }
  ): Promise<boolean> => {
    try {
      const updatedApplication = await applicationsApiService.updateMyApplication(
        applicationId,
        updates
      );
      
      setApplications(prev => 
        prev.map(app => 
          app.applicationId === applicationId ? updatedApplication : app
        )
      );
      
      console.log(`✅ Updated my application ${applicationId}`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update my application';
      setError(errorMessage);
      console.error('❌ Error updating my application:', err);
      return false;
    }
  };

  /**
   * Delete my application (USER)
   */
  const deleteMyApplication = async (applicationId: string): Promise<boolean> => {
    try {
      const success = await applicationsApiService.deleteMyApplication(applicationId);
      
      if (success) {
        setApplications(prev => 
          prev.filter(app => app.applicationId !== applicationId)
        );
        console.log(`✅ Deleted application ${applicationId}`);
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete application';
      setError(errorMessage);
      console.error('❌ Error deleting application:', err);
      return false;
    }
  };

  /**
   * Delete multiple applications (ADMIN)
   */
  const deleteApplications = async (applicationIds: string[]): Promise<boolean> => {
    try {
      console.log(`🗑️ Attempting to delete ${applicationIds.length} applications:`, applicationIds);
      
      const success = await applicationsApiService.deleteApplications(applicationIds);
      
      if (success) {
        setApplications(prev => 
          prev.filter(app => !applicationIds.includes(app.applicationId))
        );
        console.log(`✅ Deleted ${applicationIds.length} applications`);
        setError(null); // Clear any previous errors
      } else {
        console.log('❌ Delete operation returned false');
        setError('Failed to delete applications');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete applications';
      setError(errorMessage);
      console.error('❌ Error deleting applications:', err);
      return false;
    }
  };

  /**
   * Clear error
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Refresh data
   */
  const refresh = () => {
    fetchAllApplications();
    fetchApplicationStats();
  };

  return {
    // State
    applications,
    stats,
    loading,
    error,
    
    // Actions
    fetchAllApplications,
    fetchMyApplications,
    fetchApplicationStats,
    updateApplicationStatus,
    updateMyApplication,
    deleteMyApplication,
    deleteApplications,
    clearError,
    refresh,
  };
};
