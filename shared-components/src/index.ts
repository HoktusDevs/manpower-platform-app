/**
 * Shared Components Library
 * Cross-frontend authentication and utility components
 */

// Services
export { tokenService, TokenService } from './services/tokenService';
export type { User, TokenData } from './services/tokenService';

// Hooks
export { useHttpClient } from './hooks/useHttpClient';
export type { HttpClientConfig, RequestOptions } from './hooks/useHttpClient';

// Components
export { ProtectedRoute } from './components/ProtectedRoute';