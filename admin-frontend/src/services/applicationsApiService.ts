/**
 * Applications REST API Service
 * Handles all application-related REST API operations
 */

import { API_CONFIG } from '../config/api.config';
// import { cognitoAuthService } from './cognitoAuthService';

// Types
export interface Application {
  applicationId: string;
  userId: string;
  jobId: string;
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

export interface ApplicationStats {
  totalApplications: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  inReviewCount: number;
  interviewScheduledCount: number;
  hiredCount: number;
}

export interface CreateApplicationInput {
  jobId: string;
  companyName: string;
  position: string;
  description?: string;
  salary?: string;
  location?: string;
  companyId?: string;
}

export interface UpdateApplicationInput {
  status?: Application['status'];
  description?: string;
  salary?: string;
  location?: string;
}

class ApplicationsApiService {
  private getHeaders(): HeadersInit {
    console.log('📡 Making request to applications API (no auth required)');
    
    return {
      'Content-Type': 'application/json',
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    return response.json();
  }

  /**
   * ADMIN: Get all applications
   */
  async getAllApplications(): Promise<Application[]> {
    try {
      const response = await fetch(`${API_CONFIG.applications.baseUrl}${API_CONFIG.applications.endpoints.base}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<Application[]>(response);
    } catch (error) {
      console.error('❌ Applications API: Failed to fetch all applications:', error);
      throw new Error(`Failed to fetch applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * USER: Get my applications
   */
  async getMyApplications(): Promise<Application[]> {
    try {
      const response = await fetch(`${API_CONFIG.applications.baseUrl}${API_CONFIG.applications.endpoints.my}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<Application[]>(response);
    } catch (error) {
      console.error('❌ Applications API: Failed to fetch my applications:', error);
      throw new Error(`Failed to fetch my applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ADMIN: Get application statistics
   */
  async getApplicationStats(): Promise<ApplicationStats> {
    try {
      const response = await fetch(`${API_CONFIG.applications.baseUrl}${API_CONFIG.applications.endpoints.stats}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<ApplicationStats>(response);
    } catch (error) {
      console.error('❌ Applications API: Failed to fetch application stats:', error);
      throw new Error(`Failed to fetch application stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * USER: Create new application
   */
  async createApplication(input: CreateApplicationInput): Promise<Application> {
    try {
      const response = await fetch(`${API_CONFIG.applications.baseUrl}${API_CONFIG.applications.endpoints.base}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(input),
      });

      return await this.handleResponse<Application>(response);
    } catch (error) {
      console.error('❌ Applications API: Failed to create application:', error);
      throw new Error(`Failed to create application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ADMIN: Update application status
   */
  async updateApplicationStatus(
    applicationId: string,
    status: Application['status']
  ): Promise<Application> {
    try {
      const response = await fetch(`${API_CONFIG.applications.baseUrl}${API_CONFIG.applications.endpoints.byId(applicationId)}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ status }),
      });

      return await this.handleResponse<Application>(response);
    } catch (error) {
      console.error('❌ Applications API: Failed to update application status:', error);
      throw new Error(`Failed to update application status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * USER: Update my application
   */
  async updateMyApplication(
    applicationId: string,
    updates: UpdateApplicationInput
  ): Promise<Application> {
    try {
      const response = await fetch(`${API_CONFIG.applications.baseUrl}${API_CONFIG.applications.endpoints.byId(applicationId)}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      });

      return await this.handleResponse<Application>(response);
    } catch (error) {
      console.error('❌ Applications API: Failed to update my application:', error);
      throw new Error(`Failed to update my application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * USER: Delete my application
   */
  async deleteMyApplication(applicationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_CONFIG.applications.baseUrl}${API_CONFIG.applications.endpoints.byId(applicationId)}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Applications API: Failed to delete application:', error);
      throw new Error(`Failed to delete application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ADMIN: Delete multiple applications
   */
  async deleteApplications(applicationIds: string[]): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting ${applicationIds.length} applications via API`);
      
      const response = await fetch(`${API_CONFIG.applications.baseUrl}${API_CONFIG.applications.endpoints.bulk}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ applicationIds }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Applications API: Delete failed:', response.status, errorText);
        throw new Error(`Delete failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Delete response:', result);
      
      // Verificar que la respuesta del backend sea exitosa
      if (!result.success) {
        console.error('❌ Backend returned success: false:', result.message);
        throw new Error(result.message || 'Delete operation failed');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Applications API: Failed to delete applications:', error);
      throw new Error(`Failed to delete applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const applicationsApiService = new ApplicationsApiService();
