// Legacy API Service - REST API calls to existing backend
// Used as fallback when migration service determines to use legacy system

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

class LegacyApiService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch (_e) { // eslint-disable-line @typescript-eslint/no-unused-vars
      throw new Error(`Invalid JSON response: ${text}`);
    }
  }

  /**
   * POSTULANTE: Get my applications via legacy REST API
   */
  async getMyApplications(): Promise<Application[]> {
    try {
      const response = await fetch(`${this.baseUrl}/applications/my`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<Application[]>(response);
    } catch (error) {
      console.error('❌ Legacy API: Failed to fetch my applications:', error);
      throw new Error(`Failed to fetch applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * POSTULANTE: Create new application via legacy REST API
   */
  async createApplication(input: CreateApplicationInput): Promise<Application> {
    try {
      const response = await fetch(`${this.baseUrl}/applications`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(input),
      });

      return await this.handleResponse<Application>(response);
    } catch (error) {
      console.error('❌ Legacy API: Failed to create application:', error);
      throw new Error(`Failed to create application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * POSTULANTE: Update my application via legacy REST API
   */
  async updateMyApplication(applicationId: string, updates: Partial<CreateApplicationInput>): Promise<Application> {
    try {
      const response = await fetch(`${this.baseUrl}/applications/${applicationId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      });

      return await this.handleResponse<Application>(response);
    } catch (error) {
      console.error('❌ Legacy API: Failed to update application:', error);
      throw new Error(`Failed to update application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ADMIN: Get all applications via legacy REST API
   */
  async getAllApplications(): Promise<Application[]> {
    try {
      const response = await fetch(`${this.baseUrl}/applications`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<Application[]>(response);
    } catch (error) {
      console.error('❌ Legacy API: Failed to fetch all applications:', error);
      throw new Error(`Failed to fetch applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ADMIN: Update application status via legacy REST API
   */
  async updateApplicationStatus(
    userId: string,
    applicationId: string,
    status: Application['status']
  ): Promise<Application> {
    try {
      const response = await fetch(`${this.baseUrl}/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ status, userId }),
      });

      return await this.handleResponse<Application>(response);
    } catch (error) {
      console.error('❌ Legacy API: Failed to update application status:', error);
      throw new Error(`Failed to update application status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check for legacy API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Legacy API: Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const legacyApiService = new LegacyApiService();
export type { Application, CreateApplicationInput };