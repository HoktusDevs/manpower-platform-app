import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { Typography } from './Typography';
import { Flex } from './Flex';

interface ToastProps {
  readonly id: string;
  readonly variant?: 'success' | 'error' | 'warning' | 'info' | 'loading';
  readonly title: string;
  readonly message?: string;
  readonly duration?: number;
  readonly position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  readonly closable?: boolean;
  readonly onClose: (id: string) => void;
}

const TOAST_VARIANTS = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'check-circle',
    iconColor: '#16a34a',
    titleColor: 'success' as const
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'alert-circle',
    iconColor: '#dc2626',
    titleColor: 'error' as const
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'alert-triangle',
    iconColor: '#d97706',
    titleColor: 'warning' as const
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'info',
    iconColor: '#2563eb',
    titleColor: 'primary' as const
  },
  loading: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: 'loader',
    iconColor: '#6b7280',
    titleColor: 'secondary' as const
  }
} as const;

const POSITION_CLASSES = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
} as const;

export function Toast({
  id,
  variant = 'info',
  title,
  message,
  duration = 5000,
  position = 'top-right',
  closable = true,
  onClose
}: ToastProps): ReactNode {
  const config = TOAST_VARIANTS[variant];

  useEffect(() => {
    if (duration > 0 && variant !== 'loading') {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return (): void => clearTimeout(timer);
    }
  }, [id, duration, variant, onClose]);

  const handleClose = (): void => {
    onClose(id);
  };

  return (
    <div
      className={`fixed z-50 ${POSITION_CLASSES[position]} animate-in slide-in-from-top-2 fade-in duration-300`}
    >
      <div
        className={`
          ${config.bg} ${config.border} border rounded-lg shadow-lg p-4 min-w-80 max-w-md
          animate-in slide-in-from-top-2 fade-in duration-300
        `}
      >
        <Flex align="start" gap="sm">
          <div className="flex-shrink-0 mt-0.5">
            {variant === 'loading' ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <Icon name={config.icon} size="md" color={config.iconColor} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <Typography variant="label" color={config.titleColor} className="font-medium">
              {title}
            </Typography>
            {message && (
              <Typography variant="caption" color="muted" className="mt-1">
                {message}
              </Typography>
            )}
          </div>

          {closable && (
            <button
              onClick={handleClose}
              className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Icon name="x" size="sm" />
            </button>
          )}
        </Flex>
      </div>
    </div>
  );
}

export type { ToastProps };