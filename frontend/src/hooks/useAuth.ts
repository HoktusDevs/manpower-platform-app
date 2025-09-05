import { useState, useCallback, useEffect } from 'react';
import { cognitoAuthService } from '../services/cognitoAuthService';
import type { User, RegisterRequest, LoginRequest, AuthSystem } from '../types/auth';

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

  // Initialize Cognito auth service
  useEffect(() => {
    const initializeAuth = async () => {
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
      const result = await cognitoAuthService.login(credentials);
      
      if (result.success && result.data?.user) {
        setUser(result.data.user);
        cognitoAuthService.setUserData(result.data.user);
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
      const result = await cognitoAuthService.register(userData);
      
      if (result.success) {
        if (result.data?.user) {
          setUser(result.data.user);
          cognitoAuthService.setUserData(result.data.user);
        }
        
        // For Cognito, registration might succeed but user needs email verification
        if (!result.data?.user) {
          setError('Registration successful. Please check your email for verification.');
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
    cognitoAuthService.logout();
    setUser(null);
    setError(null);
  }, []);

  // Cognito-specific functions
  const confirmRegistration = useCallback(async (email: string, code: string): Promise<boolean> => {
    if (!isInitialized) return false;

    setIsLoading(true);
    setError(null);

    try {
      const result = await cognitoAuthService.confirmRegistration(email, code);
      if (!result.success) {
        setError(result.message || 'Email verification failed');
      }
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Email verification failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const forgotPassword = useCallback(async (email: string): Promise<boolean> => {
    if (!isInitialized) return false;

    setIsLoading(true);
    setError(null);

    try {
      const result = await cognitoAuthService.forgotPassword(email);
      if (!result.success) {
        setError(result.message || 'Password reset request failed');
      }
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Password reset request failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const confirmPassword = useCallback(async (email: string, code: string, newPassword: string): Promise<boolean> => {
    if (!isInitialized) return false;

    setIsLoading(true);
    setError(null);

    try {
      const result = await cognitoAuthService.confirmPassword(email, code, newPassword);
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
  }, [isInitialized]);

  return {
    user,
    isLoading,
    error,
    isAuthenticated: cognitoAuthService.isAuthenticated(),
    authSystem: 'cognito',
    login,
    register,
    logout,
    clearError,
    confirmRegistration,
    forgotPassword,
    confirmPassword,
  };
};