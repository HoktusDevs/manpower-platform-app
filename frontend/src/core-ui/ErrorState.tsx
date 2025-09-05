import type { ReactNode } from 'react';
import { Container } from './Container';
import { Typography } from './Typography';
import { Button } from './Button';
import { Icon } from './Icon';
import { Flex } from './Flex';

interface ErrorStateProps {
  readonly title?: string;
  readonly message?: string;
  readonly iconName?: string;
  readonly retryLabel?: string;
  readonly onRetry?: () => void;
  readonly secondaryLabel?: string;
  readonly onSecondary?: () => void;
  readonly showContainer?: boolean;
  readonly containerVariant?: 'default' | 'surface' | 'elevated' | 'error';
  readonly className?: string;
}

export function ErrorState({
  title = 'Error',
  message = 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.',
  iconName = 'alert-circle',
  retryLabel = 'Reintentar',
  onRetry,
  secondaryLabel,
  onSecondary,
  showContainer = true,
  containerVariant = 'error',
  className = ''
}: ErrorStateProps): ReactNode {
  const content = (
    <Flex direction="col" align="center" gap="md" className={className}>
      <div className="p-4 bg-red-100 rounded-full">
        <Icon name={iconName} size="xl" color="#dc2626" />
      </div>
      <div className="text-center space-y-2">
        <Typography variant="h4" color="error">
          {title}
        </Typography>
        <Typography variant="body" color="muted">
          {message}
        </Typography>
      </div>
      <Flex gap="sm" className="flex-wrap justify-center">
        {onRetry && (
          <Button variant="danger" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
        {secondaryLabel && onSecondary && (
          <Button variant="secondary" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </Flex>
    </Flex>
  );

  if (showContainer) {
    return (
      <Container variant={containerVariant} className="flex justify-center items-center min-h-64 py-12">
        {content}
      </Container>
    );
  }

  return content;
}

export type { ErrorStateProps };