import { useState, useEffect } from 'react';
import { PostulanteHeader } from '../components/PostulanteHeader';
import type { UserProfileData } from '../types';
import { userService } from '../services/userService';

export const MiPerfilPage = () => {
  const [profileData, setProfileData] = useState<UserProfileData>({
    nombre: '',
    apellido: '',
    rut: '',
    email: '',
    telefono: '',
    direccion: '',
    fechaNacimiento: '',
    educacionNivel: '',
    experienciaLaboral: '',
    habilidades: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Cargar datos del perfil al montar el componente
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await userService.getProfile();
        
        if (response.success && response.user) {
          setProfileData(response.user);
        } else {
          // Si no hay datos del usuario, usar valores por defecto
          setProfileData({
            nombre: '',
            apellido: '',
            rut: '',
            email: '',
            telefono: '',
            direccion: '',
            fechaNacimiento: '',
            educacionNivel: '',
            experienciaLaboral: '',
            habilidades: ''
          });
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Error al cargar el perfil');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleInputChange = (field: keyof UserProfileData, value: string): void => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
    if (success) setSuccess(false);
    if (error) setError(null);
  };

  const handleSaveProfile = async (): Promise<void> => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await userService.updateProfile(profileData);
      
      if (response.success) {
        setSuccess(true);
        setIsEditing(false);
      } else {
        setError(response.message || 'Error al guardar el perfil');
      }

    } catch (err) {
      console.error('Error guardando perfil:', err);
      setError('No se pudieron guardar los cambios. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = (): void => {
    setIsEditing(false);
    setError(null);
    setSuccess(false);
    // Recargar datos originales
    window.location.reload();
  };

  const FieldSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PostulanteHeader />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <FieldSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PostulanteHeader />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Mi Perfil</h2>
                <p className="text-gray-600 mt-1">
                  Gestiona tu información personal y profesional
                </p>
              </div>
              <div className="flex space-x-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        saving
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Editar Perfil
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-green-800">Perfil actualizado exitosamente</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información Personal */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Información Personal
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.nombre}
                      onChange={(e) => handleInputChange('nombre', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profileData.nombre || 'No especificado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.apellido}
                      onChange={(e) => handleInputChange('apellido', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profileData.apellido || 'No especificado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RUT
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.rut}
                      onChange={(e) => handleInputChange('rut', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profileData.rut || 'No especificado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profileData.email || 'No especificado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profileData.telefono}
                      onChange={(e) => handleInputChange('telefono', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profileData.telefono || 'No especificado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.direccion}
                      onChange={(e) => handleInputChange('direccion', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profileData.direccion || 'No especificado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Nacimiento
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={profileData.fechaNacimiento}
                      onChange={(e) => handleInputChange('fechaNacimiento', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profileData.fechaNacimiento 
                        ? new Date(profileData.fechaNacimiento).toLocaleDateString('es-ES')
                        : 'No especificado'
                      }
                    </p>
                  )}
                </div>
              </div>

              {/* Información Profesional */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Información Profesional
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nivel de Educación
                  </label>
                  {isEditing ? (
                    <select
                      value={profileData.educacionNivel}
                      onChange={(e) => handleInputChange('educacionNivel', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar nivel</option>
                      <option value="basica">Educación Básica</option>
                      <option value="media">Educación Media</option>
                      <option value="tecnica">Técnica</option>
                      <option value="universitaria">Universitaria</option>
                      <option value="postgrado">Postgrado</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">
                      {profileData.educacionNivel 
                        ? profileData.educacionNivel.charAt(0).toUpperCase() + profileData.educacionNivel.slice(1)
                        : 'No especificado'
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experiencia Laboral
                  </label>
                  {isEditing ? (
                    <textarea
                      value={profileData.experienciaLaboral}
                      onChange={(e) => handleInputChange('experienciaLaboral', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe tu experiencia laboral..."
                    />
                  ) : (
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {profileData.experienciaLaboral || 'No especificado'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Habilidades
                  </label>
                  {isEditing ? (
                    <textarea
                      value={profileData.habilidades}
                      onChange={(e) => handleInputChange('habilidades', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Lista tus habilidades separadas por comas..."
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profileData.habilidades || 'No especificado'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};