import React, { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Container } from '../../core-ui';

// Tipos genéricos para la tabla universal
export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (item: T, value: any) => ReactNode;
}

export interface TableAction<T = any> {
  key: string;
  label: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick: (item: T) => void;
  show?: (item: T) => boolean;
}

export interface BulkAction<T = any> {
  key: string;
  label: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick: (items: T[]) => void;
}

export interface UniversalTableManagerProps<T = any> {
  title: string;
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  
  // Acciones individuales
  rowActions?: TableAction<T>[];
  
  // Acciones en lote
  bulkActions?: BulkAction<T>[];
  
  // Vista
  viewMode?: 'table' | 'grid' | 'accordion';
  onViewModeChange?: (mode: 'table' | 'grid' | 'accordion') => void;
  
  // Creación
  createButton?: {
    label: string;
    onClick: () => void;
  };
  
  // Selección
  selectable?: boolean;
  selectedItems?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  getItemId: (item: T) => string;
}

export const UniversalTableManager = <T,>({
  title,
  data,
  columns,
  loading = false,
  searchTerm,
  onSearchChange,
  rowActions = [],
  bulkActions = [],
  viewMode = 'table',
  onViewModeChange,
  createButton,
  selectable = false,
  selectedItems = new Set(),
  onSelectionChange,
  getItemId
}: UniversalTableManagerProps<T>): ReactNode => {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCount = selectedItems.size;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
  const isAllSelected = selectable && data.length > 0 && selectedItems.size === data.length;

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    
    if (isAllSelected) {
      onSelectionChange(new Set());
    } else {
      const allIds = new Set(data.map(getItemId));
      onSelectionChange(allIds);
    }
  };

  const handleSelectItem = (itemId: string) => {
    if (!onSelectionChange) return;
    
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    onSelectionChange(newSelection);
  };

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        </div>
      </div>

      {/* Table Content */}
      <Container variant="surface" padding="none">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-6 border-b border-gray-200">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 w-full sm:w-auto">
            {/* View Toggle */}
            {onViewModeChange && (
              <div className="flex rounded-md shadow-sm">
                {(['table', 'grid', 'accordion'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onViewModeChange(mode)}
                    className={`px-3 py-2 text-sm font-medium border ${
                      viewMode === mode
                        ? 'bg-green-100 border-green-500 text-green-700 z-10'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    } ${
                      mode === 'table' ? 'rounded-l-md' :
                      mode === 'accordion' ? 'rounded-r-md -ml-px' : '-ml-px'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {mode === 'table' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" />}
                      {mode === 'grid' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />}
                      {mode === 'accordion' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />}
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {/* Filter Button */}
            <button className="flex-1 sm:flex-none inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              Filtro
            </button>

            {/* Actions Dropdown */}
            {(bulkActions.length > 0 || createButton) && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="flex-1 sm:flex-none inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                  Acciones
                  {selectedCount > 0 && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {selectedCount}
                    </span>
                  )}
                </button>

                {/* Actions Dropdown Menu */}
                {showActionsMenu && (
                  <div className="absolute right-0 z-10 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      {bulkActions.map((action) => (
                        <button
                          key={action.key}
                          onClick={() => {
                            const selectedData = data.filter(item => selectedItems.has(getItemId(item)));
                            action.onClick(selectedData);
                            setShowActionsMenu(false);
                          }}
                          disabled={selectedCount === 0 && action.key !== 'create'}
                          className={`group flex items-center px-4 py-2 text-sm w-full text-left ${
                            selectedCount === 0 && action.key !== 'create'
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {action.icon && <span className="mr-3">{action.icon}</span>}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Download Button */}
            <button className="flex-1 sm:flex-none inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Descargar
            </button>
          </div>
        </div>
        {loading ? (
          <div className="py-12 px-6">
            <div className="space-y-6">
              {/* Skeleton rows - 3 filas con mayor espaciado para igualar altura */}
              {[...Array(3)].map((_, rowIndex) => (
                <div key={rowIndex} className="flex items-center space-x-4">
                  {selectable && (
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse flex-shrink-0"></div>
                  )}
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    {columns.slice(0, 4).map((_, colIndex) => (
                      <div key={colIndex} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                  {rowActions.length > 0 && (
                    <div className="flex space-x-2 flex-shrink-0">
                      <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Sin datos</h3>
            <p className="mt-1 text-sm text-gray-500">No hay elementos para mostrar</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-300">
              {/* Table Header */}
              <thead className="bg-gray-50">
                <tr>
                  {selectable && (
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                    </th>
                  )}
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      style={column.width ? { width: column.width } : undefined}
                    >
                      {column.label}
                    </th>
                  ))}
                  {rowActions.length > 0 && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              
              {/* Table Body */}
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item) => {
                  const itemId = getItemId(item);
                  const isSelected = selectedItems.has(itemId);
                  
                  return (
                    <tr key={itemId} className={isSelected ? 'bg-blue-50' : undefined}>
                      {selectable && (
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectItem(itemId)}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                          />
                        </td>
                      )}
                      {columns.map((column) => (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {column.render 
                            ? column.render(item, (item as any)[column.key])
                            : (item as any)[column.key]
                          }
                        </td>
                      ))}
                      {rowActions.length > 0 && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            {rowActions
                              .filter(action => !action.show || action.show(item))
                              .map((action) => (
                                <button
                                  key={action.key}
                                  onClick={() => action.onClick(item)}
                                  className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded ${
                                    action.variant === 'danger'
                                      ? 'text-red-700 bg-red-100 hover:bg-red-200'
                                      : action.variant === 'primary'
                                      ? 'text-green-700 bg-green-100 hover:bg-green-200'
                                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                                  }`}
                                >
                                  {action.icon && <span className="mr-1">{action.icon}</span>}
                                  {action.label}
                                </button>
                              ))}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </div>
  );
};