import { Input } from '../../ui';
import type { SearchInputProps } from '../types';

/**
 * SearchInput Atom
 * Pure component for search functionality
 * Follows Single Responsibility Principle
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  searchTerm,
  onChange,
  placeholder = 'Buscar archivos y carpetas...'
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange(e.target.value);
  };

  return (
    <div className="flex-1 w-full sm:w-auto">
      <Input
        variant="search"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleChange}
        fullWidth
      />
    </div>
  );
};