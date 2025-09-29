import type { ReactNode } from 'react';
import { Button, Container, Typography } from '../../../core-ui';

export function QuickActions(): ReactNode {
  return (
    <Container variant="surface" padding="none">
      <div className="p-6 border-b">
        <Typography variant="h4">Acciones Rápidas</Typography>
      </div>
      <div className="p-6 space-y-4">
        <Button variant="info" size="lg" fullWidth>
          Crear Nuevo Formulario
        </Button>
        <Button variant="success" size="lg" fullWidth>
          Gestionar Postulaciones
        </Button>
        <Button variant="primary" size="lg" fullWidth>
          Ver Reportes
        </Button>
        <Button variant="secondary" size="lg" fullWidth>
          Administrar Usuarios
        </Button>
      </div>
    </Container>
  );
}

export default QuickActions;