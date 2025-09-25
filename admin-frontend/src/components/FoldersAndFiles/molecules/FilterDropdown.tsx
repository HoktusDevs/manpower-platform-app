import React, { useState, useRef, useEffect } from 'react';

interface FilterOptions {
  type: 'all' | 'folder' | 'file' | 'level-1' | 'level-2' | 'level-3';
  sortBy: 'name' | 'date' | 'type';
  sortOrder: 'asc' | 'desc';
}

interface FilterDropdownProps {
  onApplyFilters: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  onApplyFilters,
  currentFilters,
  isOpen,
  onToggle,
  onClose
}) => {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    const defaultFilters: FilterOptions = {
      type: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    };
    setFilters(defaultFilters);
    onApplyFilters(defaultFilters);
    onClose();
  };

  const hasActiveFilters = currentFilters.type !== 'all' || 
                          currentFilters.sortBy !== 'name' || 
                          currentFilters.sortOrder !== 'asc';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Filter Button */}
      <button
        onClick={onToggle}
        className={`flex-1 sm:flex-none inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors ${
          hasActiveFilters
            ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
        Filtro
        {hasActiveFilters && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Activo
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">Filtros</h3>
              <button
                onClick={handleReset}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Limpiar todo
              </button>
            </div>

            {/* Filter Options */}
            <div className="space-y-4">
              {/* Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Tipo</label>
                <div className="space-y-1">
                  {[
                    { value: 'all', label: 'Todos' },
                    { value: 'folder', label: 'Carpetas (Nivel 0)' },
                    { value: 'level-1', label: 'Subcarpetas Nivel 1' },
                    { value: 'level-2', label: 'Subcarpetas Nivel 2' },
                    { value: 'level-3', label: 'Subcarpetas Nivel 3' },
                    { value: 'file', label: 'Archivos' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        name="type"
                        value={option.value}
                        checked={filters.type === option.value}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value as FilterOptions['type'] })}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Ordenar</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FilterOptions['sortBy'] })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="name">Nombre</option>
                    <option value="date">Fecha</option>
                    <option value="type">Tipo</option>
                  </select>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value as FilterOptions['sortOrder'] })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="asc">A-Z</option>
                    <option value="desc">Z-A</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleApply}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
