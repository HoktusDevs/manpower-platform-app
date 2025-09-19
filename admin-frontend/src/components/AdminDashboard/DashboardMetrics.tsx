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
        value="Sin datos"
        colorScheme="blue"
      />

      <MetricCard
        title="Postulaciones Aprobadas"
        value="Sin datos"
        colorScheme="green"
      />

      <MetricCard
        title="Pendientes"
        value="Sin datos"
        colorScheme="yellow"
      />

      <MetricCard
        title="Postulaciones Activas"
        value="Sin datos"
        colorScheme="purple"
      />
    </Grid>
  );
}

export default DashboardMetrics;