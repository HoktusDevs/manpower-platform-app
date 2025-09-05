import type { ReactNode } from 'react';

interface SelectOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
  readonly description?: string;
}

interface CustomSelectProps<T extends string = string> {
  readonly value: T;
  readonly options: readonly SelectOption<T>[];
  readonly onChange: (value: T) => void;
  readonly className?: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
}

export function CustomSelect<T extends string = string>({
  value,
  options,
  onChange,
  className = '',
  placeholder,
  disabled = false
}: CustomSelectProps<T>): ReactNode {
  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        disabled={disabled}
        className="
          appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          hover:border-gray-400 transition-colors duration-200
          cursor-pointer shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed
        "
        title={selectedOption?.description}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>
  );
}

export type { SelectOption, CustomSelectProps };