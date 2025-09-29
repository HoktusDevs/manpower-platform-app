import React from 'react';

export interface TextInputProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly type?: 'text' | 'email' | 'password' | 'number';
  readonly className?: string;
}

/**
 * Direct text input component - perfect for forms that need simple inputs
 * More straightforward than FormField wrapper pattern
 */
export const TextInput: React.FC<TextInputProps> = ({
  label,
  value,
  onChange,
  error,
  required = false,
  placeholder,
  disabled = false,
  type = 'text',
  className = ''
}) => {
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      onChange(event.target.value);
    },
    [onChange]
  );

  const fieldId = React.useMemo(
    () => `field-${label.toLowerCase().replace(/\s+/g, '-')}`,
    [label]
  );

  return (
    <div className={`space-y-1 ${className}`}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <input
        id={fieldId}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
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

export default TextInput;