import { API_CONFIG } from '../config/api.config';

export interface Application {
  applicationId: string;
  userId: string;
  jobId: string;
  status: 'PENDING' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED';
  description?: string;
  createdAt: string;
  updatedAt: string;
  documents?: string[];
  // Campos enriquecidos del job
  jobTitle?: string;
  companyName?: string;
  location?: string;
  title?: string;
  salary?: string;
  employmentType?: string;
  experienceLevel?: string;
  requirements?: string;
  folderId?: string;
  isActive?: boolean;
}

export interface ApplicationsResponse {
  success: boolean;
  message: string;
  applications?: Application[];
  nextToken?: string;
}

export interface DashboardStats {
  totalApplicants: number;
  approvedApplications: number;
  pendingApplications: number;
  activeApplications: number;
}

export interface ActivityData {
  date: string;
  count: number;
  type: 'postulaciones' | 'usuarios' | 'sistema';
  details: string;
  period: string;
}

class ApplicationsService {
  private readonly baseUrl = API_CONFIG.applications.baseUrl;
  private readonly timeout = 30000;

  private async makeRequest<T>(
    endpoint: string,
    options: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: object;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : null,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`HTTP request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getAllApplications(limit?: number, nextToken?: string): Promise<ApplicationsResponse> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (nextToken) params.append('nextToken', nextToken);

    const endpoint = `${API_CONFIG.applications.endpoints.base}${params.toString() ? `?${params.toString()}` : ''}`;
    
    return this.makeRequest<ApplicationsResponse>(endpoint, {
      method: 'GET',
    });
  }

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await this.getAllApplications();
      
      if (!response.success || !response.applications) {
        return {
          totalApplicants: 0,
          approvedApplications: 0,
          pendingApplications: 0,
          activeApplications: 0,
        };
      }

      const applications = response.applications;
      
      // Contar aplicaciones por estado
      const approvedApplications = applications.filter(app => app.status === 'ACCEPTED').length;
      const pendingApplications = applications.filter(app => 
        app.status === 'PENDING' || app.status === 'IN_REVIEW'
      ).length;
      
      // Total de postulantes únicos
      const uniqueApplicants = new Set(applications.map(app => app.userId)).size;
      
      // Aplicaciones activas (todas excepto rechazadas)
      const activeApplications = applications.filter(app => app.status !== 'REJECTED').length;

      return {
        totalApplicants: uniqueApplicants,
        approvedApplications,
        pendingApplications,
        activeApplications,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        totalApplicants: 0,
        approvedApplications: 0,
        pendingApplications: 0,
        activeApplications: 0,
      };
    }
  }

  async getActivityData(
    filter: 'postulaciones' | 'usuarios' | 'sistema',
    granularity: 'daily' | 'weekly' | 'quarterly'
  ): Promise<ActivityData[]> {
    try {
      const response = await this.getAllApplications();
      
      if (!response.success || !response.applications) {
        return this.generateEmptyData(filter, granularity);
      }

      const applications = response.applications;
      
      // Para vista diaria, siempre generar los 7 días completos
      if (granularity === 'daily') {
        return this.generateCompleteWeekData(applications, filter);
      }
      
      // Para vista semanal, siempre generar las 4 semanas completas
      if (granularity === 'weekly') {
        return this.generateCompleteWeeksData(applications, filter);
      }
      
      // Para vista cuatrimestral, siempre generar los 4 cuatrimestres completos
      if (granularity === 'quarterly') {
        return this.generateCompleteQuartersData(applications, filter);
      }
      
      // Agrupar por período según granularidad
      const groupedData = this.groupApplicationsByPeriod(applications, granularity);
      
      // Convertir a formato ActivityData
      return groupedData.map(group => ({
        date: group.period,
        count: group.count,
        type: filter,
        details: this.getActivityDetails(filter, group.count),
        period: group.periodLabel,
      }));
    } catch (error) {
      console.error('Error getting activity data:', error);
      return this.generateEmptyData(filter, granularity);
    }
  }

  private groupApplicationsByPeriod(
    applications: Application[],
    granularity: 'daily' | 'weekly' | 'quarterly'
  ): Array<{ period: string; count: number; periodLabel: string }> {
    const now = new Date();
    const groups: { [key: string]: { count: number; periodLabel: string } } = {};

    applications.forEach(app => {
      const appDate = new Date(app.createdAt);
      let periodKey: string;
      let periodLabel: string;

      switch (granularity) {
        case 'daily': {
          // Últimos 7 días
          const dayDiff = Math.floor((now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24));
          if (dayDiff >= 0 && dayDiff < 7) {
            periodKey = appDate.toISOString().split('T')[0];
            periodLabel = appDate.toLocaleDateString('es-ES', { weekday: 'short' });
          }
          break;
        }
        case 'weekly': {
          // Últimas 4 semanas
          const weekStart = new Date(appDate);
          weekStart.setDate(appDate.getDate() - appDate.getDay() + 1); // Lunes
          const weekDiff = Math.floor((now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
          if (weekDiff >= 0 && weekDiff < 4) {
            periodKey = weekStart.toISOString().split('T')[0];
            periodLabel = `S${weekDiff + 1}`;
          }
          break;
        }
        case 'quarterly': {
          // Últimos 4 cuatrimestres
          const quarter = Math.floor(appDate.getMonth() / 3);
          const year = appDate.getFullYear();
          const yearDiff = now.getFullYear() - year;
          const quarterDiff = (now.getMonth() - quarter * 3) / 3 + yearDiff * 4;
          
          if (quarterDiff >= 0 && quarterDiff < 4) {
            periodKey = `${year}-Q${quarter + 1}`;
            periodLabel = `Q${quarter + 1}`;
          }
          break;
        }
      }

      if (periodKey) {
        if (!groups[periodKey]) {
          groups[periodKey] = { count: 0, periodLabel };
        }
        groups[periodKey].count++;
      }
    });

    return Object.entries(groups).map(([period, data]) => ({
      period,
      count: data.count,
      periodLabel: data.periodLabel,
    }));
  }

  private generateCompleteWeekData(
    applications: Application[],
    filter: 'postulaciones' | 'usuarios' | 'sistema'
  ): ActivityData[] {
    const now = new Date();
    const data: ActivityData[] = [];
    
    console.log('🔍 DEBUG: Today is', {
      now: now.toISOString(),
      dateString: now.toISOString().split('T')[0],
      dayOfWeek: now.getDay(),
      dayName: now.toLocaleDateString('es-ES', { weekday: 'long' })
    });
    
    // Generar la semana actual (lunes a domingo)
    // Calcular el lunes de esta semana
    const currentDay = now.getDay(); // 0 = domingo, 1 = lunes, etc.
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Si es domingo, retroceder 6 días; si no, calcular días hasta el lunes
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + mondayOffset + i); // Empezar desde el lunes de esta semana
      const dateString = date.toISOString().split('T')[0];
      
      console.log('🔍 DEBUG: Processing day', {
        i,
        dateString,
        dayName: date.toLocaleDateString('es-ES', { weekday: 'short' })
      });
      
      // Contar aplicaciones para este día
      const dayApplications = applications.filter(app => {
        const appDate = new Date(app.createdAt);
        const appDateString = appDate.toISOString().split('T')[0];
        const matches = appDateString === dateString;
        
        if (matches) {
          console.log('🔍 DEBUG: Found match!', {
            appId: app.applicationId,
            appDate: app.createdAt,
            appDateString,
            targetDate: dateString
          });
        }
        
        return matches;
      });
      
      const count = dayApplications.length;
      
      console.log('🔍 DEBUG: Day result', {
        dateString,
        count,
        dayName: date.toLocaleDateString('es-ES', { weekday: 'short' })
      });
      
      data.push({
        date: dateString,
        count,
        type: filter,
        details: this.getActivityDetails(filter, count),
        period: date.toLocaleDateString('es-ES', { weekday: 'short' })
      });
    }
    
    console.log('🔍 DEBUG: Final week data', data);
    return data;
  }

  private generateCompleteWeeksData(
    applications: Application[],
    filter: 'postulaciones' | 'usuarios' | 'sistema'
  ): ActivityData[] {
    const now = new Date();
    const data: ActivityData[] = [];
    
    // Generar las últimas 4 semanas (incluyendo la semana actual)
    // Orden: S1 (más reciente), S2, S3, S4 (más antigua)
    for (let week = 0; week < 4; week++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - week * 7);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Lunes de esa semana
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Domingo de esa semana
      
      // Contar aplicaciones para esta semana
      const weekApplications = applications.filter(app => {
        const appDate = new Date(app.createdAt);
        return appDate >= weekStart && appDate <= weekEnd;
      });
      
      const count = weekApplications.length;
      
      data.push({
        date: weekStart.toISOString().split('T')[0],
        count,
        type: filter,
        details: this.getActivityDetails(filter, count),
        period: `S${week + 1}`
      });
    }
    
    return data;
  }

  private generateCompleteQuartersData(
    applications: Application[],
    filter: 'postulaciones' | 'usuarios' | 'sistema'
  ): ActivityData[] {
    const now = new Date();
    const data: ActivityData[] = [];
    
    // Generar los últimos 4 cuatrimestres (incluyendo el cuatrimestre actual)
    // Orden: Q1 (más reciente), Q2, Q3, Q4 (más antiguo)
    for (let quarter = 0; quarter < 4; quarter++) {
      const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
      const quarterEnd = new Date(quarterStart);
      quarterEnd.setMonth(quarterStart.getMonth() + 3);
      quarterEnd.setDate(0); // Último día del mes anterior (último día del cuatrimestre)
      
      // Contar aplicaciones para este cuatrimestre
      const quarterApplications = applications.filter(app => {
        const appDate = new Date(app.createdAt);
        return appDate >= quarterStart && appDate <= quarterEnd;
      });
      
      const count = quarterApplications.length;
      
      data.push({
        date: quarterStart.toISOString().split('T')[0],
        count,
        type: filter,
        details: this.getActivityDetails(filter, count),
        period: `Q${quarter + 1}`
      });
    }
    
    return data;
  }

  private generateEmptyData(
    filter: 'postulaciones' | 'usuarios' | 'sistema',
    granularity: 'daily' | 'weekly' | 'quarterly'
  ): ActivityData[] {
    const now = new Date();
    const data: ActivityData[] = [];
    
    switch (granularity) {
      case 'daily': {
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          
          data.push({
            date: date.toISOString().split('T')[0],
            count: 0,
            type: filter,
            details: this.getEmptyDetails(filter),
            period: date.toLocaleDateString('es-ES', { weekday: 'short' })
          });
        }
        break;
      }
      case 'weekly': {
        for (let week = 3; week >= 0; week--) {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - week * 7);
          
          data.push({
            date: weekStart.toISOString().split('T')[0],
            count: 0,
            type: filter,
            details: this.getEmptyDetails(filter),
            period: `S${week + 1}`
          });
        }
        break;
      }
      case 'quarterly': {
        for (let quarter = 3; quarter >= 0; quarter--) {
          const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
          
          data.push({
            date: quarterStart.toISOString().split('T')[0],
            count: 0,
            type: filter,
            details: this.getEmptyDetails(filter),
            period: `Q${quarter + 1}`
          });
        }
        break;
      }
    }
    
    return data;
  }

  private getActivityDetails(filter: 'postulaciones' | 'usuarios' | 'sistema', count: number): string {
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

  private getEmptyDetails(filter: 'postulaciones' | 'usuarios' | 'sistema'): string {
    switch (filter) {
      case 'postulaciones':
        return 'No hay postulaciones en este período';
      case 'usuarios':
        return 'No hay nuevos usuarios en este período';
      case 'sistema':
        return 'No hay pendientes en este período';
      default:
        return 'No hay datos en este período';
    }
  }
}

export const applicationsService = new ApplicationsService();
