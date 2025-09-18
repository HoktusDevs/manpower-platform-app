import { useState, useEffect } from 'react';
import type { JobPosting, UserApplicationData, TabType } from '../types';

const mockSelectedJobs: JobPosting[] = [
  {
    jobId: 'job-001',
    title: 'Desarrollador Full Stack',
    description: 'Buscamos un desarrollador full stack con experiencia en React y Node.js.',
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

export const CompletarAplicacionesPage = () => {
  const [selectedJobs, setSelectedJobs] = useState<JobPosting[]>(mockSelectedJobs);
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
  const [loading, setLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Cargar datos mock del usuario
    const mockUserData = {
      nombre: 'Juan Pérez',
      rut: '12.345.678-9',
      email: 'juan.perez@email.com',
      telefono: '+56 9 1234 5678',
      direccion: 'Av. Providencia 123, Santiago',
      educacion: 'Ingeniería en Informática, Universidad de Chile'
    };
    setApplicationData(mockUserData);
  }, []);

  const handleInputChange = (field: keyof UserApplicationData, value: string): void => {
    setApplicationData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (jobId: string, newFiles: FileList | null): void => {
    if (newFiles) {
      setFiles(prev => ({ ...prev, [jobId]: Array.from(newFiles) }));
    }
  };

  const handleSubmit = async (): Promise<void> => {
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

      // Simular envío de aplicaciones
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mostrar toast de éxito
      setSuccessMessage(`¡${selectedJobs.length} aplicaciones enviadas exitosamente!`);
      setShowSuccessToast(true);

      // Ocultar toast después de 3 segundos
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 3000);

      // Limpiar estado local
      setSelectedJobs([]);
      setFiles({});

      console.log('✅ Aplicaciones enviadas exitosamente');
    } catch (error) {
      console.error('❌ Error enviando aplicaciones:', error);
      alert('Error al enviar aplicaciones. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (): void => {
    setSelectedJobs([]);
    setFiles({});
  };

  return (
    <div className="h-full bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Completar Aplicaciones</h1>
            <p className="text-sm text-gray-600 mt-1">
              Aplica a {selectedJobs.length} puesto{selectedJobs.length > 1 ? 's' : ''} con un solo formulario
            </p>
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                <span className="font-medium">Proceso optimizado:</span> Completa tu información una sola vez y se aplicará automáticamente a todos los puestos seleccionados.
                {selectedJobs.length > 1 && ' Sin repetir datos, sin perder tiempo.'}
              </p>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('puestos')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'puestos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Puestos Seleccionados ({selectedJobs.length})
              </button>
              <button
                onClick={() => setActiveTab('informacion')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'informacion'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Información Personal
              </button>
              <button
                onClick={() => setActiveTab('documentos')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documentos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Documentos
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Tab: Puestos Seleccionados */}
            {activeTab === 'puestos' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Puestos a los que postularás</h2>
                  <p className="text-sm text-gray-600">
                    <strong>Optimización inteligente:</strong> Completarás la información una sola vez para todos estos puestos.
                    Los datos comunes se aplicarán automáticamente a todas tus postulaciones.
                  </p>
                </div>
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Información Personal */}
            {activeTab === 'informacion' && (
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Educación</label>
                    <textarea
                      value={applicationData.educacion}
                      onChange={(e) => handleInputChange('educacion', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe tu formación académica..."
                    />
                  </div>
                </div>
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    ✨ <strong>Ahorro de tiempo:</strong> Esta información se aplicará automáticamente a todos los puestos seleccionados.
                  </p>
                </div>
              </div>
            )}

            {/* Tab: Documentos */}
            {activeTab === 'documentos' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Documentos para tus postulaciones</h2>
                  <p className="text-sm text-gray-600">
                    📎 <strong>Documentos únicos:</strong> Sube documentos específicos para cada puesto o documentos generales que se aplicarán a todos.
                  </p>
                </div>

                <div className="space-y-6">
                  {selectedJobs.map((job) => (
                    <div key={job.jobId} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{job.title}</h3>
                      <p className="text-sm text-gray-600 mb-4">{job.companyName} - {job.location}</p>

                      <div className="p-3 bg-gray-50 rounded-md">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Documentos para este puesto (CV, carta de presentación, portafolio, etc.)
                        </label>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange(job.jobId, e.target.files)}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {files[job.jobId] && files[job.jobId]!.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm text-green-600 font-medium">
                              ✅ {files[job.jobId]!.length} archivo(s) seleccionado(s):
                            </p>
                            <ul className="text-sm text-gray-600 mt-2 space-y-1">
                              {files[job.jobId]!.map((file, fileIdx) => (
                                <li key={fileIdx} className="flex items-center">
                                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
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
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || selectedJobs.length === 0 || !applicationData.nombre || !applicationData.email}
              className={`px-6 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                loading || selectedJobs.length === 0 || !applicationData.nombre || !applicationData.email
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {loading ? 'Enviando...' : selectedJobs.length === 0 ? 'Sin aplicaciones por enviar' : `Enviar ${selectedJobs.length} Aplicación(es)`}
            </button>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{successMessage}</p>
            </div>
            <button
              onClick={() => setShowSuccessToast(false)}
              className="flex-shrink-0 text-white hover:text-gray-200"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};