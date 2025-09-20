import { useState, useCallback, useEffect } from 'react';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { cognitoAuthService } from '../services/cognitoAuthService';
import type { User, RegisterRequest, LoginRequest, AuthSystem } from '../types/auth';

interface UseAuthReturn {
  // Estado
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
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
      // Configuration is now handled by aws-config.ts, no need to check env vars

      try {
        // Initialize cognitoAuthService with deployed AWS configuration
        cognitoAuthService.initialize();

        // Check existing tokens
        const idToken = localStorage.getItem('cognito_id_token');
        const accessToken = localStorage.getItem('cognito_access_token');

        console.log('🔍 Auth tokens check:', {
          hasIdToken: !!idToken,
          hasAccessToken: !!accessToken
        });

        if (idToken || accessToken) {
          // Get user from localStorage (saved during sessionExchange)
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            try {
              const user = JSON.parse(savedUser);
              setUser(user);
              setIdToken(idToken);
              console.log('✅ User loaded from localStorage:', user.email);
            } catch (error) {
              console.error('Error parsing saved user:', error);
            }
          }
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing auth:', error);
        setIsInitialized(true);
      }
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
      try {
        await signIn({
          username: credentials.email.toLowerCase(),
          password: credentials.password
        });
        
        // Get the authenticated user from Amplify
        const amplifyUser = await getCurrentUser();
        
        // Get session and extract role from ID token
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken;
        
        // Get role from ID token claims
        let userRole: 'admin' | 'postulante' = 'postulante';
        if (idToken) {
          const claims = idToken.payload as Record<string, unknown>;
          userRole = (claims['custom:role'] as 'admin' | 'postulante') || 'postulante';
        }
        
        // Create our User object from Amplify user attributes
        const userData: User = {
          userId: amplifyUser.userId,
          email: credentials.email.toLowerCase(),
          fullName: credentials.email.split('@')[0], // Use email prefix as name
          role: userRole,
          createdAt: new Date().toISOString(),
          isActive: true,
          emailVerified: true
        };
        
        setUser(userData);
        cognitoAuthService.setUserData(userData);
        
        // Store both tokens
        const idTokenString = idToken?.toString();
        const accessTokenString = session.tokens?.accessToken?.toString();
        
        setIdToken(idTokenString || null);
        if (idTokenString) {
          localStorage.setItem('cognito_id_token', idTokenString);
        }
        if (accessTokenString) {
          localStorage.setItem('cognito_access_token', accessTokenString);
        }
        
        return true;
        
      } catch (amplifyError: unknown) {
        // Check if user is already authenticated
        if ((amplifyError as Error)?.name === 'UserAlreadyAuthenticatedException') {
          
          // Get the current authenticated user and session
          const amplifyUser = await getCurrentUser();
          const session = await fetchAuthSession();
          const idToken = session.tokens?.idToken;
          
          // Get role from ID token claims
          let userRole: 'admin' | 'postulante' = 'postulante';
          if (idToken) {
            const claims = idToken.payload as Record<string, unknown>;
            userRole = (claims['custom:role'] as 'admin' | 'postulante') || 'postulante';
          }
          
          const userData: User = {
            userId: amplifyUser.userId,
            email: credentials.email.toLowerCase(),
            fullName: credentials.email.split('@')[0],
            role: userRole,
            createdAt: new Date().toISOString(),
            isActive: true,
            emailVerified: true
          };
          
          setUser(userData);
          cognitoAuthService.setUserData(userData);
          
          // Store both tokens
          const idTokenString = idToken?.toString();
          const accessTokenString = session.tokens?.accessToken?.toString();
          
          setIdToken(idTokenString || null);
          if (idTokenString) {
            localStorage.setItem('cognito_id_token', idTokenString);
          }
          if (accessTokenString) {
            localStorage.setItem('cognito_access_token', accessTokenString);
          }
          
          return true;
        }
        
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
        // After successful registration, attempt auto-login if possible
        // This prevents the redirect loop by ensuring user is fully authenticated
        try {
          const loginResult = await cognitoAuthService.login({
            email: userData.email,
            password: userData.password
          });
          
          if (loginResult.success && loginResult.data?.user) {
            setUser(loginResult.data.user);
            cognitoAuthService.setUserData(loginResult.data.user);
            setIdToken(loginResult.data.idToken || null);
            return true;
          }
        } catch (loginError) {
          console.warn('Auto-login after registration failed:', loginError);
        }
        
        // Fallback: Set user without full authentication (will need to login)
        if (result.data?.user) {
          // Don't set user state immediately - this prevents redirect loops
          // User will need to manually login
          console.log('Registration successful, please login');
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
    
    // Clear everything immediately
    setUser(null);
    setError(null);
    setIdToken(null);
    
    // Clear localStorage
    localStorage.removeItem('cognito_access_token');
    localStorage.removeItem('cognito_id_token');
    localStorage.removeItem('cognito_refresh_token');
    localStorage.removeItem('cognito_user');
    
    // Try Amplify signout but don't wait for it
    signOut().catch(() => {});
    
    // Also cleanup our custom service
    cognitoAuthService.logout();
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
    isAuthenticated: !!user,
    isInitialized,
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