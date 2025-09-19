import { Checkbox } from '../atoms';
import type { TableHeaderProps } from '../types';

/**
 * TableHeader Molecule
 * Header section with select all functionality
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
    <div className="px-6 py-3 border-b border-gray-200">
      <div className="flex items-center">
        <Checkbox
          checked={totalCount > 0 && isAllSelected}
          onChange={onSelectAll}
        />
        <span className="ml-3 text-sm font-medium text-gray-900">
          {getHeaderText()}
        </span>
      </div>
    </div>
  );
};