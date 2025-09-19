import React, { useEffect, useState, type ReactNode } from 'react';
import { authRepository } from '../services/authFactory';
import { AuthContext } from './AuthContext';
import type {
  User,
  AuthContextType,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ConfirmSignUpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from '../types/auth';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const currentUser = await authRepository.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (request: LoginRequest): Promise<AuthResponse> => {
    const response = await authRepository.login(request);
    if (response.success && response.user) {
      setUser(response.user);
    }
    return response;
  };

  const register = async (request: RegisterRequest): Promise<AuthResponse> => {
    return await authRepository.register(request);
  };

  const logout = async () => {
    await authRepository.logout();
    setUser(null);
  };

  const confirmSignUp = async (request: ConfirmSignUpRequest): Promise<AuthResponse> => {
    return await authRepository.confirmSignUp(request);
  };

  const forgotPassword = async (request: ForgotPasswordRequest): Promise<AuthResponse> => {
    return await authRepository.forgotPassword(request);
  };

  const resetPassword = async (request: ResetPasswordRequest): Promise<AuthResponse> => {
    return await authRepository.resetPassword(request);
  };

  const changePassword = async (request: ChangePasswordRequest): Promise<AuthResponse> => {
    return await authRepository.changePassword(request);
  };

  const refreshToken = async (): Promise<boolean> => {
    return await authRepository.refreshToken();
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    confirmSignUp,
    forgotPassword,
    resetPassword,
    changePassword,
    refreshToken,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};