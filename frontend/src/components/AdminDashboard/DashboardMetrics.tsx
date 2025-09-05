import type { ReactNode } from 'react';
import { MetricCard, Grid } from '../../core-ui';

export function DashboardMetrics(): ReactNode {
  return (
    <Grid 
      cols="1" 
      colsMd="2" 
      colsLg="4" 
      gap="lg" 
      className="mb-8"
    >
      <MetricCard
        title="Total Postulantes"
        value="-"
        colorScheme="blue"
        iconName="users"
      />

      <MetricCard
        title="Postulaciones aprobadas"
        value="-"
        colorScheme="green"
        iconName="check-circle"
      />

      <MetricCard
        title="Pendientes"
        value="-"
        colorScheme="yellow"
        iconName="clock"
      />

      <MetricCard
        title="Postulaciones activas"
        value="-"
        colorScheme="purple"
        iconName="chart-bar"
      />
    </Grid>
  );
}

export default DashboardMetrics;