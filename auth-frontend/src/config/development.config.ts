/**
 * Development configuration for local URLs
 */

export const DEVELOPMENT_CONFIG = {
  // Local development URLs
  ADMIN_FRONTEND_URL: 'http://localhost:6500',
  APPLICANT_FRONTEND_URL: 'http://localhost:6501',
} as const;

export type DevelopmentConfig = typeof DEVELOPMENT_CONFIG;
