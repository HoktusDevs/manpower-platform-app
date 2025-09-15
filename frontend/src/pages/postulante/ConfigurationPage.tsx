import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../core-ui';

interface UserPreferences {
  allowDataUsage: boolean;
  autoFillApplications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  jobRecommendations: boolean;
}

export const ConfigurationPage = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>({
    allowDataUsage: true,
    autoFillApplications: true,
    emailNotifications: true,
    smsNotifications: false,
    jobRecommendations: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar preferencias del usuario
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔄 Cargando preferencias del usuario...');

        // Obtener preferencias desde localStorage
        const savedPreferences = localStorage.getItem('userPreferences');
        if (savedPreferences) {
          try {
            const parsedPreferences = JSON.parse(savedPreferences);
            setPreferences(prev => ({ ...prev, ...parsedPreferences }));
            console.log('✅ Preferencias cargadas desde localStorage:', parsedPreferences);
          } catch (e) {
            console.warn('⚠️ Error parseando preferencias guardadas:', e);
          }
        }

      } catch (err) {
        console.error('❌ Error cargando preferencias:', err);
        setError('No se pudieron cargar las preferencias. Se utilizarán valores por defecto.');
      } finally {
        setLoading(false);
      }
    };

    loadUserPreferences();
  }, [user]);

  // Manejar cambios en las preferencias
  const handlePreferenceChange = (preference: keyof UserPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [preference]: value
    }));
    setSuccess(false);
    setError(null);
  };

  // Guardar preferencias
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      console.log('🔄 Guardando preferencias del usuario...');

      // TODO: Implementar guardado en Cognito como custom attributes
      // Por ahora guardar en localStorage
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      console.log('💾 Preferencias guardadas:', preferences);

      // Simular delay de guardado
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccess(true);
      console.log('✅ Preferencias guardadas exitosamente');

    } catch (err) {
      console.error('❌ Error guardando preferencias:', err);
      setError('No se pudieron guardar las preferencias. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // Skeleton loader
  const SettingSkeleton = () => (
    <div className="flex items-center justify-between py-4 animate-pulse">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="h-6 w-12 bg-gray-200 rounded-full"></div>
    </div>
  );

  return (
    <div className="h-full bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
            <p className="text-gray-600 mt-1">Personaliza tus preferencias y notificaciones</p>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">Configuración guardada exitosamente</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              // Loading State
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Preferencias de Datos</h3>
                  <div className="space-y-4">
                    {[...Array(2)].map((_, index) => (
                      <SettingSkeleton key={index} />
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notificaciones</h3>
                  <div className="space-y-4">
                    {[...Array(3)].map((_, index) => (
                      <SettingSkeleton key={index} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Settings Content
              <div className="space-y-8">
                {/* Preferencias de Datos */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Preferencias de Datos</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-4 border-b border-gray-100">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          Permitir siempre usar tus datos para completar procesos de postulación
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Autoriza el uso automático de tu información personal para acelerar futuras aplicaciones
                        </p>
                      </div>
                      <div className="ml-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.allowDataUsage}
                            onChange={(e) => handlePreferenceChange('allowDataUsage', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-4 border-b border-gray-100">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          Auto-completar formularios de aplicación
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Completa automáticamente formularios con tu información de perfil guardada
                        </p>
                      </div>
                      <div className="ml-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.autoFillApplications}
                            onChange={(e) => handlePreferenceChange('autoFillApplications', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notificaciones */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notificaciones</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-4 border-b border-gray-100">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          Notificaciones por email
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Recibe actualizaciones sobre tus aplicaciones y nuevas oportunidades por correo
                        </p>
                      </div>
                      <div className="ml-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.emailNotifications}
                            onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-4 border-b border-gray-100">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          Notificaciones por SMS
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Recibe alertas importantes sobre tus aplicaciones por mensaje de texto
                        </p>
                      </div>
                      <div className="ml-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.smsNotifications}
                            onChange={(e) => handlePreferenceChange('smsNotifications', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-4 border-b border-gray-100">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          Recomendaciones de empleos
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Recibe sugerencias de trabajos que coincidan con tu perfil y experiencia
                        </p>
                      </div>
                      <div className="ml-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.jobRecommendations}
                            onChange={(e) => handlePreferenceChange('jobRecommendations', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botón de Guardar */}
                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};