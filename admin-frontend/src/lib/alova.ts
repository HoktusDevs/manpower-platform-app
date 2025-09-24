/**
 * Alova Configuration
 * Centralized HTTP client configuration using Alova
 */

import { createAlova } from 'alova';
import ReactHook from 'alova/react';
import fetchAdapter from 'alova/fetch';
import { API_CONFIG } from '../config/api.config';

/**
 * Alova instance for Folders Service
 * No authentication required for now
 */
export const foldersAlova = createAlova({
  baseURL: API_CONFIG.folders.baseUrl,
  statesHook: ReactHook,
  requestAdapter: fetchAdapter(),
  timeout: 30000,

  beforeRequest: (method) => {
    // Get access token from localStorage
    const accessToken = localStorage.getItem('cognito_access_token');
    
    // Add common headers
    method.config.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      ...method.config.headers,
    };
  },

  responded: {
    onSuccess: async (response: Response) => {
      // Handle successful responses
      if (response.status >= 200 && response.status < 300) {
        const data = await response.json();
        return data;
      }
      throw new Error(`Request failed with status ${response.status}`);
    },

    onError: (error: Error) => {
      // Log errors in development
      if (import.meta.env.VITE_ENABLE_DEBUG === 'true') {
        }
      throw error;
    }
  }
});