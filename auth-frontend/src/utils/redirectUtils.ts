/**
 * Utility functions for handling user redirections based on roles
 */

import { APP_CONFIG } from '../config/app-config';

export interface User {
  'custom:role': string;
  email: string;
  sub: string;
  email_verified: boolean;
}

/**
 * Gets the redirect URL based on user role
 * @param userRole - The role of the user ('admin' or 'postulante')
 * @returns The URL to redirect to
 */
export const getRedirectUrlByRole = (userRole: string): string => {
  switch (userRole) {
    case 'admin':
      return APP_CONFIG.ADMIN_FRONTEND_URL;
    case 'postulante':
      return APP_CONFIG.APPLICANT_FRONTEND_URL;
    default:
      // Fallback to applicant-frontend for unknown roles
      return APP_CONFIG.APPLICANT_FRONTEND_URL;
  }
};

/**
 * Redirects the user to the appropriate frontend based on their role
 * @param user - The authenticated user object
 */
export const redirectToUserDashboard = (user: User): void => {
  const userRole = user['custom:role'];
  const redirectUrl = getRedirectUrlByRole(userRole);

  // Replace current location to avoid back button issues
  window.location.replace(redirectUrl);
};

/**
 * Redirects based on role string directly
 * @param role - The role string ('admin' or 'postulante')
 */
export const redirectByRole = (role: string): void => {
  const redirectUrl = getRedirectUrlByRole(role);
  window.open(redirectUrl, '_self');
};