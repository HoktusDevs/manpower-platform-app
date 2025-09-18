import { CognitoService } from './cognitoService';
import { MockCognitoService } from './mockCognitoService';

export type AuthServiceInterface = CognitoService | MockCognitoService;

export class AuthServiceFactory {
  static create(): AuthServiceInterface {
    const isLocal = process.env.STAGE === 'local';

    if (isLocal) {
      console.log('🧪 Creating Mock Cognito Service for local development');
      return new MockCognitoService();
    } else {
      console.log('☁️ Creating AWS Cognito Service for production');
      return new CognitoService();
    }
  }
}