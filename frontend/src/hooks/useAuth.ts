import { useState, useCallback, useEffect } from 'react';
import { authService } from '../services/authService';
import { cognitoAuthService } from '../services/cognitoAuthService';
import type { User, RegisterRequest, LoginRequest, AuthSystem } from '../types/auth';

// Environment configuration
const USE_COGNITO = import.meta.env.VITE_USE_COGNITO === 'true';

interface UseAuthReturn {
  // Estado
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  authSystem: AuthSystem;
  
  // Acciones
  login: (credentials: LoginRequest) => Promise<boolean>;
  register: (userData: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  
  // Funciones adicionales para Cognito
  confirmRegistration?: (email: string, code: string) => Promise<boolean>;
  forgotPassword?: (email: string) => Promise<boolean>;
  confirmPassword?: (email: string, code: string, newPassword: string) => Promise<boolean>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the appropriate auth service
  useEffect(() => {
    const initializeAuth = async () => {
      if (USE_COGNITO) {
        // Initialize Cognito with environment variables
        const cognitoConfig = {
          userPoolId: import.meta.env.VITE_USER_POOL_ID,
          userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
          identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
          region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
        };

        if (!cognitoConfig.userPoolId || !cognitoConfig.userPoolClientId) {
          console.error('Cognito configuration missing. Please check environment variables.');
          setError('Authentication configuration error');
          return;
        }

        cognitoAuthService.initialize(cognitoConfig);
        setUser(cognitoAuthService.getCurrentUser());
      } else {
        // Use existing custom auth service
        setUser(authService.getCurrentUser());
      }
      
      setIsInitialized(true);
    };

    initializeAuth();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async (credentials: LoginRequest): Promise<boolean> => {
    if (!isInitialized) {
      setError('Authentication system not initialized');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = USE_COGNITO 
        ? await cognitoAuthService.login(credentials)
        : await authService.login(credentials);
      
      if (result.success && result.data?.user) {
        setUser(result.data.user);
        if (USE_COGNITO) {
          cognitoAuthService.setUserData(result.data.user);
        } else {
          authService.setUserData(result.data.user);
        }
        return true;
      } else {
        setError(result.message || 'Login failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const register = useCallback(async (userData: RegisterRequest): Promise<boolean> => {
    if (!isInitialized) {
      setError('Authentication system not initialized');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = USE_COGNITO 
        ? await cognitoAuthService.register(userData)
        : await authService.register(userData);
      
      if (result.success) {
        if (result.data?.user) {
          setUser(result.data.user);
          if (USE_COGNITO) {
            cognitoAuthService.setUserData(result.data.user);
          } else {
            authService.setUserData(result.data.user);
          }
        }
        
        // For Cognito, registration might succeed but user needs email verification
        if (USE_COGNITO && !result.data?.user) {
          setError(result.message || 'Please check your email to verify your account');
        }
        
        return true;
      } else {
        setError(result.message || 'Registration failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const logout = useCallback(() => {
    if (USE_COGNITO) {
      cognitoAuthService.logout();
    } else {
      authService.logout();
    }
    setUser(null);
    setError(null);
  }, []);

  // Cognito-specific functions
  const confirmRegistration = useCallback(async (email: string, code: string): Promise<boolean> => {
    if (!USE_COGNITO) {
      setError('Email verification only available with Cognito');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await cognitoAuthService.confirmRegistration(email, code);
      if (!result.success) {
        setError(result.message || 'Verification failed');
      }
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const forgotPassword = useCallback(async (email: string): Promise<boolean> => {
    if (!USE_COGNITO) {
      setError('Password reset only available with Cognito');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await cognitoAuthService.forgotPassword(email);
      if (!result.success) {
        setError(result.message || 'Password reset failed');
      }
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Password reset failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const confirmPassword = useCallback(async (email: string, code: string, newPassword: string): Promise<boolean> => {
    if (!USE_COGNITO) {
      setError('Password confirmation only available with Cognito');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await cognitoAuthService.confirmPassword(email, code, newPassword);
      if (!result.success) {
        setError(result.message || 'Password confirmation failed');
      }
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Password confirmation failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isAuthenticated = USE_COGNITO 
    ? cognitoAuthService.isAuthenticated()
    : authService.isAuthenticated();

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    authSystem: USE_COGNITO ? 'cognito' : 'custom',
    login,
    register,
    logout,
    clearError,
    ...(USE_COGNITO && {
      confirmRegistration,
      forgotPassword,
      confirmPassword,
    }),
  };
};