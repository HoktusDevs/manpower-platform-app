import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import type { JobPosting, UserApplicationData, TabType } from '../types';

export const CompletarAplicacionesPage = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [selectedJobs, setSelectedJobs] = useState<JobPosting[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('puestos');
  const [applicationData, setApplicationData] = useState<UserApplicationData>({
    nombre: '',
    rut: '',
    email: '',
    telefono: '',
    direccion: '',
    educacion: ''
  });
  const [files, setFiles] = useState<{ [jobId: string]: File[] }>({});
  const [saving, setSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Cargar jobs seleccionados desde la navegación
  useEffect(() => {
    if (location.state?.selectedJobs) {
      console.log('Cargando jobs seleccionados desde /aplicar:', location.state.selectedJobs);
      setSelectedJobs(location.state.selectedJobs);
    }
  }, [location.state]);

  // Cargar datos completos del usuario desde el backend
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        console.log('🔍 Cargando perfil completo del usuario...');
        
        const response = await userService.getProfile();
        
        if (response.success && response.user) {
          console.log('✅ Perfil del usuario cargado:', response.user);
          
          // Pre-llenar formulario con todos los datos del usuario
          setApplicationData(prev => ({
            ...prev,
            nombre: response.user!.nombre || '',
            rut: response.user!.rut || '',
            email: response.user!.email || '',
            telefono: response.user!.telefono || '',
            direccion: response.user!.direccion || '',
            educacion: response.user!.experienciaLaboral || response.user!.educacionNivel || '',
          }));
        } else {
          console.log('⚠️ No se pudieron cargar los datos del perfil:', response.message);
          
          // Fallback: usar datos básicos del useAuth
          if (user) {
            setApplicationData(prev => ({
              ...prev,
              nombre: user.fullName || user.email?.split('@')[0] || '',
              email: user.email || '',
            }));
          }
        }
      } catch (error) {
        console.error('❌ Error cargando perfil del usuario:', error);
        
        // Fallback: usar datos básicos del useAuth
        if (user) {
          setApplicationData(prev => ({
            ...prev,
            nombre: user.fullName || user.email?.split('@')[0] || '',
            email: user.email || '',
          }));
        }
      }
    };

    loadUserProfile();
  }, [user]);

  const handleInputChange = (field: keyof UserApplicationData, value: string): void => {
    setApplicationData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (jobId: string, newFiles: FileList | null): void => {
    if (newFiles) {
      setFiles(prev => ({ ...prev, [jobId]: Array.from(newFiles) }));
    }
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage('');

      // Validar datos requeridos
      if (!applicationData.nombre || !applicationData.email || !applicationData.telefono) {
        setError('Por favor completa todos los campos requeridos');
        return;
      }

      if (selectedJobs.length === 0) {
        setError('Por favor selecciona al menos un puesto');
        return;
      }

      // TODO: Implementar envío de aplicaciones cuando esté disponible el applications-service
      console.log('Envío de aplicaciones no implementado aún');
      
      // Simular éxito por ahora
      setSuccessMessage('¡Formulario completado! (Envío de aplicaciones pendiente de implementación)');
      setShowSuccessToast(true);
      
      // Limpiar formulario
      setSelectedJobs([]);
      setFiles({});
      setApplicationData({
        nombre: '',
        rut: '',
        email: '',
        telefono: '',
        direccion: '',
        educacion: ''
      });

    } catch (err) {
      console.error('Error submitting applications:', err);
      setError('Error al enviar las aplicaciones. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const isFormValid = () => {
    return (
      applicationData.nombre.trim() !== '' &&
      applicationData.email.trim() !== '' &&
      applicationData.telefono.trim() !== '' &&
      selectedJobs.length > 0
    );
  };

  // No hay loading state - formulario siempre disponible

  return (
    <div className="h-full bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Completar Aplicaciones</h2>
            <p className="text-gray-600 mt-1">
              Completa tu información y envía tus aplicaciones
            </p>
          </div>

          {/* Tabs */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              {[
                { id: 'puestos', label: 'Puestos Seleccionados', count: selectedJobs.length },
                { id: 'informacion', label: 'Información Personal' },
                { id: 'documentos', label: 'Documentos' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as TabType)}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-6 py-6">
            {activeTab === 'puestos' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Puestos Seleccionados</h3>
                {selectedJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No hay puestos seleccionados</h4>
                    <p className="text-gray-600 mb-4">
                      Ve a la página de búsqueda de empleos para seleccionar puestos.
                    </p>
                    <a
                      href="/buscar-empleos"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-block"
                    >
                      Buscar Empleos
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedJobs.map((job) => (
                      <div key={job.jobId} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900">{job.title}</h4>
                            <p className="text-gray-600">{job.companyName}</p>
                            <p className="text-sm text-gray-500">{job.location}</p>
                          </div>
                          <button
                            onClick={() => setSelectedJobs(prev => prev.filter(j => j.jobId !== job.jobId))}
                            className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'informacion' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={applicationData.nombre}
                      onChange={(e) => handleInputChange('nombre', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RUT
                    </label>
                    <input
                      type="text"
                      value={applicationData.rut}
                      onChange={(e) => handleInputChange('rut', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={applicationData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      value={applicationData.telefono}
                      onChange={(e) => handleInputChange('telefono', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={applicationData.direccion}
                      onChange={(e) => handleInputChange('direccion', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Educación/Experiencia
                    </label>
                    <textarea
                      value={applicationData.educacion}
                      onChange={(e) => handleInputChange('educacion', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documentos' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Documentos</h3>
                {selectedJobs.length === 0 ? (
                  <p className="text-gray-600">Primero selecciona puestos de trabajo.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedJobs.map((job) => (
                      <div key={job.jobId} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">{job.title}</h4>
                        <div className="mb-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subir documentos (CV, certificados, etc.)
                          </label>
                          <input
                            type="file"
                            multiple
                            onChange={(e) => handleFileChange(job.jobId, e.target.files)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        {(() => {
                          const jobFiles = files[job.jobId];
                          return jobFiles && jobFiles.length > 0 && (
                            <div className="text-sm text-gray-600">
                              {jobFiles.length} archivo(s) seleccionado(s)
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-6 py-4 bg-red-50 border-t border-red-200">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Success Toast */}
          {showSuccessToast && (
            <div className="px-6 py-4 bg-green-50 border-t border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-green-800">{successMessage}</p>
                </div>
                <button
                  onClick={() => setShowSuccessToast(false)}
                  className="text-green-600 hover:text-green-800"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedJobs.length > 0 ? (
                  <span className="font-medium text-blue-600">
                    ✓ {selectedJobs.length} puesto{selectedJobs.length > 1 ? 's' : ''} seleccionado{selectedJobs.length > 1 ? 's' : ''}
                  </span>
                ) : (
                  'Selecciona puestos para continuar'
                )}
              </div>
              <button
                onClick={handleSubmit}
                disabled={!isFormValid() || saving}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  !isFormValid() || saving
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
              >
                {saving ? 'Enviando...' : 'Enviar Aplicaciones'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};