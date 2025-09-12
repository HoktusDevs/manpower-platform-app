import React, { useState, useEffect } from 'react';
import { useGraphQL } from '../../hooks/useGraphQL';
import { UniversalTableManager } from '../../components/UniversalTable';
import type { TableColumn, TableAction, BulkAction } from '../../components/UniversalTable';
import type { Form } from '../../services/graphqlService';

export const EnhancedFormsManager: React.FC = () => {
  const { 
    forms, 
    loading, 
    error, 
    fetchAllForms, 
    deleteForm, 
    publishForm, 
    pauseForm,
    isGraphQLAvailable 
  } = useGraphQL();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'accordion'>('table');

  // Load forms on mount
  useEffect(() => {
    if (isGraphQLAvailable()) {
      fetchAllForms();
    }
  }, []); // Empty dependency array - only run once on mount

  // Filter forms based on search term
  const filteredForms = forms.filter(form =>
    form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (form.description && form.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Define table columns
  const columns: TableColumn<Form>[] = [
    {
      key: 'title',
      label: 'Título',
      render: (form, value) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          {form.description && (
            <div className="text-sm text-gray-500">{form.description}</div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Estado',
      render: (_, value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'PUBLISHED' 
            ? 'bg-green-100 text-green-800' 
            : value === 'DRAFT'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {value === 'PUBLISHED' ? 'Publicado' : 
           value === 'DRAFT' ? 'Borrador' : 
           value}
        </span>
      )
    },
    {
      key: 'fields',
      label: 'Campos',
      render: (_, value) => (
        <span className="text-sm text-gray-500">
          {Array.isArray(value) ? value.length : 0} campos
        </span>
      )
    },
    {
      key: 'createdAt',
      label: 'Fecha de Creación',
      render: (_, value) => (
        <span className="text-sm text-gray-500">
          {new Date(value).toLocaleDateString('es-ES')}
        </span>
      )
    }
  ];

  // Define row actions
  const rowActions: TableAction<Form>[] = [
    {
      key: 'edit',
      label: 'Editar',
      variant: 'secondary',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      onClick: (form) => {
        console.log('Editar formulario:', form.formId);
        // TODO: Implementar edición
      }
    },
    {
      key: 'publish',
      label: 'Publicar/Pausar',
      variant: 'primary',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
        </svg>
      ),
      onClick: async (form) => {
        try {
          if (form.status === 'PUBLISHED') {
            await pauseForm(form.formId);
          } else {
            await publishForm(form.formId);
          }
          await fetchAllForms(); // Refresh list
        } catch (error) {
          console.error('Error updating form status:', error);
        }
      }
    },
    {
      key: 'delete',
      label: 'Eliminar',
      variant: 'danger',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: async (form) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar el formulario "${form.title}"?`)) {
          try {
            await deleteForm(form.formId);
            await fetchAllForms(); // Refresh list
          } catch (error) {
            console.error('Error deleting form:', error);
          }
        }
      }
    }
  ];

  // Define bulk actions
  const bulkActions: BulkAction<Form>[] = [
    {
      key: 'publish',
      label: 'Publicar Seleccionados',
      variant: 'primary',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
        </svg>
      ),
      onClick: async (forms) => {
        try {
          await Promise.all(forms.map(form => publishForm(form.formId)));
          await fetchAllForms(); // Refresh list
          setSelectedItems(new Set()); // Clear selection
        } catch (error) {
          console.error('Error publishing forms:', error);
        }
      }
    },
    {
      key: 'pause',
      label: 'Pausar Seleccionados',
      variant: 'secondary',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
        </svg>
      ),
      onClick: async (forms) => {
        try {
          await Promise.all(forms.map(form => pauseForm(form.formId)));
          await fetchAllForms(); // Refresh list
          setSelectedItems(new Set()); // Clear selection
        } catch (error) {
          console.error('Error pausing forms:', error);
        }
      }
    },
    {
      key: 'delete',
      label: 'Eliminar Seleccionados',
      variant: 'danger',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: async (forms) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar ${forms.length} formulario(s)?`)) {
          try {
            await Promise.all(forms.map(form => deleteForm(form.formId)));
            await fetchAllForms(); // Refresh list
            setSelectedItems(new Set()); // Clear selection
          } catch (error) {
            console.error('Error deleting forms:', error);
          }
        }
      }
    }
  ];

  const handleCreateForm = () => {
    console.log('Crear nuevo formulario');
    // TODO: Implementar creación de formulario
  };

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <UniversalTableManager
        title="Gestión de Formularios"
        data={filteredForms}
        columns={columns}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        rowActions={rowActions}
        bulkActions={bulkActions}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        createButton={{
          label: '+ Crear nuevo formulario',
          onClick: handleCreateForm
        }}
        selectable={true}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        getItemId={(form) => form.formId}
      />
    </div>
  );
};