import { useState, useEffect, useRef } from 'react';
import { Input } from '../../components/ui';

interface FolderRow {
  id: string;
  name: string;
  type: string; // Texto libre ahora
  createdAt: string;
  parentId?: string;
}

interface CreateFolderData {
  name: string;
  type: string; // Texto libre ahora
}

export const FoldersAndFilesPage: React.FC = () => {
  const [rows, setRows] = useState<FolderRow[]>([]);
  const [showActionsMenu, setShowActionsMenu] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderType, setNewFolderType] = useState<string>('');
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };

    if (showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsMenu]);

  const handleCreateFolder = (folderData: CreateFolderData): void => {
    const newRow: FolderRow = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: folderData.name,
      type: folderData.type,
      createdAt: new Date().toISOString(),
    };

    setRows(prevRows => [newRow, ...prevRows]);
  };

  const handleActionsClick = (): void => {
    setShowActionsMenu(!showActionsMenu);
  };

  const handleOpenCreateModal = (): void => {
    setShowCreateModal(true);
    setShowActionsMenu(false);
    setNewFolderName('');
    setNewFolderType('');
  };

  const handleCloseCreateModal = (): void => {
    setShowCreateModal(false);
    setNewFolderName('');
    setNewFolderType('');
  };

  const handleSubmitCreate = (e: React.FormEvent): void => {
    e.preventDefault();
    
    // Validación básica
    if (!newFolderName.trim()) {
      alert('Por favor ingresa un nombre para la carpeta');
      return;
    }
    
    if (!newFolderType.trim()) {
      alert('Por favor ingresa un tipo para la carpeta');
      return;
    }

    handleCreateFolder({
      name: newFolderName.trim(),
      type: newFolderType.trim()
    });

    handleCloseCreateModal();
  };

  const filteredRows = rows.filter(row =>
    row.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Directorios y Archivos</h1>
      <div className="bg-white shadow rounded-lg p-6">
        {/* Barra de herramientas */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
          {/* Barra de búsqueda */}
          <div className="flex-1 w-full sm:w-auto">
            <Input
              variant="search"
              placeholder="Buscar archivos y carpetas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
            />
          </div>
          
          {/* Botones de acción */}
          <div className="flex gap-3 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              Filtro
            </button>
            
            {/* Botón Acciones con menú desplegable */}
            <div className="relative" ref={actionsMenuRef}>
              <button 
                onClick={handleActionsClick}
                className="flex-1 sm:flex-none inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
                Acciones
              </button>
              
              {/* Menú desplegable */}
              {showActionsMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    <button
                      onClick={handleOpenCreateModal}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Crear Nueva Fila/Carpeta
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button className="flex-1 sm:flex-none inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Descargar
            </button>
          </div>
        </div>

        {/* Tabla de directorios y archivos */}
        <div className="overflow-hidden">
          {filteredRows.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7l9 6 9-6" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">No hay carpetas o archivos creados</p>
              <p className="text-gray-400 text-sm mt-1">Usa el botón "Acciones" para crear una nueva fila</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredRows.map((row) => (
                  <li key={row.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 mr-4">
                          {/* Icono genérico para todos los tipos */}
                          <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{row.name}</p>
                          <p className="text-sm text-gray-500">
                            Creado: {new Date(row.createdAt).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {row.type}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Modal para crear nueva carpeta */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-[300px] mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Header del modal */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Crear Nueva Carpeta
                </h3>
                <button
                  onClick={handleCloseCreateModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleSubmitCreate} className="space-y-4">
                <div>
                  <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Carpeta
                  </label>
                  <input
                    type="text"
                    id="folderName"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ej: Empresa, Región, Comuna..."
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="folderType" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Carpeta
                  </label>
                  <input
                    type="text"
                    id="folderType"
                    value={newFolderType}
                    onChange={(e) => setNewFolderType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ej: Organización, Ubicación, Departamento..."
                  />
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseCreateModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                  >
                    Crear Carpeta
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};