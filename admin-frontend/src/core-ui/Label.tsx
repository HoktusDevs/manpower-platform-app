import type { ReactNode, LabelHTMLAttributes } from 'react';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  readonly variant?: 'default' | 'required' | 'error';
  readonly size?: 'sm' | 'md' | 'lg';
  readonly children: ReactNode;
}

const LABEL_VARIANTS = {
  default: 'text-gray-700',
  required: 'text-gray-700 after:content-["*"] after:ml-0.5 after:text-red-500',
  error: 'text-red-700'
} as const;

const LABEL_SIZES = {
  sm: 'text-sm font-medium',
  md: 'text-base font-medium',
  lg: 'text-lg font-medium'
} as const;

export function Label({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  ...props
}: LabelProps): ReactNode {
  const labelClasses = [
    'block mb-1',
    LABEL_VARIANTS[variant],
    LABEL_SIZES[size],
    className
  ].filter(Boolean).join(' ');

  return (
    <label className={labelClasses} {...props}>
      {children}
    </label>
  );
}

export type { LabelProps };