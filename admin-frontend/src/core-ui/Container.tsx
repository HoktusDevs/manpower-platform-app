import type { ReactNode, ElementType } from 'react';

interface ContainerProps {
  readonly children: ReactNode;
  readonly as?: ElementType;
  readonly variant?: 'default' | 'surface' | 'elevated' | 'outlined' | 'error' | 'warning' | 'success';
  readonly size?: 'sm' | 'md' | 'lg' | 'xl' | 'none';
  readonly padding?: 'sm' | 'md' | 'lg' | 'xl' | 'none';
  readonly className?: string;
}

const VARIANT_STYLES = {
  default: 'bg-white border border-gray-200 shadow-sm',
  surface: 'bg-white shadow-md',
  elevated: 'bg-white shadow-lg',
  outlined: 'bg-white border border-gray-300',
  error: 'bg-red-50 border border-red-200',
  warning: 'bg-yellow-50 border border-yellow-200',
  success: 'bg-green-50 border border-green-200'
} as const;

const SIZE_STYLES = {
  sm: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  none: ''
} as const;

const PADDING_STYLES = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
  none: ''
} as const;

export function Container({
  children,
  as: Component = 'div',
  variant = 'surface',
  size = 'lg',
  padding = 'md',
  className = ''
}: ContainerProps): ReactNode {
  const variantClasses = VARIANT_STYLES[variant];
  const sizeClasses = SIZE_STYLES[size];
  const paddingClasses = PADDING_STYLES[padding];
  
  const allClasses = `${variantClasses} ${sizeClasses} ${paddingClasses} ${className}`.trim();

  return (
    <Component className={allClasses}>
      {children}
    </Component>
  );
}

export type { ContainerProps };