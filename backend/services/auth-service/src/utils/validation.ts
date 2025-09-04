/**
 * Validation utilities for Auth Service
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.toLowerCase());
}

// Password validation with auth-specific rules
export interface PasswordRules {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  specialChars?: string;
}

export function validatePassword(
  password: string,
  rules: PasswordRules = {}
): ValidationResult {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
    specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  } = rules;

  const errors: string[] = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (requireSpecialChars) {
    const specialCharsRegex = new RegExp(`[${specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
    if (!specialCharsRegex.test(password)) {
      errors.push(`Password must contain at least one special character (${specialChars})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Name validation
export function validateFullName(name: string): ValidationResult {
  const errors: string[] = [];
  const trimmedName = name?.trim();

  if (!trimmedName) {
    errors.push('Full name is required');
  } else if (trimmedName.length < 2) {
    errors.push('Full name must be at least 2 characters long');
  } else if (trimmedName.length > 100) {
    errors.push('Full name must be less than 100 characters');
  } else if (!/^[a-zA-ZÀ-ÿĀ-žА-я\s'-]+$/.test(trimmedName)) {
    errors.push('Full name contains invalid characters');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Role validation for auth service
export function validateRole(role: string): ValidationResult {
  const validRoles = ['admin', 'postulante', 'employee'];
  const errors: string[] = [];

  if (!validRoles.includes(role)) {
    errors.push(`Role must be one of: ${validRoles.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Generic required field validation
export function validateRequired<T>(
  obj: Record<string, T>,
  requiredFields: string[]
): ValidationResult {
  const errors: string[] = [];

  for (const field of requiredFields) {
    const value = obj[field];
    if (value === undefined || value === null || value === '') {
      errors.push(`${field} is required`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Combine multiple validation results
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(result => result.errors);
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

// Auth-specific: Validate registration request
export function validateRegistrationRequest(request: any): ValidationResult {
  const requiredValidation = validateRequired(request, ['email', 'password', 'fullName', 'role']);
  
  if (!requiredValidation.valid) {
    return requiredValidation;
  }

  const emailValidation = validateEmail(request.email) 
    ? { valid: true, errors: [] } 
    : { valid: false, errors: ['Invalid email format'] };

  const passwordValidation = validatePassword(request.password);
  const nameValidation = validateFullName(request.fullName);
  const roleValidation = validateRole(request.role);

  return combineValidationResults(
    requiredValidation,
    emailValidation,
    passwordValidation,
    nameValidation,
    roleValidation
  );
}

// Auth-specific: Validate login request
export function validateLoginRequest(request: any): ValidationResult {
  const requiredValidation = validateRequired(request, ['email', 'password']);
  
  if (!requiredValidation.valid) {
    return requiredValidation;
  }

  const emailValidation = validateEmail(request.email) 
    ? { valid: true, errors: [] } 
    : { valid: false, errors: ['Invalid email format'] };

  return combineValidationResults(requiredValidation, emailValidation);
}