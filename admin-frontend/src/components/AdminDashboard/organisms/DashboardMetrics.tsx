import { useState, useEffect, useCallback } from 'react';
import { MetricCard, Grid } from '../../../core-ui';
import { applicationsService, type DashboardStats } from '../../../services/applicationsService';

export function DashboardMetrics() {
  const [stats, setStats] = useState<DashboardStats>({
    totalApplicants: 0,
    approvedApplications: 0,
    pendingApplications: 0,
    activeApplications: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const dashboardStats = await applicationsService.getDashboardStats();
      setStats(dashboardStats);
    } catch {
      setError('Error al cargar las estadísticas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatValue = (value: number): string => {
    if (isLoading) return 'Cargando...';
    if (error) return 'Error';
    return value.toLocaleString();
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
        value={formatValue(stats.totalApplicants)}
        colorScheme="blue"
      />

      <MetricCard
        title="Postulaciones Aprobadas"
        value={formatValue(stats.approvedApplications)}
        colorScheme="green"
      />

      <MetricCard
        title="Pendientes"
        value={formatValue(stats.pendingApplications)}
        colorScheme="yellow"
      />

      <MetricCard
        title="Postulaciones Activas"
        value={formatValue(stats.activeApplications)}
        colorScheme="purple"
      />
    </Grid>
  );
}

export default DashboardMetrics;