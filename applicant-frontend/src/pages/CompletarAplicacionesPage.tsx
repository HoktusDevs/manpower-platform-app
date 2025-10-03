import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { applicationsService } from '../services/applicationsService';
import { s3Service } from '../services/s3Service';
import { DocumentUpload } from '../components/DocumentUpload';
import type { JobPosting, UserApplicationData, TabType } from '../types';

export const CompletarAplicacionesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [documentFiles, setDocumentFiles] = useState<{ [jobId: string]: { [documentName: string]: File } }>({});
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


  const handleDocumentUpload = (jobId: string, documentName: string, file: File, documentId?: string) => {
    setDocumentFiles(prev => ({
      ...prev,
      [jobId]: {
        ...prev[jobId],
        [documentName]: file
      }
    }));
  };

  const handleDocumentRemove = (jobId: string, documentName: string) => {
    setDocumentFiles(prev => {
      const newFiles = { ...prev[jobId] };
      delete newFiles[documentName];
      return {
        ...prev,
        [jobId]: newFiles
      };
    });
  };

  const handleDocumentUploadComplete = (jobId: string, documentName: string, documentId: string, fileUrl: string) => {
    console.log('Document upload completed:', { jobId, documentName, documentId, fileUrl });
    // El documento ya está guardado en DynamoDB y S3
  };

  const handleDocumentUploadError = (jobId: string, documentName: string, error: string) => {
    console.error('Document upload error:', { jobId, documentName, error });
    setError(`Error subiendo ${documentName}: ${error}`);
  };

  const isDocumentUploaded = (jobId: string, documentName: string): boolean => {
    return !!(documentFiles[jobId]?.[documentName]);
  };

  const getUploadedDocument = (jobId: string, documentName: string): File | null => {
    return documentFiles[jobId]?.[documentName] || null;
  };

  const areAllDocumentsUploaded = (job: JobPosting): boolean => {
    if (!job.requiredDocuments || job.requiredDocuments.length === 0) {
      return true; // No documents required
    }
    
    return job.requiredDocuments.every(docName => 
      isDocumentUploaded(job.jobId, docName)
    );
  };

  const getMissingDocuments = (job: JobPosting): string[] => {
    if (!job.requiredDocuments || job.requiredDocuments.length === 0) {
      return [];
    }
    
    return job.requiredDocuments.filter(docName => 
      !isDocumentUploaded(job.jobId, docName)
    );
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

      if (!user?.sub) {
        setError('No se pudo identificar al usuario');
        return;
      }

      const userId = user.sub;
      console.log('📤 Enviando aplicaciones para jobs:', selectedJobs.map(job => job.jobId));

      // Validar que todos los documentos requeridos estén subidos
      const missingDocuments = selectedJobs.flatMap(job =>
        getMissingDocuments(job).map(docName => `${job.title}: ${docName}`)
      );

      if (missingDocuments.length > 0) {
        setError(`Faltan documentos requeridos: ${missingDocuments.join(', ')}`);
        return;
      }

      // Crear aplicaciones primero (esto crea las carpetas del postulante)
      console.log('📝 Creando aplicaciones en el backend...');
      const response = await applicationsService.createApplications({
        jobIds: selectedJobs.map(job => job.jobId),
        description: `Aplicación de ${applicationData.nombre} (${applicationData.email})`,
        documents: []
      });

      if (!response.success || !response.applications) {
        setError(response.message || 'Error al crear aplicaciones');
        return;
      }

      console.log(`✅ ${response.applications.length} aplicaciones creadas exitosamente`);

      // Subir documentos a S3 y registrarlos en files-service dentro de la carpeta del postulante
      console.log('📤 Subiendo documentos a S3...');

      for (const application of response.applications) {
        if (!application.applicantFolderId) {
          console.warn(`⚠️ No applicantFolderId for application ${application.applicationId}, skipping documents`);
          continue;
        }

        const jobDocuments = documentFiles[application.jobId] || {};

        for (const [documentName, file] of Object.entries(jobDocuments)) {
          try {
            console.log(`📎 Subiendo ${documentName} para job ${application.jobId} en carpeta ${application.applicantFolderId}...`);

            // Subir archivo al file-upload-service con folderId
            // Esto sube a S3 y registra en files-service automáticamente
            const uploadResult = await s3Service.uploadFileToFolder(
              file,
              application.applicantFolderId,
              file.name,
              file.type
            );

            if (uploadResult.success) {
              console.log(`✅ Documento ${documentName} subido exitosamente`);
            } else {
              console.warn(`⚠️ Error subiendo ${documentName}:`, uploadResult.error);
            }
          } catch (uploadError) {
            console.error(`❌ Error subiendo ${documentName}:`, uploadError);
            // Continuar con los demás documentos aunque uno falle
          }
        }
      }

      setSuccessMessage(`¡Aplicaciones enviadas exitosamente! Se crearon ${response.applications.length} aplicaciones con sus documentos.`);
      setShowSuccessToast(true);

      // Redirigir a Mis Aplicaciones después de 2 segundos
      setTimeout(() => {
        navigate('/mis-aplicaciones');
      }, 2000);

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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Documentos Requeridos</h3>
                {selectedJobs.length === 0 ? (
                  <p className="text-gray-600">Primero selecciona puestos de trabajo.</p>
                ) : (
                  <div className="space-y-6">
                    {selectedJobs.map((job) => (
                      <div key={job.jobId} className="border border-gray-200 rounded-lg p-6">
                        <div className="mb-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900 text-lg">{job.title}</h4>
                              <p className="text-sm text-gray-600">{job.companyName}</p>
                            </div>
                            {job.requiredDocuments && job.requiredDocuments.length > 0 && (
                              <div className="flex items-center space-x-2">
                                {areAllDocumentsUploaded(job) ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✓ Completado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    {getMissingDocuments(job).length} pendiente(s)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {job.requiredDocuments && job.requiredDocuments.length > 0 ? (
                          <div className="space-y-4">
                            <p className="text-sm text-gray-600 mb-4">
                              Sube los siguientes documentos requeridos para este empleo:
                            </p>
                            {job.requiredDocuments.map((documentName, index) => (
                              <DocumentUpload
                                key={`${job.jobId}-${index}`}
                                documentName={documentName}
                                onFileUpload={(file, documentId) => handleDocumentUpload(job.jobId, documentName, file, documentId)}
                                onFileRemove={() => handleDocumentRemove(job.jobId, documentName)}
                                uploadedFile={getUploadedDocument(job.jobId, documentName)}
                                isUploaded={isDocumentUploaded(job.jobId, documentName)}
                                isRequired={true}
                                userId={user?.sub || ''}
                                jobId={job.jobId}
                                onUploadComplete={(documentId, fileUrl) => handleDocumentUploadComplete(job.jobId, documentName, documentId, fileUrl)}
                                onUploadError={(error) => handleDocumentUploadError(job.jobId, documentName, error)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p>Este empleo no requiere documentos específicos</p>
                          </div>
                        )}
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