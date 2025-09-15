import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../core-ui';
import { cognitoAuthService } from '../../services/cognitoAuthService';
import { publicGraphqlService } from '../../services/publicGraphqlService';
import { graphqlService } from '../../services/graphqlService';

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

export const JobSearchPage = () => {
  const navigate = useNavigate();
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userApplications, setUserApplications] = useState<string[]>([]);

  // Cargar todos los job postings usando getAllJobPostings
  useEffect(() => {
    const loadAllJobPostings = async () => {
      try {
        setLoading(true);
        console.log('🔄 Cargando todos los job postings con getAllJobPostings...');

        // Usar getAllJobPostings para consistencia con /aplicar
        const realJobPostings = await publicGraphqlService.getAllJobPostings(undefined, 20);

        console.log('✅ Job postings cargados desde GraphQL:', realJobPostings.length);
        setJobPostings(realJobPostings);

      } catch (error) {
        console.error('❌ Error cargando job postings:', error);

        // Fallback a datos mock solo si falla la API
        console.log('⚠️ Usando datos mock como fallback');
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
          }
        ];
        setJobPostings(mockJobPostings);
      } finally {
        setLoading(false);
      }
    };

    loadAllJobPostings();
  }, []);

  // Cargar aplicaciones del usuario para filtrar trabajos ya aplicados
  useEffect(() => {
    const loadUserApplications = async () => {
      try {
        const hasTokens = localStorage.getItem('cognito_id_token') || localStorage.getItem('cognito_access_token');

        if (hasTokens && cognitoAuthService.isAuthenticated()) {
          console.log('🔄 Cargando aplicaciones del usuario...');
          const applications = await graphqlService.getAllApplications();
          const appliedJobIds = applications.map(app => app.jobId);
          setUserApplications(appliedJobIds);
          console.log('✅ Jobs ya aplicados:', appliedJobIds);
        }
      } catch (error) {
        console.error('❌ Error cargando aplicaciones del usuario:', error);
      }
    };

    loadUserApplications();
  }, []);

  // Verificar autenticación y cargar datos del usuario para reutilización
  useEffect(() => {
    console.log('🔄 Verificando estado de autenticación...');

    try {
      // Solo verificar autenticación si hay tokens guardados
      const hasTokens = localStorage.getItem('cognito_id_token') || localStorage.getItem('cognito_access_token');

      if (hasTokens) {
        const authenticated = cognitoAuthService.isAuthenticated();
        console.log('🔍 Estado de autenticación:', authenticated);

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
    }
  }, []);

  // Filtrar puestos basado en el término de búsqueda y excluir trabajos ya aplicados
  const filteredJobPostings = jobPostings.filter((job) => {
    // Excluir trabajos a los que el usuario ya aplicó
    if (userApplications.includes(job.jobId)) {
      return false;
    }

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

  // Proceder con la postulación - navegar a completar aplicaciones
  const handleProceedToApplication = () => {
    if (selectedJobs.length === 0) {
      alert('Por favor selecciona al menos un puesto');
      return;
    }

    console.log('🔄 Guardando puestos seleccionados:', selectedJobs);
    localStorage.setItem('selectedJobPostings', JSON.stringify(selectedJobs));

    // Guardar datos completos de los puestos seleccionados
    const selectedJobsData = jobPostings.filter(job => selectedJobs.includes(job.jobId));
    localStorage.setItem('selectedJobsData', JSON.stringify(selectedJobsData));

    // Navegar a completar aplicaciones dentro del layout postulante
    navigate('/postulante/completar-aplicaciones');
  };

  return (
    <div className="h-full bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="text-center mb-4">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Cargando puestos...</span>
              </div>
            ) : filteredJobPostings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  {searchTerm.trim()
                    ? `No se encontraron puestos que coincidan con "${searchTerm}"`
                    : 'No hay puestos activos disponibles en este momento.'
                  }
                </p>
                {searchTerm.trim() && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJobPostings.map((job) => (
                  <div
                    key={job.jobId}
                    className={`p-6 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedJobs.includes(job.jobId)
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300'
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
                        className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{job.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 mb-3 text-sm text-gray-600">
                          <span className="font-medium">{job.companyName}</span>
                          <span>•</span>
                          <span>{job.location}</span>
                          <span>•</span>
                          <span>{job.employmentType}</span>
                          <span>•</span>
                          <span className="bg-gray-100 px-2 py-1 rounded text-sm">{job.experienceLevel}</span>
                        </div>
                        {job.salary && (
                          <p className="text-sm text-green-600 font-medium mb-2">
                            💰 {job.salary}
                          </p>
                        )}
                        <p className="text-gray-700 mb-3 line-clamp-2">
                          {job.description}
                        </p>
                        {job.requirements && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            <span className="font-medium">Requisitos:</span> {job.requirements}
                          </p>
                        )}
                        {job.benefits && (
                          <p className="text-sm text-blue-600 line-clamp-2">
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
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
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
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  loading || selectedJobs.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
              >
                {loading ? 'Cargando...' : 'Continuar con la Postulación'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};