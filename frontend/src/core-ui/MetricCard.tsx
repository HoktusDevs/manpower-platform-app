import type { ReactNode } from 'react';
import { Container } from './Container';
import { Typography } from './Typography';
import { Icon } from './Icon';

interface MetricCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly iconName: string;
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
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${colorClasses} flex-shrink-0`}>
          <Icon name={iconName} size="lg" />
        </div>
        <div className="ml-4 flex-1 min-w-0">
          <Typography variant="label" color="muted" className="block leading-tight">{title}</Typography>
          <Typography variant="value" className="block mt-1">{value}</Typography>
        </div>
      </div>
    </Container>
  );
}

export type { MetricCardProps };