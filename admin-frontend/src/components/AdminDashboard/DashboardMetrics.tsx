import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { MetricCard, Grid } from '../../core-ui';
import { applicationsService, type DashboardStats } from '../../services/applicationsService';

export function DashboardMetrics(): ReactNode {
  const [stats, setStats] = useState<DashboardStats>({
    totalApplicants: 0,
    approvedApplications: 0,
    pendingApplications: 0,
    activeApplications: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const dashboardStats = await applicationsService.getDashboardStats();
        setStats(dashboardStats);
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
        setError('Error al cargar las estadísticas');
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  const formatValue = (value: number): string => {
    if (isLoading) return 'Cargando...';
    if (error) return 'Error';
    return value.toString();
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
        isLoading={isLoading}
      />

      <MetricCard
        title="Postulaciones Aprobadas"
        value={formatValue(stats.approvedApplications)}
        colorScheme="green"
        isLoading={isLoading}
      />

      <MetricCard
        title="Pendientes"
        value={formatValue(stats.pendingApplications)}
        colorScheme="yellow"
        isLoading={isLoading}
      />

      <MetricCard
        title="Postulaciones Activas"
        value={formatValue(stats.activeApplications)}
        colorScheme="purple"
        isLoading={isLoading}
      />
    </Grid>
  );
}

export default DashboardMetrics;