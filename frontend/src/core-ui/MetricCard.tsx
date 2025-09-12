import type { ReactNode } from 'react';
import { Container } from './Container';
import { Typography } from './Typography';
import { Icon } from './Icon';

interface MetricCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly iconName?: string;
  readonly colorScheme: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'gray';
  readonly className?: string;
}

const COLOR_SCHEMES = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  purple: 'bg-purple-100 text-purple-600',
  red: 'bg-red-100 text-red-600',
  gray: 'bg-gray-100 text-gray-600'
} as const;

export function MetricCard({
  title,
  value,
  iconName,
  colorScheme,
  className = ''
}: MetricCardProps): ReactNode {
  const colorClasses = COLOR_SCHEMES[colorScheme];

  return (
    <Container variant="surface" className={className}>
      <div className="flex items-start gap-4">
        {iconName && (
          <div className={`p-3 rounded-lg ${colorClasses} flex-shrink-0`}>
            <Icon name={iconName} size="lg" />
          </div>
        )}
        <div className="flex-1 min-w-0 pt-1">
          <Typography variant="label" color="muted" className="block leading-tight mb-2">{title}</Typography>
          <Typography 
            variant={typeof value === 'string' && (value === 'Sin datos' || value === '-' || value === '...') ? 'caption' : 'value'} 
            color={typeof value === 'string' && (value === 'Sin datos' || value === '-') ? 'muted' : undefined}
            className="block"
          >
            {value}
          </Typography>
        </div>
      </div>
    </Container>
  );
}

export type { MetricCardProps };