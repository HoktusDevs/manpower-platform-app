/**
 * API Configuration
 * Centralized configuration for all API endpoints
 */

export const API_CONFIG = {
  folders: {
    baseUrl: import.meta.env.VITE_FOLDERS_API_URL || 'https://83upriwf35.execute-api.us-east-1.amazonaws.com/dev',
    endpoints: {
      base: '/folders',
      root: '/folders/root',
      batch: '/folders/batch',
      byId: (folderId: string) => `/folders/${folderId}`,
      children: (folderId: string) => `/folders/${folderId}/children`,
    }
  },
  applications: {
    baseUrl: import.meta.env.VITE_APPLICATIONS_API_URL || 'https://8lmunkvdd5.execute-api.us-east-1.amazonaws.com/dev',
    endpoints: {
      base: '/applications',
      my: '/applications/my',
      byId: (applicationId: string) => `/applications/${applicationId}`,
      stats: '/applications/stats'
    }
  }
} as const;

export type ApiConfig = typeof API_CONFIG;