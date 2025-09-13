import { useState, useEffect } from 'react';
import { Button } from '../../core-ui';
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

export function PostulacionPage() {
  const [showModal, setShowModal] = useState(true);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar puestos activos al montar el componente
  useEffect(() => {
    const loadActiveJobPostings = async () => {
      try {
        setLoading(true);
        
        // Para la ruta pública /aplicar, intentamos inicializar GraphQL con AWS_IAM para acceso público
        // Verificar si GraphQL está inicializado, si no, usar AWS_IAM para acceso público
        if (!graphqlService.isInitialized()) {
          const config = {
            graphqlEndpoint: import.meta.env.VITE_GRAPHQL_URL || 'https://xwewxrgy4rgedhyhc6bkjojg5i.appsync-api.us-east-1.amazonaws.com/graphql',
            region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
            authenticationType: 'AWS_IAM' as const,
            identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID || 'us-east-1:fb4db648-574b-42fd-b1d4-e7b02e2cd0cb'
          };
          await graphqlService.initialize(config);
        }
        
        // Intentar cargar los puestos activos usando el servicio GraphQL
        const activeJobs = await graphqlService.getActiveJobPostings();
        setJobPostings(activeJobs || []);
      } catch (error) {
        console.error('Error cargando puestos:', error);
        // Si falla, mostrar mensaje de error pero no romper la UI
        setJobPostings([]);
      } finally {
        setLoading(false);
      }
    };

    if (showModal) {
      loadActiveJobPostings();
    }
  }, [showModal]);

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
    
    // TODO: Redirigir al formulario de postulación con los puestos seleccionados
    console.log('Puestos seleccionados:', selectedJobs);
    setShowModal(false);
  };

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
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Selecciona el o los puestos a los que deseas postular
          </h2>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando puestos...</span>
            </div>
          ) : jobPostings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No hay puestos activos disponibles en este momento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobPostings.map((job) => (
                <div 
                  key={job.jobId} 
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
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
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{job.title}</h3>
                      <p className="text-gray-700 mb-2">
                        <span className="font-medium">{job.companyName}</span> - {job.location}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        {job.employmentType} | {job.experienceLevel}
                      </p>
                      {job.salary && (
                        <p className="text-sm text-green-600 mb-2">
                          <span className="font-medium">Salario:</span> {job.salary}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 line-clamp-2">
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
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedJobs.length > 0 && `${selectedJobs.length} puesto(s) seleccionado(s)`}
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
      </div>
    </div>
  );
}