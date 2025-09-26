import { Checkbox } from '../atoms';
import type { TableHeaderProps } from '../types';

/**
 * TableHeader Molecule
 * Header section with select all functionality and status columns
 * Follows Single Responsibility Principle
 */
export const TableHeader: React.FC<TableHeaderProps> = ({
  isAllSelected,
  totalCount,
  onSelectAll
}) => {

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      {/* Column Headers */}
      <div className="px-6 py-3 w-full">
        <div className="flex items-center w-full">
          {/* Carpeta Column */}
          <div className="flex w-[750px]">
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
          <div className="w-[200px] text-center">
            <span className="text-sm font-semibold text-gray-700">Tipo</span>
          </div>

          {/* Status Columns */}
          <div className="w-[200px] text-center">
            <span className="text-sm font-semibold text-gray-700">Aprobado</span>
          </div>

          <div className="w-[200px] text-center">
            <span className="text-sm font-semibold text-gray-700">Rechazado</span>
          </div>

          <div className="w-[200px] text-center">
            <span className="text-sm font-semibold text-gray-700">Pendiente</span>
          </div>

          <div className="w-[200px] text-center">
            <span className="text-sm font-semibold text-gray-700">Por vencer</span>
          </div>

          <div className="w-[200px] text-center">
            <span className="text-sm font-semibold text-gray-700">Vencido</span>
          </div>

          {/* Acciones Column */}
          <div className="w-[200px] text-right">
            <span className="text-sm font-semibold text-gray-700">Acciones</span>
          </div>
        </div>
      </div>
    </div>
  );
};