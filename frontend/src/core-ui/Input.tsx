import { forwardRef } from 'react';
import type { ReactNode, InputHTMLAttributes } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  readonly variant?: 'default' | 'error' | 'success';
  readonly size?: 'sm' | 'md' | 'lg';
  readonly fullWidth?: boolean;
  readonly leftIcon?: string;
  readonly rightIcon?: string;
  readonly error?: string;
  readonly helperText?: string;
}

const INPUT_VARIANTS = {
  default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
  error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
  success: 'border-green-300 focus:border-green-500 focus:ring-green-500'
} as const;

const INPUT_SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2 text-base',
  lg: 'px-4 py-3 text-lg'
} as const;

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  variant = 'default',
  size = 'md',
  fullWidth = false,
  error,
  helperText,
  className = '',
  disabled = false,
  ...props
}, ref): ReactNode => {
  const hasError = Boolean(error);
  const currentVariant = hasError ? 'error' : variant;

  const inputClasses = [
    'block rounded-md border-0 ring-1 ring-inset transition-colors',
    'placeholder:text-gray-400 focus:ring-2 focus:ring-inset',
    'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
    INPUT_VARIANTS[currentVariant],
    INPUT_SIZES[size],
    fullWidth ? 'w-full' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      <input
        ref={ref}
        className={inputClasses}
        disabled={disabled}
        {...props}
      />
      {(error || helperText) && (
        <p className={`mt-1 text-sm ${error ? 'text-red-600' : 'text-gray-600'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export type { InputProps };