import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../core-ui';
import { cognitoAuthService } from '../../services/cognitoAuthService';
import { useGraphQL } from '../../hooks/useGraphQL';

interface JobPosting {
  jobId: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  employmentType: string;
  companyName: string;
  salary?: string;
  benefits?: string;
  experienceLevel: string;
}

// interface UserApplicationData {
//   nombre: string;
//   rut: string;
//   email: string;
//   telefono: string;
//   direccion?: string;
//   experiencia?: string;
//   educacion?: string;
//   motivacion?: string;
// }

export function PostulacionPage() {
  const navigate = useNavigate();
  const { fetchActiveJobPostings, jobPostings: graphqlJobPostings } = useGraphQL();
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAuthOptions, setShowAuthOptions] = useState(false);
  // const [showApplicationForm, setShowApplicationForm] = useState(false);
  // const [userApplicationData, setUserApplicationData] = useState<UserApplicationData>({
  //   nombre: '',
  //   rut: '',
  //   email: '',
  //   telefono: '',
  //   direccion: '',
  //   experiencia: '',
  //   educacion: '',
  //   motivacion: ''
  // });
  // const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Cargar puestos activos al montar el componente
  useEffect(() => {
    const loadActiveJobPostings = async () => {
      try {
        setLoading(true);
        console.log('🔄 Iniciando carga de puestos activos...');

        // Try to load from GraphQL first
        try {
          await fetchActiveJobPostings(20); // Fetch up to 20 job postings
          if (graphqlJobPostings && graphqlJobPostings.length > 0) {
            console.log('✅ Puestos cargados desde GraphQL:', graphqlJobPostings.length);
            setJobPostings(graphqlJobPostings.map(job => ({
              jobId: job.jobId,
              title: job.title,
              description: job.description,
              requirements: job.requirements || '',
              location: job.location || 'Remoto',
              employmentType: job.employmentType || 'Tiempo completo',
              companyName: job.companyName || 'Empresa',
              salary: job.salary,
              benefits: job.benefits,
              experienceLevel: job.experienceLevel || 'Intermedio'
            })));
            return;
          }
        } catch (gqlError) {
          console.warn('⚠️ GraphQL falló, usando datos temporales:', gqlError);
        }

        // Fallback to mock data if GraphQL fails
        console.log('⚠️ Usando datos temporales mientras se configura el acceso público al GraphQL');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockJobPostings: JobPosting[] = [
          {
            jobId: 'job-001',
            title: 'Desarrollador Full Stack',
            description: 'Buscamos un desarrollador full stack con experiencia en React y Node.js para unirse a nuestro equipo dinámico.',
            requirements: 'React, Node.js, TypeScript, AWS, GraphQL. Mínimo 3 años de experiencia.',
            location: 'Madrid, España',
            employmentType: 'Tiempo completo',
            companyName: 'TechCorp Innovations',
            salary: '45.000€ - 60.000€ anuales',
            benefits: 'Seguro médico, teletrabajo híbrido, 25 días de vacaciones',
            experienceLevel: 'Intermedio'
          },
          {
            jobId: 'job-002', 
            title: 'Diseñador UX/UI Senior',
            description: 'Únete a nuestro equipo de diseño para crear experiencias digitales excepcionales.',
            requirements: 'Figma, Adobe Creative Suite, experiencia en diseño de productos digitales. Portfolio requerido.',
            location: 'Barcelona, España',
            employmentType: 'Tiempo completo',
            companyName: 'Design Studio Pro',
            salary: '40.000€ - 55.000€ anuales', 
            benefits: 'Formación continua, horario flexible, ambiente creativo',
            experienceLevel: 'Senior'
          },
          {
            jobId: 'job-003',
            title: 'Analista de Datos',
            description: 'Buscamos un analista de datos para extraer insights valiosos de grandes volúmenes de información.',
            requirements: 'Python, SQL, Power BI, Excel avanzado. Conocimientos en machine learning valorados.',
            location: 'Valencia, España',
            employmentType: 'Tiempo completo',
            companyName: 'DataWorks Analytics',
            salary: '38.000€ - 50.000€ anuales',
            benefits: 'Cursos de certificación, bonus por rendimiento',
            experienceLevel: 'Intermedio'
          },
          {
            jobId: 'job-004',
            title: 'Marketing Digital Specialist',
            description: 'Gestiona campañas digitales y optimiza la presencia online de nuestros clientes.',
            requirements: 'Google Ads, Facebook Ads, SEO/SEM, Google Analytics. 2+ años de experiencia.',
            location: 'Sevilla, España',
            employmentType: 'Tiempo parcial',
            companyName: 'Digital Growth Agency',
            salary: '25.000€ - 35.000€ anuales',
            benefits: 'Trabajo remoto, horario flexible',
            experienceLevel: 'Junior'
          }
        ];

        console.log('✅ Puestos cargados (datos temporales):', mockJobPostings.length, mockJobPostings);
        setJobPostings(mockJobPostings);
        
      } catch (error) {
        console.error('❌ Error cargando puestos:', error);
        setJobPostings([]);
      } finally {
        setLoading(false);
      }
    };

    loadActiveJobPostings();
  }, [fetchActiveJobPostings, graphqlJobPostings]);

  // Verificar autenticación y cargar datos del usuario para reutilización
  useEffect(() => {
    console.log('🔄 Verificando estado de autenticación...');
    
    try {
      // Solo verificar autenticación si hay tokens guardados
      const hasTokens = localStorage.getItem('cognito_id_token') || localStorage.getItem('cognito_access_token');
      
      if (hasTokens) {
        const authenticated = cognitoAuthService.isAuthenticated();
        console.log('🔍 Estado de autenticación:', authenticated);
        // setIsAuthenticated(authenticated);
        
        if (authenticated) {
          const currentUser = cognitoAuthService.getCurrentUser();
          console.log('👤 Usuario actual:', currentUser);
          
          if (currentUser) {
            // Preservar datos existentes y solo actualizar los campos básicos
            const existingData = localStorage.getItem('userApplicationData');
            let userData = {
              nombre: '',
              email: '',
              rut: '',
              telefono: '',
              direccion: '',
              experiencia: '',
              educacion: ''
            };
            
            // Si hay datos existentes, preservarlos
            if (existingData) {
              try {
                userData = { ...userData, ...JSON.parse(existingData) };
                console.log('💾 Datos existentes encontrados:', userData);
              } catch (e) {
                console.warn('Error parseando datos existentes:', e);
              }
            }
            
            // Actualizar solo los campos básicos con datos del usuario actual
            userData.nombre = currentUser.fullName || userData.nombre;
            userData.email = currentUser.email || userData.email;
            
            localStorage.setItem('userApplicationData', JSON.stringify(userData));
            console.log('✅ Datos del usuario actualizados preservando datos completos:', userData);
          }
        }
      } else {
        console.log('❌ No hay tokens - usuario no autenticado');
        // setIsAuthenticated(false);
      }
      
      // Recuperar puestos seleccionados si los hay (independiente de autenticación)
      const savedSelectedJobs = localStorage.getItem('selectedJobPostings');
      if (savedSelectedJobs) {
        const parsedJobs = JSON.parse(savedSelectedJobs);
        setSelectedJobs(parsedJobs);
        console.log('✅ Puestos recuperados:', parsedJobs);
      }
    } catch (error) {
      console.log('⚠️ Error verificando autenticación:', error);
      // setIsAuthenticated(false);
    }
  }, []);

  // Filtrar puestos basado en el término de búsqueda
  const filteredJobPostings = jobPostings.filter((job) => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Buscar en todos los campos relevantes
    const searchableFields = [
      job.title,
      job.companyName,
      job.location,
      job.employmentType,
      job.experienceLevel,
      job.description,
      job.requirements,
      job.salary || '',
      job.benefits || ''
    ];
    
    return searchableFields.some(field => 
      field.toLowerCase().includes(searchLower)
    );
  });

  // Manejar selección de puestos
  const handleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  // Proceder con la postulación
  const handleProceedToApplication = () => {
    if (selectedJobs.length === 0) {
      alert('Por favor selecciona al menos un puesto');
      return;
    }
    
    console.log('Puestos seleccionados:', selectedJobs);
    // SIEMPRE mostrar opciones de autenticación (no importa si ya está logueado)
    setShowAuthOptions(true);
  };

  // Manejar navegación a login
  const handleLogin = () => {
    // Guardar los puestos seleccionados y sus datos completos
    console.log('🔄 Guardando puestos seleccionados:', selectedJobs);
    localStorage.setItem('selectedJobPostings', JSON.stringify(selectedJobs));

    // Guardar datos completos de los puestos seleccionados
    const selectedJobsData = jobPostings.filter(job => selectedJobs.includes(job.jobId));
    localStorage.setItem('selectedJobsData', JSON.stringify(selectedJobsData));

    // Guardar contexto de /aplicar para regresar después del login
    localStorage.setItem('redirectAfterAuth', '/completar-aplicaciones');
    localStorage.setItem('applicationContext', 'aplicar');

    console.log('🚀 Navegando a login desde /aplicar...');
    navigate('/login');
  };

  // Manejar navegación a registro
  const handleRegister = () => {
    // Guardar los puestos seleccionados y sus datos completos
    console.log('🔄 Guardando puestos seleccionados:', selectedJobs);
    localStorage.setItem('selectedJobPostings', JSON.stringify(selectedJobs));

    // Guardar datos completos de los puestos seleccionados
    const selectedJobsData = jobPostings.filter(job => selectedJobs.includes(job.jobId));
    localStorage.setItem('selectedJobsData', JSON.stringify(selectedJobsData));

    // Guardar contexto de /aplicar para regresar después del registro
    localStorage.setItem('redirectAfterAuth', '/completar-aplicaciones');
    localStorage.setItem('applicationContext', 'aplicar');

    console.log('🚀 Navegando a registro desde /aplicar...');
    navigate('/register/postulante');
  };

  // Manejar cambios en el formulario de aplicación
  // const handleApplicationDataChange = (field: keyof UserApplicationData, value: string) => {
  //   setUserApplicationData(prev => ({
  //     ...prev,
  //     [field]: value
  //   }));
  // };

  // Enviar la aplicación
  // const handleSubmitApplication = async () => {
  //   try {
  //     console.log('📤 Enviando aplicación con datos:', {
  //       userData: userApplicationData,
  //       selectedJobs: selectedJobs
  //     });
  //     alert(`¡Aplicación enviada exitosamente para ${selectedJobs.length} puesto(s)!`);
  //     localStorage.removeItem('selectedJobPostings');
  //     localStorage.removeItem('redirectAfterAuth');
  //     navigate('/aplicar');
  //   } catch (error) {
  //     console.error('❌ Error enviando aplicación:', error);
  //     alert('Error al enviar la aplicación. Por favor intenta de nuevo.');
  //   }
  // };

  // Volver a la selección de puestos
  // const handleBackToJobSelection = () => {
  //   setShowApplicationForm(false);
  //   setShowAuthOptions(false);
  // };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      {/* Main Content - Sin header */}
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200">
            {showAuthOptions ? (
              <h2 className="text-2xl font-bold text-gray-900 text-center">
                Autenticación requerida
              </h2>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Ofertas de Trabajo Disponibles
                  </h2>
                  <p className="text-gray-600">
                    Selecciona los puestos a los que deseas postular
                  </p>
                </div>
                {/* Search Input */}
                <div className="max-w-md mx-auto">
                  <input
                    type="text"
                    placeholder="Buscar por título, empresa, ubicación, salario..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-6">
          {showAuthOptions ? (
            // Mostrar opciones de autenticación
            <div className="flex flex-col items-center justify-center py-8 space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Antes de continuar, debes registrarte o iniciar sesión
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Has seleccionado {selectedJobs.length} puesto{selectedJobs.length > 1 ? 's' : ''}. 
                  Para continuar con tu postulación, necesitas una cuenta.
                </p>
              </div>
              
              <div className="flex flex-col space-y-4 w-full max-w-sm">
                <Button
                  onClick={handleLogin}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md transition-all"
                >
                  🔑 Iniciar Sesión
                </Button>
                <Button
                  onClick={handleRegister}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md transition-all"
                >
                  🆕 Crear Cuenta
                </Button>
                <div className="text-center">
                  <button
                    onClick={() => setShowAuthOptions(false)}
                    className="text-sm text-gray-600 hover:text-gray-800 underline transition-colors"
                  >
                    ← Volver a la selección de puestos
                  </button>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-sm text-gray-600">Cargando puestos...</span>
            </div>
          ) : filteredJobPostings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-600">
                {searchTerm.trim() 
                  ? `No se encontraron puestos que coincidan con "${searchTerm}"`
                  : 'No hay puestos activos disponibles en este momento.'
                }
              </p>
              {searchTerm.trim() && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
              {filteredJobPostings.map((job) => (
                <div
                  key={job.jobId}
                  className={`p-6 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedJobs.includes(job.jobId)
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => handleJobSelection(job.jobId)}
                >
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedJobs.includes(job.jobId)}
                      onChange={() => handleJobSelection(job.jobId)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{job.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 mb-3 text-sm text-gray-600">
                        <span className="font-medium">{job.companyName}</span>
                        <span>•</span>
                        <span>{job.location}</span>
                        <span>•</span>
                        <span>{job.employmentType}</span>
                        <span>•</span>
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">{job.experienceLevel}</span>
                      </div>
                      {job.salary && (
                        <p className="text-sm text-green-600 font-medium mb-2">
                          💰 {job.salary}
                        </p>
                      )}
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {job.description}
                      </p>
                      {job.requirements && (
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Requisitos:</span> {job.requirements}
                        </p>
                      )}
                      {job.benefits && (
                        <p className="text-xs text-blue-600 mt-2">
                          <span className="font-medium">Beneficios:</span> {job.benefits}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

          {/* Footer */}
          {!showAuthOptions && (
            <div className="px-6 py-6 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-sm text-gray-600">
                  {selectedJobs.length > 0 ? (
                    <span className="font-medium text-blue-600">
                      ✓ {selectedJobs.length} puesto{selectedJobs.length > 1 ? 's' : ''} seleccionado{selectedJobs.length > 1 ? 's' : ''}
                    </span>
                  ) : searchTerm.trim() ? (
                    `${filteredJobPostings.length} de ${jobPostings.length} puestos`
                  ) : (
                    `${jobPostings.length} puestos disponibles`
                  )}
                </div>
                <Button
                  onClick={handleProceedToApplication}
                  disabled={loading || selectedJobs.length === 0}
                  className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                    loading || selectedJobs.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                  }`}
                >
                  {loading ? 'Cargando...' : 'Continuar con la Postulación'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}