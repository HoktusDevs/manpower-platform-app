import { useState } from 'react';
import { PostulanteHeader } from '../components/PostulanteHeader';
import type { UserProfileData } from '../types';

export const MiPerfilPage = () => {
  const [profileData, setProfileData] = useState<UserProfileData>({
    nombre: 'Juan',
    apellido: 'Pérez',
    rut: '12.345.678-9',
    email: 'juan.perez@example.com',
    telefono: '987654321',
    direccion: 'Av. Providencia 123, Providencia, Santiago',
    fechaNacimiento: '1990-05-15',
    educacionNivel: 'universitaria',
    experienciaLaboral: 'Desarrollador de software con 5 años de experiencia en React y Node.js. He trabajado en proyectos de comercio electrónico y sistemas de gestión.',
    habilidades: 'JavaScript, TypeScript, React, Node.js, PostgreSQL, Git, Inglés avanzado'
  });

  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

      await new Promise(resolve => setTimeout(resolve, 1500));

      setSuccess(true);
      setIsEditing(false);

    } catch (err) {
      console.error('Error guardando perfil:', err);
      setError('No se pudieron guardar los cambios. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
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
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-6 py-6 border-b border-gray-200">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="px-6 py-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(8)].map((_, index) => (
                    <FieldSkeleton key={index} />
                  ))}
                </div>
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
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Mi Perfil</h2>
                  <p className="text-gray-600 mt-1">Administra tu información personal y profesional</p>
                </div>
                <div className="flex space-x-3">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Editar Perfil
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setError(null);
                          setSuccess(false);
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          saving
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex">
                    <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm text-green-700">Perfil actualizado exitosamente</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-8">
              <form className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Información Personal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={profileData.nombre}
                        onChange={(e) => handleInputChange('nombre', e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isEditing
                            ? 'border-gray-300 bg-white'
                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Apellido *
                      </label>
                      <input
                        type="text"
                        value={profileData.apellido}
                        onChange={(e) => handleInputChange('apellido', e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isEditing
                            ? 'border-gray-300 bg-white'
                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        RUT *
                      </label>
                      <input
                        type="text"
                        value={profileData.rut}
                        onChange={(e) => handleInputChange('rut', e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isEditing
                            ? 'border-gray-300 bg-white'
                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isEditing
                            ? 'border-gray-300 bg-white'
                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={profileData.telefono}
                        onChange={(e) => handleInputChange('telefono', e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isEditing
                            ? 'border-gray-300 bg-white'
                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        }`}
                        placeholder="987654321"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha de Nacimiento
                      </label>
                      <input
                        type="date"
                        value={profileData.fechaNacimiento}
                        onChange={(e) => handleInputChange('fechaNacimiento', e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isEditing
                            ? 'border-gray-300 bg-white'
                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        }`}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dirección
                      </label>
                      <input
                        type="text"
                        value={profileData.direccion}
                        onChange={(e) => handleInputChange('direccion', e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isEditing
                            ? 'border-gray-300 bg-white'
                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        }`}
                        placeholder="Calle, número, comuna, ciudad"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Información Profesional</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nivel de Educación
                      </label>
                      <select
                        value={profileData.educacionNivel}
                        onChange={(e) => handleInputChange('educacionNivel', e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isEditing
                            ? 'border-gray-300 bg-white'
                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        }`}
                      >
                        <option value="">Selecciona tu nivel de educación</option>
                        <option value="basica">Educación Básica</option>
                        <option value="media">Educación Media</option>
                        <option value="tecnica">Técnico</option>
                        <option value="universitaria">Universitaria</option>
                        <option value="postgrado">Postgrado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Habilidades y Competencias
                      </label>
                      <textarea
                        value={profileData.habilidades}
                        onChange={(e) => handleInputChange('habilidades', e.target.value)}
                        disabled={!isEditing}
                        rows={3}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isEditing
                            ? 'border-gray-300 bg-white'
                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        }`}
                        placeholder="Menciona tus principales habilidades, idiomas, certificaciones, etc."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Experiencia Laboral
                      </label>
                      <textarea
                        value={profileData.experienciaLaboral}
                        onChange={(e) => handleInputChange('experienciaLaboral', e.target.value)}
                        disabled={!isEditing}
                        rows={4}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isEditing
                            ? 'border-gray-300 bg-white'
                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        }`}
                        placeholder="Describe tu experiencia laboral relevante..."
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Información de la Cuenta</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Usuario creado:</strong> 15 de marzo de 2024
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Estado de la cuenta:</strong>
                      <span className="ml-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        Activa
                      </span>
                    </p>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};