import { useMutation } from '@tanstack/react-query';
import { authRepository } from '../services/authFactory';
import type {
  LoginRequest,
  RegisterRequest,
  ConfirmSignUpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from '../types/auth';

export const useLoginMutation = () => {
  return useMutation({
    mutationFn: (request: LoginRequest) => authRepository.login(request),
  });
};

export const useRegisterMutation = () => {
  return useMutation({
    mutationFn: (request: RegisterRequest) => authRepository.register(request),
  });
};

export const useConfirmSignUpMutation = () => {
  return useMutation({
    mutationFn: (request: ConfirmSignUpRequest) => authRepository.confirmSignUp(request),
  });
};

export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: (request: ForgotPasswordRequest) => authRepository.forgotPassword(request),
  });
};

export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: (request: ResetPasswordRequest) => authRepository.resetPassword(request),
  });
};

export const useChangePasswordMutation = () => {
  return useMutation({
    mutationFn: (request: ChangePasswordRequest) => authRepository.changePassword(request),
  });
};

export const useLogoutMutation = () => {
  return useMutation({
    mutationFn: () => authRepository.logout(),
  });
};