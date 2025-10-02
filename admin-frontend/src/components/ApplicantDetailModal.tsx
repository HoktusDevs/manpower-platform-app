import React, { useState } from 'react';
import type { Application } from '../services/applicationsApiService';

interface ApplicantDetailModalProps {
  application: Application;
  isOpen: boolean;
  onClose: () => void;
}

export const ApplicantDetailModal: React.FC<ApplicantDetailModalProps> = ({
  application,
  isOpen,
  onClose
}) => {
  const [notes, setNotes] = useState<string>('');
  const [savedNotes, setSavedNotes] = useState<Array<{ text: string; date: string; author: string }>>([]);

  if (!isOpen) return null;

  const handleSaveNote = () => {
    if (notes.trim()) {
      setSavedNotes([
        ...savedNotes,
        {
          text: notes,
          date: new Date().toISOString(),
          author: 'Admin' // TODO: Get from current user
        }
      ]);
      setNotes('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Ficha del Candidato
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {application.userName || 'Nombre no disponible'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Información del Trabajo */}
            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0h5a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h5m8 0V6" />
                </svg>
                Información del Puesto
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Posición</p>
                    <p className="font-medium text-gray-900">{application.jobTitle || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Empresa</p>
                    <p className="font-medium text-gray-900">{application.companyName || 'No especificada'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ubicación</p>
                    <p className="font-medium text-gray-900">{application.jobLocation || 'No especificada'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Salario</p>
                    <p className="font-medium text-gray-900">{application.jobSalary || 'No especificado'}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Información del Candidato */}
            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Datos del Candidato
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Nombre Completo</p>
                    <p className="font-medium text-gray-900">{application.userName || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{application.userEmail || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">RUT</p>
                    <p className="font-medium text-gray-900">{application.userRut || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Teléfono</p>
                    <p className="font-medium text-gray-900">{application.userPhone || 'No especificado'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Dirección</p>
                    <p className="font-medium text-gray-900">{application.userAddress || 'No especificada'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha de Postulación</p>
                  <p className="font-medium text-gray-900">
                    {new Date(application.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </section>

            {/* Documentos */}
            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Documentos Adjuntos
              </h3>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                {application.documents && application.documents.length > 0 ? (
                  <div className="space-y-2">
                    {application.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                        <div className="flex items-center space-x-3">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-900">
                            {typeof doc === 'string' ? doc : `Documento ${index + 1}`}
                          </span>
                        </div>
                        <button className="text-purple-600 hover:text-purple-800 text-sm font-medium">
                          Ver
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600">No hay documentos adjuntos</p>
                  </div>
                )}
              </div>
            </section>

            {/* Notas y Comentarios */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Notas y Comentarios
              </h3>

              {/* Saved Notes */}
              {savedNotes.length > 0 && (
                <div className="mb-4 space-y-3">
                  {savedNotes.map((note, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{note.text}</p>
                          <div className="mt-2 flex items-center text-xs text-gray-500">
                            <span>{note.author}</span>
                            <span className="mx-2">•</span>
                            <span>
                              {new Date(note.date).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Note */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Escribe tus notas o comentarios sobre este candidato..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  rows={4}
                />
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleSaveNote}
                    disabled={!notes.trim()}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      notes.trim()
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Guardar Nota
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
