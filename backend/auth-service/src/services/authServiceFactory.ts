import { CognitoService } from './cognitoService';

export type AuthServiceInterface = CognitoService;

export class AuthServiceFactory {
  static create(): AuthServiceInterface {
    const isLocal = process.env.STAGE === 'local';

    if (isLocal) {
      console.log('🧪 Local development detected, but using AWS Cognito Service for consistency');
      return new CognitoService();
    } else {
      console.log('☁️ Creating AWS Cognito Service for production');
      return new CognitoService();
    }
  }
}