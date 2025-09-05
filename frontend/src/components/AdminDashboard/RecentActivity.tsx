import { useState } from 'react';
import type { ReactNode } from 'react';
import { CustomSelect, Container, Typography, EmptyState, Flex } from '../../core-ui';
import type { SelectOption } from '../../core-ui';

type ActivityFilter = 'all' | 'postulaciones' | 'usuarios' | 'sistema';

const ACTIVITY_FILTER_OPTIONS: readonly SelectOption<ActivityFilter>[] = [
  { value: 'all', label: 'Todas', description: 'Ver toda la actividad reciente' },
  { value: 'postulaciones', label: 'Postulaciones', description: 'Solo actividad de postulaciones' },
  { value: 'usuarios', label: 'Usuarios', description: 'Solo actividad de usuarios' },
  { value: 'sistema', label: 'Sistema', description: 'Solo actividad del sistema' }
] as const;

export function RecentActivity(): ReactNode {
  const [selectedActivityFilter, setSelectedActivityFilter] = useState<ActivityFilter>('all');

  const handleActivityFilterChange = (newFilter: ActivityFilter): void => {
    setSelectedActivityFilter(newFilter);
  };

  return (
    <Container variant="surface" padding="none">
      <div className="p-6 border-b">
        <Flex align="center" justify="between">
          <Typography variant="h4">Actividad Reciente</Typography>
          
          <CustomSelect
            value={selectedActivityFilter}
            options={ACTIVITY_FILTER_OPTIONS}
            onChange={handleActivityFilterChange}
          />
        </Flex>
      </div>
      <EmptyState
        title="Sin actividad reciente"
        message="No hay actividad reciente para mostrar en este momento."
        iconName="activity"
        showContainer={false}
        className="py-8"
      />
    </Container>
  );
}

export default RecentActivity;