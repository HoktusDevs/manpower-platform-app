/**
 * Application configuration for frontend URLs
 */

export const APP_CONFIG = {
  // Frontend URLs
  ADMIN_FRONTEND_URL: import.meta.env['VITE_ADMIN_FRONTEND_URL'] || 'http://localhost:6500',
  APPLICANT_FRONTEND_URL: import.meta.env['VITE_APPLICANT_FRONTEND_URL'] || 'http://localhost:6200',
} as const;

export type AppConfig = typeof APP_CONFIG;