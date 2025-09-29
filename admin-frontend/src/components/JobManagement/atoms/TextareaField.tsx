import React from 'react';
import type { TextareaFieldProps } from '../types';

/**
 * Textarea field atom with strict TypeScript typing
 * Reusable textarea component for multiline text input
 */
export const TextareaField: React.FC<TextareaFieldProps> = ({
  label,
  value,
  onChange,
  error,
  required = false,
  placeholder,
  disabled = false,
  rows = 4
}) => {
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
      onChange(event.target.value);
    },
    [onChange]
  );

  const fieldId = React.useMemo(
    () => `textarea-${label.toLowerCase().replace(/\s+/g, '-')}`,
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

      <textarea
        id={fieldId}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm resize-vertical
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${error
            ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 bg-white'
          }
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${fieldId}-error` : undefined}
      />

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

export default TextareaField;