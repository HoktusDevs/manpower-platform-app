import { MetricCard, Grid } from '../../../core-ui';
import { useApplicationsData } from '../../../hooks/useApplicationsData';

export function DashboardMetrics() {
  const { dashboardStats, isLoading, error } = useApplicationsData();

  const formatValue = (value: number): string => {
    if (isLoading) return 'Cargando...';
    if (error) return 'Error';
    return value.toLocaleString();
  };

  // Usar valores por defecto si no hay stats aún
  const stats = dashboardStats || {
    totalApplicants: 2,
    approvedApplications: 0,
    pendingApplications: 0,
    activeApplications: 0,
  };

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
        value={formatValue(2)}
        colorScheme="blue"
      />

      <MetricCard
        title="Postulantes Aprobados"
        value={formatValue(stats.approvedApplications)}
        colorScheme="green"
      />

      <MetricCard
        title="Pendientes"
        value={formatValue(stats.pendingApplications)}
        colorScheme="yellow"
      />

      <MetricCard
        title="Documentos por Vencer"
        value={formatValue(stats.activeApplications)}
        colorScheme="purple"
      />
    </Grid>
  );
}

export default DashboardMetrics;