import React, { useState } from 'react';
import { useToast } from '../../core-ui/useToast';
import { ConfirmModal } from '../../core-ui/ConfirmModal';
import { FoldersProvider } from '../../components/FoldersAndFiles';
import { UniversalTableManager } from '../../components/UniversalTable/UniversalTableManager';
import type { TableColumn, TableAction, BulkAction } from '../../components/UniversalTable/UniversalTableManager';
import { type JobPosting } from '../../services/jobsService';
import { useGetAllJobs, useDeleteJobs, useToggleJobStatus } from '../../hooks/useUnifiedJobs';
import { useDeleteJobWithFolder } from '../../services/unifiedJobFolderService';
import { UnifiedCreateJobModal } from '../../components/JobManagement/UnifiedCreateJobModal';

export const JobPostingsManagementPage: React.FC = () => {
  const { showSuccess, showError } = useToast();

  // React Query hooks para jobs unificados
  const { data: jobPostings = [], isLoading: loading } = useGetAllJobs();
  const deleteJobsMutation = useDeleteJobs();
  const deleteJobWithFolderMutation = useDeleteJobWithFolder();
  const toggleJobStatusMutation = useToggleJobStatus();

  const [searchTerm, setSearchTerm] = useState('');

  // Selection and bulk actions states
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());

  // Confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger',
    isLoading: false
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter job postings by search term
  const filteredJobPostings = jobPostings.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset modal state
  const resetModalState = () => {
    // Modal state reset handled by UnifiedCreateJobModal
  };

  // Helper function to show confirmation modal
  const showConfirmModal = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: 'danger' | 'warning' | 'info' = 'danger'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      variant,
      isLoading: false
    });
  };

  // Helper function to close confirmation modal
  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // Set modal loading state
  const setModalLoading = (loading: boolean) => {
    setConfirmModal(prev => ({ ...prev, isLoading: loading }));
  };

  const handleBulkDelete = () => {
    if (selectedJobs.size === 0) return;

    showConfirmModal(
      'Eliminar ofertas seleccionadas',
      `¿Estás seguro de que quieres eliminar ${selectedJobs.size} oferta${selectedJobs.size !== 1 ? 's' : ''} de trabajo? Esta acción no se puede deshacer y también eliminará las carpetas asociadas.`,
      async () => {
        setModalLoading(true);

        try {
          const jobIds = Array.from(selectedJobs);
          await deleteJobsMutation.mutateAsync(jobIds);

          showSuccess(
            `${selectedJobs.size} ofertas eliminadas`,
            'Las ofertas y sus carpetas asociadas se eliminaron correctamente'
          );

          setSelectedJobs(new Set());
        } catch (error) {
          showError(
            'Error al eliminar ofertas',
            error instanceof Error ? error.message : 'No se pudieron eliminar todas las ofertas'
          );
        } finally {
          setModalLoading(false);
          closeConfirmModal();
        }
      },
      'danger'
    );
  };

  const handleEditJob = (jobId: string) => {
    const job = jobPostings.find(j => j.jobId === jobId);
    if (job) {
      // Job editing will be handled by UnifiedCreateJobModal in the future
      console.log('Edit job:', job);
      setShowCreateModal(true);
    } else {
      showError('Error', 'No se encontró la oferta de trabajo');
    }
  };

  const handleDeleteJob = (jobId: string) => {
    const job = jobPostings.find(j => j.jobId === jobId);

    showConfirmModal(
      'Eliminar oferta de trabajo',
      '¿Estás seguro de que quieres eliminar esta oferta de trabajo? Esta acción también eliminará la carpeta asociada y no se puede deshacer.',
      async () => {
        setModalLoading(true);

        try {
          await deleteJobWithFolderMutation.mutateAsync({
            jobId,
            folderId: job?.folderId
          });

          showSuccess(
            'Oferta eliminada',
            'La oferta de trabajo y su carpeta se eliminaron correctamente'
          );
        } catch (error) {
          showError(
            'Error al eliminar',
            error instanceof Error ? error.message : 'No se pudo eliminar la oferta de trabajo'
          );
        } finally {
          setModalLoading(false);
          closeConfirmModal();
        }
      },
      'danger'
    );
  };

  const handleToggleJobStatus = async (jobId: string, newStatus: 'PUBLISHED' | 'PAUSED') => {
    try {
      await toggleJobStatusMutation.mutateAsync({ jobId, newStatus });

      const statusText = newStatus === 'PUBLISHED' ? 'activada' : 'desactivada';
      showSuccess('Estado actualizado', `La oferta de trabajo se ha ${statusText} correctamente`);
    } catch (error) {
      showError(
        'Error al actualizar',
        error instanceof Error ? error.message : 'No se pudo actualizar el estado de la oferta de trabajo'
      );
    }
  };

  // Define table columns
  const columns: TableColumn<JobPosting>[] = [
    {
      key: 'title',
      header: 'Título',
      render: (job) => (
        <div className="font-medium text-gray-900 truncate max-w-xs">
          {job.title}
        </div>
      ),
    },
    {
      key: 'companyName',
      header: 'Empresa',
      render: (job) => (
        <div className="text-sm text-gray-600">
          {job.companyName}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Ubicación',
      render: (job) => (
        <div className="text-sm text-gray-600 truncate max-w-xs">
          {job.location || 'Sin especificar'}
        </div>
      ),
    },
    {
      key: 'employmentType',
      header: 'Tipo',
      render: (job) => {
        const typeMap: Record<string, string> = {
          'FULL_TIME': 'Tiempo Completo',
          'PART_TIME': 'Medio Tiempo',
          'CONTRACT': 'Contrato',
          'FREELANCE': 'Freelance',
          'INTERNSHIP': 'Práctica',
          'TEMPORARY': 'Temporal'
        };
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {typeMap[job.employmentType] || job.employmentType}
          </span>
        );
      },
    },
    {
      key: 'experienceLevel',
      header: 'Experiencia',
      render: (job) => {
        const levelMap: Record<string, string> = {
          'ENTRY_LEVEL': 'Junior',
          'MID_LEVEL': 'Semi-Senior',
          'SENIOR_LEVEL': 'Senior',
          'EXECUTIVE': 'Ejecutivo',
          'INTERNSHIP': 'Práctica'
        };
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {levelMap[job.experienceLevel] || job.experienceLevel}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Estado',
      render: (job) => (
        <div className="flex items-center">
          {job.status === 'PUBLISHED' ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
              Publicado
            </span>
          ) : job.status === 'PAUSED' ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-1.5"></span>
              Pausado
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></span>
              {job.status}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Creado',
      render: (job) => (
        <div className="text-sm text-gray-500">
          {new Date(job.createdAt).toLocaleDateString('es-ES')}
        </div>
      ),
    }
  ];

  // Define row actions
  const rowActions: TableAction<JobPosting>[] = [
    {
      key: 'edit',
      label: 'Editar',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      onClick: (job) => handleEditJob(job.jobId)
    },
    {
      key: 'toggle',
      label: (job) => job.status === 'PUBLISHED' ? 'Pausar' : 'Publicar',
      icon: (job) => job.status === 'PUBLISHED' ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      onClick: (job) => handleToggleJobStatus(job.jobId, job.status === 'PUBLISHED' ? 'PAUSED' : 'PUBLISHED')
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
      onClick: (job) => handleDeleteJob(job.jobId)
    }
  ];

  // Define bulk actions
  const bulkActions: BulkAction<JobPosting>[] = [
    {
      key: 'create',
      label: 'Crear Nueva Oferta',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      onClick: () => {
        setShowCreateModal(true);
      }
    },
    {
      key: 'delete',
      label: 'Eliminar Seleccionadas',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      variant: 'danger',
      onClick: (jobs) => {
        const jobIds = new Set(jobs.map(job => job.jobId));
        setSelectedJobs(jobIds);
        handleBulkDelete();
      }
    }
  ];

  return (
    <FoldersProvider>
      <div className="p-6">
        <UniversalTableManager
          title="Gestión de Ofertas de Trabajo"
          data={filteredJobPostings}
          columns={columns}
          loading={loading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          rowActions={rowActions}
          bulkActions={bulkActions}
          selectable={true}
          selectedItems={selectedJobs}
          onSelectionChange={setSelectedJobs}
          getItemId={(job) => job.jobId}
          createButton={{
            label: 'Crear Empleo',
            onClick: () => setShowCreateModal(true)
          }}
        />

        {/* Unified Create/Edit Job Modal */}
        <UnifiedCreateJobModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            resetModalState();
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            resetModalState();
          }}
          context="jobs-management"
        />

        {/* Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
          onConfirm={confirmModal.onConfirm}
          onCancel={closeConfirmModal}
          isLoading={confirmModal.isLoading}
        />
      </div>
    </FoldersProvider>
  );
};