import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useGraphQL } from '../../hooks/useGraphQL';
import { FieldTemplateSelector } from '../../components/Forms/FieldTemplateSelector';
import type { 
  Form, 
  CreateFormInput, 
  CreateFormFieldInput 
} from '../../services/graphqlService';

const fieldTypeOptions = [
  { value: 'TEXT', label: 'Texto' },
  { value: 'TEXTAREA', label: 'Área de Texto' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Teléfono' },
  { value: 'NUMBER', label: 'Número' },
  { value: 'DATE', label: 'Fecha' },
  { value: 'SELECT', label: 'Selección' },
  { value: 'RADIO', label: 'Opción Múltiple' },
  { value: 'CHECKBOX', label: 'Casillas de Verificación' },
  { value: 'FILE_UPLOAD', label: 'Subir Archivo' },
  { value: 'RATING', label: 'Calificación' },
  { value: 'URL', label: 'URL' }
] as const;

export const EnhancedFormsManager: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { 
    forms, 
    loading, 
    error, 
    fetchAllForms, 
    createForm, 
    updateForm, 
    deleteForm, 
    publishForm, 
    pauseForm,
    isGraphQLAvailable 
  } = useGraphQL();
  
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateFormInput>>({
    title: '',
    description: '',
    fields: [],
    isRequired: false
  });
  const [editingField, setEditingField] = useState<CreateFormFieldInput | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [fieldData, setFieldData] = useState<Partial<CreateFormFieldInput>>({
    type: 'TEXT',
    label: '',
    required: false,
    options: [],
    order: 0
  });


  // Load forms on mount (only when auth and GraphQL are ready)
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin' && isGraphQLAvailable()) {
      fetchAllForms();
    }
  }, [fetchAllForms, isAuthenticated, user, isGraphQLAvailable]);

  // Handle creating new form
  const handleCreateForm = () => {
    setFormData({
      title: '',
      description: '',
      fields: [],
      isRequired: false
    });
    setSelectedForm(null);
    setShowFormBuilder(true);
  };

  // Handle editing existing form
  const handleEditForm = (form: Form) => {
    setSelectedForm(form);
    setFormData({
      title: form.title,
      description: form.description || '',
      fields: form.fields.map(field => ({
        type: field.type,
        label: field.label,
        placeholder: field.placeholder,
        required: field.required,
        options: field.options || [],
        order: field.order,
        description: field.description,
        defaultValue: field.defaultValue,
        validation: field.validation
      })),
      isRequired: form.isRequired
    });
    setShowFormBuilder(true);
  };

  // Handle saving form
  const handleSaveForm = async () => {
    if (!formData.title || !formData.fields) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    const formInput: CreateFormInput = {
      title: formData.title,
      description: formData.description || '',
      fields: formData.fields,
      isRequired: formData.isRequired || false
    };

    try {
      if (selectedForm) {
        // Update existing form
        await updateForm({
          formId: selectedForm.formId,
          ...formInput
        });
      } else {
        // Create new form
        await createForm(formInput);
      }
      
      setShowFormBuilder(false);
      setSelectedForm(null);
      fetchAllForms(); // Refresh forms list
    } catch (err) {
      console.error('Error saving form:', err);
      alert('Error al guardar el formulario');
    }
  };

  // Handle deleting form
  const handleDeleteForm = async (formId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este formulario?')) {
      return;
    }

    try {
      await deleteForm(formId);
      fetchAllForms(); // Refresh forms list
    } catch (err) {
      console.error('Error deleting form:', err);
      alert('Error al eliminar el formulario');
    }
  };

  // Handle publishing form
  const handlePublishForm = async (formId: string) => {
    try {
      await publishForm(formId);
      fetchAllForms(); // Refresh forms list
    } catch (err) {
      console.error('Error publishing form:', err);
      alert('Error al publicar el formulario');
    }
  };

  // Handle pausing form
  const handlePauseForm = async (formId: string) => {
    try {
      await pauseForm(formId);
      fetchAllForms(); // Refresh forms list
    } catch (err) {
      console.error('Error pausing form:', err);
      alert('Error al pausar el formulario');
    }
  };

  // Handle adding field
  const handleAddField = () => {
    setEditingField(null);
    setFieldData({
      type: 'TEXT',
      label: '',
      required: false,
      options: [],
      order: (formData.fields?.length || 0) + 1
    });
    setShowFieldEditor(true);
  };

  // Handle editing field
  const handleEditField = (field: CreateFormFieldInput) => {
    setEditingField(field);
    setFieldData({
      type: field.type,
      label: field.label,
      placeholder: field.placeholder,
      required: field.required,
      options: field.options || [],
      order: field.order,
      description: field.description,
      defaultValue: field.defaultValue,
      validation: field.validation
    });
    setShowFieldEditor(true);
  };

  // Handle saving field
  const handleSaveField = () => {
    if (!fieldData.label) {
      alert('El nombre del campo es requerido');
      return;
    }

    const newField: CreateFormFieldInput = {
      type: fieldData.type!,
      label: fieldData.label,
      placeholder: fieldData.placeholder,
      required: fieldData.required || false,
      options: fieldData.options || [],
      order: fieldData.order || 1,
      description: fieldData.description,
      defaultValue: fieldData.defaultValue,
      validation: fieldData.validation
    };

    if (editingField) {
      // Update existing field
      setFormData(prev => ({
        ...prev,
        fields: prev.fields?.map(f => 
          f.order === editingField.order ? newField : f
        ) || []
      }));
    } else {
      // Add new field
      setFormData(prev => ({
        ...prev,
        fields: [...(prev.fields || []), newField]
      }));
    }

    setShowFieldEditor(false);
    setEditingField(null);
  };

  // Handle adding multiple fields from templates
  const handleAddFieldsFromTemplate = (newFields: CreateFormFieldInput[]) => {
    setFormData(prev => ({
      ...prev,
      fields: [...(prev.fields || []), ...newFields]
    }));
  };

  // Handle deleting field
  const handleDeleteField = (order: number) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields?.filter(f => f.order !== order) || []
    }));
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'text-green-600 bg-green-100';
      case 'DRAFT': return 'text-yellow-600 bg-yellow-100';
      case 'PAUSED': return 'text-orange-600 bg-orange-100';
      case 'EXPIRED': return 'text-red-600 bg-red-100';
      case 'CLOSED': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'Publicado';
      case 'DRAFT': return 'Borrador';
      case 'PAUSED': return 'Pausado';
      case 'EXPIRED': return 'Expirado';
      case 'CLOSED': return 'Cerrado';
      default: return status;
    }
  };

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600">Solo los administradores pueden gestionar formularios.</p>
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
            onClick={() => fetchAllForms()} 
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Formularios</h1>
          </div>
          <button
            onClick={handleCreateForm}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
          >
            + Crear nuevo formulario
          </button>
        </div>

        {/* Forms List */}
        {!showFormBuilder ? (
          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Formularios Existentes</h2>
            </div>
            
            {forms.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay formularios</h3>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {forms.map((form) => (
                  <div key={form.formId} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900">{form.title}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(form.status)}`}>
                            {getStatusText(form.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-gray-500">{form.description}</p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          <span>{form.fields.length} campos</span>
                          <span>•</span>
                          <span>{form.currentSubmissions || 0} respuestas</span>
                          <span>•</span>
                          <span>Creado: {new Date(form.createdAt).toLocaleDateString('es-ES')}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {form.status === 'DRAFT' && (
                          <button
                            onClick={() => handlePublishForm(form.formId)}
                            className="text-green-600 hover:text-green-800 font-medium text-sm"
                          >
                            Publicar
                          </button>
                        )}
                        {form.status === 'PUBLISHED' && (
                          <button
                            onClick={() => handlePauseForm(form.formId)}
                            className="text-orange-600 hover:text-orange-800 font-medium text-sm"
                          >
                            Pausar
                          </button>
                        )}
                        <button
                          onClick={() => handleEditForm(form)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteForm(form.formId)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Form Builder */
          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  {selectedForm ? 'Editar Formulario' : 'Crear Nuevo Formulario'}
                </h2>
                <button
                  onClick={() => setShowFormBuilder(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Form Basic Info */}
              <div className="mb-8">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Título del Formulario *
                    </label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Formulario de Aplicación Inicial"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe el propósito de este formulario..."
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isRequired"
                      checked={formData.isRequired || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, isRequired: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isRequired" className="ml-2 text-sm font-medium text-gray-700">
                      Este formulario es obligatorio para aplicar
                    </label>
                  </div>
                </div>
              </div>

              {/* Fields Management */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Campos del Formulario</h3>
                  <button
                    onClick={handleAddField}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md text-sm"
                  >
                    + Agregar Campo Manual
                  </button>
                </div>

                {/* Field Templates Selector */}
                <div className="mb-6">
                  <FieldTemplateSelector
                    onAddFields={handleAddFieldsFromTemplate}
                    currentFieldsCount={formData.fields?.length || 0}
                  />
                </div>

                {formData.fields && formData.fields.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-4">No hay campos definidos</p>
                    <button
                      onClick={handleAddField}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
                    >
                      Agregar Primer Campo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.fields?.sort((a, b) => a.order - b.order).map((field, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                                {fieldTypeOptions.find(opt => opt.value === field.type)?.label}
                              </span>
                              <h4 className="font-medium text-gray-900">{field.label}</h4>
                              {field.required && (
                                <span className="text-red-500 text-sm">*</span>
                              )}
                            </div>
                            {field.placeholder && (
                              <p className="text-sm text-gray-500 mt-1">Placeholder: {field.placeholder}</p>
                            )}
                            {field.options && field.options.length > 0 && (
                              <p className="text-sm text-gray-500 mt-1">
                                Opciones: {field.options.join(', ')}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditField(field)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteField(field.order)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowFormBuilder(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveForm}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {selectedForm ? 'Actualizar Formulario' : 'Crear Formulario'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Field Editor Modal */}
        {showFieldEditor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingField ? 'Editar Campo' : 'Nuevo Campo'}
                  </h3>
                  <button
                    onClick={() => setShowFieldEditor(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* Field Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Campo *
                    </label>
                    <select
                      value={fieldData.type || 'TEXT'}
                      onChange={(e) => setFieldData(prev => ({ ...prev, type: e.target.value as CreateFormFieldInput['type'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {fieldTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field Label */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Etiqueta del Campo *
                    </label>
                    <input
                      type="text"
                      value={fieldData.label || ''}
                      onChange={(e) => setFieldData(prev => ({ ...prev, label: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Nombre Completo"
                    />
                  </div>

                  {/* Field Placeholder */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Texto de Ayuda (Placeholder)
                    </label>
                    <input
                      type="text"
                      value={fieldData.placeholder || ''}
                      onChange={(e) => setFieldData(prev => ({ ...prev, placeholder: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Ingresa tu nombre completo"
                    />
                  </div>

                  {/* Field Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción del Campo
                    </label>
                    <textarea
                      value={fieldData.description || ''}
                      onChange={(e) => setFieldData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Descripción adicional para el campo..."
                    />
                  </div>

                  {/* Options for Select, Radio, Checkbox */}
                  {['SELECT', 'RADIO', 'CHECKBOX'].includes(fieldData.type || '') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Opciones (una por línea)
                      </label>
                      <textarea
                        value={fieldData.options?.join('\n') || ''}
                        onChange={(e) => setFieldData(prev => ({ 
                          ...prev, 
                          options: e.target.value.split('\n').filter(opt => opt.trim()) 
                        }))}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                      />
                    </div>
                  )}

                  {/* Required checkbox */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="fieldRequired"
                      checked={fieldData.required || false}
                      onChange={(e) => setFieldData(prev => ({ ...prev, required: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="fieldRequired" className="ml-2 text-sm font-medium text-gray-700">
                      Campo obligatorio
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowFieldEditor(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveField}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingField ? 'Actualizar Campo' : 'Agregar Campo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default EnhancedFormsManager;