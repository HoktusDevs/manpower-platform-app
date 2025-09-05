import type { ReactNode } from 'react';
import { Container } from './Container';
import { Typography } from './Typography';
import { Button } from './Button';
import { Icon } from './Icon';
import { Flex } from './Flex';

interface EmptyStateProps {
  readonly title?: string;
  readonly message?: string;
  readonly iconName?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly showContainer?: boolean;
  readonly containerVariant?: 'default' | 'surface' | 'elevated';
  readonly className?: string;
}

export function EmptyState({
  title = 'Sin datos',
  message = 'No hay información disponible para mostrar.',
  iconName = 'inbox',
  actionLabel,
  onAction,
  showContainer = true,
  containerVariant = 'surface',
  className = ''
}: EmptyStateProps): ReactNode {
  const content = (
    <Flex direction="col" align="center" gap="md" className={className}>
      <div className="p-4 bg-gray-100 rounded-full">
        <Icon name={iconName} size="xl" color="#6b7280" />
      </div>
      <div className="text-center space-y-2">
        <Typography variant="h4" color="secondary">
          {title}
        </Typography>
        <Typography variant="body" color="muted">
          {message}
        </Typography>
      </div>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
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

export type { EmptyStateProps };