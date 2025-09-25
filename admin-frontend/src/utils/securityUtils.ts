import { cognitoAuthService } from '../services/cognitoAuthService';

// SECURITY: Admin-only routes that should be completely invisible to postulantes
export const ADMIN_RESTRICTED_ROUTES = [
  '/admin',
  '/admin/dashboard',
  '/admin/users',
  '/admin/management', 
  '/admin/settings',
  '/admin/reports',
  '/admin/analytics',
  '/admin/audit',
  '/dashboard/admin',
  '/users',
  '/management',
  '/settings/admin',
  '/reports',
  '/analytics',
  '/audit'
];

// SECURITY: API endpoints that should never be accessible to postulantes
export const ADMIN_RESTRICTED_APIS = [
  '/api/admin',
  '/api/users/manage',
  '/api/users/list',
  '/api/users/delete',
  '/api/users/update',
  '/api/reports',
  '/api/analytics', 
  '/api/audit',
  '/api/settings/system',
  '/api/management'
];

/**
 * SECURITY: Check if a route should be accessible to current user
 */
export const isRouteAuthorized = (path: string): boolean => {
  const user = cognitoAuthService.getCurrentUser();
  
  if (!user || !user.role) {
    return false;
  }

  // Admin can access everything
  if (user.role === 'admin') {
    return true;
  }

  // Postulante cannot access admin routes
  if (user.role === 'postulante') {
    const normalizedPath = path.toLowerCase();
    return !ADMIN_RESTRICTED_ROUTES.some(restrictedRoute => 
      normalizedPath.includes(restrictedRoute.toLowerCase())
    );
  }

  return false;
};

/**
 * SECURITY: Check if an API endpoint should be accessible to current user
 */
export const isAPIAuthorized = (url: string): boolean => {
  const user = cognitoAuthService.getCurrentUser();
  
  if (!user || !user.role) {
    return false;
  }

  // Admin can access everything
  if (user.role === 'admin') {
    return true;
  }

  // Postulante cannot access admin APIs
  if (user.role === 'postulante') {
    const normalizedUrl = url.toLowerCase();
    return !ADMIN_RESTRICTED_APIS.some(restrictedApi => 
      normalizedUrl.includes(restrictedApi.toLowerCase())
    );
  }

  return false;
};

/**
 * SECURITY: Clear sensitive data from browser
 */
export const clearSensitiveData = (): void => {
  // Clear session storage
  sessionStorage.clear();
  
  // Clear specific localStorage items that might contain admin data
  const sensitiveKeys = [
    'adminCache',
    'adminData',
    'userList',
    'systemSettings',
    'reports',
    'analytics'
  ];
  
  sensitiveKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear any cached API responses
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        if (name.includes('admin') || name.includes('management')) {
          caches.delete(name);
        }
      });
    });
  }
};

/**
 * SECURITY: Log security violation
 */
export const logSecurityViolation = (violation: {
  userId?: string;
  email?: string;
  attemptedRoute?: string;
  attemptedEndpoint?: string;
  userRole?: string;
  action: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}): void => {
  const timestamp = new Date().toISOString();
  const violationLog = {
    ...violation,
    timestamp,
    userAgent: navigator.userAgent,
    ip: 'client-side', // Would need server-side to get real IP
    sessionId: sessionStorage.getItem('sessionId') || 'no-session'
  };

  // Log to console with appropriate level
  const logLevel = violation.severity === 'CRITICAL' ? 'error' : 
                  violation.severity === 'HIGH' ? 'error' :
                  violation.severity === 'MEDIUM' ? 'warn' : 'info';
  
  console[logLevel]('🚨 SECURITY VIOLATION:', violationLog);

  // TODO: Send to monitoring service
  // In production, send to:
  // - CloudWatch Logs
  // - Security Information and Event Management (SIEM)
  // - Slack/email alerts for CRITICAL violations
  
  // Example implementation:
  // fetch('/api/security/violations', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(violationLog)
  // }).catch(() => {
  //   // Fallback: store locally and retry later
  //   const violations = JSON.parse(localStorage.getItem('securityViolations') || '[]');
  //   violations.push(violationLog);
  //   localStorage.setItem('securityViolations', JSON.stringify(violations.slice(-50))); // Keep last 50
  // });
};

/**
 * SECURITY: Force logout and clear all data
 */
export const forceSecureLogout = (): void => {
  // Log the security event
  logSecurityViolation({
    action: 'FORCED_LOGOUT',
    severity: 'HIGH',
    attemptedRoute: window.location.pathname
  });

  // Clear all sensitive data
  clearSensitiveData();
  
  // Force logout through auth service
  cognitoAuthService.logout();
  
  // Force redirect to login
  window.location.href = '/login';
};

/**
 * SECURITY: Validate user session integrity
 */
export const validateSessionIntegrity = (): boolean => {
  try {
    const user = cognitoAuthService.getCurrentUser();
    const isAuthenticated = cognitoAuthService.isAuthenticated();
    
    // Check for session inconsistencies
    if (isAuthenticated && !user) {
      logSecurityViolation({
        action: 'SESSION_INCONSISTENCY',
        severity: 'HIGH'
      });
      return false;
    }
    
    if (user && !isAuthenticated) {
      logSecurityViolation({
        action: 'AUTH_TOKEN_MISSING',
        severity: 'MEDIUM'
      });
      return false;
    }
    
    // Check for role tampering
    if (user && (!user.role || !['admin', 'postulante'].includes(user.role))) {
      logSecurityViolation({
        action: 'ROLE_TAMPERING',
        severity: 'CRITICAL',
        userRole: user.role
      });
      return false;
    }
    
    return true;
  } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    logSecurityViolation({
      action: 'SESSION_VALIDATION_ERROR',
      severity: 'HIGH'
    });
    return false;
  }
};