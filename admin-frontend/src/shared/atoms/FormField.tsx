import { cloneElement } from 'react';
import type { ReactNode, ReactElement } from 'react';
import { Label } from './Label';

interface FormFieldProps {
  readonly label?: string;
  readonly required?: boolean;
  readonly error?: string;
  readonly helperText?: string;
  readonly className?: string;
  readonly children: ReactElement<{
    error?: string;
    variant?: string;
    helperText?: string;
  }>;
}

export function FormField({
  label,
  required = false,
  error,
  helperText,
  className = '',
  children
}: FormFieldProps): ReactNode {
  const labelVariant = error ? 'error' : required ? 'required' : 'default';

  const childWithProps = cloneElement(children, {
    error,
    variant: error ? 'error' : children.props.variant,
    helperText: error || helperText
  });

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <Label variant={labelVariant}>
          {label}
        </Label>
      )}
      {childWithProps}
    </div>
  );
}

export type { FormFieldProps };