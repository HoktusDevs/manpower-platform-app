/**
 * Application configuration for frontend URLs
 */

// Detect if we're in local development
const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Check if we're running on port 6100 (local auth-frontend)
const isLocalAuthFrontend = window.location.port === '6100';

export const APP_CONFIG = {
  // Frontend URLs - use local URLs only when auth-frontend is running locally
  ADMIN_FRONTEND_URL: (isLocalDevelopment && isLocalAuthFrontend)
    ? 'http://localhost:6500'
    : import.meta.env['VITE_ADMIN_FRONTEND_URL'] || 'http://manpower-admin-frontend-dev.s3-website-us-east-1.amazonaws.com',
  APPLICANT_FRONTEND_URL: (isLocalDevelopment && isLocalAuthFrontend)
    ? 'http://localhost:6200'
    : import.meta.env['VITE_APPLICANT_FRONTEND_URL'] || 'http://manpower-applicant-frontend-dev.s3-website-us-east-1.amazonaws.com',
} as const;

export type AppConfig = typeof APP_CONFIG;