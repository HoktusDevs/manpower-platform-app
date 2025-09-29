import React from 'react';
import type { SelectFieldProps } from '../types';

/**
 * Select field atom with strict TypeScript typing
 * Reusable select component for dropdowns
 */
export const SelectField = <T extends string>({
  label,
  value,
  onChange,
  options,
  error,
  required = false,
  placeholder = 'Seleccionar...',
  disabled = false
}: SelectFieldProps<T>): React.ReactElement => {
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      onChange(event.target.value as T | '');
    },
    [onChange]
  );

  const fieldId = React.useMemo(
    () => `select-${label.toLowerCase().replace(/\s+/g, '-')}`,
    [label]
  );

  return (
    <div className="space-y-1">
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <select
        id={fieldId}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${error
            ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 bg-white'
          }
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${fieldId}-error` : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {error && (
        <p
          id={`${fieldId}-error`}
          className="text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default SelectField;