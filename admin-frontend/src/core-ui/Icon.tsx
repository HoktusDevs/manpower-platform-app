import type { ReactNode } from 'react';

interface IconProps {
  readonly name: string;
  readonly size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  readonly color?: string;
  readonly className?: string;
}

const SIZE_STYLES = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8'
} as const;

// SVG Icon Components using Heroicons
const ICON_COMPONENTS: Record<string, (props: { className?: string; color?: string }) => ReactNode> = {
  'check-circle': ({ className, color }) => (
    <svg className={className} style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'alert-circle': ({ className, color }) => (
    <svg className={className} style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'alert-triangle': ({ className, color }) => (
    <svg className={className} style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  'info': ({ className, color }) => (
    <svg className={className} style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'loader': ({ className, color }) => (
    <svg className={className} style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  'x': ({ className, color }) => (
    <svg className={className} style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
};

// Placeholder icon for unimplemented icons
const PlaceholderIcon = ({ size, color, className, iconName }: { size: string; color?: string; className?: string; iconName?: string }) => (
  <div
    className={`${size} ${className} rounded border-2 border-dashed border-gray-300 flex items-center justify-center`}
    style={{ color }}
    title={iconName ? `Icon: ${iconName}` : 'Icon placeholder'}
  >
    <span className="text-xs text-gray-400">?</span>
  </div>
);

export function Icon({
  name,
  size = 'md',
  color,
  className = ''
}: IconProps): ReactNode {
  const sizeClasses = SIZE_STYLES[size];
  const IconComponent = ICON_COMPONENTS[name];

  if (IconComponent) {
    return <IconComponent className={`${sizeClasses} ${className}`} color={color} />;
  }

  // Fallback to placeholder for unimplemented icons
  return (
    <PlaceholderIcon
      size={sizeClasses}
      color={color}
      className={className}
      iconName={name}
    />
  );
}

export type { IconProps };