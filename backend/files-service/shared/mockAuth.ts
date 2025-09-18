/**
 * Shared Mock Authentication Credentials
 *
 * Use these consistent credentials across all microservices for local development
 */

export interface MockUser {
  userId: string;
  userRole: 'admin' | 'postulante';
}

export const MOCK_CREDENTIALS = {
  ADMIN: {
    userId: 'mock-admin-123',
    userRole: 'admin' as const,
  },
  POSTULANTE: {
    userId: 'mock-user-456',
    userRole: 'postulante' as const,
  },
} as const;

/**
 * Extract user credentials from event with mock fallback for local development
 */
export function extractUserFromEvent(event: any): MockUser {
  const claims = event.requestContext.authorizer?.claims;

  // For local development, provide mock values when claims are not available
  if (!claims && process.env.STAGE === 'local') {
    console.log('Using mock admin credentials for local testing');
    return MOCK_CREDENTIALS.ADMIN;
  }

  if (!claims) {
    throw new Error('Authorization claims not found');
  }

  return {
    userId: claims.sub,
    userRole: claims['custom:role'] || 'postulante',
  };
}

/**
 * Get mock credentials for specific user type (for services that need specific users)
 */
export function getMockUser(userType: 'admin' | 'postulante' = 'admin'): MockUser {
  return userType === 'admin' ? MOCK_CREDENTIALS.ADMIN : MOCK_CREDENTIALS.POSTULANTE;
}