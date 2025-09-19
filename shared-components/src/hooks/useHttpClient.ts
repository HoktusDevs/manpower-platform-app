/**
 * HTTP Client hook with automatic token management
 * Handles authentication headers and token refresh automatically
 */

import { useCallback, useRef } from 'react';
import { tokenService } from '../services/tokenService';

export interface HttpClientConfig {
  baseUrl?: string;
  authServiceUrl?: string;
  timeout?: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  skipRetry?: boolean;
}

export const useHttpClient = (config: HttpClientConfig = {}) => {
  const {
    baseUrl = '',
    authServiceUrl = 'https://7pptifb3zk.execute-api.us-east-1.amazonaws.com/dev',
    timeout = 30000
  } = config;

  const isRefreshingRef = useRef(false);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current && refreshPromiseRef.current) {
      return await refreshPromiseRef.current;
    }

    isRefreshingRef.current = true;
    refreshPromiseRef.current = tokenService.refreshAccessToken(authServiceUrl);

    try {
      const result = await refreshPromiseRef.current;
      return result;
    } finally {
      isRefreshingRef.current = false;
      refreshPromiseRef.current = null;
    }
  }, [authServiceUrl]);

  const makeRequest = useCallback(async <T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> => {
    const {
      method = 'GET',
      body,
      headers = {},
      requiresAuth = true,
      skipRetry = false
    } = options;

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };

    // Add auth header if required
    if (requiresAuth) {
      const authHeaders = tokenService.getAuthHeader();
      Object.assign(requestHeaders, authHeaders);
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : null,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && requiresAuth && !skipRetry) {
        const refreshSuccess = await refreshToken();

        if (refreshSuccess) {
          // Retry request with new token
          return makeRequest<T>(endpoint, { ...options, skipRetry: true });
        } else {
          // Refresh failed, redirect to login
          tokenService.logout();
          throw new Error('Authentication failed. Please login again.');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }, [baseUrl, authServiceUrl, timeout, refreshToken]);

  const get = useCallback(<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}) => {
    return makeRequest<T>(endpoint, { ...options, method: 'GET' });
  }, [makeRequest]);

  const post = useCallback(<T>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}) => {
    return makeRequest<T>(endpoint, { ...options, method: 'POST', body });
  }, [makeRequest]);

  const put = useCallback(<T>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}) => {
    return makeRequest<T>(endpoint, { ...options, method: 'PUT', body });
  }, [makeRequest]);

  const del = useCallback(<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}) => {
    return makeRequest<T>(endpoint, { ...options, method: 'DELETE' });
  }, [makeRequest]);

  const patch = useCallback(<T>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}) => {
    return makeRequest<T>(endpoint, { ...options, method: 'PATCH', body });
  }, [makeRequest]);

  return {
    request: makeRequest,
    get,
    post,
    put,
    delete: del,
    patch,
    refreshToken
  };
};