import { useState, useCallback, useEffect } from 'react';

interface User {
  sub: string;
  email: string;
  fullName?: string;
  'custom:role': string;
  email_verified: boolean;
}

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  idToken: string | null;

  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        // Check existing tokens
        const storedIdToken = localStorage.getItem('cognito_id_token');
        const accessToken = localStorage.getItem('cognito_access_token');

        console.log('🔍 Auth tokens check:', {
          hasIdToken: !!storedIdToken,
          hasAccessToken: !!accessToken
        });

        if (storedIdToken || accessToken) {
          // Get user from localStorage (saved during sessionExchange)
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            try {
              const user = JSON.parse(savedUser);
              setUser(user);
              setIdToken(storedIdToken);
              console.log('✅ User loaded from localStorage:', user.email);
            } catch (error) {
              console.error('Error parsing saved user:', error);
            }
          }
        }

      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);

      // Clear localStorage
      localStorage.removeItem('cognito_access_token');
      localStorage.removeItem('cognito_id_token');
      localStorage.removeItem('user');

      // Reset state
      setUser(null);
      setIdToken(null);
      setError(null);

      // Redirect to auth-frontend
      window.location.href = 'http://manpower-auth-frontend-dev.s3-website-us-east-1.amazonaws.com/login';
    } catch (error) {
      console.error('Logout error:', error);
      setError('Error during logout');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isAuthenticated = Boolean(user && idToken);

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    idToken,
    logout,
    clearError,
  };
};