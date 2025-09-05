import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  readonly variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  readonly size?: 'sm' | 'md' | 'lg';
  readonly fullWidth?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
}

const VARIANT_STYLES = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
  secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  info: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
} as const;

const SIZE_STYLES = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-4 py-3 text-base'
} as const;

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  disabled = false,
  ...props
}: ButtonProps): ReactNode {
  const variantClasses = VARIANT_STYLES[variant];
  const sizeClasses = SIZE_STYLES[size];
  const widthClass = fullWidth ? 'w-full' : '';
  
  const baseClasses = `
    rounded-md font-semibold shadow-sm transition duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `.replace(/\s+/g, ' ').trim();

  const allClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${widthClass} ${className}`.trim();

  return (
    <button 
      className={allClasses}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export type { ButtonProps };