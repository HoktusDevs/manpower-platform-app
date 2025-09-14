import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
import { Button } from '../../core-ui';

interface JobPosting {
  jobId: string;
  title: string;
  description: string;
  companyName: string;
  location: string;
  employmentType: string;
  experienceLevel: string;
  salary?: string;
}

interface UserApplicationData {
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  experiencia: string;
  educacion: string;
  motivacion: string;
}

interface PendingApplicationsViewProps {
  onComplete: () => void;
}

export const PendingApplicationsView: React.FC<PendingApplicationsViewProps> = ({ onComplete }) => {
  // const navigate = useNavigate();
  const [selectedJobs, setSelectedJobs] = useState<JobPosting[]>([]);
  const [applicationData, setApplicationData] = useState<UserApplicationData>({
    nombre: '',
    rut: '',
    email: '',
    telefono: '',
    direccion: '',
    experiencia: '',
    educacion: '',
    motivacion: ''
  });
  const [files, setFiles] = useState<{ [jobId: string]: File[] }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar puestos seleccionados y sus datos completos
    const savedJobs = localStorage.getItem('selectedJobPostings');
    const savedJobsData = localStorage.getItem('selectedJobsData');
    
    if (savedJobs) {
      const jobIds = JSON.parse(savedJobs);
      
      if (savedJobsData) {
        // Usar los datos completos guardados de /aplicar
        const allJobsData = JSON.parse(savedJobsData);
        const selectedJobsData = allJobsData.filter((job: JobPosting) => 
          jobIds.includes(job.jobId)
        );
        setSelectedJobs(selectedJobsData);
        console.log('✅ Puestos cargados desde /aplicar:', selectedJobsData);
      } else {
        // Fallback si no hay datos completos guardados
        const mockJobsData = jobIds.map((jobId: string) => ({
          jobId,
          title: 'Puesto Seleccionado',
          description: 'Descripción del puesto seleccionado',
          companyName: 'Empresa',
          location: 'Ubicación',
          employmentType: 'Tiempo completo',
          experienceLevel: 'Intermedio'
        }));
        setSelectedJobs(mockJobsData);
      }
    }

    // Cargar datos del usuario guardados
    const loadUserData = async () => {
      const userData = localStorage.getItem('userApplicationData');
      console.log('📋 Datos de usuario en localStorage:', userData);
      
      // Debug: Verificar qué hay en localStorage completo
      console.log('🔍 Todas las keys en localStorage:', Object.keys(localStorage));
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.includes('user') || key?.includes('Data') || key?.includes('cognito')) {
          console.log(`🔑 ${key}:`, localStorage.getItem(key));
        }
      }
      
      if (userData) {
        const parsedUserData = JSON.parse(userData);
        console.log('📋 Datos parseados:', parsedUserData);
        
        setApplicationData(prev => ({
          ...prev,
          nombre: parsedUserData.nombre || '',
          rut: parsedUserData.rut || '',
          email: parsedUserData.email || '',
          telefono: parsedUserData.telefono || '',
          direccion: parsedUserData.direccion || '',
          experiencia: parsedUserData.experiencia || '',
          educacion: parsedUserData.educacion || ''
        }));
        
        console.log('✅ Datos aplicados al formulario desde localStorage');
      } else {
        console.log('❌ No hay datos de usuario en localStorage, intentando desde Cognito...');
        
        // Intentar obtener datos directamente del servicio de autenticación
        const loadCognitoData = async () => {
        try {
          const { cognitoAuthService } = await import('../../services/cognitoAuthService');
          const currentUser = cognitoAuthService.getCurrentUser();
          console.log('👤 Usuario actual desde Cognito:', currentUser);
          
          if (currentUser) {
            // Obtener atributos adicionales del usuario desde AWS
            console.log('🔍 Intentando obtener atributos de Cognito...');
            const attrs = await cognitoAuthService.getUserAttributes();
            
            console.log('📋 Resultado de getUserAttributes():', attrs);
            
            if (attrs) {
              console.log('📋 Atributos específicos encontrados:');
              console.log('  - given_name:', attrs.given_name);
              console.log('  - family_name:', attrs.family_name);
              console.log('  - email:', attrs.email);
              console.log('  - phone_number:', attrs.phone_number);
              console.log('  - custom:rut:', attrs['custom:rut']);
              console.log('  - address:', attrs.address);
              console.log('  - custom:work_experience:', attrs['custom:work_experience']);
              console.log('  - custom:education_level:', attrs['custom:education_level']);
              
              const fullName = `${attrs.given_name || ''} ${attrs.family_name || ''}`.trim();
              console.log('🎯 Nombre completo construido:', fullName);
              
              // Crear objeto completo con todos los datos disponibles
              const cognitoUserData = {
                nombre: fullName,
                rut: attrs['custom:rut'] || '',
                email: attrs.email || currentUser.email || '',
                telefono: attrs.phone_number?.replace('+56', '') || '', // Limpiar código de país
                direccion: attrs.address || '',
                experiencia: attrs['custom:work_experience'] || '',
                educacion: attrs['custom:education_level'] || '',
                motivacion: '' // Campo vacío para que el usuario llene
              };
              
              setApplicationData(prev => ({
                ...prev,
                ...cognitoUserData
              }));
              
              // Guardar en localStorage para futuros usos
              localStorage.setItem('userApplicationData', JSON.stringify(cognitoUserData));
              
              console.log('✅ Datos aplicados al formulario desde atributos de Cognito:', cognitoUserData);
            } else {
              console.log('⚠️ No se pudieron obtener atributos de Cognito, usando fallback');
              // Fallback con datos básicos del usuario
              const fallbackData = {
                nombre: currentUser.fullName || '',
                email: currentUser.email || '',
                rut: '',
                telefono: '',
                direccion: '',
                experiencia: '',
                educacion: '',
                motivacion: ''
              };
              
              setApplicationData(prev => ({
                ...prev,
                ...fallbackData
              }));
              
              console.log('✅ Datos aplicados al formulario desde fallback:', fallbackData);
            }
          }
        } catch (error) {
          console.error('❌ Error cargando datos desde Cognito:', error);
        }
      };
      
        await loadCognitoData();
      }
    };
    
    loadUserData();
  }, []);

  const handleInputChange = (field: keyof UserApplicationData, value: string) => {
    setApplicationData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (jobId: string, newFiles: FileList | null) => {
    if (newFiles) {
      setFiles(prev => ({ ...prev, [jobId]: Array.from(newFiles) }));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      console.log('📤 Enviando aplicaciones:', {
        jobs: selectedJobs.map(job => job.jobId),
        data: applicationData,
        files: Object.keys(files).map(jobId => ({
          jobId,
          fileCount: files[jobId]?.length || 0
        }))
      });

      // TODO: Implementar envío real
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simular envío

      alert('¡Aplicaciones enviadas exitosamente!');
      
      // Limpiar datos guardados
      localStorage.removeItem('selectedJobPostings');
      localStorage.removeItem('redirectAfterAuth');
      
      // Marcar como completado
      onComplete();
    } catch (error) {
      console.error('❌ Error enviando aplicaciones:', error);
      alert('Error al enviar aplicaciones. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    localStorage.removeItem('selectedJobPostings');
    localStorage.removeItem('redirectAfterAuth');
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Completar Aplicaciones</h1>
            <p className="text-sm text-gray-600 mt-1">
              Completa tu información y adjunta documentos para {selectedJobs.length} puesto(s) seleccionado(s)
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* Puestos Seleccionados */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Puestos Seleccionados desde /aplicar</h2>
              <div className="grid gap-4">
                {selectedJobs.map((job) => (
                  <div key={job.jobId} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{job.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">{job.companyName}</span> - {job.location}
                        </p>
                        <p className="text-xs text-gray-500">
                          {job.employmentType} | {job.experienceLevel}
                          {job.salary && (
                            <span className="ml-2 text-green-600">• {job.salary}</span>
                          )}
                        </p>
                        {job.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{job.description}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Upload de archivos para este puesto */}
                    <div className="mt-4 p-3 bg-white rounded-md border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📎 Documentos para "{job.title}" (CV, carta de presentación, etc.)
                      </label>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(job.jobId, e.target.files)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {files[job.jobId] && files[job.jobId].length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-green-600 font-medium">
                            ✅ {files[job.jobId].length} archivo(s) seleccionado(s):
                          </p>
                          <ul className="text-xs text-gray-600 mt-1 space-y-1">
                            {files[job.jobId].map((file, fileIdx) => (
                              <li key={fileIdx} className="flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                {file.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulario de Datos */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Información Personal</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={applicationData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                  <input
                    type="text"
                    value={applicationData.rut}
                    onChange={(e) => handleInputChange('rut', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={applicationData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={applicationData.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={applicationData.direccion}
                    onChange={(e) => handleInputChange('direccion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experiencia Laboral</label>
                  <textarea
                    value={applicationData.experiencia}
                    onChange={(e) => handleInputChange('experiencia', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe tu experiencia laboral relevante..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Educación</label>
                  <textarea
                    value={applicationData.educacion}
                    onChange={(e) => handleInputChange('educacion', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe tu formación académica..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivación</label>
                  <textarea
                    value={applicationData.motivacion}
                    onChange={(e) => handleInputChange('motivacion', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="¿Por qué te interesa este/estos puesto(s)?"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !applicationData.nombre || !applicationData.email}
              className={`px-6 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                loading || !applicationData.nombre || !applicationData.email
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {loading ? 'Enviando...' : `Enviar ${selectedJobs.length} Aplicación(es)`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};