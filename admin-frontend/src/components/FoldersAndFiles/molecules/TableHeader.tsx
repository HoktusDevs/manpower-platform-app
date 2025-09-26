import { Checkbox } from '../atoms';
import type { TableHeaderProps } from '../types';

/**
 * TableHeader Molecule
 * Header section with select all functionality and status columns
 * Follows Single Responsibility Principle
 */
export const TableHeader: React.FC<TableHeaderProps> = ({
  isAllSelected,
  selectedCount,
  totalCount,
  onSelectAll
}) => {
  const getHeaderText = (): string => {
    if (selectedCount > 0) {
      return `${selectedCount} de ${totalCount} seleccionadas`;
    }
    return 'Seleccionar todas';
  };

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Column Headers */}
      <div className="px-6 py-3 bg-gray-50">
        <div className="flex items-center">
          {/* Carpeta Column - takes more space */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <Checkbox
                checked={totalCount > 0 && isAllSelected}
                onChange={onSelectAll}
                className="mr-3"
              />
              <span className="text-sm font-semibold text-gray-700">Carpeta</span>
            </div>
          </div>
          
          {/* Tipo Column */}
          <div className="w-24 text-center">
            <span className="text-sm font-semibold text-gray-700">Tipo</span>
          </div>
          
          {/* Status Columns - fixed width */}
          <div className="w-20 text-center">
            <span className="text-sm font-semibold text-gray-700">Aprobado</span>
          </div>
          
          <div className="w-20 text-center">
            <span className="text-sm font-semibold text-gray-700">Rechazado</span>
          </div>
          
          <div className="w-20 text-center">
            <span className="text-sm font-semibold text-gray-700">Pendiente</span>
          </div>
          
          <div className="w-20 text-center">
            <span className="text-sm font-semibold text-gray-700">Por vencer</span>
          </div>
          
          <div className="w-20 text-center">
            <span className="text-sm font-semibold text-gray-700">Vencido</span>
          </div>
          
          {/* Acciones Column */}
          <div className="w-24 text-center">
            <span className="text-sm font-semibold text-gray-700">Acciones</span>
          </div>
        </div>
      </div>
    </div>
  );
};