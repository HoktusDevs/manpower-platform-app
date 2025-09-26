import React from 'react';

interface WebSocketStatusProps {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  className?: string;
}

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({
  isConnected,
  connectionStatus,
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-500',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          text: 'Tiempo real activo',
          description: 'Recibiendo actualizaciones en vivo'
        };

      case 'connecting':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-500',
          icon: (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ),
          text: 'Conectando...',
          description: 'Estableciendo conexión en tiempo real'
        };

      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-500',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          text: 'Error de conexión',
          description: 'No se pudo conectar al tiempo real'
        };

      case 'disconnected':
      default:
        return {
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          iconColor: 'text-gray-500',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
            </svg>
          ),
          text: 'Desconectado',
          description: 'Tiempo real no disponible'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`
        inline-flex items-center px-3 py-2 rounded-lg border transition-all duration-200
        ${config.bgColor} ${config.borderColor} ${className}
      `}
    >
      <div className={`flex-shrink-0 ${config.iconColor}`}>
        {config.icon}
      </div>

      <div className="ml-2 min-w-0">
        <div className={`text-sm font-medium ${config.textColor}`}>
          {config.text}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {config.description}
        </div>
      </div>

      {/* Connection indicator dot */}
      <div className="ml-3 flex-shrink-0">
        <div
          className={`
            w-2 h-2 rounded-full
            ${isConnected
              ? 'bg-green-400 animate-pulse'
              : connectionStatus === 'connecting'
                ? 'bg-yellow-400 animate-pulse'
                : 'bg-gray-300'
            }
          `}
        />
      </div>
    </div>
  );
};