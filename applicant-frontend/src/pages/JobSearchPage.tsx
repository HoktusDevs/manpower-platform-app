import { useState } from 'react';
import type { JobPosting } from '../types';

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
    title: 'Diseñador UX/UI',
    description: 'Diseñador creativo para interfaces de usuario modernas e intuitivas.',
    requirements: 'Figma, Adobe Creative Suite, experiencia en diseño web responsivo.',
    location: 'Barcelona, España',
    employmentType: 'Tiempo completo',
    companyName: 'Design Studio Pro',
    salary: '35.000€ - 50.000€ anuales',
    benefits: 'Horario flexible, formación continua',
    experienceLevel: 'Junior'
  }
];

export const JobSearchPage = () => {
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredJobPostings = mockJobPostings.filter((job) => {
    if (!searchTerm.trim()) return true;

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
      field.toLowerCase().includes(searchLower)
    );
  });

  const handleJobSelection = (jobId: string) => {
    setSelectedJobs(prev =>
      prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const handleProceedToApplication = () => {
    if (selectedJobs.length === 0) {
      alert('Por favor selecciona al menos un puesto');
      return;
    }
    console.log('Proceeding with selected jobs:', selectedJobs);
  };

  return (
    <div className="h-full bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
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

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedJobs.length > 0 ? (
                  <span className="font-medium text-blue-600">
                    ✓ {selectedJobs.length} puesto{selectedJobs.length > 1 ? 's' : ''} seleccionado{selectedJobs.length > 1 ? 's' : ''}
                  </span>
                ) : searchTerm.trim() ? (
                  `${filteredJobPostings.length} de ${mockJobPostings.length} puestos`
                ) : (
                  `${mockJobPostings.length} puestos disponibles`
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