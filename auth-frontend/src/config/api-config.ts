export const API_CONFIG = {
  AUTH_SERVICE_URL: 'https://j5ewdxkzwh.execute-api.us-east-1.amazonaws.com/dev',
  TIMEOUT: 30000,
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER_ADMIN: '/auth/register-admin',
    REGISTER_POSTULANTE: '/auth/register-employee',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    VERIFY_EMAIL: '/auth/verify-email',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
  },
} as const;