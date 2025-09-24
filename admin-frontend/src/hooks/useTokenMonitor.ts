import { useState, useEffect, useCallback, useRef } from 'react';
import { cognitoAuthService } from '../services/cognitoAuthService';

interface TokenMonitorState {
  showRenewalModal: boolean;
  timeRemaining: number;
  isRenewing: boolean;
}

interface UseTokenMonitorReturn extends TokenMonitorState {
  renewSession: () => Promise<void>;
  dismissModal: () => void;
}

const TOKEN_WARNING_TIME = 5 * 60; // 5 minutes before expiration
const CHECK_INTERVAL = 1 * 1000; // Check every 1 second for better countdown accuracy
const AUTO_LOGOUT_DELAY = 5 * 1000; // Auto logout after 5 seconds when token expires

export const useTokenMonitor = (): UseTokenMonitorReturn => {
  const [state, setState] = useState<TokenMonitorState>({
    showRenewalModal: false,
    timeRemaining: 0,
    isRenewing: false
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef<boolean>(false);
  const userDismissedRef = useRef<boolean>(false);
  const isLoggedOutRef = useRef<boolean>(false);
  const autoLogoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRenewalTimeRef = useRef<number>(0);

  const performLogout = useCallback(() => {
    // Stop all monitoring
    isLoggedOutRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (autoLogoutTimerRef.current) {
      clearTimeout(autoLogoutTimerRef.current);
      autoLogoutTimerRef.current = null;
    }

    // Force logout
    setState({
      showRenewalModal: false,
      isRenewing: false,
      timeRemaining: 0
    });

    cognitoAuthService.logout();
    localStorage.clear();
    window.location.href = '/login';
  }, []);

  const parseJWT = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  const checkTokenExpiration = useCallback(() => {
    // If already logged out, stop all monitoring
    if (isLoggedOutRef.current) {
      return;
    }

    // Check if we have tokens stored (even if expired)
    const accessToken = localStorage.getItem('cognito_access_token');
    const idToken = localStorage.getItem('cognito_id_token');
    const refreshToken = localStorage.getItem('cognito_refresh_token');
    
    // If no tokens at all, user is not authenticated
    if (!accessToken && !idToken && !refreshToken) {
      setState(prev => ({ ...prev, showRenewalModal: false }));
      warningShownRef.current = false;
      userDismissedRef.current = false;
      return;
    }
    const token = idToken || accessToken;
    
    let expirationTime: number | null = null;
    if (token) {
      const payload = parseJWT(token);
      expirationTime = payload?.exp || null;
    }
    
    if (!expirationTime) return;

    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = expirationTime - now;

    // Token has already expired - show modal if not shown, auto-logout if no action
    if (timeRemaining <= 0) {
      if (!warningShownRef.current && !userDismissedRef.current) {
        setState(prev => ({ ...prev, showRenewalModal: true, timeRemaining: 0 }));
        warningShownRef.current = true;

        // Start auto-logout timer when token expires
        if (!autoLogoutTimerRef.current) {
          autoLogoutTimerRef.current = setTimeout(() => {
            performLogout();
          }, AUTO_LOGOUT_DELAY);
        }
      } else if (warningShownRef.current && !userDismissedRef.current) {
        // Modal is already shown, just update time remaining to 0
        setState(prev => ({ ...prev, timeRemaining: 0 }));

        // If we've been at 0 for too long, force logout
        if (!autoLogoutTimerRef.current) {
          autoLogoutTimerRef.current = setTimeout(() => {
            performLogout();
          }, AUTO_LOGOUT_DELAY);
        }
      }
      return;
    }

    // Check if we recently renewed (within last 2 minutes) to avoid immediate re-triggering
    const timeSinceLastRenewal = (Date.now() / 1000) - lastRenewalTimeRef.current;
    const RENEWAL_GRACE_PERIOD = 2 * 60; // 2 minutes grace period after renewal

    // Show warning if token expires within WARNING_TIME and hasn't been shown yet and user hasn't dismissed
    // AND we're not in the grace period after renewal
    if (timeRemaining <= TOKEN_WARNING_TIME &&
        !warningShownRef.current &&
        !userDismissedRef.current &&
        timeSinceLastRenewal > RENEWAL_GRACE_PERIOD) {
      setState(prev => ({
        ...prev,
        showRenewalModal: true,
        timeRemaining
      }));
      warningShownRef.current = true;
    } else if (warningShownRef.current && !userDismissedRef.current) {
      // Update time remaining if warning is already shown and not dismissed
      setState(prev => ({ ...prev, timeRemaining }));
    }
  }, []);

  const renewSession = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isRenewing: true }));

    try {
      // First check if user is still authenticated
      if (!cognitoAuthService.isAuthenticated()) {
        throw new Error('User no longer authenticated');
      }

      // Try to refresh the token using Cognito's refresh mechanism
      const refreshed = await cognitoAuthService.refreshUserSession();

      if (refreshed) {
        // Clear auto-logout timer if it exists
        if (autoLogoutTimerRef.current) {
          clearTimeout(autoLogoutTimerRef.current);
          autoLogoutTimerRef.current = null;
        }

        // Close modal immediately
        setState({
          showRenewalModal: false,
          isRenewing: false,
          timeRemaining: 0
        });

        // Reset all flags and record renewal time
        warningShownRef.current = false;
        userDismissedRef.current = false;
        lastRenewalTimeRef.current = Date.now() / 1000;

        } else {
        throw new Error('Token refresh returned null - authentication expired');
      }
    } catch (error) {
      // Stop all monitoring immediately
      isLoggedOutRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Clear auto-logout timer if it exists
      if (autoLogoutTimerRef.current) {
        clearTimeout(autoLogoutTimerRef.current);
        autoLogoutTimerRef.current = null;
      }

      // Close modal and force logout immediately
      setState({
        showRenewalModal: false,
        isRenewing: false,
        timeRemaining: 0
      });
      warningShownRef.current = false;
      userDismissedRef.current = false;
      lastRenewalTimeRef.current = 0;
      
      cognitoAuthService.logout();
      localStorage.clear();
      window.location.href = '/login';
    }
  }, []);

  const dismissModal = useCallback(() => {
    performLogout();
  }, [performLogout]);

  // Start monitoring on mount
  useEffect(() => {
    // Only start monitoring if not already logged out
    if (!isLoggedOutRef.current) {
      // Initial check
      checkTokenExpiration();
      
      // Set up periodic checking
      intervalRef.current = setInterval(checkTokenExpiration, CHECK_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (autoLogoutTimerRef.current) {
        clearTimeout(autoLogoutTimerRef.current);
        autoLogoutTimerRef.current = null;
      }
    };
  }, [checkTokenExpiration]);

  return {
    showRenewalModal: state.showRenewalModal,
    timeRemaining: state.timeRemaining,
    isRenewing: state.isRenewing,
    renewSession,
    dismissModal
  };
};