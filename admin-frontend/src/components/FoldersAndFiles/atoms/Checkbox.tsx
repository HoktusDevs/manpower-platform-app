interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  className?: string;
}

/**
 * Checkbox Atom
 * Pure component for checkbox functionality
 * Follows Single Responsibility Principle
 */
export const Checkbox: React.FC<CheckboxProps> = ({ 
  checked, 
  onChange, 
  className = 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded' 
}) => {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={className}
    />
  );
};