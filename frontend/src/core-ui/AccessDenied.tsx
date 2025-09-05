import type { ReactNode } from 'react';
import { Button } from './Button';
import { Container } from './Container';
import { Icon } from './Icon';
import { Typography } from './Typography';

interface AccessDeniedProps {
  readonly title?: string;
  readonly message?: string;
  readonly redirectLabel?: string;
  readonly onRedirect?: () => void;
  readonly iconName?: string;
}

export function AccessDenied({
  title = 'Acceso Denegado',
  message = 'No tienes permisos para acceder a esta página.',
  redirectLabel,
  onRedirect,
  iconName = 'alert-circle'
}: AccessDeniedProps): ReactNode {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Container 
        variant="error" 
        className="max-w-md w-full mx-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <Icon name={iconName} size="md" color="#dc2626" />
          <Typography variant="h4" color="error">{title}</Typography>
        </div>
        <Typography variant="error" className="mb-4">{message}</Typography>
        {redirectLabel && onRedirect && (
          <Button
            variant="danger"
            onClick={onRedirect}
          >
            {redirectLabel}
          </Button>
        )}
      </Container>
    </div>
  );
}

export type { AccessDeniedProps };