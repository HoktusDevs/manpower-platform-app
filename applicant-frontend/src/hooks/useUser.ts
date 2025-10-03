import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, type UserProfileData } from '../services/userService';

/**
 * Hook para obtener el perfil del usuario
 */
export function useUserProfile() {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await userService.getProfile();
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.user;
    },
  });
}

/**
 * Hook para actualizar el perfil del usuario
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileData: Partial<UserProfileData>) => {
      const response = await userService.updateProfile(profileData);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: () => {
      // Invalidar el perfil del usuario para refrescar
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
}
