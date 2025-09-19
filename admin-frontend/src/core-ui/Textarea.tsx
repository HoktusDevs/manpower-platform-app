import { forwardRef, useEffect, useRef, useCallback } from 'react';
import type { ReactNode, TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly variant?: 'default' | 'error' | 'success';
  readonly size?: 'sm' | 'md' | 'lg';
  readonly fullWidth?: boolean;
  readonly autoResize?: boolean;
  readonly error?: string;
  readonly helperText?: string;
  readonly minRows?: number;
  readonly maxRows?: number;
}

const TEXTAREA_VARIANTS = {
  default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
  error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
  success: 'border-green-300 focus:border-green-500 focus:ring-green-500'
} as const;

const TEXTAREA_SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2 text-base',
  lg: 'px-4 py-3 text-lg'
} as const;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  variant = 'default',
  size = 'md',
  fullWidth = true,
  autoResize = false,
  error,
  helperText,
  minRows = 3,
  maxRows,
  className = '',
  disabled = false,
  onChange,
  value,
  ...props
}, ref): ReactNode => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const combinedRef = (ref as React.RefObject<HTMLTextAreaElement>) || textareaRef;

  const hasError = Boolean(error);
  const currentVariant = hasError ? 'error' : variant;

  const textareaClasses = [
    'block rounded-md border-0 ring-1 ring-inset transition-colors resize-none',
    'placeholder:text-gray-400 focus:ring-2 focus:ring-inset',
    'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
    TEXTAREA_VARIANTS[currentVariant],
    TEXTAREA_SIZES[size],
    fullWidth ? 'w-full' : '',
    !autoResize ? 'resize-y' : '',
    className
  ].filter(Boolean).join(' ');

  const adjustHeight = useCallback((): void => {
    const textarea = combinedRef.current;
    if (!textarea || !autoResize) return;

    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const minHeight = minRows * lineHeight;
    const maxHeight = maxRows ? maxRows * lineHeight : scrollHeight;

    textarea.style.height = `${Math.max(minHeight, Math.min(scrollHeight, maxHeight))}px`;
  }, [autoResize, minRows, maxRows, combinedRef]);

  useEffect(() => {
    if (autoResize) {
      adjustHeight();
    }
  }, [value, autoResize, minRows, maxRows, adjustHeight]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    if (autoResize) {
      adjustHeight();
    }
    onChange?.(event);
  };

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      <textarea
        ref={combinedRef}
        className={textareaClasses}
        disabled={disabled}
        rows={autoResize ? minRows : undefined}
        onChange={handleChange}
        value={value}
        {...props}
      />
      {(error || helperText) && (
        <p className={`mt-1 text-sm ${error ? 'text-red-600' : 'text-gray-600'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export type { TextareaProps };