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

  const parseJWT = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT:', error);
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

    // Token has already expired - show modal immediately and start auto-logout timer
    if (timeRemaining <= 0) {
      console.log('🚨 Token expired, showing renewal modal');
      if (!warningShownRef.current && !userDismissedRef.current) {
        setState(prev => ({ ...prev, showRenewalModal: true, timeRemaining: 0 }));
        warningShownRef.current = true;

        // Start auto-logout timer when token expires
        if (!autoLogoutTimerRef.current) {
          autoLogoutTimerRef.current = setTimeout(() => {
            console.log('🚀 Auto-logout after token expiration');
            // Stop all monitoring
            isLoggedOutRef.current = true;
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
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
          }, AUTO_LOGOUT_DELAY);
        }
      }
      return;
    }

    // Show warning if token expires within WARNING_TIME and hasn't been shown yet and user hasn't dismissed
    if (timeRemaining <= TOKEN_WARNING_TIME && !warningShownRef.current && !userDismissedRef.current) {
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
      console.log('🔄 Attempting to renew session...');
      
      // First check if user is still authenticated
      if (!cognitoAuthService.isAuthenticated()) {
        throw new Error('User no longer authenticated');
      }

      // Try to get a valid access token (this will refresh if needed)
      // Pass isSessionRenewal=true to prevent forced logout during renewal
      const validToken = await cognitoAuthService.getValidAccessToken(true);
      
      if (validToken) {
        // Successfully renewed - close modal and reset state immediately
        console.log('✅ Token renewed successfully, closing modal');

        // Clear auto-logout timer if it exists
        if (autoLogoutTimerRef.current) {
          clearTimeout(autoLogoutTimerRef.current);
          autoLogoutTimerRef.current = null;
        }

        setState({
          showRenewalModal: false,
          isRenewing: false,
          timeRemaining: 0
        });
        warningShownRef.current = false;
        userDismissedRef.current = false; // Reset dismiss flag after successful renewal
        console.log('✅ Modal should be closed now');
        
        // NO reload - just close modal and continue
      } else {
        throw new Error('Token refresh returned null - authentication expired');
      }
    } catch (error) {
      console.error('❌ Failed to renew session:', error);
      
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
      
      console.log('🚀 Session renewal failed - redirecting to login');
      cognitoAuthService.logout();
      localStorage.clear();
      window.location.href = '/login';
    }
  }, []);

  const dismissModal = useCallback(() => {
    console.log('🔴 Modal dismissed by user');
    
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

    setState({
      showRenewalModal: false,
      isRenewing: false,
      timeRemaining: 0
    });
    warningShownRef.current = false;
    userDismissedRef.current = true;
    
    // Force logout when modal is dismissed
    console.log('🚀 Forcing logout after modal dismissal');
    localStorage.clear();
    window.location.href = '/login';
  }, []);

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