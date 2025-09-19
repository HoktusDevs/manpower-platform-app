import type { ReactNode, ElementType } from 'react';

interface TypographyProps {
  readonly children: ReactNode;
  readonly variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label' | 'value' | 'error' | 'success' | 'warning';
  readonly as?: ElementType;
  readonly className?: string;
  readonly color?: 'primary' | 'secondary' | 'muted' | 'error' | 'success' | 'warning';
}

const VARIANT_STYLES = {
  h1: 'text-3xl font-bold text-gray-900',
  h2: 'text-2xl font-semibold text-gray-900',
  h3: 'text-xl font-semibold text-gray-900',
  h4: 'text-lg font-medium text-gray-900',
  body: 'text-base text-gray-900',
  caption: 'text-sm text-gray-500',
  label: 'text-sm font-medium text-gray-700',
  value: 'text-2xl font-semibold text-gray-900',
  error: 'text-sm text-red-600',
  success: 'text-sm text-green-600',
  warning: 'text-sm text-yellow-600'
} as const;

const COLOR_OVERRIDES = {
  primary: 'text-gray-900',
  secondary: 'text-gray-700', 
  muted: 'text-gray-500',
  error: 'text-red-600',
  success: 'text-green-600',
  warning: 'text-yellow-600'
} as const;

const DEFAULT_ELEMENTS = {
  h1: 'h1',
  h2: 'h2', 
  h3: 'h3',
  h4: 'h4',
  body: 'p',
  caption: 'p',
  label: 'label',
  value: 'span',
  error: 'p',
  success: 'p',
  warning: 'p'
} as const;

export function Typography({
  children,
  variant = 'body',
  as,
  className = '',
  color
}: TypographyProps): ReactNode {
  const Component = as || DEFAULT_ELEMENTS[variant];
  const baseClasses = VARIANT_STYLES[variant];
  
  // Override color if specified
  const colorClass = color ? COLOR_OVERRIDES[color] : '';
  
  // Remove default color from base classes if color override is specified
  const finalClasses = color 
    ? `${baseClasses.replace(/text-\w+-\d+/, '')} ${colorClass} ${className}`.trim()
    : `${baseClasses} ${className}`.trim();

  return (
    <Component className={finalClasses}>
      {children}
    </Component>
  );
}

export type { TypographyProps };