import { useState, useEffect, useCallback, useRef } from 'react';
import { applicationsService, type DashboardStats, type ActivityData } from '../services/applicationsService';

interface ApplicationsCache {
  applications: any[] | null;
  lastFetch: number;
  isLoading: boolean;
}

interface UseApplicationsDataReturn {
  dashboardStats: DashboardStats | null;
  getActivityData: (filter: 'postulaciones' | 'usuarios' | 'sistema', granularity: 'daily' | 'weekly' | 'quarterly') => Promise<ActivityData[]>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Cache global compartido entre todas las instancias del hook
let globalCache: ApplicationsCache = {
  applications: null,
  lastFetch: 0,
  isLoading: false
};

// Array de callbacks para notificar cambios a todas las instancias activas
const subscribers: Set<() => void> = new Set();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Hook centralizado para manejar datos de applications
 * Evita llamados duplicados usando cache compartido
 */
export function useApplicationsData(): UseApplicationsDataReturn {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Función para notificar cambios a esta instancia
  const notifyUpdate = useCallback(() => {
    if (!mountedRef.current) return;

    setIsLoading(globalCache.isLoading);

    if (globalCache.applications) {
      // Generar stats desde el cache
      const stats = generateStatsFromApplications(globalCache.applications);
      setDashboardStats(stats);
      setError(null);
    }
  }, []);

  // Suscribirse a cambios del cache global
  useEffect(() => {
    mountedRef.current = true;
    subscribers.add(notifyUpdate);

    return () => {
      mountedRef.current = false;
      subscribers.delete(notifyUpdate);
    };
  }, [notifyUpdate]);

  // Función para fetch de datos (solo una instancia la ejecuta)
  const fetchApplications = useCallback(async (force = false): Promise<void> => {
    const now = Date.now();

    // Verificar si necesitamos hacer fetch
    if (!force && globalCache.applications && (now - globalCache.lastFetch) < CACHE_DURATION) {
      notifyUpdate();
      return;
    }

    // Evitar llamados paralelos
    if (globalCache.isLoading) {
      notifyUpdate();
      return;
    }

    try {
      globalCache.isLoading = true;
      notifySubscribers();

      console.log('🔄 Fetching applications data (useApplicationsData)');
      const response = await applicationsService.getAllApplications();

      if (response.success && response.applications) {
        globalCache.applications = response.applications;
        globalCache.lastFetch = now;
      } else {
        globalCache.applications = [];
      }

      globalCache.isLoading = false;
      notifySubscribers();

    } catch (fetchError) {
      console.error('❌ Error fetching applications:', fetchError);
      globalCache.isLoading = false;
      globalCache.applications = [];

      setError(fetchError instanceof Error ? fetchError.message : 'Error al cargar datos');
      notifySubscribers();
    }
  }, [notifyUpdate]);

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Función para obtener activity data desde el cache
  const getActivityData = useCallback(async (
    filter: 'postulaciones' | 'usuarios' | 'sistema',
    granularity: 'daily' | 'weekly' | 'quarterly'
  ): Promise<ActivityData[]> => {
    // Asegurar que tenemos datos frescos
    await fetchApplications();

    if (!globalCache.applications) {
      return [];
    }

    // Generar activity data desde el cache usando la lógica existente
    return generateActivityDataFromApplications(globalCache.applications, filter, granularity);
  }, [fetchApplications]);

  return {
    dashboardStats,
    getActivityData,
    isLoading,
    error,
    refetch: () => fetchApplications(true)
  };
}

// Función para notificar a todos los suscriptores
function notifySubscribers(): void {
  subscribers.forEach(callback => callback());
}

// Función para generar stats desde applications
function generateStatsFromApplications(applications: any[]): DashboardStats {
  const approvedApplications = applications.filter(app => app.status === 'ACCEPTED').length;
  const pendingApplications = applications.filter(app =>
    app.status === 'PENDING' || app.status === 'IN_REVIEW'
  ).length;

  const uniqueApplicants = new Set(applications.map(app => app.userId)).size;
  const activeApplications = applications.filter(app => app.status !== 'REJECTED').length;

  return {
    totalApplicants: uniqueApplicants,
    approvedApplications,
    pendingApplications,
    activeApplications,
  };
}

// Función para generar activity data desde applications (usando lógica del servicio)
function generateActivityDataFromApplications(
  applications: any[],
  filter: 'postulaciones' | 'usuarios' | 'sistema',
  granularity: 'daily' | 'weekly' | 'quarterly'
): ActivityData[] {
  // Reutilizar la lógica existente del servicio pero sin hacer fetch
  const now = new Date();
  const data: ActivityData[] = [];

  if (granularity === 'daily') {
    const daysOfWeek = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + mondayOffset + i);
      const dateString = date.toISOString().split('T')[0];

      const dayApplications = applications.filter(app => {
        const appDate = new Date(app.createdAt);
        const appDateString = appDate.toISOString().split('T')[0];
        return appDateString === dateString;
      });

      const count = dayApplications.length;

      data.push({
        date: dateString,
        count,
        type: filter,
        details: getActivityDetails(filter, count),
        period: daysOfWeek[i]
      });
    }
  }

  return data;
}

function getActivityDetails(filter: 'postulaciones' | 'usuarios' | 'sistema', count: number): string {
  switch (filter) {
    case 'postulaciones':
      return count === 0 ? 'No hay postulaciones en este período' : `${count} postulación${count !== 1 ? 'es' : ''} en este período`;
    case 'usuarios':
      return count === 0 ? 'No hay nuevos usuarios en este período' : `${count} usuario${count !== 1 ? 's' : ''} registrado${count !== 1 ? 's' : ''} en este período`;
    case 'sistema':
      return count === 0 ? 'No hay pendientes en este período' : `${count} pendiente${count !== 1 ? 's' : ''} en este período`;
    default:
      return `${count} elemento${count !== 1 ? 's' : ''} en este período`;
  }
}