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
      const response = await applicationsApiService.getAllApplications();

      console.log('Applications response:', response, 'type:', typeof response);

      // Extraer applications del objeto de respuesta
      let applicationsArray = [];
      if (Array.isArray(response)) {
        applicationsArray = response;
      } else if (response && (response as Record<string, unknown>).data && Array.isArray(((response as Record<string, unknown>).data as Record<string, unknown>).applications)) {
        applicationsArray = ((response as Record<string, unknown>).data as Record<string, unknown>).applications as Application[];
      } else if (response && Array.isArray((response as Record<string, unknown>).applications)) {
        applicationsArray = (response as Record<string, unknown>).applications as Application[];
      }
      
      setApplications(applicationsArray);
      } catch {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch applications';
      setError(errorMessage);
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
      } catch {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch my applications';
      setError(errorMessage);
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
      } catch {
        // Silently handle stats fetch errors - not critical for main functionality
        console.warn('Failed to fetch application stats');
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
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update application status';
      setError(errorMessage);
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
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update my application';
      setError(errorMessage);
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
        }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete application';
      setError(errorMessage);
      return false;
    }
  };

  /**
   * Delete multiple applications (ADMIN)
   */
  const deleteApplications = async (applicationIds: string[]): Promise<boolean> => {
    try {
      const success = await applicationsApiService.deleteApplications(applicationIds);
      
      if (success) {
        setApplications(prev => 
          prev.filter(app => !applicationIds.includes(app.applicationId))
        );
        setError(null); // Clear any previous errors
      } else {
        setError('Failed to delete applications');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete applications';
      setError(errorMessage);
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
