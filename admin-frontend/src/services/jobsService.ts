/**
 * Jobs Service
 * Servicio para comunicarse con el jobs-service backend
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';


export function useJobsList(params?: unknown) {
  const key = ['jobs', params ?? {}] as const;
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const baseUrl = import.meta.env.VITE_JOBS_SERVICE_URL || 'https://pa3itplx4f.execute-api.us-east-1.amazonaws.com/dev';
      const r = await fetch(`${baseUrl}/jobs`);
      if (!r.ok) throw new Error('Fetch failed');
      const data = await r.json();
      return (Array.isArray(data?.jobs) ? data.jobs : []).map((x: unknown)=>({ ...x, clientId: undefined }));
    },
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: unknown) => {
      const baseUrl = import.meta.env.VITE_JOBS_SERVICE_URL || 'https://pa3itplx4f.execute-api.us-east-1.amazonaws.com/dev';
      const r = await fetch(`${baseUrl}/jobs`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('Create failed'); 
      const data = await r.json();
      return data.job || data;
    },
    onMutate: async (body) => {
      const listKey = ['jobs', {}] as const;
      await qc.cancelQueries({ queryKey: listKey });
      const prev = qc.getQueryData<unknown[]>(listKey) ?? [];
      const optimistic = { ...body, id:'', clientId:newClientId(), updatedAt:new Date().toISOString() };
      qc.setQueryData<unknown[]>(listKey,(curr)=> upsertById(curr ?? [], optimistic));
      return { listKey, prev, optimistic };
    },
    onSuccess: (data, _body, ctx) => { 
      if (ctx) qc.setQueryData<unknown[]>(ctx.listKey, (curr)=> upsertById(removeById(curr ?? [], ctx.optimistic), data)); 
    },
    onError: (_e,_b,ctx)=>{ if (ctx) qc.setQueryData(ctx.listKey, ctx.prev); },
    onSettled: (_r,_e,ctx)=>{ 
      if (ctx) qc.invalidateQueries({ queryKey: ctx.listKey, exact:true }); 
      qc.invalidateQueries({ queryKey: ['folders'], exact:false });
    }
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }:{ id:string; patch:unknown }) => {
      const baseUrl = import.meta.env.VITE_JOBS_SERVICE_URL || 'https://pa3itplx4f.execute-api.us-east-1.amazonaws.com/dev';
      const r = await fetch(`${baseUrl}/jobs/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(patch) });
      if (!r.ok) throw new Error('Update failed'); 
      const data = await r.json();
      return data.job || data;
    },
    onMutate: async (vars) => {
      const listKey = ['jobs', {}] as const;
      await qc.cancelQueries({ queryKey: listKey });
      const prev = qc.getQueryData<unknown[]>(listKey) ?? [];
      qc.setQueryData<unknown[]>(listKey,(curr)=>{
        const f=(curr??[]).find(x=>x.jobId===vars.id); if(!f) return curr??[];
        const optimistic={...f, ...vars.patch, updatedAt:new Date().toISOString()};
        return upsertById(curr??[], optimistic);
      });
      return { listKey, prev };
    },
    onError: (_e,_v,ctx)=>{ if (ctx) qc.setQueryData(ctx.listKey, ctx.prev); },
    onSuccess: (data,_v,ctx)=>{ if (ctx) qc.setQueryData<unknown[]>(ctx.listKey,(curr)=> upsertById(curr ?? [], data)); },
    onSettled: (_r,_e,ctx)=>{ 
      if (ctx) qc.invalidateQueries({ queryKey: ctx.listKey, exact:true }); 
      qc.invalidateQueries({ queryKey: ['folders'], exact:false });
    }
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id:string) => {
      const baseUrl = import.meta.env.VITE_JOBS_SERVICE_URL || 'https://pa3itplx4f.execute-api.us-east-1.amazonaws.com/dev';
      const r = await fetch(`${baseUrl}/jobs/${id}`, { method:'DELETE' });
      if (!r.ok) throw new Error('Delete failed'); return id;
    },
    onMutate: async (id) => {
      const listKey = ['jobs', {}] as const;
      await qc.cancelQueries({ queryKey: listKey });
      const prev = qc.getQueryData<unknown[]>(listKey) ?? [];
      qc.setQueryData<unknown[]>(listKey,(curr)=> removeById(curr ?? [], { jobId: id }));
      return { listKey, prev };
    },
    onError: (_e,_id,ctx)=>{ if (ctx) qc.setQueryData(ctx.listKey, ctx.prev); },
    onSettled: (_r,_e,ctx)=>{ 
      if (ctx) qc.invalidateQueries({ queryKey: ctx.listKey, exact:true }); 
      qc.invalidateQueries({ queryKey: ['folders'], exact:false });
    }
  });
}

export interface JobPosting {
  jobId: string;
  title: string;
  description: string;
  companyName: string;
  companyId?: string;
  location: string;
  salary?: string;
  employmentType: string;
  experienceLevel: string;
  requirements?: string;
  benefits?: string;
  schedule?: string;
  expiresAt?: string;
  folderId: string;
  jobFolderId?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  requiredDocuments?: string[];
}

export interface BatchDeleteResults {
  deleted: string[];
  failed: Array<{ jobId: string; error: string }>;
  deletedCount: number;
  failedCount: number;
}

export interface JobsResponse {
  success: boolean;
  message: string;
  jobs?: JobPosting[];
  job?: JobPosting;
  results?: BatchDeleteResults;
}

export interface CreateJobInput {
  title: string;
  description: string;
  companyName: string;
  companyId?: string;
  location: string;
  salary?: string;
  employmentType: string;
  experienceLevel: string;
  requirements?: string;
  benefits?: string;
  schedule?: string;
  expiresAt?: string;
  folderId: string;
  requiredDocuments?: string[];
}

export interface UpdateJobInput {
  jobId: string;
  title?: string;
  description?: string;
  companyName?: string;
  companyId?: string;
  location?: string;
  salary?: string;
  employmentType?: string;
  experienceLevel?: string;
  requirements?: string;
  benefits?: string;
  schedule?: string;
  expiresAt?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED';
  requiredDocuments?: string[];
}

class JobsService {
  private baseUrl: string;

  constructor() {
    // Configurar URL del jobs-service
    // Usar la URL de AWS API Gateway donde está desplegado
    this.baseUrl = import.meta.env.VITE_JOBS_SERVICE_URL || 'https://pa3itplx4f.execute-api.us-east-1.amazonaws.com/dev';
  }

  /**
   * Obtener todos los jobs (para admin)
   */
  async getAllJobs(): Promise<JobsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Agregar token de autorización cuando esté implementado
          // 'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch {
      return {
        success: false,
        message: 'Error al obtener jobs del servidor',
      };
    }
  }

  /**
   * Obtener jobs publicados (para postulantes)
   */
  async getPublishedJobs(): Promise<JobsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/published`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch {
      return {
        success: false,
        message: 'Error al obtener jobs publicados del servidor',
      };
    }
  }

  /**
   * Obtener un job específico
   */
  async getJob(jobId: string): Promise<JobsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch {
      return {
        success: false,
        message: 'Error al obtener el job del servidor',
      };
    }
  }

  /**
   * Crear un nuevo job
   */
  async createJob(input: CreateJobInput): Promise<JobsResponse> {
    try {
      // Add timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      let retries = 3;
      let lastError: Error | null = null;
      
      while (retries > 0) {
        try {
          const response = await fetch(`${this.baseUrl}/jobs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // TODO: Agregar token de autorización cuando esté implementado
              // 'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(input),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
          }

          const data = await response.json();
          return data;
        } catch (error) {
          lastError = error as Error;
          retries--;
          
          if (retries > 0 && !controller.signal.aborted) {
            console.log('Retrying job request, retries left:', retries, error);
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, 3 - retries) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            break;
          }
        }
      }
      
      // Handle final error
      if (controller.signal.aborted) {
        return {
          success: false,
          message: 'Request timeout - please try again',
        };
      }
      
      throw lastError || new Error('Unknown error');
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al crear el job en el servidor',
      };
    }
  }

  /**
   * Actualizar un job
   */
  async updateJob(input: UpdateJobInput): Promise<JobsResponse> {
    try {
      // Add timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      let retries = 3;
      let lastError: Error | null = null;
      
      while (retries > 0) {
        try {
          const url = this.baseUrl + '/jobs/' + input.jobId;
          const response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              // TODO: Agregar token de autorización cuando esté implementado
              // 'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(input),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
          }

          const data = await response.json();
          return data;
        } catch (error) {
          lastError = error as Error;
          retries--;
          
          if (retries > 0 && !controller.signal.aborted) {
            console.log('Retrying job request, retries left:', retries, error);
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, 3 - retries) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            break;
          }
        }
      }
      
      // Handle final error
      if (controller.signal.aborted) {
        return {
          success: false,
          message: 'Request timeout - please try again',
        };
      }
      
      throw lastError || new Error('Unknown error');
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al actualizar el job en el servidor',
      };
    }
  }

  /**
   * Eliminar un job
   */
  async deleteJob(jobId: string): Promise<JobsResponse> {
    console.log('🗑️ jobsService.deleteJob: Iniciando eliminación de job:', jobId);
    
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Agregar token de autorización cuando esté implementado
          // 'Authorization': `Bearer ${token}`
        },
      });

      console.log('🗑️ jobsService.deleteJob: Response status:', response.status);
      console.log('🗑️ jobsService.deleteJob: Response ok:', response.ok);

      if (!response.ok) {
        console.error('🗑️ jobsService.deleteJob: HTTP error:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Si el backend no devuelve success, asumir que fue exitoso (200 OK)
      if (!data.success) {
        return {
          success: true,
          message: 'Job eliminado exitosamente',
          job: data
        };
      }
      
      return data;
    } catch {
      console.error('🗑️ jobsService.deleteJob: Error en catch');
      return {
        success: false,
        message: 'Error al eliminar el job del servidor',
      };
    }
  }

  /**
   * Obtener jobs por carpeta
   */
  async getJobsByFolder(folderId: string): Promise<JobsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/folder/${folderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch {
      return {
        success: false,
        message: 'Error al obtener jobs por carpeta del servidor',
      };
    }
  }

  /**
   * Eliminar múltiples jobs (batch)
   */
  async deleteJobs(jobIds: string[]): Promise<JobsResponse> {
    console.log('🗑️ jobsService.deleteJobs: Iniciando eliminación batch de jobs:', jobIds);

    try {
      const response = await fetch(`${this.baseUrl}/jobs/batch`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Agregar token de autorización cuando esté implementado
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobIds }),
      });

      console.log('🗑️ jobsService.deleteJobs: Response status:', response.status);
      console.log('🗑️ jobsService.deleteJobs: Response ok:', response.ok);

      if (!response.ok) {
        console.error('🗑️ jobsService.deleteJobs: HTTP error:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Si el backend no devuelve success, asumir que fue exitoso (200 OK)
      if (!data.success) {
        return {
          success: true,
          message: 'Jobs eliminados exitosamente',
          results: data.results || {
            deleted: jobIds,
            failed: [],
            deletedCount: jobIds.length,
            failedCount: 0
          }
        };
      }

      return data;
    } catch (error) {
      console.error('🗑️ jobsService.deleteJobs: Error en catch:', error);
      return {
        success: false,
        message: 'Error al eliminar jobs del servidor',
      };
    }
  }

  /**
   * Verificar salud del servicio
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

// Exportar instancia singleton
export const jobsService = new JobsService();
