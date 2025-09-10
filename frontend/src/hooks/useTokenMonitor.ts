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
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

export const useTokenMonitor = (isAuthenticated: boolean): UseTokenMonitorReturn => {
  const [state, setState] = useState<TokenMonitorState>({
    showRenewalModal: false,
    timeRemaining: 0,
    isRenewing: false
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef<boolean>(false);

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
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, showRenewalModal: false }));
      warningShownRef.current = false;
      return;
    }

    // Get token expiration time inline to avoid dependency issues
    const accessToken = localStorage.getItem('cognito_access_token');
    const idToken = localStorage.getItem('cognito_id_token');
    const token = idToken || accessToken;
    
    let expirationTime: number | null = null;
    if (token) {
      const payload = parseJWT(token);
      expirationTime = payload?.exp || null;
    }
    
    if (!expirationTime) return;

    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = expirationTime - now;

    // Token has already expired
    if (timeRemaining <= 0) {
      setState(prev => ({ ...prev, showRenewalModal: true, timeRemaining: 0 }));
      return;
    }

    // Show warning if token expires within WARNING_TIME and hasn't been shown yet
    if (timeRemaining <= TOKEN_WARNING_TIME && !warningShownRef.current) {
      setState(prev => ({ 
        ...prev, 
        showRenewalModal: true, 
        timeRemaining 
      }));
      warningShownRef.current = true;
    } else if (state.showRenewalModal) {
      // Update time remaining if modal is already shown
      setState(prev => ({ ...prev, timeRemaining }));
    }
  }, [isAuthenticated, state.showRenewalModal]);

  const renewSession = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isRenewing: true }));

    try {
      console.log('🔄 Attempting to renew session...');
      
      // First check if user is still authenticated
      if (!cognitoAuthService.isAuthenticated()) {
        throw new Error('User no longer authenticated');
      }

      // Try to get a valid access token (this will refresh if needed)
      const validToken = await cognitoAuthService.getValidAccessToken();
      
      if (validToken) {
        // Successfully renewed - close modal and reset state
        setState(prev => ({ 
          ...prev, 
          showRenewalModal: false, 
          isRenewing: false,
          timeRemaining: 0 
        }));
        warningShownRef.current = false;
        console.log('✅ Token renewed successfully');
        
        // Force a page refresh to ensure all components get the new token
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        throw new Error('Token refresh returned null - authentication expired');
      }
    } catch (error) {
      console.error('❌ Failed to renew session:', error);
      
      // Check if the error is due to expired refresh token
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRefreshTokenExpired = errorMessage.includes('Refresh Token has expired') || 
                                    errorMessage.includes('NotAuthorizedException') ||
                                    errorMessage.includes('authentication expired');
      
      // Show error state but don't close modal immediately
      setState(prev => ({ ...prev, isRenewing: false }));
      
      if (isRefreshTokenExpired) {
        console.log('🚀 Refresh token expired - redirecting to login immediately');
        // Immediate redirect for expired refresh tokens
        cognitoAuthService.logout();
        window.location.href = '/login';
      } else {
        // For other errors, wait a moment to show the error
        setTimeout(() => {
          console.log('🚀 Redirecting to login due to session renewal failure');
          cognitoAuthService.logout();
          window.location.href = '/login';
        }, 2000);
      }
    }
  }, []);

  const dismissModal = useCallback(() => {
    setState(prev => ({ ...prev, showRenewalModal: false }));
    warningShownRef.current = false;
  }, []);

  // Start/stop monitoring based on authentication status
  useEffect(() => {
    if (isAuthenticated) {
      // Initial check
      checkTokenExpiration();
      
      // Set up periodic checking
      intervalRef.current = setInterval(checkTokenExpiration, CHECK_INTERVAL);
    } else {
      // Clear interval when not authenticated
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setState({
        showRenewalModal: false,
        timeRemaining: 0,
        isRenewing: false
      });
      warningShownRef.current = false;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, checkTokenExpiration]);

  return {
    showRenewalModal: state.showRenewalModal,
    timeRemaining: state.timeRemaining,
    isRenewing: state.isRenewing,
    renewSession,
    dismissModal
  };
};