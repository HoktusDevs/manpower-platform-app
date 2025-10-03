import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  applicationsService,
  type CreateApplicationRequest,
  type Application
} from '../services/applicationsService';

/**
 * Hook para obtener todas las aplicaciones del usuario
 */
export function useApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const response = await applicationsService.getMyApplications();
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.applications || [];
    },
  });
}

/**
 * Hook para obtener una aplicación específica
 */
export function useApplication(applicationId: string) {
  return useQuery({
    queryKey: ['application', applicationId],
    queryFn: async () => {
      const response = await applicationsService.getApplication(applicationId);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.application;
    },
    enabled: !!applicationId,
  });
}

/**
 * Hook para verificar si existe una aplicación para un trabajo
 */
export function useCheckApplicationExists(jobId: string) {
  return useQuery({
    queryKey: ['application-exists', jobId],
    queryFn: async () => {
      const response = await applicationsService.checkApplicationExists(jobId);
      return {
        exists: response.exists,
        applicationId: response.applicationId,
      };
    },
    enabled: !!jobId,
  });
}

/**
 * Hook para crear aplicaciones
 */
export function useCreateApplications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateApplicationRequest) => {
      const response = await applicationsService.createApplications(request);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: () => {
      // Invalidar la lista de aplicaciones para refrescar
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

/**
 * Hook para eliminar una aplicación
 */
export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      const response = await applicationsService.deleteApplication(applicationId);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: () => {
      // Invalidar la lista de aplicaciones para refrescar
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

/**
 * Hook para actualizar una aplicación
 */
export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      updates
    }: {
      applicationId: string;
      updates: Partial<Application>
    }) => {
      const response = await applicationsService.updateApplication(applicationId, updates);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidar aplicación específica y lista
      queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}
