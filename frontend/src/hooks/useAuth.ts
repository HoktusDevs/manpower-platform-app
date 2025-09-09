import { useState, useCallback, useEffect } from 'react';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import { cognitoAuthService } from '../services/cognitoAuthService';
import type { User, RegisterRequest, LoginRequest, AuthSystem } from '../types/auth';

interface UseAuthReturn {
  // Estado
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  authSystem: AuthSystem;
  idToken: string | null;
  
  // Acciones
  login: (credentials: LoginRequest) => Promise<boolean>;
  register: (userData: RegisterRequest) => Promise<boolean>;
  logout: () => Promise<void>;
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
  const [idToken, setIdToken] = useState<string | null>(null);

  // Initialize Amplify Auth
  useEffect(() => {
    const initializeAuth = async () => {
      if (!import.meta.env.VITE_USER_POOL_ID || !import.meta.env.VITE_USER_POOL_CLIENT_ID) {
        console.error('Cognito configuration missing. Please check environment variables.');
        setError('Authentication configuration error');
        return;
      }

      // Initialize cognitoAuthService WITHOUT identity pool
      cognitoAuthService.initialize({
        userPoolId: import.meta.env.VITE_USER_POOL_ID,
        userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
        identityPoolId: '', // Empty string instead of undefined to avoid IAM issues
        region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
      });

      setUser(cognitoAuthService.getCurrentUser());
      setIdToken(localStorage.getItem('cognito_id_token'));
      
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
      // First try Amplify Auth to establish proper session
      console.log('🔑 Attempting Amplify Auth login...');
      
      try {
        const signInResult = await signIn({
          username: credentials.email.toLowerCase(),
          password: credentials.password
        });
        
        console.log('✅ Amplify Auth login successful');
        
        // Get the authenticated user from Amplify
        const amplifyUser = await getCurrentUser();
        console.log('👤 Amplify user:', amplifyUser);
        
        // Create our User object from Amplify user attributes
        const userData: User = {
          userId: amplifyUser.userId,
          email: credentials.email.toLowerCase(),
          fullName: credentials.email.split('@')[0], // Use email prefix as name
          role: credentials.email.includes('admin') ? 'admin' : 'postulante', // Simple role detection
          createdAt: new Date().toISOString(),
          isActive: true,
          emailVerified: true
        };
        
        setUser(userData);
        cognitoAuthService.setUserData(userData);
        
        // Get session and store token
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();
        setIdToken(idToken || null);
        if (idToken) {
          localStorage.setItem('cognito_id_token', idToken);
        }
        
        return true;
        
      } catch (amplifyError) {
        console.warn('❌ Amplify Auth failed, falling back to custom Cognito service:', amplifyError);
        
        // Fallback to custom Cognito service
        const result = await cognitoAuthService.login(credentials);
        
        if (result.success && result.data?.user) {
          setUser(result.data.user);
          cognitoAuthService.setUserData(result.data.user);
          setIdToken(result.data.idToken || null);
          return true;
        } else {
          setError(result.message || 'Login failed');
          return false;
        }
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

  const logout = useCallback(async () => {
    try {
      // Sign out from Amplify first
      await signOut();
      console.log('✅ Amplify signout successful');
    } catch (error) {
      console.warn('❌ Amplify signout failed:', error);
    }
    
    // Also cleanup our custom service
    cognitoAuthService.logout();
    setUser(null);
    setError(null);
    setIdToken(null);
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
    idToken,
    login,
    register,
    logout,
    clearError,
    confirmRegistration,
    forgotPassword,
    confirmPassword,
  };
};