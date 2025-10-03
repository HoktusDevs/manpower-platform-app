import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { JobPosting } from '../types';
import { jobsService } from '../services/jobsService';
import { useApplications } from '../hooks';

export const AplicarPage = () => {
  const navigate = useNavigate();
  const { data: applications = [] } = useApplications();
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobsLoaded, setJobsLoaded] = useState(false);

  // Calcular jobs aplicados desde las aplicaciones
  const appliedJobs = useMemo(() => {
    return new Set(applications.map(app => app.jobId));
  }, [applications]);

  // Cargar jobs al montar el componente (solo una vez)
  useEffect(() => {
    if (jobsLoaded) return; // Evitar llamadas duplicadas por React Strict Mode
    
    const loadJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Obteniendo empleos disponibles...');
        const response = await jobsService.getAllJobs();
        
        if (response.success) {
          if (response.jobs && response.jobs.length > 0) {
            setJobPostings(response.jobs);
            console.log(`Cargados ${response.jobs.length} empleos`);
            // No mostrar jobs automáticamente, solo cuando el usuario busque
          } else {
            console.log('No hay empleos disponibles');
            setJobPostings([]);
            setError('No hay empleos disponibles en este momento. Por favor intenta más tarde.');
          }
        } else {
          console.error('Error en respuesta del servicio:', response.message);
          setError(response.message || 'Error al cargar empleos');
        }
      } catch (err) {
        console.error('Error loading jobs:', err);
        setError(`Error de conexión al cargar empleos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      } finally {
        setLoading(false);
        setJobsLoaded(true);
      }
    };
    loadJobs();
  }, [jobsLoaded]);

  // Filtrar jobs basado en el término de búsqueda
  const filteredJobPostings = jobPostings.filter((job) => {
    if (!searchTerm.trim()) return false; // Solo mostrar jobs si hay un término de búsqueda
    
    const searchLower = searchTerm.toLowerCase();
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
      field && field.toLowerCase().includes(searchLower)
    );
  });


  const handleJobSelection = (jobId: string) => {
    // No permitir seleccionar jobs ya postulados
    if (appliedJobs.has(jobId)) {
      return;
    }
    
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const handleProceedToApplication = () => {
    if (selectedJobs.length === 0) {
      return;
    }
    
    // Obtener datos completos de los jobs seleccionados
    const selectedJobData = jobPostings.filter(job => selectedJobs.includes(job.jobId));
    
    console.log('Navegando a completar aplicaciones con jobs:', selectedJobData);
    
    // Navegar a completar aplicaciones con los jobs seleccionados
    navigate('/completar-aplicaciones', { 
      state: { 
        selectedJobs: selectedJobData,
        fromAplicar: true 
      } 
    });
  };

  // Mostrar loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando empleos disponibles...</p>
        </div>
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-100">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar empleos</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Ofertas de Trabajo Disponibles
              </h2>
              <p className="text-gray-600">
                Selecciona los puestos a los que deseas postular
              </p>
            </div>
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

          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {filteredJobPostings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  {searchTerm.trim()
                    ? `No se encontraron puestos que coincidan con "${searchTerm}"`
                    : 'Escribe algo en el campo de búsqueda para encontrar empleos disponibles.'
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
                {filteredJobPostings.map((job) => {
                  const isApplied = appliedJobs.has(job.jobId);
                  const isSelected = selectedJobs.includes(job.jobId);
                  
                  return (
                    <div
                      key={job.jobId}
                      className={`p-6 border rounded-lg transition-all ${
                        isApplied
                          ? 'border-green-300 bg-green-50 cursor-not-allowed opacity-75'
                          : isSelected
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300 cursor-pointer hover:shadow-md'
                          : 'border-gray-200 hover:border-blue-300 cursor-pointer hover:shadow-md'
                      }`}
                      onClick={() => !isApplied && handleJobSelection(job.jobId)}
                    >
                      <div className="flex items-start space-x-4">
                        {isApplied ? (
                          <div className="mt-1 h-5 w-5 flex items-center justify-center">
                            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleJobSelection(job.jobId)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                            <div className="flex items-center gap-2">
                              {job.status === 'PUBLISHED' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Activo
                                </span>
                              )}
                              {job.status === 'PAUSED' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Pausado
                                </span>
                              )}
                              {job.status === 'CLOSED' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Cerrado
                                </span>
                              )}
                              {isApplied && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Ya postulado
                                </span>
                              )}
                            </div>
                          </div>
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
                          {job.schedule && (
                            <p className="text-sm text-purple-600 line-clamp-2">
                              <span className="font-medium">Horario:</span> {job.schedule}
                            </p>
                          )}
                          {job.expiresAt && (
                            <p className="text-sm text-orange-600 line-clamp-2">
                              <span className="font-medium">Expira:</span> {new Date(job.expiresAt).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          )}
                          {job.requiredDocuments && job.requiredDocuments.length > 0 && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Documentos requeridos:</span>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                {job.requiredDocuments.map((doc, index) => (
                                  <li key={index} className="text-xs">{doc}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedJobs.length > 0 ? (
                  <span className="font-medium text-blue-600">
                    ✓ {selectedJobs.length} puesto{selectedJobs.length > 1 ? 's' : ''} seleccionado{selectedJobs.length > 1 ? 's' : ''}
                  </span>
                ) : searchTerm.trim() ? (
                  `${filteredJobPostings.length} de ${jobPostings.length} puestos encontrados`
                ) : (
                  `${jobPostings.length} puestos disponibles - busca para verlos`
                )}
              </div>
              <button
                onClick={handleProceedToApplication}
                disabled={selectedJobs.length === 0}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  selectedJobs.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
              >
                Continuar con la Postulación
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
