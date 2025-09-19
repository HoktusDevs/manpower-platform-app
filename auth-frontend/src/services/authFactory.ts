import type { AuthRepository } from '../types/repositories';
import { cognitoAuthRepository } from './cognitoAuthService';
import { httpAuthRepository } from './httpAuthService';

type AuthProvider = 'cognito' | 'http';

export class AuthRepositoryFactory {
  static create(provider: AuthProvider): AuthRepository {
    switch (provider) {
      case 'cognito':
        return cognitoAuthRepository;
      case 'http':
        return httpAuthRepository;
      default:
        throw new Error(`Unknown auth provider: ${provider}`);
    }
  }
}

const AUTH_PROVIDER: AuthProvider = (process.env['VITE_AUTH_PROVIDER'] as AuthProvider) || 'http';

export const authRepository = AuthRepositoryFactory.create(AUTH_PROVIDER);