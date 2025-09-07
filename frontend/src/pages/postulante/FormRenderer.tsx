import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGraphQL } from '../../hooks/useGraphQL';
import { cognitoAuthService } from '../../services/cognitoAuthService';
import type { 
  Form, 
  FormField, 
  SubmitFormInput,
  SubmitFieldResponseInput 
} from '../../services/graphqlService';

export const FormRenderer: React.FC = () => {
  const navigate = useNavigate();
  const { formId } = useParams<{ formId: string }>();
  const {
    loading,
    error,
    fetchForm,
    submitForm
  } = useGraphQL();

  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const user = cognitoAuthService.getCurrentUser();

  const loadForm = useCallback(async () => {
    if (!formId) return;
    
    try {
      const formData = await fetchForm(formId);
      if (formData) {
        setForm(formData);
        // Initialize responses object
        const initialResponses: Record<string, string> = {};
        formData.fields.forEach(field => {
          initialResponses[field.fieldId] = field.defaultValue || '';
        });
        setResponses(initialResponses);
      } else {
        setSubmitError('Formulario no encontrado');
      }
    } catch (err) {
      console.error('Error loading form:', err);
      setSubmitError('Error al cargar el formulario');
    }
  }, [formId, fetchForm]);

  // Load form on mount
  useEffect(() => {
    if (formId) {
      loadForm();
    }
  }, [formId, loadForm]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form || !formId) return;
    
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Validate required fields
      const missingRequired = form.fields
        .filter(field => field.required && !responses[field.fieldId]?.trim())
        .map(field => field.label);

      if (missingRequired.length > 0) {
        setSubmitError(`Campos requeridos faltantes: ${missingRequired.join(', ')}`);
        setSubmitting(false);
        return;
      }

      // Prepare submission data
      const fieldResponses: SubmitFieldResponseInput[] = form.fields
        .filter(field => responses[field.fieldId])
        .map(field => ({
          fieldId: field.fieldId,
          value: responses[field.fieldId]
        }));

      const submitInput: SubmitFormInput = {
        formId,
        responses: fieldResponses
      };

      await submitForm(submitInput);
      
      // Navigate back with success message
      navigate('/postulante/dashboard', { 
        state: { 
          message: 'Formulario enviado exitosamente',
          type: 'success' 
        }
      });

    } catch (err) {
      console.error('Error submitting form:', err);
      setSubmitError('Error al enviar el formulario. Por favor intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle field value change
  const handleFieldChange = (fieldId: string, value: string | string[]) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: Array.isArray(value) ? value.join(',') : value
    }));
  };

  // Render individual field
  const renderField = (field: FormField) => {
    const fieldValue = responses[field.fieldId] || '';
    const fieldError = field.required && !fieldValue.trim();

    switch (field.type) {
      case 'TEXT':
        return (
          <input
            type="text"
            id={field.fieldId}
            value={fieldValue}
            onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
            required={field.required}
          />
        );

      case 'TEXTAREA':
        return (
          <textarea
            id={field.fieldId}
            value={fieldValue}
            onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
            required={field.required}
          />
        );

      case 'EMAIL':
        return (
          <input
            type="email"
            id={field.fieldId}
            value={fieldValue}
            onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
            required={field.required}
          />
        );

      case 'PHONE':
        return (
          <input
            type="tel"
            id={field.fieldId}
            value={fieldValue}
            onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
            required={field.required}
          />
        );

      case 'NUMBER':
        return (
          <input
            type="number"
            id={field.fieldId}
            value={fieldValue}
            onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
            required={field.required}
            min={field.validation?.minValue}
            max={field.validation?.maxValue}
          />
        );

      case 'DATE':
        return (
          <input
            type="date"
            id={field.fieldId}
            value={fieldValue}
            onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
            required={field.required}
          />
        );

      case 'SELECT':
        return (
          <select
            id={field.fieldId}
            value={fieldValue}
            onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
            required={field.required}
          >
            <option value="">
              {field.placeholder || 'Selecciona una opción'}
            </option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'RADIO':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center">
                <input
                  type="radio"
                  id={`${field.fieldId}-${index}`}
                  name={field.fieldId}
                  value={option}
                  checked={fieldValue === option}
                  onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  required={field.required}
                />
                <label htmlFor={`${field.fieldId}-${index}`} className="ml-2 text-sm text-gray-700">
                  {option}
                </label>
              </div>
            ))}
          </div>
        );

      case 'CHECKBOX': {
        const checkedOptions = fieldValue.split(',').filter(v => v);
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center">
                <input
                  type="checkbox"
                  id={`${field.fieldId}-${index}`}
                  value={option}
                  checked={checkedOptions.includes(option)}
                  onChange={(e) => {
                    const currentOptions = checkedOptions;
                    if (e.target.checked) {
                      handleFieldChange(field.fieldId, [...currentOptions, option]);
                    } else {
                      handleFieldChange(field.fieldId, currentOptions.filter(opt => opt !== option));
                    }
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor={`${field.fieldId}-${index}`} className="ml-2 text-sm text-gray-700">
                  {option}
                </label>
              </div>
            ))}
          </div>
        );
      }

      case 'FILE_UPLOAD':
        return (
          <div>
            <input
              type="file"
              id={field.fieldId}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // For now, just store the file name
                  // In a real implementation, you'd upload to S3 and store the key
                  handleFieldChange(field.fieldId, file.name);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={field.required}
            />
            <p className="text-xs text-gray-500 mt-1">
              Nota: La funcionalidad de subida de archivos estará disponible próximamente
            </p>
          </div>
        );

      case 'RATING':
        return (
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleFieldChange(field.fieldId, rating.toString())}
                className={`w-8 h-8 rounded-full border-2 transition-colors ${
                  parseInt(fieldValue) >= rating
                    ? 'bg-yellow-400 border-yellow-400 text-white'
                    : 'border-gray-300 text-gray-400 hover:border-yellow-400'
                }`}
              >
                ⭐
              </button>
            ))}
            <span className="text-sm text-gray-600 ml-2">
              {fieldValue ? `${fieldValue}/5` : 'Sin calificación'}
            </span>
          </div>
        );

      case 'URL':
        return (
          <input
            type="url"
            id={field.fieldId}
            value={fieldValue}
            onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
            placeholder={field.placeholder || 'https://ejemplo.com'}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
            required={field.required}
          />
        );

      default:
        return (
          <input
            type="text"
            id={field.fieldId}
            value={fieldValue}
            onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
            required={field.required}
          />
        );
    }
  };

  // Check if user is postulante
  if (user?.role !== 'postulante') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600">Solo los postulantes pueden completar formularios.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (error || submitError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error || submitError}</p>
          <button 
            onClick={() => navigate('/postulante/dashboard')} 
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Formulario No Encontrado</h1>
          <p className="text-gray-600">El formulario solicitado no existe o no está disponible.</p>
          <button 
            onClick={() => navigate('/postulante/dashboard')} 
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-8 p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/postulante/dashboard')}
              className="text-gray-500 hover:text-gray-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al Dashboard
            </button>
            
            {form.isRequired && (
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                Obligatorio
              </span>
            )}
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{form.title}</h1>
          {form.description && (
            <p className="text-gray-600">{form.description}</p>
          )}
          
          <div className="mt-4 text-sm text-gray-500">
            {form.fields.length} campos • Creado: {new Date(form.createdAt).toLocaleDateString('es-ES')}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-6">
            {form.fields
              .sort((a, b) => a.order - b.order)
              .map((field) => {
                const fieldError = field.required && !responses[field.fieldId]?.trim();
                
                return (
                  <div key={field.fieldId} className="space-y-2">
                    <label 
                      htmlFor={field.fieldId} 
                      className="block text-sm font-medium text-gray-700"
                    >
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {field.description && (
                      <p className="text-xs text-gray-500">{field.description}</p>
                    )}
                    
                    {renderField(field)}
                    
                    {fieldError && (
                      <p className="text-sm text-red-600">Este campo es obligatorio</p>
                    )}
                    
                    {field.validation?.customMessage && (
                      <p className="text-xs text-gray-500">{field.validation.customMessage}</p>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Submit Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            {submitError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{submitError}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/postulante/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {submitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                {submitting ? 'Enviando...' : 'Enviar Formulario'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormRenderer;