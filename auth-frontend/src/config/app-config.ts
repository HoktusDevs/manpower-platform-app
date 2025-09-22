/**
 * Application configuration for frontend URLs
 */

export const APP_CONFIG = {
  // Frontend URLs
  ADMIN_FRONTEND_URL: import.meta.env['VITE_ADMIN_FRONTEND_URL'] || 'http://manpower-admin-frontend-dev.s3-website-us-east-1.amazonaws.com',
  APPLICANT_FRONTEND_URL: import.meta.env['VITE_APPLICANT_FRONTEND_URL'] || 'http://manpower-applicant-frontend-dev.s3-website-us-east-1.amazonaws.com',
} as const;

export type AppConfig = typeof APP_CONFIG;