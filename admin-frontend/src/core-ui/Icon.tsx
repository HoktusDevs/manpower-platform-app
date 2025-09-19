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

// Placeholder icon while we wait for Figma assets
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
  
  // TODO: Replace with actual icon loading logic when Figma assets are ready
  // This could be:
  // 1. Dynamic imports: await import(`../assets/icons/${name}.svg`)
  // 2. Icon font: <i className={`icon-${name}`} />
  // 3. SVG sprite: <use href={`#icon-${name}`} />
  // 4. Component mapping: ICON_COMPONENTS[name]
  
  // For now, show placeholder to indicate where icons will be
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