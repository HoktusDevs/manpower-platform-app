import type { ReactNode } from 'react';
import { Container } from './Container';
import { Typography } from './Typography';
import { Flex } from './Flex';

interface LoadingProps {
  readonly size?: 'sm' | 'md' | 'lg';
  readonly text?: string;
  readonly showContainer?: boolean;
  readonly containerVariant?: 'default' | 'surface' | 'elevated';
  readonly className?: string;
}

const SPINNER_SIZES = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12'
} as const;

const TEXT_VARIANTS = {
  sm: 'caption' as const,
  md: 'body' as const,
  lg: 'h4' as const
};

export function Loading({
  size = 'md',
  text = 'Cargando...',
  showContainer = true,
  containerVariant = 'surface',
  className = ''
}: LoadingProps): ReactNode {
  const spinnerClasses = `${SPINNER_SIZES[size]} border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin`;

  const content = (
    <Flex direction="col" align="center" gap="sm" className={className}>
      <div className={spinnerClasses} />
      {text && (
        <Typography variant={TEXT_VARIANTS[size]} color="muted">
          {text}
        </Typography>
      )}
    </Flex>
  );

  if (showContainer) {
    return (
      <Container variant={containerVariant} className="flex justify-center items-center min-h-32">
        {content}
      </Container>
    );
  }

  return content;
}

export type { LoadingProps };