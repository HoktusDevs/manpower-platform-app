import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Application } from '../types';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application | null;
}

export const JobDetailsModal = ({ isOpen, onClose, application }: JobDetailsModalProps) => {
  if (!application) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getEmploymentTypeText = (type: string) => {
    switch (type) {
      case 'FULL_TIME':
        return 'Tiempo completo';
      case 'PART_TIME':
        return 'Medio tiempo';
      case 'CONTRACT':
        return 'Contrato';
      case 'INTERNSHIP':
        return 'Práctica';
      default:
        return type;
    }
  };

  const getExperienceLevelText = (level: string) => {
    switch (level) {
      case 'ENTRY_LEVEL':
        return 'Nivel inicial';
      case 'MID_LEVEL':
        return 'Nivel intermedio';
      case 'SENIOR_LEVEL':
        return 'Nivel senior';
      case 'EXECUTIVE':
        return 'Ejecutivo';
      default:
        return level;
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Detalles del Trabajo
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Título del trabajo */}
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">
                      {application.title || application.jobTitle || application.position || 'Sin título'}
                    </h4>
                  </div>

                  {/* Información básica */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {application.location && application.location !== 'Por definir' && (
                      <div>
                        <h5 className="font-medium text-gray-900">Ubicación</h5>
                        <p className="text-gray-600">{application.location}</p>
                      </div>
                    )}
                    {application.salary && (
                      <div>
                        <h5 className="font-medium text-gray-900">Salario</h5>
                        <p className="text-gray-600">{application.salary}</p>
                      </div>
                    )}
                    {application.employmentType && (
                      <div>
                        <h5 className="font-medium text-gray-900">Tipo de empleo</h5>
                        <p className="text-gray-600">{getEmploymentTypeText(application.employmentType)}</p>
                      </div>
                    )}
                    {application.experienceLevel && (
                      <div>
                        <h5 className="font-medium text-gray-900">Nivel de experiencia</h5>
                        <p className="text-gray-600">{getExperienceLevelText(application.experienceLevel)}</p>
                      </div>
                    )}
                  </div>

                  {/* Descripción */}
                  {application.description && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Descripción</h5>
                      <p className="text-gray-600 whitespace-pre-wrap">{application.description}</p>
                    </div>
                  )}

                  {/* Requisitos */}
                  {application.requirements && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Requisitos</h5>
                      <p className="text-gray-600 whitespace-pre-wrap">{application.requirements}</p>
                    </div>
                  )}

                  {/* Beneficios */}
                  {application.benefits && application.benefits.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Beneficios</h5>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {application.benefits.map((benefit, index) => (
                          <li key={index}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Habilidades */}
                  {application.skills && application.skills.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Habilidades requeridas</h5>
                      <div className="flex flex-wrap gap-2">
                        {application.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fechas */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                      <div>
                        <span className="font-medium">Aplicado el:</span> {formatDate(application.createdAt)}
                      </div>
                      {application.updatedAt !== application.createdAt && (
                        <div>
                          <span className="font-medium">Actualizado el:</span> {formatDate(application.updatedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                    onClick={onClose}
                  >
                    Cerrar
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
