import React, { useState, useEffect, useRef } from 'react';
import { useGraphQL } from '../../hooks/useGraphQL';
import { cognitoAuthService } from '../../services/cognitoAuthService';
import type { Document, UploadDocumentInput } from '../../services/graphqlService';

const getDocumentTypeLabel = (type: Document['documentType']) => {
  switch (type) {
    case 'RESUME': return 'Currículum';
    case 'COVER_LETTER': return 'Carta de Presentación';
    case 'PORTFOLIO': return 'Portafolio';
    case 'CERTIFICATE': return 'Certificado';
    case 'ID_DOCUMENT': return 'Documento de Identidad';
    case 'OTHER': return 'Otro';
    default: return type;
  }
};

const getDocumentTypeColor = (type: Document['documentType']) => {
  switch (type) {
    case 'RESUME': return 'bg-blue-100 text-blue-800';
    case 'COVER_LETTER': return 'bg-green-100 text-green-800';
    case 'PORTFOLIO': return 'bg-purple-100 text-purple-800';
    case 'CERTIFICATE': return 'bg-yellow-100 text-yellow-800';
    case 'ID_DOCUMENT': return 'bg-red-100 text-red-800';
    case 'OTHER': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return '📄';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('text')) return '📝';
  return '📄';
};

export const DocumentsPage: React.FC = () => {
  const {
    documents,
    loading,
    error,
    fetchMyDocuments,
    uploadDocument,
    clearError,
    isGraphQLAvailable
  } = useGraphQL();

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadData, setUploadData] = useState<{
    file: File | null;
    documentType: Document['documentType'];
  }>({
    file: null,
    documentType: 'RESUME'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = cognitoAuthService.getCurrentUser();

  useEffect(() => {
    if (user?.role === 'postulante' && isGraphQLAvailable()) {
      fetchMyDocuments();
    }
  }, [user, isGraphQLAvailable, fetchMyDocuments]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadData(prev => ({ ...prev, file }));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadData.file) {
      alert('Por favor selecciona un archivo');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (uploadData.file.size > maxSize) {
      alert('El archivo es demasiado grande. Máximo 10MB.');
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(uploadData.file.type)) {
      alert('Tipo de archivo no permitido. Solo PDF, Word, imágenes y texto.');
      return;
    }

    const uploadInput: UploadDocumentInput = {
      fileName: uploadData.file.name,
      documentType: uploadData.documentType,
      s3Key: `documents/${Date.now()}-${uploadData.file.name}`, // Generate s3 key
      fileSize: uploadData.file.size,
      mimeType: uploadData.file.type
    };

    const success = await uploadDocument(uploadInput);

    if (success) {
      setShowUploadForm(false);
      setUploadData({
        file: null,
        documentType: 'RESUME'
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const resetUploadForm = () => {
    setShowUploadForm(false);
    setUploadData({
      file: null,
      documentType: 'RESUME'
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (user?.role !== 'postulante') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Acceso Denegado</h3>
          <p className="text-red-600 mt-1">Solo los postulantes pueden ver esta página.</p>
        </div>
      </div>
    );
  }

  if (!isGraphQLAvailable()) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h3 className="text-yellow-800 font-medium">🚀 Sistema de Documentos</h3>
          <p className="text-yellow-700 mt-1">
            El sistema de gestión de documentos requiere GraphQL. Verifica la configuración.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Mis Documentos</h1>
          <p className="mt-2 text-sm text-gray-700 flex items-center">
            Gestiona todos tus documentos para aplicaciones.
            <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
              📡 GraphQL + S3
            </span>
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowUploadForm(true)}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Subir Documento
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={clearError}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Subir Documento</h3>
            <form onSubmit={handleUploadSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo de Documento *</label>
                  <select
                    required
                    value={uploadData.documentType}
                    onChange={(e) => setUploadData({...uploadData, documentType: e.target.value as Document['documentType']})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="RESUME">Currículum</option>
                    <option value="COVER_LETTER">Carta de Presentación</option>
                    <option value="PORTFOLIO">Portafolio</option>
                    <option value="CERTIFICATE">Certificado</option>
                    <option value="ID_DOCUMENT">Documento de Identidad</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Archivo *</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    required
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {uploadData.file && (
                    <p className="mt-1 text-xs text-gray-500">
                      {uploadData.file.name} ({formatFileSize(uploadData.file.size)})
                    </p>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  <p>Tipos permitidos: PDF, Word, imágenes, texto</p>
                  <p>Tamaño máximo: 10MB</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetUploadForm}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                >
                  {loading ? 'Subiendo...' : 'Subir Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="mt-8">
        {loading && !documents.length ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-500">Cargando documentos...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tienes documentos</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza subiendo tu primer documento.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowUploadForm(true)}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Subir Documento
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {documents.map((doc) => (
              <div key={doc.documentId} className="bg-white shadow rounded-lg p-6 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getFileIcon(doc.mimeType)}</span>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 truncate">{doc.fileName}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDocumentTypeColor(doc.documentType)}`}>
                          {getDocumentTypeLabel(doc.documentType)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2 text-sm text-gray-500">
                  {doc.fileSize && (
                    <div className="flex justify-between">
                      <span>Tamaño:</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                    </div>
                  )}
                  {doc.mimeType && (
                    <div className="flex justify-between">
                      <span>Tipo:</span>
                      <span className="truncate ml-2">{doc.mimeType}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Subido:</span>
                    <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-between items-center">
                  <button
                    onClick={() => {
                      // TODO: Implement download functionality with pre-signed URLs
                      alert('Funcionalidad de descarga próximamente disponible');
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Descargar
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement delete functionality
                      alert('Funcionalidad de eliminación próximamente disponible');
                    }}
                    className="text-sm text-red-600 hover:text-red-500"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};