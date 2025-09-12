import React, { useState, useEffect } from 'react';
import { useGraphQL } from '../../hooks/useGraphQL';
import { UniversalTableManager } from '../../components/UniversalTable';
import type { TableColumn, TableAction, BulkAction } from '../../components/UniversalTable';
import type { Application } from '../../services/graphqlService';

const getStatusColor = (status: Application['status']) => {
  switch (status) {
    case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
    case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
    case 'IN_REVIEW': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'INTERVIEW_SCHEDULED': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'HIRED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusText = (status: Application['status']) => {
  switch (status) {
    case 'PENDING': return 'Pendiente';
    case 'APPROVED': return 'Aprobado';
    case 'REJECTED': return 'Rechazado';
    case 'IN_REVIEW': return 'En Revisión';
    case 'INTERVIEW_SCHEDULED': return 'Entrevista Programada';
    case 'HIRED': return 'Contratado';
    default: return status;
  }
};

export const ApplicationsManagementPage: React.FC = () => {
  const {
    applications,
    loading,
    error,
    fetchAllApplications,
    updateApplicationStatus,
    clearError,
    isGraphQLAvailable
  } = useGraphQL();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'accordion'>('table');

  useEffect(() => {
    if (isGraphQLAvailable()) {
      fetchAllApplications();
    }
  }, []); // Empty dependency array - only run once on mount

  // Filter applications by search term
  const filteredApplications = applications.filter(app => 
    app.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Define table columns
  const columns: TableColumn<Application>[] = [
    {
      key: 'userId',
      label: 'Usuario',
      render: (_, value) => (
        <div className="font-medium text-gray-900">
          {value}
        </div>
      )
    },
    {
      key: 'companyName',
      label: 'Empresa',
      render: (_, value) => (
        <div className="text-sm text-gray-900">
          {value}
        </div>
      )
    },
    {
      key: 'position',
      label: 'Posición',
      render: (_, value) => (
        <div className="text-sm text-gray-900">
          {value}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Estado',
      render: (_, value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
          {getStatusText(value)}
        </span>
      )
    },
    {
      key: 'submittedAt',
      label: 'Fecha de Envío',
      render: (_, value) => (
        <span className="text-sm text-gray-500">
          {new Date(value).toLocaleDateString('es-ES')}
        </span>
      )
    }
  ];

  // Define row actions
  const rowActions: TableAction<Application>[] = [
    {
      key: 'approve',
      label: 'Aprobar',
      variant: 'primary',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      onClick: async (app) => {
        await updateApplicationStatus(app.userId, app.applicationId, 'APPROVED');
        await fetchAllApplications(); // Refresh list
      },
      show: (app) => app.status !== 'APPROVED' && app.status !== 'HIRED'
    },
    {
      key: 'review',
      label: 'En Revisión',
      variant: 'secondary',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      onClick: async (app) => {
        await updateApplicationStatus(app.userId, app.applicationId, 'IN_REVIEW');
        await fetchAllApplications(); // Refresh list
      },
      show: (app) => app.status === 'PENDING'
    },
    {
      key: 'interview',
      label: 'Programar Entrevista',
      variant: 'secondary',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-1 1v6a1 1 0 01-1 1H9a1 1 0 01-1-1V8h10z" />
        </svg>
      ),
      onClick: async (app) => {
        await updateApplicationStatus(app.userId, app.applicationId, 'INTERVIEW_SCHEDULED');
        await fetchAllApplications(); // Refresh list
      },
      show: (app) => app.status === 'APPROVED' || app.status === 'IN_REVIEW'
    },
    {
      key: 'hire',
      label: 'Contratar',
      variant: 'primary',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      onClick: async (app) => {
        await updateApplicationStatus(app.userId, app.applicationId, 'HIRED');
        await fetchAllApplications(); // Refresh list
      },
      show: (app) => app.status === 'INTERVIEW_SCHEDULED' || app.status === 'APPROVED'
    },
    {
      key: 'reject',
      label: 'Rechazar',
      variant: 'danger',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      onClick: async (app) => {
        if (window.confirm(`¿Estás seguro de que deseas rechazar la aplicación de ${app.userId}?`)) {
          await updateApplicationStatus(app.userId, app.applicationId, 'REJECTED');
          await fetchAllApplications(); // Refresh list
        }
      },
      show: (app) => app.status !== 'REJECTED' && app.status !== 'HIRED'
    }
  ];

  // Define bulk actions
  const bulkActions: BulkAction<Application>[] = [
    {
      key: 'approve',
      label: 'Aprobar Seleccionadas',
      variant: 'primary',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      onClick: async (applications) => {
        try {
          await Promise.all(applications.map(app => 
            updateApplicationStatus(app.userId, app.applicationId, 'APPROVED')
          ));
          await fetchAllApplications(); // Refresh list
          setSelectedItems(new Set()); // Clear selection
        } catch (error) {
          console.error('Error approving applications:', error);
        }
      }
    },
    {
      key: 'review',
      label: 'Marcar En Revisión',
      variant: 'secondary',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      onClick: async (applications) => {
        try {
          await Promise.all(applications.map(app => 
            updateApplicationStatus(app.userId, app.applicationId, 'IN_REVIEW')
          ));
          await fetchAllApplications(); // Refresh list
          setSelectedItems(new Set()); // Clear selection
        } catch (error) {
          console.error('Error updating applications:', error);
        }
      }
    },
    {
      key: 'reject',
      label: 'Rechazar Seleccionadas',
      variant: 'danger',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      onClick: async (applications) => {
        if (window.confirm(`¿Estás seguro de que deseas rechazar ${applications.length} aplicación(es)?`)) {
          try {
            await Promise.all(applications.map(app => 
              updateApplicationStatus(app.userId, app.applicationId, 'REJECTED')
            ));
            await fetchAllApplications(); // Refresh list
            setSelectedItems(new Set()); // Clear selection
          } catch (error) {
            console.error('Error rejecting applications:', error);
          }
        }
      }
    }
  ];


  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button 
            onClick={clearError}
            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <UniversalTableManager
        title="Gestionar Postulaciones"
        data={filteredApplications}
        columns={columns}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        rowActions={rowActions}
        bulkActions={bulkActions}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectable={true}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        getItemId={(app) => app.applicationId}
      />
    </div>
  );
};