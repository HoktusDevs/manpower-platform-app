import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../core-ui';
import { cognitoAuthService } from '../../services/cognitoAuthService';

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
  const [showModal] = useState(true);
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
        
        // SOLUCIÓN TEMPORAL: Mientras se configura el backend para acceso público,
        // usamos datos de ejemplo que simulan puestos reales
        console.log('⚠️ Usando datos temporales mientras se configura el acceso público al GraphQL');
        
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
        
        // TODO: Una vez que el backend esté configurado para acceso público, 
        // reemplazar con la llamada real a GraphQL
        /*
        const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_URL;
        const query = `
          query GetActiveJobPostings {
            getActiveJobPostings {
              jobId title description requirements location 
              employmentType companyName salary benefits experienceLevel
            }
          }
        `;
        
        const response = await fetch(graphqlEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': import.meta.env.VITE_GRAPHQL_API_KEY || ''
          },
          body: JSON.stringify({ query })
        });
        
        const result = await response.json();
        const activeJobs = result.data?.getActiveJobPostings || [];
        setJobPostings(activeJobs);
        */
        
      } catch (error) {
        console.error('❌ Error cargando puestos:', error);
        setJobPostings([]);
      } finally {
        setLoading(false);
      }
    };

    if (showModal) {
      loadActiveJobPostings();
    }
  }, [showModal]);

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
    
    localStorage.setItem('redirectAfterAuth', '/completar-aplicaciones'); // Redirigir después del login
    console.log('🚀 Navegando a login...');
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
    
    localStorage.setItem('redirectAfterAuth', '/completar-aplicaciones'); // Redirigir después del registro
    console.log('🚀 Navegando a registro...');
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

  if (!showModal) {
    return (
      <div className="container mt-4">
        <h2>Formulario de Postulación</h2>
        <p>Aquí iría el formulario de postulación para los puestos seleccionados.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          {showAuthOptions ? (
            <h2 className="text-lg text-gray-900 text-center">
              Autenticación requerida
            </h2>
          ) : (
            <>
              <h2 className="text-lg text-gray-900 mb-3">
                Selecciona el o los puestos a los que deseas postular
              </h2>
              {/* Input field */}
              <input
                type="text"
                placeholder="Buscar por título, empresa, ubicación, salario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </>
          )}
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-hidden px-6 py-4">
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
              
              <div className="flex flex-col space-y-3 w-full max-w-sm">
                <Button
                  onClick={handleLogin}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Iniciar Sesión
                </Button>
                <Button
                  onClick={handleRegister}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Registrarse
                </Button>
                <button
                  onClick={() => setShowAuthOptions(false)}
                  className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Volver a la selección de puestos
                </button>
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
            <div className="h-60 overflow-y-auto space-y-3 pr-2">
              {filteredJobPostings.map((job) => (
                <div 
                  key={job.jobId} 
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedJobs.includes(job.jobId) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleJobSelection(job.jobId)}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedJobs.includes(job.jobId)}
                      onChange={() => handleJobSelection(job.jobId)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">{job.title}</h3>
                      <p className="text-xs text-gray-600 mb-1">
                        <span className="font-medium">{job.companyName}</span> - {job.location}
                      </p>
                      <p className="text-xs text-gray-500 mb-1">
                        {job.employmentType} | {job.experienceLevel}
                      </p>
                      {job.salary && (
                        <p className="text-xs text-green-600 mb-1">
                          <span className="font-medium">Salario:</span> {job.salary}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {job.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        {!showAuthOptions && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedJobs.length > 0 ? (
              `${selectedJobs.length} puesto(s) seleccionado(s)`
            ) : searchTerm.trim() ? (
              `${filteredJobPostings.length} de ${jobPostings.length} puestos`
            ) : (
              `${jobPostings.length} puestos disponibles`
            )}
          </div>
          <Button
            onClick={handleProceedToApplication}
            disabled={loading || selectedJobs.length === 0}
            className={`px-6 py-2 rounded-md font-medium ${
              loading || selectedJobs.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Continuar Postulación
          </Button>
        </div>
        )}
      </div>
    </div>
  );
}