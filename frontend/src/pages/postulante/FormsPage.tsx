import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGraphQL } from '../../hooks/useGraphQL';
import { cognitoAuthService } from '../../services/cognitoAuthService';

export const FormsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    forms,
    formSubmissions,
    loading,
    error,
    fetchActiveForms,
    fetchMyFormSubmissions
  } = useGraphQL();

  const user = cognitoAuthService.getCurrentUser();

  // Load available forms and my submissions on mount
  useEffect(() => {
    fetchActiveForms();
    fetchMyFormSubmissions();
  }, [fetchActiveForms, fetchMyFormSubmissions]);

  // Check if form has been submitted by current user
  const hasSubmitted = (formId: string) => {
    return formSubmissions.some(submission => 
      submission.formId === formId && submission.applicantId === user?.userId
    );
  };

  // Get submission status for form
  const getSubmissionStatus = (formId: string) => {
    const submission = formSubmissions.find(sub => 
      sub.formId === formId && sub.applicantId === user?.userId
    );
    return submission?.status;
  };

  // Get status color and text
  const getStatusInfo = (formId: string, isExpired: boolean) => {
    if (isExpired) {
      return {
        color: 'text-red-600 bg-red-100',
        text: 'Expirado'
      };
    }

    const status = getSubmissionStatus(formId);
    switch (status) {
      case 'SUBMITTED':
        return {
          color: 'text-blue-600 bg-blue-100',
          text: 'Enviado'
        };
      case 'UNDER_REVIEW':
        return {
          color: 'text-yellow-600 bg-yellow-100',
          text: 'En Revisión'
        };
      case 'APPROVED':
        return {
          color: 'text-green-600 bg-green-100',
          text: 'Aprobado'
        };
      case 'REJECTED':
        return {
          color: 'text-red-600 bg-red-100',
          text: 'Rechazado'
        };
      case 'PENDING_INFO':
        return {
          color: 'text-orange-600 bg-orange-100',
          text: 'Información Pendiente'
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-100',
          text: 'Disponible'
        };
    }
  };

  // Check if user is postulante
  if (user?.role !== 'postulante') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600">Solo los postulantes pueden ver los formularios.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando formularios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => fetchActiveForms()} 
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Formularios Disponibles</h1>
              <p className="mt-2 text-gray-600">Completa los formularios requeridos para tu proceso de aplicación</p>
            </div>
            <button
              onClick={() => navigate('/postulante/dashboard')}
              className="text-gray-500 hover:text-gray-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al Dashboard
            </button>
          </div>
        </div>

        {/* Forms List */}
        {forms.length === 0 ? (
          <div className="bg-white shadow-sm rounded-lg p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay formularios disponibles</h3>
            <p className="text-gray-500 mb-4">Actualmente no hay formularios publicados para completar</p>
            <button
              onClick={() => fetchActiveForms()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
            >
              Actualizar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => {
              const isExpired = form.expiresAt && new Date(form.expiresAt) < new Date();
              const submitted = hasSubmitted(form.formId);
              const statusInfo = getStatusInfo(form.formId, !!isExpired);
              const canSubmit = !isExpired && (!submitted || getSubmissionStatus(form.formId) === 'PENDING_INFO');

              return (
                <div key={form.formId} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* Form Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{form.title}</h3>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                      </div>
                      
                      {form.isRequired && (
                        <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full ml-2">
                          Obligatorio
                        </span>
                      )}
                    </div>

                    {/* Form Description */}
                    {form.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{form.description}</p>
                    )}

                    {/* Form Meta */}
                    <div className="space-y-2 text-sm text-gray-500 mb-6">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {form.fields.length} campos
                      </div>
                      
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 6v6m-1 0h2m-1 0c1.21 0 2.21-.402 3-1M7 21c.79.598 1.79 1 3 1v-1c0-1.657-1.343-3-3-3s-3 1.343-3 3c0 .79.402 1.79 1 3z" />
                        </svg>
                        Creado: {new Date(form.createdAt).toLocaleDateString('es-ES')}
                      </div>
                      
                      {form.expiresAt && (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Expira: {new Date(form.expiresAt).toLocaleDateString('es-ES')}
                        </div>
                      )}
                    </div>

                    {/* Submission Info */}
                    {submitted && (
                      <div className="bg-gray-50 rounded-md p-3 mb-4">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-700">Ya enviaste este formulario</span>
                        </div>
                        {getSubmissionStatus(form.formId) === 'PENDING_INFO' && (
                          <p className="text-xs text-orange-600 mt-1">Se requiere información adicional</p>
                        )}
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      onClick={() => navigate(`/postulante/forms/${form.formId}`)}
                      disabled={!canSubmit}
                      className={`w-full py-2 px-4 rounded-md font-medium text-sm transition-colors ${
                        canSubmit
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isExpired 
                        ? 'Formulario Expirado'
                        : submitted && getSubmissionStatus(form.formId) !== 'PENDING_INFO'
                        ? 'Ver Respuestas'
                        : submitted && getSubmissionStatus(form.formId) === 'PENDING_INFO'
                        ? 'Completar Información'
                        : 'Completar Formulario'
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Required Forms Notice */}
        {forms.some(form => form.isRequired && !hasSubmitted(form.formId)) && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Formularios Obligatorios Pendientes
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Tienes formularios obligatorios por completar. Es necesario enviarlos para continuar con tu proceso de aplicación.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormsPage;